/**
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

export const PALETTE = {
  /** Warm notebook paper. Never pure white — pure white reads as "app UI". */
  paper: '#F7F3E9',
  paperShade: '#EDE6D6',

  /** Warm charcoal. Never pure black — pure black reads as "vector logo". */
  ink: '#23201D',
  inkSoft: '#4A443C',

  /** Alarm / attention / the punchline. */
  coral: '#E8503A',
  /** Casino light, money, cheap glitter. */
  gold: '#F2B33D',
  /** Daylight, calm, the "modern casino" relief. */
  teal: '#2E9E8F',
  /** Weird / psychological / time distortion. */
  violet: '#7B5BA6',
  /** Backgrounded objects, shadows, things that don't matter. */
  grey: '#C9C2B4',
  greyDeep: '#9A9384',

  /** Enclosed, windowless, late-night casino interior. */
  nightFloor: '#3B3550',
  nightWall: '#2A2438',

  /**
   * The protagonist ("Nib"). Skin is a hair lighter than paper rather than any
   * particular tone — this is a doodle person, not a depiction of anyone, which
   * keeps the mascot neutral for a global audience across future episodes.
   */
  skin: '#FDF8ED',
  shirt: '#5B7FB9',
  shirtDark: '#47679B',
} as const;

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

export const FONTS = {
  /** Impact / gag text / captions. All-caps comic face. */
  display: '"Bangers", "Comic Sans MS", cursive',
  /** Labels, small annotations, hand-written asides. */
  hand: '"Patrick Hand", "Comic Sans MS", cursive',
} as const;

/** 1080x1920 vertical. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/**
 * YouTube Shorts UI safe zones, in pixels from each edge.
 * The right rail (like/comment/share) and the bottom bar (title/handle/CTA) sit on
 * top of the video, so nothing that must be read may live inside these margins.
 */
export const SAFE = {
  top: 140,
  bottom: 420,
  left: 60,
  right: 190,
} as const;

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
