/**
 * diagram.tsx — the marks that make an invisible mechanism visible.
 *
 * These are not decoration. Every mark here carries a fact that the narration states and the
 * picture would otherwise have to assert: a wavelength is too wide to fit, air is or is not
 * moving, a length is 10 feet, a smell is a chemical leaving an object.
 *
 * They are GESTURES rather than structures — a flow arrow is one motion of a pen, not an
 * engineered shape — so they are drawn with pen presets. That is the same single stylizer
 * everything else uses, with a different preset; there is no second drawing engine here.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE, FONTS } from '../style/tokens';
import { TINY, type AssetDef, type Pt, type Shape } from '../assets/shapes';
import { wobblyLine } from '../lib/pathpoints';

/**
 * A sine wave, drawn at an explicit wavelength.
 *
 * The microwave episode's whole explanation is a size comparison, so `wavelength` is a real
 * parameter and the two waves in that episode are the SAME component at different numbers.
 * Drawing "a big wave" and "a small wave" as two hand-made assets would let them drift apart
 * and quietly stop being a comparison.
 */
const waveDef = (wavelength: number, amplitude: number, span: number, color: string, weight: number): AssetDef => {
  const pts: Pt[] = [];
  const step = Math.max(4, wavelength / 12);
  for (let x = -span / 2; x <= span / 2; x += step) {
    pts.push([x, Math.sin((x / wavelength) * Math.PI * 2) * amplitude]);
  }
  return {
    id: 'fx-wave',
    shapes: [{ k: 'stroke', pts, pen: 'accent', size: weight, color }],
  };
};

export const Wave: React.FC<
  PropArgs & { wavelength?: number; amplitude?: number; span?: number; color?: string; weight?: number }
> = ({
  wavelength = 120,
  amplitude = 34,
  span = 700,
  color = PALETTE.coral,
  weight = 6,
  seed = 'wave',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={waveDef(Math.round(wavelength), Math.round(amplitude), span, color, weight)}
      variant={`${seed}:${Math.round(wavelength)}`}
    />
  </PropFrame>
);

/**
 * A run of flow arrows along a line — air moving, or conspicuously not.
 *
 * `alive` is the whole point: the gas-pump episode needs the moment airflow STOPS to be
 * visible, and a stalled arrow that has gone coral says that in one frame where removing the
 * arrows entirely would just look like a drawing mistake.
 */
const flowDef = (count: number, len: number, alive: boolean, color: string): AssetDef => {
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const y = (i - (count - 1) / 2) * (len / Math.max(1, count - 1));
    const c = alive ? color : PALETTE.coral;
    shapes.push({
      k: 'stroke',
      pts: wobblyLine([-14, y], [14, y], `fx-flow-${i}`, 0.7, 8),
      pen: 'accent',
      size: 3.4,
      color: c,
    });
    // arrowhead, pointing along +x
    shapes.push({
      k: 'polygon',
      pts: [[14, y], [6, y - 5], [6, y + 5]],
      fill: c,
      stroke: c,
      rough: 'detail',
      sw: 1.4,
      ...TINY,
    });
  }
  return { id: 'fx-flow', shapes };
};

export const FlowArrows: React.FC<
  PropArgs & { count?: number; len?: number; alive?: boolean; color?: string }
> = ({ count = 4, len = 120, alive = true, color = PALETTE.teal, seed = 'flow', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={flowDef(count, len, alive, color)} variant={`${seed}:${alive}`} />
  </PropFrame>
);

/**
 * A dimension line with ticked ends — "this thing is this long".
 *
 * The highway episode measures a road marking against a person, so the measurement itself has
 * to be a drawable object rather than a caption. Length is a parameter and the label rides at
 * the midpoint, which means the same component measures a 10-foot dash and a 3-metre man.
 */
const dimensionDef = (length: number, vertical: boolean, color: string): AssetDef => {
  const a: Pt = vertical ? [0, -length / 2] : [-length / 2, 0];
  const b: Pt = vertical ? [0, length / 2] : [length / 2, 0];
  const tick = 14;
  return {
    id: 'fx-dimension',
    shapes: [
      { k: 'stroke', pts: wobblyLine(a, b, 'fx-dim-run', 1.1, 16), pen: 'accent', size: 3.6, color },
      {
        k: 'line',
        x1: vertical ? -tick : a[0], y1: vertical ? a[1] : -tick,
        x2: vertical ? tick : a[0], y2: vertical ? a[1] : tick,
        stroke: color, sw: 3.4, rough: 'detail', single: true,
      },
      {
        k: 'line',
        x1: vertical ? -tick : b[0], y1: vertical ? b[1] : -tick,
        x2: vertical ? tick : b[0], y2: vertical ? b[1] : tick,
        stroke: color, sw: 3.4, rough: 'detail', single: true,
      },
    ],
  };
};

export const DimensionLine: React.FC<
  PropArgs & { length?: number; vertical?: boolean; color?: string; label?: string }
> = ({
  length = 200,
  vertical = false,
  color = PALETTE.coral,
  label,
  seed = 'dimension',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={dimensionDef(Math.round(length), vertical, color)}
      variant={`${seed}:${Math.round(length)}`}
    />
    {label && (
      <text
        x={vertical ? 30 : 0}
        y={vertical ? 0 : -22}
        textAnchor={vertical ? 'start' : 'middle'}
        dominantBaseline="middle"
        fontFamily={FONTS.display}
        fontSize={46}
        fill={color}
        stroke={PALETTE.paper}
        strokeWidth={9}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {label}
      </text>
    )}
  </PropFrame>
);

/**
 * Rising scent curls — the old-book episode's central image.
 *
 * `decay` shifts them from warm gold (the smell you like) to sickly green (what it actually
 * is). That single colour move is the episode's whole turn, so it is a number rather than two
 * separate assets.
 */
const scentDef = (count: number, height: number, decay: number, spread: number): AssetDef => {
  const warm = [242, 179, 61];
  const sour = [122, 152, 74];
  const mix = warm.map((c, i) => Math.round(c + (sour[i] - c) * decay));
  const color = `rgb(${mix[0]},${mix[1]},${mix[2]})`;

  return {
    id: 'fx-scent',
    shapes: Array.from({ length: count }, (_, i): Shape => {
      const x = (i - (count - 1) / 2) * spread;
      // a curl, not a straight line: three control points that lean alternately
      const lean = i % 2 ? 1 : -1;
      const pts: Pt[] = [
        [x, 0],
        [x + lean * 14, -height * 0.32],
        [x - lean * 12, -height * 0.64],
        [x + lean * 8, -height],
      ];
      return { k: 'stroke', pts, pen: 'accent', size: 4.2, color, opacity: 0.85 };
    }),
  };
};

export const ScentCurls: React.FC<
  PropArgs & { count?: number; height?: number; decay?: number; spread?: number }
> = ({ count = 3, height = 160, decay = 0, spread = 34, seed = 'scent', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={scentDef(count, height, Math.round(decay * 8) / 8, spread)}
      variant={`${seed}:${Math.round(decay * 8)}`}
    />
  </PropFrame>
);

/** A drifting molecule mark: a ring with two stubs. Small, repeated, never explained. */
const MOLECULE: AssetDef = {
  id: 'fx-molecule',
  size: { w: 34, h: 26 },
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: 8, fill: PALETTE.teal, stroke: PALETTE.ink, rough: 'detail', sw: 2, ...TINY },
    { k: 'circle', cx: 13, cy: -7, r: 4.5, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 1.6, ...TINY },
    { k: 'circle', cx: -12, cy: 6, r: 4, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 1.6, ...TINY },
  ],
};

export const Molecule: React.FC<PropArgs> = ({ seed = 'molecule', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={MOLECULE} variant={seed} />
  </PropFrame>
);

/**
 * A hand-drawn cross through whatever sits under it — the "no, not that" mark.
 *
 * Used everywhere in this batch: wrong answers, denied technology, rejected explanations.
 * Two strokes, never a glyph, so it sits in the same hand as the drawing it lands on.
 */
const crossDef = (size: number, color: string): AssetDef => ({
  id: 'fx-cross-out',
  shapes: [
    { k: 'stroke', pts: wobblyLine([-size, -size], [size, size], 'fx-cross-a', 1.6, 10), pen: 'scribble', size: 7, color },
    { k: 'stroke', pts: wobblyLine([size, -size], [-size, size], 'fx-cross-b', 1.6, 10), pen: 'scribble', size: 7, color },
  ],
});

export const CrossOut: React.FC<PropArgs & { size?: number; color?: string }> = ({
  size = 46,
  color = PALETTE.coral,
  seed = 'cross-out',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={crossDef(Math.round(size), color)} variant={seed} />
  </PropFrame>
);

/** A tick — the counterpart to CrossOut, for "yes, that one". */
const tickDef = (size: number, color: string): AssetDef => ({
  id: 'fx-tick',
  shapes: [
    {
      k: 'stroke',
      pts: [[-size, 0], [-size * 0.25, size * 0.7], [size, -size * 0.9]],
      pen: 'scribble',
      size: 7,
      color,
    },
  ],
});

export const Tick: React.FC<PropArgs & { size?: number; color?: string }> = ({
  size = 40,
  color = PALETTE.teal,
  seed = 'tick-mark',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={tickDef(Math.round(size), color)} variant={seed} />
  </PropFrame>
);

/**
 * A ring drawn around something to say "this is the subject".
 *
 * Deliberately a scribbled loop rather than a clean circle: a perfect circle reads as UI
 * chrome laid over the drawing, and this has to read as somebody circling it by hand.
 */
const ringDef = (rx: number, ry: number, color: string): AssetDef => {
  const pts: Pt[] = [];
  const turns = 1.15;
  for (let i = 0; i <= 26; i++) {
    const a = (i / 26) * Math.PI * 2 * turns - Math.PI / 2;
    const grow = 1 + (i / 26) * 0.06;
    pts.push([Math.cos(a) * rx * grow, Math.sin(a) * ry * grow]);
  }
  return { id: 'fx-circle-it', shapes: [{ k: 'stroke', pts, pen: 'scribble', size: 6, color }] };
};

export const CircleIt: React.FC<
  PropArgs & { rx?: number; ry?: number; color?: string }
> = ({ rx = 90, ry = 78, color = PALETTE.coral, seed = 'circle-it', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={ringDef(Math.round(rx), Math.round(ry), color)} variant={seed} />
  </PropFrame>
);
