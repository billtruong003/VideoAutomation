/**
 * ClockSpin.tsx — time running away from you.
 *
 * Drives the hour/minute angles of any clock prop. The minute hand does the visible
 * work; the hour hand follows at 1/12 the rate, because a clock whose hands spin at the
 * same speed reads as broken rather than as time passing.
 *
 * Episode-agnostic (any episode about time, deadlines, waiting).
 */

import { interpolate } from 'remotion';

export type ClockAngles = { hourAngle: number; minuteAngle: number };

/** Static reading, e.g. `clockAt(10, 10)` for the classic display pose. */
export function clockAt(hours: number, minutes: number): ClockAngles {
  return {
    hourAngle: (hours % 12) * 30 + minutes * 0.5,
    minuteAngle: minutes * 6,
  };
}

/**
 * Accelerating spin: starts at `from`, whirls through `revolutions`, eases out.
 * This is the "twenty minutes became two hours" move.
 */
export function useClockSpin(
  frame: number,
  {
    at,
    duration,
    revolutions = 6,
    from = clockAt(10, 10),
    ease = 'accelerate',
  }: {
    at: number;
    duration: number;
    revolutions?: number;
    from?: ClockAngles;
    ease?: 'accelerate' | 'linear' | 'settle';
  },
): ClockAngles {
  if (frame < at) return from;

  const easing =
    ease === 'accelerate'
      ? (t: number) => t * t
      : ease === 'settle'
        ? (t: number) => 1 - Math.pow(1 - t, 3)
        : (t: number) => t;

  const p = interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

  const spun = p * revolutions * 360;
  return {
    minuteAngle: from.minuteAngle + spun,
    hourAngle: from.hourAngle + spun / 12,
  };
}

/** Steady ticking, one visible jump per second — for a clock that is merely present. */
export function useTick(frame: number, fps: number, start = clockAt(10, 10)): ClockAngles {
  const seconds = Math.floor(frame / fps);
  return { hourAngle: start.hourAngle + seconds * 0.0083, minuteAngle: start.minuteAngle + seconds * 0.1 };
}
