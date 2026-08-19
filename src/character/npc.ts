/**
 * npc.ts — the architectural line between the cast and everyone else.
 *
 * Future episodes need a casino manager, a Roman soldier, a scientist, an airline worker,
 * a medieval peasant, a CEO, a customer, a stranger. NONE of those may become a sixth
 * recurring character. The cast is Bill, Mina, Dex, Gus and Mochi, and it is closed —
 * every addition dilutes the identity that makes the other five worth having.
 *
 * So NPCs exist as ARCHETYPES: the same rig, the same stylizer, the same pose and
 * expression libraries, but a deliberately generic look with no signature hair, no
 * glasses, and a muted palette. They belong to the universe without competing in it.
 *
 * Two rules, both load-bearing:
 *
 *   1. An NPC must never be a recoloured cast member. Handing Bill a different shirt
 *      colour and calling him "the manager" is exactly the drift this system prevents —
 *      it teaches the audience that Bill's yellow top means nothing.
 *   2. NPCs are episode-scoped. They are not registered in `registry.ts`, they carry no
 *      identity anchors, and nothing is promised about them between episodes.
 *
 * This is intentionally small. Building a full NPC wardrobe now would be guessing at
 * episodes nobody has written; what matters today is that the distinction EXISTS, so the
 * first time an episode needs a security guard the cheap wrong answer is already closed
 * off.
 */

import { buildFrom } from './rig';
import { POSES } from './poses';
import { BILL_EXPRESSIONS } from './characters/bill';
import { PALETTE } from '../style/tokens';
import type { CharacterPalette, HumanoidDef } from './types';

export type NpcArchetype = 'civilian' | 'staff' | 'suit' | 'shadow';

/**
 * Muted, low-saturation palettes.
 *
 * Every cast member owns a bright hue — Bill yellow, Mina teal, Dex orange, Gus sage. NPC
 * palettes deliberately avoid all four and stay desaturated, so in any frame the eye goes
 * to the people the story is about.
 */
const PALETTES: Record<NpcArchetype, CharacterPalette> = {
  civilian: {
    skin: '#EFD3B4', skinShade: '#D9B893',
    hair: '#6B5A4A', hairShade: '#4F4133',
    shirt: '#9AA3AD', shirtShade: '#7B848E',
    pants: '#5A5F66', shoe: '#E7DECC',
    outline: PALETTE.ink,
  },
  /** Anyone working here: dealer, cabin crew, shop staff. */
  staff: {
    skin: '#E6C6A4', skinShade: '#CFAC87',
    hair: '#4A4038', hairShade: '#332C26',
    shirt: '#8E8FA8', shirtShade: '#71728B',
    pants: '#3D3F4C', shoe: '#4A4038',
    outline: PALETTE.ink,
  },
  /** Management, officials, anyone with the authority to say no. */
  suit: {
    skin: '#F0D6B8', skinShade: '#D8BB98',
    hair: '#59544E', hairShade: '#3E3A35',
    shirt: '#4C5566', shirtShade: '#3A4150',
    pants: '#2F3542', shoe: '#2F3542',
    outline: PALETTE.ink,
  },
  /**
   * A crowd body. Flat grey, meant to be read as "someone" and nothing more — the
   * background-of-a-casino-floor archetype.
   */
  shadow: {
    skin: PALETTE.grey, skinShade: PALETTE.greyDeep,
    hair: PALETTE.greyDeep, hairShade: PALETTE.greyDeep,
    shirt: PALETTE.grey, shirtShade: PALETTE.greyDeep,
    pants: PALETTE.greyDeep, shoe: PALETTE.grey,
    outline: PALETTE.inkSoft,
  },
};

/**
 * Plainer proportions than anyone in the cast.
 *
 * A smaller head relative to the body is the fastest structural way to say "not one of
 * the five": the cast's defining silhouette move is the huge head, so an NPC gets a
 * noticeably smaller one and reads as a background person even in pure black.
 */
const NPC_BUILD = buildFrom({
  headHW: 39,
  headHH: 36,
  headR: 22,
  headCenter: [0, -96],
  shoulderX: 20,
  shoulderY: -54,
  torsoTop: -58,
  hipHalfW: 15,
  pantsHalfW: 16,
  height: 178,
});

/**
 * Build a throwaway figure for an episode.
 *
 * Returns a `HumanoidDef` so it renders through exactly the same component as the cast —
 * shared rig, shared poses, shared expressions, shared QA. It is passed to
 * `DoodleCharacter` by `def`, never by name: an NPC has no registry entry, which is what
 * makes "recurring cast" a fact about the code rather than a promise in a document.
 */
export function makeNpc(archetype: NpcArchetype, seed: string): HumanoidDef {
  return {
    kind: 'humanoid',
    id: 'npc',
    name: `NPC:${archetype}`,
    role: `Episode-scoped ${archetype}. Not a recurring character; nothing about this figure is promised between episodes.`,
    palette: PALETTES[archetype],
    build: NPC_BUILD,
    defaultExpression: 'neutral',
    defaultPose: 'neutral',
    expressions: BILL_EXPRESSIONS,
    poses: POSES,
    hair: 'npc',
    accessories: {},
    scaleProfile: { hero: 3.0, medium: 2.0, background: 1.1 },
    roughSeed: `npc:${archetype}:${seed}`,
    /** Background people move less than anyone the story is about. */
    motion: { idle: 0.6, reactionDelay: 4, holdStep: 3, gestureScale: 0.7, blinkEvery: 90, gazeHold: 34 },
    anchors: [],
    corePoses: [],
    coreExpressions: [],
  };
}

export const NPC_ARCHETYPES = Object.keys(PALETTES) as NpcArchetype[];
