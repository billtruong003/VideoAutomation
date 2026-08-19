/**
 * BackgroundSheet.tsx — QA-only: all six reusable backgrounds, scaled down onto one page.
 *
 * Backgrounds have to be checked as a SET, because their job is relative: the enclosed
 * traditional floor only works if it reads as the opposite of the modern casino. Judged
 * one at a time, that contrast is impossible to see. Not part of the episode.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage } from '../components/Stage';
import { FONTS, PALETTE } from '../lib/style';
import * as BG from '../backgrounds';

const LIST: { name: string; el: (f: number) => React.ReactNode }[] = [
  { name: 'CasinoEntrance', el: (f) => <BG.CasinoEntrance frame={f} /> },
  { name: 'TraditionalFloor', el: (f) => <BG.TraditionalFloor frame={f} /> },
  { name: 'SlotArea (lit)', el: (f) => <BG.SlotArea frame={f} lit /> },
  { name: 'TimeDistortionVoid', el: (f) => <BG.TimeDistortionVoid frame={f} intensity={0.85} /> },
  { name: 'ModernCasino', el: (f) => <BG.ModernCasino frame={f} /> },
  { name: 'OutsideWorld', el: (f) => <BG.OutsideWorld frame={f} /> },
];

const COLS = 3;
const THUMB_W = 1080 / COLS - 24;
const THUMB_H = THUMB_W * (1920 / 1080);
const SCALE = THUMB_W / 1080;

export const BackgroundSheet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <>
        <text x={24} y={54} fontFamily={FONTS.display} fontSize={44} fill={PALETTE.ink}>
          BACKGROUNDS ({LIST.length})
        </text>
        {LIST.map((b, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x0 = 18 + col * (THUMB_W + 18);
          const y0 = 80 + row * (THUMB_H + 56);
          return (
            <g key={b.name}>
              <clipPath id={`bgclip-${i}`}>
                <rect x={x0} y={y0} width={THUMB_W} height={THUMB_H} rx={8} />
              </clipPath>
              <rect x={x0} y={y0} width={THUMB_W} height={THUMB_H} fill={PALETTE.paper} rx={8} />
              <g clipPath={`url(#bgclip-${i})`}>
                <g transform={`translate(${x0} ${y0}) scale(${SCALE})`}>{b.el(frame)}</g>
              </g>
              <rect
                x={x0}
                y={y0}
                width={THUMB_W}
                height={THUMB_H}
                fill="none"
                stroke={PALETTE.inkSoft}
                strokeWidth={2}
                rx={8}
              />
              <text
                x={x0 + THUMB_W / 2}
                y={y0 + THUMB_H + 30}
                textAnchor="middle"
                fontFamily={FONTS.hand}
                fontSize={24}
                fill={PALETTE.inkSoft}
              >
                {b.name}
              </text>
            </g>
          );
        })}
      </>
    </Stage>
  );
};
