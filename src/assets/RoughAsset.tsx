/**
 * RoughAsset.tsx — the single stylizer every asset passes through.
 *
 * This is the "render imperfectly" half of the contract. It takes clean geometry and emits
 * the channel's hand, seeded from the asset's identity so the same clock is the same clock
 * in every frame of every render.
 *
 * ONE engine draws everything. Shapes get shape presets, gestures get pen presets, but both
 * are Rough.js. A previous revision used a second library for gestures; the drawing ended up
 * with two different pens in it and half of it ignored the clean-mode switch.
 *
 * There is exactly ONE of these. If the channel's look needs to change, it changes here
 * and in `style/tokens.ts` — not across 27 asset files. That is the whole point of V2.
 */

import React from 'react';
import type { Options } from 'roughjs/bin/core';
import { roughPaths, seedFrom } from '../rough/generator';
import { PALETTE, ROUGH, FILL, PEN, STYLE_MODE } from '../style/tokens';
import { quantize } from '../lib/pathpoints';
import type { AssetDef, Shape, ShapeStyle } from './shapes';

/** Build the Rough.js option bag for one shape from its tokens plus overrides. */
function optionsFor(style: ShapeStyle, seed: number): Options {
  const token = ROUGH[style.rough ?? 'prop'];
  const fillStyle = FILL[style.fillStyle ?? 'solid'];

  const opts: Options = {
    seed,
    roughness: style.roughness ?? token.roughness,
    bowing: style.bowing ?? token.bowing,
    stroke: style.stroke ?? PALETTE.ink,
    strokeWidth: style.sw ?? token.strokeWidth,
    ...fillStyle,
  };

  if (style.fill) opts.fill = style.fill;
  if (style.stroke === 'none') opts.stroke = 'none';
  // single-pass outlines keep small details from turning to mud
  if (style.single) opts.disableMultiStroke = true;

  /*
   * Clean mode: Rough.js still draws every shape, but with no wander and no bow, and with
   * vertices preserved exactly — so the output is the clean geometry the asset was
   * authored as. One branch, in one function, turns the entire channel's hand off.
   */
  if (STYLE_MODE === 'clean') {
    opts.roughness = 0;
    opts.bowing = 0;
    opts.disableMultiStroke = true;
    opts.preserveVertices = true;
  }

  return opts;
}

/** Render one shape (recursing into groups). `path` is its stable identity for seeding. */
function renderShape(shape: Shape, path: string, key: React.Key): React.ReactNode {
  if (shape.k === 'group') {
    return (
      <g key={key} transform={shape.transform} opacity={shape.opacity}>
        {shape.shapes.map((child, i) =>
          renderShape(child, `${path}/${shape.id ?? 'g'}${i}`, i),
        )}
      </g>
    );
  }

  const seed = seedFrom(path);

  /*
   * ---- gestural marks ----
   * A brow, a limb and a swoosh are curves through points. They go through the SAME
   * stylizer as everything else, with a pen preset instead of a shape preset, so the whole
   * drawing is made by one hand and obeys one style switch. An earlier revision routed
   * these to perfect-freehand and the result had two visibly different pens in it — see
   * src/qa/PenProbe.tsx and the PEN comment in style/tokens.ts.
   */
  if (shape.k === 'stroke') {
    const pen = PEN[shape.pen ?? 'face'];
    const strokeOpts = optionsFor(
      {
        stroke: shape.color ?? PALETTE.ink,
        sw: shape.size ?? pen.strokeWidth,
        roughness: pen.roughness,
        bowing: pen.bowing,
        single: true,
      },
      seed,
    );
    const strokePaths = roughPaths(path, { kind: 'curve', args: [quantize(shape.pts)] }, strokeOpts);
    return (
      <g key={key} opacity={shape.opacity}>
        {strokePaths.map((sp, i) => (
          <path
            key={i}
            d={sp.d}
            stroke={sp.stroke}
            strokeWidth={sp.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    );
  }

  // ---- structural geometry ----
  const opts = optionsFor(shape, seed);

  let paths;
  switch (shape.k) {
    case 'rect':
      paths = roughPaths(path, { kind: 'rectangle', args: [shape.x, shape.y, shape.w, shape.h] }, opts);
      break;
    case 'ellipse':
      paths = roughPaths(path, { kind: 'ellipse', args: [shape.cx, shape.cy, shape.rx * 2, shape.ry * 2] }, opts);
      break;
    case 'circle':
      paths = roughPaths(path, { kind: 'circle', args: [shape.cx, shape.cy, shape.r * 2] }, opts);
      break;
    case 'line':
      paths = roughPaths(path, { kind: 'line', args: [shape.x1, shape.y1, shape.x2, shape.y2] }, opts);
      break;
    case 'polygon':
      paths = roughPaths(path, { kind: 'polygon', args: [shape.pts] }, opts);
      break;
    case 'polyline':
      paths = roughPaths(path, { kind: 'linearPath', args: [shape.pts] }, opts);
      break;
    case 'curve':
      paths = roughPaths(path, { kind: 'curve', args: [shape.pts] }, opts);
      break;
    case 'path':
      paths = roughPaths(path, { kind: 'path', args: [shape.d] }, opts);
      break;
    case 'arc':
      paths = roughPaths(
        path,
        {
          kind: 'arc',
          args: [
            shape.cx, shape.cy, shape.rx * 2, shape.ry * 2,
            (shape.start * Math.PI) / 180, (shape.stop * Math.PI) / 180,
            shape.closed ?? false,
          ],
        },
        opts,
      );
      break;
    default:
      return null;
  }

  return (
    <g key={key} opacity={shape.opacity}>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

export type RoughAssetProps = {
  /** Clean geometry to stylize. */
  def: AssetDef;
  /**
   * Seed namespace. Two instances of the same asset in one shot can be given different
   * namespaces so they are recognisably the same object drawn twice, rather than clones.
   */
  variant?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  flip?: boolean;
};

/**
 * Place and stylize an asset.
 *
 * Note what is NOT here: any per-frame parameter. Position, rotation and scale are SVG
 * transforms wrapped around already-cached geometry, so animating a prop costs nothing
 * and can never alter its drawn identity.
 */
export const RoughAsset: React.FC<RoughAssetProps> = ({
  def,
  variant = '',
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
  opacity = 1,
  flip = false,
}) => {
  const ns = variant ? `${def.id}#${variant}` : def.id;
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * (flip ? -1 : 1)} ${scale})`}
      opacity={opacity}
    >
      {def.shapes.map((s, i) => renderShape(s, `${ns}:${i}`, i))}
    </g>
  );
};

/** Render bare shapes without an AssetDef wrapper — for one-off scene geometry. */
export const RoughShapes: React.FC<{ shapes: Shape[]; id: string }> = ({ shapes, id }) => (
  <>{shapes.map((s, i) => renderShape(s, `${id}:${i}`, i))}</>
);
