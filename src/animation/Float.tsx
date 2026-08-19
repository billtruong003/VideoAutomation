/**
 * Float.tsx — gentle drift for things that hang, hover, or slowly escape.
 *
 * Used for the wallet quietly floating away behind the protagonist in the final scene,
 * and for anything that should feel weightless rather than placed.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { wobble } from '../lib/rand';

export function useFloat(
  frame: number,
  { amp = 6, speed = 0.05, seed = 'float', rotateAmp = 3 } = {},
): { x: number; y: number; rotate: number } {
  return {
    x: wobble(`${seed}:fx`, frame, speed, amp),
    y: wobble(`${seed}:fy`, frame, speed * 1.3, amp),
    rotate: wobble(`${seed}:fr`, frame, speed * 0.8, rotateAmp),
  };
}

export const Float: React.FC<{
  frame: number;
  amp?: number;
  speed?: number;
  seed?: string;
  rotateAmp?: number;
  children: React.ReactNode;
}> = ({ frame, children, ...opts }) => {
  const { x, y, rotate } = useFloat(frame, opts);
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`}>{children}</g>;
};
