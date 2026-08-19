/**
 * generator.ts — deterministic, cached Rough.js path generation.
 *
 * Three problems have to be solved at once here:
 *
 *  1. DETERMINISM. Remotion renders frames out of order across parallel workers. An
 *     unseeded Rough.js call would give a different squiggle on every frame, which reads
 *     as boiling static rather than as a drawing. Every call therefore carries a seed
 *     derived from a stable string (the asset's identity), never from a counter or clock.
 *
 *  2. COST. Roughening is not free, and the same clock is redrawn 1218 times in a render.
 *     Since geometry + options + seed fully determine the output, results are memoised in
 *     a module-level cache. Frame 900 reuses what frame 1 computed.
 *
 *  3. SHAPE. Rough.js hands back an ops tree; React wants `d` strings. `toPaths()` does
 *     that conversion, and its output is what gets cached.
 *
 * Anything that changes per frame (rotation, translation, scale, opacity) must be applied
 * as an SVG transform on the OUTPUT — never baked into the geometry, or the cache key
 * changes every frame and both benefits above are lost.
 */

import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { hashString } from '../lib/rand';

/** One Rough.js generator for the whole app; it is stateless between calls. */
const generator = rough.generator();

export type RoughPath = {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
  fillStyle?: string;
};

const cache = new Map<string, RoughPath[]>();

/** Cache statistics, surfaced by the asset QA tools. */
export const roughCacheStats = { hits: 0, misses: 0 };

/**
 * Turn a stable identity string into a Rough.js seed.
 *
 * Rough.js treats seed 0 as "no seed" (i.e. random), so 0 is mapped away. The range is
 * kept well inside 2^31 because the library does integer maths on it internally.
 */
export function seedFrom(identity: string): number {
  const h = hashString(identity) % 2147483647;
  return h === 0 ? 1 : h;
}

type ShapeSpec =
  | { kind: 'rectangle'; args: [number, number, number, number] }
  | { kind: 'ellipse'; args: [number, number, number, number] }
  | { kind: 'circle'; args: [number, number, number] }
  | { kind: 'line'; args: [number, number, number, number] }
  | { kind: 'polygon'; args: [[number, number][]] }
  | { kind: 'linearPath'; args: [[number, number][]] }
  | { kind: 'curve'; args: [[number, number][]] }
  | { kind: 'path'; args: [string] }
  | { kind: 'arc'; args: [number, number, number, number, number, number, boolean] };

/**
 * Generate (or fetch from cache) the SVG paths for one rough shape.
 *
 * `identity` must be stable for the life of the asset and unique per shape instance —
 * two different shapes sharing an identity would share a seed and look suspiciously
 * similar. Callers build it as `asset:variant:index`.
 */
export function roughPaths(identity: string, spec: ShapeSpec, options: Options): RoughPath[] {
  const seed = options.seed ?? seedFrom(identity);
  const opts: Options = { ...options, seed };

  const key = `${spec.kind}|${JSON.stringify(spec.args)}|${JSON.stringify(opts)}`;
  const hit = cache.get(key);
  if (hit) {
    roughCacheStats.hits++;
    return hit;
  }
  roughCacheStats.misses++;

  let drawable;
  switch (spec.kind) {
    case 'rectangle': drawable = generator.rectangle(...spec.args, opts); break;
    case 'ellipse': drawable = generator.ellipse(...spec.args, opts); break;
    case 'circle': drawable = generator.circle(...spec.args, opts); break;
    case 'line': drawable = generator.line(...spec.args, opts); break;
    case 'polygon': drawable = generator.polygon(spec.args[0], opts); break;
    case 'linearPath': drawable = generator.linearPath(spec.args[0], opts); break;
    case 'curve': drawable = generator.curve(spec.args[0], opts); break;
    case 'path': drawable = generator.path(spec.args[0], opts); break;
    case 'arc': drawable = generator.arc(...spec.args, opts); break;
  }

  const paths: RoughPath[] = generator.toPaths(drawable).map((p) => ({
    d: p.d,
    stroke: p.stroke === 'none' ? 'none' : p.stroke,
    strokeWidth: p.strokeWidth,
    fill: p.fill ?? 'none',
    fillStyle: (p as { fillStyle?: string }).fillStyle,
  }));

  cache.set(key, paths);
  return paths;
}

/** Escape hatch for tools that need the raw generator (SVG roughification, QA). */
export const roughGenerator = generator;

/** Test helper — lets a QA run assert that a second pass is fully cached. */
export function resetRoughCache(): void {
  cache.clear();
  roughCacheStats.hits = 0;
  roughCacheStats.misses = 0;
}
