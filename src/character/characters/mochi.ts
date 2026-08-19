/**
 * mochi.ts — the silent mascot.
 *
 * Mochi does not speak. She reacts, steals, judges, appears where she should not, and
 * occasionally saves the situation by accident. Everything she communicates comes from
 * body shape, ears, tail and timing, which is why her pose library is larger relative to
 * her expression library than anyone else's — for Mochi, the pose IS the line.
 *
 * She is not a realistic cat and must not become one. She is a cream loaf with two
 * triangles, dot eyes and a tail: drawable from a handful of shapes, which is the whole
 * requirement for a character who has to survive being a 40-pixel background gag.
 */

import { MOCHI_FACE } from '../face/metrics';
import { CREATURE_POSES } from '../poses';
import { CAST } from '../../style/tokens';
import { MOCHI_ACCESSORIES } from './accessories';
import type { CharacterPalette, CreatureDef, Expression } from '../types';

export const MOCHI_PALETTE: CharacterPalette = {
  skin: CAST.mochiBody,
  skinShade: CAST.mochiBodyShade,
  hair: CAST.mochiAccent,
  hairShade: CAST.mochiAccentSoft,
  shirt: CAST.mochiBody,
  shirtShade: CAST.mochiBodyShade,
  pants: CAST.mochiAccent,
  shoe: CAST.mochiBody,
  outline: CAST.mochiOutline,
};

/**
 * Mochi's proportions.
 *
 * She has no `Build` because she has no shoulders, hips or noodle limbs — forcing her
 * onto the humanoid skeleton would mean a pose record full of joints that mean nothing.
 * These are the numbers her own renderer uses instead.
 *
 * Head and body deliberately OVERLAP rather than meeting at a neck. The merge is what
 * makes her read as a loaf instead of as a small person in a cat suit.
 */
export const MOCHI_GEOM = {
  bodyCenter: [0, 14] as const,
  bodyRx: 50,
  bodyRy: 28,
  /*
   * The head sits LOW and wide. The first pass had it at y=-22 with a near-circular
   * profile, and against a taller body the two shapes read as two stacked blobs — a snail,
   * not a cat. Dropping it 5 units and flattening it deepens the overlap so the two merge
   * into one loaf, which is the entire silhouette.
   */
  headCenter: [0, -17] as const,
  headRx: 33,
  headRy: 26,
  /*
   * Ear base offsets from the head centre, and the size of each triangle.
   *
   * The ears are drawn BEFORE the head, so the head covers whatever part of them sits
   * inside its outline and they appear to grow out of it. That makes `earY` the load-
   * bearing number, and getting it wrong twice is what produced devil horns: at -20 and
   * again at -15 the base sat so deep that only a 3-unit sliver of tip cleared the skull.
   *
   * At -24 the base tucks just under the head's edge (which is at y=-22 out at x=±17) and
   * roughly 18 units of ear show — wide at the bottom, tapering, which is the shape the
   * eye reads as a cat.
   */
  earX: 17,
  earY: -24,
  earW: 22,
  earH: 18,
  /** Where the tail leaves the body. */
  /* Outside the body ellipse, or the body is drawn over the tail and she has none. */
  tailRoot: [46, 16] as const,
  tailLen: 46,
  pawRx: 9,
  pawRy: 6,
  /** Front paw positions when standing. */
  pawX: 22,
  groundY: 42,
  height: 92,
} as const;

export const MOCHI_EXPRESSIONS = {
  neutral: { eyes: 'dots', brow: 'flat', mouth: 'catW' },

  happy: { eyes: 'happyArc', brow: 'neutral', mouth: 'catW' },

  smug: { eyes: 'squint', brow: 'suspicious', mouth: 'smirk', mouthScale: 0.8 },

  curious: { eyes: 'open', brow: 'raised', mouth: 'o', mouthScale: 0.55, look: [0.3, -0.15] },

  shocked: { eyes: 'wide', brow: 'raised', mouth: 'o' },

  angry: { eyes: 'squint', brow: 'angry', mouth: 'tinyFrown' },

  scared: { eyes: 'wide', brow: 'worried', mouth: 'tinyFrown', accents: ['sweat'] },

  asleep: { eyes: 'closed', brow: 'flat', mouth: 'catW' },

  /**
   * The silent stare. Her single most useful state: half-lidded, dead flat brow, dead
   * flat mouth, aimed straight at whoever just did something stupid. It is Mina's
   * `unimpressed` translated into a face with no eyebrows to speak of.
   */
  judging: { eyes: 'halfLid', brow: 'flat', mouth: 'flat', mouthScale: 0.7 },

  hungry: { eyes: 'sparkle', brow: 'raised', mouth: 'o', mouthScale: 0.8, accents: ['sparkleMark'] },
} satisfies Record<string, Expression>;

export const MOCHI: CreatureDef = {
  kind: 'creature',
  id: 'mochi',
  name: 'Mochi',
  role: 'Silent mascot pet and visual-gag engine. Reaction shots, background jokes, theft, and the occasional accidental rescue. Communicates through shape, ears, tail and timing.',
  palette: MOCHI_PALETTE,
  defaultExpression: 'neutral',
  defaultPose: 'loaf',
  expressions: MOCHI_EXPRESSIONS,
  poses: CREATURE_POSES,
  accessories: MOCHI_ACCESSORIES,
  /** She is small. The scale profile is what keeps her small without scenes guessing. */
  scaleProfile: { hero: 2.6, medium: 1.7, background: 0.9 },
  roughSeed: 'mochi',
  /** Nothing, nothing, nothing, then everything at once. Holds and bursts. */
  motion: { idle: 0.5, reactionDelay: 0, holdStep: 3, gestureScale: 1.5, blinkEvery: 108, gazeHold: 52 },
  anchors: [
    'cream loaf body with the head merged into it — never a neck',
    'two small triangular ears',
    'charcoal accents on the ear insides and tail tip',
    'tiny deadpan face: dot eyes, a small cat mouth, no whisker detail',
    'expressive tail — it carries the acting she has no dialogue for',
  ],
  corePoses: [
    'loaf', 'stand', 'sit', 'walkA', 'walkB', 'runA', 'runB', 'jump', 'stretch',
    'stealObject', 'carrying', 'sleep', 'hide', 'peek', 'shocked', 'attack', 'fall',
  ],
  coreExpressions: [
    'neutral', 'happy', 'smug', 'curious', 'shocked', 'angry', 'scared', 'asleep',
    'judging', 'hungry',
  ],
};

export { MOCHI_FACE };
