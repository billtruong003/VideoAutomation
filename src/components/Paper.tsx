/**
 * Paper.tsx — the notebook surface every episode is drawn on.
 *
 * A flat colour fill reads as "app screen". A little grain and an uneven vignette read
 * as "someone's notebook", which is the whole premise of the channel. The turbulence
 * seed is fixed so the grain is identical on every frame and every render — a moving
 * grain would look like video noise, not paper.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PALETTE } from '../lib/style';

export const PaperTexture: React.FC<{ tint?: string; grain?: number }> = ({
  tint = PALETTE.paper,
  grain = 0.16,
}) => (
  <AbsoluteFill style={{ backgroundColor: tint }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="g" />
        </filter>
        <radialGradient id="paper-vignette" cx="48%" cy="42%" r="78%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3A3226" stopOpacity="0.17" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" filter="url(#paper-grain)" opacity={grain} />
      <rect width="100%" height="100%" fill="url(#paper-vignette)" />
    </svg>
  </AbsoluteFill>
);
