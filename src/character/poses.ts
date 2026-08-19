/**
 * poses.ts — the protagonist's reusable pose library.
 *
 * These are episode-agnostic body attitudes, not casino-specific illustrations. Episode
 * 002 gets the same list for free. Naming stays generic and physical ("exhausted",
 * "pressingButton") rather than narrative ("guyWhoLostAtSlots").
 *
 * Numbers are in rig space: hip at (0,0), shoulders at (±17,-56), rest feet at y=36.
 * Arms reach WIDE, and they must: arms render BEHIND the torso and head, so any hand
 * placed inside that silhouette (head is a 44x40 ellipse at (0,-100)) simply disappears.
 * Hands therefore sit clear of the body on every pose except the two that set
 * `armsInFront` because the hand belongs on the face.
 *
 * Cycle frames use A/B suffixes so PoseSwap can flip between them on twos.
 */

import type { Pose } from './rig';

export const POSES = {
  /** Feet planted, arms hanging. The rest position everything blends from. */
  neutral: {
    armL: { x: -33, y: -24, bend: 5 },
    armR: { x: 33, y: -24, bend: -5 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Front-facing bouncy walk, frame A — left knee up, right foot planted. */
  walkA: {
    headOffset: [0, -3],
    armL: { x: -36, y: -36, bend: 8 },
    armR: { x: 29, y: -14, bend: -8 },
    legL: { x: -17, y: 23, bend: -11 },
    legR: { x: 13, y: 37, bend: -2 },
  },

  /** Walk frame B — mirrored. */
  walkB: {
    headOffset: [0, 2],
    armL: { x: -29, y: -14, bend: 8 },
    armR: { x: 36, y: -36, bend: -8 },
    legL: { x: -13, y: 37, bend: 2 },
    legR: { x: 17, y: 23, bend: 11 },
  },

  /** Right arm thrown out and up — "look at THAT". */
  pointing: {
    headTilt: -4,
    armL: { x: -30, y: -22, bend: 6 },
    armR: { x: 64, y: -94, bend: -11 },
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  /** Hand to chin — one of only two poses that reaches in front of the face. */
  thinking: {
    headTilt: -8,
    armsInFront: true,
    armL: { x: -28, y: -20, bend: 7 },
    armR: { x: 15, y: -66, bend: -28 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Palms-up shrug, arms flung wide. */
  confused: {
    headTilt: 9,
    armL: { x: -47, y: -46, bend: 14 },
    armR: { x: 47, y: -46, bend: -14 },
    legL: { x: -15, y: 36, bend: 3 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Arms flung up, body stretched tall. */
  surprised: {
    bodyScale: [0.93, 1.1],
    headOffset: [0, -5],
    armL: { x: -53, y: -86, bend: 11 },
    armR: { x: 53, y: -86, bend: -11 },
    legL: { x: -15, y: 34, bend: 2 },
    legR: { x: 15, y: 34, bend: -2 },
  },

  /** Leaning back, arms tucked in close — narrowed, guarded. */
  suspicious: {
    headTilt: -10,
    torsoLean: -4,
    armL: { x: -27, y: -40, bend: 19 },
    armR: { x: 28, y: -44, bend: -19 },
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Seated: whole body drops, knees splay forward. */
  sitting: {
    rootOffset: [0, 12],
    armL: { x: -24, y: -14, bend: 14 },
    armR: { x: 24, y: -14, bend: -14 },
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Seated, right arm out gripping a lever. */
  gambling: {
    rootOffset: [0, 12],
    headTilt: -3,
    armL: { x: -24, y: -14, bend: 14 },
    armR: { x: 54, y: -56, bend: -12 },
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Seated, right arm forward, finger on a button. */
  pressingButton: {
    rootOffset: [0, 12],
    armL: { x: -24, y: -14, bend: 14 },
    armR: { x: 50, y: -34, bend: -10 },
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Both hands together at chest height, head dipped to look down at them. */
  checkingWallet: {
    headTilt: 5,
    headOffset: [0, 5],
    armL: { x: -28, y: -34, bend: 17 },
    armR: { x: 28, y: -34, bend: -17 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Slumped, sunk, arms dead at the sides. */
  exhausted: {
    rootOffset: [0, 8],
    torsoLean: 7,
    headTilt: 12,
    headOffset: [4, 6],
    armL: { x: -37, y: -14, bend: 3 },
    armR: { x: 35, y: -12, bend: -2 },
    legL: { x: -19, y: 32, bend: 6 },
    legR: { x: 16, y: 32, bend: -7 },
  },

  /** Seated and wrecked — the payoff pose for the time-distortion gag. */
  exhaustedSitting: {
    rootOffset: [0, 18],
    torsoLean: 8,
    headTilt: 14,
    headOffset: [5, 6],
    armL: { x: -30, y: -4, bend: 9 },
    armR: { x: 29, y: -2, bend: -9 },
    legL: { x: -27, y: 25, bend: -15 },
    legR: { x: 27, y: 26, bend: 15 },
  },

  /** Off-balance, limbs loose. */
  dizzy: {
    torsoLean: -7,
    headTilt: -14,
    headOffset: [-4, 1],
    armL: { x: -42, y: -32, bend: 16 },
    armR: { x: 38, y: -14, bend: -18 },
    legL: { x: -21, y: 35, bend: 9 },
    legR: { x: 9, y: 36, bend: -10 },
  },

  /** Index finger up, chin lifted — the "OH." beat. */
  realization: {
    headTilt: -6,
    headOffset: [0, -4],
    armL: { x: -29, y: -24, bend: 6 },
    armR: { x: 55, y: -112, bend: -8 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Hands behind the head, leaning back. */
  relaxed: {
    torsoLean: -5,
    headTilt: 4,
    armL: { x: -40, y: -96, bend: 22 },
    armR: { x: 40, y: -96, bend: -22 },
    legL: { x: -18, y: 36, bend: 5 },
    legR: { x: 17, y: 36, bend: -5 },
  },

  /** Hands to the face, body stretched — pure horror. */
  horrified: {
    bodyScale: [0.89, 1.13],
    armsInFront: true,
    headOffset: [0, -6],
    armL: { x: -36, y: -104, bend: 14 },
    armR: { x: 36, y: -104, bend: -14 },
    legL: { x: -18, y: 34, bend: 6 },
    legR: { x: 17, y: 34, bend: -6 },
  },

  /** Both hands out front, ready to carry a prop. */
  holdingObject: {
    armL: { x: -31, y: -54, bend: 10 },
    armR: { x: 31, y: -54, bend: -10 },
    legL: { x: -15, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  /** Straining under something absurdly heavy. */
  holdingHeavy: {
    rootOffset: [0, 5],
    torsoLean: 2,
    bodyScale: [1.07, 0.93],
    armL: { x: -53, y: -68, bend: 11 },
    armR: { x: 53, y: -68, bend: -11 },
    legL: { x: -20, y: 34, bend: 7 },
    legR: { x: 20, y: 34, bend: -7 },
  },

  lookLeft: {
    headTilt: -6,
    headOffset: [-10, 0],
    armL: { x: -31, y: -24, bend: 6 },
    armR: { x: 32, y: -22, bend: -5 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  lookRight: {
    headTilt: 6,
    headOffset: [10, 0],
    armL: { x: -32, y: -22, bend: 5 },
    armR: { x: 31, y: -24, bend: -6 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Twisting to look behind — used for the final wallet reveal. */
  turningBack: {
    torsoLean: -3,
    headTilt: -9,
    headOffset: [-12, -1],
    bodyScale: [0.92, 1.03],
    armL: { x: -24, y: -38, bend: 14 },
    armR: { x: 38, y: -30, bend: -9 },
    legL: { x: -16, y: 36, bend: 4 },
    legR: { x: 11, y: 36, bend: -3 },
  },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;

export const POSE_NAMES = Object.keys(POSES) as PoseName[];
