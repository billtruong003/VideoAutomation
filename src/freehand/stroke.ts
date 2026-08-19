/**
 * stroke.ts — organic pen strokes via perfect-freehand.
 *
 * The division of labour with Rough.js is not stylistic hair-splitting, it is what makes
 * or breaks the look:
 *
 *   Rough.js          STRUCTURE — things that have dimensions and edges.
 *                     A clock, a chair, a wall, a slot machine cabinet.
 *
 *   perfect-freehand  GESTURE — things drawn in a single motion, where the pressure
 *                     profile IS the drawing. An eyebrow, a mouth, a scribble, a swoosh.
 *
 * A rough-generated eyebrow looks like a snapped twig; a freehand-drawn rectangle looks
 * like a deflated balloon. Each tool is bad at the other's job.
 *
 * Strokes are filled outlines, not stroked centrelines — perfect-freehand returns the
 * OUTLINE of a pen mark, so the resulting path is filled with the ink colour and never
 * given a stroke of its own.
 */

import getStroke from 'perfect-freehand';
import { FREEHAND, type FreehandToken } from '../style/tokens';
import { valueNoise, hashString } from '../lib/rand';

export type Point = [number, number];

export type FreehandOptions = {
  size?: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  taperStart?: number;
  taperEnd?: number;
  /** Simulated pen pressure per point, 0..1. Defaults to a natural mid-stroke swell. */
  pressures?: number[];
};

/** Convert perfect-freehand's outline points into a closed SVG path. */
function outlineToPath(points: number[][]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  // quadratic through midpoints keeps the outline smooth without a curve-fit pass
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` Q ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`;
  }
  return `${d} Z`;
}

/**
 * A natural pressure curve: light on the way in, heaviest around a third of the way
 * through, easing off at the end. Flat pressure is the tell-tale sign of a fake stroke.
 */
function defaultPressures(n: number, seed: string): number[] {
  const h = hashString(seed);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const swell = Math.sin(Math.pow(t, 0.7) * Math.PI);
    // a little seeded variation so two strokes never share a pressure profile
    return Math.max(0.15, Math.min(1, 0.45 + swell * 0.5 + valueNoise(t * 4, h) * 0.08));
  });
}

/**
 * Build the SVG path for a freehand stroke through `points`.
 * Deterministic: the same points and seed always produce the same mark.
 */
export function freehandPath(
  points: Point[],
  token: FreehandToken = 'face',
  seed = 'stroke',
  overrides: FreehandOptions = {},
): string {
  if (points.length === 0) return '';
  const base = FREEHAND[token];
  const pressures = overrides.pressures ?? defaultPressures(points.length, seed);
  const input = points.map((p, i) => [p[0], p[1], pressures[i] ?? 0.6]);

  const outline = getStroke(input, {
    size: overrides.size ?? base.size,
    thinning: overrides.thinning ?? base.thinning,
    smoothing: overrides.smoothing ?? base.smoothing,
    streamline: overrides.streamline ?? base.streamline,
    start: { taper: (overrides.taperStart ?? base.taperStart) * (base.size * 2), cap: true },
    end: { taper: (overrides.taperEnd ?? base.taperEnd) * (base.size * 2), cap: true },
    simulatePressure: false,
    last: true,
  });

  return outlineToPath(outline as number[][]);
}

/** Sample a quadratic bezier into points a freehand stroke can follow. */
export function quadPoints(a: Point, control: Point, b: Point, steps = 14): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push([
      mt * mt * a[0] + 2 * mt * t * control[0] + t * t * b[0],
      mt * mt * a[1] + 2 * mt * t * control[1] + t * t * b[1],
    ]);
  }
  return out;
}

/** Sample an arc — the workhorse for mouths, closed eyes and brows. */
export function arcPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number,
  endDeg: number,
  steps = 14,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((startDeg + (endDeg - startDeg) * (i / steps)) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** A straight run with a seeded waver — a "straight" line nobody drew with a ruler. */
export function wobblyLine(a: Point, b: Point, seed: string, amount = 1.4, steps = 8): Point[] {
  const h = hashString(seed);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // zero deviation at both ends so endpoints stay exactly where the caller asked
    const env = Math.sin(t * Math.PI);
    const off = valueNoise(t * 3, h) * amount * env;
    out.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
  }
  return out;
}

/** A loose multi-loop scribble inside a box — deterministic per seed. */
export function scribblePoints(
  cx: number,
  cy: number,
  w: number,
  h: number,
  seed: string,
  loops = 5,
): Point[] {
  const s = hashString(seed);
  const out: Point[] = [];
  const steps = loops * 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * loops;
    const r = 0.15 + 0.85 * t;
    out.push([
      cx + Math.cos(a) * (w / 2) * r + valueNoise(t * 6, s) * w * 0.06,
      cy + Math.sin(a) * (h / 2) * r + valueNoise(t * 6, s + 991) * h * 0.06,
    ]);
  }
  return out;
}
