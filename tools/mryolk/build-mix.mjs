#!/usr/bin/env node
/**
 * build-mix.mjs — the final audio track: narration plus the effects, summed.
 *
 *   node tools/mryolk/build-mix.mjs
 *
 * ---------------------------------------------------------------- why this exists
 *
 * The obvious way to get this track is to ask Remotion for it — `--codec=wav` renders the
 * composition's audio and nothing else. That is where it started, and it is a poor dependency
 * for two reasons found by using it. An audio-only render still evaluates every one of the
 * 25,663 frames' React trees, which took over twenty minutes without finishing; and because it
 * evaluates them, it still asks the compositor for video frames, so it can die on the same
 * intermittent decode failure as a visual render — which it did, at frame 808.
 *
 * Nothing about this mix needs a browser. It is one narration track at unity plus 106 one-shot
 * samples at known offsets and known gains. Summing that directly takes about a second, cannot
 * fail intermittently, and is bit-for-bit reproducible.
 *
 * ------------------------------------------------------------------ one source of truth
 *
 * The cue list is NOT authored here. It comes from `data/mryolk/edit-plan.json`, which
 * `export-edit-plan.mjs` derives from `src/mryolk/Sfx.tsx` — the same table the composition
 * would have used. This file decides nothing about what plays or how loud; it only adds
 * numbers together.
 *
 * The one thing it does decide is the ceiling. Summed audio can exceed full scale even when
 * every part is well behaved, so the peak is trimmed at the end — see the note on that step
 * for why it is a static trim and not a limiter.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIO_DIR, DATA_DIR, SFX_DIR } from './config.mjs';

const NARRATION = join(AUDIO_DIR, 'narration-master.wav');
const OUT = join(AUDIO_DIR, 'final-mix.wav');

/** True-peak headroom. Nothing may reach full scale; YouTube re-encodes what we send. */
const CEILING = 0.89;

/* -------------------------------------------------------------- wav plumbing */

/**
 * Read a 16-bit PCM WAV into floats.
 *
 * Chunks are walked rather than assumed to start at byte 44. A WAV written by ffmpeg often
 * carries a LIST/INFO chunk before the data, and reading from a fixed offset would splice
 * that metadata into the audio as a burst of noise at the head of the file.
 */
function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path} is not a RIFF/WAVE file`);
  }

  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(body + size, buf.length));
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${path} has no fmt/data chunk`);
  if (fmt.format !== 1 || fmt.bits !== 16) {
    throw new Error(`${path} is not 16-bit PCM (format ${fmt.format}, ${fmt.bits} bits)`);
  }

  const n = Math.floor(data.length / 2);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) samples[i] = data.readInt16LE(i * 2) / 32768;
  return { ...fmt, samples, frames: n / fmt.channels };
}

function writeWav(path, samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
}

/* --------------------------------------------------------------------- mix */

const plan = JSON.parse(readFileSync(join(DATA_DIR, 'edit-plan.json'), 'utf8'));

/**
 * Per-category levels, mirroring `GAIN` in `src/mryolk/Sfx.tsx`.
 *
 * A cue that overrides its gain carries the value in the plan; this table supplies the rest.
 * A cue naming a sound with no level here stops the build, so adding a sound to the palette
 * cannot silently mix at zero.
 */
const GAIN = {
  pop: 0.13, tick: 0.09, whoosh: 0.12, ding: 0.15, cash: 0.16, paper: 0.13,
  stamp: 0.18, thud: 0.18, crack: 0.24, boing: 0.20, error: 0.17, vanish: 0.14,
  sparkle: 0.12, crash: 0.26, flush: 0.30, swell: 0.08,
};

const narration = readWav(NARRATION);
if (narration.channels !== 1) throw new Error('narration master must be mono');

const sr = narration.sampleRate;
const totalSeconds = plan.composition.durationSeconds;
const total = Math.ceil(totalSeconds * sr);

const mix = new Float64Array(total);
mix.set(narration.samples.subarray(0, Math.min(narration.samples.length, total)));

const missing = [...new Set(plan.sfx.map((c) => c.sound))].filter((s) => !(s in GAIN));
if (missing.length) throw new Error(`no level defined for: ${missing.join(', ')}`);

const cache = new Map();
const loadSfx = (name) => {
  if (!cache.has(name)) {
    const w = readWav(join(SFX_DIR, `${name}.wav`));
    if (w.sampleRate !== sr) {
      throw new Error(`${name}.wav is ${w.sampleRate} Hz but the narration is ${sr} Hz`);
    }
    cache.set(name, w.samples);
  }
  return cache.get(name);
};

let placed = 0;
let clippedBySfx = 0;
for (const cue of plan.sfx) {
  const samples = loadSfx(cue.sound);
  const gain = cue.gain ?? GAIN[cue.sound];
  const at = Math.round(cue.atSeconds * sr);
  if (at >= total) { clippedBySfx += 1; continue; }
  const n = Math.min(samples.length, total - at);
  for (let i = 0; i < n; i++) mix[at + i] += samples[i] * gain;
  placed += 1;
}

/*
 * Bring the peak under the ceiling with a STATIC trim, not a limiter.
 *
 * The first version here used a soft limiter with a release envelope, and it reported touching
 * 70% of the file — to fix an overage of 0.17 dB. That is the wrong instrument: a limiter
 * moves some parts of a mix relative to others, which is a real intervention, and using one to
 * recover a fifth of a decibel means constantly altering balance to solve a problem a single
 * multiplication solves exactly.
 *
 * A static trim scales everything by the same factor, so every relative level survives
 * untouched and the only audible difference is that the whole track is fractionally quieter.
 *
 * If the trim ever needed to be LARGE, that would not be a levels problem to smooth over — it
 * would mean the cue gains are wrong — so past `MAX_TRIM_DB` this stops and says so instead of
 * quietly squashing the mix into shape.
 */
const MAX_TRIM_DB = 3;

let peakBefore = 0;
for (const v of mix) peakBefore = Math.max(peakBefore, Math.abs(v));

let trimDb = 0;
if (peakBefore > CEILING) {
  const factor = CEILING / peakBefore;
  trimDb = -20 * Math.log10(factor);
  if (trimDb > MAX_TRIM_DB) {
    throw new Error(
      `the summed mix peaks at ${(20 * Math.log10(peakBefore)).toFixed(2)} dBFS and would need `
      + `${trimDb.toFixed(2)} dB of trim to fit under the ceiling. That is a cue-level problem, `
      + 'not a mastering one — check the gains in src/mryolk/Sfx.tsx.',
    );
  }
  for (let i = 0; i < total; i++) mix[i] *= factor;
}

let peakAfter = 0;
let rms = 0;
for (const v of mix) { peakAfter = Math.max(peakAfter, Math.abs(v)); rms += v * v; }
rms = Math.sqrt(rms / total);

writeWav(OUT, mix, sr);

const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(2) : '-inf');
console.log(`narration  ${(narration.frames / sr).toFixed(2)}s`);
console.log(`timeline   ${totalSeconds.toFixed(2)}s  (${total} samples @ ${sr} Hz)`);
console.log(`effects    ${placed} placed${clippedBySfx ? `, ${clippedBySfx} past the end` : ''}`);
console.log(`peak       ${db(peakBefore)} dBFS summed, ${db(peakAfter)} dBFS delivered`);
console.log(`trim       ${trimDb > 0 ? `-${trimDb.toFixed(2)} dB applied to the whole mix` : 'none needed'}`);
console.log(`rms        ${db(rms)} dBFS`);
console.log(`→ ${OUT}`);
