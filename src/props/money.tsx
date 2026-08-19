/**
 * money.tsx — the props that track what the money is doing.
 *
 * A wallet that is full, a wallet that is not, notes, a receipt that never ends and
 * the litter that proves hours went by. No real currency, no denominations, no
 * institution marks — the denomination is a scribble inside a lopsided circle.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { DoodleProp, type DoodlePropProps } from '../components/DoodleProp';

/** The wrapper contract minus `children` — every prop below draws its own art. */
type PropArgs = Omit<DoodlePropProps, 'children'>;

/** A lopsided bezier "potato" — the channel's stand-in for a circle. */
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

// ---------------------------------------------------------------------------
// wallet
// ---------------------------------------------------------------------------

const WALLET_SHUT =
  'M -23 -14.5 C -23.4 -17.6 -21.4 -19 -17.6 -18.8 L 16 -17.4 ' +
  'C 20.4 -17.2 22.6 -15.4 22.4 -11.6 L 21.6 11.4 C 21.4 15 19.2 16.6 15.4 16.4 ' +
  'L -16.4 15 C -20.6 14.8 -22.8 13 -22.6 9.2 Z';

const WALLET_LEFT = 'M -25 -13.5 C -24.6 -16.4 -22.6 -17.4 -19 -16.8 L -1.5 -9.5 L -2.5 15.5 L -22 8.5 C -25 7.4 -25.8 5.6 -25.4 2 Z';
const WALLET_RIGHT = 'M 1.5 -9.5 L 19.5 -17 C 23 -18.2 25.2 -17 25.4 -13.6 L 26 3 C 26.2 6.2 24.6 7.8 21 9 L 2.5 15.5 Z';

/** A folded wallet — closed by default, splayed open when `open`. */
export const Wallet: React.FC<PropArgs & { open?: boolean }> = ({ open = false, ...rest }) => (
  <DoodleProp seed="wallet" {...rest}>
    {open ? (
      <>
        {/* cash sitting in the fold, drawn first so the leather laps over it */}
        <path d="M 4 -14 L 22 -21 L 23.5 -12.5 L 5 -6 Z" fill={PALETTE.gold} transform="translate(1.8 1.6)" />
        <path d="M 4 -14 L 22 -21 L 23.5 -12.5 L 5 -6 Z" fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
        <path d={WALLET_LEFT} fill={PALETTE.greyDeep} transform="translate(2.4 2)" />
        <path d={WALLET_LEFT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
        <path d={WALLET_RIGHT} fill={PALETTE.greyDeep} transform="translate(2.4 2)" />
        <path d={WALLET_RIGHT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
        <path d="M -0.5 -9.5 C 0.5 -2 0.2 8 -0.5 15.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
      </>
    ) : (
      <>
        <path d="M -9 -21.5 L 13 -20.4 L 12.6 -16.4 L -9.4 -17.6 Z" fill={PALETTE.gold} transform="translate(1.6 1.4)" />
        <path d="M -9 -21.5 L 13 -20.4 L 12.6 -16.4 L -9.4 -17.6 Z" fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.fine} strokeLinejoin="round" />
        <path d={WALLET_SHUT} fill={PALETTE.greyDeep} transform="translate(2.6 2.2)" />
        <path d={WALLET_SHUT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
        <path d="M -22.6 -2.4 C -8 -4.4 8 -3.6 22 -5.2" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
        <path
          d="M -17 -14 L -13 -13.8 M -8 -13.4 L -4 -13.2 M 1 -12.9 L 5 -12.7 M 10 -12.4 L 14 -12.2"
          stroke={PALETTE.paperShade}
          strokeWidth={STROKE.fine}
          {...HAND_STROKE}
        />
        <path d={potato(15.5, 5, 4.2, 3.8, 2)} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={STROKE.fine} />
      </>
    )}
  </DoodleProp>
);

const EMPTY_LEFT = 'M -27 -14 C -26.6 -17.4 -24.4 -18.4 -20.6 -17.6 L -1.5 -9 L -2.5 17 L -23.6 9 C -27 7.6 -27.8 5.6 -27.4 1.6 Z';
const EMPTY_RIGHT = 'M 1.5 -9 L 21 -18 C 24.8 -19.4 27.2 -18 27.4 -14.2 L 28 4 C 28.2 7.6 26.4 9.4 22.4 10.6 L 2.5 17 Z';
const EMPTY_DARK = 'M -1.5 -8 L -20 -15.4 C -22.6 -16.2 -23.8 -14.6 -23.6 -11.4 L -23 3.4 L -1.5 12 L 21 3 L 21.6 -12 C 21.8 -15 20.4 -16.2 18 -15.2 Z';

/** The same wallet, open and visibly empty — a moth flies out of the darkness. */
export const EmptyWallet: React.FC<PropArgs> = (rest) => (
  <DoodleProp seed="empty-wallet" {...rest}>
    <path d={EMPTY_LEFT} fill={PALETTE.greyDeep} transform="translate(2.4 2)" />
    <path d={EMPTY_LEFT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d={EMPTY_RIGHT} fill={PALETTE.greyDeep} transform="translate(2.4 2)" />
    <path d={EMPTY_RIGHT} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    {/* nothing in there but dark */}
    <path d={EMPTY_DARK} fill={PALETTE.nightWall} transform="translate(1.6 1.4)" />
    <path d={EMPTY_DARK} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />

    {/* moth escaping */}
    <g transform="translate(1 -33) rotate(-8)">
      <path d="M -1 -3.5 C -9 -9 -13.5 -6.5 -12 -1.5 C -10.8 2.6 -5 4 -0.6 3.5 Z" fill={PALETTE.grey} stroke={PALETTE.ink} strokeWidth={STROKE.fine} strokeLinejoin="round" />
      <path d="M 1.5 -3 C 9.5 -9.5 14 -6 12.5 -1 C 11.2 3.2 5.5 4.4 1 3.6 Z" fill={PALETTE.grey} stroke={PALETTE.ink} strokeWidth={STROKE.fine} strokeLinejoin="round" />
      <path d={potato(0, 0.5, 2, 5, 1)} fill={PALETTE.inkSoft} />
      <path d="M -1 -4.5 C -3 -8 -4.5 -9.5 -6.5 -10.5 M 1.2 -4.5 C 2.6 -8 4.2 -9.6 6.2 -10.4" stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    </g>
    <path d="M -14 -24 C -17 -27.5 -16 -31 -12.5 -33 M 15 -22 C 18.5 -25.5 18 -29 14.5 -31.5" stroke={PALETTE.inkSoft} strokeWidth={STROKE.fine} {...HAND_STROKE} />
  </DoodleProp>
);

// ---------------------------------------------------------------------------
// cash & receipt
// ---------------------------------------------------------------------------

const NOTE_D =
  'M -22 -9.6 C -8 -12 8 -12.2 21.8 -10 L 22.4 9.4 C 8 11.8 -8 12 -22.4 9.8 Z';
/** Scribble where a denomination would go — deliberately unreadable. */
const NOTE_SQUIGGLE = 'M -3.4 1.6 C -2 -2.4 0.4 -3.4 1.6 -1.4 C 2.6 0.4 0.4 2.2 -1 1 C -2.4 -0.2 -0.6 -2.8 3.2 -3.2';

/** Banknote(s) — invented currency, a squiggle where the number would be. */
export const Cash: React.FC<PropArgs & { count?: number }> = ({ count = 1, ...rest }) => {
  const n = Math.max(1, Math.round(count));
  return (
    <DoodleProp seed="cash" {...rest}>
      {Array.from({ length: n }, (_, i) => {
        const x = i * 3.2 - (i % 2) * 1.6;
        const y = -i * 4.6;
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(i % 2 === 0 ? -2.2 : 2.8).toFixed(2)})`}>
            <path d={NOTE_D} fill={PALETTE.gold} transform="translate(2.4 2)" />
            <path d={NOTE_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
            <path d={potato(0.4, 0.2, 7, 6.4, i)} fill={PALETTE.paper} transform="translate(1.4 1.2)" />
            <path d={potato(0.4, 0.2, 7, 6.4, i)} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.fine} />
            <path d={NOTE_SQUIGGLE} stroke={PALETTE.ink} strokeWidth={STROKE.fine} {...HAND_STROKE} />
            <path
              d="M -17.5 -5.5 L -13 -5.8 M -17.5 5.5 L -13 5.2 M 13.5 -5.6 L 18 -5.2 M 13.5 5.4 L 18 5"
              stroke={PALETTE.inkSoft}
              strokeWidth={STROKE.fine}
              {...HAND_STROKE}
            />
          </g>
        );
      })}
    </DoodleProp>
  );
};

const RECEIPT_D =
  'M -12.5 -45 L -6 -47.4 L 0 -44.2 L 6.5 -47.6 L 12.5 -45.2 ' +
  'C 13.6 -24 13 -2 13.8 21.5 C 14.6 33 6.5 42 -1.6 39 ' +
  'C -9 36.2 -7 28.6 -11.5 24 C -12.4 1 -12.8 -22 -12.5 -45 Z';
/** Six lines of nothing legible, plus a heavier "total" rule. */
const RECEIPT_LINES = [-36, -27.5, -19, -10.5, -2, 6.5]
  .map((y, i) => {
    const w = i % 2 === 0 ? 8 : 6.4;
    return `M ${-w} ${y} C ${-w / 2} ${y - 1.6} ${w / 2} ${y + 1.4} ${w} ${y - 0.4}`;
  })
  .join(' ');

/** A long curling receipt — the tally you did not want to see. */
export const Receipt: React.FC<PropArgs> = (rest) => (
  <DoodleProp seed="receipt" {...rest}>
    <path d={RECEIPT_D} fill={PALETTE.paper} transform="translate(2.4 2)" />
    <path d={RECEIPT_D} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
    <path d={RECEIPT_LINES} stroke={PALETTE.inkSoft} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    <path d="M -10 13 C -4 11.6 5 12.4 11.5 13.6" stroke={PALETTE.ink} strokeWidth={STROKE.detail} {...HAND_STROKE} />
    <path d="M -7.5 19.5 C -3 18.4 3.5 19 8.5 20" stroke={PALETTE.coral} strokeWidth={STROKE.detail} {...HAND_STROKE} />
  </DoodleProp>
);

// ---------------------------------------------------------------------------
// litter
// ---------------------------------------------------------------------------

const CUP_BODY = 'M -14 -6.5 L 11 -9.5 C 13.5 -9.8 14.6 -8 14.8 -4 L 15 4.5 C 15.2 8.4 14 9.8 11.5 9.6 L -13.5 6.5 Z';
const CUP_RIM = potato(14.4, 0.2, 3.6, 9.6, 2);

/** A drained paper cup, knocked on its side — hour four of "just one more". */
export const EmptyCup: React.FC<PropArgs> = (rest) => (
  <DoodleProp seed="empty-cup" {...rest}>
    <path d={CUP_BODY} fill={PALETTE.paperShade} transform="translate(2.2 1.8)" />
    <path d={CUP_BODY} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
    <path d={CUP_RIM} fill={PALETTE.grey} transform="translate(1.6 1.4)" />
    <path d={CUP_RIM} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} />
    <path d="M -3.5 -8.2 C -3 -2 -3.2 2.6 -3.8 7.4" stroke={PALETTE.greyDeep} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    <path d="M 16 -5 C 24 -9.5 29 -13 32 -18.5" stroke={PALETTE.coral} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    <path d={potato(-19, 5, 2.2, 1.8, 1) + ' ' + potato(-24.5, 7.5, 1.5, 1.3, 3)} fill={PALETTE.inkSoft} />
  </DoodleProp>
);

/** Crumpled paper balls, drawn as one welded path to keep the heap cheap. */
const WAD_POS: ReadonlyArray<readonly [number, number, number]> = [
  [-20, -4, 10],
  [-2, -9, 11.5],
  [16, -3, 9],
];
const WADS = WAD_POS.map(([cx, cy, r], i) => potato(cx, cy, r, r * 0.86, i)).join(' ');
const WAD_CREASES =
  'M -25 -6 C -21 -2.5 -17 -6.5 -14.5 -2 M -7.5 -12 C -3 -8 0.5 -13 4 -8.5 ' +
  'M 11 -5 C 15 -1.5 18.5 -6 21 -2';

/** A small heap of crumpled paper and dead cups — the "hours have passed" gag. */
export const TrashPile: React.FC<PropArgs & { size?: number }> = ({ size = 1, ...rest }) => (
  <DoodleProp seed="trash-pile" {...rest}>
    <g transform={`scale(${size})`}>
      <path d={WADS} fill={PALETTE.paperShade} transform="translate(2.4 2)" />
      <path d={WADS} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} />
      <path d={WAD_CREASES} stroke={PALETTE.greyDeep} strokeWidth={STROKE.fine} {...HAND_STROKE} />

      {/* two cups on their sides, tucked into the heap */}
      <g transform="translate(-30 4) scale(0.62) rotate(-14)">
        <path d={CUP_BODY} fill={PALETTE.grey} transform="translate(2.2 1.8)" />
        <path d={CUP_BODY} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
      </g>
      <g transform="translate(28 5) scale(0.55) rotate(160)">
        <path d={CUP_BODY} fill={PALETTE.grey} transform="translate(2.2 1.8)" />
        <path d={CUP_BODY} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
      </g>

      {/* a torn receipt scrap */}
      <path d="M 3 4 L 12 2 L 13.5 12 L 4.5 13.5 Z" fill={PALETTE.paper} transform="translate(1.6 1.4)" />
      <path d="M 3 4 L 12 2 L 13.5 12 L 4.5 13.5 Z" fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.fine} strokeLinejoin="round" />
      <path d="M -34 12.5 C -12 15 14 14.5 33 11.5" stroke={PALETTE.inkSoft} strokeWidth={STROKE.fine} {...HAND_STROKE} />
    </g>
  </DoodleProp>
);
