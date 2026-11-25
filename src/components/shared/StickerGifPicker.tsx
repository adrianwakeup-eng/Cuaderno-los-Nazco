import React, { useEffect, useMemo, useState } from 'react';
import { Search, Smile, Sparkles, X } from 'lucide-react';
import {
  getCachedCrochetPack,
  isCrochetPackStickerId,
  loadCrochetAssetsPack,
  type LoadedCrochetPack,
} from '../../data/crochetAssetsPack';
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
  const [pack, setPack] = useState<LoadedCrochetPack | null>(() => getCachedCrochetPack());

  useEffect(() => {
    if (!isCrochetPackStickerId(stickerId) || pack) return;
    let alive = true;
    void loadCrochetAssetsPack().then((loaded) => {
      if (alive) setPack(loaded);
    });
    return () => {
      alive = false;
    };
  }, [stickerId, pack]);

  if (!stickerId) return null;

  // Render real transparent SVG sticker or animated GIF from the Crochet Pack
  if (isCrochetPackStickerId(stickerId)) {
    const packItem = pack?.byId.get(stickerId);
    if (!packItem?.assetUrl) {
      return (
        <div
          className={`inline-flex items-center justify-center rounded-2xl bg-white/30 ${
            compact ? 'h-20 w-20' : 'h-32 w-32'
          }`}
        />
      );
    }
    return (
      <div className="inline-flex flex-col items-center">
        <img
          src={packItem.assetUrl}
          alt={packItem.label}
          loading="lazy"
          className={`object-contain drop-shadow-[0_6px_14px_rgba(24,18,6,0.28)] ${
            compact ? 'h-24 w-24' : 'h-36 w-36 sm:h-40 sm:w-40'
          }`}
        />
        {!compact && (
          <span className="mt-1 rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {packItem.label}
          </span>
        )}
      </div>
    );
  }

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
        {!compact && (
          <span className="text-[10px] font-semibold text-terracotta-600">Sticker Familiar</span>
        )}
      </div>
    </div>
  );
};

const PAGE_SIZE = 42;

export const StickerGifPicker: React.FC<{
  onSelect: (item: FamilyStickerItem) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const [tab, setTab] = useState<'GIF' | 'STICKER'>('GIF');
  const [category, setCategory] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pack, setPack] = useState<LoadedCrochetPack | null>(() => getCachedCrochetPack());

  useEffect(() => {
    if (pack) return;
    let alive = true;
    void loadCrochetAssetsPack().then((loaded) => {
      if (alive) setPack(loaded);
    });
    return () => {
      alive = false;
    };
  }, [pack]);

  const handleSwitchTab = (next: 'GIF' | 'STICKER') => {
    setTab(next);
    setCategory('ALL');
    setVisibleCount(PAGE_SIZE);
  };

  const categories = useMemo(() => {
    const packCats =
      tab === 'GIF' ? (pack?.gifCategories ?? []) : (pack?.stickerCategories ?? []);
    return ['ALL', ...packCats, 'FAMILIA'];
  }, [tab, pack]);

  const allItems = useMemo(() => {
    const packItems = tab === 'GIF' ? (pack?.gifs ?? []) : (pack?.stickers ?? []);
    const familyItems = tab === 'GIF' ? FAMILY_GIFS : FAMILY_STICKERS;
    return [...packItems, ...familyItems];
  }, [tab, pack]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (category === 'FAMILIA') {
        if (item.assetUrl) return false;
      } else if (category !== 'ALL') {
        if (item.packCategory !== category) return false;
      }
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.packCategory?.toLowerCase().includes(q) ?? false) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [allItems, category, query]);

  const displayed = filtered.slice(0, visibleCount);
  const totalGifs = (pack?.gifs.length ?? 0) + FAMILY_GIFS.length;
  const totalStickers = (pack?.stickers.length ?? 0) + FAMILY_STICKERS.length;

  return (
    <div className="animate-pop-in card-crochet rounded-3xl p-3.5 shadow-xl">
      {/* Tabs + Close */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="liquid-glass-pill flex gap-1.5 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => handleSwitchTab('GIF')}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === 'GIF'
                ? 'bg-gradient-to-r from-emerald-600 to-forest-700 text-white shadow-sm'
                : 'text-espresso-700 hover:text-espresso-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            GIFs ({totalGifs})
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('STICKER')}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === 'STICKER'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-sm'
                : 'text-espresso-700 hover:text-espresso-900'
            }`}
          >
            <Smile className="h-3.5 w-3.5" />
            Stickers ({totalStickers})
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="liquid-glass-pill flex h-8 w-8 items-center justify-center rounded-full text-espresso-700 hover:bg-white/70"
          aria-label="Cerrar stickers y GIFs"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-espresso-600" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder={
            tab === 'GIF'
              ? 'Buscar GIF (osito, girasol, mandala, corazón…) '
              : 'Buscar sticker (flor, perla, cuenta, hilo…)'
          }
          className="liquid-chat-input h-9 w-full rounded-full pl-9 pr-3 text-xs text-espresso-900 placeholder:text-espresso-600 focus:outline-none"
        />
      </div>

      {/* Category filter chips */}
      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const label =
            cat === 'ALL' ? 'Todos ✨' : cat === 'FAMILIA' ? 'Familia 💛' : cat;
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                active
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'liquid-glass-pill text-espresso-800 hover:bg-white/65'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className={`grid max-h-64 gap-2 overflow-y-auto pr-1 ${
          tab === 'GIF' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'
        }`}
      >
        {displayed.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`group flex flex-col items-center justify-center rounded-2xl p-2 text-center transition hover:scale-[1.04] active:scale-95 ${
              item.assetUrl
                ? 'liquid-glass-pill text-espresso-900'
                : item.kind === 'GIF'
                  ? `bg-gradient-to-br ${item.gradient} text-white shadow-sm`
                  : `border border-amber-200/80 bg-gradient-to-br ${item.gradient} text-espresso-900`
            }`}
          >
            {item.assetUrl ? (
              <img
                src={item.assetUrl}
                alt={item.label}
                loading="lazy"
                className="h-16 w-16 object-contain drop-shadow-sm"
              />
            ) : (
              <span className={`text-3xl ${item.animationClass}`}>{item.emoji}</span>
            )}
            <span className="mt-1 line-clamp-1 text-[10px] font-bold leading-tight">
              {item.label}
            </span>
          </button>
        ))}

        {displayed.length === 0 && (
          <div className="col-span-full py-6 text-center text-xs font-semibold text-espresso-600">
            No encontramos resultados para «{query}».
          </div>
        )}
      </div>

      {visibleCount < filtered.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="crochet-green-3d btn-yarn-press mt-2.5 w-full rounded-full py-2 text-xs font-bold text-white"
        >
          Ver más ({filtered.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};
