/**
 * bill.ts — the channel mascot, canonically.
 *
 * Bill is the default audience surrogate. When an episode explains a weird thing, Bill is
 * the one it happens to: he gambles in the casino episode, he boards the plane in the
 * airline episode, he is the peasant in the medieval episode. That continuity is worth
 * more than any single joke, and it is only possible because nothing about how he is
 * drawn lives in a scene file.
 *
 * WHAT HE IS: nerdy, awkward, curious, slightly clueless, quietly chaotic, likeable.
 * WHAT HE IS NOT: heroic, cool, handsome, babyish, creepy, or over-designed.
 *
 * The nine identity anchors are enumerated in `anchors` below and are binding. A costume
 * may cover clothing; it may never take the head shape, the hair, the glasses or the
 * proportions, because those four are what survive being shrunk to a thumbnail.
 */

import { buildFrom } from '../rig';
import { BILL_FACE } from '../face/metrics';
import { POSES } from '../poses';
import { CAST } from '../../style/tokens';
import { BILL_ACCESSORIES } from './accessories';
import type { CharacterPalette, Expression, HumanoidDef } from '../types';

export const BILL_PALETTE: CharacterPalette = {
  skin: CAST.billSkin,
  skinShade: CAST.billSkinShade,
  hair: CAST.billHair,
  hairShade: CAST.billHairShade,
  shirt: CAST.billShirt,
  shirtShade: CAST.billShirtShade,
  pants: CAST.billPants,
  shoe: CAST.billShoe,
  outline: CAST.billOutline,
  glasses: CAST.billGlasses,
};

/**
 * Bill's proportions ARE the house proportions — everyone else is measured against him —
 * so his build is the base and this is the identity override.
 *
 * Head: 86 units on a 185-unit character, which is 46%. Slightly wider than tall (96x86),
 * corner radius 26 so it reads as a rounded square rather than an egg. Torso 58 units,
 * legs 32 visible below the shorts. A little box hanging below a huge head.
 */
export const BILL_BUILD_DEF = buildFrom({});

/**
 * The expression library. Sixteen canonical states plus four inherited from the first
 * episode, which are kept because they are genuinely distinct rather than to avoid a
 * migration: `curious` is not `surprised`, and `content` is not `happy`.
 *
 * Every entry is three vocabulary picks and nothing else. Note what is absent: no
 * coordinates, no sizes, no per-expression geometry. That is what makes the expression
 * sheet a real test — if a face looks wrong, the fault is in a vocabulary or in the
 * metrics, never in the expression, so it gets fixed once for all twenty.
 */
export const BILL_EXPRESSIONS = {
  /** The house look: not quite a line, not quite a smile, faintly uncertain. */
  neutral: { eyes: 'open', brow: 'neutral', mouth: 'squiggle' },

  happy: { eyes: 'happyArc', brow: 'raised', mouth: 'bigSmile' },

  smug: { eyes: 'squint', brow: 'suspicious', mouth: 'smirk' },


  confused: { eyes: 'open', brow: 'asym', mouth: 'wavy', look: [0.3, 0.12] },

  surprised: { eyes: 'wide', brow: 'raised', mouth: 'o' },

  shocked: { eyes: 'wide', brow: 'raised', mouth: 'gasp', mouthScale: 1.1 },

  /** Dread, not surprise. The brow is what separates it from `shocked`. */
  horrified: { eyes: 'wide', brow: 'worried', mouth: 'gasp', mouthScale: 1.3, accents: ['sweat'] },

  /** Eyes OPEN under a hard V brow. A squint here read as contentment, not anger. */
  angry: { eyes: 'open', brow: 'angry', mouth: 'grimace', accents: ['angerVein'] },

  /** Angry's smaller sibling: the eyes give up before the brow does. */
  annoyed: { eyes: 'halfLid', brow: 'angry', mouth: 'flat' },

  /**
   * Half-lidded, not squinting.
   *
   * The first pass gave `smug` and `suspicious` identical vocabularies and separated them
   * only by `look` — but a squint has no pupil to move, so the two rendered as the same
   * drawing. The side-glance is the whole point of suspicion, so this one keeps eyes that
   * can actually aim.
   */
  suspicious: { eyes: 'halfLid', brow: 'suspicious', mouth: 'smirk', look: [-0.6, 0] },

  worried: { eyes: 'open', brow: 'worried', mouth: 'tinyFrown', accents: ['sweat'] },

  sad: { eyes: 'open', brow: 'worried', mouth: 'frown', look: [0, 0.35] },

  exhausted: { eyes: 'tired', brow: 'tired', mouth: 'frown', accents: ['sweat'] },

  /** Straight to camera, giving nothing away. The channel's signature beat. */
  deadpan: { eyes: 'dots', brow: 'flat', mouth: 'flat' },

  laughing: { eyes: 'happyArc', brow: 'raised', mouth: 'openLaugh' },

  /** Everything at once. The shadow band across the eyes is what makes it panic. */
  panic: { eyes: 'wide', brow: 'worried', mouth: 'gasp', mouthScale: 1.2, accents: ['sweat', 'shadow'] },

  curious: { eyes: 'open', brow: 'raised', mouth: 'o', mouthScale: 0.7, look: [0.25, -0.2] },

  focused: { eyes: 'squint', brow: 'angry', mouth: 'flat', look: [0.1, 0] },

  content: { eyes: 'closed', brow: 'neutral', mouth: 'smile' },

  /** Over-stimulated. Spiral eyes, used at the peak of a sensory-overload beat. */
  dizzy: { eyes: 'dizzy', brow: 'raised', mouth: 'wavy' },
} satisfies Record<string, Expression>;

export type BillExpressionName = keyof typeof BILL_EXPRESSIONS;

export const BILL: HumanoidDef = {
  kind: 'humanoid',
  id: 'bill',
  name: 'Bill',
  role: 'Main protagonist and channel mascot. The default audience surrogate: whatever the episode is explaining, it happens to Bill.',
  palette: BILL_PALETTE,
  build: BILL_BUILD_DEF,
  defaultExpression: 'neutral',
  defaultPose: 'neutral',
  expressions: BILL_EXPRESSIONS,
  poses: POSES,
  hair: 'bill',
  accessories: BILL_ACCESSORIES,
  scaleProfile: { hero: 3.3, medium: 2.1, background: 1.15 },
  roughSeed: 'bill',
  /**
   * Hesitant. Bill reacts a beat late and then all at once, which is most of why he is
   * funny: the delay is the joke, and the snap is the punchline.
   */
  motion: { idle: 1, reactionDelay: 3, holdStep: 2, gestureScale: 1, blinkEvery: 78, gazeHold: 20 },
  anchors: [
    'huge rounded-square head, 46% of total height, wider than tall',
    'tiny body: a short blocky torso hanging below the head',
    'messy silver-grey mop with chunky uneven bangs and side locks',
    'black rectangular glasses, always, dominating the mid-face',
    'tiny simple eyes — small ink marks, never large pupils',
    'tiny awkward mouth, low on the face, squiggle at rest',
    'bright mustard-yellow top',
    'dark deep-blue shorts',
    'goofy nerdy silhouette: broad hair, narrow body, short limbs',
  ],
  corePoses: [
    'neutral', 'relaxed', 'standAlert', 'walkA', 'walkB', 'runA', 'runB',
    'pointLeft', 'pointRight', 'pointUp', 'thinking', 'confused', 'shrug', 'facepalm',
    'armsCrossed', 'holdingSmall', 'holdingLarge', 'pressingButton', 'checkingWallet',
    'lookingAtPhone', 'sitting', 'exhaustedSitting', 'crouching', 'shockedBack',
    'panic', 'falling', 'lyingDown', 'celebrating', 'angry', 'horrified',
  ],
  coreExpressions: [
    'neutral', 'happy', 'smug', 'confused', 'surprised', 'shocked', 'horrified',
    'angry', 'annoyed', 'suspicious', 'worried', 'sad', 'exhausted', 'deadpan',
    'laughing', 'panic', 'curious', 'focused', 'content', 'dizzy',
  ],
};

/** Bill's face metrics, re-exported so QA sheets can frame a close-up without a lookup. */
export { BILL_FACE };
