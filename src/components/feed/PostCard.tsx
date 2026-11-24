import React, { useRef, useState } from 'react';
import {
  EyeOff,
  Megaphone,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Pin,
  Play,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { formatBytes, formatDuration } from '../../services/storageService';
import type { FamilyPost } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { AMIGURUMI_REACTIONS, CrochetHeart3D } from '../crochet/CrochetArt';
import { BottomSheet } from '../shared/BottomSheet';
import { StickerGifBadge } from '../shared/StickerGifPicker';
import { CommentThread } from './CommentThread';

function formatPostDate(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `Hace ${h} h`;
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PostCard: React.FC<{ post: FamilyPost }> = ({ post }) => {
  const {
    snapshot,
    currentUser,
    toggleReaction,
    togglePinPost,
    toggleHidePost,
    deletePost,
    openProfile,
    notify,
  } = useFamilyApp();
  const { triggerFeedback } = useAppearance();

  if (!currentUser) return null;

  const [showComments, setShowComments] = useState(post.comments.length > 0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [demoVoicePlaying, setDemoVoicePlaying] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);

  const lastTapRef = useRef<number>(0);
  const lightboxTouchY = useRef<number | null>(null);

  const author = snapshot.members.find((m) => m.id === post.authorId);
  const isAdmin = currentUser.role === 'ADMIN';
  const canDelete = isAdmin || post.authorId === currentUser.id;
  const totalReactions = AMIGURUMI_REACTIONS.reduce(
    (sum, item) => sum + (post.reactions[item.key]?.length ?? 0),
    0
  );

  // Double-tap anywhere on post body/image to send an Amigurumi Heart!
  const handleDoubleTapCheck = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      triggerFeedback('heart');
      const alreadyLiked = (post.reactions['❤️'] ?? []).includes(currentUser.id);
      if (!alreadyLiked) toggleReaction(post.id, '❤️');
      setDoubleTapHeart(true);
      globalThis.setTimeout(() => setDoubleTapHeart(false), 750);
    }
    lastTapRef.current = now;
  };

  const playDemoVoiceGreeting = () => {
    setDemoVoicePlaying(true);
    triggerFeedback('tap');
    notify('Reproduciendo nota de voz de demostración…', 'info');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(post.text);
      utter.lang = 'es-ES';
      utter.rate = 0.96;
      utter.onend = () => setDemoVoicePlaying(false);
      utter.onerror = () => setDemoVoicePlaying(false);
      window.speechSynthesis.speak(utter);
    } else {
      globalThis.setTimeout(() => setDemoVoicePlaying(false), 2500);
    }
  };

  const sharePost = async () => {
    setOptionsOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cuaderno los Nazco · ${author?.name ?? 'Familia'}`,
          text: post.text,
        });
        return;
      } catch {
        // cancelled
      }
    }
    void navigator.clipboard?.writeText(post.text);
    notify('Texto copiado para compartir con la familia 💛', 'success');
  };

  return (
    <>
      <article
        onClick={handleDoubleTapCheck}
        className={`animate-pop-in card-crochet relative rounded-3xl p-4 sm:p-5 ${
          post.pinned ? 'ring-2 ring-solar-400' : ''
        } ${post.hidden ? 'opacity-65' : ''}`}
      >
        {/* Double-tap 3D Crochet Heart Flash */}
        {doubleTapHeart && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <CrochetHeart3D className="h-20 w-20 animate-pop-in" />
          </div>
        )}

        {/* Badges (Publicación fijada, Anuncio familiar, Destacado) */}
        {(post.pinned || post.category === 'ANNOUNCEMENT' || post.featured || post.hidden) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-solar-100 px-3 py-1 text-[11px] font-extrabold text-forest-900 ring-1 ring-solar-400">
                <Pin className="h-3 w-3 text-forest-700" /> Publicación fijada
              </span>
            )}
            {post.category === 'ANNOUNCEMENT' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-solar-300/80 px-3 py-1 text-[11px] font-extrabold text-forest-900">
                <Megaphone className="h-3 w-3" /> Anuncio familiar
              </span>
            )}
            {post.featured && !post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brazil-100 px-2.5 py-1 text-[11px] font-bold text-forest-800">
                <Sparkles className="h-3 w-3" /> Destacado
              </span>
            )}
            {post.hidden && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-700">
                <EyeOff className="h-3 w-3" /> Oculto por Admin
              </span>
            )}
          </div>
        )}

        {/* Author Header */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (author) openProfile(author.id);
            }}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            {author && (
              <div className="rounded-full border border-dashed border-brazil-500 p-0.5">
                <MemberAvatar member={author} size="md" showPresence />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-bold text-espresso-900 hover:underline">
                  {author?.name ?? 'Integrante Nazco'}
                </span>
                {author?.role === 'ADMIN' && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brazil-500" />
                )}
              </div>
              <p className="text-xs text-espresso-600">
                {author?.relationship ? `${author.relationship} · ` : ''}
                {author?.location ? `${author.location} · ` : ''}
                {formatPostDate(post.createdAt)}
              </p>
            </div>
          </button>

          {/* Compact Accessible Options Menu */}
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFeedback('tap');
                  togglePinPost(post.id);
                }}
                className={`hidden h-9 w-9 items-center justify-center rounded-full sm:flex ${
                  post.pinned
                    ? 'bg-solar-200 text-forest-900'
                    : 'text-espresso-500 hover:bg-cotton-200'
                }`}
                title={post.pinned ? 'Quitar fijado' : 'Fijar arriba'}
              >
                <Pin className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFeedback('tap');
                setOptionsOpen(true);
              }}
              className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-full text-espresso-600 hover:bg-cotton-200"
              aria-label="Opciones de publicación"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Post Copy */}
        <p className="mt-3.5 whitespace-pre-wrap text-[15px] leading-relaxed text-espresso-900">
          {post.text}
        </p>

        {/* Sticker / Animated GIF */}
        {post.stickerId && (
          <div className="mt-3.5">
            <StickerGifBadge stickerId={post.stickerId} />
          </div>
        )}

        {/* Media Attachments with Woven Photo Frames */}
        {post.attachments.length > 0 && (
          <div
            className={`mt-3.5 grid gap-2.5 ${
              post.attachments.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {post.attachments.map((att) => {
              if (att.kind === 'IMAGE' && att.previewUrl) {
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoom(1);
                      setLightboxUrl(att.previewUrl!);
                    }}
                    className="photo-heirloom-frame group relative overflow-hidden rounded-2xl bg-cotton-50 text-left"
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.fileName}
                      loading="lazy"
                      className="max-h-[440px] w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                    />
                  </button>
                );
              }

              if (att.kind === 'VIDEO') {
                const isRealVideo = att.previewUrl && !att.previewUrl.startsWith('data:image/svg');
                return (
                  <div
                    key={att.id}
                    className="photo-heirloom-frame overflow-hidden rounded-2xl bg-espresso-900"
                  >
                    {isRealVideo ? (
                      <video
                        src={att.previewUrl}
                        controls
                        playsInline
                        className="max-h-[440px] w-full bg-black"
                      />
                    ) : (
                      <div className="relative">
                        {att.previewUrl && (
                          <img
                            src={att.previewUrl}
                            alt={att.fileName}
                            loading="lazy"
                            className="max-h-[340px] w-full object-cover opacity-95"
                          />
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-forest-900/90 px-4 py-2.5 text-xs text-cotton-50">
                          <span>
                            🎬 {att.fileName} · {formatDuration(att.durationSec)} ·{' '}
                            {formatBytes(att.sizeBytes)}
                          </span>
                          <span className="rounded-full bg-solar-400/20 px-2.5 py-0.5 text-[11px] text-solar-200">
                            Clip demo · sube tu video arriba
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (att.kind === 'AUDIO') {
                return (
                  <div
                    key={att.id}
                    className="crochet-parchment rounded-2xl p-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-700 text-solar-300 shadow">
                          <Mic className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-extrabold text-forest-900">{att.fileName}</p>
                          <p className="text-[11px] font-medium text-espresso-700">
                            Nota de voz · {formatDuration(att.durationSec)} · {formatBytes(att.sizeBytes)}
                          </p>
                        </div>
                      </div>
                      {!att.previewUrl && (
                        <button
                          type="button"
                          onClick={playDemoVoiceGreeting}
                          className="crochet-green-3d btn-yarn-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white"
                        >
                          <Play className="h-3.5 w-3.5 fill-current text-solar-300" />
                          {demoVoicePlaying ? 'Escuchando…' : 'Escuchar'}
                        </button>
                      )}
                    </div>
                    {/* Decorative animated voice waveform */}
                    {demoVoicePlaying && (
                      <div className="mb-2 flex h-5 items-center justify-center gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => (
                          <span
                            key={b}
                            style={{
                              animation: `wavePulse 0.8s ease-in-out ${b * 0.08}s infinite`,
                            }}
                            className="h-4 w-1 rounded-full bg-forest-700"
                          />
                        ))}
                      </div>
                    )}
                    {att.previewUrl && <audio src={att.previewUrl} controls className="w-full" />}
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* 7 Amigurumi Reactions & Comments Bar */}
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-artisanal-500/45 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {AMIGURUMI_REACTIONS.map((item) => {
              const reactors = post.reactions[item.key] ?? [];
              const active = reactors.includes(currentUser.id);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    triggerFeedback('heart');
                    toggleReaction(post.id, item.key);
                  }}
                  title={item.label}
                  className={`btn-yarn-press inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-bold transition ${
                    active
                      ? 'border-forest-700 bg-solar-200 text-forest-900 shadow-sm'
                      : 'border-dashed border-cotton-300 bg-white/85 text-espresso-700 hover:border-brazil-500'
                  }`}
                >
                  <span className="text-sm">{item.key}</span>
                  {reactors.length > 0 && <span>{reactors.length}</span>}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              setShowComments((v) => !v);
            }}
            className="btn-yarn-press inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-brazil-50 px-3.5 py-1.5 text-xs font-extrabold text-forest-800 ring-1 ring-brazil-200 hover:bg-brazil-100"
          >
            <MessageCircle className="h-4 w-4 text-brazil-600" />
            <span>
              {post.comments.length}{' '}
              {post.comments.length === 1 ? 'comentario' : 'comentarios'}
            </span>
            {totalReactions > 0 && <span className="text-espresso-600">· {totalReactions} 💛</span>}
          </button>
        </div>

        {showComments && (
          <div onClick={(e) => e.stopPropagation()}>
            <CommentThread postId={post.id} comments={post.comments} />
          </div>
        )}
      </article>

      {/* Post Options Bottom Sheet */}
      <BottomSheet
        open={optionsOpen}
        title="Opciones de la publicación"
        onClose={() => setOptionsOpen(false)}
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void sharePost()}
            className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-cotton-300 bg-white px-4 text-sm font-bold text-forest-900"
          >
            <Share2 className="h-4 w-4 text-brazil-600" />
            Compartir recuerdo
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  togglePinPost(post.id);
                  setOptionsOpen(false);
                }}
                className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-cotton-300 bg-white px-4 text-sm font-bold text-forest-900"
              >
                <Pin className="h-4 w-4 text-solar-600" />
                {post.pinned ? 'Quitar de fijados' : 'Fijar arriba del muro'}
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleHidePost(post.id);
                  setOptionsOpen(false);
                }}
                className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-cotton-300 bg-white px-4 text-sm font-bold text-espresso-800"
              >
                <EyeOff className="h-4 w-4 text-espresso-600" />
                {post.hidden ? 'Mostrar publicación' : 'Ocultar publicación'}
              </button>
            </>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setOptionsOpen(false);
                if (window.confirm(`¿Eliminar esta publicación de ${author?.name ?? 'este familiar'}?`)) {
                  deletePost(post.id);
                }
              }}
              className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar publicación
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Fullscreen Zoomable Swipe-Down Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          onTouchStart={(e) => {
            lightboxTouchY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (lightboxTouchY.current !== null) {
              const dy = e.changedTouches[0].clientY - lightboxTouchY.current;
              if (dy > 90 && zoom === 1) setLightboxUrl(null);
            }
            lightboxTouchY.current = null;
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-safe absolute right-4 top-4 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
              aria-label="Alejar"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
              aria-label="Acercar"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white"
              aria-label="Cerrar vista ampliada"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[84dvh] max-w-[94vw] rounded-2xl object-contain shadow-2xl transition-transform duration-200"
          />
          <p className="mt-3 text-xs text-white/70">Desliza hacia abajo o toca fuera para cerrar</p>
        </div>
      )}
    </>
  );
};
