/**
 * ImpactLines.tsx — the burst that punctuates a reveal.
 *
 * The animated counterpart to the static `AttentionLines` mark: lines shoot outward,
 * then vanish. Short by design — 8 to 12 frames. A burst that lingers stops being an
 * impact and becomes decoration.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { interpolate } from 'remotion';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { rand01, hashString } from '../lib/rand';

export const ImpactLines: React.FC<{
  frame: number;
  /** Scene-relative frame the burst fires. */
  at: number;
  x?: number;
  y?: number;
  count?: number;
  /** Where lines start, in stage px from the centre. */
  innerRadius?: number;
  /** How far they travel. */
  reach?: number;
  duration?: number;
  color?: string;
  seed?: string;
  strokeWidth?: number;
}> = ({
  frame,
  at,
  x = 0,
  y = 0,
  count = 12,
  innerRadius = 70,
  reach = 90,
  duration = 10,
  color = PALETTE.ink,
  seed = 'impact',
  strokeWidth = STROKE.prop,
}) => {
  const t = frame - at;
  if (t < 0 || t > duration) return null;

  const p = t / duration;
  const grow = interpolate(p, [0, 0.45, 1], [0.2, 1, 1.25], { extrapolateRight: 'clamp' });
  const fade = interpolate(p, [0, 0.5, 1], [1, 1, 0], { extrapolateRight: 'clamp' });

  const lines = [];
  for (let i = 0; i < count; i++) {
    const h = hashString(`${seed}:${i}`);
    // uneven angular spacing — a perfectly even burst looks like a machine part
    const a = ((i + rand01(h) * 0.55 - 0.275) / count) * Math.PI * 2;
    const r0 = innerRadius * grow * (0.85 + rand01(h + 7) * 0.3);
    const r1 = r0 + reach * grow * (0.6 + rand01(h + 21) * 0.7);
    lines.push(
      <path
        key={i}
        d={`M ${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} L ${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}`}
        stroke={color}
        strokeWidth={strokeWidth * (0.7 + rand01(h + 41) * 0.7)}
        {...HAND_STROKE}
      />,
    );
  }

  return (
    <g transform={`translate(${x} ${y})`} opacity={fade}>
      {lines}
    </g>
  );
};
