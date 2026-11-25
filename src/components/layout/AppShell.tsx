import React, { useEffect, useRef, useState } from 'react';
import tarotMageMotion from '../tarot/mago-loop.webp';
import tarotMagePoster from '../tarot/lector-manos.webp';
import {
  Bell,
  ChevronDown,
  Globe2,
  HardDrive,
  Heart,
  Home,
  Images,
  MessageCircle,
  Palette,
  Phone,
  Shield,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { formatBytes } from '../../services/storageService';
import type { AppSection } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import {
  CrochetSunflower,
  MacrameRosetteHanging,
  TropicalCanopyLights,
} from '../crochet/CrochetArt';
import { OfflineNoticeBar, PwaInstallSheet, usePwaInstall } from '../pwa/PwaInstallSheet';
import { AppearanceModal } from '../settings/AppearanceModal';
import { BottomSheet } from '../shared/BottomSheet';
import { completePushTutorial, hasPendingPushTutorial } from '../../services/localFamilyPreferences';
import { SideDrawer } from './SideDrawer';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    snapshot,
    pushEnabled,
    pushSupport,
    enablePushNotifications,
    testPushNotification,
    currentUser,
    activeSection,
    setActiveSection,
    registerBackHandler,
    openProfile,
    openChatWithMember,
    startCall,
    unreadMessageCount,
    storageUsage,
    toasts,
    triggerJoyBurst,
  } = useFamilyApp();

  const { prefs, parallax, triggerFeedback, showAppearanceModal, setShowAppearanceModal } =
    useAppearance();
  const { isOffline } = usePwaInstall();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [pushTutorial, setPushTutorial] = useState(false);

  useEffect(() => {
    if (!currentUser || !hasPendingPushTutorial(currentUser.id)) return;
    completePushTutorial(currentUser.id);
    setPushTutorial(true);
    setNotifSheetOpen(true);
  }, [currentUser?.id]);

  const closeNotificationSheet = () => {
    setPushTutorial(false);
    setNotifSheetOpen(false);
  };

  const [enablingPush, setEnablingPush] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [animateTarotButton, setAnimateTarotButton] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAnimateTarotButton(!motion.matches);
    update();
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);

  // Close open drawers/sheets on Android Back button before leaving the current section
  useEffect(() => {
    return registerBackHandler(() => {
      if (notifSheetOpen) {
        closeNotificationSheet();
        return true;
      }
      if (showAppearanceModal) {
        setShowAppearanceModal(false);
        return true;
      }
      if (installOpen) {
        setInstallOpen(false);
        return true;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      return false;
    });
  }, [
    registerBackHandler,
    notifSheetOpen,
    showAppearanceModal,
    installOpen,
    drawerOpen,
    setShowAppearanceModal,
  ]);

  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Smoothly compact top header height + drive zero-rerender golden scroll progress filament
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 28);
      if (progressBarRef.current) {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const ratio = Math.max(0, Math.min(1, y / maxScroll));
        progressBarRef.current.style.transform = `scaleX(${ratio})`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'ADMIN';
  const onlineMembers = snapshot.members.filter(
    (m) => m.status === 'ACTIVE' && m.role !== 'ADMIN' && m.presence === 'ONLINE'
  );
  const showDecorations = prefs.mode !== 'LIGHT';
  const showSidebars = activeSection === 'FEED';

  // Exact 6 desktop tabs matching official reference
  const desktopNavItems: {
    id: AppSection;
    label: string;
    icon: React.ComponentType<{ className?: string; stroke?: string; strokeWidth?: number }>;
    badge?: number;
    hidden?: boolean;
  }[] = [
    { id: 'FEED', label: 'Muro', icon: Home },
    { id: 'MESSAGES', label: 'Mensajes', icon: MessageCircle, badge: unreadMessageCount },
    { id: 'CALLS', label: 'Llamadas', icon: Video },
    { id: 'ALBUMS', label: 'Álbumes', icon: Images },
    { id: 'FAMILY', label: 'Familia', icon: Users },
    { id: 'ADMIN', label: 'Admin', icon: Shield, hidden: !isAdmin },
  ];

  // Exact 5 permanent mobile bottom navigation tabs
  const mobileBottomItems: {
    id: AppSection;
    label: string;
    icon: React.ComponentType<{ className?: string; stroke?: string; strokeWidth?: number }>;
    badge?: number;
  }[] = [
    { id: 'FEED', label: 'Muro', icon: Home },
    { id: 'MESSAGES', label: 'Mensajes', icon: MessageCircle, badge: unreadMessageCount },
    { id: 'CALLS', label: 'Llamadas', icon: Video },
    { id: 'ALBUMS', label: 'Álbumes', icon: Images },
    { id: 'FAMILY', label: 'Familia', icon: Globe2 },
  ];

  const handleSelectSection = (id: AppSection) => {
    triggerFeedback('tap');
    if (id === 'PROFILE') openProfile(currentUser.id);
    else setActiveSection(id);
  };

  return (
    <div className="relative min-h-[100dvh] pb-[92px] lg:pb-10">
      <OfflineNoticeBar isOffline={isOffline} />

      {/* Top Tropical Foliage & Warm Fairy Lights Canopy */}
      {showDecorations && <TropicalCanopyLights compact={scrolled} />}

      {/* Desktop Top-Left Macramé Wall Hanging (Parallax) */}
      {showDecorations && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-20 hidden xl:block"
          style={{
            transform: `translate3d(${parallax.x * -6}px, ${parallax.y * -4}px, 0)`,
            transition: 'transform 0.25s ease-out',
          }}
        >
          <MacrameRosetteHanging className="w-24" />
        </div>
      )}

      {/* Reusable SVG Emerald-Gold Metallic Icon Gradients */}
      <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
        <defs>
          <linearGradient id="emeraldGoldIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="48%" stopColor="#10B981" />
            <stop offset="78%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="emeraldGoldIconActiveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="40%" stopColor="#10B981" />
            <stop offset="72%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>
        </defs>
      </svg>

      {/* ================= STICKY ARTISANAL CROCHET TOP HEADER ================= */}
      <header
        className={`header-crochet-shell pt-safe sticky top-0 z-30 transition-all duration-200 ${
          scrolled ? 'py-1.5' : 'py-2.5 lg:py-3'
        }`}
      >
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-2 px-3 sm:px-5">
          {/* LEFT: Menu, family name and tarot */}
          <div className="flex min-w-0 items-center gap-2 xl:gap-5">
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setDrawerOpen(true);
              }}
              className="ios-liquid-nav-bar btn-yarn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:hidden"
              aria-label="Abrir menú lateral"
            >
              <span className="relative z-10 flex" aria-hidden="true">
                <MemberAvatar member={currentUser} size="sm" />
              </span>
            </button>

            <div className="flex min-w-0 flex-col items-start">
              <button
                type="button"
                onClick={() => handleSelectSection('FEED')}
                className="group relative flex flex-col items-start text-left"
              >
                <div
                  className={`crochet-parchment relative flex items-center gap-2 rounded-2xl transition-all ${
                    scrolled ? 'px-3 py-1' : 'px-3.5 py-1.5 sm:px-4'
                  }`}
                >
                  <span
                    className={`font-crochet-script font-bold leading-none text-espresso-900 transition-all ${
                      scrolled ? 'text-base sm:text-xl' : 'text-[19px] sm:text-[25px]'
                    }`}
                  >
                    Cuaderno Social de la Familia
                  </span>
                  <CrochetSunflower className="h-6 w-6 shrink-0 transition group-hover:rotate-12" />
                </div>

              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection('TAROT')}
              aria-current={activeSection === 'TAROT' ? 'page' : undefined}
              className="tarot-mage-button"
              aria-label="Tarot del día"
            >
              <img src={animateTarotButton ? tarotMageMotion : tarotMagePoster}
                className="tarot-mage-portrait" alt="" />
            </button>
          </div>

          {/* CENTER: Desktop iOS Liquid Glass Crystal Nav Bar with Emerald-Gold Icons */}
          <nav
            className="ios-liquid-nav-bar crochet-nav-desktop hidden items-center gap-1 rounded-full px-2 py-1.5 lg:flex"
            aria-label="Navegación principal"
          >
            {desktopNavItems
              .filter((item) => !item.hidden)
              .map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`crochet-nav-item btn-yarn-press relative z-10 flex flex-col items-center justify-center rounded-full px-2.5 py-1.5 text-xs font-bold transition xl:px-4 ${
                      active
                        ? 'ios-liquid-tab-active'
                        : 'hover:bg-white/20'
                    }`}
                  >
                    <Icon
                      stroke="currentColor"
                      strokeWidth={active ? 2.35 : 2.05}
                      className={`h-5 w-5 transition ${
                        active
                          ? 'scale-105 drop-shadow-[0_1px_6px_rgba(245,158,11,0.55)]'
                          : 'drop-shadow-[0_1px_2px_rgba(6,78,59,0.22)]'
                      }`}
                    />
                    <span className="emerald-gold-label mt-0.5 text-xs font-extrabold">
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute right-1.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-extrabold text-solar-200 shadow">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
          </nav>

          {/* RIGHT: Appearance Quick Toggle + User Pill + Notification Bell */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setShowAppearanceModal(true);
              }}
              className="ios-liquid-nav-bar btn-yarn-press hidden h-10 w-10 items-center justify-center rounded-full sm:flex"
              title="Cambiar modo 3D / Artesanal / Ligero"
              aria-label="Apariencia"
            >
              <Palette stroke="url(#emeraldGoldIconGrad)" strokeWidth={2.1} className="relative z-10 h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectSection('PROFILE')}
              className="ios-liquid-nav-bar btn-yarn-press hidden items-center gap-2 rounded-full py-1 pl-1.5 pr-3 text-left md:flex"
              title="Abrir mi perfil"
            >
              <MemberAvatar member={currentUser} size="xs" showPresence />
              <div className="relative z-10">
                <p className="emerald-gold-label text-xs font-extrabold leading-tight">
                  {currentUser.name.split(' ')[0]}
                </p>
                <p className="text-[10px] font-semibold text-forest-900/80">
                  {isAdmin ? 'Fantasma' : currentUser.relationship}
                </p>
              </div>
              <ChevronDown stroke="url(#emeraldGoldIconGrad)" className="relative z-10 h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerFeedback('chime');
                setNotifSheetOpen(true);
              }}
              className="ios-liquid-nav-bar btn-yarn-press relative flex h-11 w-11 items-center justify-center rounded-full transition"
              aria-label="Notificaciones y avisos de llamadas"
              title={pushEnabled ? 'Notificaciones Push activas' : 'Activar avisos de llamadas fuera de la app'}
            >
              <Bell stroke="url(#emeraldGoldIconGrad)" strokeWidth={2.15} className="relative z-10 h-5 w-5" />
              {(unreadMessageCount > 0 || !pushEnabled) && (
                <span
                  className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                    unreadMessageCount > 0 ? 'bg-rose-600' : 'bg-solar-400 animate-pulse'
                  }`}
                />
              )}
            </button>
          </div>
        </div>
        {/* Live Emerald-Gold Scroll Progress Filament */}
        <div
          ref={progressBarRef}
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2.5px] origin-left bg-gradient-to-r from-emerald-500 via-solar-300 to-amber-400 shadow-[0_0_8px_rgba(255,214,78,0.75)] transition-transform duration-150 ease-out"
          style={{ transform: 'scaleX(0)' }}
          aria-hidden="true"
        />
      </header>

      {/* ================= MAIN ADAPTIVE LAYOUT (FIXED LEFT SIDEBAR + SCROLLING ANIMATED RIGHT FEED) ================= */}
      <div
        className={`relative z-20 mx-auto max-w-[1520px] px-2.5 pt-3.5 sm:px-5 sm:pt-5 ${
          showSidebars ? 'grid grid-cols-1 gap-5 md:grid-cols-12 md:items-start' : ''
        }`}
      >
        {/* LEFT COLUMN — FIXED / STICKY on Desktop while ONLY the right-side Muro scrolls */}
        {showSidebars && (
          <aside className="no-scrollbar hidden space-y-3 md:sticky md:top-[82px] md:col-span-4 md:block md:max-h-[calc(100dvh-96px)] md:self-start md:overflow-y-auto md:pb-6 lg:col-span-3">
            {/* Profile & Love Burst Card (Matches Desktop Reference) */}
            <div className="card-crochet rounded-3xl p-4">
              <button
                type="button"
                onClick={() => handleSelectSection('PROFILE')}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="relative">
                  <div className="crochet-avatar-ring rounded-full">
                    <MemberAvatar member={currentUser} size="lg" showPresence />
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 rounded-full bg-white px-1 text-xs shadow"
                    title="Nuestra Familia"
                  >
                    🇧🇷
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-editorial text-lg font-bold text-espresso-900">
                    {currentUser.name}
                  </p>
                  <p className="truncate text-xs text-espresso-600">
                    {currentUser.relationship}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brazil-100 px-2.5 py-0.5 text-[11px] font-bold text-forest-800 ring-1 ring-brazil-400/60">
                    ⭐ {isAdmin ? 'Administrador único' : 'Miembro familiar'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerFeedback('heart');
                  triggerJoyBurst('❤️', 12);
                }}
                className="btn-yarn-press mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-solar-50 text-xs font-extrabold text-rose-700 shadow-sm hover:brightness-98"
              >
                <span>¡Mandar lluvia de cariño!</span>
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500 animate-heartbeat" />
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2.5 text-center">
                <div className="rounded-2xl border border-cotton-300/80 bg-white/80 p-2.5 shadow-inner">
                  <p className="text-xl font-extrabold text-forest-900">
                    {snapshot.posts.filter((p) => !p.hidden).length}
                  </p>
                  <p className="text-[11px] font-semibold text-espresso-600">Recuerdos</p>
                </div>
                <div className="rounded-2xl border border-cotton-300/80 bg-white/80 p-2.5 shadow-inner">
                  <p className="text-xl font-extrabold text-forest-900">
                    {snapshot.members.filter((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN').length}
                  </p>
                  <p className="text-[11px] font-semibold text-espresso-600">Familiares</p>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300/70 bg-forest-900/90 px-2.5 py-1.5 text-[11px] font-bold text-solar-200">
                  <span>👻</span>
                  <span>Modo Fantasma · Invisible para la familia</span>
                </div>
              )}
            </div>

            {/* Stitched Sala Familiar Card */}
            <div className="crochet-parchment rounded-3xl p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-700 text-solar-300 shadow">
                  <Video className="h-4 w-4 animate-wiggle" />
                </span>
                <h2 className="font-editorial text-lg font-bold text-forest-900">
                  Sala Familiar
                </h2>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-espresso-800">
                Reúne a toda la familia en una videollamada privada llena de sonrisas y calidez.
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('chime');
                  startCall({
                    mode: 'VIDEO',
                    scope: 'FAMILY_ROOM',
                    title: 'Sala Familiar · Cuaderno Social',
                    participantIds: snapshot.members
                      .filter((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN')
                      .map((m) => m.id),
                    roomCode: '202601',
                    isHost: true,
                  });
                }}
                disabled={!snapshot.featureFlags.videoCallsEnabled}
                className="crochet-green-3d btn-yarn-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-extrabold text-white disabled:opacity-50"
              >
                <Video className="h-4 w-4 text-solar-300" />
                Entrar a videollamada
              </button>
            </div>

            {/* Familia conectada (stays pinned inside Fixed Left Sidebar) */}
            <div className="card-crochet rounded-3xl p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-forest-900">
                  <Users className="h-4 w-4 text-brazil-500" />
                  Familia conectada
                </h2>
                <span className="rounded-full bg-brazil-500 px-2.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                  {onlineMembers.length} aquí
                </span>
              </div>
              <div className="no-scrollbar max-h-[220px] space-y-1.5 overflow-y-auto">
                {snapshot.members
                  .filter((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN' && m.id !== currentUser.id)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-2xl p-1.5 transition hover:bg-cotton-200/60"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          triggerFeedback('tap');
                          openProfile(member.id);
                        }}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                      >
                        <div className="shrink-0 rounded-full border border-dashed border-brazil-500 p-0.5">
                          <MemberAvatar member={member} size="sm" showPresence />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-espresso-900">
                            {member.name}
                          </p>
                          <p className="truncate text-[11px] text-espresso-600">
                            {member.relationship}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            triggerFeedback('tap');
                            openChatWithMember(member.id);
                          }}
                          className="btn-yarn-press flex h-9 w-9 items-center justify-center rounded-full text-forest-700 hover:bg-brazil-100"
                          title={`Enviar mensaje a ${member.name}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerFeedback('chime');
                            startCall({
                              mode: 'AUDIO',
                              scope: 'DIRECT',
                              title: member.name,
                              participantIds: [currentUser.id, member.id],
                            });
                          }}
                          className="btn-yarn-press flex h-9 w-9 items-center justify-center rounded-full text-forest-700 hover:bg-solar-100"
                          title={`Llamar a ${member.name}`}
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Storage Mini Widget (Admin only) */}
            {isAdmin && (
              <div className="card-crochet rounded-3xl p-4">
                <div className="flex items-center justify-between text-xs font-bold text-forest-900">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-4 w-4 text-brazil-500" />
                    Álbum familiar
                  </span>
                  <span>{formatBytes(storageUsage.totalBytes)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cotton-200 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-solar-400 via-brazil-500 to-forest-700 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          12,
                          Math.round(
                            (storageUsage.totalBytes / Math.max(1, storageUsage.quotaBytes)) * 100
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-espresso-600">
                  <Sparkles className="h-3 w-3 text-solar-500" />
                  Nube familiar: {snapshot.cloudOwnerEmail}
                </p>
              </div>
            )}
          </aside>
        )}

        {/* WIDE MAIN WORKSPACE (Elongated Wall Posts on PC) */}
        <main
          className={
            showSidebars
              ? 'md:col-span-8 lg:col-span-9'
              : 'w-full'
          }
        >
          {children}
        </main>
      </div>

      {/* ================= PERMANENT MOBILE & TABLET iOS LIQUID GLASS CRYSTAL BOTTOM NAV ================= */}
      <nav
        className="crochet-nav-bar pb-safe fixed bottom-0 left-0 right-0 z-30 pt-2 lg:hidden"
        aria-label="Navegación inferior familiar"
      >
        <div className="mx-auto flex max-w-xl items-center justify-around px-1.5">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`crochet-nav-item btn-yarn-press relative z-10 flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 transition ${
                  active
                    ? 'ios-liquid-tab-active -translate-y-0.5'
                    : 'hover:bg-white/15'
                }`}
              >
                <Icon
                  stroke="currentColor"
                  strokeWidth={active ? 2.4 : 2.05}
                  className={`h-5 w-5 transition ${
                    active
                      ? 'scale-105 drop-shadow-[0_1px_6px_rgba(245,158,11,0.55)]'
                      : 'drop-shadow-[0_1px_2px_rgba(6,78,59,0.22)]'
                  }`}
                />
                <span className="emerald-gold-label text-xs font-extrabold leading-tight">
                  {item.label}
                </span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute right-1.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-extrabold text-solar-200 shadow">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Tactile Drawer, Appearance Modal & PWA Install Sheet */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenInstall={() => setInstallOpen(true)}
      />
      <AppearanceModal />
      <PwaInstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />

      {/* Real Web Push Notifications Control Sheet */}
      <BottomSheet
        open={notifSheetOpen}
        title={pushTutorial ? "Recibe avisos aunque cierres la app" : "Avisos de llamadas y mensajes"}
        onClose={closeNotificationSheet}
      >
        <div className="space-y-4">
          <div className="crochet-parchment rounded-2xl p-4">
            <p className="text-sm font-extrabold text-forest-900">
              {pushEnabled
                ? '✅ Notificaciones Push activas en este dispositivo'
                : '🔔 Activa las notificaciones fuera de la app'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-espresso-700">
              {pushEnabled
                ? 'Cuando un familiar te llame o te envíe un mensaje, recibirás una notificación en la pantalla aunque tengas cerrada la aplicación.'
                : 'Al activarlas, tu teléfono vibrará y te avisará cuando recibas una videollamada o mensaje familiar, incluso con el navegador cerrado.'}
            </p>
          </div>

          {pushTutorial && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-espresso-800">
              <li>En iPhone o iPad, añade el Cuaderno a la pantalla de inicio y ábrelo desde su icono.</li>
              <li>Toca <strong>Activar avisos</strong> y elige <strong>Permitir</strong> cuando se te pregunte.</li>
              <li>Usa <strong>Probar notificación Push</strong> para comprobar que funciona. También puedes activarla más tarde desde la campana.</li>
            </ol>
          )}

          {pushSupport === 'ios-needs-install' && (
            <div className="rounded-2xl border border-solar-400 bg-solar-50 p-3.5 text-xs leading-relaxed text-espresso-800">
              <strong>Requisito en iPhone (iOS):</strong> primero toca{' '}
              <strong>Compartir → Añadir a pantalla de inicio</strong> en Safari, abre{' '}
              <strong>Cuaderno Social</strong> desde el ícono en tu pantalla y luego toca el botón verde de
              abajo.
            </div>
          )}

          {!pushEnabled ? (
            <button
              type="button"
              disabled={enablingPush}
              onClick={async () => {
                setEnablingPush(true);
                const enabled = await enablePushNotifications();
                setEnablingPush(false);
                if (enabled) setPushTutorial(false);
              }}
              className="crochet-green-3d btn-yarn-press flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full text-sm font-extrabold text-white disabled:opacity-50"
            >
              <Bell className="h-4 w-4 text-solar-300" />
              {enablingPush ? 'Activando…' : 'Activar avisos de llamadas en este teléfono'}
            </button>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void testPushNotification()}
                className="crochet-gold-3d btn-yarn-press flex min-h-[46px] items-center justify-center gap-2 rounded-full text-xs font-extrabold text-forest-900"
              >
                <Bell className="h-4 w-4" />
                Probar notificación Push
              </button>
              <button
                type="button"
                onClick={() => {
                  closeNotificationSheet();
                  setActiveSection('MESSAGES');
                }}
                className="btn-yarn-press flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-cotton-300 bg-white text-xs font-bold text-forest-800"
              >
                <MessageCircle className="h-4 w-4 text-brazil-500" />
                Ir a mensajes ({unreadMessageCount})
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Toast Notifications */}
      <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col gap-2 lg:bottom-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-pop-in pointer-events-auto rounded-2xl border-2 px-4 py-3 text-sm font-bold shadow-xl ${
              toast.tone === 'warning'
                ? 'border-solar-400 bg-solar-50 text-espresso-900'
                : toast.tone === 'success'
                  ? 'border-solar-300 bg-forest-700 text-white'
                  : 'border-artisanal-500 bg-espresso-900 text-cotton-50'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
