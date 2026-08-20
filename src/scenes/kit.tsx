/**
 * kit.tsx — the small helpers every episode in batch 001 reaches for.
 *
 * This is deliberately NOT a scene DSL. The batch exists partly to find out which scene
 * patterns actually recur before anything gets abstracted, and the honest answer after ten
 * storyboards is: four do. A window test, a label, a slide-in, and a held reveal. Those four
 * live here; everything else stays hand-written in the episode, where the comedy is.
 *
 * The rule that matters: nothing here invents a frame number. Every helper takes frames the
 * caller derived from the episode clock, so the chain from spoken word to visual event is
 * never broken by a convenience function.
 */

import React from 'react';
import { interpolate } from 'remotion';
import { PALETTE, FONTS } from '../style/tokens';

/** Is `frame` at or past `at`? The most common test in every scene file. */
export const after = (frame: number, at: number): boolean => frame >= at;

/** Is `frame` inside `[from, to)`? */
export const between = (frame: number, from: number, to: number): boolean =>
  frame >= from && frame < to;

/**
 * 0 -> 1 over `frames`, eased, clamped at both ends.
 *
 * `ease` defaults to a cubic ease-out: things in this channel arrive fast and settle, which
 * is what makes a pop read as a pop rather than as a fade.
 */
export const ramp = (
  frame: number,
  at: number,
  frames = 10,
  ease: (t: number) => number = (t) => 1 - (1 - t) ** 3,
): number =>
  ease(interpolate(frame, [at, at + frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));

/**
 * A snap: 0 before `at`, then a short overshoot settling to 1.
 *
 * Used for anything that STAMPS — labels, cards, a valve shutting. The overshoot is what
 * separates "landed" from "appeared"; without it a stamp reads as a UI element switching on.
 */
export function snap(frame: number, at: number, frames = 9): number {
  if (frame < at) return 0;
  const t = Math.min(1, (frame - at) / frames);
  return 1 + Math.sin(t * Math.PI) * 0.22 * (1 - t) - (1 - t) * 0.15;
}

/**
 * A value that steps rather than slides — the channel's limited-animation rule in one call.
 *
 * Character poses change on twos while the camera moves every frame; anything that should
 * feel drawn rather than tweened goes through here.
 */
export const stepped = (value: number, step = 2): number => Math.round(value / step) * step;

/**
 * Text drawn the way this channel draws text: display face, heavy paper outline so it
 * survives any background, and no box around it.
 *
 * Labels on a diagram are the one place a Short is allowed to use words, and they earn it —
 * naming the part being spoken about is faster than any amount of drawing.
 */
export const Label: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  rotate?: number;
}> = ({ x, y, text, size = 52, color = PALETTE.ink, anchor = 'middle', opacity = 1, rotate = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={opacity}>
    <text
      x={0}
      y={0}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily={FONTS.display}
      fontSize={size}
      fill={color}
      stroke={PALETTE.paper}
      strokeWidth={size * 0.2}
      strokeLinejoin="round"
      paintOrder="stroke"
      style={{ letterSpacing: '0.015em' }}
    >
      {text}
    </text>
  </g>
);

/**
 * A label that stamps in and holds. The workhorse of every mechanism scene in this batch.
 *
 * Renders nothing at all before its frame — not a zero-opacity node — so a scene's DOM only
 * ever contains what is actually on screen.
 */
export const StampLabel: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  rotate?: number;
  until?: number;
}> = ({ frame, at, x, y, text, size = 52, color = PALETTE.coral, rotate = -3, until }) => {
  if (frame < at || (until !== undefined && frame >= until)) return null;
  const s = snap(frame, at);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Label x={0} y={0} text={text} size={size} color={color} rotate={rotate} />
    </g>
  );
};

/**
 * Slide something in from off-stage and hold it.
 *
 * `from` is the offset it starts at, in stage pixels. Props in this channel ARRIVE — they
 * enter from somewhere and stop — because a fade-in on a doodle reads as a slideshow
 * transition rather than as a thing being put down.
 */
export const SlideIn: React.FC<{
  frame: number;
  at: number;
  fromX?: number;
  fromY?: number;
  frames?: number;
  children: React.ReactNode;
}> = ({ frame, at, fromX = 0, fromY = 0, frames = 10, children }) => {
  if (frame < at) return null;
  const t = ramp(frame, at, frames);
  return (
    <g transform={`translate(${(1 - t) * fromX} ${(1 - t) * fromY})`} opacity={Math.min(1, t * 2)}>
      {children}
    </g>
  );
};

/**
 * Hold a thing on screen only between two frames, popping it in and out.
 *
 * The pop-out matters: things in this channel leave as decisively as they arrive, and a prop
 * that fades away while the narration has moved on is the single most common way a doodle
 * explainer starts feeling slack.
 */
export const Reveal: React.FC<{
  frame: number;
  at: number;
  until?: number;
  originX?: number;
  originY?: number;
  children: React.ReactNode;
}> = ({ frame, at, until, originX = 0, originY = 0, children }) => {
  if (frame < at || (until !== undefined && frame >= until)) return null;
  const inT = snap(frame, at);
  const outT = until !== undefined ? 1 - ramp(frame, until - 5, 5) : 1;
  const s = inT * outT;
  return (
    <g transform={`translate(${originX} ${originY}) scale(${s}) translate(${-originX} ${-originY})`}>
      {children}
    </g>
  );
};

/**
 * A dimmer for everything that is NOT the subject.
 *
 * On a phone, "look at this one" is done with contrast, not with an arrow. Wrapping the rest
 * of the diagram in this is how these episodes point.
 */
export const Dim: React.FC<{ active: boolean; amount?: number; children: React.ReactNode }> = ({
  active,
  amount = 0.24,
  children,
}) => <g opacity={active ? amount : 1}>{children}</g>;
