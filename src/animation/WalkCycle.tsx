/**
 * WalkCycle.tsx — two-drawing walk, plus the body bob that sells it.
 *
 * A front-facing doodle walk is just walkA/walkB alternating. What makes it read as
 * walking rather than twitching is that the body rises and falls in step with the
 * drawings, so the bob is generated here rather than left to each scene.
 *
 * Episode-agnostic.
 */

import { interpolate } from 'remotion';
import { POSES } from '../character/poses';
import type { Pose } from '../character/rig';

export type WalkState = {
  pose: Pose;
  /** Vertical bob to add to the character's y, in character units. */
  bob: number;
};

/**
 * `stepFrames` is how long each drawing is held — 4 at 30fps is a relaxed amble,
 * 3 is brisk, 2 is a scurry.
 */
export function useWalkCycle(frame: number, stepFrames = 4): WalkState {
  const phase = Math.floor(frame / stepFrames) % 2;
  const pose = phase === 0 ? POSES.walkA : POSES.walkB;
  // body is highest mid-stride, lowest on the plant
  const within = (frame % (stepFrames * 2)) / (stepFrames * 2);
  const bob = -Math.abs(Math.sin(within * Math.PI * 2)) * 3;
  return { pose, bob };
}

/**
 * Horizontal travel for a character walking across the frame.
 * Ease-out so they arrive and settle rather than stopping dead.
 */
export function walkX(
  frame: number,
  { from, to, start = 0, duration }: { from: number; to: number; start?: number; duration: number },
): number {
  return interpolate(frame, [start, start + duration], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2.2),
  });
}
