/**
 * theme.ts — the Mr.Yolk look, as tokens.
 *
 * This is NOT the Bill Finds Out palette and must not drift into it. That channel is warm
 * notebook paper, warm charcoal, and a Rough.js hand that redraws every outline. Mr.Yolk is
 * the opposite discipline: flat WHITE, clean black outlines, and artwork that arrives
 * pre-drawn as PNG. Nothing here stylises the character, because the character is already
 * drawn — the job of the renderer is to move it, not to re-ink it.
 *
 * White is the canonical ground. Every accent below is chosen to sit on white at 1080p with
 * a black-outlined yellow character in front of it, which rules out the pale pastels that
 * look fine in a palette swatch and vanish behind an outline.
 */

export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

export const C = {
  /** The canvas. Actually white — the art was drawn for white and anything else greys it. */
  paper: '#FFFFFF',
  /** A barely-there wash, for panels that need to separate without becoming a UI card. */
  wash: '#F4F6F8',
  washEdge: '#E4E8EC',

  /** The outline colour of the supplied art, matched so drawn elements belong to it. */
  ink: '#1F1F1F',
  inkSoft: '#5A5A5A',
  inkFaint: '#9A9A9A',

  /** Mr.Yolk's own yellow, sampled from the sheets. Used for highlights that must feel his. */
  yolk: '#F7D14E',
  yolkDeep: '#E0B32F',

  /** Money, growth, approval. */
  green: '#2E9E5B',
  greenSoft: '#DDF0E4',
  /** Loss, risk, past-due, the crash. */
  red: '#D93A2B',
  redSoft: '#FBE3E0',
  /** Institutions, government, the neutral machinery. */
  blue: '#2B6CB0',
  blueSoft: '#E1ECF7',
  /** Time, the future, the speculative. */
  violet: '#6B4FA8',
} as const;

export const FONT = {
  /** Everything. One family, three weights — a second face would fight the drawings. */
  sans: '"Nunito", "Segoe UI", system-ui, sans-serif',
} as const;

/**
 * Type scale, in px against a 1080-tall frame.
 *
 * `hero` is for the single word that IS the frame (TRUST, LEVERAGE). `figure` is for money
 * and percentages, which need to read instantly and are always numerals. Nothing smaller than
 * `note` is used for anything a viewer must read.
 */
export const T = {
  hero: 148,
  big: 92,
  figure: 76,
  title: 56,
  label: 38,
  note: 30,
  caption: 40,
} as const;

/**
 * Safe margins. YouTube long-form has no permanent overlay the way Shorts does, but the
 * player's control bar covers the bottom ~90px whenever the viewer moves the mouse, and the
 * title card sits top-left on some surfaces.
 */
export const SAFE = { top: 70, bottom: 150, left: 110, right: 110 } as const;

/** Where subtitles sit — clear of the control bar, clear of the action. */
export const CAPTION_Y = 930;
