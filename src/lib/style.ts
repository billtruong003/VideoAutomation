import { PALETTE, FONTS, VIDEO, SAFE } from '../style/tokens';
export { PALETTE, FONTS, VIDEO, SAFE };

/**
 * style.ts — LEGACY shim.
 *
 * V2 moved the style contract to `src/style/tokens.ts`. This file now re-exports the
 * palette from there so colour can never fork, and keeps only the few V1-era stroke
 * constants that remaining legacy modules still import. It goes away once those do.
 *
 * Original header follows.
 *
 * style.ts — the channel's visual tokens.
 *
 * "We explain weird things with stupid drawings."
 *
 * One rule governs everything here: the drawing should look like a smart person
 * scribbled it quickly in a notebook, not like a design team shipped it. That means
 * warm off-white paper instead of white, warm charcoal instead of black, flat fills
 * that deliberately miss their outlines, and a palette small enough that every colour
 * carries meaning.
 *
 * Episode-agnostic. Future episodes import these, never redefine them.
 */

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];

/**
 * Stroke weights, in CHARACTER units (the character is ~160 units tall).
 * Scenes scale the character, so strokes scale with it — that is intentional:
 * a big character has chunky lines, a distant one has fine lines.
 */
export const STROKE = {
  hair: 3.2,
  outline: 5.0,
  limb: 6.2,
  detail: 3.4,
  fine: 2.4,
  prop: 4.4,
  propFine: 2.8,
} as const;


/** 1080x1920 vertical. */

/**
 * YouTube Shorts UI safe zones, in pixels from each edge.
 * The right rail (like/comment/share) and the bottom bar (title/handle/CTA) sit on
 * top of the video, so nothing that must be read may live inside these margins.
 */

/** Vertical band where captions sit — above the bottom UI, below centre of action. */
export const CAPTION_BAND = {
  centerY: 1370,
} as const;

/** Standard SVG line-cap/join for every hand-drawn stroke. */
export const HAND_STROKE = {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;
