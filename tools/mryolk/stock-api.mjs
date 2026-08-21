/**
 * stock-api.mjs — Pexels and Pixabay, with the keys kept out of everything they touch.
 *
 * Endpoint shapes were checked against the current published documentation rather than
 * written from memory, because both providers have moved paths: Pexels video search is now
 * `/v1/videos/search` (the old `api.pexels.com/videos/search` is the deprecated one), and
 * Pixabay splits images and video across `/api/` and `/api/videos/`.
 *
 *   Pexels    key in an `Authorization` HEADER. 200 requests/hour.
 *   Pixabay   key as a `key=` QUERY PARAMETER, and responses MUST be cached for 24 hours —
 *             that is a documented condition of use, not an optimisation.
 *
 * ------------------------------------------------------------------------ key hygiene
 *
 * The key is read from the environment in ONE function per provider and attached at the last
 * possible moment. Nothing that leaves this module carries it: the cache key is the query, not
 * the URL, precisely so a Pixabay URL with `key=` in it never reaches disk; errors report a
 * status and a redacted URL; and `describeProviders()` reports only whether a key exists.
 *
 * Pixabay being unconfigured is NOT fatal. It degrades to Pexels-only and says so, because a
 * missing optional provider should not stop a production — and HTML scraping is not a
 * fallback, it is a different thing entirely that happens to return pictures.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_DIR = join('data', 'mryolk', '.stock-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const pexelsKey = () => process.env.PEXELS_API_KEY || null;
const pixabayKey = () => process.env.PIXABAY_API_KEY || null;

export const describeProviders = () => ({
  pexels: { configured: Boolean(pexelsKey()), source: pexelsKey() ? 'PEXELS_API_KEY' : null },
  pixabay: { configured: Boolean(pixabayKey()), source: pixabayKey() ? 'PIXABAY_API_KEY' : null },
});

/** Redact anything that looks like a credential before a string can reach a log. */
const redact = (s) => String(s).replace(/(key=)[^&]+/gi, '$1REDACTED');

const cachePath = (provider, kind, params) => join(
  CACHE_DIR,
  `${provider}-${kind}-${createHash('sha256').update(JSON.stringify(params)).digest('hex').slice(0, 16)}.json`,
);

function readCache(path) {
  if (!existsSync(path)) return null;
  try {
    const entry = JSON.parse(readFileSync(path, 'utf8'));
    if (Date.now() - entry.fetchedAtMs > CACHE_TTL_MS) return null;
    return entry;
  } catch { return null; }
}

async function cached(provider, kind, params, fetcher) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const path = cachePath(provider, kind, params);
  const hit = readCache(path);
  if (hit) return { ...hit, fromCache: true };

  const data = await fetcher();
  const entry = { provider, kind, params, fetchedAt: new Date().toISOString(), fetchedAtMs: Date.now(), data };
  writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
  return { ...entry, fromCache: false };
}

/** Politeness spacing. Pexels allows 200/hour; nothing here needs to go faster than this. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;
async function throttle(minGapMs = 350) {
  const since = Date.now() - lastCall;
  if (since < minGapMs) await wait(minGapMs - since);
  lastCall = Date.now();
}

async function getJson(url, { headers = {} } = {}) {
  await throttle();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} from ${redact(url.split('?')[0])}: ${redact(body).slice(0, 200)}`);
  }
  return res.json();
}

/* ================================================================== Pexels */

export async function pexelsPhotos(query, { perPage = 15 } = {}) {
  const key = pexelsKey();
  if (!key) return [];
  const { data } = await cached('pexels', 'photos', { query, perPage }, () => getJson(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=large`,
    { headers: { Authorization: key } },
  ));
  return (data.photos ?? []).map((p) => ({
    provider: 'pexels',
    kind: 'photo',
    providerId: String(p.id),
    width: p.width,
    height: p.height,
    creator: p.photographer ?? null,
    creatorUrl: p.photographer_url ?? null,
    sourcePage: p.url,
    alt: p.alt ?? '',
    downloadUrl: p.src?.original ?? p.src?.large2x ?? null,
    license: 'Pexels License',
  }));
}

export async function pexelsVideos(query, { perPage = 15 } = {}) {
  const key = pexelsKey();
  if (!key) return [];
  // Current path. `api.pexels.com/videos/search` is the deprecated one.
  const { data } = await cached('pexels', 'videos', { query, perPage }, () => getJson(
    `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=medium`,
    { headers: { Authorization: key } },
  ));
  return (data.videos ?? []).map((v) => {
    /*
     * Pick the largest H.264 rendition that is still sane to download. Pexels lists
     * everything from a 640px preview to 4K; the preview looks like mush at 1920 and the 4K
     * costs minutes of transfer for a three-second cutaway that gets scaled down anyway.
     */
    const files = (v.video_files ?? [])
      .filter((f) => f.file_type === 'video/mp4' && f.width && f.height)
      .filter((f) => f.width >= 1280)
      .sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920));
    const best = files[0] ?? null;
    return {
      provider: 'pexels',
      kind: 'video',
      providerId: String(v.id),
      width: best?.width ?? v.width,
      height: best?.height ?? v.height,
      durationSeconds: v.duration ?? null,
      creator: v.user?.name ?? null,
      creatorUrl: v.user?.url ?? null,
      sourcePage: v.url,
      alt: '',
      downloadUrl: best?.link ?? null,
      license: 'Pexels License',
    };
  }).filter((v) => v.downloadUrl);
}

/* ================================================================= Pixabay */

export async function pixabayImages(query, { perPage = 15 } = {}) {
  const key = pixabayKey();
  if (!key) return [];
  const { data } = await cached('pixabay', 'images', { query, perPage }, () => getJson(
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`
    + `&image_type=photo&orientation=horizontal&safesearch=true&per_page=${perPage}&min_width=1920`,
  ));
  return (data.hits ?? []).map((h) => ({
    provider: 'pixabay',
    kind: 'photo',
    providerId: String(h.id),
    width: h.imageWidth,
    height: h.imageHeight,
    creator: h.user ?? null,
    creatorUrl: h.user_id ? `https://pixabay.com/users/${h.user}-${h.user_id}/` : null,
    sourcePage: h.pageURL,
    alt: h.tags ?? '',
    // largeImageURL is the 1280px edge; fullHDURL/imageURL need a paid tier on some accounts.
    downloadUrl: h.fullHDURL ?? h.largeImageURL ?? null,
    license: 'Pixabay Content License',
  })).filter((h) => h.downloadUrl);
}

export async function pixabayVideos(query, { perPage = 15 } = {}) {
  const key = pixabayKey();
  if (!key) return [];
  const { data } = await cached('pixabay', 'videos', { query, perPage }, () => getJson(
    `https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`
    + `&safesearch=true&per_page=${perPage}`,
  ));
  return (data.hits ?? []).map((h) => {
    /*
     * Take the rendition CLOSEST to 1920 wide, not the largest one available. Pixabay serves
     * 4K for almost everything, and a 138 MB 3840x2160 file that the renderer immediately
     * scales to 1920 costs minutes of download and a gigabyte of disk to deliver pixels that
     * are thrown away before the first frame.
     */
    const v = h.videos ?? {};
    const pick = Object.values(v)
      .filter((f) => f?.url && f.width >= 1280)
      .sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920))[0] ?? null;
    return {
      provider: 'pixabay',
      kind: 'video',
      providerId: String(h.id),
      width: pick?.width ?? null,
      height: pick?.height ?? null,
      durationSeconds: h.duration ?? null,
      creator: h.user ?? null,
      creatorUrl: h.user_id ? `https://pixabay.com/users/${h.user}-${h.user_id}/` : null,
      sourcePage: h.pageURL,
      alt: h.tags ?? '',
      downloadUrl: pick?.url ?? null,
      license: 'Pixabay Content License',
    };
  }).filter((h) => h.downloadUrl && h.width);
}
