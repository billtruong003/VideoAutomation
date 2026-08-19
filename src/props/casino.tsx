/**
 * casino.tsx — the generic casino-floor prop set. V2: clean geometry, stylized by the renderer.
 *
 * Nothing here depicts a real venue, a real machine model or a real brand: these are the
 * *idea* of a slot machine, a chip, a wheel. In V1 that idea was chased by drawing badly
 * on purpose — lopsided beziers, offset fills, hand-picked jitter. V2 does the opposite:
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * A chip is a circle with six edge dashes. A die is a rounded square with round pips. A
 * slot machine is a cabinet, a glass panel, three windows, a button, a tray and a lever.
 * Every trace of hand-drawn-ness arrives later, from `RoughAsset`, identically for every
 * asset in the channel.
 *
 * Two conventions worth knowing before editing:
 *
 *  1. Anything that ROTATES or ANIMATES is its own `AssetDef`, placed inside a `<g
 *     transform="rotate(...)">`. The cached roughened geometry then never changes while
 *     the part moves. (The slot lever; see `time.tsx` for the same trick on clock hands.)
 *
 *  2. Anything that TOGGLES — the `lit` bulbs — keeps the SAME def `id` across both
 *     states. The id is the Rough.js seed, so sharing it means flipping the lights
 *     repaints the bulbs without redrawing them: the sketch stays put, only the fill
 *     changes. Two different ids would make the outlines jump on every flash.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE, FONTS } from '../style/tokens';
import { ring, spoke, roundedRect, TINY, type AssetDef, type Pt, type Shape } from '../assets/shapes';

// ---------------------------------------------------------------------------
// authoring helpers
// ---------------------------------------------------------------------------

/** Evenly spaced points along a straight edge, inset half a step from each end. */
const alongEdge = (a: Pt, b: Pt, count: number): Pt[] =>
  Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Pt;
  });

/** Evenly spaced points along a circular arc, inclusive of both ends — a marquee sweep. */
const alongArc = (
  cx: number,
  cy: number,
  r: number,
  count: number,
  fromDeg: number,
  toDeg: number,
): Pt[] =>
  Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });

/**
 * A run of marquee bulbs. Lit is a solid gold disc with an ink rim; unlit is a bare grey
 * outline — the whole visual difference between "open" and "closed".
 */
const bulbs = (pts: Pt[], r: number, lit: boolean, sw = 2.4): Shape[] =>
  pts.map(([cx, cy]) => ({
    k: 'circle' as const,
    cx,
    cy,
    r,
    fill: lit ? PALETTE.gold : undefined,
    stroke: lit ? PALETTE.ink : PALETTE.greyDeep,
    rough: 'detail' as const,
    sw,
    single: true,
  }));

// ---------------------------------------------------------------------------
// reel glyphs — geometric symbols, never letterforms
// ---------------------------------------------------------------------------

/** Five-point star: outer and inner rings of five, interleaved. */
const STAR_INNER = ring(0, 0, 4.2, 5, -54);
const STAR_PTS: Pt[] = ring(0, 0, 9.4, 5).flatMap((p, i) => [p, STAR_INNER[i]]);

const BAR_GLYPH: AssetDef = {
  id: 'prop-reel-bar',
  size: { w: 20, h: 20 },
  shapes: [
    { k: 'rect', x: -9, y: -4.6, w: 18, h: 9.2, fill: PALETTE.violet, rough: 'detail', sw: 2.6 },
    { k: 'line', x1: -6, y1: 0, x2: 6, y2: 0, stroke: PALETTE.paper, rough: 'detail', sw: 2, single: true },
  ],
};

const REEL_GLYPHS: Record<string, AssetDef> = {
  cherry: {
    id: 'prop-reel-cherry',
    size: { w: 20, h: 20 },
    shapes: [
      { k: 'curve', pts: [[-4, 3], [-1.4, -3.4], [2.6, -7.4], [5, -9]], rough: 'detail', sw: 2, single: true },
      { k: 'curve', pts: [[4.6, 4], [5.6, -2], [5.4, -6.6], [5, -9]], rough: 'detail', sw: 2, single: true },
      { k: 'circle', cx: -4, cy: 4.5, r: 3.8, fill: PALETTE.coral, rough: 'detail', sw: 2.4, ...TINY },
      { k: 'circle', cx: 4.6, cy: 5.6, r: 3.5, fill: PALETTE.coral, rough: 'detail', sw: 2.4, ...TINY },
    ],
  },
  bell: {
    id: 'prop-reel-bell',
    size: { w: 20, h: 20 },
    shapes: [
      { k: 'path', d: 'M -7 6 V -1 A 7 7 0 0 1 7 -1 V 6 Z', fill: PALETTE.gold, rough: 'detail', sw: 2.6 },
      { k: 'line', x1: -8.6, y1: 6, x2: 8.6, y2: 6, rough: 'detail', sw: 2.4, single: true },
      { k: 'circle', cx: 0, cy: 8.6, r: 2.2, fill: PALETTE.ink, rough: 'detail', sw: 2, ...TINY },
    ],
  },
  star: {
    id: 'prop-reel-star',
    size: { w: 20, h: 20 },
    shapes: [{ k: 'polygon', pts: STAR_PTS, fill: PALETTE.gold, rough: 'detail', sw: 2.6 }],
  },
  lemon: {
    id: 'prop-reel-lemon',
    size: { w: 20, h: 20 },
    shapes: [
      { k: 'ellipse', cx: 0, cy: 0.5, rx: 8, ry: 6.2, fill: PALETTE.gold, rough: 'detail', sw: 2.6 },
      { k: 'line', x1: 6.4, y1: -4, x2: 9.2, y2: -7.4, rough: 'detail', sw: 2, single: true },
    ],
  },
  diamond: {
    id: 'prop-reel-diamond',
    size: { w: 20, h: 20 },
    shapes: [
      { k: 'polygon', pts: [[0, -9.2], [8.2, 0], [0, 9.2], [-8.2, 0]], fill: PALETTE.teal, rough: 'detail', sw: 2.6 },
    ],
  },
  seven: {
    id: 'prop-reel-seven',
    size: { w: 20, h: 20 },
    shapes: [
      { k: 'polyline', pts: [[-6.4, -7.4], [7, -7.4], [0.4, 8.6]], rough: 'detail', sw: 3.2, single: true },
      { k: 'line', x1: -3.4, y1: 0.4, x2: 3.8, y2: 0.4, rough: 'detail', sw: 2.2, single: true },
    ],
  },
  bar: BAR_GLYPH,
};

const glyphFor = (kind: string): AssetDef => REEL_GLYPHS[kind] ?? BAR_GLYPH;

// ---------------------------------------------------------------------------
// slot machine — ~110 x 160, origin on the floor at its centre
// ---------------------------------------------------------------------------

const REEL_X = [-26, 0, 26];
const REEL_Y = -97;

/** Seven bulbs sweeping across the cabinet's crown. */
const SLOT_BULB_PTS = alongArc(0, -100, 48, 7, -158, -22);

const SLOT: AssetDef = {
  id: 'prop-slot-machine',
  size: { w: 110, h: 160 },
  shapes: [
    // cabinet
    { ...roundedRect(-52, -156, 104, 158, 12), fill: PALETTE.grey },
    // glass panel
    { ...roundedRect(-42, -126, 84, 58, 6), fill: PALETTE.paper, rough: 'detail', sw: 3.2 },
    // three reel windows
    ...REEL_X.map((cx) => ({
      ...roundedRect(cx - 11, -120, 22, 46, 3),
      fill: PALETTE.paperShade,
      rough: 'detail' as const,
      sw: 2.6,
    })),
    // spin button
    { k: 'circle', cx: 0, cy: -46, r: 13, fill: PALETTE.coral },
    // payout tray
    { ...roundedRect(-26, -26, 52, 18, 4), fill: PALETTE.greyDeep, rough: 'detail', sw: 3 },
  ],
};

/** Both bulb states share one id, so lighting up never redraws the sketch. */
const SLOT_BULBS_LIT: AssetDef = { id: 'prop-slot-bulbs', shapes: bulbs(SLOT_BULB_PTS, 5, true) };
const SLOT_BULBS_OFF: AssetDef = { id: 'prop-slot-bulbs', shapes: bulbs(SLOT_BULB_PTS, 5, false) };

/** The lever is its own def because it rotates — see the file header. */
const lever = (knob: string): AssetDef => ({
  id: 'prop-slot-lever',
  size: { w: 18, h: 44 },
  shapes: [
    { k: 'line', x1: 0, y1: 2, x2: 0, y2: -30, rough: 'detail', sw: 4.2 },
    { k: 'circle', cx: 0, cy: -37, r: 8, fill: knob, rough: 'detail', sw: 3 },
  ],
});
const SLOT_LEVER_LIT = lever(PALETTE.gold);
const SLOT_LEVER_OFF = lever(PALETTE.coral);

export type SlotSymbols = [string, string, string];

type SlotArtProps = {
  lit: boolean;
  reelSymbols: readonly [string, string, string];
  leverAngle: number;
  /** Seed namespace, so two machines in one shot are the same object drawn twice. */
  ns: string;
};

/** The machine itself, without a frame — shared by the single machine and the row. */
const SlotArt: React.FC<SlotArtProps> = ({ lit, reelSymbols, leverAngle, ns }) => (
  <>
    <RoughAsset def={SLOT} variant={ns} />
    {reelSymbols.map((kind, i) => (
      <g key={i} transform={`translate(${REEL_X[i]} ${REEL_Y})`}>
        <RoughAsset def={glyphFor(kind)} variant={`${ns}-r${i}`} />
      </g>
    ))}
    <RoughAsset def={lit ? SLOT_BULBS_LIT : SLOT_BULBS_OFF} variant={ns} />
    <g transform={`translate(52 -112) rotate(${leverAngle})`}>
      <RoughAsset def={lit ? SLOT_LEVER_LIT : SLOT_LEVER_OFF} variant={ns} />
    </g>
  </>
);

/** A generic upright slot machine — three reels, one button, one lever. */
export const SlotMachine: React.FC<
  PropArgs & {
    lit?: boolean;
    reelSymbols?: SlotSymbols;
    leverAngle?: number;
  }
> = ({
  lit = false,
  reelSymbols = ['cherry', 'seven', 'bar'],
  leverAngle = 0,
  seed = 'slot-machine',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <SlotArt lit={lit} reelSymbols={reelSymbols} leverAngle={leverAngle} ns={seed} />
  </PropFrame>
);

const ROW_GLYPHS: ReadonlyArray<readonly [string, string, string]> = [
  ['cherry', 'seven', 'bar'],
  ['bell', 'bell', 'star'],
  ['lemon', 'bar', 'diamond'],
  ['seven', 'seven', 'cherry'],
  ['star', 'lemon', 'bell'],
];

/** A row of slot machines receding slightly — the "endless floor" filler. */
export const SlotMachineRow: React.FC<PropArgs & { count?: number; lit?: boolean }> = ({
  count = 3,
  lit = false,
  seed = 'slot-row',
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <PropFrame seed={seed} {...rest}>
      {Array.from({ length: n }, (_, i) => {
        const s = 1 - i * 0.055;
        const x = (i - (n - 1) / 2) * 106;
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${(-i * 3.5).toFixed(2)}) scale(${s.toFixed(3)})`}>
            <SlotArt
              lit={lit}
              reelSymbols={ROW_GLYPHS[i % ROW_GLYPHS.length]}
              leverAngle={i % 3 === 1 ? 14 : -4}
              ns={`${seed}-${i}`}
            />
          </g>
        );
      })}
    </PropFrame>
  );
};

// ---------------------------------------------------------------------------
// chips
// ---------------------------------------------------------------------------

/** Six edge dashes — the one detail that makes a disc read as a chip instantly. */
const CHIP_DASHES: Shape[] = [0, 60, 120, 180, 240, 300].map((deg) => ({
  ...spoke(0, 0, 8.6, 13.2, deg),
  stroke: PALETTE.paper,
  rough: 'detail' as const,
  sw: 3,
  single: true,
}));

const chipDef = (color: string): AssetDef => ({
  id: 'prop-casino-chip',
  size: { w: 26, h: 26 },
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: 13, fill: color },
    ...CHIP_DASHES,
    { k: 'circle', cx: 0, cy: 0, r: 7.2, rough: 'detail', sw: 2.6, single: true },
  ],
});

/** A single casino chip, ~26 units across, with the classic edge dashes. */
export const CasinoChip: React.FC<PropArgs & { color?: string }> = ({
  color = PALETTE.coral,
  seed = 'casino-chip',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={chipDef(color)} variant={seed} />
  </PropFrame>
);

/** One chip seen edge-on. Its own def so a stack is N cheap instances of one drawing. */
const chipDiscDef = (color: string): AssetDef => ({
  id: 'prop-chip-disc',
  size: { w: 26, h: 9 },
  shapes: [
    { k: 'ellipse', cx: 0, cy: 0, rx: 13, ry: 4.6, fill: color, rough: 'detail', sw: 3.2 },
  ],
});

const DEFAULT_STACK: readonly string[] = [
  PALETTE.coral,
  PALETTE.gold,
  PALETTE.teal,
  PALETTE.violet,
  PALETTE.coral,
];

/** A stack of chips seen edge-on — the winnings, or what's left of them. */
export const ChipStack: React.FC<PropArgs & { count?: number; colors?: string[] }> = ({
  count = 5,
  colors,
  seed = 'chip-stack',
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  const tones = colors && colors.length > 0 ? colors : (DEFAULT_STACK as string[]);
  return (
    <PropFrame seed={seed} {...rest}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(0 ${(-i * 7.4).toFixed(2)})`}>
          <RoughAsset def={chipDiscDef(tones[i % tones.length])} variant={`${seed}-${i}`} />
        </g>
      ))}
    </PropFrame>
  );
};

// ---------------------------------------------------------------------------
// roulette — ~140 wide, seen flat-on from above
// ---------------------------------------------------------------------------

const WHEEL = { cx: -34, cy: -1, rx: 27, ry: 14, hubRx: 13, hubRy: 6.6 };

/** A pocket divider: hub edge to rim, along the wheel's ellipse. */
const pocketDivider = (deg: number): Shape => {
  const a = (deg * Math.PI) / 180;
  return {
    k: 'line',
    x1: WHEEL.cx + Math.cos(a) * WHEEL.hubRx,
    y1: WHEEL.cy + Math.sin(a) * WHEEL.hubRy,
    x2: WHEEL.cx + Math.cos(a) * WHEEL.rx,
    y2: WHEEL.cy + Math.sin(a) * WHEEL.ry,
    rough: 'detail',
    sw: 2.2,
    single: true,
  };
};

/** The betting layout — three rows, three columns, drawn as plain rules. */
const BET_GRID: Shape[] = [
  ...[-16, -3, 10].map((y) => ({
    k: 'line' as const, x1: 6, y1: y, x2: 63, y2: y,
    stroke: PALETTE.inkSoft, rough: 'detail' as const, sw: 2, single: true,
  })),
  ...[21, 40].map((x) => ({
    k: 'line' as const, x1: x, y1: -18, x2: x, y2: 12,
    stroke: PALETTE.inkSoft, rough: 'detail' as const, sw: 2, single: true,
  })),
];

const ROULETTE: AssetDef = {
  id: 'prop-roulette-table',
  size: { w: 140, h: 54 },
  shapes: [
    { k: 'ellipse', cx: 0, cy: 0, rx: 70, ry: 27, fill: PALETTE.grey },
    ...BET_GRID,
    { k: 'ellipse', cx: WHEEL.cx, cy: WHEEL.cy, rx: WHEEL.rx, ry: WHEEL.ry, fill: PALETTE.gold },
    ...[0, 45, 90, 135, 180, 225, 270, 315].map(pocketDivider),
    { k: 'ellipse', cx: WHEEL.cx, cy: WHEEL.cy, rx: WHEEL.hubRx, ry: WHEEL.hubRy, fill: PALETTE.paperShade, rough: 'detail', sw: 2.8 },
    // the ball, resting in a pocket
    { k: 'circle', cx: -24, cy: -9.5, r: 3, fill: PALETTE.coral, rough: 'detail', sw: 2, ...TINY },
  ],
};

/** A flat-on roulette table with its wheel — the anchor prop for the floor shots. */
export const RouletteTable: React.FC<PropArgs> = ({ seed = 'roulette-table', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={ROULETTE} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// cards & dice
// ---------------------------------------------------------------------------

const CARD: AssetDef = {
  id: 'prop-playing-card',
  size: { w: 25, h: 42 },
  shapes: [{ ...roundedRect(-12.5, -21, 25, 42, 3), fill: PALETTE.paper, rough: 'detail', sw: 3.4 }],
};

/** Generic pip suits — two lobes and a point. No card-brand marks anywhere. */
const SUIT_SPADE: AssetDef = {
  id: 'prop-suit-spade',
  size: { w: 15, h: 18 },
  shapes: [
    { k: 'polygon', pts: [[0, -8.4], [6.6, 2], [-6.6, 2]], fill: PALETTE.ink, rough: 'detail', sw: 1.8, single: true },
    { k: 'circle', cx: -3.4, cy: 1, r: 3.6, fill: PALETTE.ink, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'circle', cx: 3.4, cy: 1, r: 3.6, fill: PALETTE.ink, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'polygon', pts: [[-2.6, 8.6], [0, 3], [2.6, 8.6]], fill: PALETTE.ink, rough: 'detail', sw: 1.8, single: true },
  ],
};

const SUIT_HEART: AssetDef = {
  id: 'prop-suit-heart',
  size: { w: 15, h: 18 },
  shapes: [
    { k: 'circle', cx: -3.3, cy: -2.6, r: 3.8, fill: PALETTE.coral, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'circle', cx: 3.3, cy: -2.6, r: 3.8, fill: PALETTE.coral, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'polygon', pts: [[-7, -1.4], [7, -1.4], [0, 8.8]], fill: PALETTE.coral, rough: 'detail', sw: 1.8, single: true },
  ],
};

const SUIT_DIAMOND: AssetDef = {
  id: 'prop-suit-diamond',
  size: { w: 14, h: 18 },
  shapes: [
    { k: 'polygon', pts: [[0, -8.8], [6.4, 0.2], [0, 9], [-6.4, 0.2]], fill: PALETTE.coral, rough: 'detail', sw: 1.8, single: true },
  ],
};

const SUITS: readonly AssetDef[] = [SUIT_SPADE, SUIT_HEART, SUIT_DIAMOND];

/** [x, y, rotation] per card. Fanned spreads them; otherwise they sit in a near-stack. */
const FANNED: ReadonlyArray<readonly [number, number, number]> = [
  [-16, 3, -24],
  [0, -2, -3],
  [16.5, 2.5, 19],
];
const STACKED: ReadonlyArray<readonly [number, number, number]> = [
  [-4.5, 1.5, -6],
  [0, 0, -1],
  [4.5, -1.5, 5],
];

/** Three playing cards with doodled suits — no real card faces, no brand marks. */
export const PlayingCards: React.FC<PropArgs & { fanned?: boolean }> = ({
  fanned = false,
  seed = 'playing-cards',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    {(fanned ? FANNED : STACKED).map(([x, y, rot], i) => (
      <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
        <RoughAsset def={CARD} variant={`${seed}-${i}`} />
        <g transform="translate(0 -1)">
          <RoughAsset def={SUITS[i % SUITS.length]} variant={`${seed}-${i}`} />
        </g>
      </g>
    ))}
  </PropFrame>
);

export type Pips = 1 | 2 | 3 | 4 | 5 | 6;

const PIP_LAYOUT: Record<Pips, Pt[]> = {
  1: [[0, 0]],
  2: [[-7, -7], [7, 7]],
  3: [[-7, -7], [0, 0], [7, 7]],
  4: [[-7, -7], [7, -7], [-7, 7], [7, 7]],
  5: [[-7, -7], [7, -7], [0, 0], [-7, 7], [7, 7]],
  6: [[-7, -7], [7, -7], [-7, 0], [7, 0], [-7, 7], [7, 7]],
};

const dieDef = (n: Pips): AssetDef => ({
  id: `prop-dice-${n}`,
  size: { w: 30, h: 30 },
  shapes: [
    { ...roundedRect(-14, -14, 28, 28, 5), fill: PALETTE.paper },
    ...PIP_LAYOUT[n].map(([cx, cy]) => ({
      k: 'circle' as const,
      cx,
      cy,
      r: 2.9,
      fill: PALETTE.ink,
      stroke: PALETTE.ink,
      rough: 'detail' as const,
      sw: 1.2,
      ...TINY,
    })),
  ],
});

const DICE: Record<Pips, AssetDef> = {
  1: dieDef(1), 2: dieDef(2), 3: dieDef(3), 4: dieDef(4), 5: dieDef(5), 6: dieDef(6),
};

/** A single die, ~30 units, showing `pips` — the "one more roll" prop. */
export const Dice: React.FC<PropArgs & { pips?: Pips }> = ({ pips = 5, seed = 'dice', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={DICE[pips]} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// signage & ceiling
// ---------------------------------------------------------------------------

/** A board with an arrow point on the right — the shape of every roadside marquee. */
const SIGN: AssetDef = {
  id: 'prop-casino-sign-board',
  size: { w: 124, h: 52 },
  shapes: [
    { k: 'polygon', pts: [[-62, -26], [32, -26], [62, 0], [32, 26], [-62, 26]], fill: PALETTE.grey },
  ],
};

const SIGN_BULB_PTS: Pt[] = [
  ...alongEdge([-57, -20], [30, -20], 5),
  ...alongEdge([32, -20], [53, 0], 2),
  ...alongEdge([53, 0], [32, 20], 2),
  ...alongEdge([30, 20], [-57, 20], 5),
  ...alongEdge([-57, 20], [-57, -20], 2),
];

const SIGN_BULBS_LIT: AssetDef = { id: 'prop-casino-sign-bulbs', shapes: bulbs(SIGN_BULB_PTS, 3.4, true, 2) };
const SIGN_BULBS_OFF: AssetDef = { id: 'prop-casino-sign-bulbs', shapes: bulbs(SIGN_BULB_PTS, 3.4, false, 2) };

/**
 * A generic illuminated arrow marquee. The board tone stays constant so the bulbs carry
 * the whole "open / closed" read, and the one word on it is a category, not a venue.
 */
export const CasinoSign: React.FC<PropArgs & { lit?: boolean }> = ({
  lit = false,
  seed = 'casino-sign',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={SIGN} variant={seed} />
    <RoughAsset def={lit ? SIGN_BULBS_LIT : SIGN_BULBS_OFF} variant={seed} />
    <text
      x={-13}
      y={10}
      textAnchor="middle"
      fontFamily={FONTS.display}
      fontSize={30}
      fill={lit ? PALETTE.ink : PALETTE.greyDeep}
    >
      CASINO
    </text>
  </PropFrame>
);

/** Stem and housing — the part of a downlight that does not change when it is switched. */
const DOWNLIGHT: AssetDef = {
  id: 'prop-ceiling-light',
  size: { w: 24, h: 30 },
  shapes: [
    { k: 'line', x1: 0, y1: -16, x2: 0, y2: -1, rough: 'detail', sw: 3 },
    { k: 'polygon', pts: [[-11, -1], [11, -1], [8, 13], [-8, 13]], fill: PALETTE.greyDeep, rough: 'detail', sw: 3 },
  ],
};

/** The lamp itself. Same id in both states — see the file header. */
const lampDef = (lit: boolean): AssetDef => ({
  id: 'prop-ceiling-lamp',
  shapes: [
    { k: 'ellipse', cx: 0, cy: 13, rx: 7.6, ry: 3.4, fill: lit ? PALETTE.gold : PALETTE.grey, rough: 'detail', sw: 2.4 },
  ],
});
const LAMP_LIT = lampDef(true);
const LAMP_OFF = lampDef(false);

/** A row of ceiling downlights — the enclosed, windowless, no-clock ceiling. */
export const CeilingLightRow: React.FC<PropArgs & { count?: number; lit?: boolean }> = ({
  count = 5,
  lit = true,
  seed = 'ceiling-lights',
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <PropFrame seed={seed} {...rest}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${((i - (n - 1) / 2) * 82).toFixed(2)} 0)`}>
          <RoughAsset def={DOWNLIGHT} variant={`${seed}-${i}`} />
          <RoughAsset def={lit ? LAMP_LIT : LAMP_OFF} variant={`${seed}-${i}`} />
        </g>
      ))}
    </PropFrame>
  );
};
