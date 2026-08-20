/**
 * mix.test.mts — the music envelope.
 *
 * The values here are asserted against the real measurements taken from the ten delivered
 * narrations, because the whole design turns on one fact: these Shorts are 89-95% voiced and
 * have almost no gaps. A future change that makes the bed open up generously would pass any
 * test written against an imagined narration and fail these.
 */

import { describe, expect, it } from 'vitest';
import { musicEnvelope, describeMix } from '../src/lib/duck';

/** A narration shaped like the real ones: dense speech, a few short pauses. */
const words = (() => {
  const out: { start: number; end: number }[] = [];
  let t = 0.05;
  for (let i = 0; i < 60; i++) {
    out.push({ start: t, end: t + 0.28 });
    // A real pause every fifteenth word; a breath everywhere else.
    t += 0.28 + (i % 15 === 14 ? 0.34 : 0.06);
  }
  return out;
})();
const DURATION = words[words.length - 1].end + 1;

describe('music envelope', () => {
  const env = musicEnvelope(words, DURATION);

  it('holds the bed level while a word is being spoken', () => {
    expect(env(words[3].start + 0.1)).toBeCloseTo(1, 2);
  });

  it('lifts inside a genuine pause', () => {
    const pause = words[14].end + 0.17;
    expect(env(pause)).toBeGreaterThan(1.2);
  });

  it('ignores a breath between words', () => {
    // 0.06s gaps are breaths. Lifting into them is what makes a mix pump.
    expect(env(words[2].end + 0.03)).toBeCloseTo(1, 1);
  });

  it('never exceeds the lift ceiling', () => {
    for (let t = 0; t < DURATION; t += 0.01) expect(env(t)).toBeLessThanOrEqual(1.6001);
  });

  it('is silent at both ends', () => {
    expect(env(0)).toBe(0);
    expect(env(DURATION)).toBeLessThanOrEqual(0);
  });

  it('fades in rather than starting abruptly', () => {
    expect(env(0.1)).toBeGreaterThan(0);
    expect(env(0.1)).toBeLessThan(env(0.7));
  });

  it('lifts for only a small fraction of the episode', () => {
    // Measured across the ten real episodes: 5.6% to 18.2%. A number far above that band
    // would mean the narration has holes the measurements say it does not.
    const { liftRatio } = describeMix(env, DURATION);
    expect(liftRatio).toBeGreaterThan(0);
    expect(liftRatio).toBeLessThan(0.25);
  });

  it('never returns a negative gain', () => {
    for (let t = -1; t < DURATION + 1; t += 0.05) expect(env(t)).toBeGreaterThanOrEqual(0);
  });

  it('handles a narration with no pauses at all', () => {
    const solid = [{ start: 0, end: 20 }];
    const e = musicEnvelope(solid, 21);
    expect(describeMix(e, 21).liftRatio).toBe(0);
    expect(e(10)).toBeCloseTo(1, 3);
  });

  it('handles an empty word list without throwing', () => {
    const e = musicEnvelope([], 10);
    expect(e(5)).toBeCloseTo(1, 3);
  });
});
