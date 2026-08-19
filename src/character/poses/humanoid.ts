/**
 * humanoid.ts — the shared pose library for the whole humanoid cast.
 *
 * Poses are episode-agnostic body attitudes, not illustrations. They are named physically
 * ("pressingButton", "shockedBack") and never narratively ("guyWhoLostAtSlots"), which is
 * what lets Episode 002 use all of them without a single edit.
 *
 * Numbers are in rig space: hip at (0,0), shoulders on the torso's outer edge at
 * (±19,-52), rest feet at y=36. Bill's build is the reference; the other three humanoids
 * use the same coordinates against slightly different proportions, which is deliberate —
 * a pose has to mean the same thing on every character or the library is worthless.
 *
 * THE FLOATING-HANDS FIX, since it is the reason half these numbers changed:
 *
 * The previous library placed resting hands at ±33 with arms drawn BEHIND the torso and
 * shoulders anchored INSIDE it at ±17. A resting arm therefore travelled almost entirely
 * through the torso silhouette and was occluded, leaving the hand as a disc floating in
 * space with no visible connection to the body. Three things fixed it, and all three are
 * needed:
 *
 *   1. shoulders moved to the torso's outer EDGE, so an arm leaves the silhouette at once
 *   2. arms now draw in FRONT of the torso (`armLayer` overrides it where needed)
 *   3. resting hands sit clear of the torso's half-width plus a hand radius
 *
 * Rule of thumb when adding a pose: the torso half-width is 19 at the shoulder and 14 at
 * the hip. A hand at |x| < 26 will touch the body. That is allowed — it is no longer
 * invisible — but check it on the hand/arm QA sheet before shipping it.
 *
 * RAISED ARMS: the head is 96 units wide on a 38-unit torso, so it overhangs the shoulders
 * badly. The renderer detects a hand above the jaw and draws that arm in FRONT of the head
 * automatically, so a raised arm can no longer vanish — but a hand at |x| < 50 will still
 * cross the face. Raised hands therefore live out at |x| ≥ 56 unless the pose actually
 * wants a hand on the face.
 *
 * Cycle frames use A/B suffixes so PoseSwap can flip between them on twos.
 */

import type { Pose } from '../types';

export const HUMANOID_POSES = {
  // -------------------------------------------------------------------------
  // rest and stance
  // -------------------------------------------------------------------------

  /** Feet planted, arms hanging clear of the body. Everything blends from here. */
  neutral: {
    armL: { x: -30, y: -16, bend: 6 },
    armR: { x: 30, y: -16, bend: -6 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /**
   * Loose and unbothered: weight dumped onto one hip, one hand parked there, head tipped.
   *
   * The first version was neutral with a 3-degree lean and read as the same drawing on the
   * pose sheet. A pose that cannot be told apart from its neighbour is not a pose.
   */
  relaxed: {
    torsoLean: -6,
    headTilt: 8,
    headOffset: [4, 1],
    armL: { x: -34, y: -6, bend: 12 },
    armR: { x: 21, y: -4, bend: -24 },
    handR: 'fist',
    legL: { x: -20, y: 36, bend: 9 },
    legR: { x: 9, y: 36, bend: -4 },
  },

  /** Upright, still, ready. The "something is about to happen" stand. */
  standAlert: {
    headOffset: [0, -2],
    bodyScale: [0.98, 1.03],
    armL: { x: -28, y: -22, bend: 4 },
    armR: { x: 28, y: -22, bend: -4 },
    legL: { x: -12, y: 36, bend: 1 },
    legR: { x: 12, y: 36, bend: -1 },
  },

  /**
   * Hands behind the head, leaning back.
   *
   * The one pose that WANTS the arms occluded, so it opts out of the automatic
   * over-the-head layering explicitly. The hands sit at ±68 — wide enough to clear a
   * 96-unit skull and still be seen, which is what makes the pose readable at all.
   */
  armsBehindHead: {
    torsoLean: -5,
    headTilt: 4,
    armLayer: 'behind',
    armL: { x: -68, y: -114, bend: 26 },
    armR: { x: 68, y: -114, bend: -26 },
    legL: { x: -18, y: 36, bend: 5 },
    legR: { x: 17, y: 36, bend: -5 },
  },

  /**
   * Forearms crossed over the chest.
   *
   * Two things make the cross read, and it took two passes to land both: the forearms must
   * sit at clearly DIFFERENT heights, and each hand must finish OUTSIDE the far edge of the
   * torso. Stopping at ±21 — barely past the midline — still read as hands tucked at the
   * belly on the hand/arm sheet, because both curves stayed inside the same silhouette.
   * At ±29 the hands break the outline on the opposite side and the cross becomes legible.
   */
  armsCrossed: {
    torsoLean: -1,
    armL: { x: 29, y: -36, bend: -14 },
    armR: { x: -29, y: -22, bend: 14 },
    handL: 'grip',
    handR: 'grip',
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Hands on hips. Mina's default authority stance. */
  handsOnHips: {
    armL: { x: -20, y: -6, bend: 22 },
    armR: { x: 20, y: -6, bend: -22 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -15, y: 36, bend: 3 },
    legR: { x: 15, y: 36, bend: -3 },
  },

  /**
   * Hands clasped behind the back. Gus, surveying something he disapproves of.
   *
   * Needs `behind` explicitly: drawn in front of the torso, as everything else now is,
   * two fists at hip height in front of the body read as hands at the crotch rather than
   * as hands behind the back. The cast line-up caught it.
   */
  armsBehindBack: {
    armLayer: 'behind',
    torsoLean: -2,
    armL: { x: -9, y: 4, bend: 20 },
    armR: { x: 9, y: 4, bend: -20 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -16, y: 36, bend: 3 },
    legR: { x: 16, y: 36, bend: -3 },
  },

  // -------------------------------------------------------------------------
  // locomotion
  // -------------------------------------------------------------------------

  /** Front-facing bouncy walk, frame A — left knee up, right foot planted. */
  walkA: {
    headOffset: [0, -3],
    armL: { x: -33, y: -30, bend: 9 },
    armR: { x: 27, y: -8, bend: -9 },
    legL: { x: -17, y: 23, bend: -11 },
    legR: { x: 13, y: 37, bend: -2 },
  },

  /** Walk, frame B — the mirror. */
  walkB: {
    headOffset: [0, 1],
    armL: { x: -27, y: -8, bend: 9 },
    armR: { x: 33, y: -30, bend: -9 },
    legL: { x: -13, y: 37, bend: 2 },
    legR: { x: 17, y: 23, bend: 11 },
  },

  /** Run A — leaning in, arms pumping hard, one knee high. */
  runA: {
    torsoLean: -8,
    headOffset: [3, -4],
    bodyScale: [1.02, 0.98],
    armL: { x: -36, y: -46, bend: 14 },
    armR: { x: 26, y: 2, bend: -14 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -22, y: 16, bend: -16 },
    legR: { x: 18, y: 36, bend: 8 },
  },

  /** Run B. */
  runB: {
    torsoLean: -8,
    headOffset: [3, 0],
    bodyScale: [1.02, 0.98],
    armL: { x: -26, y: 2, bend: 14 },
    armR: { x: 36, y: -46, bend: -14 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -18, y: 36, bend: -8 },
    legR: { x: 22, y: 16, bend: 16 },
  },

  /** Exaggerated tiptoe. Dex approaching something he should leave alone. */
  sneak: {
    torsoLean: -10,
    headOffset: [6, 2],
    rootOffset: [0, 4],
    armL: { x: -34, y: -40, bend: 16 },
    armR: { x: 34, y: -38, bend: -16 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -20, y: 30, bend: -8 },
    legR: { x: 16, y: 34, bend: 6 },
  },

  // -------------------------------------------------------------------------
  // pointing and presenting
  // -------------------------------------------------------------------------

  /** Right arm out and up at the classic explainer angle. */
  pointing: {
    headTilt: -3,
    armL: { x: -28, y: -18, bend: 6 },
    armR: { x: 66, y: -84, bend: -14 },
    handR: 'point',
    handRotR: -35,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  /** Pointing to screen left. */
  pointLeft: {
    headTilt: -5,
    headOffset: [-6, 0],
    armL: { x: -62, y: -52, bend: 12 },
    armR: { x: 27, y: -16, bend: -6 },
    handL: 'point',
    handRotL: 160,
    legL: { x: -15, y: 36, bend: 3 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Pointing to screen right. */
  pointRight: {
    headTilt: 5,
    headOffset: [6, 0],
    armL: { x: -27, y: -16, bend: 6 },
    armR: { x: 62, y: -52, bend: -12 },
    handR: 'point',
    handRotR: 20,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -3 },
  },

  /** Index finger up, chin lifted. The "OH." beat. */
  pointUp: {
    headTilt: -6,
    headOffset: [0, -4],
    armL: { x: -29, y: -20, bend: 6 },
    armR: { x: 68, y: -124, bend: -12 },
    handR: 'point',
    handRotR: -80,
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Both palms open toward the viewer. Explaining, or asking to be believed. */
  explaining: {
    headTilt: -2,
    armL: { x: -38, y: -44, bend: 12 },
    armR: { x: 38, y: -44, bend: -12 },
    handL: 'palm',
    handR: 'palm',
    handRotL: 12,
    handRotR: -12,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** One palm up, presenting a terrible idea as though it were a good one. */
  presenting: {
    torsoLean: -4,
    headTilt: -6,
    armL: { x: -28, y: -16, bend: 7 },
    armR: { x: 46, y: -52, bend: -16 },
    handR: 'palm',
    handRotR: -25,
    legL: { x: -15, y: 36, bend: 3 },
    legR: { x: 16, y: 36, bend: -2 },
  },

  /** Hand beside the mouth, leaning in. Conspiratorial. */
  whisper: {
    torsoLean: -7,
    headTilt: 7,
    headOffset: [8, 2],
    armLayer: 'overHead',
    armL: { x: -28, y: -14, bend: 8 },
    armR: { x: 24, y: -84, bend: -22 },
    handR: 'palm',
    handRotR: -70,
    legL: { x: -16, y: 36, bend: 4 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Flat palm out: stop. Gus's most-used gesture. */
  stopHand: {
    armL: { x: -26, y: -14, bend: 6 },
    armR: { x: 40, y: -58, bend: -10 },
    handR: 'palm',
    handRotR: -90,
    legL: { x: -16, y: 36, bend: 3 },
    legR: { x: 16, y: 36, bend: -3 },
  },

  // -------------------------------------------------------------------------
  // thinking and reacting
  // -------------------------------------------------------------------------

  /** Knuckle at the chin. Needs the hand in front of the face to mean anything. */
  thinking: {
    headTilt: 6,
    headOffset: [4, 2],
    armLayer: 'overHead',
    armL: { x: -28, y: -16, bend: 8 },
    armR: { x: 14, y: -62, bend: -30 },
    handR: 'fist',
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Arms out and low, palms up: "what?" */
  confused: {
    headTilt: -7,
    armL: { x: -44, y: -34, bend: 15 },
    armR: { x: 44, y: -34, bend: -15 },
    handL: 'palm',
    handR: 'palm',
    handRotL: 25,
    handRotR: -25,
    legL: { x: -15, y: 36, bend: 3 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Shoulders up, palms out, head sunk. The full "I don't know". */
  shrug: {
    headOffset: [0, 6],
    bodyScale: [1.04, 0.94],
    armL: { x: -40, y: -48, bend: 16 },
    armR: { x: 40, y: -48, bend: -16 },
    handL: 'palm',
    handR: 'palm',
    handRotL: 30,
    handRotR: -30,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** A smaller shrug — one shoulder, barely committed. Gus's version. */
  tinyShrug: {
    headTilt: 4,
    headOffset: [2, 3],
    armL: { x: -30, y: -22, bend: 9 },
    armR: { x: 32, y: -30, bend: -11 },
    handR: 'palm',
    handRotR: -20,
    legL: { x: -15, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  /** Palm over the face. */
  facepalm: {
    headTilt: 9,
    headOffset: [-2, 4],
    torsoLean: 3,
    armLayer: 'overHead',
    armL: { x: -30, y: -16, bend: 8 },
    armR: { x: 8, y: -100, bend: -26 },
    handR: 'palm',
    handRotR: -100,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Head cocked, arms drawn in. Reading someone's story and not buying it. */
  suspicious: {
    headTilt: -8,
    headOffset: [-4, 0],
    armL: { x: -26, y: -30, bend: 18 },
    armR: { x: 27, y: -34, bend: -18 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Straight-backed, hands folded low, chin level. Deliberately unreadable. */
  deadpanStand: {
    armL: { x: -13, y: -2, bend: 15 },
    armR: { x: 13, y: -2, bend: -15 },
    handL: 'mitten',
    handR: 'mitten',
    legL: { x: -13, y: 36, bend: 1 },
    legR: { x: 13, y: 36, bend: -1 },
  },

  /** Hands behind the back, weight even, eyes forward. "Who, me?" */
  innocentStand: {
    armLayer: 'behind',
    headTilt: -5,
    headOffset: [0, -2],
    armL: { x: -8, y: 6, bend: 22 },
    armR: { x: 8, y: 6, bend: -22 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Leaning in hard, arms back. Dex arriving with news nobody wanted. */
  leanForward: {
    torsoLean: -12,
    headOffset: [10, 4],
    headTilt: -6,
    armL: { x: -38, y: -22, bend: 14 },
    armR: { x: 36, y: -20, bend: -14 },
    legL: { x: -20, y: 36, bend: 6 },
    legR: { x: 14, y: 36, bend: -3 },
  },

  // -------------------------------------------------------------------------
  // holding and operating
  // -------------------------------------------------------------------------

  /** Both hands out front at chest height, ready to carry something small. */
  holdingSmall: {
    armL: { x: -26, y: -44, bend: 13 },
    armR: { x: 26, y: -44, bend: -13 },
    handL: 'grip',
    handR: 'grip',
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Wide grip, braced. Straining under something absurd. */
  holdingLarge: {
    rootOffset: [0, 5],
    torsoLean: 2,
    bodyScale: [1.07, 0.93],
    armL: { x: -56, y: -64, bend: 12 },
    armR: { x: 56, y: -64, bend: -12 },
    handL: 'grip',
    handR: 'grip',
    legL: { x: -20, y: 34, bend: 7 },
    legR: { x: 20, y: 34, bend: -7 },
  },

  /** Right index out and forward. */
  pressingButton: {
    rootOffset: [0, 12],
    armL: { x: -28, y: -12, bend: 12 },
    armR: { x: 50, y: -34, bend: -10 },
    handR: 'point',
    handRotR: -10,
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Seated, right arm out gripping a lever. */
  gambling: {
    rootOffset: [0, 12],
    headTilt: -3,
    armL: { x: -28, y: -12, bend: 12 },
    armR: { x: 54, y: -56, bend: -12 },
    handR: 'grip',
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Both hands together at chest height, head dipped to look down at them. */
  checkingWallet: {
    headTilt: 5,
    headOffset: [0, 5],
    armL: { x: -22, y: -40, bend: 18 },
    armR: { x: 22, y: -40, bend: -18 },
    handL: 'grip',
    handR: 'grip',
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** Head down over both hands. The universal 2020s idle. */
  lookingAtPhone: {
    headTilt: 4,
    headOffset: [0, 8],
    torsoLean: 2,
    armL: { x: -20, y: -46, bend: 20 },
    armR: { x: 20, y: -46, bend: -20 },
    handL: 'grip',
    handR: 'point',
    handRotR: -60,
    legL: { x: -14, y: 36, bend: 2 },
    legR: { x: 14, y: 36, bend: -2 },
  },

  /** One arm out holding a board, the other writing on it. */
  clipboard: {
    headTilt: 6,
    headOffset: [-2, 5],
    armL: { x: -30, y: -40, bend: 16 },
    armR: { x: -6, y: -46, bend: -24 },
    handL: 'grip',
    handR: 'point',
    handRotR: 40,
    legL: { x: -15, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  /** Both hands up holding a sign above chest height. */
  holdingSign: {
    armL: { x: -46, y: -74, bend: 12 },
    armR: { x: 46, y: -74, bend: -12 },
    handL: 'grip',
    handR: 'grip',
    legL: { x: -15, y: 36, bend: 2 },
    legR: { x: 15, y: 36, bend: -2 },
  },

  // -------------------------------------------------------------------------
  // seated and low
  // -------------------------------------------------------------------------

  sitting: {
    rootOffset: [0, 12],
    armL: { x: -30, y: -12, bend: 12 },
    armR: { x: 30, y: -12, bend: -12 },
    legL: { x: -26, y: 24, bend: -17 },
    legR: { x: 26, y: 24, bend: 17 },
  },

  /** Seated and wrecked. */
  exhaustedSitting: {
    rootOffset: [0, 18],
    torsoLean: 8,
    headTilt: 14,
    headOffset: [5, 6],
    armL: { x: -33, y: -2, bend: 10 },
    armR: { x: 32, y: 0, bend: -10 },
    legL: { x: -27, y: 25, bend: -15 },
    legR: { x: 27, y: 26, bend: 15 },
  },

  /** Down on the haunches, knees up, arms forward. */
  crouching: {
    rootOffset: [0, 20],
    torsoLean: -4,
    headOffset: [2, 2],
    bodyScale: [1.05, 0.92],
    armL: { x: -30, y: 2, bend: 14 },
    armR: { x: 30, y: 2, bend: -14 },
    legL: { x: -24, y: 16, bend: -20 },
    legR: { x: 24, y: 16, bend: 20 },
  },

  /**
   * Flat out. Defeat, or the aftermath of a Dex idea.
   *
   * NOT a side-on lie. The first version rotated the torso 78 degrees about the hip, which
   * swung the head clean out of the frame — a front-facing rig has no axis to lie down
   * around. This is the front-on "splatted" convention instead: body squashed, head
   * dropped and tipped, limbs flung flat to the sides. It reads as collapsed and it cannot
   * break, because nothing is rotated far enough to leave the cell.
   *
   * If an episode genuinely needs a side-on body, rotate the whole character with the
   * component's `rotate` prop. That is a camera decision, not a pose.
   */
  lyingDown: {
    rootOffset: [0, 24],
    torsoLean: -4,
    bodyScale: [1.18, 0.68],
    headTilt: 22,
    headOffset: [-16, 26],
    armL: { x: -44, y: 8, bend: 10 },
    armR: { x: 42, y: 12, bend: -8 },
    legL: { x: -34, y: 20, bend: 12 },
    legR: { x: 36, y: 18, bend: -12 },
  },

  /** Slumped upright, arms dead at the sides. */
  exhausted: {
    rootOffset: [0, 8],
    torsoLean: 7,
    headTilt: 12,
    headOffset: [4, 6],
    armL: { x: -34, y: -8, bend: 4 },
    armR: { x: 33, y: -6, bend: -3 },
    legL: { x: -19, y: 32, bend: 6 },
    legR: { x: 16, y: 32, bend: -7 },
  },

  // -------------------------------------------------------------------------
  // big reactions
  // -------------------------------------------------------------------------

  /** Recoil: body back, arms up and out, stretched tall. */
  shockedBack: {
    torsoLean: 10,
    headTilt: 8,
    headOffset: [-6, -6],
    bodyScale: [0.92, 1.12],
    armL: { x: -62, y: -80, bend: 14 },
    armR: { x: 62, y: -80, bend: -14 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -20, y: 34, bend: 4 },
    legR: { x: 16, y: 34, bend: -6 },
  },

  /** Surprise, straight up. Arms flung, body stretched. */
  surprised: {
    rootOffset: [0, -4],
    bodyScale: [0.93, 1.1],
    headOffset: [0, -4],
    armL: { x: -62, y: -88, bend: 14 },
    armR: { x: 62, y: -88, bend: -14 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -15, y: 34, bend: 2 },
    legR: { x: 15, y: 34, bend: -2 },
  },

  /** Hands to the face, body stretched. */
  horrified: {
    bodyScale: [0.89, 1.13],
    armLayer: 'overHead',
    headOffset: [0, -6],
    armL: { x: -34, y: -102, bend: 16 },
    armR: { x: 34, y: -102, bend: -16 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -18, y: 34, bend: 6 },
    legR: { x: 17, y: 34, bend: -6 },
  },

  /** Arms flailing, off-balance, legs apart. */
  panic: {
    torsoLean: -9,
    headTilt: -12,
    headOffset: [-4, -4],
    bodyScale: [0.95, 1.08],
    armL: { x: -64, y: -96, bend: 22 },
    armR: { x: 46, y: -46, bend: -26 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -26, y: 30, bend: -10 },
    legR: { x: 22, y: 34, bend: 12 },
  },

  /** Airborne and losing. Body tipped back, everything up. */
  falling: {
    rootOffset: [0, -4],
    torsoLean: 15,
    headTilt: 13,
    headOffset: [-6, -2],
    bodyScale: [1.04, 0.95],
    armL: { x: -44, y: -92, bend: 18 },
    armR: { x: 38, y: -86, bend: -22 },
    handL: 'palm',
    handR: 'palm',
    legL: { x: -30, y: 14, bend: -18 },
    legR: { x: 25, y: 25, bend: 16 },
  },

  /**
   * Both fists up, body lifted. Victory.
   *
   * The fists have to clear the TOP of the head, not merely the sides. At head height with
   * a wide bow they read as hands clapped over the ears; up at y=-136 with the bow pulled
   * in, they read as raised. Noodle limbs stretch, which is what makes an 88-unit arm
   * acceptable on a character whose resting arm is 36.
   */
  celebrating: {
    rootOffset: [0, -8],
    bodyScale: [0.95, 1.08],
    headTilt: -4,
    armL: { x: -54, y: -136, bend: 9 },
    armR: { x: 54, y: -136, bend: -9 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -19, y: 32, bend: 5 },
    legR: { x: 19, y: 32, bend: -5 },
  },

  /** Fists down and forward, shoulders squared, leaning in. */
  angry: {
    torsoLean: -6,
    headOffset: [0, 4],
    bodyScale: [1.05, 0.96],
    armL: { x: -34, y: -26, bend: 16 },
    armR: { x: 34, y: -26, bend: -16 },
    handL: 'fist',
    handR: 'fist',
    legL: { x: -17, y: 36, bend: 4 },
    legR: { x: 17, y: 36, bend: -4 },
  },

  /** Head back, one hand on the belly. Laughing. */
  laughing: {
    torsoLean: 6,
    headTilt: -14,
    headOffset: [0, -4],
    armL: { x: -26, y: -20, bend: 20 },
    armR: { x: 40, y: -56, bend: -18 },
    handR: 'palm',
    legL: { x: -16, y: 36, bend: 4 },
    legR: { x: 16, y: 36, bend: -4 },
  },

  /** Off-balance, limbs loose, head lolling. */
  dizzy: {
    torsoLean: -7,
    headTilt: -14,
    headOffset: [-4, 1],
    armL: { x: -40, y: -28, bend: 17 },
    armR: { x: 37, y: -10, bend: -19 },
    legL: { x: -21, y: 35, bend: 9 },
    legR: { x: 9, y: 36, bend: -10 },
  },

  // -------------------------------------------------------------------------
  // head turns
  // -------------------------------------------------------------------------

  lookLeft: {
    headTilt: -6,
    headOffset: [-10, 0],
    armL: { x: -29, y: -18, bend: 7 },
    armR: { x: 30, y: -16, bend: -6 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  lookRight: {
    headTilt: 6,
    headOffset: [10, 0],
    armL: { x: -30, y: -16, bend: 6 },
    armR: { x: 29, y: -18, bend: -7 },
    legL: { x: -13, y: 36, bend: 2 },
    legR: { x: 13, y: 36, bend: -2 },
  },

  /** Twisting to look behind. */
  turningBack: {
    torsoLean: -3,
    headTilt: -9,
    headOffset: [-12, -1],
    bodyScale: [0.92, 1.03],
    armL: { x: -24, y: -34, bend: 15 },
    armR: { x: 36, y: -26, bend: -10 },
    legL: { x: -16, y: 36, bend: 4 },
    legR: { x: 11, y: 36, bend: -3 },
  },
} satisfies Record<string, Pose>;

export type HumanoidPoseName = keyof typeof HUMANOID_POSES;

/**
 * Names kept so pre-V1.0 episode code keeps compiling and meaning the same thing.
 *
 * These are ALIASES, not duplicates — each points at a pose that already exists. Adding a
 * near-identical pose instead is how a library grows to sixty entries that all look the
 * same, which is the failure mode this table exists to avoid.
 */
export const POSE_ALIASES = {
  holdingObject: 'holdingSmall',
  holdingHeavy: 'holdingLarge',
  realization: 'pointUp',
  shocked: 'shockedBack',
} as const satisfies Record<string, HumanoidPoseName>;
