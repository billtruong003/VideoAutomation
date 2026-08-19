/**
 * backgrounds/index.tsx — the six rooms this channel keeps returning to. V2.
 *
 * FULL STAGE: every component here draws into the same `0 0 1080 1920` SVG space that
 * `Stage.tsx` sets up, returns a single `<g>`, and a scene drops it in behind its
 * foreground art.
 *
 * V2 contract — DESIGN CLEANLY, RENDER IMPERFECTLY:
 *
 *   - A wall is a rectangle. A ceiling seam is a line. A window is a rectangle with one
 *     mullion. Nothing below is hand-wobbled, and there are no jitter tables, no lumpy
 *     "potato" helpers, no wonky-line generators. All of the drawn character arrives from
 *     `RoughShapes` applying the `background` roughness token — thin, loose, and
 *     deliberately weaker than anything in the foreground.
 *   - Big colour fields are plain SVG `<rect>`s. A rough-generated 1080x1920 fill is
 *     thousands of segments for zero visual gain; rough geometry is spent only on EDGES
 *     and on objects that must read as drawn.
 *   - `frame` drives transform-level drift ONLY (translate / rotate / scale on a `<g>`).
 *     It never reaches the geometry handed to the stylizer — if it did, every frame would
 *     miss the rough cache and the lines would boil.
 *
 * These rooms are under-drawn on purpose. The character and the captions (y ~1442) are the
 * story; a background that competes for ink makes both harder to read. Every architecture
 * reads as "a place", never a particular venue — no names, no logos, no real buildings.
 *
 * Anything a scene needs to change (`lit`, `intensity`, hung wall items) is a prop.
 */

import React from 'react';
import { RoughShapes } from '../assets/RoughAsset';
import type { Shape } from '../assets/shapes';
import { PALETTE } from '../style/tokens';
import { hashString, rand01, valueNoise, wobble } from '../lib/rand';

/** Shared contract: every background can breathe with the frame and fade as a whole. */
export type BackgroundProps = {
  frame?: number;
  opacity?: number;
};

const W = 1080;
const H = 1920;

/** Deterministic [0,1) from a seed plus a key — never `Math.random()`. */
const r01 = (seed: string, key: string): number => rand01(hashString(`${seed}:${key}`));

/**
 * A whole-background sway of about a pixel, applied as a translate on the root `<g>`.
 * Backgrounds should feel drawn on the same shaky page as the character, but they must
 * never draw attention by moving — and this must stay a transform, never geometry.
 */
const sway = (key: string, frame: number, amp = 1.2): string =>
  `translate(${wobble(key, frame, 0.024, amp).toFixed(2)} ${wobble(`${key}:y`, frame, 0.019, amp * 0.6).toFixed(2)})`;

/** Every background edge is drawn with the same loose, thin architectural hand. */
const BG = 'background' as const;

// ===========================================================================
// CasinoEntrance — the way in, seen head-on, with an unbranded sign over the door
// ===========================================================================

const ENTRANCE_ID = 'bg-casino-entrance';

const ENTRANCE_SHAPES: Shape[] = [
  // facade outline — the fill underneath is a plain rect
  { k: 'rect', x: 88, y: 292, w: 904, h: 1224, stroke: PALETTE.greyDeep, sw: 2.6, rough: BG },
  // parapet, so the roofline reads as built rather than cropped
  { k: 'line', x1: 88, y1: 336, x2: 992, y2: 336, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.7 },

  // doorway — the only dark hole in the wall, so the eye goes straight in
  { k: 'rect', x: 392, y: 1008, w: 300, h: 508, fill: PALETTE.nightWall, stroke: PALETTE.ink, sw: 2.8, rough: BG },
  { k: 'line', x1: 542, y1: 1014, x2: 542, y2: 1510, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.75 },

  // generic sign — squiggle "text", so it never names anything
  { k: 'rect', x: 344, y: 596, w: 396, h: 158, fill: PALETTE.gold, stroke: PALETTE.ink, sw: 2.8, rough: BG, opacity: 0.9 },
  { k: 'line', x1: 388, y1: 646, x2: 690, y2: 646, stroke: PALETTE.inkSoft, sw: 2.4, rough: BG, opacity: 0.55 },
  { k: 'line', x1: 402, y1: 688, x2: 664, y2: 688, stroke: PALETTE.inkSoft, sw: 2.4, rough: BG, opacity: 0.55 },
  { k: 'line', x1: 424, y1: 726, x2: 622, y2: 726, stroke: PALETTE.inkSoft, sw: 2.4, rough: BG, opacity: 0.55 },

  // ground line and one step, so the building sits on something
  { k: 'line', x1: -20, y1: 1516, x2: 1100, y2: 1512, stroke: PALETTE.greyDeep, sw: 2.6, rough: BG },
  { k: 'line', x1: 300, y1: 1594, x2: 800, y2: 1590, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.6 },
];

/** Six sign bulbs — deterministic sizes, evenly spaced. Cheap casino glitter. */
const ENTRANCE_BULBS: Shape[] = Array.from({ length: 6 }, (_, i): Shape => {
  const t = i % 3;
  return {
    k: 'circle',
    cx: 380 + t * 162,
    cy: i < 3 ? 574 : 776,
    r: 9 + r01(ENTRANCE_ID, `bulb${i}`) * 3,
    fill: PALETTE.gold,
    stroke: PALETTE.ink,
    sw: 2,
    rough: BG,
    opacity: 0.8,
  };
});

/** The way in: a generic entrance seen head-on, with an unbranded sign over the door. */
export const CasinoEntrance: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g opacity={opacity} transform={sway(`${ENTRANCE_ID}:sway`, frame)}>
    {/* flat fields: open air above the roofline, pavement below, facade between */}
    <rect x={0} y={0} width={W} height={340} fill={PALETTE.grey} opacity={0.3} />
    <rect x={0} y={1512} width={W} height={H - 1512} fill={PALETTE.paperShade} opacity={0.85} />
    <rect x={88} y={292} width={904} height={1224} fill={PALETTE.paperShade} />
    <RoughShapes id={ENTRANCE_ID} shapes={ENTRANCE_SHAPES} />
    <RoughShapes id={`${ENTRANCE_ID}-bulbs`} shapes={ENTRANCE_BULBS} />
  </g>
);

// ===========================================================================
// TraditionalFloor — sealed box, low ceiling, no windows, nothing to tell time by
// ===========================================================================

const TRAD_ID = 'bg-traditional-floor';
const TRAD_CEILING = 300;
const TRAD_BASE = 1258;

const TRAD_SHAPES: Shape[] = [
  // the ceiling seam, drawn LOW on purpose — that is the whole point of this room
  { k: 'line', x1: -20, y1: TRAD_CEILING, x2: 1100, y2: TRAD_CEILING + 4, stroke: PALETTE.nightFloor, sw: 3.2, rough: BG },
  // the walls close in slightly, so the box reads as enclosed
  { k: 'line', x1: 74, y1: TRAD_CEILING + 4, x2: 44, y2: TRAD_BASE, stroke: PALETTE.nightFloor, sw: 2.4, rough: BG, opacity: 0.8 },
  { k: 'line', x1: 1006, y1: TRAD_CEILING + 2, x2: 1038, y2: TRAD_BASE, stroke: PALETTE.nightFloor, sw: 2.4, rough: BG, opacity: 0.8 },
  // wall/floor seam
  { k: 'line', x1: -20, y1: TRAD_BASE, x2: 1100, y2: TRAD_BASE - 8, stroke: PALETTE.ink, sw: 2.6, rough: BG, opacity: 0.8 },

  // three dim ceiling fittings — light exists here, daylight does not
  { k: 'ellipse', cx: 250, cy: 188, rx: 96, ry: 26, fill: PALETTE.greyDeep, stroke: PALETTE.nightFloor, sw: 2, rough: BG, opacity: 0.3 },
  { k: 'ellipse', cx: 546, cy: 172, rx: 88, ry: 24, fill: PALETTE.greyDeep, stroke: PALETTE.nightFloor, sw: 2, rough: BG, opacity: 0.26 },
  { k: 'ellipse', cx: 848, cy: 190, rx: 92, ry: 25, fill: PALETTE.greyDeep, stroke: PALETTE.nightFloor, sw: 2, rough: BG, opacity: 0.3 },

  // two blank wall panels — texture without anything worth looking at
  { k: 'line', x1: 190, y1: 470, x2: 190, y2: 1210, stroke: PALETTE.nightFloor, sw: 2, rough: BG, opacity: 0.45 },
  { k: 'line', x1: 890, y1: 470, x2: 890, y2: 1206, stroke: PALETTE.nightFloor, sw: 2, rough: BG, opacity: 0.45 },
];

/** Four floor seams converging away from camera. Nothing more happens down here. */
const TRAD_FLOOR_SEAMS: Shape[] = Array.from({ length: 4 }, (_, i): Shape => ({
  k: 'line',
  x1: -60 + i * 400,
  y1: H + 20,
  x2: 300 + i * 170,
  y2: TRAD_BASE + 6,
  stroke: PALETTE.nightWall,
  sw: 2.2,
  rough: BG,
  opacity: 0.7,
}));

/** The old-school floor: sealed box, low ceiling, no windows, nothing to tell time by. */
export const TraditionalFloor: React.FC<
  BackgroundProps & { wallItems?: React.ReactNode }
> = ({ frame = 0, opacity = 1, wallItems }) => (
  <g opacity={opacity} transform={sway(`${TRAD_ID}:sway`, frame, 1)}>
    {/* flat fields: dark wall everywhere, darker ceiling pressing down, floor below */}
    <rect x={0} y={0} width={W} height={H} fill={PALETTE.nightWall} />
    <rect x={0} y={0} width={W} height={TRAD_CEILING} fill={PALETTE.ink} opacity={0.35} />
    <rect x={0} y={TRAD_BASE} width={W} height={H - TRAD_BASE} fill={PALETTE.nightFloor} />
    <RoughShapes id={TRAD_ID} shapes={TRAD_SHAPES} />
    <RoughShapes id={`${TRAD_ID}-seams`} shapes={TRAD_FLOOR_SEAMS} />
    {/* whatever the scene wants hung on that wall — a clock, or pointedly nothing */}
    {wallItems}
  </g>
);

// ===========================================================================
// SlotArea — a bank of machines receding into the room, under a run of ceiling lights
// ===========================================================================

const SLOT_ID = 'bg-slot-area';
const SLOT_BASE = 1280;

/** Five ceiling fittings in a run. `glow` is the only thing `lit` changes. */
const slotLights = (glow: string, lit: boolean): Shape[] =>
  Array.from({ length: 5 }, (_, i): Shape => ({
    k: 'ellipse',
    cx: 140 + i * 200,
    cy: 168 + Math.round(r01(SLOT_ID, `ly${i}`) * 18),
    rx: 62,
    ry: 20,
    fill: glow,
    stroke: PALETTE.nightFloor,
    sw: 2,
    rough: BG,
    opacity: lit ? 0.55 : 0.28,
  }));

/**
 * Two banks of three, receding. Silhouettes only — deep enough that the eye reads
 * "rows and rows" without a single machine being worth a second look.
 * Drawn far-to-near so the near ones overlap correctly.
 */
const slotMachines = (glow: string, lit: boolean): Shape[] =>
  [2, 1, 0].flatMap((i) =>
    [-1, 1].flatMap((side): Shape[] => {
      const k = 1 - i * 0.18;
      const w = 178 * k;
      const h = 448 * k;
      const jitter = (r01(SLOT_ID, `y${side}${i}`) - 0.5) * 14;
      const x = side < 0 ? 28 + i * 106 : 1052 - i * 106 - w;
      const y = 1580 - i * 100 - h + jitter;
      return [
        {
          k: 'rect', x, y, w, h,
          fill: PALETTE.nightWall,
          stroke: PALETTE.nightFloor,
          sw: 2.2,
          rough: BG,
          opacity: 0.6 + k * 0.3,
        },
        {
          k: 'rect',
          x: x + w * 0.18,
          y: y + h * 0.16,
          w: w * 0.64,
          h: h * 0.28,
          fill: glow,
          stroke: 'none',
          rough: BG,
          opacity: lit ? 0.5 : 0.2,
        },
      ];
    }),
  );

/** The aisle running away from camera, plus the seam it stands on. */
const SLOT_AISLE: Shape[] = [
  { k: 'line', x1: 430, y1: H + 10, x2: 512, y2: 1180, stroke: PALETTE.nightWall, sw: 2.2, rough: BG, opacity: 0.8 },
  { k: 'line', x1: 660, y1: H + 10, x2: 574, y2: 1180, stroke: PALETTE.nightWall, sw: 2.2, rough: BG, opacity: 0.8 },
  { k: 'line', x1: -20, y1: SLOT_BASE, x2: 1100, y2: SLOT_BASE - 6, stroke: PALETTE.nightWall, sw: 2.4, rough: BG, opacity: 0.7 },
];

/** A bank of machines receding into the room, with a run of ceiling lights over it. */
export const SlotArea: React.FC<BackgroundProps & { lit?: boolean }> = ({
  frame = 0,
  opacity = 1,
  lit = true,
}) => {
  const glow = lit ? PALETTE.gold : PALETTE.greyDeep;
  const ns = lit ? `${SLOT_ID}-lit` : `${SLOT_ID}-dark`;
  return (
    <g opacity={opacity} transform={sway(`${SLOT_ID}:sway`, frame, 1.1)}>
      <rect x={0} y={0} width={W} height={SLOT_BASE} fill={PALETTE.nightWall} />
      <rect x={0} y={SLOT_BASE} width={W} height={H - SLOT_BASE} fill={PALETTE.nightFloor} />
      <RoughShapes id={`${ns}-lights`} shapes={slotLights(glow, lit)} />
      <RoughShapes id={`${ns}-machines`} shapes={slotMachines(glow, lit)} />
      <RoughShapes id={`${SLOT_ID}-aisle`} shapes={SLOT_AISLE} />
    </g>
  );
};

// ===========================================================================
// TimeDistortionVoid — no room at all: a violet field of rings, for when time stops
// ===========================================================================

const VOID_ID = 'bg-time-distortion-void';
const VOID_CX = 540;
const VOID_CY = 920;
const VOID_SEED = hashString(VOID_ID);

/**
 * Seven concentric rings. The radii vary by value noise on the ring INDEX — a fixed,
 * frame-independent scatter — so the whole field can spin and breathe as a transform
 * while the roughened geometry underneath stays cached.
 */
const VOID_RINGS: Shape[] = Array.from({ length: 7 }, (_, i): Shape => {
  const r = 150 + i * 132 + valueNoise(i * 1.7, VOID_SEED) * 30;
  return {
    k: 'ellipse',
    cx: VOID_CX,
    cy: VOID_CY,
    rx: r * 1.06,
    ry: r * 0.84,
    stroke: PALETTE.violet,
    sw: 2.6,
    rough: BG,
    opacity: 0.5 - i * 0.035,
  };
});

/** Three loose arcs, so the field swirls instead of merely pulsing. */
const VOID_SWIRLS: Shape[] = Array.from({ length: 3 }, (_, i): Shape => ({
  k: 'arc',
  cx: VOID_CX,
  cy: VOID_CY,
  rx: 300 + i * 210,
  ry: 250 + i * 170,
  start: 20 + i * 118,
  stop: 210 + i * 118,
  stroke: PALETTE.violet,
  sw: 2.2,
  rough: 'accent',
  opacity: 0.3,
}));

/** No room at all: a violet field of warped rings, for when time stops behaving. */
export const TimeDistortionVoid: React.FC<BackgroundProps & { intensity?: number }> = ({
  frame = 0,
  opacity = 1,
  intensity = 0.6,
}) => {
  const amt = Math.max(0, Math.min(1, intensity));
  // intensity and frame touch only opacity and transforms — never the geometry above,
  // or every interpolated intensity value would mint a fresh set of rough paths.
  const spin = frame * 0.05;
  const breath = 1 + Math.sin(frame * 0.028) * 0.03 * (0.4 + amt);
  return (
    <g opacity={opacity}>
      <rect x={0} y={0} width={W} height={H} fill={PALETTE.violet} opacity={0.14 + amt * 0.14} />
      <g transform={`rotate(${spin.toFixed(2)} ${VOID_CX} ${VOID_CY})`} opacity={0.45 + amt * 0.55}>
        <g
          transform={`translate(${VOID_CX} ${VOID_CY}) scale(${breath.toFixed(4)}) translate(${-VOID_CX} ${-VOID_CY})`}
        >
          <RoughShapes id={`${VOID_ID}-rings`} shapes={VOID_RINGS} />
        </g>
      </g>
      <g transform={`rotate(${(-spin * 0.6).toFixed(2)} ${VOID_CX} ${VOID_CY})`} opacity={0.4 + amt * 0.6}>
        <RoughShapes id={`${VOID_ID}-swirls`} shapes={VOID_SWIRLS} />
      </g>
    </g>
  );
};

// ===========================================================================
// ModernCasino — the opposite room: high ceiling, open floor, daylight through glass
// ===========================================================================

const MODERN_ID = 'bg-modern-casino';
const MODERN_CEILING = 172;
const MODERN_BASE = 1440;

/** Three tall windows. The whole twist of the episode lives in this wall. */
const MODERN_WINDOWS: Shape[] = [0, 1, 2].flatMap((i): Shape[] => {
  const x = 86 + i * 316;
  const y = 306 + Math.round(r01(MODERN_ID, `wy${i}`) * 12);
  const w = 268;
  const h = 560;
  return [
    { k: 'rect', x, y, w, h, fill: PALETTE.teal, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.32 },
    { k: 'line', x1: x + 6, y1: y + h * 0.5, x2: x + w - 6, y2: y + h * 0.5, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.6 },
  ];
});

const MODERN_SHAPES: Shape[] = [
  // the ceiling is drawn HIGH and light, with two beams running back
  { k: 'line', x1: -20, y1: MODERN_CEILING, x2: 1100, y2: MODERN_CEILING - 8, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.7 },
  { k: 'line', x1: 130, y1: MODERN_CEILING + 6, x2: 404, y2: 264, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.45 },
  { k: 'line', x1: 950, y1: MODERN_CEILING + 6, x2: 676, y2: 264, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.45 },

  // daylight falling in — two faint slants, no gradient, no glow
  { k: 'line', x1: 200, y1: 880, x2: 384, y2: MODERN_BASE, stroke: PALETTE.teal, sw: 2.4, rough: BG, opacity: 0.25 },
  { k: 'line', x1: 672, y1: 880, x2: 856, y2: MODERN_BASE, stroke: PALETTE.teal, sw: 2.4, rough: BG, opacity: 0.25 },

  // low, sparse furniture far away — the floor is mostly empty space, and that is the point
  { k: 'ellipse', cx: 214, cy: 1352, rx: 96, ry: 24, fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.5 },
  { k: 'ellipse', cx: 552, cy: 1368, rx: 88, ry: 22, fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.5 },
  { k: 'ellipse', cx: 884, cy: 1348, rx: 80, ry: 21, fill: PALETTE.grey, stroke: PALETTE.greyDeep, sw: 2, rough: BG, opacity: 0.5 },

  // wall/floor seam
  { k: 'line', x1: -20, y1: MODERN_BASE, x2: 1100, y2: MODERN_BASE - 8, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.75 },
];

/** The opposite room: high ceiling, open floor, and daylight coming in through glass. */
export const ModernCasino: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g opacity={opacity} transform={sway(`${MODERN_ID}:sway`, frame, 1)}>
    {/* everything stays near paper value — this room is about air, not ink */}
    <rect x={0} y={0} width={W} height={H} fill={PALETTE.paper} opacity={0.92} />
    <rect x={0} y={MODERN_BASE} width={W} height={H - MODERN_BASE} fill={PALETTE.paperShade} opacity={0.9} />
    <RoughShapes id={`${MODERN_ID}-windows`} shapes={MODERN_WINDOWS} />
    <RoughShapes id={MODERN_ID} shapes={MODERN_SHAPES} />
  </g>
);

// ===========================================================================
// OutsideWorld — daylight and ordinary life, the world that shrinks while you're in there
// ===========================================================================

const OUTSIDE_ID = 'bg-outside-world';
const HORIZON = 1190;

/** Two ordinary buildings with a few windows each. Nowhere in particular. */
const OUTSIDE_BUILDINGS: Shape[] = [
  { x: 120, y: 690, w: 250 },
  { x: 392, y: 856, w: 196 },
].flatMap((b, bi): Shape[] => [
  {
    k: 'rect', x: b.x, y: b.y, w: b.w, h: HORIZON - b.y,
    fill: PALETTE.paperShade, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG,
  },
  ...Array.from({ length: 2 }, (_, i): Shape => ({
    k: 'rect',
    x: b.x + 44 + i * b.w * 0.42,
    y: b.y + 70,
    w: b.w * 0.24,
    h: 62,
    fill: PALETTE.greyDeep,
    stroke: 'none',
    rough: BG,
    opacity: 0.3 + r01(OUTSIDE_ID, `w${bi}${i}`) * 0.12,
  })),
]);

const OUTSIDE_SHAPES: Shape[] = [
  { k: 'line', x1: -20, y1: HORIZON, x2: 1100, y2: HORIZON - 8, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG },
  // the sun is a circle. It gets its lopsidedness from the stylizer, not from me.
  { k: 'circle', cx: 858, cy: 268, r: 74, fill: PALETTE.gold, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.65 },

  // one tree, so outside reads as somewhere you would actually want to be
  { k: 'polyline', pts: [[806, 1186], [800, 1060], [812, 962]], stroke: PALETTE.ink, sw: 2.8, rough: BG, opacity: 0.6 },
  { k: 'line', x1: 804, y1: 1092, x2: 748, y2: 1052, stroke: PALETTE.ink, sw: 2.2, rough: BG, opacity: 0.5 },
  { k: 'ellipse', cx: 806, cy: 908, rx: 122, ry: 96, fill: PALETTE.teal, stroke: PALETTE.greyDeep, sw: 2.4, rough: BG, opacity: 0.4 },

  // two path scratches on the ground, nothing else
  { k: 'line', x1: 120, y1: 1340, x2: 700, y2: 1300, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.4 },
  { k: 'line', x1: 640, y1: 1460, x2: 1020, y2: 1430, stroke: PALETTE.greyDeep, sw: 2.2, rough: BG, opacity: 0.4 },
];

/** Daylight and ordinary life outside — the world that shrinks while you are in there. */
export const OutsideWorld: React.FC<BackgroundProps> = ({ frame = 0, opacity = 1 }) => (
  <g opacity={opacity} transform={sway(`${OUTSIDE_ID}:sway`, frame, 1.3)}>
    {/* sky and ground: two flat bands, the simplest possible outdoors */}
    <rect x={0} y={0} width={W} height={HORIZON} fill={PALETTE.teal} opacity={0.16} />
    <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill={PALETTE.grey} opacity={0.5} />
    <RoughShapes id={`${OUTSIDE_ID}-buildings`} shapes={OUTSIDE_BUILDINGS} />
    <RoughShapes id={OUTSIDE_ID} shapes={OUTSIDE_SHAPES} />
  </g>
);
