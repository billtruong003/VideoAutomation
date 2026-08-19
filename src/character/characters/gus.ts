/**
 * gus.ts — the deadpan authority.
 *
 * Gus is whichever adult is in charge of the place the episode happens in: manager,
 * security guard, shop owner, official, the older coworker. The role changes; he does not.
 * That is the point — a viewer should recognise him instantly in a job they have never
 * seen him do, which is only possible because his appearance is fixed independently of it.
 *
 * He is dry, calm, tired, blunt, and almost impossible to impress. His comedy is
 * RESTRAINT: he usually delivers the last beat with the smallest reaction on screen.
 *
 * That restraint is encoded, not left to a scene author's judgement. His expressions are
 * deliberately narrower in range than Dex's, and his motion personality holds poses nearly
 * twice as long as anyone else's.
 */

import { buildFrom } from '../rig';
import { GUS_FACE } from '../face/metrics';
import { POSES } from '../poses';
import { CAST } from '../../style/tokens';
import { GUS_ACCESSORIES } from './accessories';
import type { CharacterPalette, Expression, HumanoidDef } from '../types';

export const GUS_PALETTE: CharacterPalette = {
  skin: CAST.gusSkin,
  skinShade: CAST.gusSkinShade,
  hair: CAST.gusHair,
  hairShade: CAST.gusHairShade,
  shirt: CAST.gusShirt,
  shirtShade: CAST.gusShirtShade,
  pants: CAST.gusPants,
  shoe: CAST.gusShoe,
  outline: CAST.gusOutline,
};

/**
 * The most grounded build in the cast: wider, squarer, and genuinely shorter.
 *
 * The head sits 6 units lower than everyone else's while the feet stay on the same
 * ground line, so he loses height from the middle — which reads as compact and stable
 * rather than as a shrunk copy of Bill.
 */
export const GUS_BUILD = buildFrom({
  headCenter: [0, -94],
  headHW: 50,
  headHH: 42,
  headR: 18,
  shoulderX: 23,
  shoulderY: -46,
  torsoTop: -50,
  torsoBottom: 4,
  hipHalfW: 18,
  pantsHalfW: 19,
  pantsTop: -4,
  pantsBottom: 17,
  handRadius: 8,
  footRx: 11.5,
  footRy: 6.2,
  height: 179,
});

export const GUS_EXPRESSIONS = {
  /** Even his neutral is half-lidded. He arrived tired. */
  neutral: { eyes: 'halfLid', brow: 'flat', mouth: 'flat' },

  deadpan: { eyes: 'dots', brow: 'flat', mouth: 'flat' },

  mildlyAnnoyed: { eyes: 'halfLid', brow: 'angry', mouth: 'flat' },

  suspicious: { eyes: 'halfLid', brow: 'suspicious', mouth: 'flat', look: [-0.5, 0] },

  /** The maximum warmth available to this character. */
  tinySmile: { eyes: 'happyArc', brow: 'neutral', mouth: 'smile', mouthScale: 0.65 },

  disappointed: { eyes: 'halfLid', brow: 'worried', mouth: 'tinyFrown', look: [0, 0.2] },

  confused: { eyes: 'open', brow: 'asym', mouth: 'line' },

  /** Even surprised, the mouth stays small. Escalation is not his register. */
  surprised: { eyes: 'wide', brow: 'raised', mouth: 'o', mouthScale: 0.7 },

  angry: { eyes: 'open', brow: 'angry', mouth: 'grimace' },

  exhausted: { eyes: 'tired', brow: 'tired', mouth: 'frown', accents: ['sweat'] },

  horrified: { eyes: 'wide', brow: 'worried', mouth: 'gasp' },

  smug: { eyes: 'squint', brow: 'suspicious', mouth: 'smirk', mouthScale: 0.8 },
} satisfies Record<string, Expression>;

export const GUS: HumanoidDef = {
  kind: 'humanoid',
  id: 'gus',
  name: 'Gus',
  role: 'Older deadpan authority. Manager, guard, official, shop owner — the role changes per episode, the character does not. Usually delivers the final beat with minimal reaction.',
  palette: GUS_PALETTE,
  build: GUS_BUILD,
  defaultExpression: 'neutral',
  defaultPose: 'armsBehindBack',
  expressions: GUS_EXPRESSIONS,
  poses: POSES,
  hair: 'gus',
  accessories: GUS_ACCESSORIES,
  scaleProfile: { hero: 3.3, medium: 2.1, background: 1.15 },
  roughSeed: 'gus',
  /** Barely moves. Long holds, slow turns, and reactions that arrive late and small. */
  motion: { idle: 0.35, reactionDelay: 6, holdStep: 4, gestureScale: 0.55, blinkEvery: 120, gazeHold: 44 },
  anchors: [
    'grey receding hairline with two side tufts — age is a hairline, not wrinkles',
    'small simple moustache, always the same shape',
    'stocky compact body, wider shoulders, squarer head, visibly shorter',
    'tired half-lidded eyes and near-horizontal brows',
    'muted sage-green top',
  ],
  corePoses: [
    'neutral', 'armsBehindBack', 'armsCrossed', 'pointing', 'clipboard', 'explaining',
    'suspicious', 'tinyShrug', 'sitting', 'walkA', 'walkB', 'stopHand', 'facepalm',
    'exhausted', 'holdingSign',
  ],
  coreExpressions: [
    'neutral', 'deadpan', 'mildlyAnnoyed', 'suspicious', 'tinySmile', 'disappointed',
    'confused', 'surprised', 'angry', 'exhausted', 'horrified', 'smug',
  ],
};

export { GUS_FACE };
