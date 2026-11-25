import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  runTransaction,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AlbumPhotoItem,
  CallMode,
  CallScope,
  FamilyAppSnapshot,
  FamilyChat,
  FamilyInvite,
  FamilyMember,
  FamilyPost,
  FamilyStory,
  FeatureFlags,
  MediaAttachment,
} from '../types';
import { ensureFirebaseSession, firestoreDb } from './firebaseClient';
import { getMediaBlob, getMediaBlobUrl, saveMediaBlob } from './storageService';

const FAMILY_ROOT = 'families/los_nazco';
const RAW_CHUNK_BYTES = 480_000; // ~640 KB base64 per chunk — comfortably under Firestore 1 MiB doc limit
const MAX_INLINE_BYTES = 480_000;
const MAX_CLOUD_DATA_URL_LEN = 700_000;

export interface CloudMetaConfig {
  familyName: string;
  cloudOwnerEmail: string;
  adminPassword: string;
  invites: FamilyInvite[];
  featureFlags: FeatureFlags;
  updatedAt: string;
}

export interface LiveCallSignal {
  id: string;
  roomCode: string;
  title: string;
  mode: CallMode;
  scope: CallScope;
  chatId?: string;
  participantIds: string[];
  startedById: string;
  callerName: string;
  status: 'RINGING' | 'ACCEPTED' | 'ENDED';
  createdAt: string;
}

export type CloudSyncState = 'CONNECTING' | 'CONNECTED' | 'OFFLINE' | 'ERROR';

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const sub = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function resolveBlobFromAttachment(att: MediaAttachment): Promise<Blob | null> {
  if (att.storageKey) {
    const fromDb = await getMediaBlob(att.storageKey);
    if (fromDb) return fromDb;
  }
  if (att.previewUrl && att.previewUrl.startsWith('blob:')) {
    try {
      const res = await fetch(att.previewUrl);
      return await res.blob();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Splits a video / large audio / large photo Blob into Firestore-safe chunks
 * so every family phone & computer can stream and cache it without needing Blaze Storage.
 */
async function uploadChunkedMediaToCloud(
  blob: Blob,
  att: MediaAttachment,
  authorId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  await ensureFirebaseSession();
  const mediaId = att.cloudMediaId || `cmed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkCount = Math.max(1, Math.ceil(bytes.length / RAW_CHUNK_BYTES));
  const safeMime = att.mimeType || blob.type || (att.kind === 'VIDEO' ? 'video/mp4' : 'audio/webm');

  // Upload chunks in parallel batches of 4 for fast & reliable mobile uploads
  const batchSize = 4;
  let uploaded = 0;
  onProgress?.(5);
  for (let i = 0; i < chunkCount; i += batchSize) {
    const tasks: Promise<void>[] = [];
    for (let j = i; j < Math.min(chunkCount, i + batchSize); j++) {
      const slice = bytes.subarray(j * RAW_CHUNK_BYTES, Math.min(bytes.length, (j + 1) * RAW_CHUNK_BYTES));
      const b64 = uint8ToBase64(slice);
      const chunkRef = doc(firestoreDb, `${FAMILY_ROOT}/media/${mediaId}/chunks`, String(j));
      tasks.push(
        setDoc(chunkRef, { index: j, data: b64 }).then(() => {
          uploaded += 1;
          onProgress?.(Math.min(95, Math.round((uploaded / chunkCount) * 95)));
        })
      );
    }
    await Promise.all(tasks);
  }

  // Write manifest doc last so readers know all chunks are ready
  await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/media`, mediaId), {
    id: mediaId,
    fileName: att.fileName.slice(0, 190) || 'archivo',
    mimeType: safeMime.slice(0, 95),
    sizeBytes: bytes.length,
    chunkCount,
    authorId,
    createdAt: new Date().toISOString(),
  });
  onProgress?.(100);

  return mediaId;
}

/** Public helper so PostComposer can upload video/audio chunks with live % progress BEFORE publishing */
export async function uploadAttachmentWithProgress(
  att: MediaAttachment,
  authorId: string,
  onProgress?: (pct: number) => void
): Promise<MediaAttachment> {
  if (att.cloudMediaId) {
    onProgress?.(100);
    return att;
  }
  const blob = await resolveBlobFromAttachment(att);
  if (!blob) return att;
  if (att.kind !== 'VIDEO' && blob.size <= MAX_INLINE_BYTES) {
    onProgress?.(100);
    return att;
  }
  const cloudMediaId = await uploadChunkedMediaToCloud(blob, att, authorId, onProgress);
  return {
    ...att,
    cloudMediaId,
  };
}

const activeDownloads = new Map<string, Promise<string | null>>();

/**
 * Downloads chunked video/audio from Firestore, caches it in local IndexedDB
 * for instant replay, and returns a playable Blob URL.
 */
export async function resolvePlayableMediaUrl(att: MediaAttachment): Promise<string | null> {
  // 1. Already a real playable URL (not SVG placeholder)
  if (
    att.previewUrl &&
    !att.previewUrl.startsWith('data:image/svg') &&
    (att.previewUrl.startsWith('blob:') ||
      att.previewUrl.startsWith('https://') ||
      att.previewUrl.startsWith('data:video/') ||
      att.previewUrl.startsWith('data:audio/'))
  ) {
    return att.previewUrl;
  }

  // 2. Check local IndexedDB cache first (instant on uploader device & cached replays!)
  const cacheKey = att.cloudMediaId ? `cloud_${att.cloudMediaId}` : att.storageKey;
  if (att.storageKey) {
    const localUrl = await getMediaBlobUrl(att.storageKey);
    if (localUrl) return localUrl;
  }
  if (cacheKey && cacheKey !== att.storageKey) {
    const cachedCloudUrl = await getMediaBlobUrl(cacheKey);
    if (cachedCloudUrl) return cachedCloudUrl;
  }

  // 3. Download chunked binary from Firestore
  if (!att.cloudMediaId) return null;

  const existing = activeDownloads.get(att.cloudMediaId);
  if (existing) return existing;

  const downloadTask = (async () => {
    try {
      await ensureFirebaseSession();
      const metaSnap = await getDoc(doc(firestoreDb, `${FAMILY_ROOT}/media`, att.cloudMediaId!));
      const meta = metaSnap.exists() ? (metaSnap.data() as { mimeType?: string }) : null;
      const chunksSnap = await getDocs(
        collection(firestoreDb, `${FAMILY_ROOT}/media/${att.cloudMediaId}/chunks`)
      );
      if (chunksSnap.empty) return null;

      const sorted = chunksSnap.docs
        .map((d) => d.data() as { index: number; data: string })
        .sort((a, b) => a.index - b.index);

      const parts: BlobPart[] = sorted.map((c) => {
        const u8 = base64ToUint8(c.data);
        return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
      });
      const mime = meta?.mimeType || att.mimeType || (att.kind === 'VIDEO' ? 'video/mp4' : 'audio/webm');
      const blob = new Blob(parts, { type: mime });

      if (cacheKey) {
        await saveMediaBlob(cacheKey, blob, {
          kind: att.kind,
          fileName: att.fileName,
          mimeType: mime,
        }).catch(() => {});
      }
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error downloading chunked cloud media:', err);
      return null;
    } finally {
      activeDownloads.delete(att.cloudMediaId!);
    }
  })();

  activeDownloads.set(att.cloudMediaId, downloadTask);
  return downloadTask;
}

/**
 * Prepares any attachment (image, video, voice note) for cloud Firestore sync:
 * - Small images/audios (<= 480 KB) inline directly for zero extra latency.
 * - Videos & larger files (up to 25 MB) automatically upload as Firestore chunks!
 */
async function prepareAttachmentForCloud(
  att: MediaAttachment,
  authorId: string
): Promise<MediaAttachment> {
  // Already uploaded as chunked media
  if (att.cloudMediaId) {
    return {
      ...att,
      previewUrl: att.previewUrl?.startsWith('blob:') ? undefined : att.previewUrl,
    };
  }

  // Already a small data URL or external https URL (e.g. demo SVG)
  if (att.previewUrl && !att.previewUrl.startsWith('blob:')) {
    if (att.previewUrl.startsWith('data:') && att.previewUrl.length <= MAX_CLOUD_DATA_URL_LEN) {
      return att;
    }
    if (att.previewUrl.startsWith('https://') || att.previewUrl.startsWith('./')) {
      return att;
    }
  }

  const blob = await resolveBlobFromAttachment(att);
  if (!blob) {
    return {
      ...att,
      previewUrl: att.previewUrl?.startsWith('blob:') ? undefined : att.previewUrl,
    };
  }

  // Small images/audio -> inline directly
  if (att.kind !== 'VIDEO' && blob.size <= MAX_INLINE_BYTES) {
    const dataUrl = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const out = typeof reader.result === 'string' ? reader.result : undefined;
        resolve(out && out.length <= MAX_CLOUD_DATA_URL_LEN ? out : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
    if (dataUrl) {
      return { ...att, previewUrl: dataUrl };
    }
  }

  // Videos & larger audio/images -> upload as Firestore binary chunks!
  const cloudMediaId = await uploadChunkedMediaToCloud(blob, att, authorId);
  return {
    ...att,
    cloudMediaId,
    previewUrl: undefined,
  };
}

export const firebaseSyncService = {
  async ensureCloudSeeded(seed: FamilyAppSnapshot): Promise<boolean> {
    try {
      await ensureFirebaseSession();
      const metaRef = doc(firestoreDb, `${FAMILY_ROOT}/meta/config`);
      const snap = await getDoc(metaRef);
      if (snap.exists()) return true;

      const meta: CloudMetaConfig = {
        familyName: seed.familyName,
        cloudOwnerEmail: seed.cloudOwnerEmail,
        adminPassword: seed.adminPassword,
        invites: seed.invites,
        featureFlags: seed.featureFlags,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(metaRef, stripUndefined(meta));

      await Promise.all([
        ...seed.members.map((m) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/members`, m.id), stripUndefined(m))
        ),
        ...seed.posts.map((p) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/posts`, p.id), stripUndefined(p))
        ),
        ...seed.chats.map((c) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/chats`, c.id), stripUndefined(c))
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  },

  subscribeAll(handlers: {
    onMeta: (meta: CloudMetaConfig) => void;
    onMembers: (members: FamilyMember[]) => void;
    onPosts: (posts: FamilyPost[]) => void;
    onChats: (chats: FamilyChat[]) => void;
    onStories: (stories: FamilyStory[]) => void;
    onAlbums: (photos: AlbumPhotoItem[]) => void;
    onCalls: (calls: LiveCallSignal[]) => void;
    onStatus: (state: CloudSyncState) => void;
  }): () => void {
    const unsubs: Unsubscribe[] = [];
    let cancelled = false;
    let authRetry: number | undefined;

    handlers.onStatus('CONNECTING');

    const connect = (uid: string | null) => {
      if (cancelled) return;
      if (!uid) {
        handlers.onStatus(navigator.onLine ? 'ERROR' : 'OFFLINE');
        authRetry = window.setTimeout(() => void ensureFirebaseSession().then(connect), 5000);
        return;
      }

      const onErr = () => {
        handlers.onStatus(navigator.onLine ? 'ERROR' : 'OFFLINE');
      };

      unsubs.push(
        onSnapshot(
          doc(firestoreDb, `${FAMILY_ROOT}/meta/config`),
          (snap) => {
            if (snap.exists()) {
              handlers.onStatus('CONNECTED');
              handlers.onMeta(snap.data() as CloudMetaConfig);
            }
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/members`),
          { includeMetadataChanges: true },
          (qs) => {
            if (qs.metadata.fromCache || qs.metadata.hasPendingWrites) return;
            handlers.onStatus('CONNECTED');
            const list = qs.docs.map((d) => d.data() as FamilyMember);
            if (list.length > 0) handlers.onMembers(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/posts`),
          (qs) => {
            handlers.onStatus('CONNECTED');
            const list = qs.docs
              .map((d) => d.data() as FamilyPost)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onPosts(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/chats`),
          (qs) => {
            handlers.onStatus('CONNECTED');
            const list = qs.docs
              .map((d) => d.data() as FamilyChat)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            handlers.onChats(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/stories`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as FamilyStory)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onStories(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/albums`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as AlbumPhotoItem)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onAlbums(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/calls`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as LiveCallSignal)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onCalls(list);
          },
          onErr
        )
      );
    };
    void ensureFirebaseSession().then(connect);

    return () => {
      cancelled = true;
      window.clearTimeout(authRetry);
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          // ignore
        }
      });
    };
  },

  async saveMetaConfig(snapshot: FamilyAppSnapshot): Promise<void> {
    await ensureFirebaseSession();
    const meta: CloudMetaConfig = {
      familyName: snapshot.familyName,
      cloudOwnerEmail: snapshot.cloudOwnerEmail,
      adminPassword: snapshot.adminPassword,
      invites: snapshot.invites,
      featureFlags: snapshot.featureFlags,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/meta/config`), stripUndefined(meta));
  },

  async refreshMembers(): Promise<FamilyMember[]> {
    if (!(await ensureFirebaseSession())) throw new Error('firebase-auth-unavailable');
    const members = await getDocsFromServer(collection(firestoreDb, `${FAMILY_ROOT}/members`));
    return members.docs.map((entry) => entry.data() as FamilyMember);
  },

  async confirmMemberRegistration(member: FamilyMember): Promise<FamilyMember> {
    if (!(await ensureFirebaseSession())) throw new Error('firebase-auth-unavailable');
    const memberRef = doc(firestoreDb, `${FAMILY_ROOT}/members`, member.id);
    return runTransaction(firestoreDb, async (tx) => {
      const existing = await tx.get(memberRef);
      if (existing.exists()) {
        const account = existing.data() as FamilyMember;
        if (account.status !== 'ACTIVE' || account.password !== member.password) {
          throw new Error('family-account-unavailable');
        }
        return account;
      }
      tx.set(memberRef, stripUndefined(member));
      return member;
    });
  },

  async updateMemberFields(
    memberId: string,
    fields: Partial<Pick<FamilyMember, 'presence' | 'lastActiveAt' | 'name' | 'username' | 'email' | 'password' |
      'relationship' | 'location' | 'bio' | 'avatarUrl' | 'coverUrl'>>
  ): Promise<void> {
    if (!(await ensureFirebaseSession())) throw new Error('firebase-auth-unavailable');
    await updateDoc(doc(firestoreDb, `${FAMILY_ROOT}/members`, memberId), fields);
  },

  async setMemberAccess(memberId: string, status: FamilyMember['status']): Promise<void> {
    if (!(await ensureFirebaseSession())) throw new Error('firebase-auth-unavailable');
    const memberRef = doc(firestoreDb, `${FAMILY_ROOT}/members`, memberId);
    await runTransaction(firestoreDb, async (tx) => {
      const account = await tx.get(memberRef);
      if (!account.exists() || account.data().role === 'ADMIN') throw new Error('invalid-member');
      tx.update(memberRef, { status, presence: 'OFFLINE' });
    });
  },

  async saveMember(member: FamilyMember): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/members`, member.id), stripUndefined(member));
  },

  async savePost(post: FamilyPost): Promise<FamilyPost> {
    await ensureFirebaseSession();
    const preparedAttachments = await Promise.all(
      post.attachments.map((att) => prepareAttachmentForCloud(att, post.authorId))
    );
    const cloudPost: FamilyPost = { ...post, attachments: preparedAttachments };
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/posts`, post.id), stripUndefined(cloudPost));
    return cloudPost;
  },

  async deletePost(postId: string): Promise<void> {
    await ensureFirebaseSession();
    await deleteDoc(doc(firestoreDb, `${FAMILY_ROOT}/posts`, postId));
  },

  async saveChat(chat: FamilyChat): Promise<void> {
    await ensureFirebaseSession();
    const preparedMessages = await Promise.all(
      chat.messages.map(async (m) => ({
        ...m,
        attachment: m.attachment
          ? await prepareAttachmentForCloud(m.attachment, m.senderId)
          : undefined,
      }))
    );
    await setDoc(
      doc(firestoreDb, `${FAMILY_ROOT}/chats`, chat.id),
      stripUndefined({ ...chat, messages: preparedMessages })
    );
  },

  async saveStory(story: FamilyStory): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/stories`, story.id), stripUndefined(story));
  },

  async saveAlbumPhoto(photo: AlbumPhotoItem): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/albums`, photo.id), stripUndefined(photo));
  },

  async publishCallSignal(signal: LiveCallSignal): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/calls`, signal.id), stripUndefined(signal));
  },

  async updateCallSignalStatus(
    callId: string,
    status: LiveCallSignal['status']
  ): Promise<void> {
    await ensureFirebaseSession();
    await updateDoc(doc(firestoreDb, `${FAMILY_ROOT}/calls`, callId), { status });
  },
};
