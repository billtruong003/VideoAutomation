/**
 * rig.ts — the skeleton contract every cast member is animated on.
 *
 * This contract is INHERITED, not new. It was authored for the channel's first
 * protagonist and it was structurally sound, so Character System V1.0 kept every bit of
 * it and only replaced what sits on top:
 *
 *   - the HIP is the origin (0, 0)
 *   - up is negative Y
 *   - a character stands ~185 units tall, head top to sole
 *   - a pose is pure joint data; position and scale are transforms applied to the output
 *
 * What V1.0 added is `Build`: the proportions that differ between characters. Bill has a
 * huge rounded-square head on a tiny body; Gus is stockier; Mina is narrower. They are
 * all the same skeleton with different numbers, which is why one renderer, one pose
 * library and one blend function serve the whole cast.
 *
 *   RIG    = skeleton / animation contract   (this file)
 *   BUILD  = proportions                     (this file)
 *   LOOK   = hair, glasses, palette          (characters/*)
 */

import type { Build, Limb, Pose, Vec2 } from './types';

export type { Build, Expression, Limb, Pose, Vec2 } from './types';
export type {
  BrowState,
  CharacterDef,
  CharacterId,
  CreaturePose,
  EyeState,
  Facing,
  HandState,
  MouthState,
  TalkState,
} from './types';

// ---------------------------------------------------------------------------
// builds
// ---------------------------------------------------------------------------

/**
 * The house proportions, and the base every cast member is derived from.
 *
 * These are Bill's numbers because Bill is the channel mascot and everyone else is
 * measured against him. `buildFrom` takes the deltas.
 */
export const BILL_BUILD: Build = {
  headCenter: [0, -100],
  headHW: 48,
  headHH: 43,
  /*
   * 20, not 26. At 26 the corner arc ate most of the jaw, and with the mop covering the
   * top corners the remaining silhouette read as an oval — losing the broad cheeks and
   * simple lower jaw the design depends on.
   */
  headR: 20,
  /*
   * Shoulders sit at the torso's outer top corner, NOT tucked inside it.
   *
   * The previous revision anchored arms at ±17 while the torso was ±17 wide, so a resting
   * arm travelled entirely inside the torso silhouette and — with arms drawn behind the
   * body — vanished, leaving the hand as a dot floating in space. Anchoring on the edge
   * is half the fix; drawing arms in front of the torso is the other half.
   */
  shoulderX: 19,
  shoulderY: -52,
  torsoTop: -56,
  torsoBottom: 2,
  hipHalfW: 14,
  hipX: 10,
  hipY: 4,
  groundY: 36,
  pantsTop: -6,
  pantsBottom: 15,
  pantsHalfW: 16,
  handRadius: 7.6,
  footRx: 10.5,
  footRy: 5.8,
  height: 185,
};

/** Derive a build from Bill's, overriding only what actually differs. */
export const buildFrom = (over: Partial<Build>): Build => ({ ...BILL_BUILD, ...over });

/**
 * LEGACY alias.
 *
 * Pre-V1.0 modules (props, backgrounds, a couple of scene helpers) import `RIG` for the
 * head centre and ground line. It resolves to Bill's build so those call sites keep
 * meaning what they meant, and the fields they used are mapped across.
 */
export const RIG = {
  headCenter: BILL_BUILD.headCenter,
  headRx: BILL_BUILD.headHW,
  headRy: BILL_BUILD.headHH,
  shoulderL: [-BILL_BUILD.shoulderX, BILL_BUILD.shoulderY] as Vec2,
  shoulderR: [BILL_BUILD.shoulderX, BILL_BUILD.shoulderY] as Vec2,
  hipL: [-BILL_BUILD.hipX, BILL_BUILD.hipY] as Vec2,
  hipR: [BILL_BUILD.hipX, BILL_BUILD.hipY] as Vec2,
  groundY: BILL_BUILD.groundY,
  height: BILL_BUILD.height,
} as const;

export const shoulderOf = (b: Build, side: 'L' | 'R'): Vec2 =>
  [side === 'L' ? -b.shoulderX : b.shoulderX, b.shoulderY] as Vec2;

export const hipOf = (b: Build, side: 'L' | 'R'): Vec2 =>
  [side === 'L' ? -b.hipX : b.hipX, b.hipY] as Vec2;

// ---------------------------------------------------------------------------
// pose maths
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpLimb(a: Limb, b: Limb, t: number): Limb {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), bend: lerp(a.bend, b.bend, t) };
}

const pair = (
  a: readonly [number, number] | undefined,
  b: readonly [number, number] | undefined,
  t: number,
): [number, number] => [lerp(a?.[0] ?? 0, b?.[0] ?? 0, t), lerp(a?.[1] ?? 0, b?.[1] ?? 0, t)];

/** Blend two named poses. Used by PoseSwap for anticipation and settle. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  return {
    rootOffset: pair(a.rootOffset, b.rootOffset, t),
    headTilt: lerp(a.headTilt ?? 0, b.headTilt ?? 0, t),
    headOffset: pair(a.headOffset, b.headOffset, t),
    torsoLean: lerp(a.torsoLean ?? 0, b.torsoLean ?? 0, t),
    bodyScale: [
      lerp(a.bodyScale?.[0] ?? 1, b.bodyScale?.[0] ?? 1, t),
      lerp(a.bodyScale?.[1] ?? 1, b.bodyScale?.[1] ?? 1, t),
    ],
    // discrete properties belong to whichever pose is more than half applied
    armLayer: t < 0.5 ? a.armLayer : b.armLayer,
    handL: t < 0.5 ? a.handL : b.handL,
    handR: t < 0.5 ? a.handR : b.handR,
    handRotL: lerp(a.handRotL ?? 0, b.handRotL ?? 0, t),
    handRotR: lerp(a.handRotR ?? 0, b.handRotR ?? 0, t),
    armL: lerpLimb(a.armL, b.armL, t),
    armR: lerpLimb(a.armR, b.armR, t),
    legL: lerpLimb(a.legL, b.legL, t),
    legR: lerpLimb(a.legR, b.legR, t),
  };
}

/**
 * Control point for a noodle limb's curve: the midpoint of anchor->end, pushed
 * perpendicular by `bend`.
 *
 * Split out from `limbPath` because limbs are drawn as a sampled curve, which needs
 * POINTS rather than an SVG `d` string. Both callers share this maths so a limb bends
 * identically however it is rendered.
 */
export function limbControl(anchor: readonly [number, number], limb: Limb): [number, number] {
  const [ax, ay] = anchor;
  const dx = limb.x - ax;
  const dy = limb.y - ay;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  return [(ax + limb.x) / 2 + px * limb.bend, (ay + limb.y) / 2 + py * limb.bend];
}

/**
 * Quadratic-bezier path for a noodle limb: anchor -> end, bowed perpendicular by `bend`.
 * Returns an SVG `d` string. Retained for tooling that wants a path rather than points.
 */
export function limbPath(anchor: readonly [number, number], limb: Limb): string {
  const [ax, ay] = anchor;
  const [cx, cy] = limbControl(anchor, limb);
  return `M ${ax.toFixed(2)} ${ay.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${limb.x.toFixed(2)} ${limb.y.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// attachment points
// ---------------------------------------------------------------------------

/**
 * Where things can be hung on a posed character, in rig space.
 *
 * Scenes used to eyeball a prop into a hand and re-eyeball it for the next pose. Every
 * one of those was a magic number that silently broke when the pose changed. These are
 * derived from the pose itself, so a clock stays in the hand that holds it.
 */
export type Attachments = {
  handL: Vec2;
  handR: Vec2;
  /** Centre of the head, after head offset — hats, halos, thought bubbles. */
  head: Vec2;
  /** Crown of the head: the top edge, where a hat actually sits. */
  crown: Vec2;
  /** Middle of the face — glasses, masks, a speech anchor. */
  face: Vec2;
  /** Chest centre — badges, ties, held-to-the-chest props. */
  torso: Vec2;
  /** Behind the shoulders — backpacks, wings, capes. */
  back: Vec2;
  /** Between the feet at ground level — shadows, puddles, "standing on" props. */
  feet: Vec2;
};

export function attachmentsOf(pose: Pose, build: Build): Attachments {
  const [ox, oy] = pose.rootOffset ?? [0, 0];
  const [hox, hoy] = pose.headOffset ?? [0, 0];
  const [hcx, hcy] = build.headCenter;
  const headX = hcx + hox + ox;
  const headY = hcy + hoy + oy;

  return {
    handL: [pose.armL.x + ox, pose.armL.y + oy],
    handR: [pose.armR.x + ox, pose.armR.y + oy],
    head: [headX, headY],
    crown: [headX, headY - build.headHH],
    face: [headX, headY + build.headHH * 0.08],
    torso: [ox, (build.torsoTop + build.torsoBottom) / 2 + oy],
    back: [ox, build.torsoTop + 8 + oy],
    feet: [ox, build.groundY + build.footRy + oy],
  };
}

/**
 * Where a hand ends up in character space, after the pose's root offset.
 *
 * Kept as a named function because it is the single most-used attachment and scenes read
 * better with `handAnchor(pose, 'R')` than with a property lookup.
 */
export function handAnchor(pose: Pose, side: 'L' | 'R'): [number, number] {
  const limb = side === 'L' ? pose.armL : pose.armR;
  const [ox, oy] = pose.rootOffset ?? [0, 0];
  return [limb.x + ox, limb.y + oy];
}
