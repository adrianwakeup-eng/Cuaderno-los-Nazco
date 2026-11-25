import type { FamilyStickerItem } from './familyStickersAndGifs';

interface RawPackSticker {
  id: string;
  name: string;
  category: string;
  svgFile: string;
}

interface RawPackGif {
  id: string;
  name: string;
  category: string;
  subtitle?: string;
  file: string;
}

interface RawPackManifest {
  stickers?: RawPackSticker[];
  gifs?: RawPackGif[];
}

export interface LoadedCrochetPack {
  stickers: FamilyStickerItem[];
  gifs: FamilyStickerItem[];
  byId: Map<string, FamilyStickerItem>;
  stickerCategories: string[];
  gifCategories: string[];
}

let cachedPack: LoadedCrochetPack | null = null;
let loadPromise: Promise<LoadedCrochetPack> | null = null;

function buildEmptyPack(): LoadedCrochetPack {
  return {
    stickers: [],
    gifs: [],
    byId: new Map(),
    stickerCategories: [],
    gifCategories: [],
  };
}

/**
 * Loads the 378 SVG crochet stickers + 300 animated crochet GIFs from
 * ./crochet-assets/manifest.json once and caches them in RAM (0 KB JS bundle bloat).
 */
export function loadCrochetAssetsPack(): Promise<LoadedCrochetPack> {
  if (cachedPack) return Promise.resolve(cachedPack);
  if (loadPromise) return loadPromise;

  loadPromise = fetch('./crochet-assets/manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error('manifest unavailable');
      return res.json() as Promise<RawPackManifest>;
    })
    .then((raw) => {
      const byId = new Map<string, FamilyStickerItem>();
      const stickerCatSet = new Set<string>();
      const gifCatSet = new Set<string>();

      const stickers: FamilyStickerItem[] = (raw.stickers ?? []).map((s) => {
        stickerCatSet.add(s.category);
        const item: FamilyStickerItem = {
          id: `cs:${s.id}`,
          kind: 'STICKER',
          category: 'HOGAR',
          packCategory: s.category,
          label: s.name,
          emoji: '🧶',
          gradient: 'from-white/60 to-solar-50/50',
          animationClass: '',
          assetUrl: `./crochet-assets/${s.svgFile}`,
        };
        byId.set(item.id, item);
        return item;
      });

      const gifs: FamilyStickerItem[] = (raw.gifs ?? []).map((g) => {
        gifCatSet.add(g.category);
        const item: FamilyStickerItem = {
          id: `cg:${g.id}`,
          kind: 'GIF',
          category: 'CELEBRACION',
          packCategory: g.category,
          label: g.name,
          emoji: '✨',
          gradient: 'from-white/55 to-solar-50/45',
          animationClass: '',
          assetUrl: `./crochet-assets/${g.file}`,
        };
        byId.set(item.id, item);
        return item;
      });

      cachedPack = {
        stickers,
        gifs,
        byId,
        stickerCategories: Array.from(stickerCatSet),
        gifCategories: Array.from(gifCatSet),
      };
      return cachedPack;
    })
    .catch(() => {
      const empty = buildEmptyPack();
      loadPromise = null;
      return empty;
    });

  return loadPromise;
}

export function getCachedCrochetPack(): LoadedCrochetPack | null {
  return cachedPack;
}

export function isCrochetPackStickerId(id?: string): boolean {
  return Boolean(id && (id.startsWith('cs:') || id.startsWith('cg:')));
}
