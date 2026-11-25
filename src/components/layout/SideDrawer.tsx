import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Globe2,
  Home,
  Images,
  LogOut,
  MessageCircle,
  Palette,
  Shield,
  User,
  Video,
  X,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import type { AppSection } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { CrochetSunflower } from '../crochet/CrochetArt';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenInstall: () => void;
}

/** Tactile slide-out artisanal drawer with cotton weave & stitched crochet border */
export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onClose, onOpenInstall }) => {
  const { currentUser, activeSection, setActiveSection, openProfile, unreadMessageCount, logout } =
    useFamilyApp();
  const { setShowAppearanceModal, triggerFeedback } = useAppearance();
  const startXRef = useRef<number | null>(null);

  if (!open || !currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  const items: {
    id: AppSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    hidden?: boolean;
  }[] = [
    { id: 'PROFILE', label: 'Mi Perfil', icon: User },
    { id: 'FEED', label: 'Muro Familiar', icon: Home },
    { id: 'MESSAGES', label: 'Mensajes', icon: MessageCircle, badge: unreadMessageCount },
    { id: 'CALLS', label: 'Llamadas y Video', icon: Video },
    { id: 'ALBUMS', label: 'Álbumes Familiares', icon: Images },
    { id: 'FAMILY', label: 'Familia por el Mundo', icon: Globe2 },
    { id: 'ADMIN', label: 'Administración', icon: Shield, hidden: !isAdmin },
  ];

  const handleNav = (id: AppSection) => {
    triggerFeedback('tap');
    if (id === 'PROFILE') openProfile(currentUser.id);
    else setActiveSection(id);
    onClose();
  };

  const drawer = (
    <div
      className="fixed inset-0 z-[85] flex h-[100dvh] bg-forest-900/55 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Menú lateral de Cuaderno Social de la familia"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startXRef.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (startXRef.current !== null) {
            const dx = e.changedTouches[0].clientX - startXRef.current;
            if (dx < -60) onClose();
          }
          startXRef.current = null;
        }}
        className="animate-drawer-in card-crochet pt-safe pb-safe flex h-full w-[84vw] max-w-[320px] flex-col border-r-2 border-artisanal-500/70 shadow-2xl"
      >
        {/* Top User Header */}
        <div className="crochet-parchment relative m-3 rounded-2xl p-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-yarn-press absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-forest-800 shadow-sm"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="crochet-avatar-ring rounded-full">
              <MemberAvatar member={currentUser} size="lg" showPresence />
            </div>
            <div className="min-w-0">
              <p className="truncate font-editorial text-lg font-bold text-forest-900">
                {currentUser.name}
              </p>
              <p className="truncate text-xs font-medium text-espresso-700">
                {currentUser.relationship}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-forest-700 px-2.5 py-0.5 text-[10px] font-bold text-solar-300">
                {isAdmin ? '⭐ Administrador único' : '💛 Miembro familiar'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
          {items
            .filter((it) => !it.hidden)
            .map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`btn-yarn-press flex min-h-[48px] w-full items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                    active
                      ? 'crochet-gold-3d text-forest-900'
                      : 'text-espresso-900 hover:bg-cotton-200/70'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${active ? 'text-forest-900' : 'text-forest-700'}`} />
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-extrabold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}

          <div className="my-2 border-t border-dashed border-artisanal-500/45" />

          {/* Appearance & PWA Install */}
          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              onClose();
              setShowAppearanceModal(true);
            }}
            className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-espresso-900 hover:bg-cotton-200/70"
          >
            <Palette className="h-5 w-5 text-brazil-500" />
            Apariencia y modos 3D
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              onClose();
              onOpenInstall();
            }}
            className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-espresso-900 hover:bg-cotton-200/70"
          >
            <Download className="h-5 w-5 text-ocean-600" />
            Instalar App (PWA)
          </button>
        </nav>

        {/* Bottom Footer + Logout */}
        <div className="relative border-t border-cotton-300/80 px-3 pt-3">
          <CrochetSunflower className="pointer-events-none absolute -top-8 right-3 h-12 w-12 opacity-90" />
          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              onClose();
              logout();
            }}
            className="btn-yarn-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
};
