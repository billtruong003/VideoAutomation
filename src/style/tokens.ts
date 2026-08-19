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
// pens — gestural marks
// ---------------------------------------------------------------------------

/**
 * Presets for marks drawn as a single gesture: brows, mouths, limbs, swooshes, scribbles.
 *
 * These used to be perfect-freehand configs producing VARIABLE-WIDTH strokes. That was a
 * mistake, and `src/qa/PenProbe.tsx` is the evidence:
 *
 *   - A variable-width stroke is a different pen from a Rough.js outline. Side by side on
 *     the same head, the drawing visibly has two hands.
 *   - The taper reads as brush/calligraphy, not as the ballpoint this channel is drawn in.
 *     At phone size the swelling just turns marks muddy.
 *   - Worse architecturally: perfect-freehand is an AUTHORING tool, not a stylizer. Its
 *     character comes from a pressure profile that has to be hand-authored — which is
 *     exactly V1's failure (author supplies the hand) wearing a library.
 *   - It also escaped the style switch: `REMOTION_STYLE_MODE=clean` flattened every
 *     Rough.js shape and left every freehand mark untouched. Half the drawing obeyed.
 *
 * So gestures are now uniform-width strokes drawn by the SAME stylizer as everything else.
 * The source geometry is deliberately boring — a plain curve through plain points — and
 * Rough.js supplies 100% of the hand. That is what "design cleanly" actually requires.
 */
export const PEN = {
  /** Brows, mouths, closed eyes. Fine and calm — a face mark must not look scratchy. */
  face: { strokeWidth: 3.6, roughness: 0.75, bowing: 1.0 },
  /** Hair, cowlicks. */
  hair: { strokeWidth: 3.8, roughness: 0.95, bowing: 1.2 },
  /** Noodle limbs — thick and load-bearing. */
  limb: { strokeWidth: 7.0, roughness: 0.7, bowing: 1.0 },
  /** Emphasis marks, speed lines, swooshes. Loose and fast. */
  accent: { strokeWidth: 5.5, roughness: 1.7, bowing: 1.8 },
  /** Loose annotation scribbles. */
  scribble: { strokeWidth: 3.2, roughness: 1.4, bowing: 1.5 },
} as const;

export type PenToken = keyof typeof PEN;

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

// ---------------------------------------------------------------------------
// style mode
// ---------------------------------------------------------------------------

export type StyleMode = 'rough' | 'clean';

/**
 * Global stylizer mode, set with `REMOTION_STYLE_MODE=clean` (Remotion forwards any
 * `REMOTION_`-prefixed environment variable into the browser bundle).
 *
 *   rough  the channel's look — Rough.js supplies the hand   (default)
 *   clean  Rough.js emits exact geometry, roughness and bowing zeroed
 *
 * This exists as a real switch rather than a debug hack because it is the honest test of
 * the V2 claim: if authoring is genuinely separate from styling, turning the stylizer off
 * should cost one environment variable and change nothing else. It is also useful for
 * diagnosing whether a layout problem is a geometry bug or a roughness artefact — clean
 * mode shows you what the asset actually IS.
 *
 * Since one stylizer draws everything — shapes and gestures alike — clean mode flattens the
 * ENTIRE drawing. An earlier revision used a second library for gestures and clean mode
 * only flattened half the frame, which is how that design flaw was noticed.
 */
export const STYLE_MODE: StyleMode =
  typeof process !== 'undefined' && process.env?.REMOTION_STYLE_MODE === 'clean'
    ? 'clean'
    : 'rough';
