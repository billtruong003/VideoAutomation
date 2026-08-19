/**
 * HandDrawnWobble.tsx — the "someone is redrawing this every frame" shimmer.
 *
 * Wraps any group in a restrained deterministic drift. Restraint is the whole point:
 * above about ±1.5 degrees it stops reading as hand-drawn and starts reading as broken.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { wobble, onTwos } from '../lib/rand';

export const HandDrawnWobble: React.FC<{
  frame: number;
  seed?: string;
  /** Multiplies all three channels. 1 is the house default. */
  amount?: number;
  /**
   * Quantise the wobble so it only updates every N frames, matching the character's
   * pose steps. 1 = smooth drift, 2–3 = boiling line.
   */
  step?: number;
  children: React.ReactNode;
}> = ({ frame, seed = 'wob', amount = 1, step = 2, children }) => {
  const f = onTwos(frame, step);
  const rot = wobble(`${seed}:r`, f, 0.08, 0.9 * amount);
  const dx = wobble(`${seed}:x`, f, 0.07, 1.2 * amount);
  const dy = wobble(`${seed}:y`, f, 0.075, 1.2 * amount);
  const s = 1 + wobble(`${seed}:s`, f, 0.05, 0.006 * amount);

  return <g transform={`translate(${dx} ${dy}) rotate(${rot}) scale(${s})`}>{children}</g>;
};
