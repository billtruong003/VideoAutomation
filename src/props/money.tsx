/**
 * money.tsx — the props that track what the money is doing. V2: clean geometry, stylized
 * by the renderer.
 *
 * A wallet that is full, a wallet that is not, notes, a receipt that never ends, and the
 * litter that proves hours went by. No real currency, no denominations, no institution
 * marks — where a number would sit there is a scribble, and the scribble is the only mark
 * in this file authored as a GESTURE (a point path) rather than as STRUCTURE.
 *
 * Everything else is clean semantic geometry: a note is a rounded rectangle with a disc in
 * the middle, a crumpled ball is a circle with creases. The hand-drawn character is added
 * by `RoughAsset`, identically for every asset in the channel.
 *
 * Rotating or repeated parts (the moth, a tipped cup) are their own `AssetDef` placed
 * inside a `<g transform="...">`, so the cached roughened geometry never changes.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { scribblePoints } from '../lib/pathpoints';
import { TINY, roundedRect, type AssetDef, type Pt, type Shape } from '../assets/shapes';

// ---------------------------------------------------------------------------
// wallet — ~46 wide
// ---------------------------------------------------------------------------

const WALLET_SHUT: AssetDef = {
  id: 'prop-wallet-shut',
  size: { w: 46, h: 44 },
  shapes: [
    // a card poking out of the top, drawn first so the leather laps over it
    { k: 'rect', x: -9, y: -23, w: 22, h: 7, fill: PALETTE.gold, rough: 'detail', sw: 2.4 },
    { ...roundedRect(-23, -17, 46, 33, 5), fill: PALETTE.greyDeep },
    // the fold seam
    { k: 'line', x1: -21, y1: -2, x2: 21, y2: -2, rough: 'detail', sw: 3, single: true },
    // stitching along the top edge
    ...[-16, -8, 0, 8].map((x) => ({
      k: 'line' as const, x1: x, y1: -13, x2: x + 4, y2: -13,
      stroke: PALETTE.paperShade, rough: 'detail' as const, sw: 2, single: true,
    })),
    { k: 'circle', cx: 15, cy: 7, r: 4, fill: PALETTE.gold, rough: 'detail', sw: 2.4, ...TINY },
  ],
};

const WALLET_OPEN: AssetDef = {
  id: 'prop-wallet-open',
  size: { w: 52, h: 40 },
  shapes: [
    // cash sitting in the fold, drawn first so the leather laps over it
    { k: 'polygon', pts: [[4, -14], [22, -21], [23.5, -12.5], [5, -6]], fill: PALETTE.gold, rough: 'detail', sw: 2.8 },
    { k: 'polygon', pts: [[-25, -14], [-1.5, -9.5], [-2.5, 15.5], [-24, 8.5]], fill: PALETTE.greyDeep },
    { k: 'polygon', pts: [[1.5, -9.5], [25, -17], [26, 3], [2.5, 15.5]], fill: PALETTE.greyDeep },
    { k: 'line', x1: 0, y1: -9.5, x2: 0, y2: 15.5, rough: 'detail', sw: 3, single: true },
  ],
};

/** A folded wallet — closed by default, splayed open when `open`. */
export const Wallet: React.FC<PropArgs & { open?: boolean }> = ({
  open = false,
  seed = 'wallet',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={open ? WALLET_OPEN : WALLET_SHUT} variant={seed} />
  </PropFrame>
);

const EMPTY_WALLET: AssetDef = {
  id: 'prop-wallet-empty',
  size: { w: 56, h: 44 },
  shapes: [
    { k: 'polygon', pts: [[-27, -14], [-1.5, -9], [-2.5, 17], [-24, 9]], fill: PALETTE.greyDeep },
    { k: 'polygon', pts: [[1.5, -9], [27, -17], [28, 4], [2.5, 17]], fill: PALETTE.greyDeep },
    // nothing in there but dark
    {
      k: 'polygon',
      pts: [[-1.5, -8], [-21, -14.5], [-22.5, 3], [-1.5, 12], [21, 3], [19.5, -14.5]],
      fill: PALETTE.nightWall,
      rough: 'detail',
      sw: 3,
    },
  ],
};

/** The moth. Its own def because it sits inside a rotated group. */
const MOTH: AssetDef = {
  id: 'prop-moth',
  size: { w: 26, h: 20 },
  shapes: [
    { k: 'ellipse', cx: -6.4, cy: -0.5, rx: 6.4, ry: 4.2, fill: PALETTE.grey, rough: 'detail', sw: 2.2 },
    { k: 'ellipse', cx: 6.4, cy: -0.5, rx: 6.4, ry: 4.2, fill: PALETTE.grey, rough: 'detail', sw: 2.2 },
    { k: 'ellipse', cx: 0, cy: 0.5, rx: 2, ry: 5, fill: PALETTE.inkSoft, rough: 'detail', sw: 2 },
    { k: 'line', x1: -1, y1: -4.5, x2: -5.5, y2: -10, rough: 'detail', sw: 2, single: true },
    { k: 'line', x1: 1, y1: -4.5, x2: 5.5, y2: -10, rough: 'detail', sw: 2, single: true },
  ],
};

/** The two little puffs that say the moth just came OUT of there. */
const MOTH_TRAIL: AssetDef = {
  id: 'prop-moth-trail',
  shapes: [
    { k: 'arc', cx: -14, cy: -28, rx: 6, ry: 6, start: 100, stop: 260, stroke: PALETTE.inkSoft, rough: 'detail', sw: 2, single: true },
    { k: 'arc', cx: 16, cy: -26, rx: 6, ry: 6, start: -80, stop: 80, stroke: PALETTE.inkSoft, rough: 'detail', sw: 2, single: true },
  ],
};

/** The same wallet, open and visibly empty — a moth flies out of the darkness. */
export const EmptyWallet: React.FC<PropArgs> = ({ seed = 'empty-wallet', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={EMPTY_WALLET} variant={seed} />
    <RoughAsset def={MOTH_TRAIL} variant={seed} />
    <g transform="translate(1 -33) rotate(-8)">
      <RoughAsset def={MOTH} variant={seed} />
    </g>
  </PropFrame>
);

// ---------------------------------------------------------------------------
// cash & receipt
// ---------------------------------------------------------------------------

/**
 * The denomination. A single motion of the pen, so it is authored as a freehand stroke
 * rather than as structure — and deliberately unreadable, because this is not real money.
 */
const NOTE_SQUIGGLE: Shape = {
  k: 'stroke',
  pts: scribblePoints(0.2, 0.2, 8, 7, 'note-denomination', 2),
  pen: 'scribble',
  size: 3,
  color: PALETTE.ink,
};

const NOTE: AssetDef = {
  id: 'prop-banknote',
  size: { w: 44, h: 22 },
  shapes: [
    { ...roundedRect(-22, -11, 44, 22, 2), fill: PALETTE.gold, rough: 'detail', sw: 3.4 },
    { k: 'circle', cx: 0.2, cy: 0.2, r: 7, fill: PALETTE.paper, rough: 'detail', sw: 2.4 },
    NOTE_SQUIGGLE,
    // corner guilloche, reduced to four ticks
    ...([[-17.5, -5.5], [-17.5, 5.5], [13.5, -5.5], [13.5, 5.5]] as Pt[]).map(([x, y]) => ({
      k: 'line' as const, x1: x, y1: y, x2: x + 4.5, y2: y,
      stroke: PALETTE.inkSoft, rough: 'detail' as const, sw: 1.8, single: true,
    })),
  ],
};

/** Banknote(s) — invented currency, a squiggle where the number would be. */
export const Cash: React.FC<PropArgs & { count?: number }> = ({
  count = 1,
  seed = 'cash',
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  return (
    <PropFrame seed={seed} {...rest}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${(i * 3.2).toFixed(2)} ${(-i * 4.6).toFixed(2)})`}>
          <RoughAsset def={NOTE} variant={`${seed}-${i}`} />
        </g>
      ))}
    </PropFrame>
  );
};

/** Torn top and bottom — the zigzag is symmetric, because the tear is not the joke. */
const RECEIPT: AssetDef = {
  id: 'prop-receipt',
  size: { w: 26, h: 91 },
  shapes: [
    {
      k: 'polygon',
      pts: [
        [-13, -45], [-6.5, -48], [0, -45], [6.5, -48], [13, -45],
        [13, 40], [6.5, 43], [0, 40], [-6.5, 43], [-13, 40],
      ],
      fill: PALETTE.paper,
      rough: 'detail',
      sw: 3.2,
    },
    // six lines of nothing legible
    ...[-36, -27.5, -19, -10.5, -2, 6.5].map((y, i) => {
      const w = i % 2 === 0 ? 8 : 6.4;
      return {
        k: 'line' as const, x1: -w, y1: y, x2: w, y2: y,
        stroke: PALETTE.inkSoft, rough: 'detail' as const, sw: 1.8, single: true,
      };
    }),
    // the total, and the line under it you did not want to see
    { k: 'line', x1: -10, y1: 14, x2: 11, y2: 14, rough: 'detail', sw: 3, single: true },
    { k: 'line', x1: -7.5, y1: 21, x2: 8.5, y2: 21, stroke: PALETTE.coral, rough: 'detail', sw: 3, single: true },
  ],
};

/** A long receipt — the tally you did not want to see. ~26 x 90. */
export const Receipt: React.FC<PropArgs> = ({ seed = 'receipt', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={RECEIPT} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// litter
// ---------------------------------------------------------------------------

/** A tapered paper cup lying on its side, mouth to the right. Reused by the trash pile. */
const CUP: AssetDef = {
  id: 'prop-empty-cup',
  size: { w: 30, h: 20 },
  shapes: [
    { k: 'polygon', pts: [[-13, -5], [12, -9.6], [12, 9.6], [-13, 5]], fill: PALETTE.paperShade, rough: 'detail', sw: 3.2 },
    { k: 'ellipse', cx: 12, cy: 0, rx: 3.6, ry: 9.6, fill: PALETTE.grey, rough: 'detail', sw: 3 },
    { k: 'line', x1: -3.5, y1: -6.7, x2: -3.5, y2: 6.7, stroke: PALETTE.greyDeep, rough: 'detail', sw: 1.8, single: true },
  ],
};

/** Straw and the last two drops — the parts that only the standalone cup wants. */
const CUP_SPILL: AssetDef = {
  id: 'prop-cup-spill',
  shapes: [
    { k: 'line', x1: 14, y1: -4, x2: 32, y2: -18, stroke: PALETTE.coral, rough: 'detail', sw: 3, single: true },
    { k: 'circle', cx: -19, cy: 6, r: 2.2, fill: PALETTE.inkSoft, rough: 'detail', sw: 1.8, ...TINY },
    { k: 'circle', cx: -24.5, cy: 8.5, r: 1.5, fill: PALETTE.inkSoft, rough: 'detail', sw: 1.6, ...TINY },
  ],
};

/** A drained paper cup, knocked on its side — hour four of "just one more". */
export const EmptyCup: React.FC<PropArgs> = ({ seed = 'empty-cup', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={CUP} variant={seed} />
    <RoughAsset def={CUP_SPILL} variant={seed} />
  </PropFrame>
);

/** Three crumpled balls. A crumple is a circle plus creases — nothing more is needed. */
const WADS: AssetDef = {
  id: 'prop-paper-wads',
  size: { w: 64, h: 30 },
  shapes: [
    ...([[-20, -4, 10], [-2, -9, 11.5], [16, -3, 9]] as ReadonlyArray<readonly [number, number, number]>).flatMap(
      ([cx, cy, r]): Shape[] => [
        { k: 'circle', cx, cy, r, fill: PALETTE.paperShade, rough: 'detail', sw: 3.2 },
        {
          k: 'polyline',
          pts: [[cx - r * 0.6, cy - r * 0.2], [cx - r * 0.1, cy + r * 0.3], [cx + r * 0.3, cy - r * 0.4], [cx + r * 0.7, cy + r * 0.1]],
          stroke: PALETTE.greyDeep,
          rough: 'detail',
          sw: 1.8,
          single: true,
        },
      ],
    ),
  ],
};

/** A torn receipt scrap and the ground line the heap sits on. */
const TRASH_FLOOR: AssetDef = {
  id: 'prop-trash-floor',
  shapes: [
    { k: 'polygon', pts: [[3, 4], [12, 2], [13.5, 12], [4.5, 13.5]], fill: PALETTE.paper, rough: 'detail', sw: 2.2 },
    { k: 'line', x1: -34, y1: 13, x2: 33, y2: 13, stroke: PALETTE.inkSoft, rough: 'detail', sw: 2, single: true },
  ],
};

/** A small heap of crumpled paper and dead cups — the "hours have passed" gag. */
export const TrashPile: React.FC<PropArgs & { size?: number }> = ({
  size = 1,
  seed = 'trash-pile',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <g transform={`scale(${size})`}>
      <RoughAsset def={WADS} variant={seed} />
      <g transform="translate(-30 4) scale(0.62) rotate(-14)">
        <RoughAsset def={CUP} variant={`${seed}-cup0`} />
      </g>
      <g transform="translate(28 5) scale(0.55) rotate(160)">
        <RoughAsset def={CUP} variant={`${seed}-cup1`} />
      </g>
      <RoughAsset def={TRASH_FLOOR} variant={seed} />
    </g>
  </PropFrame>
);
