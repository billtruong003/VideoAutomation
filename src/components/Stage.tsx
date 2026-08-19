/**
 * Stage.tsx — the drawing surface every scene renders into.
 *
 * Gives each scene one consistent 1080x1920 SVG coordinate space sitting on the paper,
 * so scene code can use absolute pixel coordinates and reason about the Shorts safe
 * zones directly. Layered as absolute fills: paper first, ink on top.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PaperTexture } from './Paper';
import { VIDEO } from '../lib/style';

export const Stage: React.FC<{
  children: React.ReactNode;
  tint?: string;
  grain?: number;
  /** Rendered between the paper and the main SVG (background art). */
  behind?: React.ReactNode;
}> = ({ children, tint, grain, behind }) => (
  <AbsoluteFill>
    <PaperTexture tint={tint} grain={grain} />
    {behind}
    <AbsoluteFill>
      <svg
        width={VIDEO.width}
        height={VIDEO.height}
        viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}
        style={{ display: 'block' }}
      >
        {children}
      </svg>
    </AbsoluteFill>
  </AbsoluteFill>
);
