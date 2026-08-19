/**
 * GagCard.tsx — the big hand-lettered impact text.
 *
 * Distinct from captions: captions transcribe, gag cards PUNCH. There are only five in
 * the whole episode (CLOCK?, 20 MINUTES, 2 HOURS?!, BUT…, NOT BANNED) and that scarcity
 * is what makes them land.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { spring, useVideoConfig } from 'remotion';
import { PALETTE, FONTS } from '../lib/style';
import { wobble } from '../lib/rand';

export const GagCard: React.FC<{
  frame: number;
  /** Scene-relative frame it slams in. */
  at: number;
  /** Scene-relative frame it leaves. Omit to hold to the end of the scene. */
  until?: number;
  text: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  /** Degrees of permanent jaunty tilt. */
  tilt?: number;
  /** Draw a rough hand-drawn box around it. */
  boxed?: boolean;
  seed?: string;
}> = ({
  frame,
  at,
  until,
  text,
  x,
  y,
  size = 150,
  color = PALETTE.coral,
  tilt = -4,
  boxed = false,
  seed = 'gag',
}) => {
  const { fps } = useVideoConfig();
  if (frame < at) return null;

  const s = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  let out = 1;
  if (until !== undefined && frame >= until) out = Math.max(0, 1 - (frame - until) / 5);
  if (out <= 0) return null;

  const scale = s * out;
  const jitter = wobble(`${seed}:j`, frame, 0.16, 1.4);
  const width = text.length * size * 0.46;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${tilt + jitter}) scale(${scale})`}
      opacity={Math.min(1, s * 2) * out}
    >
      {boxed && (
        <path
          d={
            `M ${-width / 2 - 26} ${-size * 0.66} L ${width / 2 + 22} ${-size * 0.72} ` +
            `L ${width / 2 + 28} ${size * 0.44} L ${-width / 2 - 20} ${size * 0.5} Z`
          }
          fill={PALETTE.paper}
          stroke={PALETTE.ink}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      )}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={FONTS.display}
        fontSize={size}
        fill={color}
        stroke={PALETTE.ink}
        strokeWidth={size * 0.085}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  );
};
