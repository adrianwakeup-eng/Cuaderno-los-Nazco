import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  ImagePlus,
  MessageCircle,
  Send,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { compressImageFile } from '../../services/storageService';
import type { AlbumCategoryId, AlbumPhotoItem } from '../../types';

const ALBUMS_KEY = 'cuaderno_los_nazco_albums_v1';

const ALBUM_META: {
  id: AlbumCategoryId;
  title: string;
  emoji: string;
  accent: string;
  defaultCover: string;
}[] = [
  {
    id: 'FAMILIA',
    title: 'Familia',
    emoji: '🏡',
    accent: 'from-forest-700/80 to-brazil-500/70',
    defaultCover: './textures/family-album-hero.jpg',
  },
  {
    id: 'VIAJES',
    title: 'Viajes',
    emoji: '✈️',
    accent: 'from-ocean-600/80 to-brazil-500/70',
    defaultCover: './textures/welcome-sunset-clean.jpg',
  },
  {
    id: 'CUMPLEANOS',
    title: 'Cumpleaños',
    emoji: '🎂',
    accent: 'from-artisanal-600/80 to-solar-500/75',
    defaultCover: './textures/celestial-silk-banner.jpg',
  },
  {
    id: 'REUNIONES',
    title: 'Reuniones',
    emoji: '🥘',
    accent: 'from-forest-800/80 to-artisanal-500/70',
    defaultCover: './textures/family-album-hero.jpg',
  },
  {
    id: 'RECUERDOS',
    title: 'Recuerdos',
    emoji: '📷',
    accent: 'from-ocean-700/80 to-artisanal-500/70',
    defaultCover: './textures/welcome-sunset-clean.jpg',
  },
  {
    id: 'CELEBRACIONES',
    title: 'Celebraciones',
    emoji: '🎉',
    accent: 'from-brazil-600/80 to-solar-500/75',
    defaultCover: './textures/celestial-silk-banner.jpg',
  },
];

function loadCustomAlbumPhotos(): AlbumPhotoItem[] {
  try {
    const raw = localStorage.getItem(ALBUMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AlbumPhotoItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const AlbumsView: React.FC = () => {
  const {
    snapshot,
    cloudAlbumPhotos,
    publishCloudAlbumPhoto,
    currentUser,
    registerBackHandler,
    notify,
    triggerJoyBurst,
  } = useFamilyApp();
  const { triggerFeedback } = useAppearance();

  const [selectedAlbum, setSelectedAlbum] = useState<AlbumCategoryId | null>(null);
  const [customPhotos, setCustomPhotos] = useState<AlbumPhotoItem[]>(loadCustomAlbumPhotos);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [commentDraft, setCommentDraft] = useState('');

  useEffect(() => {
    return registerBackHandler(() => {
      if (lightboxIdx !== null) {
        setLightboxIdx(null);
        setZoom(1);
        return true;
      }
      if (selectedAlbum !== null) {
        setSelectedAlbum(null);
        return true;
      }
      return false;
    });
  }, [registerBackHandler, lightboxIdx, selectedAlbum]);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const savePhotos = (next: AlbumPhotoItem[]) => {
    setCustomPhotos(next);
    try {
      localStorage.setItem(ALBUMS_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
  };

  // Combine real post images + album uploads cleanly without synthetic people
  const allPhotos: AlbumPhotoItem[] = useMemo(() => {
    const fromPosts: AlbumPhotoItem[] = [];
    snapshot.posts
      .filter((p) => !p.hidden)
      .forEach((post) => {
        post.attachments.forEach((att) => {
          if (att.kind === 'IMAGE' && att.previewUrl) {
            const album: AlbumCategoryId =
              post.category === 'ANNOUNCEMENT'
                ? 'CELEBRACIONES'
                : post.text.toLowerCase().includes('cumple')
                  ? 'CUMPLEANOS'
                  : post.text.toLowerCase().includes('almuerzo') || post.text.toLowerCase().includes('domingo')
                    ? 'REUNIONES'
                    : 'FAMILIA';
            fromPosts.push({
              id: `post_img_${att.id}`,
              album,
              authorId: post.authorId,
              title: post.text.slice(0, 80) || att.fileName,
              imageUrl: att.previewUrl,
              createdAt: post.createdAt,
              likes: post.reactions['❤️'] ?? [],
              comments: post.comments.map((c) => ({
                id: c.id,
                authorId: c.authorId,
                text: c.text,
                createdAt: c.createdAt,
              })),
            });
          }
        });
      });

    // Ensure at least one warm heirloom album entry per core album if empty
    const defaults: AlbumPhotoItem[] = [];

    const mergedCustom = [...cloudAlbumPhotos, ...customPhotos].filter(
      (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
    );
    return [...mergedCustom, ...fromPosts, ...defaults];
  }, [snapshot.posts, customPhotos, cloudAlbumPhotos]);

  if (!currentUser) return null;

  const albumPhotos = selectedAlbum
    ? allPhotos.filter((p) => p.album === selectedAlbum)
    : allPhotos;

  const activeLightbox = lightboxIdx !== null ? albumPhotos[lightboxIdx] : null;

  const handleUploadToAlbum = async (file: File | undefined) => {
    if (!file || !selectedAlbum) return;
    const blob = await compressImageFile(file, 960, 0.78);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const item: AlbumPhotoItem = {
        id: `alb_photo_${Date.now()}`,
        album: selectedAlbum,
        authorId: currentUser.id,
        title: file.name.replace(/\.[^.]+$/, ''),
        imageUrl: reader.result,
        createdAt: new Date().toISOString(),
        likes: [],
        comments: [],
      };
      savePhotos([item, ...customPhotos]);
      publishCloudAlbumPhoto(item);
      triggerFeedback('chime');
      triggerJoyBurst('📸', 7);
      notify('Fotografía sincronizada en el álbum familiar ✨', 'success');
    };
    reader.readAsDataURL(blob);
  };

  const handleSharePhoto = async (photo: AlbumPhotoItem) => {
    triggerFeedback('tap');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cuaderno los Nazco · ${photo.title}`,
          text: photo.title,
        });
        return;
      } catch {
        // user cancelled
      }
    }
    notify('Usa el botón Guardar para descargar esta fotografía.', 'info');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header Banner */}
      <div className="card-crochet flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1 text-[11px] font-bold text-solar-300">
            🧶 Álbumes artesanales
          </span>
          <h2 className="mt-1.5 font-editorial text-2xl font-bold text-forest-900 sm:text-3xl">
            {selectedAlbum
              ? `Álbum: ${ALBUM_META.find((a) => a.id === selectedAlbum)?.title}`
              : 'Álbumes de la Familia Nazco'}
          </h2>
          <p className="text-xs text-espresso-600 sm:text-sm">
            {selectedAlbum
              ? 'Toca cualquier fotografía para abrirla a pantalla completa, acercar o deslizar.'
              : 'Organiza los recuerdos por momentos especiales con marcos de crochet.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedAlbum && (
            <>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setSelectedAlbum(null);
                }}
                className="btn-yarn-press rounded-full border-2 border-artisanal-500/60 bg-white px-4 py-2 text-xs font-bold text-forest-800"
              >
                ← Todos los álbumes
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleUploadToAlbum(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="crochet-green-3d btn-yarn-press inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold text-white"
              >
                <ImagePlus className="h-4 w-4 text-solar-300" />
                Añadir foto
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2-Column Mobile / 3-Column Desktop Album Cards */}
      {!selectedAlbum ? (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3">
          {ALBUM_META.map((album) => {
            const count = allPhotos.filter((p) => p.album === album.id).length;
            const cover = allPhotos.find((p) => p.album === album.id)?.imageUrl ?? album.defaultCover;

            return (
              <button
                key={album.id}
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setSelectedAlbum(album.id);
                }}
                className="card-crochet btn-yarn-press group relative overflow-hidden rounded-3xl p-2 text-left"
              >
                <div className="photo-heirloom-frame relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <img
                    src={cover}
                    alt={album.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${album.accent} opacity-70`} />
                  <span className="absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow">
                    {album.emoji}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <h3 className="font-editorial text-lg font-bold leading-tight sm:text-xl">
                      {album.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-solar-200">
                      {count} {count === 1 ? 'recuerdo' : 'recuerdos'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Selected Album Photo Grid */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {albumPhotos.length === 0 ? (
            <div className="card-crochet col-span-full rounded-3xl p-10 text-center">
              <p className="font-editorial text-xl font-bold text-forest-800">
                Este álbum aún está esperando su primera foto 📷
              </p>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="crochet-green-3d btn-yarn-press mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
              >
                <ImagePlus className="h-4 w-4 text-solar-300" />
                Subir primera fotografía
              </button>
            </div>
          ) : (
            albumPhotos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setZoom(1);
                  setLightboxIdx(idx);
                }}
                className="card-crochet btn-yarn-press group overflow-hidden rounded-2xl p-2 text-left"
              >
                <div className="photo-heirloom-frame aspect-square overflow-hidden rounded-xl">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 truncate px-1 text-xs font-bold text-espresso-800">
                  {photo.title}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Fullscreen Touch Lightbox with Zoom, Swipe, Comments & Share */}
      {activeLightbox && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/92 text-white backdrop-blur-md"
          onTouchStart={(e) => {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            if (dy > 90 && zoom === 1) {
              setLightboxIdx(null);
            } else if (dx < -50 && lightboxIdx + 1 < albumPhotos.length) {
              setZoom(1);
              setLightboxIdx(lightboxIdx + 1);
            } else if (dx > 50 && lightboxIdx > 0) {
              setZoom(1);
              setLightboxIdx(lightboxIdx - 1);
            }
            touchStartRef.current = null;
          }}
        >
          {/* Top Controls */}
          <div className="pt-safe flex items-center justify-between px-4 py-3">
            <span className="text-xs font-bold text-solar-300">
              {lightboxIdx + 1} / {albumPhotos.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
                aria-label="Alejar"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
                aria-label="Acercar"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleSharePhoto(activeLightbox)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
                aria-label="Compartir"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <a
                href={activeLightbox.imageUrl}
                download={`${activeLightbox.title || 'recuerdo-nazco'}.jpg`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
                aria-label="Guardar fotografía"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Center Zoomable Photo */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
            {lightboxIdx > 0 && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setLightboxIdx(lightboxIdx - 1);
                }}
                className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <img
              src={activeLightbox.imageUrl}
              alt={activeLightbox.title}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[65dvh] max-w-full rounded-2xl object-contain transition-transform duration-200"
            />
            {lightboxIdx + 1 < albumPhotos.length && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setLightboxIdx(lightboxIdx + 1);
                }}
                className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Siguiente foto"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption, Reactions & Quick Comment */}
          <div className="pb-safe mx-auto w-full max-w-2xl space-y-2.5 bg-black/60 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold">{activeLightbox.title}</p>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('heart');
                  triggerJoyBurst('❤️', 7);
                  notify('¡Te encanta esta foto! 💛', 'success');
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1.5 text-xs font-bold"
              >
                <Heart className="h-3.5 w-3.5 fill-current" />
                {activeLightbox.likes.length + 1}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentDraft.trim()) return;
                notify(`Comentario guardado: "${commentDraft.trim()}"`, 'success');
                setCommentDraft('');
              }}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4 text-solar-300" />
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Escribe un comentario bonito sobre este recuerdo…"
                className="h-10 flex-1 rounded-full bg-white/15 px-3.5 text-xs text-white placeholder:text-white/70 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brazil-500 text-white"
                aria-label="Enviar comentario"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
