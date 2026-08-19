/**
 * ExpressionSheet.tsx — the mandatory face QA artifact.
 *
 * Every cell is the SAME head: same silhouette, same hair, same glasses geometry, same
 * face coordinate system, same scale, same framing maths. The only thing that differs
 * between cells is the expression record. That is what makes this sheet a real test —
 * if two cells look like different people, the bug is structural and the sheet has found
 * it, because nothing in an expression is allowed to move a feature.
 *
 * What to reject, from §54 of the character brief: creepy, malformed, grotesque,
 * unintentionally angry, unintentionally sad, visually noisy, unreadable, or inconsistent
 * with the same character. "It is a doodle" is not a defence. Simple can still be ugly.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { CHARACTERS } from '../../character/registry';
import type { CharacterId } from '../../character/types';
import {
  CellFrame,
  CellLabel,
  MARGIN,
  SHEET_W,
  SheetStage,
  SheetTitle,
  grid,
  headHipY,
  headScale,
} from './layout';

const COLS = 4;
const TOP = 132;
const CELL_H = 292;

export const ExpressionSheet: React.FC<{ character?: CharacterId }> = ({ character = 'bill' }) => {
  const frame = useCurrentFrame();
  const c = CHARACTERS[character];
  const names = c.coreExpressions;
  const cells = grid(names.length, COLS, TOP, CELL_H);
  const cellW = (SHEET_W - MARGIN * 2) / COLS;
  const cropH = CELL_H - 44;
  const scale = headScale(c, cropH, 40);
  /* A head close-up wants the calmest body available, not the character's default stance. */
  const pose = c.kind === 'creature' ? 'sit' : 'neutral';

  return (
    <SheetStage>
      <>
        <SheetTitle
          text={`${c.name.toUpperCase()} — EXPRESSIONS (${names.length})`}
          sub="same head, same metrics, same vocabularies. only the expression changes."
        />

        <defs>
          {cells.map(({ i, x, y }) => (
            <clipPath key={names[i]} id={`x-${character}-${names[i]}`}>
              <rect x={x + 6} y={y + 6} width={cellW - 12} height={cropH} rx={10} />
            </clipPath>
          ))}
        </defs>

        {cells.map(({ i, x, y, cx }) => {
          const name = names[i];
          const cy = y + 6 + cropH / 2;
          return (
            <g key={name}>
              <CellFrame x={x} y={y} w={cellW} h={CELL_H} />
              <g clipPath={`url(#x-${character}-${name})`}>
                <DoodleCharacter
                  character={character}
                  pose={pose}
                  expression={name}
                  x={cx}
                  y={headHipY(c, cy, scale)}
                  scale={scale}
                  frame={frame}
                  seed={`sheet-x-${character}-${name}`}
                  blink={false}
                  wobbleAmount={0}
                />
              </g>
              <CellLabel x={cx} y={y + CELL_H - 14} text={name} />
            </g>
          );
        })}
      </>
    </SheetStage>
  );
};
