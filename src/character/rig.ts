/**
 * rig.ts — the skeleton contract for the channel protagonist, "Nib".
 *
 * Coordinate system (borrowed from Stix's asset contract, which is a good idea):
 *   - the HIP sits at the origin (0, 0)
 *   - up is negative Y
 *   - the character stands ~182 units tall, from head top (-140) to sole (+42)
 *
 * Scenes never touch these numbers; they place the character with a translate+scale
 * and describe what it is DOING with a named pose. That decoupling is what lets one
 * character serve every future episode.
 */

export const RIG = {
  /**
   * Head is deliberately ~half the total height. A doodle mascot reads by its head:
   * expression is the performance, the body is just a delivery mechanism for arms.
   */
  headCenter: [0, -100] as const,
  headRx: 44,
  headRy: 40,
  /**
   * Shoulders sit just below the head's lower edge (-60), not behind it. An earlier
   * revision tucked them at -36, which buried the whole torso under the head and made
   * the arms appear to sprout from the chin — at poster size it read as a head with stubs.
   */
  shoulderL: [-17, -56] as const,
  shoulderR: [17, -56] as const,
  hipL: [-10, 0] as const,
  hipR: [10, 0] as const,
  /** Where feet rest when standing. */
  groundY: 36,
  /** Nominal full height (head top -140 to sole +42). Head is ~44% of it. */
  height: 182,
} as const;

/**
 * A limb is described by where its END lands (hand or foot, in character space) plus a
 * `bend` — how far the midpoint bows perpendicular to the straight line. Noodle limbs
 * have no elbows or knees, so one curve per limb is the whole anatomy, and two poses
 * can be blended by simply interpolating these numbers.
 */
export type Limb = {
  x: number;
  y: number;
  bend: number;
};

export type Pose = {
  /** Moves the entire body (sitting, crouching, slumping). */
  rootOffset?: [number, number];
  /** Degrees; positive tips the head to the character's right (screen right). */
  headTilt?: number;
  headOffset?: [number, number];
  /** Degrees of torso lean. */
  torsoLean?: number;
  /** Squash and stretch, applied about the hip. */
  bodyScale?: [number, number];
  /**
   * Arms render BEHIND the torso and head by default — noodle limbs drawn on top read
   * as hands pasted onto the character rather than as part of it.
   *
   * Because of that, any hand placed inside the head or torso silhouette disappears, so
   * poses keep their hands clear of it. Set this flag only where the hand must be in
   * front of the face for the pose to mean anything (hand on chin, hands over cheeks).
   */
  armsInFront?: boolean;
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
};

export type EyeShape = 'open' | 'wide' | 'squint' | 'closed' | 'dizzy' | 'tired' | 'dots';
export type MouthShape =
  | 'line'
  | 'smile'
  | 'bigSmile'
  | 'frown'
  | 'o'
  | 'gasp'
  | 'wavy'
  | 'smirk'
  | 'grimace'
  | 'flat';

export type Expression = {
  eyes: EyeShape;
  /** Pupil offset within the eye, -1..1 on each axis. */
  look?: [number, number];
  /** -1 furrowed/angry, 0 flat, +1 raised/surprised. */
  brow?: number;
  /** Asymmetric brow tilt — one raised eyebrow reads as suspicion. */
  browSkew?: number;
  mouth: MouthShape;
  mouthScale?: number;
  sweat?: boolean;
};

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
    armL: lerpLimb(a.armL, b.armL, t),
    armR: lerpLimb(a.armR, b.armR, t),
    legL: lerpLimb(a.legL, b.legL, t),
    legR: lerpLimb(a.legR, b.legR, t),
  };
}

/**
 * Quadratic-bezier path for a noodle limb: anchor -> end, bowed perpendicular by `bend`.
 * Returns an SVG `d` string.
 */
export function limbPath(anchor: readonly [number, number], limb: Limb): string {
  const [ax, ay] = anchor;
  const dx = limb.x - ax;
  const dy = limb.y - ay;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;
  const cx = (ax + limb.x) / 2 + px * limb.bend;
  const cy = (ay + limb.y) / 2 + py * limb.bend;
  return `M ${ax.toFixed(2)} ${ay.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${limb.x.toFixed(2)} ${limb.y.toFixed(2)}`;
}

/**
 * Where a hand actually ends up in character space, after the pose's root offset.
 * Scenes use this to put a prop IN the character's hand instead of guessing.
 */
export function handAnchor(pose: Pose, side: 'L' | 'R'): [number, number] {
  const limb = side === 'L' ? pose.armL : pose.armR;
  const [ox, oy] = pose.rootOffset ?? [0, 0];
  return [limb.x + ox, limb.y + oy];
}
