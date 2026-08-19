/**
 * tokens.ts — the V2 style contract, as code.
 *
 * V1 tried to get a hand-drawn look by asking whoever authored an asset to draw it badly:
 * lopsided beziers, offset fills, hand-picked jitter. That works exactly as well as the
 * author's intuition on that day, which is why it drifted.
 *
 * V2 inverts it:
 *
 *      DESIGN CLEANLY.  RENDER IMPERFECTLY.
 *
 * Assets are authored as clean semantic geometry — a clock is a circle, twelve ticks and
 * two hands. All of the roughness comes from these tokens being applied by one renderer,
 * so "the channel's hand" is a property of the pipeline, not of the person drawing.
 *
 * Consequence: to restyle the entire channel, change this file. Nothing else.
 */

// ---------------------------------------------------------------------------
// colour
// ---------------------------------------------------------------------------

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

  /** The protagonist. Neutral by design — a doodle person, not a depiction of anyone. */
  skin: '#FDF8ED',
  shirt: '#5B7FB9',
  shirtDark: '#47679B',
} as const;

// ---------------------------------------------------------------------------
// roughness — the heart of the V2 look
// ---------------------------------------------------------------------------

/**
 * Rough.js parameter sets, named by intent rather than by number.
 *
 * `roughness` is how far strokes wander; `bowing` is how much straight lines bend.
 * Both are deliberately restrained: past roughness ~2.2 the drawing stops reading as
 * "sketched confidently" and starts reading as "shaky", which is a different and much
 * worse feeling.
 */
export const ROUGH = {
  /** Foreground hero objects the viewer actually looks at. */
  prop: { roughness: 1.35, bowing: 1.6, strokeWidth: 4.2 },
  /** Small details inside a prop — ticks, buttons, pips. */
  detail: { roughness: 1.15, bowing: 1.2, strokeWidth: 2.6 },
  /** The protagonist's body. Slightly tighter than props so he reads as the subject. */
  character: { roughness: 1.2, bowing: 1.4, strokeWidth: 4.6 },
  /** Architecture and set dressing. Looser, thinner, never competing with foreground. */
  background: { roughness: 1.9, bowing: 2.4, strokeWidth: 2.4 },
  /** Big text boxes and gag cards. Almost clean — text must stay legible. */
  card: { roughness: 0.9, bowing: 0.8, strokeWidth: 5 },
  /** Emphasis bursts, speed lines. Loose and fast. */
  accent: { roughness: 2.1, bowing: 2.0, strokeWidth: 3.2 },
} as const;

export type RoughToken = keyof typeof ROUGH;

/**
 * Fill strategy.
 *
 * `solid` is the house default. Rough.js hachure fills are seductive in isolation and a
 * disaster at 1080x1920 on a phone — the hatching aliases into noise at small sizes and
 * fights the captions. Hachure is reserved for a few deliberate texture moments.
 */
export const FILL = {
  solid: { fillStyle: 'solid' as const },
  hachure: { fillStyle: 'hachure' as const, hachureGap: 6, fillWeight: 1.6 },
  crossHatch: { fillStyle: 'cross-hatch' as const, hachureGap: 8, fillWeight: 1.4 },
  /** Very sparse — used for shadow and "this is behind" cues. */
  sparse: { fillStyle: 'hachure' as const, hachureGap: 12, fillWeight: 1.2 },
} as const;

// ---------------------------------------------------------------------------
// perfect-freehand — organic marks
// ---------------------------------------------------------------------------

/**
 * Rough.js is for STRUCTURE (things with dimensions: a clock, a chair, a wall).
 * perfect-freehand is for GESTURE (things drawn in one motion: an eyebrow, a scribble,
 * a swoosh). Using the wrong one is the most common way to make this style look wrong —
 * a rough-generated eyebrow looks like a broken twig, and a freehand-drawn rectangle
 * looks like a deflated balloon.
 */
export const FREEHAND = {
  /** Facial features — brows, mouths, closed eyes. Tapered at both ends like a real pen. */
  face: { size: 4.0, thinning: 0.62, smoothing: 0.55, streamline: 0.42, taperStart: 0.55, taperEnd: 0.85 },
  /** Hair, cowlicks. Slightly heavier. */
  hair: { size: 4.6, thinning: 0.6, smoothing: 0.5, streamline: 0.4, taperStart: 0.3, taperEnd: 0.95 },
  /** Noodle limbs — confident, barely tapered. `size` is the FULL width of the mark. */
  limb: { size: 7.6, thinning: 0.32, smoothing: 0.6, streamline: 0.45, taperStart: 0.15, taperEnd: 0.35 },
  /** Emphasis marks, speed lines, impact strokes. Fast and sharply tapered. */
  accent: { size: 7, thinning: 0.72, smoothing: 0.4, streamline: 0.3, taperStart: 0.9, taperEnd: 0.95 },
  /** Loose scribbles and annotations. */
  scribble: { size: 4.2, thinning: 0.5, smoothing: 0.45, streamline: 0.35, taperStart: 0.4, taperEnd: 0.6 },
} as const;

export type FreehandToken = keyof typeof FREEHAND;

// ---------------------------------------------------------------------------
// composition
// ---------------------------------------------------------------------------

export const FONTS = {
  display: '"Bangers", "Comic Sans MS", cursive',
  hand: '"Patrick Hand", "Comic Sans MS", cursive',
} as const;

export const VIDEO = { width: 1080, height: 1920, fps: 30 } as const;

/**
 * YouTube Shorts UI safe zones, in pixels from each edge. The right rail (like/comment/
 * share) and the bottom bar sit ON TOP of the video, so nothing that must be read may
 * live inside these margins.
 */
export const SAFE = { top: 140, bottom: 420, left: 60, right: 190 } as const;

/** Vertical band where captions sit — above the bottom UI, below the action. */
export const CAPTION_Y = 1442;

/**
 * Style version. Stamped into every asset registry entry so a restyle is detectable:
 * if an asset's styleVersion is stale, its cached stylized form must be regenerated.
 */
export const STYLE_VERSION = 'channel-v2';
