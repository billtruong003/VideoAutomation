/**
 * audio-qa.mjs — check the finished mixes, not the intentions.
 *
 * Every number here is measured from the rendered MP4. The composition can be correct and the
 * output still wrong: a bed can silently fail to load, a volume callback can be handed frames
 * where it expected seconds, an encoder can clip. None of that shows up in the source.
 *
 * FOUR THINGS ARE CHECKED, and the third is the one that matters most:
 *
 *  1. Clipping. True peak must stay under −1 dBFS.
 *  2. Loudness. Integrated must land near YouTube's −14 LUFS, so nothing is normalised hard
 *     on upload.
 *  3. NARRATION DOMINANCE. The mix's integrated loudness is compared against the narration
 *     WAV alone. Adding a bed 15 LU down should move it by a fraction of a decibel; if the
 *     mix is meaningfully louder than the voice by itself, something is competing with the
 *     speech and the whole point has been lost.
 *  4. Bed presence. Energy inside real narration pauses is compared against the same windows
 *     in the narration source. This is the only check that can tell "mixed correctly quiet"
 *     apart from "never rendered at all" -- both look identical in every other measurement.
 *
 * Sample-exact cancellation would be a cleaner way to isolate the bed, but the render is AAC
 * and lossy encoding destroys the null. Measuring known-silent windows works regardless.
 *
 *   node tools/audio-qa.mjs [--dir preview/batch-001]
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FFMPEG } from './ffbin.mjs';

const argv = process.argv.slice(2);
const dirArg = argv.indexOf('--dir');
const DIR = dirArg >= 0 ? argv[dirArg + 1] : 'out/batch-001';

const LIMITS = {
  truePeakDb: -1,
  lufsMin: -17,
  lufsMax: -12.5,
  /** How much louder the mix may be than the narration alone. */
  dominanceLu: 1.2,
  /** How much energy a pause must gain for the bed to count as present. */
  bedPresenceDb: 3,
};

const ff = (args) => (spawnSync(FFMPEG, ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' }).stderr ?? '');
const num = (s, re) => { const m = s.match(re); return m ? Number(m[1]) : NaN; };

function loudness(file) {
  const e = ff(['-i', file, '-af', 'ebur128=peak=true:framelog=quiet,volumedetect', '-f', 'null', '-']);
  return {
    lufs: num(e, /I:\s*(-?\d+\.?\d*) LUFS/),
    lra: num(e, /LRA:\s*(-?\d+\.?\d*) LU/),
    truePeak: num(e, /Peak:\s*(-?\d+\.?\d*) dBFS/),
    maxVol: num(e, /max_volume:\s*(-?\d+\.?\d*) dB/),
  };
}

const windowRms = (file, start, dur) =>
  num(ff(['-ss', String(start), '-t', String(dur), '-i', file, '-af', 'volumedetect', '-f', 'null', '-']),
    /mean_volume:\s*(-?\d+\.?\d*) dB/);

/** The genuine pauses, from the master clock. Same threshold the music envelope uses. */
function pausesOf(timing, minPause = 0.28) {
  const out = [];
  for (let i = 1; i < timing.words.length; i++) {
    const gap = timing.words[i].start - timing.words[i - 1].end;
    if (gap >= minPause) out.push({ start: timing.words[i - 1].end, dur: gap });
  }
  return out;
}

if (!existsSync(DIR)) { console.error(`No such directory: ${DIR}`); process.exit(1); }

const files = readdirSync(DIR).filter((f) => f.endsWith('.mp4')).sort();
if (!files.length) { console.error(`No MP4s in ${DIR}`); process.exit(1); }

console.log(`\n  audio QA — ${DIR}\n`);
console.log('  episode                 LUFS   peak   vs voice   bed    verdict');

let failures = 0;
const rows = [];

for (const f of files) {
  const slug = f.replace(/\.mp4$/, '').replace(/^\d+-/, '');
  const mixPath = join(DIR, f);
  const voicePath = `public/audio/${slug}.wav`;
  const timingPath = `episodes/${slug}/narration-timing.json`;

  const mix = loudness(mixPath);
  const problems = [];

  if (!(mix.truePeak < LIMITS.truePeakDb)) problems.push(`true peak ${mix.truePeak} dBFS`);
  if (mix.lufs < LIMITS.lufsMin || mix.lufs > LIMITS.lufsMax) problems.push(`loudness ${mix.lufs} LUFS`);

  let dominance = NaN;
  let bedGain = NaN;

  if (existsSync(voicePath) && existsSync(timingPath)) {
    const voice = loudness(voicePath);
    dominance = mix.lufs - voice.lufs;
    if (dominance > LIMITS.dominanceLu) {
      problems.push(`mix is ${dominance.toFixed(1)} LU louder than the voice alone`);
    }

    const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
    const pauses = pausesOf(timing);
    if (pauses.length) {
      /*
       * The median, not the mean. One pause can happen to coincide with an effect, which
       * would prove nothing about the bed; the median says the added energy is everywhere.
       */
      const deltas = pauses
        .map((p) => windowRms(mixPath, p.start + 0.05, Math.max(0.1, p.dur - 0.1))
          - windowRms(voicePath, p.start + 0.05, Math.max(0.1, p.dur - 0.1)))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      bedGain = deltas[Math.floor(deltas.length / 2)];
      if (bedGain < LIMITS.bedPresenceDb) {
        problems.push(`no bed detected in pauses (+${bedGain.toFixed(1)} dB)`);
      }
    }
  } else {
    problems.push('no narration source to compare against');
  }

  if (problems.length) failures++;
  rows.push({ slug, problems });
  console.log(
    `  ${slug.padEnd(22)} ${mix.lufs.toFixed(1).padStart(6)} ${mix.truePeak.toFixed(1).padStart(6)} `
    + `${(Number.isFinite(dominance) ? `${dominance >= 0 ? '+' : ''}${dominance.toFixed(2)} LU` : '—').padStart(10)} `
    + `${(Number.isFinite(bedGain) ? `+${bedGain.toFixed(0)} dB` : '—').padStart(7)}   `
    + (problems.length ? 'FAIL' : 'ok'));
}

if (failures) {
  console.log(`\n  ${failures} of ${files.length} failed:\n`);
  for (const r of rows.filter((x) => x.problems.length)) {
    console.log(`  ${r.slug}`);
    for (const p of r.problems) console.log(`     - ${p}`);
  }
  console.log();
  process.exit(1);
}

console.log(`\n  all ${files.length} pass`);
console.log('  narration dominant, no clipping, bed present and quiet in every episode\n');
