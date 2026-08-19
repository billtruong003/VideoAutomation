/**
 * rand.ts — deterministic pseudo-randomness.
 *
 * Renders MUST be reproducible: Remotion renders frames out of order and in parallel
 * workers, so `Math.random()` would make a character jitter differently on every frame
 * and every run. Everything here is a pure function of its inputs.
 */

/** Hash a string to a 32-bit unsigned int (FNV-1a). */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic [0,1) from an integer seed. */
export function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Deterministic [-1,1] from a string key. */
export function signedNoise(key: string): number {
  return rand01(hashString(key)) * 2 - 1;
}

/**
 * Smooth 1-D value noise over a continuous coordinate — the workhorse for wobble.
 * Continuous in `t`, so motion drifts instead of flickering.
 */
export function valueNoise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const a = rand01(seed + i * 1013);
  const b = rand01(seed + (i + 1) * 1013);
  // smoothstep for C1 continuity
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}

/**
 * The signature "hand-drawn" wobble: a slow drift plus a faster micro-tremor,
 * keyed by a stable string so each element wobbles its own way but always the same way.
 */
export function wobble(key: string, frame: number, speed = 0.09, amplitude = 1): number {
  const seed = hashString(key);
  const slow = valueNoise(frame * speed, seed);
  const fast = valueNoise(frame * speed * 3.1, seed + 7717) * 0.35;
  return (slow + fast) * amplitude;
}

/**
 * Quantise a frame counter so pose changes land on 2s or 3s ("on twos"), which is what
 * makes limited animation read as hand-drawn rather than as a smooth CSS tween.
 */
export function onTwos(frame: number, step = 2): number {
  return Math.floor(frame / step) * step;
}
