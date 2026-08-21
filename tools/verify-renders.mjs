#!/usr/bin/env node
/**
 * verify-renders.mjs — prove every episode in a batch actually produced a usable file.
 *
 *   node tools/verify-renders.mjs [--batch batch-002] [--dir out/batch-002]
 *
 * `validate-output.mjs` is the DELIVERY gate: it checks a file against the YouTube Shorts
 * spec in depth. This is the cheaper question asked first, across the whole batch at once —
 * is there a file for every included episode, does it decode, does it have both streams, and
 * does its duration match the narration it was built from.
 *
 * The check that matters most is the LAST one. A render that dies partway still leaves a
 * playable MP4 behind; it is simply short. Size and exit codes will not catch that, and it is
 * exactly the failure a long unattended batch produces. Comparing against each episode's own
 * locked narration is the only way to know a video is whole.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { FFPROBE } from './ffbin.mjs';
import { paths, readJson, selection } from './episode.mjs';

const { slugs, manifest, rest, batchId } = selection();
const dirArg = rest.indexOf('--dir');
const DIR = dirArg >= 0 ? rest[dirArg + 1] : `out/${batchId}`;

/** Vertical Shorts. The whole channel is authored at this size. */
const EXPECT = { width: 1080, height: 1920 };
/** A finished render should land within a few frames of its narration plus the tail hold. */
const DURATION_TOLERANCE_S = 2.5;

const probe = (file) => JSON.parse(execFileSync(FFPROBE, [
  '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file,
], { encoding: 'utf8', maxBuffer: 1 << 26 }));

const rows = [];
let failures = 0;

for (const slug of slugs) {
  const n = String(manifest.episodes.find((e) => e.slug === slug).n).padStart(2, '0');
  const file = `${DIR}/${n}-${slug}.mp4`;
  const problems = [];

  if (!existsSync(file)) {
    rows.push({ slug, file, size: 0, width: 0, height: 0, fps: 0, dur: 0, hasAudio: false, narration: 0, problems: ['MISSING'] });
    failures++;
    continue;
  }

  const size = statSync(file).size;
  if (!size) problems.push('ZERO BYTES');

  let info = null;
  try { info = probe(file); } catch (e) { problems.push(`WILL NOT DECODE (${e.message.split('\n')[0]})`); }

  let width = 0; let height = 0; let dur = 0; let hasAudio = false; let fps = 0;
  if (info) {
    const v = info.streams.find((s) => s.codec_type === 'video');
    const a = info.streams.find((s) => s.codec_type === 'audio');
    hasAudio = Boolean(a);
    if (!v) problems.push('NO VIDEO STREAM');
    if (!a) problems.push('NO AUDIO STREAM');
    if (v) {
      width = v.width; height = v.height;
      // ffprobe reports a rational, "30/1". Parse it; do not eval a string from a file.
      const [num, den] = String(v.r_frame_rate || '0/1').split('/').map(Number);
      fps = den ? Math.round(num / den) : 0;
      if (v.width !== EXPECT.width || v.height !== EXPECT.height) {
        problems.push(`WRONG SIZE ${v.width}x${v.height} (expected ${EXPECT.width}x${EXPECT.height})`);
      }
    }
    dur = Number(info.format.duration || 0);
    if (!(dur > 0)) problems.push('NO DURATION');
  }

  /*
   * Whole-file check. The narration is the master clock, so the video should run its length
   * plus the tail hold -- a render truncated by a crash is short, plays fine, and passes every
   * other check here.
   */
  const timing = readJson(paths(slug).timing);
  const narration = timing.durationS ?? timing.duration ?? 0;
  if (narration && dur && dur + DURATION_TOLERANCE_S < narration) {
    problems.push(`TRUNCATED: ${dur.toFixed(1)}s against ${narration.toFixed(1)}s of narration`);
  }

  if (problems.length) failures++;
  rows.push({ slug, file, size, width, height, fps, dur, hasAudio, narration, problems });
}

console.log('');
console.log('#   episode                    size      WxH        fps   dur    narr   audio  verdict');
for (const [i, r] of rows.entries()) {
  console.log(
    `${String(i + 1).padStart(2)}  ${r.slug.padEnd(25)} `
    + `${(r.size / 1e6).toFixed(1).padStart(6)}MB  `
    + `${(r.width ? `${r.width}x${r.height}` : '-').padEnd(10)} `
    + `${String(r.fps || '-').padStart(3)}  `
    + `${r.dur ? r.dur.toFixed(1) : '-'}s`.padStart(7) + '  '
    + `${r.narration ? r.narration.toFixed(1) : '-'}s`.padStart(6) + '  '
    + `${r.hasAudio ? 'yes' : 'NO'}`.padEnd(6) + ' '
    + (r.problems.length ? `FAIL — ${r.problems.join('; ')}` : 'ok'),
  );
}

console.log('');
console.log(`${rows.length - failures}/${rows.length} verified in ${DIR}`);
if (failures) {
  console.log(`${failures} problem(s) — see FAIL rows above.`);
  process.exit(1);
}
console.log('FINAL_MP4_COUNT == INCLUDED_EPISODE_COUNT');
