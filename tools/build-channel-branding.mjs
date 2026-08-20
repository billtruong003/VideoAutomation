#!/usr/bin/env node
/**
 * build-channel-branding.mjs — build the channel's avatar and banner, and every QA crop.
 *
 *   node tools/build-channel-branding.mjs
 *
 * The two master assets are rendered by Remotion from `src/branding/Branding.tsx`, which
 * composes the CANONICAL cast components. Bill is not cropped out of a PNG sheet here: the
 * sheets in `qa/characters/` are themselves renders of the same components, so going back to
 * the component is going back to the source rather than to a downstream copy — full
 * resolution, no matte fringing around the hair, and no chance of the branding drifting away
 * from the character bible.
 *
 * Everything after that is deterministic ffmpeg: scaling, cropping and masking. No generative
 * step touches any of it.
 *
 * The QA avatars are CIRCLE-MASKED because that is what YouTube shows. Judging a square
 * avatar tells you nothing about whether the glasses survive the crop.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { FFMPEG } from './ffbin.mjs';

const OUT = 'output/branding';
const QA = `${OUT}/qa`;

const AVATAR = `${OUT}/bill-finds-out-avatar.png`;
const BANNER = `${OUT}/bill-finds-out-banner.png`;

/** YouTube's centred safe area — every critical element must live inside it. */
const SAFE = { w: 1546, h: 423 };
const BANNER_W = 2560;
const BANNER_H = 1440;

mkdirSync(QA, { recursive: true });

const ff = (args) =>
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8', maxBuffer: 1 << 26,
  });

const kb = (p) => (statSync(p).size / 1024).toFixed(0);
const mb = (p) => (statSync(p).size / 1e6).toFixed(2);

// ---------------------------------------------------------------------------
// 1. masters
// ---------------------------------------------------------------------------

console.log('[1/4] rendering masters from the canonical components');
for (const [id, file] of [['ChannelAvatar', AVATAR], ['ChannelBanner', BANNER]]) {
  execFileSync('npx', ['remotion', 'still', id, file], {
    stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', shell: true, maxBuffer: 1 << 26,
  });
  if (!existsSync(file)) throw new Error(`${id} produced no file`);
  console.log(`      ${file}  ${kb(file)} KB`);
}

// ---------------------------------------------------------------------------
// 2. avatar QA — circle-masked, at the sizes YouTube actually uses
// ---------------------------------------------------------------------------

console.log('[2/4] avatar previews (circle-masked, as displayed)');

/**
 * Mask to a circle, then scale.
 *
 * Order matters: masking at full resolution and scaling afterwards gives a clean antialiased
 * edge, where masking after the downscale would give a hard 1-px staircase at 48 px and make
 * every preview look worse than the asset actually is.
 */
const circleMask =
  "format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':" +
  "a='255*lte(hypot(X-W/2,Y-H/2),W/2-1)'";

for (const size of [512, 256, 98, 48]) {
  const file = `${QA}/avatar-${size}.png`;
  ff(['-i', AVATAR, '-vf', `${circleMask},scale=${size}:${size}:flags=lanczos`, '-frames:v', '1', file]);
  console.log(`      ${file}  ${kb(file)} KB`);
}

/** A contact sheet, so the small sizes can be judged against each other in one look. */
ff([
  '-f', 'lavfi', '-i', `color=c=0xE8E4DA:s=760x300`,
  '-i', `${QA}/avatar-256.png`, '-i', `${QA}/avatar-98.png`, '-i', `${QA}/avatar-48.png`,
  '-filter_complex',
  '[0][1]overlay=24:22[a];[a][2]overlay=320:101[b];[b][3]overlay=450:126',
  '-frames:v', '1', `${QA}/avatar-size-ladder.png`,
]);
console.log(`      ${QA}/avatar-size-ladder.png`);

// ---------------------------------------------------------------------------
// 3. banner QA — the three crops YouTube serves, plus the safe-area overlay
// ---------------------------------------------------------------------------

console.log('[3/4] banner previews');

const cx = (BANNER_W - SAFE.w) / 2;
const cy = (BANNER_H - SAFE.h) / 2;

/** MOBILE: only the centred safe rectangle survives. The harshest crop, so it leads. */
ff(['-i', BANNER, '-vf', `crop=${SAFE.w}:${SAFE.h}:${cx}:${cy}`, '-frames:v', '1', `${QA}/banner-mobile-preview.png`]);

/** DESKTOP: full width, safe height — the wings appear, the top and bottom do not. */
ff(['-i', BANNER, '-vf', `crop=${BANNER_W}:${SAFE.h}:0:${cy}`, '-frames:v', '1', `${QA}/banner-desktop-preview.png`]);

/** TV / full canvas: everything. */
ff(['-i', BANNER, '-frames:v', '1', `${QA}/banner-full-preview.png`]);

/**
 * Safe-area overlay — QA ONLY, and deliberately built from the same numbers the composition
 * uses. If the rectangle and the layout ever disagree, the bug is visible rather than
 * theoretical.
 */
ff([
  '-i', BANNER,
  '-vf',
  `drawbox=x=${cx}:y=${cy}:w=${SAFE.w}:h=${SAFE.h}:color=0xE8503A@0.95:t=6,` +
  `drawbox=x=${cx}:y=${cy}:w=${SAFE.w}:h=${SAFE.h}:color=0xE8503A@0.06:t=fill`,
  '-frames:v', '1', `${QA}/banner-safe-area-preview.png`,
]);

for (const f of ['banner-mobile-preview', 'banner-desktop-preview', 'banner-full-preview', 'banner-safe-area-preview']) {
  console.log(`      ${QA}/${f}.png  ${kb(`${QA}/${f}.png`)} KB`);
}

// ---------------------------------------------------------------------------
// 4. size budget
// ---------------------------------------------------------------------------

console.log('[4/4] size check');

const LIMITS = { avatar: 4, banner: 6 };
const avatarMb = Number(mb(AVATAR));
let bannerMb = Number(mb(BANNER));

console.log(`      avatar  ${avatarMb} MB   limit ${LIMITS.avatar} MB   ${avatarMb < LIMITS.avatar ? 'OK' : 'OVER'}`);

if (bannerMb >= LIMITS.banner) {
  // Resolution is never reduced to hit a byte budget; a high-quality JPEG is the fallback.
  const jpg = `${OUT}/bill-finds-out-banner.jpg`;
  ff(['-i', BANNER, '-q:v', '2', '-frames:v', '1', jpg]);
  console.log(`      banner PNG ${bannerMb} MB exceeds ${LIMITS.banner} MB -> also wrote ${jpg} (${mb(jpg)} MB)`);
} else {
  console.log(`      banner  ${bannerMb} MB   limit ${LIMITS.banner} MB   OK`);
}

console.log('\nbranding build complete.');
