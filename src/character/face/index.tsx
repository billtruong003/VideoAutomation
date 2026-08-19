/**
 * face/index.tsx — assembles one face from the closed vocabularies.
 *
 * This component is the reason the expression sheet is a meaningful QA artifact: every
 * cell on that sheet is the same head, the same metrics and the same part libraries, with
 * only the expression record swapped. Nothing here can move a feature — positions come
 * from `FaceMetrics`, shapes come from the vocabularies, and an expression may choose
 * shapes but never coordinates.
 */

import React from 'react';
import { RoughAsset } from '../../assets/RoughAsset';
import { TINY, type AssetDef } from '../../assets/shapes';
import type { Point } from '../../lib/pathpoints';
import { PALETTE } from '../../style/tokens';
import { Ink, hand } from '../ink';
import type { CharacterPalette, Expression, FaceAccent, Facing, TalkState } from '../types';

import { Brow } from './brows';
import { Eye, Glasses } from './eyes';
import { Mouth } from './mouths';
import type { FaceMetrics } from './metrics';

export * from './metrics';
export { BROWS } from './brows';
export { Eye, Glasses } from './eyes';
export { Mouth } from './mouths';

// ---------------------------------------------------------------------------
// accents
// ---------------------------------------------------------------------------

const SWEAT: AssetDef = {
  id: 'accent-sweat',
  shapes: [{ k: 'path', d: 'M 0 -13 C 4.6 -4.5 6.5 0 2.8 2.8 C -1 5.6 -3.7 1 0 -13 Z', fill: PALETTE.teal, stroke: PALETTE.teal, rough: 'detail', sw: 1.8, roughness: 0.6, single: true }],
};

const vein = (color: string): AssetDef => ({
  id: 'accent-vein',
  shapes: [
    { k: 'line', x1: -6, y1: -5, x2: 0, y2: 0, stroke: color, sw: 2.4, rough: 'detail', ...TINY },
    { k: 'line', x1: 6, y1: -5, x2: 0, y2: 0, stroke: color, sw: 2.4, rough: 'detail', ...TINY },
    { k: 'line', x1: 0, y1: 0, x2: 0, y2: 7, stroke: color, sw: 2.4, rough: 'detail', ...TINY },
  ],
});

/**
 * Accents are marks on top of a finished face, never a reason to redraw one.
 *
 * They exist because at this level of simplification some emotions genuinely cannot be
 * separated by eyes and brows alone — exhausted and worried share a brow, and the sweat
 * drop is what tells them apart at phone size.
 */
const Accent: React.FC<{ kind: FaceAccent; m: FaceMetrics; seed: string }> = ({ kind, m, seed }) => {
  switch (kind) {
    case 'sweat':
      return (
        <g transform={`translate(${m.accentX} ${m.accentY})`}>
          <RoughAsset def={hand(SWEAT)} variant={seed} />
        </g>
      );
    /**
     * Floating beside the head, not stamped on it.
     *
     * The first pass put the vein at the temple where it landed on the hair and read as a
     * red scratch. Outside the silhouette it reads as the cartoon convention it is, and it
     * stops competing with the hair for the same few pixels.
     */
    case 'angerVein':
      return (
        <g transform={`translate(${-m.accentX - 16} ${m.accentY - 14}) scale(1.25)`}>
          <RoughAsset def={hand(vein(PALETTE.coral))} variant={seed} />
        </g>
      );
    case 'blush':
      return (
        <>
          {([-1, 1] as const).map((s) => (
            <g key={s} transform={`translate(${s * (m.eyeX + 14)} ${m.eyeY + 10})`}>
              <Ink pts={[[-5, 0], [5, 0]] as Point[]} pen="face" size={3.2} color={PALETTE.coral} seed={`${seed}:blush${s}`} />
              <Ink pts={[[-4, 5], [4, 5]] as Point[]} pen="face" size={3.2} color={PALETTE.coral} seed={`${seed}:blush2${s}`} />
            </g>
          ))}
        </>
      );
    /**
     * Vertical dread hatching down one temple.
     *
     * This started as a horizontal band across the eyes in `skinShade`, which was
     * completely invisible on the rendered sheet — it sat behind the glasses and had
     * almost no contrast against the skin. Vertical strokes down the free strip of cheek
     * beside the lenses have room to exist, and they are the convention viewers already
     * read as "this is going badly".
     */
    case 'shadow':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Ink
              key={i}
              pts={[
                [-m.accentX + 4 + i * 6, m.accentY - 2],
                [-m.accentX + 4 + i * 6, m.accentY + 22 - i * 4],
              ] as Point[]}
              pen="face"
              size={2.6}
              color={PALETTE.inkSoft}
              seed={`${seed}:dread${i}`}
            />
          ))}
        </>
      );
    case 'sparkleMark':
      return (
        <g transform={`translate(${m.accentX - 6} ${m.accentY})`}>
          <Ink pts={[[0, -7], [0, 7]] as Point[]} pen="face" size={2.8} color={PALETTE.gold} seed={`${seed}:sp1`} />
          <Ink pts={[[-5, 0], [5, 0]] as Point[]} pen="face" size={2.8} color={PALETTE.gold} seed={`${seed}:sp2`} />
        </g>
      );
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// face
// ---------------------------------------------------------------------------

/**
 * How far features slide for a three-quarter view, as a fraction of eye separation.
 *
 * This is a cheat and it is documented as one. The rig is front-facing; there is no
 * z-axis and no turn-around. What `facing` does is shift the features off-centre, narrow
 * the far eye's spacing and swing the hair parting — which is enough to sell a head turn
 * in a 40-second Short and cannot break, because nothing actually rotates.
 */
const FACING_SHIFT: Record<Facing, number> = { front: 0, left34: -0.34, right34: 0.34 };

export type FaceProps = {
  expression: Expression;
  m: FaceMetrics;
  palette: CharacterPalette;
  seed: string;
  facing?: Facing;
  talk?: TalkState;
  /** 0 = eyes open, 1 = shut. */
  blink?: number;
  /** Look override, when a scene aims the eyes rather than the expression. */
  look?: [number, number];
};

export const Face: React.FC<FaceProps> = ({
  expression,
  m,
  palette,
  seed,
  facing = 'front',
  talk,
  blink = 0,
  look,
}) => {
  const gaze = look ?? expression.look ?? [0, 0];
  const shift = FACING_SHIFT[facing] * m.eyeX;
  const ink = palette.outline;

  return (
    <g transform={shift ? `translate(${shift.toFixed(2)} 0)` : undefined}>
      {expression.accents?.includes('shadow') && (
        <Accent kind="shadow" m={m} seed={seed} />
      )}

      <g transform={`translate(${-m.eyeX} ${m.eyeY})`}>
        <Eye state={expression.eyes} m={m} look={gaze} color={ink} seed={`${seed}:eyeL`} side="L" blink={blink} />
      </g>
      <g transform={`translate(${m.eyeX} ${m.eyeY})`}>
        <Eye state={expression.eyes} m={m} look={gaze} color={ink} seed={`${seed}:eyeR`} side="R" blink={blink} />
      </g>

      {/* frames last of the eye group: the glasses outrank anything they cross */}
      <Glasses m={m} color={palette.glasses ?? ink} seed={seed} />

      <Brow state={expression.brow} m={m} side="L" color={ink} seed={`${seed}:browL`} />
      <Brow state={expression.brow} m={m} side="R" color={ink} seed={`${seed}:browR`} />

      <Mouth
        state={expression.mouth}
        talk={talk}
        m={m}
        scale={expression.mouthScale ?? 1}
        color={ink}
        seed={seed}
      />

      {expression.accents
        ?.filter((a) => a !== 'shadow')
        .map((a) => <Accent key={a} kind={a} m={m} seed={seed} />)}
    </g>
  );
};
