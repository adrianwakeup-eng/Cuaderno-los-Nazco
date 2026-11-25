import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppearanceMode, AppearancePreferences, TextScaleOption } from '../types';

interface AppearanceContextValue {
  prefs: AppearancePreferences;
  setMode: (mode: AppearanceMode) => void;
  updatePrefs: (patch: Partial<AppearancePreferences>) => void;
  triggerFeedback: (kind?: 'tap' | 'heart' | 'chime') => void;
  /** Normalized cursor offset [-1, 1] for desktop parallax in IMMERSIVE_3D mode */
  parallax: { x: number; y: number };
  showAppearanceModal: boolean;
  setShowAppearanceModal: (open: boolean) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function getDefaultPrefs(): AppearancePreferences {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const lowCores = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 2;

  if (reducedMotion || lowCores) {
    return {
      mode: 'ARTISANAL',
      animationsEnabled: !reducedMotion,
      effects3dEnabled: !lowCores,
      soundsEnabled: false,
      hapticsEnabled: true,
      textScale: 'normal',
    };
  }
  return {
    mode: 'IMMERSIVE_3D',
    animationsEnabled: true,
    effects3dEnabled: true,
    soundsEnabled: false,
    hapticsEnabled: true,
    textScale: 'normal',
  };
}

function loadUserPrefs(userId?: string | null): AppearancePreferences {
  const key = `cuaderno_nazco_appearance_${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return getDefaultPrefs();
    return { ...getDefaultPrefs(), ...(JSON.parse(raw) as Partial<AppearancePreferences>) };
  } catch {
    return getDefaultPrefs();
  }
}

export const AppearanceProvider: React.FC<{
  userId?: string | null;
  children: React.ReactNode;
}> = ({ userId, children }) => {
  const [prefs, setPrefs] = useState<AppearancePreferences>(() => loadUserPrefs(userId));
  const [prefsOwner, setPrefsOwner] = useState(userId);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  // Reload preferences when switching family member
  useEffect(() => {
    setPrefs(loadUserPrefs(userId));
    setPrefsOwner(userId);
  }, [userId]);

  // Persist & reflect preferences on <html>
  useEffect(() => {
    if (prefsOwner !== userId) return;
    const key = `cuaderno_nazco_appearance_${userId || 'guest'}`;
    try {
      localStorage.setItem(key, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
    const root = document.documentElement;
    root.dataset.mode = prefs.mode;
    root.dataset.animations = prefs.animationsEnabled && prefs.mode !== 'LIGHT' ? 'on' : 'off';
    root.dataset.effects3d = prefs.effects3dEnabled && prefs.mode === 'IMMERSIVE_3D' ? 'on' : 'off';
    root.dataset.textScale = prefs.textScale;
  }, [prefs, prefsOwner, userId]);

  // Desktop-only gentle cursor parallax when IMMERSIVE_3D + 3D effects are active
  useEffect(() => {
    if (prefs.mode !== 'IMMERSIVE_3D' || !prefs.effects3dEnabled || !prefs.animationsEnabled) {
      setParallax({ x: 0, y: 0 });
      return;
    }
    const finePointer = window.matchMedia?.('(pointer: fine)').matches;
    if (!finePointer) return;

    let rafId = 0;
    const onMove = (ev: MouseEvent) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const nx = (ev.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
        const ny = (ev.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
        setParallax({ x: nx, y: ny });
        rafId = 0;
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [prefs.mode, prefs.effects3dEnabled, prefs.animationsEnabled]);

  const setMode = useCallback((mode: AppearanceMode) => {
    setPrefs((prev) => ({
      ...prev,
      mode,
      animationsEnabled: mode !== 'LIGHT',
      effects3dEnabled: mode === 'IMMERSIVE_3D',
    }));
  }, []);

  const updatePrefs = useCallback((patch: Partial<AppearancePreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const triggerFeedback = useCallback(
    (kind: 'tap' | 'heart' | 'chime' = 'tap') => {
      // Haptic pulse on Android/supported mobile browsers
      if (prefs.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          if (kind === 'heart') navigator.vibrate([12, 24, 16]);
          else if (kind === 'chime') navigator.vibrate([14, 18, 14]);
          else navigator.vibrate(10);
        } catch {
          // ignore unsupported devices
        }
      }

      // Gentle optional synthesized tactile sound via Web Audio API
      if (prefs.soundsEnabled && typeof window !== 'undefined') {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const now = ctx.currentTime;
          if (kind === 'heart') {
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(780, now + 0.11);
          } else if (kind === 'chime') {
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
          } else {
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
          }
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.17);
          window.setTimeout(() => void ctx.close(), 250);
        } catch {
          // ignore autoplay block
        }
      }
    },
    [prefs.hapticsEnabled, prefs.soundsEnabled]
  );

  return (
    <AppearanceContext.Provider
      value={{
        prefs,
        setMode,
        updatePrefs,
        triggerFeedback,
        parallax,
        showAppearanceModal,
        setShowAppearanceModal,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
};

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}

export const TEXT_SCALE_LABELS: { id: TextScaleOption; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'large', label: 'Grande' },
  { id: 'xlarge', label: 'Muy grande' },
];
