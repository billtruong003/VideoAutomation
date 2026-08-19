/**
 * parts.tsx — the body geometry every humanoid cast member is built from.
 *
 * All of it is authored at the ORIGIN as clean semantic geometry and moved into place by
 * the renderer. A head is a rounded rectangle; a shirt is a rounded trapezoid; a hand is a
 * disc with at most one extra shape on it. None of these are drawings — the drawing is
 * what Rough.js does to them.
 *
 * Every part is a pure function of the character's `Build` and palette, so a new cast
 * member is a table of numbers rather than a new set of paths.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { roundedRect, TINY, type AssetDef, type Shape } from '../assets/shapes';
import { PALETTE } from '../style/tokens';
import { hand } from './ink';
import type { Build, CharacterPalette, HandState } from './types';

/** Halo widths. The paper rim that keeps a character readable on a dark background. */
const HALO = 6;

// ---------------------------------------------------------------------------
// head
// ---------------------------------------------------------------------------

/**
 * The skull: a rounded rectangle, slightly wider than tall.
 *
 * It is a rectangle and not an ellipse because that is what gives the cast broad cheeks
 * and a simple lower jaw instead of an egg. The corner radius is the dial: low reads
 * square and mature (Gus), high reads soft and tidy (Mina).
 *
 * The head shape NEVER changes with expression. Emotion is a face, not a skull.
 */
export const headDef = (b: Build, palette: CharacterPalette, halo = false): AssetDef => {
  const grow = halo ? 2 : 0;
  const shape = roundedRect(-b.headHW - grow, -b.headHH - grow, (b.headHW + grow) * 2, (b.headHH + grow) * 2, b.headR + grow);
  return {
    id: `head-${b.headHW}-${b.headHH}-${b.headR}${halo ? '-halo' : ''}`,
    shapes: [
      halo
        ? { ...shape, fill: PALETTE.paper, stroke: PALETTE.paper, sw: HALO, rough: 'character' }
        : { ...shape, fill: palette.skin, stroke: palette.outline, rough: 'character' },
    ] as Shape[],
  };
};

// ---------------------------------------------------------------------------
// torso and pants
// ---------------------------------------------------------------------------

/**
 * The shirt: a rounded trapezoid, shoulders wider than hips.
 *
 * Deliberately blocky and oversized relative to the body underneath it. On a character
 * whose head is 46% of its height, the torso's only job is to be a coloured block that
 * says who this is — Bill's yellow, Mina's teal — and to give the arms somewhere to leave
 * from.
 */
export const torsoDef = (b: Build, palette: CharacterPalette, halo = false): AssetDef => {
  const grow = halo ? 2.5 : 0;
  const sx = b.shoulderX + grow;
  const hx = b.hipHalfW + grow;
  const top = b.torsoTop - grow;
  const bot = b.torsoBottom + grow;
  const r = 7;

  const d =
    `M ${-sx + r} ${top} H ${sx - r} A ${r} ${r} 0 0 1 ${sx} ${top + r} ` +
    `L ${hx} ${bot - r} A ${r} ${r} 0 0 1 ${hx - r} ${bot} ` +
    `H ${-hx + r} A ${r} ${r} 0 0 1 ${-hx} ${bot - r} ` +
    `L ${-sx} ${top + r} A ${r} ${r} 0 0 1 ${-sx + r} ${top} Z`;

  return {
    id: `torso-${b.shoulderX}-${b.hipHalfW}${halo ? '-halo' : ''}`,
    shapes: [
      halo
        ? { k: 'path', d, fill: PALETTE.paper, stroke: PALETTE.paper, sw: HALO, rough: 'character' }
        : { k: 'path', d, fill: palette.shirt, stroke: palette.outline, rough: 'character' },
    ] as Shape[],
  };
};

/**
 * Shorts. A separate block rather than a colour change on the torso, because the legs
 * emerge from underneath it — which is what stops the noodle legs from reading as two
 * lines dangling off a box.
 */
export const pantsDef = (b: Build, palette: CharacterPalette, halo = false): AssetDef => {
  const grow = halo ? 2.5 : 0;
  const shape = roundedRect(
    -b.pantsHalfW - grow,
    b.pantsTop - grow,
    (b.pantsHalfW + grow) * 2,
    b.pantsBottom - b.pantsTop + grow * 2,
    5,
  );
  return {
    id: `pants-${b.pantsHalfW}-${b.pantsBottom}${halo ? '-halo' : ''}`,
    shapes: [
      halo
        ? { ...shape, fill: PALETTE.paper, stroke: PALETTE.paper, sw: HALO, rough: 'character' }
        : { ...shape, fill: palette.pants, stroke: palette.outline, rough: 'character' },
    ] as Shape[],
  };
};

// ---------------------------------------------------------------------------
// hands
// ---------------------------------------------------------------------------

/**
 * Hands are meaning, not anatomy.
 *
 * At a phone-sized Short, five fingers is four more than the viewer can resolve; what
 * they CAN resolve is whether the hand is pointing, holding or hanging. So the vocabulary
 * is five shapes built from a disc, and `handRot` aims whichever one has a direction.
 */
export const handDef = (b: Build, palette: CharacterPalette, state: HandState): AssetDef => {
  const r = b.handRadius;
  const base: Shape = {
    k: 'circle',
    cx: 0,
    cy: 0,
    r,
    fill: palette.skin,
    stroke: palette.outline,
    rough: 'detail',
    sw: 2.8,
    roughness: 0.85,
    single: true,
  };

  switch (state) {
    case 'fist':
      return {
        id: `hand-fist-${r}`,
        shapes: [
          { ...base, r: r * 0.92 },
          { k: 'line', x1: -r * 0.5, y1: r * 0.15, x2: r * 0.5, y2: r * 0.15, stroke: palette.outline, sw: 1.8, rough: 'detail', ...TINY },
        ],
      };

    case 'point':
      return {
        id: `hand-point-${r}`,
        shapes: [
          base,
          {
            ...roundedRect(r * 0.45, -r * 0.42, r * 1.15, r * 0.84, r * 0.42),
            fill: palette.skin,
            stroke: palette.outline,
            sw: 2.4,
            rough: 'detail',
            roughness: 0.7,
            single: true,
          },
        ],
      };

    case 'palm':
      return {
        id: `hand-palm-${r}`,
        shapes: [
          { ...roundedRect(-r * 0.95, -r * 1.05, r * 1.9, r * 2.1, r * 0.6), fill: palette.skin, stroke: palette.outline, sw: 2.6, rough: 'detail', roughness: 0.8, single: true },
          { k: 'line', x1: -r * 0.35, y1: -r * 1.0, x2: -r * 0.35, y2: -r * 0.3, stroke: palette.outline, sw: 1.6, rough: 'detail', ...TINY },
          { k: 'line', x1: r * 0.3, y1: -r * 1.0, x2: r * 0.3, y2: -r * 0.3, stroke: palette.outline, sw: 1.6, rough: 'detail', ...TINY },
        ],
      };

    case 'grip':
      return {
        id: `hand-grip-${r}`,
        shapes: [
          base,
          { k: 'line', x1: -r * 0.55, y1: -r * 0.5, x2: -r * 0.55, y2: r * 0.5, stroke: palette.outline, sw: 1.8, rough: 'detail', ...TINY },
        ],
      };

    case 'mitten':
    default:
      return { id: `hand-mitten-${r}`, shapes: [base] };
  }
};

export const handHaloDef = (b: Build): AssetDef => ({
  id: `hand-halo-${b.handRadius}`,
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: b.handRadius * 1.32, fill: PALETTE.paper, stroke: PALETTE.paper, sw: 3, rough: 'detail' },
  ],
});

// ---------------------------------------------------------------------------
// feet
// ---------------------------------------------------------------------------

/**
 * Feet are light, not black.
 *
 * Ink-filled feet were two heavy blobs at the bottom of the silhouette that pulled the
 * eye straight down, away from the face. Light shoes with an ink outline keep the value
 * where it belongs — on the head.
 */
export const footDef = (b: Build, palette: CharacterPalette, halo = false): AssetDef => ({
  id: `foot-${b.footRx}${halo ? '-halo' : ''}`,
  shapes: [
    halo
      ? { k: 'ellipse', cx: 0, cy: 0, rx: b.footRx + 1.6, ry: b.footRy + 1.6, fill: PALETTE.paper, stroke: PALETTE.paper, sw: 3, rough: 'detail' }
      : { k: 'ellipse', cx: 0, cy: 0, rx: b.footRx, ry: b.footRy, fill: palette.shoe, stroke: palette.outline, rough: 'detail', sw: 2.4, roughness: 0.7, single: true },
  ] as Shape[],
});

// ---------------------------------------------------------------------------
// placement helper
// ---------------------------------------------------------------------------

export const At: React.FC<{ x: number; y: number; rotate?: number; children: React.ReactNode }> = ({
  x,
  y,
  rotate = 0,
  children,
}) => <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})${rotate ? ` rotate(${rotate.toFixed(1)})` : ''}`}>{children}</g>;

/** Convenience: place a stylized asset def at a point. */
export const Part: React.FC<{ def: AssetDef; seed: string; x?: number; y?: number; rotate?: number }> = ({
  def,
  seed,
  x = 0,
  y = 0,
  rotate = 0,
}) => (
  <At x={x} y={y} rotate={rotate}>
    <RoughAsset def={hand(def)} variant={seed} />
  </At>
);
