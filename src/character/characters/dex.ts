/**
 * dex.ts — the bad-idea generator.
 *
 * Dex exists so that things happen. He proposes terrible plans with total confidence,
 * presses the button, buys the suspicious thing, starts the challenge, escalates, and
 * drags Bill in — and stays cheerful throughout. He is chaotic, never malicious.
 *
 * Structurally he is the channel's engine: an explainer needs someone to do the stupid
 * thing so the explanation has something to explain.
 *
 * Visually he is all diagonals. Where Bill is a soft blob and Mina is a smooth curve,
 * Dex is hard directional spikes and a forward lean — three different silhouette
 * languages so the black-fill test separates them instantly.
 */

import { buildFrom } from '../rig';
import { DEX_FACE } from '../face/metrics';
import { POSES } from '../poses';
import { CAST } from '../../style/tokens';
import { DEX_ACCESSORIES } from './accessories';
import type { CharacterPalette, Expression, HumanoidDef } from '../types';

export const DEX_PALETTE: CharacterPalette = {
  skin: CAST.dexSkin,
  skinShade: CAST.dexSkinShade,
  hair: CAST.dexHair,
  hairShade: CAST.dexHairShade,
  shirt: CAST.dexShirt,
  shirtShade: CAST.dexShirtShade,
  pants: CAST.dexPants,
  shoe: CAST.dexShoe,
  outline: CAST.dexOutline,
};

/** Narrower and taller-headed than Bill — a more oval skull, a wirier frame. */
export const DEX_BUILD = buildFrom({
  headHW: 43,
  headHH: 44,
  headR: 30,
  shoulderX: 17,
  hipHalfW: 13,
  pantsHalfW: 15,
  handRadius: 7.2,
  footRx: 10,
});

export const DEX_EXPRESSIONS = {
  /** His resting face is already a grin. That is the character in one line. */
  neutralGrin: { eyes: 'open', brow: 'neutral', mouth: 'grin', mouthScale: 0.85 },

  happy: { eyes: 'happyArc', brow: 'raised', mouth: 'grin' },

  excited: { eyes: 'sparkle', brow: 'raised', mouth: 'openLaugh' },

  smug: { eyes: 'squint', brow: 'suspicious', mouth: 'smirk' },

  /**
   * "I HAVE A TERRIBLE IDEA" — readable with no dialogue, which is the requirement.
   *
   * Narrowed eyes plus an asymmetric brow gives scheming; the wide grin under it gives
   * delight; the sparkle accent says he is pleased with himself. Take away any one and it
   * collapses into ordinary smugness.
   */
  evilIdea: { eyes: 'squint', brow: 'suspicious', mouth: 'grin', mouthScale: 1.1, accents: ['sparkleMark'] },

  surprised: { eyes: 'wide', brow: 'raised', mouth: 'o' },

  shocked: { eyes: 'wide', brow: 'raised', mouth: 'gasp', mouthScale: 1.15 },

  confused: { eyes: 'open', brow: 'asym', mouth: 'wavy' },

  panic: { eyes: 'wide', brow: 'worried', mouth: 'gasp', mouthScale: 1.3, accents: ['sweat'] },

  /** Eyes closed, tiny smile, hands elsewhere. Transparently guilty. */
  fakeInnocent: { eyes: 'closed', brow: 'raised', mouth: 'smile', mouthScale: 0.75, accents: ['sweat'] },

  angry: { eyes: 'open', brow: 'angry', mouth: 'grimace', accents: ['angerVein'] },

  horrified: { eyes: 'wide', brow: 'worried', mouth: 'gasp', mouthScale: 1.35, accents: ['sweat', 'shadow'] },
} satisfies Record<string, Expression>;

export const DEX: HumanoidDef = {
  kind: 'humanoid',
  id: 'dex',
  name: 'Dex',
  role: 'Chaotic friend and catalyst. Proposes terrible ideas confidently, escalates situations, drags Bill into problems, stays optimistic.',
  palette: DEX_PALETTE,
  build: DEX_BUILD,
  defaultExpression: 'neutralGrin',
  defaultPose: 'leanForward',
  expressions: DEX_EXPRESSIONS,
  poses: POSES,
  hair: 'dex',
  accessories: DEX_ACCESSORIES,
  scaleProfile: { hero: 3.3, medium: 2.1, background: 1.15 },
  roughSeed: 'dex',
  /** Fast in, big out. He overshoots every pose and never waits a beat before reacting. */
  motion: { idle: 1.7, reactionDelay: 0, holdStep: 2, gestureScale: 1.35, blinkEvery: 62, gazeHold: 12 },
  anchors: [
    'dark charcoal hair in hard directional spikes, shorter than Bill and asymmetric',
    'warm orange top',
    'a grin at rest — his neutral face is already amused',
    'forward-leaning posture',
    'wiry narrow frame with a slightly oval head',
  ],
  corePoses: [
    'neutral', 'leanForward', 'pointing', 'whisper', 'presenting', 'pressingButton',
    'holdingSmall', 'runA', 'runB', 'sneak', 'celebrating', 'panic', 'falling',
    'shrug', 'innocentStand', 'laughing',
  ],
  coreExpressions: [
    'neutralGrin', 'happy', 'excited', 'smug', 'evilIdea', 'surprised', 'shocked',
    'confused', 'panic', 'fakeInnocent', 'angry', 'horrified',
  ],
};

export { DEX_FACE };
