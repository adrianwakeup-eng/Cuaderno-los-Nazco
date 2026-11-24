import React from 'react';
import { Sparkles, Feather, Zap, Volume2, Vibrate, Type, Layers, Wand2 } from 'lucide-react';
import { TEXT_SCALE_LABELS, useAppearance } from '../../context/AppearanceContext';
import type { AppearanceMode } from '../../types';
import { BottomSheet } from '../shared/BottomSheet';

const MODES: {
  id: AppearanceMode;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'IMMERSIVE_3D',
    title: 'Modo inmersivo 3D',
    desc: 'Experiencia completa con crochet 3D, macramé, luces cálidas, partículas y parallax.',
    icon: Sparkles,
  },
  {
    id: 'ARTISANAL',
    title: 'Modo artesanal',
    desc: 'Misma identidad brasileña de crochet y algodón con menos movimiento y profundidad.',
    icon: Feather,
  },
  {
    id: 'LIGHT',
    title: 'Modo ligero',
    desc: 'Diseño limpio, rápido y optimizado para teléfonos antiguos y conexiones lentas.',
    icon: Zap,
  },
];

export const AppearanceModal: React.FC = () => {
  const { prefs, setMode, updatePrefs, triggerFeedback, showAppearanceModal, setShowAppearanceModal } =
    useAppearance();

  return (
    <BottomSheet
      open={showAppearanceModal}
      title="Apariencia y accesibilidad"
      onClose={() => setShowAppearanceModal(false)}
    >
      <div className="space-y-5">
        {/* 3 Appearance Modes */}
        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-forest-700">
            Modo visual (guardado para tu perfil)
          </p>
          <div className="space-y-2.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = prefs.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    setMode(m.id);
                  }}
                  className={`btn-yarn-press flex w-full items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                    active
                      ? 'border-forest-700 bg-brazil-50 shadow-sm'
                      : 'border-cotton-300 bg-white/80 hover:border-artisanal-500'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      active ? 'bg-forest-700 text-solar-300' : 'bg-cotton-200 text-forest-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-espresso-900">{m.title}</p>
                      {active && (
                        <span className="rounded-full bg-solar-400 px-2 py-0.5 text-[10px] font-extrabold text-forest-900">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-espresso-600">{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Scale */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest-700">
            <Type className="h-3.5 w-3.5" /> Tamaño de texto
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_SCALE_LABELS.map((opt) => {
              const active = prefs.textScale === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    updatePrefs({ textScale: opt.id });
                  }}
                  className={`btn-yarn-press rounded-xl border-2 py-2.5 text-xs font-bold transition ${
                    active
                      ? 'border-forest-700 bg-forest-700 text-solar-300'
                      : 'border-cotton-300 bg-white text-espresso-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Independent Controls */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-forest-700">
            Controles independientes
          </p>
          {(
            [
              ['animationsEnabled', 'Animaciones suaves', Wand2],
              ['effects3dEnabled', 'Efectos 3D y profundidad', Layers],
              ['soundsEnabled', 'Sonidos suaves al tocar', Volume2],
              ['hapticsEnabled', 'Vibración táctil (háptica)', Vibrate],
            ] as const
          ).map(([key, label, Icon]) => (
            <label
              key={key}
              className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cotton-300 bg-white/85 px-4 py-2.5"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-espresso-900">
                <Icon className="h-4 w-4 text-forest-700" />
                {label}
              </span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => {
                  triggerFeedback('tap');
                  updatePrefs({ [key]: e.target.checked });
                }}
                className="h-5 w-5 accent-forest-700"
              />
            </label>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
};
