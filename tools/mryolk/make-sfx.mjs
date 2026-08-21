#!/usr/bin/env node
/**
 * make-sfx.mjs — the Mr.Yolk sound palette, synthesised from nothing.
 *
 *   node tools/mryolk/make-sfx.mjs
 *
 * Same principle as `tools/make-sfx.mjs` for the other channel, and the same reason: every
 * sound is generated here, so the project owns all of them outright. No licence to track, no
 * attribution to carry into a description, and nothing that can trip a Content ID match on a
 * fourteen-minute upload. It is also fully deterministic — the noise source is a seeded xorshift
 * that is reset before every sound, so the same script always produces the same bytes and a
 * re-render can never quietly change the mix.
 *
 * The palette is chosen from what this specific video actually does: things pop in, paper
 * lands, money moves, a bank cracks, a chart falls, a toilet flushes. Sounds that no beat needs
 * are not here — an unused sound is an invitation to place it somewhere it does not belong.
 *
 * 48 kHz mono 16-bit, matching the narration master so the mix needs no resampling.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 48000;
const OUT = join('public', 'mryolk', 'sfx');
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ toolkit */

let noiseState = 0x9e3779b9;
const resetNoise = () => { noiseState = 0x9e3779b9; };
function noise() {
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  noiseState >>>= 0;
  return (noiseState / 0xffffffff) * 2 - 1;
}

const buf = (seconds) => new Float64Array(Math.ceil(seconds * SR));
const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const tri = (t, f) => 2 * Math.abs(2 * ((t * f) % 1) - 1) - 1;
const decay = (t, tau) => Math.exp(-t / tau);

/** Attack/decay with a soft edge, so nothing ever clicks on entry. */
function ad(t, dur, attack = 0.004, curve = 3) {
  if (t < attack) return t / attack;
  const p = (t - attack) / Math.max(1e-6, dur - attack);
  return p >= 1 ? 0 : (1 - p) ** curve;
}

function lowpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; }
  return x;
}

function highpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let prevIn = 0; let prevOut = 0;
  for (let i = 0; i < x.length; i++) {
    const out = a * (prevOut + x[i] - prevIn);
    prevIn = x[i]; prevOut = out; x[i] = out;
  }
  return x;
}

function bandpass(x, freq, q = 4) {
  lowpass(x, freq * (1 + 1 / (2 * q)));
  highpass(x, freq * (1 - 1 / (2 * q)));
  return x;
}

/** Normalise, then fade the last 4 ms so a file can never end on a discontinuity. */
function finish(x, peak = 0.82) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? peak / max : 0;
  const tail = Math.min(x.length, Math.round(0.004 * SR));
  for (let i = 0; i < x.length; i++) {
    let v = x[i] * g;
    const fromEnd = x.length - i;
    if (fromEnd < tail) v *= fromEnd / tail;
    x[i] = v;
  }
  return x;
}

function writeWav(name, samples) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  writeFileSync(join(OUT, `${name}.wav`), b);
  return n / SR;
}

/* ------------------------------------------------------------------- sounds */

const SOUNDS = {
  /** Something arrives. The most-used sound in the film, so it is small and dry. */
  pop() {
    const x = buf(0.14);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 780 * decay(t, 0.022) + 190;
      x[i] = sine(t, f) * ad(t, 0.14, 0.002, 4) * 0.9;
    }
    return finish(x, 0.6);
  },

  /** A lighter pop for secondary elements, so a stagger does not machine-gun. */
  tick() {
    const x = buf(0.07);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = sine(t, 1500 * decay(t, 0.012) + 420) * ad(t, 0.07, 0.001, 5);
    }
    return finish(x, 0.4);
  },

  /** Movement across the frame. */
  whoosh() {
    const x = buf(0.34);
    resetNoise();
    for (let i = 0; i < x.length; i++) x[i] = noise();
    bandpass(x, 1500, 1.4);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const swell = Math.sin((t / 0.34) * Math.PI);
      x[i] *= swell ** 1.6;
    }
    return finish(x, 0.5);
  },

  /** A realisation, an approval, a small correct thing. */
  ding() {
    const x = buf(0.7);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = (sine(t, 1320) * 0.6 + sine(t, 1980) * 0.3 + sine(t, 2640) * 0.12)
        * decay(t, 0.19) * ad(t, 0.7, 0.002, 1);
    }
    return finish(x, 0.5);
  },

  /** Money changing hands. Coin-ish, metallic, short. */
  cash() {
    const x = buf(0.42);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const chime = sine(t, 2100) * 0.5 + sine(t, 3150) * 0.35 + sine(t, 4400) * 0.2;
      const shimmer = noise() * 0.25 * decay(t, 0.05);
      x[i] = (chime + shimmer) * decay(t, 0.1) * ad(t, 0.42, 0.002, 1.2);
    }
    highpass(x, 700);
    return finish(x, 0.5);
  },

  /** A document landing on the page. */
  paper() {
    const x = buf(0.3);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = noise() * (decay(t, 0.035) + 0.35 * decay(t, 0.11)) * ad(t, 0.3, 0.001, 2);
    }
    bandpass(x, 3200, 1.1);
    return finish(x, 0.42);
  },

  /** Something stamped, approved, decided. */
  stamp() {
    const x = buf(0.24);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const thud = sine(t, 150 * decay(t, 0.02) + 62) * decay(t, 0.045);
      x[i] = (thud + noise() * 0.4 * decay(t, 0.014)) * ad(t, 0.24, 0.001, 2.4);
    }
    lowpass(x, 2600);
    return finish(x, 0.7);
  },

  /** Weight landing. The generic impact. */
  thud() {
    const x = buf(0.4);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = (sine(t, 110 * decay(t, 0.05) + 44) + noise() * 0.28 * decay(t, 0.02))
        * ad(t, 0.4, 0.001, 2.2);
    }
    lowpass(x, 1400);
    return finish(x, 0.78);
  },

  /** The bank breaking. Splintery, not explosive. */
  crack() {
    const x = buf(0.55);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      // Irregular grains rather than a smooth envelope — a crack is many small failures.
      const grain = Math.abs(noise()) > 0.72 ? 1 : 0.22;
      x[i] = noise() * grain * (decay(t, 0.06) + 0.3 * decay(t, 0.22)) * ad(t, 0.55, 0.001, 1.6);
    }
    bandpass(x, 1900, 0.9);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] += sine(t, 70 * decay(t, 0.06) + 38) * decay(t, 0.09) * 0.55;
    }
    return finish(x, 0.8);
  },

  /** A comic bounce, for a gag landing. */
  boing() {
    const x = buf(0.42);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const wobble = 240 + 150 * Math.sin(2 * Math.PI * 11 * t) * decay(t, 0.14);
      x[i] = tri(t, wobble) * decay(t, 0.11) * ad(t, 0.42, 0.003, 1.3);
    }
    lowpass(x, 3200);
    return finish(x, 0.55);
  },

  /** Something is wrong. Two flat descending tones — deadpan, not a klaxon. */
  error() {
    const x = buf(0.42);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = t < 0.16 ? 320 : 232;
      const env = t < 0.16 ? ad(t, 0.16, 0.004, 1.1) : ad(t - 0.18, 0.22, 0.004, 1.1);
      x[i] = (tri(t, f) * 0.6 + sine(t, f) * 0.4) * Math.max(0, env);
    }
    lowpass(x, 2400);
    return finish(x, 0.5);
  },

  /** Value evaporating, credit disappearing. A rising, thinning shimmer. */
  vanish() {
    const x = buf(0.7);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 600 + 2600 * (t / 0.7) ** 1.5;
      x[i] = (sine(t, f) * 0.5 + noise() * 0.2) * (1 - t / 0.7) ** 2.2 * ad(t, 0.7, 0.01, 1);
    }
    highpass(x, 900);
    return finish(x, 0.4);
  },

  /** The good version of the same idea: a small sparkle. */
  sparkle() {
    const x = buf(0.55);
    const partials = [2400, 3300, 4200, 5400];
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      let v = 0;
      partials.forEach((f, k) => { v += sine(t, f) * decay(Math.max(0, t - k * 0.035), 0.07); });
      x[i] = v * 0.25 * ad(t, 0.55, 0.002, 1);
    }
    return finish(x, 0.36);
  },

  /** The graph falling off a cliff. Descending, with a landing. */
  crash() {
    const x = buf(0.95);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const slide = 900 * (1 - t / 0.65) ** 2 + 90;
      const body = t < 0.65 ? tri(t, slide) * 0.5 : 0;
      const hit = t >= 0.6
        ? (sine(t - 0.6, 90 * decay(t - 0.6, 0.05) + 40) + noise() * 0.3 * decay(t - 0.6, 0.02))
          * decay(t - 0.6, 0.13)
        : 0;
      x[i] = (body * ad(t, 0.65, 0.01, 0.7) + hit) * 0.9;
    }
    lowpass(x, 3000);
    return finish(x, 0.82);
  },

  /** The economic toilet flush. Yes, really. Water, not a comedy sample. */
  flush() {
    const x = buf(1.5);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const swirl = 1 + 0.45 * Math.sin(2 * Math.PI * 2.3 * t);
      const gulp = t > 1.0 ? decay(t - 1.0, 0.14) * 0.7 : 0;
      const env = Math.min(1, t / 0.09) * (1 - Math.max(0, (t - 1.15) / 0.35)) ** 1.4;
      x[i] = (noise() * swirl * 0.5 + noise() * gulp) * Math.max(0, env);
    }
    bandpass(x, 1100, 0.8);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      // A descending gurgle underneath, which is what makes it read as draining away.
      x[i] += sine(t, 210 - 120 * Math.min(1, t / 1.2)) * 0.18 * Math.max(0, 1 - t / 1.35);
    }
    return finish(x, 0.62);
  },

  /** A slow swell under a building diagram. Texture, never an event. */
  swell() {
    const x = buf(1.8);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const env = Math.sin((t / 1.8) * Math.PI) ** 1.7;
      x[i] = (sine(t, 92) * 0.4 + sine(t, 138) * 0.25 + noise() * 0.1) * env;
    }
    lowpass(x, 700);
    return finish(x, 0.34);
  },
};

const made = [];
for (const [name, gen] of Object.entries(SOUNDS)) {
  const seconds = writeWav(name, gen());
  made.push({ file: `${name}.wav`, seconds: Number(seconds.toFixed(3)) });
  console.log(`  ${name}.wav`.padEnd(20), `${seconds.toFixed(3)}s`);
}
console.log(`\n${made.length} sounds → ${OUT}`);
