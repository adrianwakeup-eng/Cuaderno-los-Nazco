import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Heart, Plus, Send, X } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { compressImageFile } from '../../services/storageService';
import type { FamilyStory } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { BottomSheet } from '../shared/BottomSheet';

const STORIES_KEY = 'cuaderno_los_nazco_stories_v1';

const CROCHET_RING_COLORS = [
  'ring-[#398B4B] border-[#F2C443]',
  'ring-[#F2C443] border-[#164D32]',
  'ring-[#16466C] border-[#F2C443]',
  'ring-[#BA9254] border-[#398B4B]',
  'ring-[#D95D52] border-[#F2C443]',
];

const DEMO_IDS = new Set(['nazco_elena', 'nazco_rosa', 'nazco_sofia', 'nazco_carlos', 'nazco_mateo']);

function loadStories(): FamilyStory[] {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FamilyStory[];
    return Array.isArray(parsed) ? parsed.filter((s) => !DEMO_IDS.has(s.authorId)) : [];
  } catch {
    return [];
  }
}

export const StoriesBar: React.FC = () => {
  const {
    snapshot,
    cloudStories,
    publishCloudStory,
    currentUser,
    openProfile,
    openChatWithMember,
    sendMessage,
    triggerJoyBurst,
    notify,
  } = useFamilyApp();
  const { triggerFeedback } = useAppearance();

  const [localStories, setLocalStories] = useState<FamilyStory[]>(loadStories);
  const stories = cloudStories.length > 0 ? cloudStories : localStories;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newImage, setNewImage] = useState<string | undefined>(undefined);
  const [replyText, setReplyText] = useState('');
  const [progress, setProgress] = useState(0);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORIES_KEY, JSON.stringify(localStories));
    } catch {
      // ignore quota
    }
  }, [localStories]);

  // Auto-advance Instagram-style story timer
  useEffect(() => {
    if (viewerIndex === null) return;
    setProgress(0);
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setViewerIndex((idx) =>
            idx !== null && idx + 1 < stories.length ? idx + 1 : null
          );
          return 0;
        }
        return prev + 2;
      });
    }, 110);
    return () => window.clearInterval(interval);
  }, [viewerIndex, stories.length]);

  if (!currentUser) return null;

  const activeMembers = snapshot.members.filter((m) => m.status === 'ACTIVE');

  const openMemberStory = (memberId: string) => {
    triggerFeedback('tap');
    const idx = stories.findIndex((s) => s.authorId === memberId);
    if (idx >= 0) {
      setViewerIndex(idx);
      const target = stories[idx];
      if (!target.viewedBy.includes(currentUser.id)) {
        const updated = { ...target, viewedBy: [...target.viewedBy, currentUser.id] };
        setLocalStories((prev) => prev.map((st) => (st.id === target.id ? updated : st)));
        publishCloudStory(updated);
      }
    } else {
      openProfile(memberId);
    }
  };

  const handleStoryPhoto = async (file: File | undefined) => {
    if (!file) return;
    const blob = await compressImageFile(file, 960, 0.78);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setNewImage(reader.result);
    };
    reader.readAsDataURL(blob);
  };

  const publishStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim() && !newImage) return;
    const item: FamilyStory = {
      id: `story_${Date.now()}`,
      authorId: currentUser.id,
      caption: newCaption.trim() || 'Momento especial en familia 💛',
      imageUrl: newImage,
      bgGradient: 'linear-gradient(155deg, #164D32 0%, #398B4B 54%, #F2C443 100%)',
      createdAt: new Date().toISOString(),
      viewedBy: [currentUser.id],
      reactions: [],
    };
    setLocalStories((prev) => [item, ...prev]);
    publishCloudStory(item);
    setNewCaption('');
    setNewImage(undefined);
    setShowAddStory(false);
    triggerFeedback('chime');
    triggerJoyBurst('✨', 8);
    notify('¡Tu historia ya se comparte en todos los teléfonos!', 'success');
  };

  const currentStory = viewerIndex !== null ? stories[viewerIndex] : null;
  const currentStoryAuthor = currentStory
    ? snapshot.members.find((m) => m.id === currentStory.authorId)
    : null;

  return (
    <>
      {/* Horizontal Touch-Scrollable Stories Row with Crochet Circular Frames */}
      <div className="card-crochet rounded-3xl px-3.5 py-3">
        <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-0.5">
          {/* 1. Mi historia (+) */}
          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              setShowAddStory(true);
            }}
            className="btn-yarn-press flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center"
          >
            <div className="relative rounded-full border-2 border-dashed border-brazil-500 p-1">
              <MemberAvatar member={currentUser} size="md" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-forest-700 text-solar-300 shadow">
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
              </span>
            </div>
            <span className="w-full truncate text-[11px] font-bold text-forest-800">
              Mi historia
            </span>
          </button>

          {/* 2. Active Family Members with Crochet Frames & Story Indicators */}
          {activeMembers
            .filter((m) => m.id !== currentUser.id)
            .map((member, idx) => {
              const memberStory = stories.find((s) => s.authorId === member.id);
              const hasUnseen = memberStory && !memberStory.viewedBy.includes(currentUser.id);
              const ringClass = CROCHET_RING_COLORS[idx % CROCHET_RING_COLORS.length];

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => openMemberStory(member.id)}
                  className="btn-yarn-press flex w-[66px] shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <div
                    className={`relative rounded-full border-[2.5px] border-dashed p-[3px] ring-2 ${
                      hasUnseen
                        ? 'ring-solar-400 border-brazil-500 shadow-[0_0_12px_rgba(242,196,67,0.55)]'
                        : memberStory
                          ? ringClass
                          : 'border-cotton-300 ring-cotton-200'
                    }`}
                  >
                    <MemberAvatar member={member} size="md" showPresence />
                    {hasUnseen && (
                      <span className="absolute -top-1 right-0 h-3 w-3 rounded-full border-2 border-white bg-solar-400" />
                    )}
                  </div>
                  <span className="w-full truncate text-[11px] font-semibold text-espresso-800">
                    {member.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Add Story Bottom Sheet */}
      <BottomSheet
        open={showAddStory}
        title="Añadir a Mi historia"
        onClose={() => setShowAddStory(false)}
      >
        <form onSubmit={publishStory} className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void handleStoryPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="crochet-parchment btn-yarn-press flex min-h-[140px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-forest-800"
          >
            {newImage ? (
              <img src={newImage} alt="Vista previa" className="max-h-56 w-full rounded-xl object-cover" />
            ) : (
              <>
                <Camera className="h-8 w-8 text-forest-700" />
                <span className="text-sm font-bold">Tomar o elegir fotografía</span>
                <span className="text-xs text-espresso-600">O escribe solo un mensaje bonito abajo</span>
              </>
            )}
          </button>

          <textarea
            rows={3}
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="Cuenta un momento lindo de tu día para la familia…"
            className="w-full rounded-2xl border border-cotton-300 bg-white px-4 py-3 text-sm focus:border-forest-700 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!newCaption.trim() && !newImage}
            className="crochet-green-3d btn-yarn-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-45"
          >
            <Send className="h-4 w-4 text-solar-300" />
            Publicar historia
          </button>
        </form>
      </BottomSheet>

      {/* Fullscreen Instagram-Style Story Viewer */}
      {currentStory && currentStoryAuthor && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[85] flex h-[100dvh] flex-col justify-between bg-forest-900 text-white"
          style={{
            background: currentStory.imageUrl ? '#0D1E14' : currentStory.bgGradient,
          }}
          onTouchStart={(e) => {
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            if (dy > 80) {
              setViewerIndex(null);
            } else if (dx < -45) {
              setViewerIndex((idx) => (idx !== null && idx + 1 < stories.length ? idx + 1 : null));
            } else if (dx > 45) {
              setViewerIndex((idx) => (idx !== null && idx > 0 ? idx - 1 : 0));
            }
            touchStartRef.current = null;
          }}
        >
          {/* Background Photo if present */}
          {currentStory.imageUrl && (
            <img
              src={currentStory.imageUrl}
              alt={currentStory.caption}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
          )}

          {/* Top Progress Bars + Author */}
          <div className="pt-safe relative z-20 bg-gradient-to-b from-black/65 to-transparent px-4 pb-6 pt-3">
            <div className="mb-3 flex gap-1.5">
              {stories.map((st, idx) => (
                <div key={st.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-solar-400 transition-all duration-100"
                    style={{
                      width:
                        idx < (viewerIndex ?? 0)
                          ? '100%'
                          : idx === viewerIndex
                            ? `${progress}%`
                            : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MemberAvatar member={currentStoryAuthor} size="sm" showPresence />
                <div>
                  <p className="text-sm font-bold">{currentStoryAuthor.name}</p>
                  <p className="text-[11px] text-white/80">{currentStoryAuthor.relationship}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewerIndex(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                aria-label="Cerrar historia"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Left/Right Tap Zones */}
          <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
            <button
              type="button"
              onClick={() => setViewerIndex((i) => (i && i > 0 ? i - 1 : 0))}
              className="absolute inset-y-0 left-0 w-1/3"
              aria-label="Historia anterior"
            />
            <button
              type="button"
              onClick={() =>
                setViewerIndex((i) => (i !== null && i + 1 < stories.length ? i + 1 : null))
              }
              className="absolute inset-y-0 right-0 w-1/3"
              aria-label="Siguiente historia"
            />

            <p className="relative z-20 max-w-md rounded-3xl bg-black/35 px-6 py-4 font-editorial text-2xl font-bold leading-snug drop-shadow-md backdrop-blur-sm">
              {currentStory.caption}
            </p>
          </div>

          {/* Bottom Quick Reply + Amigurumi Heart */}
          <div className="pb-safe relative z-20 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent px-4 pb-5 pt-4">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Responder a ${currentStoryAuthor.name.split(' ')[0]}…`}
              className="h-12 flex-1 rounded-full border border-white/35 bg-white/15 px-4 text-sm text-white placeholder:text-white/75 backdrop-blur-md focus:border-solar-400 focus:outline-none"
            />
            {replyText.trim() && (
              <button
                type="button"
                onClick={() => {
                  const targetId = currentStoryAuthor.id;
                  const txt = `Sobre tu historia: "${replyText.trim()}"`;
                  setReplyText('');
                  setViewerIndex(null);
                  openChatWithMember(targetId);
                  const chat = snapshot.chats.find(
                    (c) =>
                      c.kind === 'DIRECT' &&
                      c.participantIds.includes(currentUser.id) &&
                      c.participantIds.includes(targetId)
                  );
                  if (chat) sendMessage(chat.id, txt);
                  notify('Respuesta enviada al chat 💛', 'success');
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-brazil-500 text-white shadow"
                aria-label="Enviar respuesta"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerFeedback('heart');
                triggerJoyBurst('❤️', 8);
                notify('¡Corazón tejido enviado a la historia!', 'success');
              }}
              className="btn-yarn-press flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg"
              aria-label="Reaccionar con corazón"
            >
              <Heart className="h-6 w-6 fill-current" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
