/**
 * CharacterSheet.tsx — a QA-only composition that lays out every pose and every
 * expression on one page.
 *
 * This is how the character library gets reviewed as a library: inconsistent limb
 * lengths, a pose that reads wrong, or an expression that disappears at small size are
 * obvious on a contact sheet and nearly invisible when checked one scene at a time.
 * Not part of the episode.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { Stage } from '../components/Stage';
import { POSES, type PoseName } from '../character/poses';
import { EXPRESSIONS, type ExpressionName } from '../character/expressions';
import { FONTS, PALETTE } from '../lib/style';

const POSE_LIST = Object.keys(POSES) as PoseName[];
const EXPR_LIST = Object.keys(EXPRESSIONS) as ExpressionName[];

const COLS = 5;
const MARGIN = 30;
const CELL_W = (1080 - MARGIN * 2) / COLS;
const CELL_H = 216;
const POSE_TOP = 88;

const EXPR_COLS = 5;
const EXPR_CELL_W = (1080 - MARGIN * 2) / EXPR_COLS;
const EXPR_CELL_H = 190;

export const CharacterSheet: React.FC = () => {
  const frame = useCurrentFrame();

  const poseRows = Math.ceil(POSE_LIST.length / COLS);
  const exprTop = POSE_TOP + poseRows * CELL_H + 70;

  return (
    <Stage>
      <>
        <text x={MARGIN} y={56} fontFamily={FONTS.display} fontSize={46} fill={PALETTE.ink}>
          NIB — POSES ({POSE_LIST.length})
        </text>

        {POSE_LIST.map((name, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x0 = MARGIN + col * CELL_W;
          const y0 = POSE_TOP + row * CELL_H;
          return (
            <g key={name}>
              <rect
                x={x0 + 4}
                y={y0 + 4}
                width={CELL_W - 8}
                height={CELL_H - 8}
                fill="none"
                stroke={PALETTE.grey}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                rx={10}
              />
              {/* hip placed so the whole 162-unit body sits inside the cell */}
              <DoodleCharacter
                pose={POSES[name]}
                expression={EXPRESSIONS.neutral}
                x={x0 + CELL_W / 2}
                y={y0 + CELL_H - 62}
                scale={0.6}
                frame={frame}
                seed={`sheet-${name}`}
              />
              <text
                x={x0 + CELL_W / 2}
                y={y0 + CELL_H - 12}
                textAnchor="middle"
                fontFamily={FONTS.hand}
                fontSize={22}
                fill={PALETTE.inkSoft}
              >
                {name}
              </text>
            </g>
          );
        })}

        <text x={MARGIN} y={exprTop - 18} fontFamily={FONTS.display} fontSize={46} fill={PALETTE.ink}>
          EXPRESSIONS ({EXPR_LIST.length})
        </text>

        <defs>
          {EXPR_LIST.map((name, i) => {
            const col = i % EXPR_COLS;
            const row = Math.floor(i / EXPR_COLS);
            const x0 = MARGIN + col * EXPR_CELL_W;
            const y0 = exprTop + row * EXPR_CELL_H;
            return (
              <clipPath key={name} id={`crop-${name}`}>
                <rect x={x0 + 6} y={y0 + 6} width={EXPR_CELL_W - 12} height={EXPR_CELL_H - 46} rx={10} />
              </clipPath>
            );
          })}
        </defs>

        {EXPR_LIST.map((name, i) => {
          const col = i % EXPR_COLS;
          const row = Math.floor(i / EXPR_COLS);
          const x0 = MARGIN + col * EXPR_CELL_W;
          const y0 = exprTop + row * EXPR_CELL_H;
          const cx = x0 + EXPR_CELL_W / 2;
          const headY = y0 + (EXPR_CELL_H - 46) / 2;
          const s = 1.25;
          return (
            <g key={name}>
              <rect
                x={x0 + 6}
                y={y0 + 6}
                width={EXPR_CELL_W - 12}
                height={EXPR_CELL_H - 46}
                fill="none"
                stroke={PALETTE.grey}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                rx={10}
              />
              <g clipPath={`url(#crop-${name})`}>
                {/* hip pushed down so the HEAD lands in the middle of the crop */}
                <DoodleCharacter
                  pose={POSES.neutral}
                  expression={EXPRESSIONS[name]}
                  x={cx}
                  y={headY + 80 * s}
                  scale={s}
                  frame={frame}
                  seed={`expr-${name}`}
                />
              </g>
              <text
                x={cx}
                y={y0 + EXPR_CELL_H - 14}
                textAnchor="middle"
                fontFamily={FONTS.hand}
                fontSize={22}
                fill={PALETTE.inkSoft}
              >
                {name}
              </text>
            </g>
          );
        })}
      </>
    </Stage>
  );
};
