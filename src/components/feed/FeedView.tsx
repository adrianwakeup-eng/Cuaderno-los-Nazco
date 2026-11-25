import React, { useMemo, useRef, useState } from 'react';
import { Film, Image, Megaphone, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import type { PostFilter } from '../../types';
import { YarnBallLoader } from '../crochet/CrochetArt';
import { ArtisanalWelcomeBanner } from './ArtisanalWelcomeBanner';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { StoriesBar } from './StoriesBar';

const FILTERS: { id: PostFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'Todo', icon: Sparkles },
  { id: 'PHOTO', label: 'Fotos', icon: Image },
  { id: 'VIDEO', label: 'Videos', icon: Film },
  { id: 'VOICE', label: 'Notas de voz', icon: Mic },
  { id: 'ANNOUNCEMENT', label: 'Anuncios familiares', icon: Megaphone },
];

export const FeedView: React.FC = () => {
  const { snapshot, currentUser, setActiveSection, notify } = useFamilyApp();
  const { triggerFeedback } = useAppearance();
  const [filter, setFilter] = useState<PostFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [pullDist, setPullDist] = useState(0);
  const pullStartY = useRef<number | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const visiblePosts = useMemo(() => {
    return snapshot.posts
      .filter((post) => {
        if (post.hidden && !isAdmin) return false;
        if (filter === 'ALL') return true;
        if (filter === 'PHOTO')
          return post.category === 'PHOTO' || post.attachments.some((a) => a.kind === 'IMAGE');
        if (filter === 'VIDEO')
          return post.category === 'VIDEO' || post.attachments.some((a) => a.kind === 'VIDEO');
        if (filter === 'VOICE')
          return post.category === 'VOICE' || post.attachments.some((a) => a.kind === 'AUDIO');
        if (filter === 'ANNOUNCEMENT') return post.category === 'ANNOUNCEMENT';
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [snapshot.posts, filter, isAdmin]);

  const runRefresh = () => {
    if (refreshing) return;
    triggerFeedback('chime');
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      notify('Muro familiar actualizado 💛', 'success');
    }, 850);
  };

  return (
    <div
      className="space-y-4"
      onTouchStart={(e) => {
        if (window.scrollY <= 4) {
          pullStartY.current = e.touches[0].clientY;
        }
      }}
      onTouchMove={(e) => {
        if (pullStartY.current === null || window.scrollY > 4) return;
        const dy = e.touches[0].clientY - pullStartY.current;
        if (dy > 12) setPullDist(Math.min(72, dy * 0.55));
      }}
      onTouchEnd={() => {
        if (pullDist >= 52) runRefresh();
        setPullDist(0);
        pullStartY.current = null;
      }}
    >
      {/* Pull-to-refresh Yarn Ball indicator */}
      {(pullDist > 14 || refreshing) && (
        <div className="flex justify-center py-2">
          <YarnBallLoader size={34} label={refreshing ? 'Actualizando recuerdos…' : 'Suelta para actualizar'} />
        </div>
      )}

      {/* Desktop: Banner then Stories (matches desktop reference). Mobile: Stories first then compact Banner */}
      <div className="flex flex-col-reverse gap-3.5 lg:flex-col">
        <ArtisanalWelcomeBanner />
        <StoriesBar />
      </div>

      {/* Tactile Crochet Post Composer (Regular members) OR Ghost Admin Moderation Strip */}
      {isAdmin ? (
        <div className="card-crochet flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-forest-900">
              👻 Modo Administrador Fantasma activo
            </p>
            <p className="text-xs text-espresso-700">
              Nadie sabe que estás aquí. Puedes revisar, editar, fijar, ocultar o eliminar cualquier
              publicación, comentario, mensaje o perfil en total silencio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('ADMIN')}
            className="crochet-green-3d btn-yarn-press shrink-0 rounded-full px-4 py-2 text-xs font-extrabold text-white"
          >
            Abrir Panel Admin
          </button>
        </div>
      ) : (
        <PostComposer />
      )}

      {/* Reference-Fidelity Crochet Filter Bar (Active = Solar Yellow 3D, Inactive = Forest Green) */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
        {FILTERS.map((item) => {
          const Icon = item.icon;
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setFilter(item.id);
              }}
              className={`btn-yarn-press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                active
                  ? 'crochet-gold-3d text-forest-900'
                  : 'border border-forest-800/40 bg-forest-700/95 text-cotton-50 shadow-sm hover:bg-brazil-500'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-forest-900' : 'text-solar-300'}`} />
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={runRefresh}
          className="btn-yarn-press ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-artisanal-500/50 bg-white/85 text-forest-700 shadow-sm"
          title="Actualizar muro"
          aria-label="Actualizar muro familiar"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Posts Feed */}
      {visiblePosts.length === 0 ? (
        <div className="card-crochet rounded-3xl p-10 text-center">
          <p className="font-editorial text-2xl font-bold text-forest-900">
            No hay publicaciones en esta categoría todavía
          </p>
          <p className="mt-1 text-sm text-espresso-600">
            Publica el primer recuerdo arriba o cambia el filtro para ver todo el cuaderno familiar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
