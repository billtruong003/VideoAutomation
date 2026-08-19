/**
 * DoodleProp.tsx — the wrapper every prop in the library renders inside.
 *
 * Gives all props one identical contract (place, scale, rotate, fade) plus the same
 * deterministic hand-drawn wobble the character has, so a clock and a person drawn in
 * the same shot look like they came from the same pen. Prop art itself stays a pure
 * function of nothing — no per-prop animation state — which keeps the library reusable.
 */

import React from 'react';
import { wobble } from '../lib/rand';

export type DoodlePropProps = {
  /** Where the prop's local origin lands in stage coordinates. */
  x?: number;
  y?: number;
  scale?: number;
  /** Degrees. */
  rotate?: number;
  opacity?: number;
  /** Current frame — drives wobble. Omit for a dead-still prop. */
  frame?: number;
  /** Stable identity for the wobble. */
  seed?: string;
  /** 0 disables the wobble entirely (backgrounds usually want this). */
  wobbleAmount?: number;
  flip?: boolean;
  children: React.ReactNode;
};

export const DoodleProp: React.FC<DoodlePropProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
  opacity = 1,
  frame = 0,
  seed = 'prop',
  wobbleAmount = 1,
  flip = false,
  children,
}) => {
  const rot = rotate + wobble(`${seed}:rot`, frame, 0.07, 0.8 * wobbleAmount);
  const dx = wobble(`${seed}:x`, frame, 0.06, 1.1 * wobbleAmount);
  const dy = wobble(`${seed}:y`, frame, 0.065, 1.1 * wobbleAmount);

  return (
    <g
      transform={`translate(${x + dx} ${y + dy}) rotate(${rot}) scale(${scale * (flip ? -1 : 1)} ${scale})`}
      opacity={opacity}
    >
      {children}
    </g>
  );
};
