/**
 * EyeLook.tsx — where the character is looking, over time.
 *
 * Eyes that never move make a doodle look dead, but eyes driven by smooth noise look
 * drugged. Real eyes SACCADE: they hold a target, then flick. This holds a direction
 * for a stretch of frames, then snaps to the next one.
 *
 * Episode-agnostic.
 */

import { rand01, hashString } from '../lib/rand';

export type LookTarget = [number, number];

/**
 * Idle glancing around. `calm` lengthens the holds and shrinks the range.
 */
export function useIdleLook(
  frame: number,
  { seed = 'look', holdFrames = 22, range = 0.5 }: { seed?: string; holdFrames?: number; range?: number } = {},
): LookTarget {
  const slot = Math.floor(frame / holdFrames);
  const h = hashString(`${seed}:${slot}`);
  return [(rand01(h) * 2 - 1) * range, (rand01(h + 991) * 2 - 1) * range * 0.55];
}

/**
 * Track a point on stage. Give the character's head position and the target's, both in
 * stage pixels, and the pupils aim at it.
 */
export function lookAt(
  headX: number,
  headY: number,
  targetX: number,
  targetY: number,
  { reach = 240 } = {},
): LookTarget {
  const dx = targetX - headX;
  const dy = targetY - headY;
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, len / reach);
  return [(dx / len) * k, (dy / len) * k];
}

/** Snap between explicit look targets on a schedule. */
export function useLookKeys(keys: { at: number; look: LookTarget }[], frame: number): LookTarget {
  let active = keys[0]?.look ?? [0, 0];
  for (const k of keys) if (frame >= k.at) active = k.look;
  return active;
}
