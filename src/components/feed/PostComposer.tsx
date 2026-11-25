import React, { useEffect, useRef, useState } from 'react';
import {
  ImagePlus,
  Megaphone,
  Mic,
  Music2,
  Pin,
  Send,
  Smile,
  Sparkles,
  Square,
  Video,
  X,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { uploadAttachmentWithProgress } from '../../services/firebaseSyncService';
import { formatBytes, formatDuration, prepareAndStoreAttachment } from '../../services/storageService';
import type { FamilyPost, MediaAttachment, MediaKind } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { BottomSheet } from '../shared/BottomSheet';
import { StickerGifBadge, StickerGifPicker } from '../shared/StickerGifPicker';

export const PostComposer: React.FC = () => {
  const { snapshot, currentUser, createPost, notify } = useFamilyApp();
  const { triggerFeedback } = useAppearance();
  if (!currentUser) return null;

  const flags = snapshot.featureFlags;
  const isAdmin = currentUser.role === 'ADMIN';

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | undefined>(undefined);
  const [pickerSheetOpen, setPickerSheetOpen] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cloudUploadPct, setCloudUploadPct] = useState<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFileChange = async (files: FileList | null, kind: MediaKind) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachment = await prepareAndStoreAttachment(file, {
          kind,
          fileName: file.name,
          mimeType: file.type,
          maxUploadMb: flags.maxUploadMb,
          autoCompressImages: flags.autoCompressImages,
        });
        setAttachments((prev) => [...prev, attachment]);
      }
      triggerFeedback('chime');
      if (kind === 'IMAGE' && flags.autoCompressImages) {
        notify('Imagen optimizada y lista para compartir ✨', 'success');
      }
    } catch (err) {
      notify((err as Error).message || 'No se pudo adjuntar el archivo.', 'warning');
    } finally {
      setUploading(false);
    }
  };

  const startVoiceRecording = async () => {
    if (!flags.voiceNotesEnabled) {
      notify('Las notas de voz están desactivadas desde el Panel Admin.', 'warning');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordSecondsRef.current = 0;
      setRecordSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          try {
            const att = await prepareAndStoreAttachment(blob, {
              kind: 'AUDIO',
              fileName: `nota-voz-${new Date().toLocaleTimeString('es-ES').replace(/:/g, '-')}.webm`,
              mimeType: blob.type || 'audio/webm',
              durationSec: Math.max(1, recordSecondsRef.current),
              maxUploadMb: flags.maxUploadMb,
              autoCompressImages: flags.autoCompressImages,
            });
            setAttachments((prev) => [...prev, att]);
            triggerFeedback('chime');
            notify('Nota de voz grabada con cariño 🎙️', 'success');
          } catch (err) {
            notify((err as Error).message, 'warning');
          }
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      triggerFeedback('tap');
      timerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      notify('No se pudo acceder al micrófono. Revisa los permisos del navegador.', 'warning');
    }
  };

  const stopVoiceRecording = () => {
    setRecording(false);
    recorderRef.current?.stop();
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!text.trim() && attachments.length === 0 && !selectedStickerId) return;

    let category: FamilyPost['category'] = 'UPDATE';
    if (isAnnouncement) category = 'ANNOUNCEMENT';
    else if (attachments.some((a) => a.kind === 'VIDEO')) category = 'VIDEO';
    else if (attachments.some((a) => a.kind === 'AUDIO')) category = 'VOICE';
    else if (attachments.some((a) => a.kind === 'IMAGE')) category = 'PHOTO';

    let readyAttachments = attachments;
    const needsChunkUpload = attachments.some(
      (a) => !a.cloudMediaId && (a.kind === 'VIDEO' || a.sizeBytes > 480_000)
    );

    if (needsChunkUpload) {
      setUploading(true);
      setCloudUploadPct(5);
      try {
        const uploaded: MediaAttachment[] = [];
        for (const att of attachments) {
          if (!att.cloudMediaId && (att.kind === 'VIDEO' || att.sizeBytes > 480_000)) {
            const doneAtt = await uploadAttachmentWithProgress(att, currentUser.id, (pct) =>
              setCloudUploadPct(pct)
            );
            uploaded.push(doneAtt);
          } else {
            uploaded.push(att);
          }
        }
        readyAttachments = uploaded;
      } catch (err) {
        console.error('Video cloud upload error:', err);
        notify('Error subiendo el video a la nube. Verifica tu conexión e intenta de nuevo.', 'warning');
        setUploading(false);
        setCloudUploadPct(null);
        return;
      } finally {
        setUploading(false);
        setCloudUploadPct(null);
      }
    }

    triggerFeedback('chime');
    createPost({
      text:
        text.trim() ||
        (selectedStickerId
          ? '¡Un mensajito con cariño para toda la familia! 💛'
          : category === 'PHOTO'
            ? 'Foto compartida en Cuaderno Social de la familia'
            : category === 'VIDEO'
              ? 'Video familiar compartido'
              : 'Nota de voz familiar'),
      category,
      attachments: readyAttachments,
      stickerId: selectedStickerId,
      pinned: isAdmin && pinned,
    });

    setText('');
    setAttachments([]);
    setSelectedStickerId(undefined);
    setPickerSheetOpen(false);
    setIsAnnouncement(false);
    setPinned(false);
  };

  return (
    <>
      <form onSubmit={handlePublish} className="card-crochet rounded-3xl p-3.5 sm:p-5">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="shrink-0 rounded-full border-2 border-dashed border-brazil-500 p-0.5">
            <MemberAvatar member={currentUser} size="md" showPresence />
          </div>
          <div className="min-w-0 flex-1">
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`¿Qué alegría quieres compartir hoy con la familia, ${currentUser.name.split(' ')[0]}? 💛`}
              className="liquid-chat-input w-full resize-none rounded-2xl px-3.5 py-2.5 text-[15px] text-espresso-900 placeholder:text-espresso-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Voice Recorder Indicator */}
        {recording && (
          <div className="mt-2.5 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5">
            <div className="flex items-center gap-2.5 text-sm font-bold text-rose-700">
              <span className="h-3 w-3 animate-pulse rounded-full bg-rose-600" />
              Grabando nota de voz… {formatDuration(recordSeconds)}
            </div>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="btn-yarn-press inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Detener
            </button>
          </div>
        )}

        {/* Selected Sticker / GIF Preview */}
        {selectedStickerId && (
          <div className="relative mt-3 inline-block">
            <StickerGifBadge stickerId={selectedStickerId} />
            <button
              type="button"
              onClick={() => setSelectedStickerId(undefined)}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-espresso-900 text-white shadow hover:bg-rose-600"
              aria-label="Quitar sticker o GIF"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Media Previews */}
        {attachments.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative overflow-hidden rounded-2xl border border-cotton-300 bg-cotton-50 p-2.5"
              >
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== att.id))}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-espresso-900/80 text-white"
                  aria-label="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {att.kind === 'IMAGE' && att.previewUrl && (
                  <img
                    src={att.previewUrl}
                    alt={att.fileName}
                    className="h-36 w-full rounded-xl object-cover"
                  />
                )}
                {att.kind === 'VIDEO' && att.previewUrl && (
                  <video
                    src={att.previewUrl}
                    controls
                    className="h-36 w-full rounded-xl bg-black object-cover"
                  />
                )}
                {att.kind === 'AUDIO' && att.previewUrl && (
                  <div className="pt-4">
                    <audio src={att.previewUrl} controls className="w-full" />
                  </div>
                )}
                <p className="mt-1.5 truncate text-xs font-semibold text-espresso-700">
                  {att.fileName} · {formatBytes(att.sizeBytes)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Hidden Native Media Pickers */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFileChange(e.target.files, 'IMAGE');
            e.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            void handleFileChange(e.target.files, 'VIDEO');
            e.target.value = '';
          }}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void handleFileChange(e.target.files, 'AUDIO');
            e.target.value = '';
          }}
        />

        {/* Quick Action Chips Row (Foto, Video, Voz, GIF, Stickers, Audio, Anuncio) */}
        <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              photoInputRef.current?.click();
            }}
            disabled={uploading}
            className="btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-brazil-200 bg-brazil-50 px-3 text-xs font-bold text-forest-800 hover:bg-brazil-100"
          >
            <ImagePlus className="h-4 w-4 text-brazil-600" />
            Foto
          </button>

          {flags.videoUploadsEnabled && (
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                videoInputRef.current?.click();
              }}
              disabled={uploading}
              className="btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-ocean-100 bg-ocean-50 px-3 text-xs font-bold text-ocean-700 hover:bg-ocean-100"
            >
              <Video className="h-4 w-4 text-ocean-600" />
              Video
            </button>
          )}

          {flags.voiceNotesEnabled && (
            <button
              type="button"
              onClick={() => (recording ? stopVoiceRecording() : void startVoiceRecording())}
              disabled={uploading}
              className={`btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                recording
                  ? 'border-rose-300 bg-rose-100 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Mic className="h-4 w-4 text-terracotta-600" />
              {recording ? 'Parar' : 'Voz'}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              setPickerSheetOpen(true);
            }}
            className={`btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
              selectedStickerId
                ? 'border-solar-500 bg-solar-200 text-forest-900'
                : 'border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100'
            }`}
          >
            <Sparkles className="h-4 w-4 text-pink-600" />
            GIF
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              setPickerSheetOpen(true);
            }}
            className="btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 text-xs font-bold text-purple-800 hover:bg-purple-100"
          >
            <Smile className="h-4 w-4 text-purple-600" />
            Stickers
          </button>

          {flags.voiceNotesEnabled && (
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                audioInputRef.current?.click();
              }}
              disabled={uploading}
              className="btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
            >
              <Music2 className="h-4 w-4 text-indigo-600" />
              Audio
            </button>
          )}

          {flags.announcementsEnabled && (
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setIsAnnouncement((v) => !v);
              }}
              className={`btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                isAnnouncement
                  ? 'border-solar-500 bg-solar-300 text-forest-900'
                  : 'border-solar-200 bg-solar-50 text-amber-900 hover:bg-solar-100'
              }`}
            >
              <Megaphone className="h-4 w-4 text-amber-700" />
              Anuncio
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setPinned((v) => !v);
              }}
              className={`btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-bold ${
                pinned
                  ? 'border-forest-700 bg-forest-700 text-solar-300'
                  : 'border-cotton-300 bg-cotton-100 text-espresso-700'
              }`}
              title="Fijar esta publicación arriba del muro"
            >
              <Pin className="h-3.5 w-3.5" />
              Fijar
            </button>
          )}
        </div>

        {/* Cloud Video Upload Progress Bar */}
        {cloudUploadPct !== null && (
          <div className="mt-3 rounded-2xl border border-brazil-200 bg-brazil-50 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-forest-900">
              <span>🎬 Subiendo video a la nube familiar…</span>
              <span>{cloudUploadPct}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-forest-700 via-brazil-500 to-solar-400 transition-all duration-200"
                style={{ width: `${cloudUploadPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Golden Yarn Cord Divider + Centered 3D Forest-Green Crochet "Publicar" Button */}
        <div className="relative mt-3.5 flex items-center justify-center pt-1">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 border-t-2 border-dashed border-artisanal-500/65" />
          <button
            type="submit"
            disabled={uploading || recording || (!text.trim() && attachments.length === 0 && !selectedStickerId)}
            className="crochet-green-3d btn-yarn-press relative z-10 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-8 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4 text-solar-300" />
            {cloudUploadPct !== null
              ? `Subiendo ${cloudUploadPct}%…`
              : uploading
                ? 'Procesando…'
                : 'Publicar'}
          </button>
        </div>
      </form>

      {/* Mobile-First Animated Bottom Sheet for Stickers & GIFs */}
      <BottomSheet
        open={pickerSheetOpen}
        title="Stickers y GIFs de la Familia"
        onClose={() => setPickerSheetOpen(false)}
      >
        <StickerGifPicker
          onSelect={(item) => {
            triggerFeedback('heart');
            setSelectedStickerId(item.id);
            setPickerSheetOpen(false);
          }}
          onClose={() => setPickerSheetOpen(false)}
        />
      </BottomSheet>
    </>
  );
};
