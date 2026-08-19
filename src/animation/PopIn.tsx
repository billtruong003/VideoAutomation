/**
 * PopIn.tsx — things arrive by popping, never by fading.
 *
 * A fade reads as a slideshow transition; an overshooting pop reads as drawn-on-the-page.
 * Every prop, gag card and mark in this project enters through here.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { spring, useVideoConfig } from 'remotion';

export type PopInOptions = {
  /** Frame (scene-relative) the pop starts. */
  at: number;
  /** How bouncy. Higher damping = less overshoot. */
  damping?: number;
  stiffness?: number;
  /** Optional frame at which it pops back OUT. */
  until?: number;
  outDuration?: number;
};

/** Scale/opacity for a popping element. Returns scale 0 before `at`. */
export function usePopIn(
  frame: number,
  fps: number,
  { at, damping = 11, stiffness = 190, until, outDuration = 6 }: PopInOptions,
): { scale: number; opacity: number } {
  const inScale = spring({
    frame: frame - at,
    fps,
    config: { damping, stiffness, mass: 0.7 },
  });

  let out = 1;
  if (until !== undefined && frame >= until) {
    out = Math.max(0, 1 - (frame - until) / outDuration);
  }

  return { scale: inScale * out, opacity: frame < at ? 0 : Math.min(1, inScale * 2) * out };
}

/**
 * Same computation, non-hook name. `spring()` is a pure function, but calling something
 * called `use*` inside a loop reads as a Rules-of-Hooks violation, so callers that pop a
 * LIST of elements use this alias instead.
 */
export const popInValues = usePopIn;

export const PopIn: React.FC<
  PopInOptions & {
    frame: number;
    /** Point the element scales about, in the parent's coordinates. */
    originX?: number;
    originY?: number;
    children: React.ReactNode;
  }
> = ({ frame, originX = 0, originY = 0, children, ...opts }) => {
  const { fps } = useVideoConfig();
  const { scale, opacity } = usePopIn(frame, fps, opts);
  if (opacity <= 0) return null;
  return (
    <g
      transform={`translate(${originX} ${originY}) scale(${scale}) translate(${-originX} ${-originY})`}
      opacity={opacity}
    >
      {children}
    </g>
  );
};
