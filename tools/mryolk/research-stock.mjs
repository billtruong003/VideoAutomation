#!/usr/bin/env node
/**
 * research-stock.mjs — search, shortlist, download, and record provenance.
 *
 *   node tools/mryolk/research-stock.mjs
 *
 * Runs ONCE, before rendering. By the time Remotion starts, every asset it needs is a local
 * file with a known hash. That is not a convenience — a render that fetches over the network
 * is not deterministic, cannot be reproduced later when a photo is delisted, and turns a
 * provider outage into a corrupted video.
 *
 * ------------------------------------------------------------------------- shortlisting
 *
 * Candidates are scored rather than taken in provider order, because provider order optimises
 * for popularity and this needs suitability. Resolution, aspect and — for video — duration all
 * matter concretely: a 6-second clip cannot cover an 8-second beat without a visible loop, and
 * a portrait photo cropped to 16:9 loses its subject.
 *
 * Near-duplicate suppression is by CREATOR, since providers return long runs from a single
 * shoot for a specific query, and four frames of the same warehouse is worse than one.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, STOCK_ARCHIVE_DIR, STOCK_DIR } from './config.mjs';
import { STOCK_QUERIES, STOCK_REJECTS } from './stock-plan.mjs';
import {
  describeProviders, pexelsPhotos, pexelsVideos, pixabayImages, pixabayVideos,
} from './stock-api.mjs';

/** Load .env by hand — this repo has no dotenv, and the keys must not be committed. */
function loadEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const TARGET_W = 1920;
const TARGET_ASPECT = 16 / 9;

/**
 * Higher is better. Anything disqualifying returns -Infinity and is dropped, not ranked.
 *
 * Resolution is scored as a THRESHOLD rather than a slope. An earlier revision rewarded raw
 * pixel count, and the effect was that a 6000px stock photo beat a well-composed 1920px one
 * on every single query — which quietly turned a two-provider search into a one-provider
 * search, since the two providers publish at different sizes. Past 1920 wide, more pixels buy
 * nothing on a 1920x1080 canvas, so past 1920 they stop earning points.
 */
function score(c) {
  if (!c.width || !c.height) return -Infinity;
  if (c.width < 1280) return -Infinity;
  const aspect = c.width / c.height;
  if (aspect < 1.2) return -Infinity;                       // portrait or square: unusable at 16:9

  let s = 0;
  s += Math.min(c.width / TARGET_W, 1) * 10;                // enough resolution, then flat
  s -= Math.abs(aspect - TARGET_ASPECT) * 12;               // punish letterbox/pillarbox crops
  if (c.kind === 'video') {
    const d = c.durationSeconds ?? 0;
    if (d < 5) return -Infinity;                            // too short to cover a cutaway
    s += Math.min(d, 20) * 0.35;                            // longer clips give the edit slack
    if (d > 45) s -= 4;                                     // very long files cost download time
  }
  return s;
}

async function searchAll(entry) {
  const out = [];
  const tasks = [];
  if (entry.kinds.includes('photo')) {
    tasks.push(pexelsPhotos(entry.query), pixabayImages(entry.query));
  }
  if (entry.kinds.includes('video')) {
    tasks.push(pexelsVideos(entry.query), pixabayVideos(entry.query));
  }
  for (const t of tasks) {
    try { out.push(...await t); } catch (e) { console.warn(`    ! ${e.message}`); }
  }
  return out;
}

function shortlist(candidates, entry, takenGlobally) {
  const wantVideo = entry.kinds.includes('video');
  const ranked = candidates
    .map((c) => ({ ...c, score: score(c) }))
    .filter((c) => c.score > -Infinity)
    /*
     * Reject anything already retained for an earlier beat. Neighbouring queries overlap far
     * more than they look like they should — "suburban houses aerial" and "highway
     * interchange aerial" both surface the same drone reel — and without this the same clip
     * is downloaded three times under three names and then appears three times in the cut,
     * which reads as a mistake even to a viewer who could not say why.
     */
    .filter((c) => !takenGlobally.has(`${c.provider}:${c.providerId}`))
    .filter((c) => !STOCK_REJECTS[`${c.provider}:${c.providerId}`])
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seenCreators = new Set();
  const takeFrom = (pool) => {
    for (const c of pool) {
      if (picked.length >= entry.slots) break;
      const creatorKey = `${c.provider}:${c.creator ?? c.providerId}`;
      if (seenCreators.has(creatorKey)) continue;
      seenCreators.add(creatorKey);
      takenGlobally.add(`${c.provider}:${c.providerId}`);
      picked.push(c);
    }
  };

  /*
   * When a beat asked for BOTH kinds, guarantee the video gets a slot before the photos take
   * every one. Motion is the reason that beat wanted stock at all; a still would have been
   * requested as a still.
   */
  if (wantVideo) takeFrom(ranked.filter((c) => c.kind === 'video').slice(0, 1));
  takeFrom(ranked);
  return picked;
}

const extFor = (c) => (c.kind === 'video' ? 'mp4' : 'jpg');

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

async function main() {
  loadEnv();
  mkdirSync(STOCK_DIR, { recursive: true });
  mkdirSync(STOCK_ARCHIVE_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const providers = describeProviders();
  console.log(`pexels  ${providers.pexels.configured ? 'configured' : 'NOT CONFIGURED'}`);
  console.log(`pixabay ${providers.pixabay.configured ? 'configured' : 'NOT CONFIGURED — proceeding without it'}`);
  if (!providers.pexels.configured && !providers.pixabay.configured) {
    console.error('no stock provider is configured; set PEXELS_API_KEY');
    process.exit(1);
  }

  const takenGlobally = new Set();
  const research = { generatedAt: new Date().toISOString(), providers, queries: [] };
  const provenance = { generatedAt: new Date().toISOString(), assets: [] };

  for (const entry of STOCK_QUERIES) {
    process.stdout.write(`\n${entry.id.padEnd(24)} "${entry.query}"\n`);
    const candidates = await searchAll(entry);
    const picked = shortlist(candidates, entry, takenGlobally);

    research.queries.push({
      id: entry.id,
      query: entry.query,
      beat: entry.beat,
      kinds: entry.kinds,
      candidatesReviewed: candidates.length,
      shortlisted: picked.length,
      shortlist: picked.map((c) => ({
        provider: c.provider, kind: c.kind, providerId: c.providerId,
        width: c.width, height: c.height, durationSeconds: c.durationSeconds ?? null,
        score: Number(c.score.toFixed(2)), sourcePage: c.sourcePage,
      })),
    });

    for (let i = 0; i < picked.length; i++) {
      const c = picked[i];
      const local = `${entry.id}-${i + 1}-${c.provider}-${c.providerId}.${extFor(c)}`;
      /*
       * Videos land OUTSIDE the served directory: the renderer reads proxies, not originals,
       * and everything under `public/` is copied into the bundle on every render. Photos are
       * used directly and stay where the renderer can see them.
       */
      const dest = c.kind === 'video' ? join(STOCK_ARCHIVE_DIR, local) : join(STOCK_DIR, local);
      let file;
      try {
        if (existsSync(dest)) {
          const buf = readFileSync(dest);
          file = { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
          console.log(`  = ${local} (cached, ${(file.bytes / 1e6).toFixed(1)} MB)`);
        } else {
          file = await download(c.downloadUrl, dest);
          console.log(`  + ${local} (${(file.bytes / 1e6).toFixed(1)} MB, ${c.width}x${c.height})`);
        }
      } catch (e) {
        console.warn(`  ! ${local}: ${e.message}`);
        continue;
      }

      provenance.assets.push({
        stockId: `${entry.id}-${i + 1}`,
        beat: entry.beat,
        searchQuery: entry.query,
        provider: c.provider,
        providerAssetId: c.providerId,
        creator: c.creator,
        creatorUrl: c.creatorUrl,
        sourcePage: c.sourcePage,
        license: c.license,
        kind: c.kind,
        width: c.width,
        height: c.height,
        durationSeconds: c.durationSeconds ?? null,
        description: c.alt || null,
        retrievedAt: new Date().toISOString(),
        file: `mryolk/stock/${local}`,
        bytes: file.bytes,
        sha256: file.sha256,
      });
    }
  }

  writeFileSync(join(DATA_DIR, 'stock-research.json'), `${JSON.stringify(research, null, 2)}\n`);
  writeFileSync(join(DATA_DIR, 'stock-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  writeCredits(provenance);

  const photos = provenance.assets.filter((a) => a.kind === 'photo').length;
  const videos = provenance.assets.filter((a) => a.kind === 'video').length;
  console.log(`\n${provenance.assets.length} assets retained  (${photos} photos, ${videos} videos)`);
  console.log(`reviewed ${research.queries.reduce((n, q) => n + q.candidatesReviewed, 0)} candidates across ${research.queries.length} queries`);
}

/** The attribution both providers ask for, in a form that can be pasted into a description. */
function writeCredits(provenance) {
  const lines = [
    '# Credits — Why The Entire World Runs On Debt',
    '',
    'Mr.Yolk character art and all animation, diagrams and sound effects are original to this production.',
    '',
    'Supporting real-world footage and photography:',
    '',
  ];
  const byProvider = { pexels: [], pixabay: [] };
  for (const a of provenance.assets) byProvider[a.provider]?.push(a);

  if (byProvider.pexels.length) {
    lines.push('## Pexels', '', 'Footage and photos provided by [Pexels](https://www.pexels.com).', '');
    for (const a of byProvider.pexels) {
      lines.push(`- ${a.kind === 'video' ? 'Video' : 'Photo'} by ${a.creator ?? 'unknown'}${a.creatorUrl ? ` (${a.creatorUrl})` : ''} — ${a.sourcePage}`);
    }
    lines.push('');
  }
  if (byProvider.pixabay.length) {
    lines.push('## Pixabay', '', 'Footage and photos from [Pixabay](https://pixabay.com).', '');
    for (const a of byProvider.pixabay) {
      lines.push(`- ${a.kind === 'video' ? 'Video' : 'Image'} by ${a.creator ?? 'unknown'}${a.creatorUrl ? ` (${a.creatorUrl})` : ''} — ${a.sourcePage}`);
    }
    lines.push('');
  }
  writeFileSync(join(DATA_DIR, 'credits.md'), `${lines.join('\n')}\n`, 'utf8');
}

await main();
