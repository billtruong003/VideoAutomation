/**
 * registry.ts — the canonical cast.
 *
 * This is the only door into the character system. A scene asks for a character BY ID and
 * gets a definition; it never imports hair geometry, glasses coordinates or limb numbers,
 * and it never constructs a character of its own. That single rule is what makes the cast
 * IP rather than a pile of episode assets:
 *
 *   - a character can be corrected in one place and every past and future episode inherits it
 *   - a character cannot drift, because there is no second copy to drift from
 *   - a new episode costs zero character work
 *
 * Five recurring characters. That number is deliberate and closed — see the NPC rule in
 * CHARACTER_BIBLE.md for what to do with the casino manager, the Roman soldier and the
 * airline worker, none of which are allowed to become a sixth cast member.
 */

import { BILL } from './characters/bill';
import { MINA } from './characters/mina';
import { DEX } from './characters/dex';
import { GUS } from './characters/gus';
import { MOCHI } from './characters/mochi';
import { BILL_FACE, DEX_FACE, GUS_FACE, MINA_FACE, MOCHI_FACE, NPC_FACE, type FaceMetrics } from './face/metrics';
import type {
  CharacterDef,
  CharacterId,
  CreatureDef,
  DefId,
  CreaturePose,
  Expression,
  HumanoidDef,
  Pose,
} from './types';

export const CHARACTERS = {
  bill: BILL,
  mina: MINA,
  dex: DEX,
  gus: GUS,
  mochi: MOCHI,
} as const satisfies Record<CharacterId, CharacterDef>;

/** Cast order for line-ups and sheets. Bill first: he is the protagonist. */
export const CAST_ORDER: CharacterId[] = ['bill', 'mina', 'dex', 'gus', 'mochi'];

/**
 * Face metrics by definition id, including the NPC archetype.
 *
 * Keyed off the definition rather than passed in, so a face can never be rendered with
 * another character's proportions — the failure mode that would make the expression sheet
 * lie about consistency.
 */
export const FACE_METRICS: Record<DefId, FaceMetrics> = {
  bill: BILL_FACE,
  mina: MINA_FACE,
  dex: DEX_FACE,
  gus: GUS_FACE,
  mochi: MOCHI_FACE,
  npc: NPC_FACE,
};

export function getCharacter(id: CharacterId): CharacterDef {
  const c = CHARACTERS[id];
  if (!c) throw new Error(`unknown character: ${id}`);
  return c;
}

export const isHumanoid = (c: CharacterDef): c is HumanoidDef => c.kind === 'humanoid';
export const isCreature = (c: CharacterDef): c is CreatureDef => c.kind === 'creature';

/**
 * Resolve a pose reference.
 *
 * Scenes may pass a NAME (the normal case, and the one the closed-pose-system rule wants)
 * or a Pose object — which is not a loophole, it is how `usePoseSwap` returns a blended
 * pose mid-transition. An unknown name throws rather than silently falling back, because a
 * character quietly rendering in `neutral` for a whole episode is far worse than a crash
 * during a still render.
 */
export function resolvePose(c: HumanoidDef, ref: string | Pose | undefined): Pose {
  if (!ref) return c.poses[c.defaultPose];
  if (typeof ref !== 'string') return ref;
  const p = c.poses[ref];
  if (!p) throw new Error(`${c.name} has no pose "${ref}" — add it to the shared library, do not inline one`);
  return p;
}

export function resolveCreaturePose(c: CreatureDef, ref: string | CreaturePose | undefined): CreaturePose {
  if (!ref) return c.poses[c.defaultPose];
  if (typeof ref !== 'string') return ref;
  const p = c.poses[ref];
  if (!p) throw new Error(`${c.name} has no pose "${ref}"`);
  return p;
}

/**
 * Resolve an expression reference.
 *
 * Same contract as poses, and the same reason for throwing: if an episode needs a face
 * that does not exist, the fix is to add it to that character's canonical library and run
 * the expression sheet — not to hand the renderer a one-off.
 */
export function resolveExpression(c: CharacterDef, ref: string | Expression | undefined): Expression {
  if (!ref) return c.expressions[c.defaultExpression];
  if (typeof ref !== 'string') return ref;
  const e = c.expressions[ref];
  if (!e) throw new Error(`${c.name} has no expression "${ref}" — add it to their canonical library and run expression QA`);
  return e;
}

export type { CharacterDef, CharacterId, CreatureDef, HumanoidDef } from './types';
export { BILL } from './characters/bill';
export { MINA } from './characters/mina';
export { DEX } from './characters/dex';
export { GUS } from './characters/gus';
export { MOCHI } from './characters/mochi';
