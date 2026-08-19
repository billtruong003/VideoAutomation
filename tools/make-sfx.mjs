#!/usr/bin/env node
/**
 * make-sfx.mjs — synthesises the episode's sound effects from scratch.
 *
 *   node tools/make-sfx.mjs
 *
 * Every sound is generated procedurally here rather than sourced from a library, which
 * means the project owns them outright: no licence to track, no attribution to carry,
 * and no risk of a Content ID match. It is also fully deterministic — same script, same
 * bytes — so a re-render never changes the mix.
 *
 * Writes 48 kHz mono 16-bit WAVs to public/sfx/. Episode-agnostic: future episodes reuse
 * the same palette and add to it.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 48000;
const OUT = 'public/sfx';
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// tiny synth toolkit
// ---------------------------------------------------------------------------

/** Deterministic noise — never Math.random(). */
let noiseState = 0x2f6e2b1;
function noise() {
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  noiseState >>>= 0;
  return (noiseState / 0xffffffff) * 2 - 1;
}
const resetNoise = () => { noiseState = 0x2f6e2b1; };

const buf = (seconds) => new Float64Array(Math.ceil(seconds * SR));

/** Exponential decay envelope. */
const decay = (t, tau) => Math.exp(-t / tau);

/** Attack/decay envelope with a soft edge, so nothing clicks on entry. */
function ad(t, dur, attack = 0.004, curve = 3) {
  if (t < attack) return t / attack;
  const p = (t - attack) / Math.max(1e-6, dur - attack);
  return p >= 1 ? 0 : Math.pow(1 - p, curve);
}

/** One-pole low-pass, applied in place. */
function lowpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = (1 - a) * x[i] + a * y;
    x[i] = y;
  }
  return x;
}

/** One-pole high-pass, applied in place. */
function highpass(x, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let prevIn = 0, prevOut = 0;
  for (let i = 0; i < x.length; i++) {
    const out = a * (prevOut + x[i] - prevIn);
    prevIn = x[i];
    prevOut = out;
    x[i] = out;
  }
  return x;
}

/** Resonant band emphasis via a simple 2-pole. */
function bandpass(x, freq, q = 4) {
  const w = (2 * Math.PI * freq) / SR;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w), a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i];
    const yn = (b0 / a0) * xn + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = xn; y2 = y1; y1 = yn;
    x[i] = yn;
  }
  return x;
}

/** Normalise to a peak, then apply a gentle soft-clip so nothing ever hits full scale. */
function finish(x, peak = 0.85) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  if (max === 0) return x;
  const g = peak / max;
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * g * 1.1) * 0.92;
  // 3 ms fades at both ends kill any edge click
  const f = Math.round(SR * 0.003);
  for (let i = 0; i < f && i < x.length; i++) {
    x[i] *= i / f;
    x[x.length - 1 - i] *= i / f;
  }
  return x;
}

function writeWav(name, samples) {
  const n = samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(`${OUT}/${name}.wav`, b);
  return (n / SR).toFixed(3);
}

const sine = (t, f) => Math.sin(2 * Math.PI * f * t);
const square = (t, f) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);
const saw = (t, f) => 2 * ((t * f) % 1) - 1;

// ---------------------------------------------------------------------------
// the sound palette
// ---------------------------------------------------------------------------

const SOUNDS = {
  /** Dry clock tick. Used sparingly — a ticking clock under narration is exhausting. */
  tick() {
    const x = buf(0.09);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = noise() * decay(t, 0.004) * 0.9 + sine(t, 2100) * decay(t, 0.012) * 0.5;
    }
    return finish(highpass(x, 900), 0.55);
  },

  /** Generic transition whoosh. */
  whoosh() {
    const x = buf(0.34);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = noise() * Math.sin(Math.PI * Math.min(1, t / 0.34)) ** 1.6;
    }
    bandpass(x, 1400, 1.1);
    return finish(x, 0.6);
  },

  /** Something yanked off-screen fast: a whoosh with a downward pitch tail. */
  clockPull() {
    const x = buf(0.42);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 1200 * Math.exp(-t * 5.5) + 120;
      x[i] = noise() * ad(t, 0.42, 0.006, 2.2) * 0.6 + saw(t, f) * ad(t, 0.36, 0.01, 3) * 0.45;
    }
    return finish(lowpass(x, 4200), 0.72);
  },

  /** Prop appears. Short, bright, cartoon. */
  pop() {
    const x = buf(0.13);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 180 + 900 * Math.exp(-t * 42);
      x[i] = sine(t, f) * ad(t, 0.13, 0.002, 2.4);
    }
    return finish(x, 0.62);
  },

  /** Prop vanishes — the pop played in reverse motion (pitch rises, then cuts). */
  vanish() {
    const x = buf(0.16);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 300 + 1500 * (t / 0.16);
      x[i] = sine(t, f) * ad(t, 0.16, 0.003, 1.6) * 0.8 + noise() * decay(t, 0.02) * 0.25;
    }
    return finish(x, 0.55);
  },

  /** Slot machine button/confirm blip. */
  slotBeep() {
    const x = buf(0.26);
    const notes = [660, 880, 1320];
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const step = Math.min(2, Math.floor(t / 0.075));
      const local = t - step * 0.075;
      x[i] = square(t, notes[step]) * ad(local, 0.075, 0.004, 2.5) * 0.5;
    }
    return finish(lowpass(x, 5000), 0.5);
  },

  /** Chips landing on felt. */
  chipClack() {
    const x = buf(0.2);
    resetNoise();
    for (const onset of [0, 0.045, 0.098]) {
      for (let i = Math.round(onset * SR); i < x.length; i++) {
        const t = i / SR - onset;
        x[i] += noise() * decay(t, 0.006) * 0.8 + sine(t, 480 + onset * 900) * decay(t, 0.016) * 0.4;
      }
    }
    return finish(bandpass(x, 1800, 1.6), 0.5);
  },

  /** Hands whipping around a clock face — an accelerating tick train. */
  clockSpin() {
    const x = buf(1.3);
    resetNoise();
    let t = 0;
    let gap = 0.075;
    while (t < 1.15) {
      const start = Math.round(t * SR);
      for (let i = start; i < Math.min(x.length, start + SR * 0.05); i++) {
        const lt = (i - start) / SR;
        x[i] += (noise() * decay(lt, 0.003) * 0.7 + sine(lt, 2600) * decay(lt, 0.008) * 0.4)
          * (1 - t / 1.5);
      }
      t += gap;
      gap = Math.max(0.014, gap * 0.86);
    }
    return finish(highpass(x, 800), 0.5);
  },

  /** Banknotes/receipts fluttering away. */
  moneyFlutter() {
    const x = buf(0.75);
    resetNoise();
    for (const onset of [0, 0.09, 0.19, 0.3, 0.41, 0.53]) {
      for (let i = Math.round(onset * SR); i < Math.min(x.length, Math.round((onset + 0.14) * SR)); i++) {
        const t = i / SR - onset;
        x[i] += noise() * ad(t, 0.14, 0.008, 2) * 0.6;
      }
    }
    return finish(bandpass(x, 2600, 1.1), 0.42);
  },

  /** The record scratch. Marks the hard interruption before "BUT...". */
  recordScratch() {
    const x = buf(0.42);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      // pitch swoops down then briefly back up, like a hand dragging a platter
      const f = 700 * Math.exp(-t * 6) + 90 + 200 * Math.max(0, Math.sin(t * 14));
      x[i] = saw(t, f) * ad(t, 0.42, 0.005, 1.8) * 0.55 + noise() * ad(t, 0.4, 0.01, 2) * 0.5;
    }
    return finish(bandpass(x, 900, 0.9), 0.7);
  },

  /** Heavy hit for reveals and camera punches. */
  impact() {
    const x = buf(0.42);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = 150 * Math.exp(-t * 12) + 48;
      x[i] = sine(t, f) * decay(t, 0.13) * 0.95 + noise() * decay(t, 0.012) * 0.5;
    }
    return finish(lowpass(x, 2600), 0.85);
  },

  /** Small bright sting for a positive reveal (the modern-casino daylight). */
  revealSting() {
    const x = buf(0.75);
    const notes = [523, 659, 784, 1047];
    for (let n = 0; n < notes.length; n++) {
      const onset = n * 0.062;
      for (let i = Math.round(onset * SR); i < x.length; i++) {
        const t = i / SR - onset;
        x[i] += (sine(t, notes[n]) * 0.6 + sine(t, notes[n] * 2) * 0.22) * decay(t, 0.24) * 0.5;
      }
    }
    return finish(x, 0.45);
  },

  /** Rising unease as distractions swarm. */
  swarm() {
    const x = buf(1.8);
    resetNoise();
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const grow = Math.min(1, t / 1.5);
      const f = 200 + 90 * Math.sin(t * 3.1);
      x[i] =
        (saw(t, f) * 0.25 + square(t, f * 1.5) * 0.12 + noise() * 0.1) *
        grow * ad(t, 1.8, 0.25, 1.4);
    }
    return finish(lowpass(x, 2200), 0.4);
  },

  /** Flat fluorescent drone — the sound of an environment that never changes. */
  lightHum() {
    const x = buf(2.4);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = (sine(t, 100) * 0.5 + sine(t, 200) * 0.22 + sine(t, 301) * 0.1) * 0.5;
    }
    return finish(lowpass(x, 900), 0.22);
  },

  /** Tiny UI-ish blip for a small notice/double-take. */
  blip() {
    const x = buf(0.11);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = sine(t, 1400) * ad(t, 0.11, 0.003, 3);
    }
    return finish(x, 0.4);
  },
};

// ---------------------------------------------------------------------------

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

console.log('synthesising SFX ->', OUT);
const made = [];
for (const [name, gen] of Object.entries(SOUNDS)) {
  const file = kebab(name);
  const dur = writeWav(file, gen());
  made.push({ file: `${file}.wav`, seconds: Number(dur) });
  console.log(`  ${file}.wav`.padEnd(26), `${dur}s`);
}
console.log(`\n${made.length} sounds written. All procedurally generated — original work, no third-party audio.`);
