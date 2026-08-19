/**
 * brows.tsx — eyebrows as a closed vocabulary.
 *
 * On a face whose eyes are 3 units across, the brows do most of the acting. That makes
 * them exactly the thing that must NOT be improvised per episode: two degrees of tilt is
 * the difference between "worried" and "angry", and nobody eyeballs that consistently
 * twice.
 *
 * A brow is three numbers over one shared curve:
 *
 *   lift   how far the whole brow rides up (negative) or down (positive)
 *   tilt   degrees, positive = the INNER end (toward the nose) drops. Angry is +, worried -
 *   arch   how much the curve bows upward in the middle
 *
 * `tilt` is expressed per-brow-meaning rather than per-screen-direction, so the mirror is
 * handled once here instead of being re-derived wrongly in each state.
 */

import React from 'react';
import { quadPoints } from '../../lib/pathpoints';
import { Ink } from '../ink';
import type { BrowState } from '../types';
import type { FaceMetrics } from './metrics';

export type BrowShape = { lift: number; tilt: number; arch: number };

/** Same shape on both sides. */
const sym = (lift: number, tilt: number, arch: number): [BrowShape, BrowShape] => [
  { lift, tilt, arch },
  { lift, tilt, arch },
];

export const BROWS: Record<BrowState, [BrowShape, BrowShape]> = {
  /** Barely there. A doodle brow at rest should read as calm, not as an opinion. */
  neutral: sym(0, 0, 1.2),
  raised: sym(-7, -3, 4.2),
  /** Inner ends up. The single most useful brow in an explainer channel. */
  worried: sym(-3, -13, 2.6),
  /** Inner ends down, brow low and straight. */
  angry: sym(3, 14, -1.6),
  /** One up, one down. Reads as "I do not believe you" without any other change. */
  suspicious: [
    { lift: 3, tilt: 10, arch: -1 },
    { lift: -8, tilt: -4, arch: 3 },
  ],
  tired: sym(1.5, -6, -0.8),
  flat: sym(0, 0, 0),
  /** Generic asymmetry, opposite hand to `suspicious`, for confusion beats. */
  asym: [
    { lift: -7, tilt: -5, arch: 3 },
    { lift: 2.5, tilt: 7, arch: -0.5 },
  ],
};

export const Brow: React.FC<{
  state: BrowState;
  m: FaceMetrics;
  side: 'L' | 'R';
  color: string;
  seed: string;
}> = ({ state, m, side, color, seed }) => {
  const shape = BROWS[state][side === 'L' ? 0 : 1];
  const mirror = side === 'L' ? 1 : -1;
  const x = side === 'L' ? -m.eyeX : m.eyeX;
  const w = m.browHalfW;

  return (
    <g transform={`translate(${x} ${(m.browY + shape.lift).toFixed(2)}) rotate(${(shape.tilt * mirror).toFixed(2)})`}>
      <Ink
        pts={quadPoints([-w, 0], [0, -shape.arch * 2], [w, 0], 10)}
        pen="face"
        size={4.2}
        color={color}
        seed={`${seed}:brow`}
      />
    </g>
  );
};
