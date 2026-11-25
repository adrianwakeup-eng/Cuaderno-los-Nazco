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

// Keep these IDs resolvable for posts and chats that already use them.
const duplicatePickerIds = new Set([
  'cs:guirnalda-perlas-durazno',
  'cs:perla-gota-esmeralda',
  'cs:racimo-perlas-7-durazno',
  'cs:carrete-hilo-mostaza',
  'cs:guirnalda-perlas-marfil',
  'cs:borla-coral',
  'cs:borla-indigo',
  'cs:aguja-lanera-salvia',
  'cg:gif-mandala-autumn-v5',
  'cg:gif-mandala-emerald-v2',
  'cg:gif-idea-bulb-v5',
  'cg:gif-handmade-ribbon-v2',
  'cg:gif-mandala-boho-v3',
]);

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
 * Loads the crochet stickers and animated GIFs from
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
        stickers: stickers.filter((item) => !duplicatePickerIds.has(item.id)),
        gifs: gifs.filter((item) => !duplicatePickerIds.has(item.id)),
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
