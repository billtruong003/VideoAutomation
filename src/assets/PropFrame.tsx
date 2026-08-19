/**
 * PropFrame.tsx — the wrapper every V2 prop renders inside.
 *
 * Replaces V1's `DoodleProp`. The difference is subtle and important:
 *
 *   V1 wobbled the ART. Each frame nudged the drawing, and because V1 assets were
 *       hand-authored beziers, that was the only source of life they had.
 *
 *   V2 wobbles the TRANSFORM. The stylized geometry is generated once, cached, and never
 *       redrawn — so the sketch identity is frozen (no boiling lines, no per-frame
 *       flicker) while the object can still breathe by drifting a fraction of a pixel.
 *
 * That separation is what makes the whole V2 cache viable: `frame` may change 1218 times,
 * and not one of those changes touches the geometry that Rough.js was asked to draw.
 */

import React from 'react';
import { wobble } from '../lib/rand';

export type PropFrameProps = {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  /** Current frame. Drives transform-only drift; never reaches the stylizer. */
  frame?: number;
  /** Stable identity — also the Rough.js seed namespace for the art inside. */
  seed?: string;
  /** 0 pins the prop perfectly still. 1 is the house default. */
  drift?: number;
  flip?: boolean;
  children?: React.ReactNode;
};

export const PropFrame: React.FC<PropFrameProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
  opacity = 1,
  frame = 0,
  seed = 'prop',
  drift = 1,
  flip = false,
  children,
}) => {
  const dx = drift ? wobble(`${seed}:x`, frame, 0.055, 1.0 * drift) : 0;
  const dy = drift ? wobble(`${seed}:y`, frame, 0.06, 1.0 * drift) : 0;
  const dr = drift ? wobble(`${seed}:r`, frame, 0.05, 0.55 * drift) : 0;

  return (
    <g
      transform={
        `translate(${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}) ` +
        `rotate(${(rotate + dr).toFixed(3)}) ` +
        `scale(${scale * (flip ? -1 : 1)} ${scale})`
      }
      opacity={opacity}
    >
      {children}
    </g>
  );
};

/** Shared prop signature so every asset in the library is interchangeable. */
export type PropArgs = Omit<PropFrameProps, 'children'>;
