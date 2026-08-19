/**
 * types.ts — the character system's vocabulary.
 *
 * Every recurring character in this channel is DATA that satisfies these types. Nothing
 * about a character lives in scene code: a scene names a character, a pose and an
 * expression, and the system supplies the drawing. That indirection is the entire point —
 * it is what stops the cast from drifting between episodes.
 *
 * The split is strict and load-bearing:
 *
 *   SHAPE      identity   — proportions, hair, glasses, palette   (Build + palette)
 *   EXPRESSION emotion    — eyes, brows, mouth                    (Expression)
 *   ROUGH.JS   line       — how the ink behaves                   (style/tokens.ts)
 *   REMOTION   movement   — poses over time                       (animation/*)
 *
 * A change in one of those must never require a change in another.
 */

import type React from 'react';

export type Vec2 = readonly [number, number];

// ---------------------------------------------------------------------------
// skeleton
// ---------------------------------------------------------------------------

/**
 * A noodle limb, described by where its END lands plus how far the midpoint bows.
 *
 * Noodle limbs have no elbow or knee, so one curve is the whole anatomy. Two poses can
 * therefore be blended by interpolating three numbers, which is what makes `blendPose`
 * cheap enough to run per frame.
 */
export type Limb = { x: number; y: number; bend: number };

/** What a hand is doing. Meaning, not anatomy — at Shorts size fingers are noise. */
export type HandState = 'mitten' | 'fist' | 'point' | 'palm' | 'grip';

export type Pose = {
  /** Moves the entire body (sitting, crouching, slumping). */
  rootOffset?: [number, number];
  /** Degrees; positive tips the head to screen right. */
  headTilt?: number;
  headOffset?: [number, number];
  /** Degrees of torso lean. */
  torsoLean?: number;
  /** Squash and stretch, applied about the hip. */
  bodyScale?: [number, number];
  /**
   * Where the arms sit in the layer stack. Omit and the renderer decides.
   *
   * A boolean was not enough. Three cases exist and each is real:
   *
   *   front      the default. In front of the torso, behind the head — which is what
   *              fixed the floating-hands bug the previous character shipped with.
   *   overHead   in front of the head too. Required for hands ON the face, and applied
   *              automatically to any pose whose hand rises above the jaw, because this
   *              head is wide enough to swallow a raised arm whole.
   *   behind     behind the torso, so the arms are genuinely hidden. Only `armsBehindBack`
   *              and `armsBehindHead` want this, and both are unreadable without it —
   *              hands clasped behind the back drawn in FRONT read as hands at the crotch.
   */
  armLayer?: 'behind' | 'front' | 'overHead';
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
  handL?: HandState;
  handR?: HandState;
  /** Rotation of each hand, degrees. Lets `point` aim without authoring a second pose. */
  handRotL?: number;
  handRotR?: number;
};

/**
 * Proportions. This is the only thing that differs structurally between cast members —
 * everyone shares one rig contract (hip at origin, up is -Y) and one renderer.
 */
export type Build = {
  /** Head centre in rig space. */
  headCenter: Vec2;
  /** Head half-width / half-height. Heads are rounded rectangles, not ellipses. */
  headHW: number;
  headHH: number;
  /** Corner radius of the head. Low = square jaw (Gus), high = round (Mina). */
  headR: number;
  /** Shoulder anchors sit ON the torso's outer edge so arms emerge from the silhouette. */
  shoulderX: number;
  shoulderY: number;
  /** Torso outline: vertical span plus half-width at the hip. */
  torsoTop: number;
  torsoBottom: number;
  hipHalfW: number;
  /** Hip anchors for the legs. */
  hipX: number;
  hipY: number;
  /** Where a resting foot lands. */
  groundY: number;
  /** Shorts/trouser block, drawn between torso and legs. */
  pantsTop: number;
  pantsBottom: number;
  pantsHalfW: number;
  /** Radius of a hand, and the foot ellipse. */
  handRadius: number;
  footRx: number;
  footRy: number;
  /** Nominal full height, head top to sole. Documentation + QA framing. */
  height: number;
};

// ---------------------------------------------------------------------------
// face
// ---------------------------------------------------------------------------

export type EyeState =
  | 'open'
  | 'wide'
  | 'squint'
  | 'closed'
  | 'happyArc'
  | 'halfLid'
  | 'tired'
  | 'dizzy'
  | 'dots'
  | 'cross'
  | 'sparkle';

export type BrowState =
  | 'neutral'
  | 'raised'
  | 'worried'
  | 'angry'
  | 'suspicious'
  | 'tired'
  | 'flat'
  | 'asym';

export type MouthState =
  | 'line'
  | 'flat'
  | 'squiggle'
  | 'smile'
  | 'bigSmile'
  | 'grin'
  | 'smirk'
  | 'frown'
  | 'wavy'
  | 'o'
  | 'gasp'
  | 'grimace'
  | 'openLaugh'
  | 'tinyFrown'
  | 'catW';

/**
 * Talking is deliberately NOT lip sync. Four mouth shapes switched on a rhythm read as
 * speech at Shorts length, and phoneme accuracy is invisible at this scale. The emotional
 * state survives because only the mouth is replaced — eyes and brows keep the expression.
 */
export type TalkState = 'talkClosed' | 'talkSmall' | 'talkMedium' | 'talkWide';

/** Non-verbal marks that ride on top of a face. */
export type FaceAccent = 'sweat' | 'blush' | 'angerVein' | 'shadow' | 'sparkleMark';

export type Expression = {
  eyes: EyeState;
  brow: BrowState;
  mouth: MouthState;
  /** Pupil offset inside the eye, -1..1 per axis. */
  look?: [number, number];
  mouthScale?: number;
  accents?: FaceAccent[];
};

export type GazeName = 'center' | 'left' | 'right' | 'up' | 'down' | 'camera' | 'away';

// ---------------------------------------------------------------------------
// creatures
// ---------------------------------------------------------------------------

/**
 * Mochi is not a humanoid, and pretending otherwise would mean a rig full of unused
 * joints. Creatures get their own pose shape and their own renderer, but the SAME
 * registry, expression grammar and QA pipeline — which is what keeps them in the
 * universe rather than making them a second art style.
 */
export type CreatureLegs =
  | 'loaf'
  | 'stand'
  | 'sit'
  | 'walkA'
  | 'walkB'
  | 'runA'
  | 'runB'
  | 'jump'
  | 'stretch'
  | 'tuck'
  | 'pounce';

export type CreaturePose = {
  rootOffset?: [number, number];
  bodyTilt?: number;
  bodyScale?: [number, number];
  headOffset?: [number, number];
  headTilt?: number;
  /** Ear rotation in degrees, [left, right]. Ears carry most of the acting. */
  ears?: [number, number];
  /** Tail: how far it curls, how high it lifts, and how far it swings. */
  tail: { curl: number; lift: number; swing?: number };
  legs: CreatureLegs;
  /** Front paws lifted, [left, right], in units. Begging, holding, batting. */
  paws?: [number, number];
};

// ---------------------------------------------------------------------------
// look
// ---------------------------------------------------------------------------

/** How far a face is turned. The rig is front-facing; this is a cheat, not a rotation. */
export type Facing = 'front' | 'left34' | 'right34';

export type CharacterPalette = {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  shirt: string;
  shirtShade: string;
  pants: string;
  shoe: string;
  outline: string;
  /** Only Bill has these, but the field keeps the type uniform. */
  glasses?: string;
};

/**
 * An overlay drawn on top of the canonical character.
 *
 * Costumes are additive on purpose. A hat does not replace Bill's hair, it sits on it —
 * so Bill in an astronaut helmet is still visibly Bill, which is the whole reason the
 * identity anchors exist.
 */
export type AccessorySlot = 'head' | 'face' | 'torso' | 'back' | 'handL' | 'handR';

export type AccessoryDef = {
  id: string;
  slot: AccessorySlot;
  /** Rendered in the slot's local space. */
  render: (ctx: { palette: CharacterPalette; build: Build; seed: string }) => React.ReactNode;
  /** Hides the character's hair — a full helmet needs this, a cap does not. */
  hidesHair?: boolean;
};

// ---------------------------------------------------------------------------
// motion personality
// ---------------------------------------------------------------------------

/**
 * How a character MOVES, as parameters over the existing animation primitives.
 *
 * There is no per-character animation engine. Bill hesitating and Gus barely moving are
 * the same `wobble` and the same `usePoseSwap` fed different numbers — which is the only
 * version of this that survives five characters and hundreds of episodes.
 */
export type MotionPersonality = {
  /** Multiplies the transform-level idle drift. Gus is nearly still; Dex bounces. */
  idle: number;
  /** Frames of hesitation before this character reacts to a beat. */
  reactionDelay: number;
  /** Preferred pose-hold quantisation: 2 = on twos, 4 = slow and deadpan. */
  holdStep: number;
  /** Multiplies pose-change magnitude — Dex overshoots, Mina under-reacts. */
  gestureScale: number;
  /** Frames between blinks, on average. */
  blinkEvery: number;
  /** Frames a gaze target is held before a saccade. */
  gazeHold: number;
};

// ---------------------------------------------------------------------------
// the character definition
// ---------------------------------------------------------------------------

export type CharacterId = 'bill' | 'mina' | 'dex' | 'gus' | 'mochi';

/**
 * Which hair asset a figure wears.
 *
 * Declared here rather than in `characters/hair.ts` so a definition can name its hair
 * without the type layer depending on the geometry layer. `npc` is the deliberately
 * plain cap — see `npc.ts` for why episode extras must never wear a cast member's hair.
 */
export type HairId = 'bill' | 'mina' | 'dex' | 'gus' | 'npc';

/**
 * The id on a definition. Wider than `CharacterId` because episode-scoped NPCs render
 * through the same component but are NOT part of the canonical cast and never appear in
 * the registry.
 */
export type DefId = CharacterId | 'npc';

export type ScaleProfile = {
  /** Character-space scale used when this character is the subject of a shot. */
  hero: number;
  medium: number;
  background: number;
};

type CharacterCommon = {
  id: DefId;
  name: string;
  role: string;
  palette: CharacterPalette;
  defaultExpression: string;
  defaultPose: string;
  expressions: Record<string, Expression>;
  accessories: Record<string, AccessoryDef>;
  scaleProfile: ScaleProfile;
  /** Seed namespace. Two characters must never share one or they draw identically. */
  roughSeed: string;
  motion: MotionPersonality;
  /** The things that may never change. Prose, but binding — see CHARACTER_BIBLE.md. */
  anchors: string[];
  /**
   * The poses and expressions this character actually performs.
   *
   * Every humanoid can reach the whole shared library — a pose is a body attitude, not a
   * personality — but each character has a working set that the QA sheets show and that
   * scene authors should reach for first. Curation by convention, not by restriction:
   * duplicating a near-identical pose per character is how a library rots to sixty
   * entries that all look the same.
   */
  corePoses: string[];
  coreExpressions: string[];
};

export type HumanoidDef = CharacterCommon & {
  kind: 'humanoid';
  build: Build;
  poses: Record<string, Pose>;
  /** `null` for a figure drawn bald. Mochi is a creature and has none at all. */
  hair: HairId | null;
};

export type CreatureDef = CharacterCommon & {
  kind: 'creature';
  poses: Record<string, CreaturePose>;
};

export type CharacterDef = HumanoidDef | CreatureDef;
