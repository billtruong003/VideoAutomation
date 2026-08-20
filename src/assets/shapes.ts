/**
 * shapes.ts — the clean-geometry asset language.
 *
 * Assets in V2 are DATA, not drawings. A wall clock is not a hand-tuned bezier potato;
 * it is "a circle, twelve ticks, two hands, a rim". That description is authored cleanly,
 * and every trace of hand-drawn-ness is added later by the stylizer.
 *
 * Why this matters beyond tidiness:
 *
 *   - An author (human or model) asked for "a clock" produces correct semantics almost
 *     every time. Asked for "a sketchy hand-drawn clock" it produces a different, worse
 *     clock every time. V1 failed exactly there.
 *   - Restyling the whole channel becomes a token change, not 27 rewrites.
 *   - Geometry is inspectable and diffable; squiggles are not.
 *
 * `k: 'stroke'` is a gestural mark — a brow, a limb, a scribble — authored as a path of
 * motion rather than as a closed shape. It is still drawn by the SAME Rough.js stylizer as
 * everything else, just with a pen preset instead of a shape preset. It is not a second
 * drawing engine; an earlier revision made it one and the drawing ended up with two hands
 * (see `qa/v2-pen-probe.png`).
 */

import type { RoughToken } from '../style/tokens';
import type { PenToken } from '../style/tokens';
import type { FILL } from '../style/tokens';

export type FillStyleName = keyof typeof FILL;

/** Styling that any structural shape may carry. All optional — tokens supply defaults. */
export type ShapeStyle = {
  /** Outline colour. Defaults to ink. `'none'` for fill-only shapes. */
  stroke?: string;
  /** Fill colour. Omitted means unfilled. */
  fill?: string;
  /** Explicit stroke width, overriding the roughness token's default. */
  sw?: number;
  /** Which roughness preset to draw with. Defaults to `prop`. */
  rough?: RoughToken;
  /** How a fill is applied. Defaults to solid — hachure aliases badly on phones. */
  fillStyle?: FillStyleName;
  /** Fine-grained overrides, for the rare shape that needs them. */
  roughness?: number;
  bowing?: number;
  /** Single-pass outline. Cleaner for small details, where a double stroke reads as mud. */
  single?: boolean;
  opacity?: number;
};

export type Pt = [number, number];

export type Geom =
  | { k: 'rect'; x: number; y: number; w: number; h: number }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'circle'; cx: number; cy: number; r: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { k: 'polygon'; pts: Pt[] }
  | { k: 'polyline'; pts: Pt[] }
  | { k: 'curve'; pts: Pt[] }
  | { k: 'path'; d: string }
  | { k: 'arc'; cx: number; cy: number; rx: number; ry: number; start: number; stop: number; closed?: boolean }
  /** Gestural mark: a curve through `pts`, drawn with a pen preset. `size` overrides width. */
  | { k: 'stroke'; pts: Pt[]; pen?: PenToken; size?: number; color?: string; opacity?: number }
  /**
   * A nested group. `transform` is applied to the RENDERED output, never folded into the
   * geometry — that is what lets a clock hand rotate every frame while its roughened form
   * stays cached and stable.
   */
  | { k: 'group'; shapes: Shape[]; transform?: string; opacity?: number; id?: string };

export type Shape = Geom & ShapeStyle;

/** An asset is an id plus the geometry that defines it. */
export type AssetDef = {
  id: string;
  shapes: Shape[];
  /** Nominal size in character units, for documentation and QA framing. */
  size?: { w: number; h: number };
};

// ---------------------------------------------------------------------------
// small authoring helpers — keep asset files readable
// ---------------------------------------------------------------------------

/** Points on a circle: `ring(0,0,30,12)` gives twelve evenly spaced positions. */
export function ring(cx: number, cy: number, r: number, count: number, offsetDeg = -90): Pt[] {
  return Array.from({ length: count }, (_, i) => {
    const a = ((offsetDeg + (360 / count) * i) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt;
  });
}

/** A line from a centre outward between two radii, at an angle — clock ticks, sun rays. */
export function spoke(cx: number, cy: number, r0: number, r1: number, deg: number): Geom {
  const a = ((deg - 90) * Math.PI) / 180;
  return {
    k: 'line',
    x1: cx + Math.cos(a) * r0,
    y1: cy + Math.sin(a) * r0,
    x2: cx + Math.cos(a) * r1,
    y2: cy + Math.sin(a) * r1,
  };
}

/** Rounded-rectangle as a path, since Rough.js rectangles are always square-cornered. */
export function roundedRect(x: number, y: number, w: number, h: number, r: number): Geom {
  const rr = Math.min(r, w / 2, h / 2);
  return {
    k: 'path',
    d:
      `M ${x + rr} ${y} H ${x + w - rr} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} ` +
      `V ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} ` +
      `H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} ` +
      `V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`,
  };
}

/**
 * Style overrides for SMALL filled marks (roughly under 6 units across): dice pips, chip
 * centres, pupils, bulbs.
 *
 * Rough.js roughness is expressed in absolute units, not as a fraction of the shape. On a
 * 3-unit disc the default wander is larger than the disc itself, so the "circle" comes out
 * as a scribble and a grid of them merges into a dark smear — which is exactly how the
 * first V2 dice rendered: a black square with light gaps where the pips should be.
 *
 * Spread this onto anything small and filled.
 */
export const TINY = { roughness: 0.35, bowing: 0.3, single: true } as const;

/** Group helper. */
export const group = (shapes: Shape[], extra: Partial<Extract<Geom, { k: 'group' }>> = {}): Shape =>
  ({ k: 'group', shapes, ...extra }) as Shape;
