/**
 * casino.tsx — the generic casino-floor prop set.
 *
 * Nothing here depicts a real venue, a real machine model or a real brand: these are
 * the *idea* of a slot machine, a chip, a wheel — scribbled fast, coloured past the
 * lines. Anything a scene needs to animate (lights on, lever pulled, reels showing a
 * particular glyph) is a prop of the component, never internal state.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE, FONTS } from '../lib/style';
import { DoodleProp, type DoodlePropProps } from '../components/DoodleProp';

/** The wrapper contract minus `children` — every prop below draws its own art. */
type PropArgs = Omit<DoodlePropProps, 'children'>;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * A lopsided bezier "potato" — the channel's stand-in for a circle. `k` picks a
 * different deterministic squash so two potatoes side by side are never twins.
 */
const potato = (cx: number, cy: number, rx: number, ry: number, k = 0): string => {
  const C = 0.5523;
  const J = [1.07, 0.93, 1.04, 0.96, 1.05, 0.95];
  const j = (i: number) => J[(i + k) % J.length];
  const rR = rx * j(0);
  const rT = ry * j(1);
  const rL = rx * j(2);
  const rB = ry * j(3);
  const n = (v: number) => v.toFixed(2);
  const xR = cx + rR;
  const xL = cx - rL;
  const yT = cy - rT;
  const yB = cy + rB;
  return [
    `M ${n(xR)} ${n(cy + ry * 0.05)}`,
    `C ${n(xR)} ${n(cy - rT * C)} ${n(cx + rR * C)} ${n(yT)} ${n(cx - rx * 0.05)} ${n(yT)}`,
    `C ${n(cx - rL * C)} ${n(yT)} ${n(xL)} ${n(cy - rB * C)} ${n(xL)} ${n(cy + ry * 0.03)}`,
    `C ${n(xL)} ${n(cy + rB * C)} ${n(cx - rL * C)} ${n(yB)} ${n(cx + rx * 0.04)} ${n(yB)}`,
    `C ${n(cx + rR * C)} ${n(yB)} ${n(xR)} ${n(cy + rT * C)} ${n(xR)} ${n(cy + ry * 0.05)}`,
    'Z',
  ].join(' ');
};

/** Many potatoes welded into one path `d`, so a ring of bulbs costs 2 elements. */
const potatoes = (pts: ReadonlyArray<readonly [number, number]>, rx: number, ry: number): string =>
  pts.map(([cx, cy], i) => potato(cx, cy, rx, ry, i)).join(' ');

// ---------------------------------------------------------------------------
// slot machine
// ---------------------------------------------------------------------------

/** One reel glyph — a shape, never a letterform, so it reads at thumbnail size. */
const ReelGlyph: React.FC<{ kind: string }> = ({ kind }) => {
  const out = (d: string, w: number = STROKE.propFine) => (
    <path d={d} stroke={PALETTE.ink} strokeWidth={w} {...HAND_STROKE} />
  );
  switch (kind) {
    case 'cherry': {
      const d = potato(-4, 4.5, 3.9, 3.5, 0) + ' ' + potato(4.6, 5.6, 3.6, 3.3, 3);
      return (
        <>
          <path d={d} fill={PALETTE.coral} transform="translate(1.4 1.2)" />
          {out(d)}
          {out('M -3.4 1.2 C -2 -4 1.2 -7.2 5.2 -8.2 M 4.4 2.4 C 5.2 -2 5.6 -5.6 5.2 -8.2', STROKE.fine)}
        </>
      );
    }
    case 'bell': {
      const d =
        'M 0.4 -9 C 5.2 -8.4 7.6 -4 7.1 1 C 6.9 4 7.6 5.6 8.6 6.6 L -8.4 6.9 ' +
        'C -7.3 5.7 -6.7 4 -6.9 1 C -7.4 -4.2 -4.6 -8.6 0.4 -9 Z';
      return (
        <>
          <path d={d} fill={PALETTE.gold} transform="translate(1.6 1.4)" />
          {out(d)}
          <path d={potato(0.2, 9, 2.4, 2, 2)} fill={PALETTE.ink} />
        </>
      );
    }
    case 'star': {
      const d =
        'M 0 -9.4 L 2.7 -2.9 L 9.5 -2.3 L 4.2 2 L 6.1 8.7 L -0.2 4.8 ' +
        'L -5.8 8.9 L -4.1 2 L -9.4 -2.7 L -2.6 -3.1 Z';
      return (
        <>
          <path d={d} fill={PALETTE.gold} transform="translate(1.5 1.4)" />
          {out(d)}
        </>
      );
    }
    case 'lemon': {
      const d = potato(0, 0.5, 8, 6.2, 2);
      return (
        <>
          <path d={d} fill={PALETTE.gold} transform="translate(1.6 1.3)" />
          {out(d)}
          {out('M 6.8 -4.4 C 8.6 -6.4 9.4 -7.2 9.8 -8.4', STROKE.fine)}
        </>
      );
    }
    case 'diamond': {
      const d =
        'M 0.3 -9.2 C 3.2 -4 6.2 -1 8.2 0.2 C 5 2.2 2 5.2 0 9.2 ' +
        'C -2.2 5 -5.2 2 -8.2 0 C -5 -1.2 -2.8 -4.2 0.3 -9.2 Z';
      return (
        <>
          <path d={d} fill={PALETTE.teal} transform="translate(1.5 1.4)" />
          {out(d)}
        </>
      );
    }
    case 'seven':
      return (
        <>
          {out('M -6.4 -7.4 L 7.2 -8 L 0.4 8.6', STROKE.prop)}
          {out('M -3.2 0.6 L 4 0.2', STROKE.fine)}
        </>
      );
    default: {
      // "bar" — the safe fallback for any unknown glyph name
      const d = 'M -9.2 -4.4 L 9 -5 L 9.6 4 L -8.6 4.8 Z';
      return (
        <>
          <path d={d} fill={PALETTE.violet} transform="translate(1.6 1.4)" />
          {out(d)}
          {out('M -6 0.2 L 6.6 -0.4', STROKE.fine)}
        </>
      );
    }
  }
};

const SLOT_BODY =
  'M -50 3 C -54 -28 -55.5 -78 -53 -116 C -52 -140 -43 -151 -21 -154.5 ' +
  'C 2 -158 25 -156.5 40.5 -151 C 52 -147 55.5 -135 54 -113.5 ' +
  'C 52 -76 51 -28 49 2.5 Z';

const SLOT_PANEL = 'M -41 -120 L 40 -122.5 L 42.5 -70 L -39 -67 Z';

const slotWindow = (cx: number, i: number) =>
  `M ${cx - 11.5} ${-113 - i * 0.6} L ${cx + 11} ${-114.5 - i * 0.4} ` +
  `L ${cx + 10.6} ${-77 + i * 0.5} L ${cx - 11.8} ${-75.6 + i * 0.6} Z`;

const SLOT_WINDOWS = [-26, -0.5, 25].map((cx, i) => slotWindow(cx, i)).join(' ');

const SLOT_BULB_POS: ReadonlyArray<readonly [number, number]> = [
  [-45, -128],
  [-38.5, -142],
  [-23, -151.5],
  [-3, -155],
  [17, -153],
  [34.5, -146],
  [46, -134],
];
const SLOT_BULBS = potatoes(SLOT_BULB_POS, 5.4, 5);

const SLOT_TRAY = 'M -25 -22 L 24.5 -24 L 26 -8 L -26 -6 Z';

type SlotArtProps = {
  lit: boolean;
  reelSymbols: readonly [string, string, string];
  leverAngle: number;
};

/** The slot machine drawing itself, shared by the single machine and the row. */
const SlotMachineArt: React.FC<SlotArtProps> = ({ lit, reelSymbols, leverAngle }) => {
  const ink = PALETTE.ink;
  const bulbTone = lit ? PALETTE.gold : PALETTE.greyDeep;
  return (
    <>
      {/* cabinet */}
      <path d={SLOT_BODY} fill={PALETTE.grey} transform="translate(2.6 2.2)" />
      <path d={SLOT_BODY} fill="none" stroke={ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />

      {/* glass panel */}
      <path d={SLOT_PANEL} fill={PALETTE.paper} transform="translate(2.2 1.8)" />
      <path d={SLOT_PANEL} fill="none" stroke={ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />

      {/* three reel windows */}
      <path d={SLOT_WINDOWS} fill={PALETTE.paperShade} transform="translate(2 1.6)" />
      <path d={SLOT_WINDOWS} fill="none" stroke={ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />

      <g transform="translate(-26 -95)">
        <ReelGlyph kind={reelSymbols[0]} />
      </g>
      <g transform="translate(-0.5 -95.5) rotate(-3)">
        <ReelGlyph kind={reelSymbols[1]} />
      </g>
      <g transform="translate(25 -94.5) rotate(2)">
        <ReelGlyph kind={reelSymbols[2]} />
      </g>

      {/* big round button */}
      <path d={potato(-1, -45, 14.5, 12.5, 1)} fill={PALETTE.coral} transform="translate(2.4 2)" />
      <path d={potato(-1, -45, 14.5, 12.5, 1)} fill="none" stroke={ink} strokeWidth={STROKE.prop} />
      <path d="M -9 -50 C -6 -53.5 0 -54.5 5 -52.5" stroke={PALETTE.paper} strokeWidth={STROKE.fine} {...HAND_STROKE} />

      {/* payout tray */}
      <path d={SLOT_TRAY} fill={PALETTE.greyDeep} transform="translate(2.2 2)" />
      <path d={SLOT_TRAY} fill="none" stroke={ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />

      {/* marquee bulbs */}
      <path d={SLOT_BULBS} fill={lit ? PALETTE.gold : 'none'} transform={lit ? 'translate(1.8 1.6)' : undefined} />
      <path d={SLOT_BULBS} fill="none" stroke={lit ? ink : bulbTone} strokeWidth={STROKE.propFine} />

      {/* pull lever — pivots on the cabinet's right shoulder */}
      <g transform={`translate(53 -110) rotate(${leverAngle})`}>
        <path d="M 0 2 C 7 -8 13 -20 17.5 -33" stroke={ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
        <path d={potato(18.5, -36, 8, 7.4, 2)} fill={lit ? PALETTE.gold : PALETTE.coral} transform="translate(2 1.8)" />
        <path d={potato(18.5, -36, 8, 7.4, 2)} fill="none" stroke={ink} strokeWidth={STROKE.propFine} />
      </g>
    </>
  );
};

/** A generic upright slot machine — three reels, one button, one lever. */
export const SlotMachine: React.FC<
  PropArgs & {
    lit?: boolean;
    reelSymbols?: [string, string, string];
    leverAngle?: number;
  }
> = ({ lit = false, reelSymbols = ['cherry', 'seven', 'bar'], leverAngle = 0, ...rest }) => (
  <DoodleProp seed="slot-machine" {...rest}>
    <SlotMachineArt lit={lit} reelSymbols={reelSymbols} leverAngle={leverAngle} />
  </DoodleProp>
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
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <DoodleProp seed="slot-row" {...rest}>
      {Array.from({ length: n }, (_, i) => {
        const s = 1 - i * 0.055;
        const x = (i - (n - 1) / 2) * 104 + i * 2.5;
        return (
          <g
            key={i}
            transform={`translate(${x.toFixed(2)} ${(-i * 3.5).toFixed(2)}) scale(${s.toFixed(3)}) rotate(${(i % 2 === 0 ? -0.9 : 1.2).toFixed(2)})`}
          >
            <SlotMachineArt
              lit={lit}
              reelSymbols={ROW_GLYPHS[i % ROW_GLYPHS.length]}
              leverAngle={i % 3 === 1 ? 14 : -4}
            />
          </g>
        );
      })}
    </DoodleProp>
  );
};

// ---------------------------------------------------------------------------
// chips
// ---------------------------------------------------------------------------

const CHIP_OUT = potato(0, 0, 13, 12.4, 0);
const CHIP_IN = potato(0.4, 0.3, 7.2, 6.8, 3);
/** Six edge dashes at hand-drawn angles — the thing that says "chip" instantly. */
const CHIP_DASHES = [0, 62, 118, 178, 242, 302]
  .map((deg, i) => {
    const a = ((deg + i * 1.4) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M ${(c * 8.4).toFixed(2)} ${(s * 8).toFixed(2)} L ${(c * 13.4).toFixed(2)} ${(s * 12.6).toFixed(2)}`;
  })
  .join(' ');

/** A single casino chip, ~26 units across, with the classic edge dashes. */
export const CasinoChip: React.FC<PropArgs & { color?: string }> = ({
  color = PALETTE.coral,
  ...rest
}) => (
  <DoodleProp seed="casino-chip" {...rest}>
    <path d={CHIP_OUT} fill={color} transform="translate(2.2 1.9)" />
    <path d={CHIP_OUT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} />
    <path d={CHIP_DASHES} stroke={PALETTE.paper} strokeWidth={STROKE.detail} {...HAND_STROKE} />
    <path d={CHIP_IN} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} />
  </DoodleProp>
);

const CHIP_DISC = potato(0, 0, 13, 4.6, 1);
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
  colors = DEFAULT_STACK as string[],
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  const tones = colors.length > 0 ? colors : (DEFAULT_STACK as string[]);
  return (
    <DoodleProp seed="chip-stack" {...rest}>
      {Array.from({ length: n }, (_, i) => {
        // stacked bottom-up, each chip nudged so the tower leans like a real one
        const y = -i * 7.4;
        const x = i * 0.7 - (i % 2) * 1.4;
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(i % 2 === 0 ? -1.1 : 1.3).toFixed(2)})`}>
            <path d={CHIP_DISC} fill={tones[i % tones.length]} transform="translate(2 1.6)" />
            <path d={CHIP_DISC} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} />
          </g>
        );
      })}
    </DoodleProp>
  );
};

// ---------------------------------------------------------------------------
// roulette
// ---------------------------------------------------------------------------

const TABLE_TOP = potato(0, 0, 70, 27, 0);
const WHEEL_OUT = potato(-34, -1, 27, 14, 2);
const WHEEL_IN = potato(-34, -1, 13, 6.6, 4);
/** Eight pocket dividers, drawn as one path so the wheel stays cheap. */
const WHEEL_SPOKES = [0, 45, 90, 135, 180, 225, 270, 315]
  .map((deg, i) => {
    const a = ((deg + i * 2) * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M ${(-34 + c * 13).toFixed(2)} ${(-1 + s * 6.6).toFixed(2)} L ${(-34 + c * 26.4).toFixed(2)} ${(-1 + s * 13.6).toFixed(2)}`;
  })
  .join(' ');
const BET_GRID =
  'M 6 -16 C 26 -19 48 -18.5 63 -14 M 5 -3 C 26 -6 48 -5 63 -1 M 6 10 C 26 7.5 47 8 61 12 ' +
  'M 20 -18 C 21.5 -6 21 3 20.5 12 M 40 -18.5 C 41 -6 41.5 3 40 12';

/** A flat-on roulette table with its wheel — the anchor prop for the floor shots. */
export const RouletteTable: React.FC<PropArgs> = (rest) => (
  <DoodleProp seed="roulette-table" {...rest}>
    <path d={TABLE_TOP} fill={PALETTE.grey} transform="translate(2.6 2.2)" />
    <path d={TABLE_TOP} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} />
    <path d={BET_GRID} stroke={PALETTE.inkSoft} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    <path d={WHEEL_OUT} fill={PALETTE.gold} transform="translate(2.2 1.8)" />
    <path d={WHEEL_OUT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} />
    <path d={WHEEL_SPOKES} stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    <path d={WHEEL_IN} fill={PALETTE.paperShade} transform="translate(1.6 1.2)" />
    <path d={WHEEL_IN} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} />
    <path d={potato(-24, -9.5, 3.2, 2.6, 1)} fill={PALETTE.coral} stroke={PALETTE.ink} strokeWidth={STROKE.fine} />
  </DoodleProp>
);

// ---------------------------------------------------------------------------
// cards & dice
// ---------------------------------------------------------------------------

const CARD_D =
  'M -12.5 -19 C -12.5 -20.8 -11 -21.6 -8.6 -21.4 L 10 -20 ' +
  'C 12.2 -19.8 13 -18.6 12.8 -16.4 L 11 17.8 C 10.8 20 9.4 20.8 7 20.6 ' +
  'L -10.4 19.2 C -12.4 19 -13.2 17.8 -13 15.8 Z';

const SUIT_SPADE =
  'M 0 -8 C 4 -3.4 8 -0.6 7.4 3 C 7 5.8 3.4 6.6 0.6 4.4 C 1 7 1.6 8.6 3 10 ' +
  'L -3.4 9.6 C -1.8 8.2 -1.2 6.6 -1 4 C -3.8 6 -7.4 5 -7.6 2.2 C -7.8 -1.4 -3.8 -3.6 0 -8 Z';
const SUIT_HEART =
  'M 0 9.6 C -6.4 3.4 -8.4 0.6 -7.6 -3 C -6.8 -6.6 -1.8 -7 0.2 -3 ' +
  'C 2.4 -7.2 7.2 -6.4 7.8 -2.8 C 8.4 0.8 6 3.6 0 9.6 Z';
const SUIT_DIAMOND = 'M 0.2 -8.6 C 3 -3 5.6 -0.6 7.6 0.4 C 5 2 2.4 4.8 0 9 C -2.4 4.6 -5 2 -7.4 0.2 C -4.6 -1 -2.4 -3.8 0.2 -8.6 Z';

const SUITS: ReadonlyArray<readonly [string, string]> = [
  [SUIT_SPADE, PALETTE.ink],
  [SUIT_HEART, PALETTE.coral],
  [SUIT_DIAMOND, PALETTE.coral],
];

/** Two or three playing cards with doodled suits — no real card faces, no brand marks. */
export const PlayingCards: React.FC<PropArgs & { fanned?: boolean }> = ({ fanned = false, ...rest }) => {
  const layout = fanned
    ? [
        [-16, 3, -24],
        [0, -2, -3],
        [16.5, 2.5, 19],
      ]
    : [
        [-4.5, 1.5, -6],
        [0, 0, -1],
        [4.5, -1.5, 5],
      ];
  return (
    <DoodleProp seed="playing-cards" {...rest}>
      {layout.map((slot, i) => {
        const suit = SUITS[i % SUITS.length];
        return (
          <g key={i} transform={`translate(${slot[0]} ${slot[1]}) rotate(${slot[2]})`}>
            <path d={CARD_D} fill={PALETTE.paper} transform="translate(2.2 1.8)" />
            <path d={CARD_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
            <path d={suit[0]} fill={suit[1]} transform="translate(0 -1)" />
          </g>
        );
      })}
    </DoodleProp>
  );
};

const DIE_D =
  'M -14 -11.5 C -14 -14 -12.4 -15.4 -9.4 -15.2 L 10.5 -14.2 ' +
  'C 13.4 -14 14.8 -12.4 14.6 -9.4 L 13.8 10.6 C 13.6 13.6 12 15 9 14.8 ' +
  'L -10 13.8 C -13 13.6 -14.4 12 -14.2 9 Z';

const PIP_LAYOUT: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [[-7, -7], [7.5, 6.5]],
  3: [[-7, -7], [0.2, -0.3], [7.5, 6.5]],
  4: [[-7, -7], [7, -6.6], [-6.6, 7], [7.4, 6.8]],
  5: [[-7, -7], [7, -6.6], [0.2, -0.3], [-6.6, 7], [7.4, 6.8]],
  6: [[-7, -7.4], [7, -6.6], [-7.2, -0.2], [7.2, 0.3], [-6.6, 7], [7.4, 6.8]],
};

/** A single die, ~30 units, showing `pips` — the "one more roll" prop. */
export const Dice: React.FC<PropArgs & { pips?: number }> = ({ pips = 5, ...rest }) => {
  const n = Math.min(6, Math.max(1, Math.round(pips)));
  const layout = PIP_LAYOUT[n];
  const dots = layout.map(([cx, cy], i) => potato(cx, cy, 2.9, 2.7, i)).join(' ');
  return (
    <DoodleProp seed="dice" {...rest}>
      <path d={DIE_D} fill={PALETTE.paper} transform="translate(2.4 2)" />
      <path d={DIE_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
      <path d={dots} fill={PALETTE.ink} />
      <path d="M -11.5 -13.8 C -4 -16.6 6 -16.8 12.5 -14.2" stroke={PALETTE.greyDeep} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    </DoodleProp>
  );
};

// ---------------------------------------------------------------------------
// signage & ceiling
// ---------------------------------------------------------------------------

const SIGN_BOARD =
  'M -62 -23 C -62 -25.6 -60 -26.6 -56 -26.4 L 32 -24.6 L 62 0.4 ' +
  'L 31.5 25 L -57 23.4 C -60.6 23.2 -62.2 21.6 -62 18.6 Z';

const SIGN_BULB_POS: ReadonlyArray<readonly [number, number]> = [
  [-55, -19],
  [-37, -20.5],
  [-18, -21],
  [1, -21.5],
  [20, -20.5],
  [40, -12],
  [51, -3],
  [40, 10],
  [20, 18],
  [1, 19],
  [-18, 19.5],
  [-37, 19],
  [-55, 17.5],
];
const SIGN_BULBS = potatoes(SIGN_BULB_POS, 3.4, 3.1);

/** A generic illuminated arrow marquee — bulbs and a word, never a real venue's name. */
export const CasinoSign: React.FC<PropArgs & { lit?: boolean }> = ({ lit = false, ...rest }) => (
  <DoodleProp seed="casino-sign" {...rest}>
    <path d={SIGN_BOARD} fill={lit ? PALETTE.gold : PALETTE.grey} transform="translate(2.6 2.2)" />
    <path d={SIGN_BOARD} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d={SIGN_BULBS} fill={lit ? PALETTE.paper : 'none'} transform={lit ? 'translate(1.4 1.2)' : undefined} />
    <path d={SIGN_BULBS} fill="none" stroke={lit ? PALETTE.ink : PALETTE.greyDeep} strokeWidth={STROKE.fine} />
    <text
      x={-13}
      y={9}
      textAnchor="middle"
      fontFamily={FONTS.display}
      fontSize={30}
      fill={lit ? PALETTE.ink : PALETTE.greyDeep}
      transform="rotate(-1.4 -13 9)"
    >
      CASINO
    </text>
  </DoodleProp>
);

const DOWNLIGHT_HOUSING = 'M -11 -1 L 11.5 -1.5 L 8 12.5 L -8.5 13 Z';

/** A row of ceiling downlights — the enclosed, windowless, no-clock ceiling. */
export const CeilingLightRow: React.FC<PropArgs & { count?: number; lit?: boolean }> = ({
  count = 5,
  lit = true,
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <DoodleProp seed="ceiling-lights" {...rest}>
      {Array.from({ length: n }, (_, i) => {
        const x = (i - (n - 1) / 2) * 82;
        const tilt = i % 2 === 0 ? -1.4 : 1.1;
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${(i % 3) * 1.2}) rotate(${tilt})`}>
            <path d="M 0 -14 C 0.8 -9 0.4 -5 0 -1" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
            <path d={DOWNLIGHT_HOUSING} fill={PALETTE.greyDeep} transform="translate(2.2 1.8)" />
            <path d={DOWNLIGHT_HOUSING} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
            <path d={potato(0, 13, 7.6, 3.4, i)} fill={lit ? PALETTE.gold : PALETTE.grey} transform="translate(1.6 1.4)" />
            <path d={potato(0, 13, 7.6, 3.4, i)} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.fine} />
          </g>
        );
      })}
    </DoodleProp>
  );
};
