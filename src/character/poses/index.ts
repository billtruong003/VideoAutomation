/**
 * poses/index.ts — the pose library as the rest of the system sees it.
 *
 * One table for every humanoid. A pose is a body attitude, not a personality: `shrug`
 * means the same thing on Bill as on Gus, and giving each character a private copy of it
 * is how a library rots into sixty near-identical entries. Personality comes from which
 * poses a character reaches for (`corePoses`) and from how fast they get there
 * (`MotionPersonality`), never from a duplicated table.
 */

import { HUMANOID_POSES, POSE_ALIASES, type HumanoidPoseName } from './humanoid';
import type { Pose } from '../types';

export { HUMANOID_POSES, POSE_ALIASES } from './humanoid';
export type { HumanoidPoseName } from './humanoid';
export { CREATURE_POSES } from './creature';
export type { CreaturePoseName } from './creature';

type AliasTable = { [K in keyof typeof POSE_ALIASES]: Pose };

const aliased = Object.fromEntries(
  Object.entries(POSE_ALIASES).map(([from, to]) => [from, HUMANOID_POSES[to as HumanoidPoseName]]),
) as AliasTable;

/**
 * Every pose name that resolves: the canonical library plus the compatibility aliases.
 *
 * Typed as an intersection rather than `Record<string, Pose>` on purpose — a typo in a
 * scene's pose name should be a compile error, not a crash at render time.
 */
export const POSES: typeof HUMANOID_POSES & AliasTable = { ...HUMANOID_POSES, ...aliased };

export type PoseName = keyof typeof POSES;

export const POSE_NAMES = Object.keys(HUMANOID_POSES) as HumanoidPoseName[];
