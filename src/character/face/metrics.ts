/**
 * metrics.ts — one face coordinate system, five faces.
 *
 * Every face part is authored in HEAD-LOCAL space: (0,0) is the centre of the head, and
 * the head's own transform (tilt, offset, bob) is applied above it. A character's metrics
 * say where the eyes, brows and mouth sit in that space and how big they are.
 *
 * Why this is a type and not five hand-placed faces: the expression sheet's whole job is
 * to prove that only the EXPRESSION changes between cells. If each expression could also
 * nudge the eye positions, the sheet would prove nothing and faces would drift. Positions
 * come from here, expressions supply shapes, and nothing else may move a feature.
 */

export type GlassesSpec = {
  /** Lens width and height. */
  w: number;
  h: number;
  /** Corner radius. Softened rectangles, never ovals — that is Bill's silhouette. */
  r: number;
  /** Frame stroke width. Thick: the glasses are meant to dominate the mid-face. */
  sw: number;
  /** Vertical centre of the lenses in head space. */
  cy: number;
  /** Horizontal centre of each lens. */
  cx: number;
};

export type FaceMetrics = {
  /** Eye centres at (±eyeX, eyeY). */
  eyeX: number;
  eyeY: number;
  /** Half-size of the default (calm) eye mark, which is a small filled ink oval. */
  eyeRx: number;
  eyeRy: number;
  /** Half-size of the alarmed eye, which is a paper disc with a pupil in it. */
  wideR: number;
  pupilR: number;
  /** Brow centres at (±eyeX, browY) before the brow state lifts them. */
  browY: number;
  browHalfW: number;
  /** Mouth centre. */
  mouthY: number;
  /** Multiplies the whole mouth vocabulary — Bill's is tiny, Gus's is wider. */
  mouthScale: number;
  /** Where a sweat drop / anger vein hangs, as a head-space offset. */
  accentX: number;
  accentY: number;
  glasses?: GlassesSpec;
};

/**
 * Bill's face.
 *
 * The layout is driven by the glasses: they are the identity anchor, so they get the
 * middle of the face and everything else is placed around them.
 *
 * The vertical budget, and it is tight on purpose because the head is only 86 units:
 *
 *     -34..-22   bangs
 *     -19..-15   brows          (9 units of clear forehead below them)
 *      -6..+18   lenses
 *        +30     mouth
 *        +43     chin
 *
 * The first render of this sheet had the brows at -15 against frame tops at -9, and with
 * Rough.js wander the two touched: on `smug`, `suspicious` and `focused` the brow read as
 * being INSIDE the lens. Nine units of separation is the minimum that survives the
 * roughening.
 */
export const BILL_FACE: FaceMetrics = {
  eyeX: 17,
  eyeY: 6,
  eyeRx: 2.9,
  eyeRy: 4.6,
  wideR: 9.5,
  pupilR: 3.6,
  browY: -17,
  browHalfW: 11,
  mouthY: 30,
  mouthScale: 0.82,
  accentX: 42,
  accentY: -12,
  glasses: { w: 30, h: 24, r: 6, sw: 3.6, cy: 6, cx: 17 },
};

/** Mina reads composed, so her eyes are wider apart, flatter and calmer than Bill's. */
export const MINA_FACE: FaceMetrics = {
  eyeX: 15,
  eyeY: 2,
  eyeRx: 4.2,
  eyeRy: 3.4,
  wideR: 9,
  pupilR: 3.4,
  browY: -16,
  browHalfW: 10,
  mouthY: 24,
  mouthScale: 0.8,
  accentX: 38,
  accentY: -13,
};

/** Dex reads energetic: eyes a shade larger and rounder, mouth wider. */
export const DEX_FACE: FaceMetrics = {
  eyeX: 15,
  eyeY: 1,
  eyeRx: 4.2,
  eyeRy: 4.6,
  wideR: 10,
  pupilR: 3.8,
  browY: -17,
  browHalfW: 10,
  mouthY: 24,
  mouthScale: 0.95,
  accentX: 38,
  accentY: -14,
};

/**
 * Gus reads tired: eyes low and small, brows near-horizontal, mouth set wide and flat.
 *
 * His mouth sits lower than anyone else's because he is the only character with something
 * between his nose and his mouth. At 26 the wider mouths — grimace, gasp — collided with
 * the moustache; 30 clears it and still leaves 12 units of chin.
 */
export const GUS_FACE: FaceMetrics = {
  eyeX: 16,
  eyeY: 4,
  eyeRx: 3.6,
  eyeRy: 2.8,
  wideR: 8.5,
  pupilR: 3.2,
  browY: -13,
  browHalfW: 11,
  mouthY: 30,
  mouthScale: 1.0,
  accentX: 40,
  accentY: -12,
};

/** Mochi's face is three marks on a loaf. Everything is tiny on purpose. */
export const MOCHI_FACE: FaceMetrics = {
  eyeX: 11,
  eyeY: -2,
  eyeRx: 2.6,
  eyeRy: 3.2,
  wideR: 6.5,
  pupilR: 2.6,
  browY: -14,
  browHalfW: 6,
  mouthY: 9,
  mouthScale: 0.55,
  accentX: 24,
  accentY: -12,
};

/**
 * The NPC face. Plain on purpose.
 *
 * Every number here sits between two cast members' numbers so it reads as "a person" and
 * never as "one of them" — an NPC that accidentally resembles Bill is worse than an ugly
 * one, because it makes the recurring cast feel disposable.
 */
export const NPC_FACE: FaceMetrics = {
  eyeX: 15,
  eyeY: 2,
  eyeRx: 3.6,
  eyeRy: 3.8,
  wideR: 9,
  pupilR: 3.4,
  browY: -15,
  browHalfW: 10,
  mouthY: 25,
  mouthScale: 0.85,
  accentX: 39,
  accentY: -13,
};
