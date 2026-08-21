/**
 * assets.ts — semantic lookup for the extracted artwork and the researched stock.
 *
 * Scenes name a drawing by MEANING (`'yacht-rich'`, `'doc-mortgage'`) and never by file. That
 * is the contract that lets the sheets be re-exported, re-cut, or re-ordered without touching
 * a single scene, and it is why `yolk()` throws on an unknown slug instead of returning
 * undefined: a typo that renders an empty box is a defect that survives all the way to a
 * QA still, whereas a typo that fails the build is fixed in ten seconds.
 *
 * The registries are imported as JSON at build time, so nothing here touches the network or
 * the filesystem during a render.
 */

import { staticFile } from 'remotion';
import registry from '../../data/mryolk/asset-registry.json';
import provenance from '../../data/mryolk/stock-provenance.json';
import proxies from '../../data/mryolk/stock-proxies.json';

export type YolkAssetEntry = {
  slug: string;
  cell: string;
  category: string;
  tags: string[];
  file: string;
  width: number;
  height: number;
};

const BY_SLUG = new Map<string, YolkAssetEntry>(
  (registry.assets as YolkAssetEntry[]).map((a) => [a.slug, a]),
);

export type YolkSlug = string;

/** A drawing, by meaning. Throws when the meaning does not exist. */
export function yolk(slug: YolkSlug): YolkAssetEntry {
  const a = BY_SLUG.get(slug);
  if (!a) {
    throw new Error(
      `unknown Mr.Yolk asset "${slug}". `
      + `It must be a slug from tools/mryolk/taxonomy.mjs.`,
    );
  }
  return a;
}

export const yolkSrc = (slug: YolkSlug): string => staticFile(yolk(slug).file);

/** Every asset carrying a tag, for QA sheets and for picking a pose from a mood. */
export const yolkByTag = (tag: string): YolkAssetEntry[] =>
  (registry.assets as YolkAssetEntry[]).filter((a) => a.tags.includes(tag));

export const ALL_YOLK = registry.assets as YolkAssetEntry[];

/* ------------------------------------------------------------------------ stock */

export type StockEntry = {
  stockId: string;
  kind: 'photo' | 'video';
  file: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  provider: string;
  creator: string | null;
};

/**
 * Render-friendly re-encodes, keyed by the same id.
 *
 * The renderer reads THESE; `stock-provenance.json` stays the licensing record and describes
 * what was actually downloaded from the provider. Keeping the two separate matters: the
 * provenance file must keep saying "this is the 1920x1080 clip by X, retrieved at Y" even
 * though the frames the video is built from came from a 720p copy of it.
 *
 * See `tools/mryolk/make-proxies.mjs` for why the proxies exist at all — in short, four
 * simultaneous full-HD decodes per frame took the render from ten minutes to two hours.
 */
const PROXY = proxies.proxies as Record<
  string, { file: string; width: number; height: number; durationSeconds: number }
>;

const STOCK = new Map<string, StockEntry>(
  (provenance.assets as StockEntry[]).map((a) => [a.stockId, a]),
);

export function stock(id: string): StockEntry {
  const a = STOCK.get(id);
  if (!a) {
    throw new Error(
      `unknown stock asset "${id}". `
      + `It must be a stockId from data/mryolk/stock-provenance.json.`,
    );
  }
  const p = PROXY[id];
  if (!p) return a;
  return { ...a, file: p.file, width: p.width, height: p.height, durationSeconds: p.durationSeconds };
}

export const stockSrc = (id: string): string => staticFile(stock(id).file);

export const ALL_STOCK = provenance.assets as StockEntry[];
