/**
 * MoneyFly.tsx — objects leaving along an arc.
 *
 * Generic "things drift away from the character" motion: cash, chips, a wallet, or in a
 * future episode, time/attention/followers. Positions are a pure function of frame and
 * index, so nothing is stateful and everything is deterministic.
 *
 * Episode-agnostic.
 */

import React from 'react';
import { interpolate } from 'remotion';
import { rand01, hashString } from '../lib/rand';

export type FlightItem = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  index: number;
};

/**
 * Compute the flight of `count` items launched from a point, fanning along an arc
 * toward `to`, each staggered by `stagger` frames.
 */
export function useFlight(
  frame: number,
  {
    at,
    duration = 40,
    count = 6,
    from,
    to,
    arc = -180,
    stagger = 4,
    seed = 'fly',
    fadeOut = true,
  }: {
    at: number;
    duration?: number;
    count?: number;
    from: [number, number];
    to: [number, number];
    /** How high the arc bows, in stage px. Negative bows upward. */
    arc?: number;
    stagger?: number;
    seed?: string;
    fadeOut?: boolean;
  },
): FlightItem[] {
  const out: FlightItem[] = [];
  for (let i = 0; i < count; i++) {
    const h = hashString(`${seed}:${i}`);
    const start = at + i * stagger;
    const t = interpolate(frame, [start, start + duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    if (t <= 0) continue;

    const spreadX = (rand01(h) * 2 - 1) * 120;
    const spreadY = (rand01(h + 17) * 2 - 1) * 70;
    const x = from[0] + (to[0] + spreadX - from[0]) * t;
    // quadratic bow
    const baseY = from[1] + (to[1] + spreadY - from[1]) * t;
    const y = baseY + arc * 4 * t * (1 - t);

    out.push({
      x,
      y,
      rotate: (rand01(h + 33) * 2 - 1) * 40 + t * 360 * (rand01(h + 51) > 0.5 ? 1 : -1) * 0.6,
      scale: 0.85 + rand01(h + 77) * 0.35,
      opacity: fadeOut ? Math.min(1, (1 - t) * 2.4) : 1,
      index: i,
    });
  }
  return out;
}

export const MoneyFly: React.FC<{
  items: FlightItem[];
  /** Rendered once per item. */
  render: (item: FlightItem) => React.ReactNode;
}> = ({ items, render }) => (
  <>
    {items.map((it) => (
      <g
        key={it.index}
        transform={`translate(${it.x} ${it.y}) rotate(${it.rotate}) scale(${it.scale})`}
        opacity={it.opacity}
      >
        {render(it)}
      </g>
    ))}
  </>
);
