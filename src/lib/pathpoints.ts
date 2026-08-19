/**
 * pathpoints.ts — samplers that turn intent into a boring list of points.
 *
 * These exist so an asset author can say "an arc from here to here" instead of hand-typing
 * bezier control points. That is all they do. They add no character, no jitter and no
 * variation: the output is deliberately dull, because everything expressive is supposed to
 * come from the stylizer.
 *
 * They were originally part of a perfect-freehand module. The stroke rendering is gone —
 * see `PEN` in `src/style/tokens.ts` for why — but the samplers were always just geometry
 * and are kept.
 */

export type Point = [number, number];

/** Sample a quadratic bezier. */
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

/**
 * A straight run between two points, sampled.
 *
 * The V1-era version of this deliberately wavered the midpoints. It no longer does: adding
 * hand-drawn deviation here would be authoring the hand again, which is the exact mistake
 * this architecture exists to prevent. Rough.js bows the line.
 */
export function linePoints(a: Point, b: Point, steps = 6): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/**
 * Compatibility alias for `linePoints`.
 *
 * The V1-era `wobblyLine` took an `amount` and deviated the midpoints. It is kept only so
 * existing call sites read naturally, and it deliberately IGNORES the amount: hand-drawn
 * deviation is the stylizer's job now. The parameter survives so the diff stays small.
 */
export function wobblyLine(a: Point, b: Point, _seed?: string, _amount?: number, steps = 6): Point[] {
  return linePoints(a, b, steps);
}

/** An outward spiral — dizzy eyes, scribbles, time vortices. */
export function spiralPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  turns = 2.3,
  steps = 44,
  direction: 1 | -1 = 1,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns * direction;
    out.push([cx + Math.cos(a) * rx * t, cy + Math.sin(a) * ry * t]);
  }
  return out;
}

/** Backwards-compatible alias — a scribble is a spiral with more turns. */
export function scribblePoints(
  cx: number,
  cy: number,
  w: number,
  h: number,
  _seed: string,
  loops = 5,
): Point[] {
  return spiralPoints(cx, cy, w / 2, h / 2, loops, loops * 12);
}

/**
 * Round points to 1dp.
 *
 * Not cosmetic: stylized geometry is memoised on its input, so a limb whose coordinates
 * carry fifteen decimal places mints a new cache entry on every sub-pixel change. Rounding
 * bounds the cache without any visible difference at 1080x1920.
 */
export function quantize(pts: Point[]): Point[] {
  return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
