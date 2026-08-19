/**
 * mina.ts — the composed counterweight.
 *
 * Mina is the character who already knows. She corrects Bill, notices the mistake he is
 * about to make, and supplies the audience's sanity — and occasionally turns out to be
 * more ruthless about the situation than Bill ever was, which is where her comedy lives.
 *
 * She is intelligent, composed, observant, practical, quietly sarcastic and never mean.
 *
 * Visually she is the tidy one: a smooth bob against Bill's mop, a narrower silhouette,
 * flatter eyes, smaller reactions. Everything about her drawing is the opposite of
 * Bill's — which is deliberate, because she is the character most often in frame WITH
 * him and two similar silhouettes side by side is the fastest way to lose both.
 */

import { buildFrom } from '../rig';
import { MINA_FACE } from '../face/metrics';
import { POSES } from '../poses';
import { CAST } from '../../style/tokens';
import { MINA_ACCESSORIES } from './accessories';
import type { CharacterPalette, Expression, HumanoidDef } from '../types';

export const MINA_PALETTE: CharacterPalette = {
  skin: CAST.minaSkin,
  skinShade: CAST.minaSkinShade,
  hair: CAST.minaHair,
  hairShade: CAST.minaHairShade,
  shirt: CAST.minaShirt,
  shirtShade: CAST.minaShirtShade,
  pants: CAST.minaPants,
  shoe: CAST.minaShoe,
  outline: CAST.minaOutline,
};

/** Narrower than Bill everywhere: head, shoulders, hips. Rounder skull, tidier read. */
export const MINA_BUILD = buildFrom({
  headHW: 43,
  headHH: 42,
  headR: 30,
  shoulderX: 16,
  hipHalfW: 12,
  pantsHalfW: 14,
  handRadius: 7.0,
  footRx: 9.6,
});

export const MINA_EXPRESSIONS = {
  neutral: { eyes: 'open', brow: 'neutral', mouth: 'line' },

  smallSmile: { eyes: 'open', brow: 'neutral', mouth: 'smile', mouthScale: 0.8 },

  happy: { eyes: 'happyArc', brow: 'raised', mouth: 'smile' },

  /**
   * Her most important expression, and the one the whole design serves.
   *
   * Three things make it land: the lids come DOWN (halfLid, not squint — a squint reads
   * as effort), the brow goes dead flat rather than angry, and the gaze is slightly off
   * the target as though she has already stopped bothering. Any one of the three alone
   * reads as "tired"; together they read as "I am not impressed".
   */
  unimpressed: { eyes: 'halfLid', brow: 'flat', mouth: 'flat', look: [-0.25, 0.05] },

  suspicious: { eyes: 'halfLid', brow: 'suspicious', mouth: 'smirk', look: [-0.55, 0] },

  confused: { eyes: 'open', brow: 'asym', mouth: 'wavy', look: [0.25, 0.1] },

  surprised: { eyes: 'wide', brow: 'raised', mouth: 'o', mouthScale: 0.85 },

  shocked: { eyes: 'wide', brow: 'raised', mouth: 'gasp' },

  annoyed: { eyes: 'halfLid', brow: 'angry', mouth: 'tinyFrown' },

  angry: { eyes: 'open', brow: 'angry', mouth: 'grimace' },

  worried: { eyes: 'open', brow: 'worried', mouth: 'tinyFrown' },

  deadpan: { eyes: 'dots', brow: 'flat', mouth: 'flat' },
} satisfies Record<string, Expression>;

export const MINA: HumanoidDef = {
  kind: 'humanoid',
  id: 'mina',
  name: 'Mina',
  role: 'The intelligent, composed counterweight. Supplies facts, sanity and the unimpressed reaction. Occasionally more ruthless than Bill expects.',
  palette: MINA_PALETTE,
  build: MINA_BUILD,
  defaultExpression: 'neutral',
  defaultPose: 'neutral',
  expressions: MINA_EXPRESSIONS,
  poses: POSES,
  hair: 'mina',
  accessories: MINA_ACCESSORIES,
  scaleProfile: { hero: 3.3, medium: 2.1, background: 1.15 },
  roughSeed: 'mina',
  /** Controlled: she under-reacts on purpose, and holds a pose longer than Bill does. */
  motion: { idle: 0.6, reactionDelay: 1, holdStep: 3, gestureScale: 0.75, blinkEvery: 96, gazeHold: 30 },
  anchors: [
    'smooth dark shoulder-length bob with one prominent side fringe',
    'teal top',
    'flat, calm, slightly horizontal eye shape',
    'narrow tidy silhouette — the composed one next to Bill',
    'still, level posture: she does not bounce',
  ],
  corePoses: [
    'neutral', 'handsOnHips', 'armsCrossed', 'pointing', 'explaining', 'thinking',
    'lookLeft', 'lookingAtPhone', 'sitting', 'walkA', 'walkB', 'shockedBack',
    'facepalm', 'shrug', 'holdingSmall', 'deadpanStand',
  ],
  coreExpressions: [
    'neutral', 'smallSmile', 'happy', 'unimpressed', 'suspicious', 'confused',
    'surprised', 'shocked', 'annoyed', 'angry', 'worried', 'deadpan',
  ],
};

export { MINA_FACE };
