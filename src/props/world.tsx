/**
 * world.tsx — the set dressing that tells you where you are and what time it is.
 *
 * V2. Windows, daylight, lamps, a door, and the soft-furnishing props for the
 * "comfortable modern venue" beat.
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * Everything below is authored as what the object IS — a window is a rectangle, two
 * mullions and a sill; a chair is four rounded boxes. Not one path here tries to look
 * hand-drawn. All of the sketchiness arrives in `RoughAsset`, identically for every asset
 * in the channel, which is exactly why V2 does not drift the way V1 did.
 *
 * These are STRUCTURES — things with dimensions and edges — so they are Rough.js geometry
 * almost throughout. The only freehand strokes in the file are the two things that are
 * genuinely gestures rather than objects: the shafts of light through the glass and the
 * glow flicks under the lamp.
 *
 * Coordinates are character units (the protagonist is ~182 tall, his head ~88 across).
 * Floor-standing props put their local origin on the ground at their centre so a scene can
 * drop them onto a floor line; wall and sky props are centred on themselves; the pendant
 * lamp hangs from its origin.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { TINY, group, roundedRect, spoke, type AssetDef, type Shape } from '../assets/shapes';
import { wobblyLine } from '../freehand/stroke';

/**
 * Swap the fill of one or more shapes without rebuilding the definition. The id stays
 * stable, so the Rough.js seed — and therefore the object's drawn identity — stays put.
 */
const recolor = (def: AssetDef, fill: string | undefined, ...indices: number[]): AssetDef =>
  fill === undefined
    ? def
    : { ...def, shapes: def.shapes.map((s, i) => (indices.includes(i) ? { ...s, fill } : s)) };

// ---------------------------------------------------------------------------
// window + sky
// ---------------------------------------------------------------------------

const WIN_W = 90;
const WIN_H = 78;

/** A four-pane window: a frame, a cross of mullions, a sill that overshoots. */
const WINDOW: AssetDef = {
  id: 'prop-window',
  size: { w: WIN_W + 12, h: WIN_H + 8 },
  shapes: [
    { k: 'rect', x: -WIN_W / 2, y: -WIN_H / 2, w: WIN_W, h: WIN_H, fill: PALETTE.grey, stroke: PALETTE.ink },
    { k: 'line', x1: 0, y1: -WIN_H / 2, x2: 0, y2: WIN_H / 2, rough: 'detail', sw: 3, single: true },
    { k: 'line', x1: -WIN_W / 2, y1: 0, x2: WIN_W / 2, y2: 0, rough: 'detail', sw: 3, single: true },
    { k: 'line', x1: -WIN_W / 2 - 6, y1: WIN_H / 2 + 4, x2: WIN_W / 2 + 5, y2: WIN_H / 2 + 4, sw: 4.4 },
  ],
};

/**
 * Two shafts of daylight. A shaft of light is a GESTURE — one fast diagonal swipe — so it
 * is a perfect-freehand stroke, not a Rough.js line.
 */
const WINDOW_DAYLIGHT: AssetDef = {
  id: 'prop-window-daylight',
  shapes: [
    {
      k: 'stroke',
      pts: wobblyLine([-34, 24], [-12, -28], 'prop-window-shaft-a', 1.2, 14),
      pen: 'accent',
      size: 2.8,
      color: PALETTE.gold,
      opacity: 0.85,
    },
    {
      k: 'stroke',
      pts: wobblyLine([-22, 26], [-3, -20], 'prop-window-shaft-b', 1.2, 14),
      pen: 'accent',
      size: 2.2,
      color: PALETTE.gold,
      opacity: 0.7,
    },
  ],
};

/** A four-pane window — the one honest clock in a room that has hidden all the others. */
export const Window: React.FC<PropArgs & { viewColor?: string; daylight?: boolean }> = ({
  viewColor,
  daylight = false,
  seed = 'window',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={recolor(WINDOW, viewColor ?? (daylight ? PALETTE.teal : PALETTE.grey), 0)}
      variant={seed}
    />
    {daylight && <RoughAsset def={WINDOW_DAYLIGHT} variant={seed} />}
  </PropFrame>
);

const SUN_R = 16;

const SUN: AssetDef = {
  id: 'prop-sun',
  size: { w: SUN_R * 2, h: SUN_R * 2 },
  shapes: [{ k: 'circle', cx: 0, cy: 0, r: SUN_R, fill: PALETTE.gold, stroke: PALETTE.ink }],
};

/** Eight rays. Ray length is a prop, so the ray set is a pure function of it. */
const sunRays = (rayLength: number): Shape[] =>
  Array.from({ length: 8 }, (_, i) => ({
    ...spoke(0, 0, SUN_R + 5, SUN_R + 5 + rayLength, i * 45),
    rough: 'detail' as const,
    sw: 3.2,
    single: true,
  }));

/** Sun — the outside world, used mainly to prove how much of it got missed. */
export const Sun: React.FC<PropArgs & { rayLength?: number }> = ({
  rayLength = 12,
  seed = 'sun',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={SUN} variant={seed} />
    <RoughAsset def={{ id: 'prop-sun-rays', shapes: sunRays(rayLength) }} variant={seed} />
  </PropFrame>
);

/**
 * Crescent moon: a disc with a second, larger disc bitten out of it — two arcs, which is
 * literally what a crescent is.
 */
const MOON: AssetDef = {
  id: 'prop-moon',
  size: { w: 36, h: 36 },
  shapes: [
    {
      k: 'path',
      d: 'M 5 -17.3 A 18 18 0 1 0 5 17.3 A 22 22 0 0 1 5 -17.3 Z',
      fill: PALETTE.gold,
      stroke: PALETTE.ink,
    },
  ],
};

/** Crescent moon — the "it is somehow this late again" prop. */
export const Moon: React.FC<PropArgs> = ({ seed = 'moon', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={MOON} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// interior
// ---------------------------------------------------------------------------

/** Cord, conical shade, bulb. Hangs from its own origin so a ceiling can be a y value. */
const ceilingLightDef = (lit: boolean): AssetDef => ({
  id: 'prop-ceiling-light',
  size: { w: 40, h: 78 },
  shapes: [
    { k: 'line', x1: 0, y1: 0, x2: 0, y2: 44, rough: 'detail', sw: 2.6, single: true },
    {
      k: 'polygon',
      pts: [
        [-4.5, 44],
        [4.5, 44],
        [20, 67],
        [-20, 67],
      ],
      fill: lit ? PALETTE.gold : PALETTE.grey,
      stroke: PALETTE.ink,
    },
    {
      k: 'ellipse',
      cx: 0,
      cy: 71.5,
      rx: 5,
      ry: 5.5,
      fill: lit ? PALETTE.gold : PALETTE.greyDeep,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 2.6,
    },
  ],
});

const LAMP_LIT = ceilingLightDef(true);
const LAMP_DARK = ceilingLightDef(false);

/** Three flicks of spill light. Flicks are gestures, so: freehand. */
const LAMP_GLOW_SHAPES: Shape[] = [-30, 0, 30].map((x, i) => ({
  k: 'stroke',
  pts: wobblyLine([x * 0.82, 78], [x, 92], `prop-ceiling-light-glow-${i}`, 1.1, 12),
  pen: 'accent',
  size: 3,
  color: PALETTE.gold,
  opacity: 0.8,
}));

const LAMP_GLOW: AssetDef = { id: 'prop-ceiling-light-glow', shapes: LAMP_GLOW_SHAPES };

/** Hanging pendant lamp — the only light source in a room with no windows. */
export const CeilingLight: React.FC<PropArgs & { lit?: boolean }> = ({
  lit = true,
  seed = 'ceiling-light',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={lit ? LAMP_LIT : LAMP_DARK} variant={seed} />
    {lit && <RoughAsset def={LAMP_GLOW} variant={seed} />}
  </PropFrame>
);

/** Slab, inset panel, knob, threshold. Origin sits on the floor at the door's centre. */
const DOOR: AssetDef = {
  id: 'prop-door',
  size: { w: 70, h: 150 },
  shapes: [
    { k: 'rect', x: -35, y: -150, w: 70, h: 150, fill: PALETTE.grey, stroke: PALETTE.ink },
    { ...roundedRect(-23, -133, 46, 113, 5), rough: 'detail', sw: 2.6, single: true },
    { k: 'circle', cx: 25, cy: -72, r: 3.6, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY },
    { k: 'line', x1: -42, y1: 1, x2: 42, y2: 1, rough: 'background', sw: 3 },
  ],
};

/** A plain doorway — the exit, mostly used for how far away it looks. */
export const Door: React.FC<PropArgs & { panelColor?: string }> = ({
  panelColor,
  seed = 'door',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={recolor(DOOR, panelColor, 0)} variant={seed} />
  </PropFrame>
);

/** Three leaves — each an ellipse on a stalk, tilted. A leaf IS a tilted ellipse. */
const plantLeaves = (leafColor: string): Shape[] =>
  [-40, 0, 42].map((deg, i) =>
    group(
      [
        {
          k: 'ellipse',
          cx: 0,
          cy: -15,
          rx: 6.5,
          ry: 15,
          fill: leafColor,
          stroke: PALETTE.ink,
          rough: 'detail',
          sw: 2.6,
        },
      ],
      { transform: `translate(0 -28) rotate(${deg})`, id: `leaf-${i}` },
    ),
  );

const plantDef = (leafColor: string): AssetDef => ({
  id: 'prop-plant',
  size: { w: 34, h: 60 },
  shapes: [
    // leaves first, so the pot and its rim overlap them
    ...plantLeaves(leafColor),
    { k: 'line', x1: 0, y1: -26, x2: 0, y2: -46, rough: 'detail', sw: 2.4, single: true },
    {
      k: 'polygon',
      pts: [
        [-11, 0],
        [11, 0],
        [15, -25],
        [-15, -25],
      ],
      fill: PALETTE.greyDeep,
      stroke: PALETTE.ink,
    },
    { k: 'rect', x: -16.5, y: -30, w: 33, h: 5.5, fill: PALETTE.greyDeep, stroke: PALETTE.ink, rough: 'detail', sw: 2.8 },
  ],
});

const PLANT = plantDef(PALETTE.teal);

/** Potted plant — shorthand for "this room wants you to feel comfortable". */
export const Plant: React.FC<PropArgs & { leafColor?: string }> = ({
  leafColor,
  seed = 'plant',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={leafColor ? plantDef(leafColor) : PLANT} variant={seed} />
  </PropFrame>
);

/** Back, seat, two arms, two legs. Origin on the floor at the chair's centre. */
const chairDef = (fabric: string): AssetDef => ({
  id: 'prop-comfy-chair',
  size: { w: 86, h: 72 },
  shapes: [
    // legs first, so the seat covers where they meet it
    { k: 'line', x1: -33, y1: -9, x2: -36, y2: 0, sw: 4 },
    { k: 'line', x1: 33, y1: -9, x2: 36, y2: 0, sw: 4 },
    { ...roundedRect(-30, -72, 60, 45, 9), fill: fabric, stroke: PALETTE.ink },
    { ...roundedRect(-42, -32, 84, 25, 8), fill: fabric, stroke: PALETTE.ink },
    { ...roundedRect(-43, -56, 16, 27, 6), fill: fabric, stroke: PALETTE.ink, sw: 3.4 },
    { ...roundedRect(27, -56, 16, 27, 6), fill: fabric, stroke: PALETTE.ink, sw: 3.4 },
    // one cushion seam is all the "this is soft" the drawing needs
    { k: 'line', x1: -6, y1: -32, x2: -7, y2: -9, rough: 'detail', sw: 2.2, single: true, opacity: 0.7 },
  ],
});

const COMFY_CHAIR = chairDef(PALETTE.violet);

/** Armchair — the "comfortable modern venue" beat, where nothing hurts and nothing ends. */
export const ComfyChair: React.FC<PropArgs & { fabricColor?: string }> = ({
  fabricColor,
  seed = 'comfy-chair',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={fabricColor ? chairDef(fabricColor) : COMFY_CHAIR} variant={seed} />
  </PropFrame>
);

/** Straw, tapered cup, lid, two sleeve bands. Origin on the table at the cup's centre. */
const cupDef = (cupColor: string): AssetDef => ({
  id: 'prop-drink-cup',
  size: { w: 32, h: 68 },
  shapes: [
    { k: 'line', x1: 6, y1: -48, x2: 11, y2: -68, rough: 'detail', sw: 3, single: true },
    {
      k: 'polygon',
      pts: [
        [-11, 0],
        [11, 0],
        [14.5, -40],
        [-14.5, -40],
      ],
      fill: cupColor,
      stroke: PALETTE.ink,
    },
    { k: 'rect', x: -16, y: -50, w: 32, h: 10, fill: PALETTE.greyDeep, stroke: PALETTE.ink, rough: 'detail', sw: 3 },
    { k: 'line', x1: -12.5, y1: -20, x2: 12.5, y2: -21, rough: 'detail', sw: 2.6, single: true },
    { k: 'line', x1: -12, y1: -12, x2: 12, y2: -13, rough: 'detail', sw: 2, single: true, opacity: 0.6 },
  ],
});

const DRINK_CUP = cupDef(PALETTE.paperShade);

/** Takeaway cup — the free drink that keeps you seated, with a straw. */
export const DrinkCup: React.FC<PropArgs & { cupColor?: string }> = ({
  cupColor,
  seed = 'drink-cup',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={cupColor ? cupDef(cupColor) : DRINK_CUP} variant={seed} />
  </PropFrame>
);
