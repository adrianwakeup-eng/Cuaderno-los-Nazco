import React, { useState } from 'react';
import { Sparkles, Smile, X } from 'lucide-react';
import {
  FAMILY_GIFS,
  FAMILY_STICKERS,
  findStickerOrGif,
  type FamilyStickerItem,
} from '../../data/familyStickersAndGifs';

export const StickerGifBadge: React.FC<{
  stickerId?: string;
  compact?: boolean;
}> = ({ stickerId, compact = false }) => {
  const item = findStickerOrGif(stickerId);
  if (!item) return null;

  if (item.kind === 'GIF') {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br ${item.gradient} text-white shadow-md ${
          compact ? 'px-4 py-3' : 'w-full max-w-[260px] px-6 py-5'
        }`}
      >
        <span className="absolute right-2.5 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
          GIF
        </span>
        {item.subEmoji && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm opacity-90 animate-float-gentle">
            {item.subEmoji}
          </span>
        )}
        <span className={`${compact ? 'text-4xl' : 'text-6xl'} ${item.animationClass} drop-shadow`}>
          {item.emoji}
        </span>
        <span
          className={`mt-2 text-center font-bold tracking-tight drop-shadow-sm ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {item.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-3xl border border-amber-200/90 bg-gradient-to-br ${item.gradient} shadow-sm ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <span className={`${compact ? 'text-2xl' : 'text-4xl'} animate-pop-in`}>{item.emoji}</span>
      <div>
        <span className={`block font-bold text-espresso-900 ${compact ? 'text-xs' : 'text-sm'}`}>
          {item.label}
        </span>
        {!compact && <span className="text-[10px] font-semibold text-terracotta-600">Sticker Familiar</span>}
      </div>
    </div>
  );
};

export const StickerGifPicker: React.FC<{
  onSelect: (item: FamilyStickerItem) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const [tab, setTab] = useState<'GIF' | 'STICKER'>('GIF');
  const [category, setCategory] = useState<'ALL' | FamilyStickerItem['category']>('ALL');

  const source = tab === 'GIF' ? FAMILY_GIFS : FAMILY_STICKERS;
  const filtered = source.filter((item) => category === 'ALL' || item.category === category);

  return (
    <div className="animate-pop-in rounded-3xl border border-amber-200 bg-white p-3.5 shadow-xl">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-2xl bg-linen-100 p-1">
          <button
            type="button"
            onClick={() => setTab('GIF')}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === 'GIF'
                ? 'bg-gradient-to-r from-emerald-600 to-forest-700 text-white shadow-sm'
                : 'text-espresso-600 hover:text-espresso-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            GIFs animados
          </button>
          <button
            type="button"
            onClick={() => setTab('STICKER')}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === 'STICKER'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-sm'
                : 'text-espresso-600 hover:text-espresso-900'
            }`}
          >
            <Smile className="h-3.5 w-3.5" />
            Stickers
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-espresso-500 hover:bg-linen-100"
          aria-label="Cerrar stickers y GIFs"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category chips */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['ALL', 'Todos ✨'],
            ['AMOR', 'Amor 💖'],
            ['CELEBRACION', 'Fiesta 🎉'],
            ['SALUDOS', 'Saludos 🌞'],
            ['HOGAR', 'Hogar 🏡'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              category === id
                ? 'bg-terracotta-100 text-terracotta-700'
                : 'bg-linen-100 text-espresso-600 hover:bg-linen-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div
        className={`grid max-h-60 gap-2 overflow-y-auto pr-1 ${
          tab === 'GIF' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'
        }`}
      >
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`group flex flex-col items-center justify-center rounded-2xl p-2.5 text-center transition hover:scale-[1.04] active:scale-95 ${
              item.kind === 'GIF'
                ? `bg-gradient-to-br ${item.gradient} text-white shadow-sm`
                : `border border-amber-200/80 bg-gradient-to-br ${item.gradient} text-espresso-900`
            }`}
          >
            <span className={`text-3xl ${item.animationClass}`}>{item.emoji}</span>
            <span className="mt-1 line-clamp-1 text-[11px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
