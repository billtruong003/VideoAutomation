/**
 * backgrounds/everyday.tsx — the rooms batch 001 happens in.
 *
 * Same contract as `backgrounds/index.tsx`, and it is worth restating because it is what
 * keeps ten episodes looking like one channel:
 *
 *   - FULL STAGE: each component draws into the `0 0 1080 1920` space `Stage.tsx` sets up
 *     and returns a single `<g>`.
 *   - A wall is a rectangle, a horizon is a line. Nothing here is hand-wobbled; all of the
 *     drawn character arrives from `RoughShapes` applying the `background` token — thinner
 *     and looser than anything in the foreground, on purpose.
 *   - Big colour fields are plain `<rect>`s. Rough geometry is spent on EDGES only; a
 *     rough-generated 1080x1920 fill is thousands of segments for no visual gain.
 *   - `frame` drives transform-level drift ONLY. If it reached the geometry, every frame
 *     would miss the rough cache and the lines would boil.
 *
 * These rooms are UNDER-DRAWN deliberately. The character, the mechanism diagram and the
 * captions at y≈1442 are the story; a background competing for ink makes all three harder to
 * read. Every location reads as "a place" and never as a particular business — no names, no
 * logos, no real buildings, nothing to license.
 *
 * The diagram backgrounds (`CutawayVoid`, `SchematicVoid`) are almost empty by design: when
 * the screen is explaining a mechanism, the room is a distraction and the right amount of
 * room is none.
 */

import React from 'react';
import { RoughShapes } from '../assets/RoughAsset';
import type { Shape } from '../assets/shapes';
import { PALETTE } from '../style/tokens';
import { wobble } from '../lib/rand';
import type { BackgroundProps } from './index';

const W = 1080;
const H = 1920;
const BG = 'background' as const;

const sway = (key: string, frame: number, amp = 1.2): string =>
  `translate(${wobble(key, frame, 0.024, amp).toFixed(2)} ${wobble(`${key}:y`, frame, 0.019, amp * 0.6).toFixed(2)})`;

/** The floor line every one of these rooms shares — where wall meets ground. */
const horizonLine = (horizon: number): Shape => ({
  k: 'line', x1: -20, y1: horizon, x2: W + 20, y2: horizon, stroke: PALETTE.greyDeep, sw: 3, rough: BG,
});

const Room: React.FC<{
  id: string;
  frame: number;
  opacity: number;
  wall: string;
  floor: string;
  horizon: number;
  shapes: Shape[];
}> = ({ id, frame, opacity, wall, floor, horizon, shapes }) => (
  <g transform={sway(id, frame)} opacity={opacity}>
    <rect x={-20} y={-20} width={W + 40} height={horizon + 20} fill={wall} />
    <rect x={-20} y={horizon} width={W + 40} height={H - horizon + 20} fill={floor} />
    <RoughShapes shapes={[horizonLine(horizon), ...shapes]} id={id} />
  </g>
);

// ===========================================================================
// aircraft
// ===========================================================================

/** Cabin interior: curved wall, a seat back, an overhead line. The window is a PROP. */
const CABIN_SHAPES: Shape[] = [
  // the fuselage curve — one arc is all it takes to say "aeroplane"
  { k: 'path', d: `M -40 240 Q ${W / 2} 60 ${W + 40} 240`, stroke: PALETTE.greyDeep, sw: 3.2, rough: BG },
  // overhead lockers
  { k: 'path', d: `M -40 420 Q ${W / 2} 300 ${W + 40} 420`, stroke: PALETTE.greyDeep, sw: 2.6, rough: BG, opacity: 0.8 },
  // seat back in the foreground, bottom-left, so the shot reads as "in a seat"
  { k: 'rect', x: -120, y: 1320, w: 420, h: 700, fill: PALETTE.grey, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'rect', x: -100, y: 1360, w: 380, h: 190, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 2.4, rough: BG, opacity: 0.9 },
  // wall panel seams
  { k: 'line', x1: 760, y1: 300, x2: 760, y2: 1500, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.5 },
];

export const PlaneCabin: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-plane-cabin" frame={frame} opacity={opacity}
    wall={PALETTE.paperShade} floor={PALETTE.grey} horizon={1540} shapes={CABIN_SHAPES} />
);

// ===========================================================================
// the diagram voids
// ===========================================================================

/**
 * An almost empty page for a cutaway to sit on.
 *
 * Two faint construction lines and nothing else. They exist so the diagram does not float in
 * a vacuum — a mechanism drawn on blank paper reads as unfinished, while the same drawing
 * over a grid reads as deliberate.
 */
const gridShapes = (spacing: number, opacity: number): Shape[] => {
  const out: Shape[] = [];
  for (let x = spacing; x < W; x += spacing) {
    out.push({ k: 'line', x1: x, y1: 0, x2: x, y2: H, stroke: PALETTE.greyDeep, sw: 1.4, rough: BG, opacity });
  }
  for (let y = spacing; y < H; y += spacing) {
    out.push({ k: 'line', x1: 0, y1: y, x2: W, y2: y, stroke: PALETTE.greyDeep, sw: 1.4, rough: BG, opacity });
  }
  return out;
};

const CUTAWAY_GRID = gridShapes(180, 0.22);

export const CutawayVoid: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g transform={sway('bg-cutaway-void', frame, 0.6)} opacity={opacity}>
    <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={PALETTE.paper} />
    <RoughShapes shapes={CUTAWAY_GRID} id="bg-cutaway-void" />
  </g>
);

/** A cooler, cleaner void for the schematic scenes that should not feel playful. */
const SCHEMATIC_GRID = gridShapes(120, 0.16);

export const SchematicVoid: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g transform={sway('bg-schematic-void', frame, 0.4)} opacity={opacity}>
    <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={PALETTE.paperShade} />
    <RoughShapes shapes={SCHEMATIC_GRID} id="bg-schematic-void" />
  </g>
);

// ===========================================================================
// mall / escalator
// ===========================================================================

const MALL_SHAPES: Shape[] = [
  // a rank of shopfronts, drawn as openings rather than shops
  ...[80, 380, 680].map((x, i): Shape => ({
    k: 'rect', x, y: 520, w: 220, h: 420, fill: PALETTE.paperShade,
    stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.85 - i * 0.05,
  })),
  // ceiling girders
  ...[220, 320, 420].map((y): Shape => ({
    k: 'line', x1: -20, y1: y, x2: W + 20, y2: y, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.4,
  })),
  // an upper-floor rail
  { k: 'line', x1: -20, y1: 990, x2: W + 20, y2: 990, stroke: PALETTE.greyDeep, sw: 3, rough: BG, opacity: 0.7 },
];

export const MallInterior: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-mall" frame={frame} opacity={opacity}
    wall={PALETTE.paper} floor={PALETTE.paperShade} horizon={1480} shapes={MALL_SHAPES} />
);

// ===========================================================================
// forecourt
// ===========================================================================

const FORECOURT_SHAPES: Shape[] = [
  // canopy overhead — the thing that makes a forecourt a forecourt
  { k: 'rect', x: -40, y: 180, w: W + 80, h: 120, fill: PALETTE.grey, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'line', x1: 130, y1: 300, x2: 130, y2: 1180, stroke: PALETTE.greyDeep, sw: 4, rough: BG },
  { k: 'line', x1: 950, y1: 300, x2: 950, y2: 1180, stroke: PALETTE.greyDeep, sw: 4, rough: BG },
  // distant treeline, so the horizon is not a bare rule
  ...[60, 250, 470, 700, 900].map((x, i): Shape => ({
    k: 'ellipse', cx: x, cy: 930 - (i % 2) * 22, rx: 62, ry: 40,
    fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.5,
  })),
  // forecourt markings
  ...[1500, 1660, 1820].map((y): Shape => ({
    k: 'line', x1: 120, y1: y, x2: 960, y2: y, stroke: PALETTE.paper, sw: 4, rough: BG, opacity: 0.7,
  })),
];

/**
 * The horizon sits at 980 rather than 1180: with the action staged around y≈1350 the higher
 * horizon left roughly a thousand pixels of blank sky above everything, and the shot read as
 * bottom-heavy in every frame that did not happen to have a gag card in it.
 */
export const GasStation: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-gas-station" frame={frame} opacity={opacity}
    wall={PALETTE.teal} floor={PALETTE.greyDeep} horizon={980} shapes={FORECOURT_SHAPES} />
);

// ===========================================================================
// kitchen
// ===========================================================================

const KITCHEN_SHAPES: Shape[] = [
  // wall cupboards
  { k: 'rect', x: 60, y: 240, w: 420, h: 340, fill: PALETTE.paperShade, stroke: PALETTE.ink, sw: 2.8, rough: BG },
  { k: 'rect', x: 520, y: 240, w: 300, h: 340, fill: PALETTE.paperShade, stroke: PALETTE.ink, sw: 2.8, rough: BG },
  { k: 'line', x1: 270, y1: 250, x2: 270, y2: 570, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.7 },
  // tiled splashback — two lines, not a tile grid; a grid here would out-draw the character
  { k: 'line', x1: -20, y1: 760, x2: W + 20, y2: 760, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.45 },
  { k: 'line', x1: -20, y1: 900, x2: W + 20, y2: 900, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.45 },
  // the counter edge
  { k: 'rect', x: -40, y: 1180, w: W + 80, h: 34, fill: PALETTE.grey, stroke: PALETTE.ink, sw: 3, rough: BG },
];

export const KitchenCounter: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-kitchen" frame={frame} opacity={opacity}
    wall={PALETTE.paper} floor={PALETTE.paperShade} horizon={1214} shapes={KITCHEN_SHAPES} />
);

// ===========================================================================
// bedroom / workshop
// ===========================================================================

const BEDROOM_SHAPES: Shape[] = [
  { k: 'rect', x: 640, y: 380, w: 340, h: 640, fill: PALETTE.paperShade, stroke: PALETTE.ink, sw: 2.8, rough: BG },
  { k: 'line', x1: 810, y1: 390, x2: 810, y2: 1010, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.7 },
  // a bed corner, bottom-left
  { k: 'rect', x: -120, y: 1380, w: 460, h: 260, fill: PALETTE.violet, stroke: PALETTE.ink, sw: 3, rough: BG, opacity: 0.8 },
  { k: 'line', x1: 120, y1: 560, x2: 420, y2: 560, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.6 },
];

export const BedroomFloor: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-bedroom" frame={frame} opacity={opacity}
    wall={PALETTE.paper} floor={PALETTE.paperShade} horizon={1440} shapes={BEDROOM_SHAPES} />
);

const WORKSHOP_SHAPES: Shape[] = [
  // a workbench and hanging tools — 1800s without a single period detail
  { k: 'rect', x: 120, y: 1120, w: 840, h: 40, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'line', x1: 200, y1: 1160, x2: 200, y2: 1420, stroke: PALETTE.ink, sw: 4, rough: BG },
  { k: 'line', x1: 880, y1: 1160, x2: 880, y2: 1420, stroke: PALETTE.ink, sw: 4, rough: BG },
  ...[300, 420, 540].map((x): Shape => ({
    k: 'line', x1: x, y1: 300, x2: x, y2: 460, stroke: PALETTE.greyDeep, sw: 3, rough: BG, opacity: 0.7,
  })),
  { k: 'line', x1: 240, y1: 300, x2: 620, y2: 300, stroke: PALETTE.greyDeep, sw: 3, rough: BG },
];

export const OldWorkshop: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-workshop" frame={frame} opacity={opacity}
    wall={PALETTE.grey} floor={PALETTE.greyDeep} horizon={1420} shapes={WORKSHOP_SHAPES} />
);

// ===========================================================================
// road
// ===========================================================================

/**
 * A highway receding to a vanishing point.
 *
 * The perspective is the SUBJECT of that episode rather than set dressing, so the converging
 * edges are drawn honestly to a single vanishing point on the horizon. That is what lets the
 * scene show the same dash reading small in the distance and enormous up close without
 * cheating either one.
 */
const HIGHWAY_SHAPES: Shape[] = [
  { k: 'polygon', pts: [[-260, H], [430, 980], [650, 980], [1340, H]], fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  // verge marks
  { k: 'line', x1: -260, y1: H, x2: 430, y2: 980, stroke: PALETTE.paper, sw: 5, rough: BG, opacity: 0.8 },
  { k: 'line', x1: 1340, y1: H, x2: 650, y2: 980, stroke: PALETTE.paper, sw: 5, rough: BG, opacity: 0.8 },
  // distant hills
  ...[140, 420, 760, 1000].map((x, i): Shape => ({
    k: 'ellipse', cx: x, cy: 980 - (i % 2) * 30, rx: 200, ry: 74,
    fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.45,
  })),
];

export const HighwayRoad: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-highway" frame={frame} opacity={opacity}
    wall={PALETTE.teal} floor={PALETTE.grey} horizon={980} shapes={HIGHWAY_SHAPES} />
);

/** Standing beside the road rather than driving on it — for the scale comparison. */
const ROADSIDE_SHAPES: Shape[] = [
  { k: 'rect', x: -40, y: 1180, w: W + 80, h: 420, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'line', x1: -40, y1: 1600, x2: W + 20, y2: 1600, stroke: PALETTE.paper, sw: 5, rough: BG, opacity: 0.7 },
  ...[120, 500, 880].map((x): Shape => ({
    k: 'ellipse', cx: x, cy: 1120, rx: 160, ry: 60,
    fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.4,
  })),
];

export const HighwayRoadside: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-roadside" frame={frame} opacity={opacity}
    wall={PALETTE.teal} floor={PALETTE.grey} horizon={1180} shapes={ROADSIDE_SHAPES} />
);

/** Straight down on a single lane — where a measurement is actually readable. */
const TOPDOWN_SHAPES: Shape[] = [
  { k: 'rect', x: 120, y: -20, w: 840, h: H + 40, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'line', x1: 150, y1: -20, x2: 150, y2: H + 20, stroke: PALETTE.paper, sw: 6, rough: BG, opacity: 0.8 },
  { k: 'line', x1: 930, y1: -20, x2: 930, y2: H + 20, stroke: PALETTE.paper, sw: 6, rough: BG, opacity: 0.8 },
];

export const HighwayTopDown: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g transform={sway('bg-topdown', frame, 0.8)} opacity={opacity}>
    <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={PALETTE.grey} />
    <RoughShapes shapes={TOPDOWN_SHAPES} id="bg-topdown" />
  </g>
);

// ===========================================================================
// car interior
// ===========================================================================

const CAR_SHAPES: Shape[] = [
  // windscreen, taking the top half — the road is visible through it
  { k: 'path', d: `M 60 120 Q ${W / 2} 40 1020 120 L 1020 720 L 60 720 Z`, fill: PALETTE.teal, stroke: PALETTE.ink, sw: 3.4, rough: BG },
  // dash top
  { k: 'rect', x: -40, y: 720, w: W + 80, h: 180, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  // steering wheel, bottom-centre, cropped by frame
  { k: 'ellipse', cx: 540, cy: 1560, rx: 300, ry: 250, fill: 'none', stroke: PALETTE.ink, sw: 8, rough: BG },
  { k: 'ellipse', cx: 540, cy: 1560, rx: 90, ry: 76, fill: PALETTE.grey, stroke: PALETTE.ink, sw: 4, rough: BG },
  // A-pillars
  { k: 'line', x1: 60, y1: 120, x2: 20, y2: 900, stroke: PALETTE.ink, sw: 6, rough: BG },
  { k: 'line', x1: 1020, y1: 120, x2: 1060, y2: 900, stroke: PALETTE.ink, sw: 6, rough: BG },
];

export const CarInterior: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g transform={sway('bg-car', frame)} opacity={opacity}>
    <rect x={-20} y={-20} width={W + 40} height={H + 40} fill={PALETTE.paperShade} />
    <RoughShapes shapes={CAR_SHAPES} id="bg-car" />
  </g>
);

// ===========================================================================
// street / desk / library
// ===========================================================================

const STREET_SHAPES: Shape[] = [
  // building fronts, flat-on, no detail below the roofline
  ...[[40, 420], [360, 300], [700, 480]].map(([x, top], i): Shape => ({
    k: 'rect', x, y: top, w: 300, h: 900 - top + 300,
    fill: i % 2 ? PALETTE.paperShade : PALETTE.grey,
    stroke: PALETTE.ink, sw: 2.6, rough: BG, opacity: 0.9,
  })),
  // kerb
  { k: 'line', x1: -20, y1: 1300, x2: W + 20, y2: 1300, stroke: PALETTE.ink, sw: 4, rough: BG },
  // road camber marks
  ...[1500, 1700].map((y): Shape => ({
    k: 'line', x1: -20, y1: y, x2: W + 20, y2: y, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.4,
  })),
];

export const CityStreet: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-street" frame={frame} opacity={opacity}
    wall={PALETTE.teal} floor={PALETTE.greyDeep} horizon={1300} shapes={STREET_SHAPES} />
);

const DESK_SHAPES: Shape[] = [
  // the desk surface takes the lower two-thirds; the wall behind is nearly bare
  { k: 'rect', x: -40, y: 1100, w: W + 80, h: 40, fill: PALETTE.greyDeep, stroke: PALETTE.ink, sw: 3, rough: BG },
  // a notice board with nothing legible on it
  { k: 'rect', x: 640, y: 320, w: 340, h: 420, fill: PALETTE.paperShade, stroke: PALETTE.ink, sw: 2.8, rough: BG },
  ...[400, 470, 540].map((y): Shape => ({
    k: 'line', x1: 680, y1: y, x2: 900, y2: y, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.5,
  })),
  // a mug ring on the desk, because a clean desk reads as a render
  { k: 'circle', cx: 220, cy: 1320, r: 46, fill: 'none', stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.5 },
];

export const DeskSurface: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-desk" frame={frame} opacity={opacity}
    wall={PALETTE.paper} floor={PALETTE.grey} horizon={1140} shapes={DESK_SHAPES} />
);

/** Shelves of books, drawn as spines — a wall of vertical bars in three greys. */
const LIBRARY_SHAPES: Shape[] = (() => {
  const out: Shape[] = [];
  const shelfTops = [220, 620, 1020];
  const fills = [PALETTE.violet, PALETTE.teal, PALETTE.greyDeep, PALETTE.grey, PALETTE.gold];
  for (let s = 0; s < shelfTops.length; s++) {
    const y = shelfTops[s];
    out.push({ k: 'line', x1: 40, y1: y + 330, x2: 1040, y2: y + 330, stroke: PALETTE.ink, sw: 5, rough: BG });
    let x = 60;
    let i = 0;
    while (x < 1000) {
      // widths cycle through a fixed pattern rather than random ones, so the wall is stable
      const w = 26 + ((s * 7 + i * 5) % 4) * 12;
      out.push({
        k: 'rect', x, y: y + 40, w, h: 288,
        fill: fills[(s * 3 + i) % fills.length],
        stroke: PALETTE.ink, sw: 2, rough: BG, opacity: 0.75,
      });
      x += w + 8;
      i++;
    }
  }
  return out;
})();

export const LibraryShelf: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-library" frame={frame} opacity={opacity}
    wall={PALETTE.paperShade} floor={PALETTE.grey} horizon={1460} shapes={LIBRARY_SHAPES} />
);

/** A lab bench: one surface, one shelf, nothing branded, nothing complicated. */
const LAB_SHAPES: Shape[] = [
  { k: 'rect', x: -40, y: 1160, w: W + 80, h: 44, fill: PALETTE.paper, stroke: PALETTE.ink, sw: 3, rough: BG },
  { k: 'line', x1: 60, y1: 480, x2: 1020, y2: 480, stroke: PALETTE.greyDeep, sw: 4, rough: BG },
  ...[160, 300, 440].map((x): Shape => ({
    k: 'rect', x, y: 380, w: 56, h: 100, fill: PALETTE.teal, stroke: PALETTE.ink, sw: 2.4, rough: BG, opacity: 0.7,
  })),
];

export const ConservationLab: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <Room id="bg-lab" frame={frame} opacity={opacity}
    wall={PALETTE.paper} floor={PALETTE.paperShade} horizon={1204} shapes={LAB_SHAPES} />
);
