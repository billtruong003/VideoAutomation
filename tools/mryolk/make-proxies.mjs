#!/usr/bin/env node
/**
 * make-proxies.mjs — render-friendly copies of the stock footage.
 *
 *   node tools/mryolk/make-proxies.mjs
 *
 * ---------------------------------------------------------------- why this exists
 *
 * The first full render started at roughly 25 frames/second and then collapsed: by frame 3000
 * the estimate had gone from ten minutes to nearly two hours and was still climbing. The
 * collapse begins exactly where chapter 3 puts FOUR stock clips on screen at once. Each is a
 * 1920x1080 H.264 file being decoded, looped, and scaled down into a 700x370 window — four
 * simultaneous full-HD decodes per frame, multiplied by the render concurrency, to produce a
 * seventh of the pixels that were decoded.
 *
 * So the footage is conditioned once, here, instead of being fought with on every frame:
 *
 *   SIZE. Clips used inside a window are re-encoded to 1280x720 — still more than double the
 *   pixels any window shows. The handful used FULL-BLEED keep 1920x1080, because those really
 *   do fill the frame and downscaling them would be visible.
 *
 *   LENGTH. Every clip is looped AT ENCODE TIME to `PROXY_SECONDS`, which is longer than the
 *   longest beat any of them has to cover. This is the second reason the proxies exist, and
 *   it removes a whole class of render failure: with a long-enough clip the renderer plays it
 *   straight through and never seeks, whereas wrapping a short clip with Remotion's `<Loop>`
 *   kept asking the compositor for a frame past the end of the file
 *   ("No frame found at position ...") and killed two full renders outright. Repeating the
 *   footage is a job ffmpeg does once, reliably, offline.
 *
 *   GOP. A keyframe every second, so any seek lands on or near an I-frame instead of decoding
 *   a long run of inter-frames to get there.
 *
 * The originals are left untouched and remain the licensing record; `stock-provenance.json`
 * keeps describing what was actually downloaded. The proxy table is separate, and the
 * renderer prefers it when one exists.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { FFMPEG, probeDuration } from '../ffbin.mjs';
import { DATA_DIR, STOCK_DIR } from './config.mjs';

const PROXY_DIR = join(STOCK_DIR, 'proxy');
/**
 * How long every proxy is made, by repeating the source until it reaches this length.
 *
 * Must exceed the longest continuous exposure any single clip gets in the edit — the four
 * windows in chapter 3 are the worst case at about 16s. `assertCoverage()` in
 * `export-edit-plan.mjs` fails the pipeline if a scene ever outgrows this.
 */
const PROXY_SECONDS = 30;

/**
 * Clips that are shown edge to edge and therefore keep full resolution.
 *
 * Listed explicitly rather than inferred: a proxy that is too small for its use is a quality
 * regression nobody notices until the final QA pass, and the list is short enough to keep
 * honest by hand.
 */
const FULL_BLEED = new Set([
  'city-financial-district-1',
]);

const provenance = JSON.parse(readFileSync(join(DATA_DIR, 'stock-provenance.json'), 'utf8'));

mkdirSync(PROXY_DIR, { recursive: true });

const table = { generatedAt: new Date().toISOString(), proxySeconds: PROXY_SECONDS, proxies: {} };
let savedBytes = 0;

for (const asset of provenance.assets) {
  if (asset.kind !== 'video') continue;

  const src = join('public', ...asset.file.split('/'));
  if (!existsSync(src)) {
    console.warn(`  ! missing ${asset.file}`);
    continue;
  }

  const full = FULL_BLEED.has(asset.stockId);
  const height = full ? 1080 : 720;
  const out = join(PROXY_DIR, `${asset.stockId}.mp4`);

  if (!existsSync(out)) {
    execFileSync(FFMPEG, [
      '-hide_banner', '-nostdin', '-v', 'error', '-y',
      // Repeat the source until the output reaches PROXY_SECONDS. The renderer then plays a
      // single continuous clip and never has to seek past the end of one.
      '-stream_loop', '-1', '-i', src,
      '-t', String(PROXY_SECONDS),
      '-an',
      '-vf', `scale=-2:${height}:flags=bicubic`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-pix_fmt', 'yuv420p',
      // One keyframe per second: looping seeks land on or near an I-frame every time.
      '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
      '-movflags', '+faststart',
      out,
    ], { stdio: 'pipe' });
  }

  const before = statSync(src).size;
  const after = statSync(out).size;
  savedBytes += before - after;

  table.proxies[asset.stockId] = {
    file: `mryolk/stock/proxy/${basename(out)}`,
    width: full ? 1920 : 1280,
    height,
    durationSeconds: Number(probeDuration(out).toFixed(3)),
    fullBleed: full,
    sourceBytes: before,
    proxyBytes: after,
  };

  console.log(
    `  ${asset.stockId.padEnd(26)} ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`
    + `  ${full ? '(full-bleed 1080p)' : '720p'}`,
  );
}

writeFileSync(join(DATA_DIR, 'stock-proxies.json'), `${JSON.stringify(table, null, 2)}\n`);

const n = Object.keys(table.proxies).length;
console.log(`\n${n} proxies → ${PROXY_DIR}`);
console.log(`decode load reduced by ${(savedBytes / 1e6).toFixed(0)} MB of source data`);
