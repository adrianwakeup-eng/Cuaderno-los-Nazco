import { editPhoto } from './photoEditor';
import type { MediaAttachment, MediaKind, StorageUsageSummary } from '../types';

const DB_NAME = 'CuadernoLosNazcoMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

interface StoredBlobRecord {
  key: string;
  blob: Blob;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'));
  });
}

export async function saveMediaBlob(
  key: string,
  blob: Blob,
  meta: { kind: MediaKind; fileName: string; mimeType: string }
): Promise<void> {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      key,
      blob,
      kind: meta.kind,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      sizeBytes: blob.size,
      createdAt: Date.now(),
    } satisfies StoredBlobRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Error guardando archivo multimedia'));
  });
}

export async function getMediaBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openMediaDb();
    const record = await new Promise<StoredBlobRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as StoredBlobRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    return record?.blob ?? null;
  } catch {
    return null;
  }
}

export async function getMediaBlobUrl(key: string): Promise<string | null> {
  const blob = await getMediaBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

/** Extracts real video duration & a lightweight JPEG poster thumbnail from a local video Blob */
export function extractVideoMetadata(
  blob: Blob
): Promise<{ durationSec?: number; posterUrl?: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let done = false;
    const finish = (res: { durationSec?: number; posterUrl?: string }) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(res);
    };

    const timeout = window.setTimeout(() => finish({}), 4000);

    video.onloadedmetadata = () => {
      const durationSec =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration)
          : undefined;
      try {
        video.currentTime = Math.min(0.6, Math.max(0.05, (video.duration || 1) * 0.1));
      } catch {
        window.clearTimeout(timeout);
        finish({ durationSec });
      }
    };

    video.onseeked = () => {
      window.clearTimeout(timeout);
      const durationSec =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration)
          : undefined;
      try {
        const maxW = 540;
        const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
        const w = Math.max(1, Math.round((video.videoWidth || 480) * scale));
        const h = Math.max(1, Math.round((video.videoHeight || 270) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const posterUrl = canvas.toDataURL('image/jpeg', 0.72);
          finish({ durationSec, posterUrl });
          return;
        }
      } catch {
        // ignore canvas error
      }
      finish({ durationSec });
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      finish({});
    };

    video.src = url;
  });
}

export async function deleteMediaBlob(key: string): Promise<void> {
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cleanup failures
  }
}

export async function computeStorageUsage(
  attachments: MediaAttachment[],
  quotaMb: number
): Promise<StorageUsageSummary> {
  let imageBytes = 0;
  let videoBytes = 0;
  let audioBytes = 0;

  attachments.forEach((a) => {
    if (a.kind === 'IMAGE') imageBytes += a.sizeBytes;
    else if (a.kind === 'VIDEO') videoBytes += a.sizeBytes;
    else if (a.kind === 'AUDIO') audioBytes += a.sizeBytes;
  });

  // Also add actual blobs stored in IndexedDB if larger
  try {
    const db = await openMediaDb();
    const records = await new Promise<StoredBlobRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as StoredBlobRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    const knownKeys = new Set(attachments.map((a) => a.storageKey).filter(Boolean));
    records.forEach((r) => {
      if (!knownKeys.has(r.key)) {
        if (r.kind === 'IMAGE') imageBytes += r.sizeBytes;
        else if (r.kind === 'VIDEO') videoBytes += r.sizeBytes;
        else if (r.kind === 'AUDIO') audioBytes += r.sizeBytes;
      }
    });
  } catch {
    // IndexedDB unavailable in private mode
  }

  return {
    totalBytes: imageBytes + videoBytes + audioBytes,
    imageBytes,
    videoBytes,
    audioBytes,
    fileCount: attachments.length,
    quotaBytes: quotaMb * 1024 * 1024,
  };
}

/**
 * Client-side photo compression using Canvas (recommended before uploading to cloud storage).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1440,
  quality = 0.82
): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const longest = Math.max(img.width, img.height);
      const scale = longest > maxDimension ? maxDimension / longest : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (compressed) => {
          if (compressed && compressed.size < file.size) {
            resolve(compressed);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export async function prepareAndStoreAttachment(
  file: File | Blob,
  options: {
    kind: MediaKind;
    fileName: string;
    mimeType: string;
    durationSec?: number;
    maxUploadMb: number;
    autoCompressImages: boolean;
  }
): Promise<MediaAttachment> {
  if (options.kind === 'IMAGE' && file instanceof File) {
    const editedFile = await editPhoto(file);
    file = editedFile;
    options = { ...options, fileName: editedFile.name, mimeType: editedFile.type };
  }
  let finalBlob: Blob = file;
  let finalMime = options.mimeType || file.type || 'application/octet-stream';

  if (options.kind === 'IMAGE' && options.autoCompressImages && file instanceof File) {
    finalBlob = await compressImageFile(file);
    if (finalBlob.type) finalMime = finalBlob.type;
  }

  const maxBytes = options.maxUploadMb * 1024 * 1024;
  if (finalBlob.size > maxBytes) {
    throw new Error(
      `El archivo supera el límite configurado por el Administrador (${options.maxUploadMb} MB).`
    );
  }

  const id = `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storageKey = `nazco_${id}`;
  await saveMediaBlob(storageKey, finalBlob, {
    kind: options.kind,
    fileName: options.fileName,
    mimeType: finalMime,
  });

  let durationSec = options.durationSec;
  let posterUrl: string | undefined;
  if (options.kind === 'VIDEO') {
    const meta = await extractVideoMetadata(finalBlob);
    if (!durationSec && meta.durationSec) durationSec = meta.durationSec;
    posterUrl = meta.posterUrl;
  }

  const previewUrl = URL.createObjectURL(finalBlob);
  return {
    id,
    kind: options.kind,
    fileName: options.fileName,
    mimeType: finalMime,
    sizeBytes: finalBlob.size,
    durationSec,
    storageKey,
    posterUrl,
    previewUrl,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
