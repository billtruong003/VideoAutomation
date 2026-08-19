/**
 * PoseSwap.tsx — hold a pose, then snap to the next one.
 *
 * This is the core of limited animation. Real hand-drawn cartoons do not tween between
 * poses; they hold a drawing, then replace it. Snapping on twos or threes is what makes
 * the motion read as *drawn* rather than as a CSS transition. A short optional blend is
 * available for moves that genuinely need to arc (a head turn), but the default is hard.
 *
 * Episode-agnostic.
 */

import { blendPose, type Pose } from '../character/rig';
import { POSES, type PoseName } from '../character/poses';
import { onTwos } from '../lib/rand';

export type PoseKey = {
  /** Frame (relative to the scene) at which this pose takes over. */
  at: number;
  pose: PoseName | Pose;
  /**
   * Frames spent easing into this pose. 0 (default) = hard snap, which is what you
   * usually want. Use 2–5 only for arcs that look broken when they pop.
   */
  blend?: number;
};

const resolve = (p: PoseName | Pose): Pose => (typeof p === 'string' ? POSES[p] : p);

/**
 * Pick the active pose for `frame` from a keyframe list.
 * `step` quantises the swap so poses can only change every N frames (2 = "on twos").
 */
export function usePoseSwap(keys: PoseKey[], frame: number, step = 2): Pose {
  if (keys.length === 0) throw new Error('usePoseSwap needs at least one key');
  const f = onTwos(frame, step);

  let activeIndex = 0;
  for (let i = 0; i < keys.length; i++) {
    if (f >= keys[i].at) activeIndex = i;
  }

  const active = keys[activeIndex];
  const target = resolve(active.pose);
  const blend = active.blend ?? 0;

  if (blend > 0 && activeIndex > 0) {
    const since = f - active.at;
    if (since < blend) {
      const prev = resolve(keys[activeIndex - 1].pose);
      const t = Math.max(0, Math.min(1, since / blend));
      // smoothstep so the blend eases rather than ramping linearly
      return blendPose(prev, target, t * t * (3 - 2 * t));
    }
  }

  return target;
}

/**
 * Anticipation -> action -> settle, the three-drawing unit that sells any big move.
 * Returns a keyframe list ready for `usePoseSwap`.
 */
export function beat(
  at: number,
  anticipation: PoseName | Pose,
  action: PoseName | Pose,
  settle: PoseName | Pose,
  { anticipationFrames = 3, actionFrames = 5 } = {},
): PoseKey[] {
  return [
    { at, pose: anticipation },
    { at: at + anticipationFrames, pose: action },
    { at: at + anticipationFrames + actionFrames, pose: settle },
  ];
}
