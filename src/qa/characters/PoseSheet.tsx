/**
 * PoseSheet.tsx — the pose library reviewed as a library.
 *
 * Inconsistent limb lengths, a pose that reads wrong, an arm that disappears into the
 * shirt: all of these are obvious on a contact sheet and nearly invisible when checked
 * one scene at a time. That is the entire argument for this file existing.
 *
 * Every figure holds a NEUTRAL face on purpose. The pose has to carry its meaning with no
 * help from the expression, or it is not really a pose — it is an illustration of one
 * particular moment, and it will not survive being reused in Episode 007.
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
  fitScale,
  fullBodyHipY,
  grid,
} from './layout';

const COLS = 5;
const TOP = 128;

export const PoseSheet: React.FC<{ character?: CharacterId }> = ({ character = 'bill' }) => {
  const frame = useCurrentFrame();
  const c = CHARACTERS[character];
  const names = c.corePoses;
  const rows = Math.ceil(names.length / COLS);
  const cellH = Math.min(288, Math.floor((1878 - TOP) / rows));
  const cells = grid(names.length, COLS, TOP, cellH);
  const cellW = (SHEET_W - MARGIN * 2) / COLS;
  /* -56, not -30: the label strip is part of the cell and figures were landing on it. */
  const scale = fitScale(c, cellH - 56);
  /*
   * Each character's OWN resting face, not the literal name "neutral".
   *
   * Hard-coding "neutral" crashed the sheet on Dex, whose resting face is `neutralGrin` —
   * caught by `resolveExpression` throwing rather than silently substituting, which is
   * exactly why it throws.
   */
  const restingFace = c.defaultExpression;

  return (
    <SheetStage>
      <>
        <SheetTitle
          text={`${c.name.toUpperCase()} — POSES (${names.length})`}
          sub="neutral face throughout: a pose must read without help from the expression."
        />

        {cells.map(({ i, x, y, cx }) => {
          const name = names[i];
          return (
            <g key={name}>
              <CellFrame x={x} y={y} w={cellW} h={cellH} />
              <DoodleCharacter
                character={character}
                pose={name}
                expression={restingFace}
                x={cx}
                y={fullBodyHipY(c, y + (cellH - 34) / 2, scale)}
                scale={scale}
                frame={frame}
                seed={`sheet-p-${character}-${name}`}
                blink={false}
                gaze="center"
                wobbleAmount={0}
              />
              <CellLabel x={cx} y={y + cellH - 10} text={name} size={19} />
            </g>
          );
        })}
      </>
    </SheetStage>
  );
};
