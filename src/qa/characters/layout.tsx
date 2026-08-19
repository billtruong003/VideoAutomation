/**
 * layout.tsx — shared furniture for the character QA sheets.
 *
 * The sheets are the acceptance gate for the whole character system, so their layout has
 * one job: make a defect impossible to miss and impossible to explain away. That means
 * identical cells, identical framing maths for every character, and labels that are
 * actually readable at 1080 wide.
 *
 * Framing is DERIVED from each character's build rather than hand-tuned per sheet. If a
 * head is centred in its cell only because someone nudged a number, the sheet stops being
 * a test of the character and becomes a test of the nudging.
 */

import React from 'react';
import { Stage } from '../../components/Stage';
import { FONTS, PALETTE } from '../../lib/style';
import type { CharacterDef } from '../../character/types';
import { MOCHI_GEOM } from '../../character/characters/mochi';

export const SHEET_W = 1080;
export const SHEET_H = 1920;
export const MARGIN = 28;

/**
 * The vertical extent a character occupies in rig space, from the top of the hair to the
 * bottom of the feet, plus where the head centre sits inside it.
 *
 * `hairHeadroom` is a real number, not padding: Bill's mop rises 15 units above his skull
 * and Dex's spikes 14, so framing on the head box alone crops both of them.
 */
export function extentOf(c: CharacterDef) {
  if (c.kind === 'creature') {
    const g = MOCHI_GEOM;
    return {
      top: g.headCenter[1] - g.headRy - g.earH - 4,
      bottom: g.groundY + 4,
      headY: g.headCenter[1],
      headR: g.headRy + 10,
    };
  }
  const b = c.build;
  const [, hy] = b.headCenter;
  return {
    top: hy - b.headHH - 16,
    bottom: b.groundY + b.footRy + 6,
    headY: hy,
    headR: b.headHH + 14,
  };
}

/** Hip Y that centres a character's FULL body inside a cell of this height. */
export function fullBodyHipY(c: CharacterDef, cellCY: number, scale: number): number {
  const e = extentOf(c);
  const mid = (e.top + e.bottom) / 2;
  return cellCY - mid * scale;
}

/** Scale that fits a character's full body into a cell of this height, with padding. */
export function fitScale(c: CharacterDef, cellH: number, pad = 34): number {
  const e = extentOf(c);
  return (cellH - pad) / (e.bottom - e.top);
}

/**
 * How wide a character is, in rig units, at their widest.
 *
 * Hair overhangs the skull (Bill's mop reaches ±52) and raised-arm poses reach further
 * still, so this is not `headHW * 2`. Used by `fitBoth`, which exists because the first
 * cast line-up scaled on height alone and every figure overlapped its neighbours.
 */
export function widthOf(c: CharacterDef): number {
  if (c.kind === 'creature') return 150;
  return Math.max(c.build.headHW * 2 + 14, 128);
}

/** Scale that fits a character inside a cell in BOTH axes. */
export function fitBoth(c: CharacterDef, cellW: number, cellH: number, pad = 30): number {
  return Math.min(fitScale(c, cellH, pad), (cellW - pad) / widthOf(c));
}

/** One scale for the whole cast, so a line-up compares heights honestly. */
export function castFit(cellW: number, cellH: number, order: CharacterDef[], pad = 30): number {
  return Math.min(...order.map((c) => fitBoth(c, cellW, cellH, pad)));
}

/** Hip Y that puts a character's HEAD in the middle of a cell. */
export function headHipY(c: CharacterDef, cellCY: number, scale: number): number {
  return cellCY - extentOf(c).headY * scale;
}

/** Scale that fills a cell with just the head. */
export function headScale(c: CharacterDef, cellH: number, pad = 26): number {
  return (cellH - pad) / (extentOf(c).headR * 2);
}

// ---------------------------------------------------------------------------
// chrome
// ---------------------------------------------------------------------------

export const SheetTitle: React.FC<{ text: string; sub?: string; y?: number }> = ({ text, sub, y = 58 }) => (
  <>
    <text x={MARGIN} y={y} fontFamily={FONTS.display} fontSize={46} fill={PALETTE.ink}>
      {text}
    </text>
    {sub && (
      <text x={MARGIN} y={y + 30} fontFamily={FONTS.hand} fontSize={24} fill={PALETTE.inkSoft}>
        {sub}
      </text>
    )}
  </>
);

export const CellFrame: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <rect
    x={x + 4}
    y={y + 4}
    width={w - 8}
    height={h - 8}
    fill="none"
    stroke={PALETTE.grey}
    strokeWidth={1.5}
    strokeDasharray="5 5"
    rx={10}
  />
);

export const CellLabel: React.FC<{ x: number; y: number; text: string; size?: number }> = ({
  x,
  y,
  text,
  size = 21,
}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONTS.hand} fontSize={size} fill={PALETTE.inkSoft}>
    {text}
  </text>
);

/** A grid of equal cells, laid out left to right and top to bottom. */
export function grid(count: number, cols: number, top: number, cellH: number, width = SHEET_W - MARGIN * 2) {
  const cellW = width / cols;
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * cellW;
    const y = top + row * cellH;
    return { i, x, y, w: cellW, h: cellH, cx: x + cellW / 2, cy: y + cellH / 2 };
  });
}

export const SheetStage: React.FC<{ children: React.ReactNode; tint?: string }> = ({ children, tint }) => (
  <Stage tint={tint}>{children}</Stage>
);
