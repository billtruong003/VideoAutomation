/**
 * SceneCamera.tsx — one place that moves the "camera" over a scene.
 *
 * Scenes draw in stage coordinates and never worry about framing; the camera is a
 * transform applied to the whole scene group. Camera moves are smooth every frame
 * (unlike character poses, which snap on twos) — that contrast between fluid camera
 * and stepped character is exactly what makes limited animation feel deliberate.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { interpolate } from 'remotion';
import { VIDEO } from '../lib/style';
import { wobble } from '../lib/rand';

export type CameraState = {
  /** Pan, in stage pixels. Positive x moves the VIEW right (content moves left). */
  x?: number;
  y?: number;
  zoom?: number;
  rotate?: number;
  /** Point the zoom happens about, in stage pixels. Defaults to frame centre. */
  originX?: number;
  originY?: number;
};

/**
 * Backgrounds are authored at exactly 1080x1920, so a zoom below 1 would pull their
 * edges into shot and letterbox the frame with bare paper. Clamped here rather than at
 * each call site so no future scene can reintroduce the bug.
 */
const MIN_ZOOM = 1;

export const SceneCamera: React.FC<CameraState & { children: React.ReactNode }> = ({
  x = 0,
  y = 0,
  zoom = 1,
  rotate = 0,
  originX = VIDEO.width / 2,
  originY = VIDEO.height / 2,
  children,
}) => (
  <g
    transform={
      `translate(${originX} ${originY}) ` +
      `scale(${Math.max(MIN_ZOOM, zoom)}) rotate(${rotate}) ` +
      `translate(${-originX - x} ${-originY - y})`
    }
  >
    {children}
  </g>
);

/**
 * A snap-in punch: the frame kicks toward the subject and springs back.
 * Use on reveals and reaction beats — the visual equivalent of a hard consonant.
 */
export function useCameraPunch(
  frame: number,
  at: number,
  { amount = 0.09, duration = 12 } = {},
): number {
  const t = frame - at;
  if (t < 0 || t > duration) return 1;
  const p = t / duration;
  // fast attack, elastic settle
  const env = p < 0.18 ? p / 0.18 : Math.exp(-(p - 0.18) * 7) * Math.cos((p - 0.18) * 22);
  return 1 + amount * env;
}

/** Impact shake. Decays fast — a long shake reads as an earthquake, not a hit. */
export function useCameraShake(
  frame: number,
  at: number,
  { amount = 14, duration = 10, seed = 'shake' } = {},
): { x: number; y: number; rotate: number } {
  const t = frame - at;
  if (t < 0 || t > duration) return { x: 0, y: 0, rotate: 0 };
  const decay = Math.pow(1 - t / duration, 2);
  return {
    x: wobble(`${seed}:x`, frame, 0.9, amount) * decay,
    y: wobble(`${seed}:y`, frame, 0.9, amount) * decay,
    rotate: wobble(`${seed}:r`, frame, 0.9, amount * 0.06) * decay,
  };
}

/**
 * Slow continuous push-in or pull-back across a span of frames.
 * The final scene uses a pull-back to shrink the outside world.
 */
export function useCameraDolly(
  frame: number,
  { from = 1, to = 1.2, start = 0, duration = 60 }: { from?: number; to?: number; start?: number; duration?: number },
): number {
  return interpolate(frame, [start, start + duration], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });
}
