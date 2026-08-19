/**
 * CastSheets.tsx — the four cast-level acceptance gates.
 *
 *   CastLineup      do they belong to one universe, and is Bill obviously the lead?
 *   Silhouettes     can they be told apart with every detail removed?
 *   PhoneSizeTest   does any of it survive the size people actually watch at?
 *   HandArmTest     the specific regression that motivated V1.0
 *
 * These four are cast-level rather than per-character because each one is a question
 * about the SET. A character can pass its own expression sheet and still be a failure
 * standing next to the other four.
 *
 * Every layout here scales on BOTH axes. The first version fitted on height alone and
 * every figure in the line-up overlapped its neighbours, which made the sheet worse than
 * useless — it hid the exact adjacency it exists to test.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { CAST_ORDER, CHARACTERS } from '../../character/registry';
import { FONTS, PALETTE } from '../../lib/style';
import type { CharacterId } from '../../character/types';
import {
  CellFrame,
  CellLabel,
  MARGIN,
  SHEET_W,
  SheetStage,
  SheetTitle,
  castFit,
  extentOf,
  fitScale,
  fullBodyHipY,
  grid,
} from './layout';

const COL_W = (SHEET_W - MARGIN * 2) / 5;
const DEFS = CAST_ORDER.map((id) => CHARACTERS[id]);

/** The pose each character stands in when the sheet wants them simply present. */
const restPose = (id: CharacterId) => (CHARACTERS[id].kind === 'creature' ? 'stand' : 'neutral');

/** A row of the whole cast, standing on one ground line at one shared scale. */
const CastRow: React.FC<{
  y: number;
  scale: number;
  poses: Partial<Record<CharacterId, string>>;
  expressions?: Partial<Record<CharacterId, string>>;
  seedTag: string;
  frame: number;
  silhouette?: boolean;
}> = ({ y, scale, poses, expressions, seedTag, frame, silhouette }) => (
  <>
    {CAST_ORDER.map((id, i) => {
      const c = CHARACTERS[id];
      return (
        <DoodleCharacter
          key={id}
          character={id}
          pose={poses[id] ?? restPose(id)}
          expression={expressions?.[id] ?? c.defaultExpression}
          x={MARGIN + COL_W * i + COL_W / 2}
          y={y - extentOf(c).bottom * scale}
          scale={scale}
          frame={frame}
          seed={`${seedTag}-${id}`}
          silhouette={silhouette}
          blink={false}
          gaze="center"
          wobbleAmount={0}
        />
      );
    })}
  </>
);

const GroundLine: React.FC<{ y: number }> = ({ y }) => (
  <line x1={MARGIN} y1={y} x2={SHEET_W - MARGIN} y2={y} stroke={PALETTE.grey} strokeWidth={1.6} strokeDasharray="8 6" />
);

// ---------------------------------------------------------------------------
// cast line-up
// ---------------------------------------------------------------------------

export const CastLineup: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = castFit(COL_W, 470, DEFS);
  const ground1 = 500;
  const ground2 = 1090;

  return (
    <SheetStage>
      <>
        <SheetTitle
          text="THE CAST"
          sub="one universe, five silhouettes, one shared scale. Bill leads by identity, not by size."
        />

        <text x={MARGIN} y={132} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
          neutral — same pose, same scale, same ground line
        </text>
        <GroundLine y={ground1} />
        <CastRow y={ground1} scale={scale} poses={{}} seedTag="lineup" frame={frame} />
        {CAST_ORDER.map((id, i) => (
          <text
            key={id}
            x={MARGIN + COL_W * i + COL_W / 2}
            y={ground1 + 46}
            textAnchor="middle"
            fontFamily={FONTS.display}
            fontSize={34}
            fill={PALETTE.ink}
          >
            {CHARACTERS[id].name.toUpperCase()}
          </text>
        ))}

        <text x={MARGIN} y={ground1 + 120} fontFamily={FONTS.display} fontSize={38} fill={PALETTE.ink}>
          IN CHARACTER
        </text>
        <text x={MARGIN} y={ground1 + 150} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
          the pose and face each of them reaches for first
        </text>
        <GroundLine y={ground2} />
        <CastRow
          y={ground2}
          scale={scale}
          poses={{ bill: 'confused', mina: 'armsCrossed', dex: 'presenting', gus: 'armsBehindBack', mochi: 'loaf' }}
          expressions={{ bill: 'confused', mina: 'unimpressed', dex: 'evilIdea', gus: 'deadpan', mochi: 'judging' }}
          seedTag="lineup2"
          frame={frame}
        />
        {(
          [
            ['bill', 'confused'],
            ['mina', 'unimpressed'],
            ['dex', 'evil idea'],
            ['gus', 'deadpan'],
            ['mochi', 'judging'],
          ] as [CharacterId, string][]
        ).map(([id, label], i) => (
          <CellLabel key={id} x={MARGIN + COL_W * i + COL_W / 2} y={ground2 + 40} text={label} size={23} />
        ))}

        {/* the one-line reason each of them is distinguishable */}
        {CAST_ORDER.map((id, i) => (
          <text
            key={`a-${id}`}
            x={MARGIN}
            y={ground2 + 110 + i * 32}
            fontFamily={FONTS.hand}
            fontSize={23}
            fill={PALETTE.inkSoft}
          >
            {`${CHARACTERS[id].name} — ${CHARACTERS[id].anchors[0]}`}
          </text>
        ))}
      </>
    </SheetStage>
  );
};

// ---------------------------------------------------------------------------
// silhouettes
// ---------------------------------------------------------------------------

/**
 * Every character flattened to pure ink, with no facial detail at all.
 *
 * The harshest test in the suite and the one that decides whether the cast is real. If
 * Bill, Mina and Dex are hard to tell apart here, no amount of palette or face work saves
 * them at thumbnail size — the fix has to be hair shape and proportion.
 */
export const Silhouettes: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = castFit(COL_W, 470, DEFS);
  const ground1 = 520;
  const ground2 = 1130;

  return (
    <SheetStage>
      <>
        <SheetTitle
          text="SILHOUETTE TEST"
          sub="all detail removed. hair shape and proportion must carry the identity alone."
        />

        <text x={MARGIN} y={140} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
          neutral
        </text>
        <GroundLine y={ground1} />
        <CastRow y={ground1} scale={scale} poses={{}} seedTag="sil1" frame={frame} silhouette />
        {CAST_ORDER.map((id, i) => (
          <CellLabel key={id} x={MARGIN + COL_W * i + COL_W / 2} y={ground1 + 42} text={CHARACTERS[id].name} size={26} />
        ))}

        <text x={MARGIN} y={ground1 + 130} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
          in character — the poses they are most often seen in
        </text>
        <GroundLine y={ground2} />
        <CastRow
          y={ground2}
          scale={scale}
          poses={{ bill: 'pointUp', mina: 'handsOnHips', dex: 'leanForward', gus: 'armsCrossed', mochi: 'loaf' }}
          seedTag="sil2"
          frame={frame}
          silhouette
        />

        <text x={MARGIN} y={ground2 + 90} fontFamily={FONTS.hand} fontSize={23} fill={PALETTE.inkSoft}>
          pass condition: name all five without reading the labels.
        </text>
      </>
    </SheetStage>
  );
};

// ---------------------------------------------------------------------------
// phone-size test
// ---------------------------------------------------------------------------

const SIZE_STEPS: [string, number][] = [
  ['100% — hero shot', 1],
  ['60% — medium shot', 0.6],
  ['30% — background', 0.3],
  ['~15% — thumbnail scale', 0.15],
];

/**
 * The cast at the sizes people actually watch at.
 *
 * A design that only works zoomed in is a failed design. What has to survive the
 * reduction: hair silhouette, Bill's glasses, the outfit colour, and enough limb
 * separation that the body still reads as a body.
 */
export const PhoneSizeTest: React.FC = () => {
  const frame = useCurrentFrame();
  const base = castFit(COL_W, 470, DEFS);
  let y = 190;

  return (
    <SheetStage>
      <>
        <SheetTitle
          text="PHONE-SIZE TEST"
          sub="the channel is watched on phones. anything that needs a zoom to read does not exist."
        />
        {SIZE_STEPS.map(([label, k]) => {
          const scale = base * k;
          const rowH = 430 * Math.max(k, 0.3) + 70;
          const top = y;
          y += rowH;
          const ground = top + rowH - 46;
          return (
            <g key={label}>
              <text x={MARGIN} y={top + 6} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
                {label}
              </text>
              <GroundLine y={ground} />
              <CastRow y={ground} scale={scale} poses={{}} seedTag={`size-${k}`} frame={frame} />
            </g>
          );
        })}
      </>
    </SheetStage>
  );
};

// ---------------------------------------------------------------------------
// hand / arm test
// ---------------------------------------------------------------------------

const ARM_CASES: [string, string][] = [
  ['neutral', 'shoulder to hand, unbroken'],
  ['relaxed', 'slack arm still traceable'],
  ['sitting', 'arms clear of the thighs'],
  ['confused', 'both arms readable, palms open'],
  ['armsCrossed', 'forearms cross IN FRONT of the shirt'],
  ['holdingSmall', 'both hands meet without merging'],
  ['exhausted', 'arms hang without vanishing'],
  ['thinking', 'hand on chin, drawn over the face'],
  ['celebrating', 'raised arms clear the 96-unit head'],
];

/**
 * The specific regression this whole revision started from.
 *
 * The previous character drew arms BEHIND the torso with shoulders anchored inside the
 * silhouette, so in every resting pose the arm was completely occluded and the hand read
 * as a disc floating in space beside the body. Three changes fixed it — edge-anchored
 * shoulders, arms in front of the torso, and resting hands placed clear of it — and a
 * fourth fixed its twin, where any RAISED arm disappeared behind the head instead.
 *
 * Pass condition: in every cell you can trace shoulder -> arm -> hand without guessing.
 */
export const HandArmTest: React.FC = () => {
  const frame = useCurrentFrame();
  const CELL_H = 490;
  const cells = grid(ARM_CASES.length, 3, 190, CELL_H);
  const cellW = (SHEET_W - MARGIN * 2) / 3;
  const c = CHARACTERS.bill;
  const scale = fitScale(c, CELL_H - 90);

  return (
    <SheetStage>
      <>
        <SheetTitle
          text="HAND / ARM READABILITY"
          sub="no floating hands, no hands from the chin, no arm swallowed by the head."
        />
        {cells.map(({ i, x, y, cx }) => {
          const [pose, why] = ARM_CASES[i];
          return (
            <g key={pose}>
              <CellFrame x={x} y={y} w={cellW} h={CELL_H} />
              <DoodleCharacter
                character="bill"
                pose={pose}
                expression="neutral"
                x={cx}
                y={fullBodyHipY(c, y + (CELL_H - 80) / 2, scale)}
                scale={scale}
                frame={frame}
                seed={`arm-${pose}`}
                blink={false}
                gaze="center"
                wobbleAmount={0}
              />
              <CellLabel x={cx} y={y + CELL_H - 44} text={pose} size={24} />
              <CellLabel x={cx} y={y + CELL_H - 20} text={why} size={17} />
            </g>
          );
        })}
      </>
    </SheetStage>
  );
};
