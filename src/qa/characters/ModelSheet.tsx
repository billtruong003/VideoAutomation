/**
 * ModelSheet.tsx — Bill's construction sheet.
 *
 * ON VIEWS, stated plainly because it is a real limitation and not an oversight:
 *
 * This rig is FRONT-FACING ONLY. There is no z-axis, no turnaround and no true profile.
 * `facing` shifts the features off-centre and swings the parting, which sells a head turn
 * in a 40-second Short and cannot break, because nothing actually rotates. A real
 * three-quarter would need a second set of head geometry, a second hair path and a second
 * glasses shape per character — five characters' worth of drift risk to buy an angle this
 * channel's shot language does not use.
 *
 * So: front and two cheated three-quarters, and consistency is chosen over fake rotation.
 * If a future episode genuinely needs a profile, it is a deliberate project, not a prop.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { CHARACTERS, FACE_METRICS } from '../../character/registry';
import { FONTS, PALETTE } from '../../lib/style';
import type { Facing } from '../../character/types';
import {
  CellFrame,
  CellLabel,
  MARGIN,
  SHEET_W,
  SheetStage,
  SheetTitle,
  fitScale,
  fullBodyHipY,
  headHipY,
  headScale,
} from './layout';

type Cell = {
  label: string;
  pose: string;
  expression: string;
  facing?: Facing;
  accessories?: string[];
  silhouette?: boolean;
};

const ROWS: [string, Cell[]][] = [
  [
    'views — front and two cheated three-quarters',
    [
      { label: 'front', pose: 'neutral', expression: 'neutral', facing: 'front' },
      { label: '3/4 left', pose: 'lookLeft', expression: 'neutral', facing: 'left34' },
      { label: '3/4 right', pose: 'lookRight', expression: 'neutral', facing: 'right34' },
    ],
  ],
  [
    'core attitudes',
    [
      { label: 'seated', pose: 'sitting', expression: 'neutral' },
      { label: 'walk', pose: 'walkA', expression: 'neutral' },
      { label: 'thinking', pose: 'thinking', expression: 'focused' },
    ],
  ],
  [
    'costume overlays are additive — the canonical Bill is still underneath',
    [
      { label: 'hard hat', pose: 'standAlert', expression: 'neutral', accessories: ['hardHat'] },
      { label: 'tie', pose: 'explaining', expression: 'smug', accessories: ['tie'] },
      { label: 'silhouette', pose: 'neutral', expression: 'neutral', silhouette: true },
    ],
  ],
];

const ROW_H = 470;
const TOP = 150;

export const ModelSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const c = CHARACTERS.bill;
  const b = c.kind === 'humanoid' ? c.build : null;
  const g = FACE_METRICS.bill.glasses;
  const cellW = (SHEET_W - MARGIN * 2) / 3;
  const bodyScale = fitScale(c, ROW_H - 62);

  return (
    <SheetStage>
      <>
        <SheetTitle
          text="BILL — MODEL SHEET"
          sub="the rig is front-facing. 3/4 is a feature shift, not a rotation — consistency over fake perspective."
        />

        {ROWS.map(([caption, cells], r) => {
          const y = TOP + r * ROW_H;
          return (
            <g key={caption}>
              <text x={MARGIN} y={y - 12} fontFamily={FONTS.hand} fontSize={22} fill={PALETTE.inkSoft}>
                {caption}
              </text>
              {cells.map((cell, i) => {
                const x = MARGIN + i * cellW;
                const cx = x + cellW / 2;
                return (
                  <g key={cell.label}>
                    <CellFrame x={x} y={y} w={cellW} h={ROW_H - 30} />
                    <DoodleCharacter
                      character="bill"
                      pose={cell.pose}
                      expression={cell.expression}
                      facing={cell.facing}
                      accessories={cell.accessories}
                      silhouette={cell.silhouette}
                      x={cx}
                      y={fullBodyHipY(c, y + (ROW_H - 70) / 2, bodyScale)}
                      scale={bodyScale}
                      frame={frame}
                      seed={`model-${cell.label}`}
                      blink={false}
                      gaze="center"
                      wobbleAmount={0}
                    />
                    <CellLabel x={cx} y={y + ROW_H - 46} text={cell.label} size={23} />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* construction facts, so a future agent can check the drawing against the numbers */}
        {b && (
          <g>
            <text x={MARGIN} y={TOP + 3 * ROW_H + 34} fontFamily={FONTS.display} fontSize={36} fill={PALETTE.ink}>
              CONSTRUCTION
            </text>
            {[
              `head ${b.headHW * 2} x ${b.headHH * 2} units — ${Math.round(((b.headHH * 2) / b.height) * 100)}% of a ${b.height}-unit character`,
              `rounded square, corner radius ${b.headR}, wider than tall`,
              `shoulders on the torso edge at x=${b.shoulderX}; torso spans y ${b.torsoTop} to ${b.torsoBottom}`,
              `shorts y ${b.pantsTop} to ${b.pantsBottom}; feet rest at y=${b.groundY}`,
              g ? `glasses ${g.w}x${g.h} at (±${g.cx}, ${g.cy > 0 ? '+' : ''}${g.cy}) — the identity anchor, drawn over everything behind it` : '',
            ].map((line, i) => (
              <text
                key={line}
                x={MARGIN}
                y={TOP + 3 * ROW_H + 70 + i * 30}
                fontFamily={FONTS.hand}
                fontSize={23}
                fill={PALETTE.inkSoft}
              >
                {line}
              </text>
            ))}
          </g>
        )}

        {/* one large head, because the face is where this character actually lives */}
        <g>
          <DoodleCharacter
            character="bill"
            pose="neutral"
            expression="neutral"
            x={SHEET_W - 250}
            y={headHipY(c, TOP + 3 * ROW_H + 100, headScale(c, 270, 20))}
            scale={headScale(c, 270, 20)}
            frame={frame}
            seed="model-hero"
            blink={false}
            gaze="center"
            wobbleAmount={0}
          />
        </g>
      </>
    </SheetStage>
  );
};
