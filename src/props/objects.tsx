/**
 * objects.tsx — the small everyday things: jeans, a pocket watch, a pen cap, a book.
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * These are the props a hand holds or a camera pushes into, so they are authored at a size
 * that survives a close-up rather than at a size that fits a wide shot — a scene scales them
 * down, never up. Scaling a 20-unit drawing to 200 magnifies the stylizer's stroke width with
 * it and the object arrives looking like it was drawn with a marker.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { TINY, ring, roundedRect, type AssetDef, type Shape } from '../assets/shapes';
import { wobblyLine } from '../lib/pathpoints';

// ---------------------------------------------------------------------------
// jeans + pocket watch
// ---------------------------------------------------------------------------

/**
 * The front of a pair of jeans, waist to mid-thigh, with the coin pocket inside the front one.
 *
 * The whole episode lives in the size relationship between the two pockets, so the small one
 * is drawn where it actually is — tucked into the front pocket's upper corner, overlapping it
 * — rather than beside it, which would lose the "pocket inside a pocket" fact entirely.
 */
/**
 * The front of a pair of jeans: waistband, hips, and TWO LEGS.
 *
 * The first version stopped at the hips, and a rectangle with a seam on it read as a blue
 * box rather than as trousers — which broke the episode, because a viewer who does not
 * recognise the garment cannot be surprised by a pocket in it. The crotch notch and the two
 * separated legs are what make the silhouette unmistakable, and a silhouette that survives a
 * thumbnail is the only test that matters here.
 */
const jeansDef = (littleLit: boolean): AssetDef => ({
  id: 'prop-jeans',
  size: { w: 210, h: 360 },
  shapes: [
    // hips
    { ...roundedRect(-100, -170, 200, 190, 14), fill: PALETTE.shirt, stroke: PALETTE.ink },
    // legs, with a crotch notch between them
    { ...roundedRect(-98, 6, 88, 184, 12), fill: PALETTE.shirt, stroke: PALETTE.ink },
    { ...roundedRect(10, 6, 88, 184, 12), fill: PALETTE.shirt, stroke: PALETTE.ink },
    // waistband
    { k: 'rect', x: -100, y: -170, w: 200, h: 28, fill: PALETTE.shirtDark, stroke: PALETTE.ink, rough: 'detail', sw: 3 },
    // belt loops — three marks that say "jeans" faster than any amount of shading
    ...[-70, 0, 70].map((x): Shape => ({
      k: 'rect', x: x - 6, y: -174, w: 12, h: 36, fill: PALETTE.shirtDark, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY,
    })),
    // fly seam
    { k: 'line', x1: 0, y1: -140, x2: 0, y2: 0, rough: 'detail', sw: 2.6, single: true, opacity: 0.8 },
    // the front pocket: a curved opening cut into the hip
    {
      k: 'path',
      d: 'M -96 -134 Q -50 -118 -28 -58',
      fill: 'none',
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 3.6,
    },
    // THE LITTLE POCKET — inside the front one, upper corner
    {
      ...roundedRect(-86, -130, 46, 42, 5),
      fill: littleLit ? PALETTE.gold : PALETTE.shirtDark,
      stroke: PALETTE.ink,
      rough: 'detail',
      sw: 3,
    },
    // rivets at its corners, where a real one carries them
    { k: 'circle', cx: -82, cy: -90, r: 3.6, fill: PALETTE.gold, stroke: PALETTE.ink, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'circle', cx: -42, cy: -90, r: 3.6, fill: PALETTE.gold, stroke: PALETTE.ink, rough: 'detail', sw: 1.8, ...TINY },
    // outside-leg stitching
    { k: 'line', x1: -86, y1: 20, x2: -86, y2: 180, rough: 'detail', sw: 2.2, single: true, opacity: 0.55 },
    { k: 'line', x1: 86, y1: 20, x2: 86, y2: 180, rough: 'detail', sw: 2.2, single: true, opacity: 0.55 },
  ],
});

/**
 * Centre of the little pocket, in the prop's own units.
 *
 * Exported for the same reason the window panes export theirs: a scene that circles the
 * pocket by eye goes wrong the moment the prop is redrawn, and this prop WAS redrawn.
 */
export const JEANS_POCKET = { x: -63, y: -109 } as const;

export const Jeans: React.FC<PropArgs & { littleLit?: boolean }> = ({
  littleLit = false,
  seed = 'jeans',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={jeansDef(littleLit)} variant={`${seed}:${littleLit}`} />
  </PropFrame>
);

/** A pocket watch: case, bow, twelve ticks, two hands, and a chain stub. Origin at centre. */
const pocketWatchDef = (hourAngle: number, minuteAngle: number, chain: boolean): AssetDef => ({
  id: 'prop-pocket-watch',
  size: { w: 76, h: 96 },
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: 34, fill: PALETTE.gold, stroke: PALETTE.ink },
    { k: 'circle', cx: 0, cy: 0, r: 27, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
    // crown and bow
    { k: 'rect', x: -5, y: -42, w: 10, h: 9, fill: PALETTE.gold, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY },
    { k: 'circle', cx: 0, cy: -48, r: 7, fill: 'none', stroke: PALETTE.ink, rough: 'detail', sw: 2.4, ...TINY },
    ...ring(0, 0, 22, 12).map(([x, y]): Shape => ({
      k: 'circle', cx: x, cy: y, r: 1.5, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 1.2, ...TINY,
    })),
    // hands live in rotated groups so a scene can spin them without touching the geometry
    { k: 'group', id: 'pw-hour', transform: `rotate(${hourAngle})`, shapes: [{ k: 'line', x1: 0, y1: 0, x2: 0, y2: -13, sw: 3.6 }] },
    { k: 'group', id: 'pw-minute', transform: `rotate(${minuteAngle})`, shapes: [{ k: 'line', x1: 0, y1: 0, x2: 0, y2: -20, sw: 2.8 }] },
    ...(chain
      ? ([{
          k: 'stroke',
          pts: wobblyLine([4, -52], [46, -74], 'prop-pw-chain', 1.6, 14),
          pen: 'limb',
          size: 2.6,
          color: PALETTE.gold,
        }] as Shape[])
      : []),
  ],
});

export const PocketWatch: React.FC<
  PropArgs & { hourAngle?: number; minuteAngle?: number; chain?: boolean }
> = ({ hourAngle = 300, minuteAngle = 60, chain = true, seed = 'pocket-watch', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={pocketWatchDef(Math.round(hourAngle), Math.round(minuteAngle), chain)}
      variant={seed}
    />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// pen cap
// ---------------------------------------------------------------------------

/**
 * A vented pen cap. Deliberately GENERIC — the narration names a brand, the drawing does not.
 *
 * `section` peels it open so the vent can be shown as a channel through the plastic rather
 * than as a dot on a surface, which is the difference between "there is a hole" and "air can
 * get through", and the second one is the point.
 */
const penCapDef = (section: boolean, ventLit: boolean): AssetDef => ({
  id: 'prop-pen-cap',
  size: { w: 60, h: 150 },
  shapes: section
    ? [
        // outer wall, cut open: two sides and a domed top
        { k: 'path', d: 'M -22 60 L -22 -46 Q -22 -64 0 -66 Q 22 -64 22 -46 L 22 60', fill: PALETTE.paperShade, stroke: PALETTE.ink },
        // the bore
        { k: 'path', d: 'M -13 60 L -13 -44 Q -13 -55 0 -56 Q 13 -55 13 -44 L 13 60', fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
        // THE VENT — a channel through the dome, drawn as a gap in the wall
        { k: 'rect', x: -6, y: -68, w: 12, h: 14, fill: ventLit ? PALETTE.teal : PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 2.2, ...TINY },
        // the clip
        { k: 'path', d: 'M 22 -40 Q 34 -30 32 6', fill: 'none', stroke: PALETTE.ink, rough: 'detail', sw: 3.4 },
      ]
    : [
        { k: 'path', d: 'M -22 60 L -22 -46 Q -22 -64 0 -66 Q 22 -64 22 -46 L 22 60 Z', fill: PALETTE.teal, stroke: PALETTE.ink },
        { k: 'circle', cx: 0, cy: -58, r: 5, fill: ventLit ? PALETTE.paper : PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY },
        { k: 'path', d: 'M 22 -40 Q 34 -30 32 6', fill: 'none', stroke: PALETTE.ink, rough: 'detail', sw: 3.4 },
      ],
});

export const PenCap: React.FC<PropArgs & { section?: boolean; ventLit?: boolean }> = ({
  section = false,
  ventLit = false,
  seed = 'pen-cap',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={penCapDef(section, ventLit)} variant={`${seed}:${section}${ventLit}`} />
  </PropFrame>
);

/** A plain ballpoint, capped or not. */
const penDef = (capped: boolean): AssetDef => ({
  id: 'prop-pen',
  size: { w: 40, h: 220 },
  shapes: [
    { ...roundedRect(-13, -70, 26, 150, 6), fill: PALETTE.paper, stroke: PALETTE.ink },
    { k: 'polygon', pts: [[-13, 80], [13, 80], [4, 104], [-4, 104]], fill: PALETTE.teal, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    ...(capped
      ? ([{ k: 'path', d: 'M -18 -46 L -18 -104 Q -18 -120 0 -122 Q 18 -120 18 -104 L 18 -46 Z', fill: PALETTE.teal, stroke: PALETTE.ink }] as Shape[])
      : []),
  ],
});

export const Pen: React.FC<PropArgs & { capped?: boolean }> = ({
  capped = true,
  seed = 'pen',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={penDef(capped)} variant={`${seed}:${capped}`} />
  </PropFrame>
);

/**
 * An airway, as a schematic tube. Nothing anatomical, no body, no face.
 *
 * The pen-cap episode is about a real choking hazard, and the tone rule for it is that the
 * danger stays a DIAGRAM. This prop is the mechanism for keeping that promise: a plain pipe
 * with a blockage in it and air still moving, which explains the vent without ever drawing a
 * person in distress.
 */
const airwayDef = (blocked: boolean, ventFlow: boolean): AssetDef => ({
  id: 'prop-airway',
  size: { w: 120, h: 280 },
  shapes: [
    { k: 'rect', x: -52, y: -130, w: 16, h: 260, fill: PALETTE.grey, stroke: blocked ? PALETTE.coral : PALETTE.ink },
    { k: 'rect', x: 36, y: -130, w: 16, h: 260, fill: PALETTE.grey, stroke: blocked ? PALETTE.coral : PALETTE.ink },
    ...(blocked
      ? ([
          // the cap, lodged
          { k: 'path', d: 'M -32 30 L -32 -30 Q -32 -48 0 -50 Q 32 -48 32 -30 L 32 30 Z', fill: PALETTE.teal, stroke: PALETTE.ink },
          // the vent channel through it
          {
            k: 'rect', x: -7, y: -52, w: 14, h: 84,
            fill: ventFlow ? PALETTE.paper : PALETTE.paperShade,
            stroke: PALETTE.ink, rough: 'detail', sw: 2,
          },
        ] as Shape[])
      : []),
  ],
});

export const AirwayTube: React.FC<PropArgs & { blocked?: boolean; ventFlow?: boolean }> = ({
  blocked = false,
  ventFlow = false,
  seed = 'airway',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={airwayDef(blocked, ventFlow)} variant={`${seed}:${blocked}${ventFlow}`} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// books
// ---------------------------------------------------------------------------

/** A book, open or shut. `wear` yellows the pages and frays the edges. Origin at its centre. */
const bookDef = (open: boolean, wear: number, cover: string): AssetDef => {
  const page = wear > 0.5 ? PALETTE.paperShade : PALETTE.paper;
  return {
    id: 'prop-book',
    size: { w: open ? 230 : 130, h: 150 },
    shapes: open
      ? [
          { k: 'polygon', pts: [[-114, -56], [-4, -44], [-4, 56], [-114, 62]], fill: page, stroke: PALETTE.ink },
          { k: 'polygon', pts: [[114, -56], [4, -44], [4, 56], [114, 62]], fill: page, stroke: PALETTE.ink },
          { k: 'line', x1: 0, y1: -46, x2: 0, y2: 58, sw: 4 },
          // text as ruled marks, never as letters
          ...[-30, -14, 2, 18].map((y): Shape => ({
            k: 'line', x1: -100, y1: y, x2: -16, y2: y - 2, rough: 'detail', sw: 2, single: true, opacity: 0.55,
          })),
          ...[-30, -14, 2, 18].map((y): Shape => ({
            k: 'line', x1: 16, y1: y - 2, x2: 100, y2: y, rough: 'detail', sw: 2, single: true, opacity: 0.55,
          })),
        ]
      : [
          { ...roundedRect(-58, -72, 116, 144, 4), fill: cover, stroke: PALETTE.ink },
          { k: 'rect', x: -50, y: -66, w: 8, h: 132, fill: page, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 },
          { k: 'line', x1: -30, y1: -30, x2: 30, y2: -30, rough: 'detail', sw: 3, single: true, opacity: 0.7 },
          { k: 'line', x1: -22, y1: -14, x2: 22, y2: -14, rough: 'detail', sw: 3, single: true, opacity: 0.7 },
        ],
  };
};

export const Book: React.FC<
  PropArgs & { open?: boolean; wear?: number; cover?: string }
> = ({ open = false, wear = 0.8, cover = PALETTE.violet, seed = 'book', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={bookDef(open, wear, cover)} variant={`${seed}:${open}`} />
  </PropFrame>
);

/**
 * A book in section, layers exploded apart: page stack, ink, spine glue, stitching.
 *
 * `spread` pushes the layers apart so each can be labelled separately — which is the only
 * way to name four materials in four seconds without four separate drawings.
 */
const bookCutawayDef = (spread: number, focus: string): AssetDef => {
  const lit = (which: string) => (focus === which ? PALETTE.coral : PALETTE.grey);
  return {
    id: 'prop-book-cutaway',
    size: { w: 240, h: 200 },
    shapes: [
      // page stack
      { k: 'rect', x: -100, y: -30 - spread, w: 200, h: 44, fill: focus === 'paper' ? PALETTE.gold : PALETTE.paperShade, stroke: PALETTE.ink },
      ...[-20, -10, 0].map((dy): Shape => ({
        k: 'line', x1: -94, y1: dy - spread, x2: 94, y2: dy - spread, rough: 'detail', sw: 1.8, single: true, opacity: 0.5,
      })),
      // ink layer
      { k: 'rect', x: -90, y: 20, w: 180, h: 12, fill: lit('ink'), stroke: PALETTE.ink, rough: 'detail', sw: 2.2 },
      // glue layer
      { k: 'rect', x: -96, y: 40 + spread, w: 192, h: 14, fill: lit('glue'), stroke: PALETTE.ink, rough: 'detail', sw: 2.2 },
      // stitching
      ...Array.from({ length: 6 }, (_, i): Shape => ({
        k: 'line',
        x1: -80 + i * 32, y1: 62 + spread * 1.6,
        x2: -66 + i * 32, y2: 62 + spread * 1.6,
        rough: 'detail', sw: 3.4, single: true,
        stroke: focus === 'bindings' ? PALETTE.coral : PALETTE.ink,
      })),
    ],
  };
};

export const BookCutaway: React.FC<PropArgs & { spread?: number; focus?: string }> = ({
  spread = 0,
  focus = 'none',
  seed = 'book-cutaway',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={bookCutawayDef(Math.round(spread / 4) * 4, focus)}
      variant={`${seed}:${focus}`}
    />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// road
// ---------------------------------------------------------------------------

/**
 * One painted lane dash.
 *
 * `len` is in the scene's own units, so the highway episode can draw the same prop at the
 * length perspective suggests and at the length it really is — which is the entire argument
 * of that episode, made by passing a different number to one component.
 */
export const RoadDash: React.FC<PropArgs & { len?: number; thick?: number; color?: string }> = ({
  len = 120,
  thick = 18,
  color = PALETTE.paper,
  seed = 'road-dash',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={{
        id: 'prop-road-dash',
        size: { w: thick, h: len },
        shapes: [{ k: 'rect', x: -thick / 2, y: -len / 2, w: thick, h: len, fill: color, stroke: PALETTE.ink, rough: 'detail', sw: 2.4 }],
      }}
      variant={`${seed}:${Math.round(len)}`}
    />
  </PropFrame>
);

/**
 * A plain workbench, seen straight on. Origin sits on the TOP SURFACE.
 *
 * The `science` scene of old-book-smell was authored against a bench its storyboard describes
 * but nothing ever drew. Without it the book was placed at y=1200 — straddling the lab
 * background's 1204 horizon — so it read as floating at the wall/floor junction and overlapped
 * Mina, who stands beside it.
 *
 * Origin on the surface rather than at the centre is the whole point: a prop that sits on a
 * bench should be positioned relative to the surface it rests on, and every previous
 * placement bug on this channel has come from an origin that was not where the author assumed.
 * `legHeight` reaches down to the floor, so the caller sets the surface height and the bench
 * meets the ground on its own.
 */
const benchDef = (width: number, legHeight: number): AssetDef => {
  const half = width / 2;
  const inset = Math.min(46, width * 0.12);
  return {
    id: `prop-bench-${Math.round(width)}-${Math.round(legHeight)}`,
    size: { w: width + 20, h: legHeight + 40 },
    shapes: [
      // the slab, with a visible front edge so it reads as a surface rather than a line
      { k: 'rect', x: -half, y: 0, w: width, h: 24, fill: PALETTE.paper, stroke: PALETTE.ink },
      { k: 'line', x1: -half + 8, y1: 24, x2: half - 8, y2: 24, sw: 3, rough: 'detail', opacity: 0.5 },
      // legs
      { k: 'rect', x: -half + inset, y: 24, w: 22, h: legHeight, fill: PALETTE.paperShade, stroke: PALETTE.ink },
      { k: 'rect', x: half - inset - 22, y: 24, w: 22, h: legHeight, fill: PALETTE.paperShade, stroke: PALETTE.ink },
      // a stretcher between them, which is what makes it read as furniture and not two posts
      {
        k: 'line',
        x1: -half + inset + 22, y1: 24 + legHeight * 0.68,
        x2: half - inset - 22, y2: 24 + legHeight * 0.68,
        sw: 6,
      },
    ],
  };
};

export const LabBench: React.FC<PropArgs & { width?: number; legHeight?: number }> = ({
  width = 520, legHeight = 250, seed = 'bench', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={benchDef(width, legHeight)} variant={`${seed}:${width}`} />
  </PropFrame>
);
