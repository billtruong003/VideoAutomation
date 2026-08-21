/**
 * Motion.tsx — the entrance/exit/idle vocabulary, as reusable primitives.
 *
 * Every one of these exists so that a scene describes INTENT ("this pops in, that drifts")
 * instead of arithmetic. A scene file full of hand-tuned `interpolate` calls is where a look
 * goes to die: the fifth pop-in is never quite the first pop-in, and by the tenth the video
 * has no house style, only ten similar accidents.
 *
 * Two rules hold throughout:
 *
 *   NOTHING IS RANDOM AT RENDER TIME. Where a wobble needs variety it comes from a seeded
 *   hash of a string, so frame 9000 of a re-render is byte-identical to frame 9000 of the
 *   first one. `Math.random()` in a Remotion component produces a video that cannot be
 *   resumed, re-rendered, or trusted.
 *
 *   MOTION IS FINITE. Entrances settle. A frame where everything is still moving after two
 *   seconds has no focal point, and the eye gives up rather than choosing.
 */

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** Deterministic [0,1) from a string. Same seed, same value, forever. */
export function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

type Common = { children: React.ReactNode; delay?: number; style?: React.CSSProperties };

/**
 * Scale-and-settle entrance. The house default for anything arriving on screen.
 *
 * `overshoot` is what makes it read as drawn rather than as a CSS transition — the object
 * arrives slightly too big and settles, the way a hand places something down.
 */
export const PopIn: React.FC<Common & { from?: number; overshoot?: boolean }> = ({
  children, delay = 0, from = 0.55, overshoot = true, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: overshoot ? { damping: 11, mass: 0.62, stiffness: 130 } : { damping: 200 },
    durationInFrames: 22,
  });
  return (
    <div style={{
      ...style,
      transform: `${style?.transform ?? ''} scale(${interpolate(s, [0, 1], [from, 1])})`,
      opacity: interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' }),
    }}
    >
      {children}
    </div>
  );
};

export const SlideIn: React.FC<Common & { dx?: number; dy?: number; distance?: number }> = ({
  children, delay = 0, dx = 0, dy = 0, distance = 90, style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 }, durationInFrames: 24 });
  return (
    <div style={{
      ...style,
      transform: `${style?.transform ?? ''} translate(${(1 - s) * dx * distance}px, ${(1 - s) * dy * distance}px)`,
      opacity: interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
    }}
    >
      {children}
    </div>
  );
};

export const FadeIn: React.FC<Common & { frames?: number }> = ({ children, delay = 0, frames = 14, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...style, opacity: interpolate(frame - delay, [0, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      {children}
    </div>
  );
};

/** Slow vertical drift. Idle life for something that would otherwise be a frozen PNG. */
export const Float: React.FC<Common & { amount?: number; period?: number; seed?: string }> = ({
  children, amount = 9, period = 92, seed = 'float', style,
}) => {
  const frame = useCurrentFrame();
  const phase = seeded(seed) * Math.PI * 2;
  return (
    <div style={{
      ...style,
      transform: `${style?.transform ?? ''} translateY(${Math.sin((frame / period) * Math.PI * 2 + phase) * amount}px)`,
    }}
    >
      {children}
    </div>
  );
};

/** Panic vibration. Decays, because a permanently shaking object stops reading as alarm. */
export const Shake: React.FC<Common & { amount?: number; frames?: number }> = ({
  children, delay = 0, amount = 7, frames = 40, style,
}) => {
  const frame = useCurrentFrame() - delay;
  const decay = interpolate(frame, [0, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = Math.sin(frame * 1.9) * amount * decay;
  const y = Math.cos(frame * 2.7) * amount * 0.6 * decay;
  return <div style={{ ...style, transform: `${style?.transform ?? ''} translate(${x}px, ${y}px)` }}>{children}</div>;
};

/** A single squash-and-stretch pulse, for an impact or a realisation. */
export const Pulse: React.FC<Common & { at: number; amount?: number }> = ({
  children, at, amount = 0.14, style,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const k = t < 0 ? 0 : Math.exp(-t / 5) * Math.sin(t / 2.1);
  return (
    <div style={{
      ...style,
      transform: `${style?.transform ?? ''} scale(${1 + k * amount}, ${1 - k * amount * 0.7})`,
    }}
    >
      {children}
    </div>
  );
};

/** Children appear one after another. The cheapest way to make a list feel authored. */
export const Stagger: React.FC<{
  children: React.ReactNode; delay?: number; step?: number; mode?: 'pop' | 'slide' | 'fade';
  dx?: number; dy?: number;
}> = ({ children, delay = 0, step = 6, mode = 'pop', dx = 0, dy = 1 }) => (
  <>
    {React.Children.map(children, (child, i) => {
      const d = delay + i * step;
      if (mode === 'slide') return <SlideIn delay={d} dx={dx} dy={dy}>{child}</SlideIn>;
      if (mode === 'fade') return <FadeIn delay={d}>{child}</FadeIn>;
      return <PopIn delay={d}>{child}</PopIn>;
    })}
  </>
);

/**
 * Camera move applied to a whole scene.
 *
 * A slow push is the difference between "a diagram is on screen" and "we are looking at a
 * diagram". Kept small — past a few percent it stops being a camera and starts being a zoom.
 */
export const Camera: React.FC<{
  children: React.ReactNode; push?: number; panX?: number; panY?: number; frames?: number;
}> = ({ children, push = 0.04, panX = 0, panY = 0, frames = 240 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp' });
  const eased = t * t * (3 - 2 * t);
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      transform: `scale(${1 + push * eased}) translate(${panX * eased}px, ${panY * eased}px)`,
      transformOrigin: 'center center',
    }}
    >
      {children}
    </div>
  );
};

/**
 * Progressive stroke reveal — an arrow or a graph drawing itself.
 *
 * Uses `pathLength="1"` so the dash maths is independent of the path's real length; without
 * it every call site would need to measure its own geometry, which is exactly the kind of
 * per-site arithmetic these primitives exist to abolish.
 */
export const DrawPath: React.FC<{
  d: string; delay?: number; frames?: number; stroke: string; width?: number;
  dashed?: boolean; cap?: 'round' | 'butt'; opacity?: number;
}> = ({ d, delay = 0, frames = 22, stroke, width = 6, dashed = false, cap = 'round', opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, frames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap={cap}
      strokeLinejoin="round"
      // A dashed line cannot use the dash array to reveal itself — the dashes ARE the array —
      // so it fades in over the same window instead, and marches while it is on screen.
      opacity={dashed ? opacity * p : opacity}
      pathLength={1}
      strokeDasharray={dashed ? '0.02 0.02' : `${p} 1`}
      strokeDashoffset={dashed ? -frame * 0.0016 : 0}
    />
  );
};
