/**
 * marks.tsx — the cartoon emphasis vocabulary.
 *
 * These are the little scribbles a comic artist adds AROUND a drawing to say how it feels:
 * a "?" over a confused head, sweat off a panicking one, speed streaks behind something
 * bolting for the door. They carry a huge amount of the comedy for almost no drawing,
 * which is exactly the channel's trade.
 *
 * WHY THIS FILE IS ALMOST ALL `k:'stroke'`
 *
 * These are GESTURES — marks made in one motion. They are authored as point paths
 * (`k:'stroke'`) and drawn by the SAME stylizer as every shape in the project, using a
 * pen preset instead of a shape preset. There is no second drawing engine.
 *
 * Nothing in here is hand-wobbled by an author. Point paths are authored as clean curves
 * (arcs, quadratics, straight runs) and all the character comes from the pen.
 *
 * Every mark is drawn around its own local origin (0,0) in character units — the
 * protagonist's head is ~88 units across — so a mark dropped next to him is automatically
 * in scale. Anything a scene animates (how many sparkles, which way the streaks point) is
 * a prop, never internal state, and every scatter is a pure function of the seed.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { group, ring, type AssetDef, type Pt, type Shape } from '../assets/shapes';
import { arcPoints, quadPoints, wobblyLine } from '../lib/pathpoints';
import { hashString, rand01 } from '../lib/rand';

/**
 * The standard prop contract — a mark draws itself, so a caller has nothing to put inside.
 */
export type MarkProps = PropArgs;

/** Deterministic [0,1) from a seed plus a key. Never Math.random — renders must repeat. */
const r01 = (seed: string, key: string): number => rand01(hashString(`${seed}:${key}`));

/** Deterministic [-1,1]. */
const rSigned = (seed: string, key: string): number => r01(seed, key) * 2 - 1;

/** Short number formatting for transform strings. */
const n2 = (v: number): string => v.toFixed(2);

/** Even spacing that still behaves when there is only one item. */
const spread01 = (i: number, n: number): number => (n === 1 ? 0.5 : i / (n - 1));

// ---------------------------------------------------------------------------
// glyph marks — one stroke each, plus a blob for the dot
// ---------------------------------------------------------------------------

/**
 * The "?" as a single pen path: a hook arc over the top, then a quadratic tail down into
 * the stem. Clean geometry — the fatness and the taper come from the pen.
 */
const QUESTION_PTS: Pt[] = (() => {
  const hook = arcPoints(0, -11, 9.5, 10, 165, 400, 20);
  const tail = quadPoints(hook[hook.length - 1], [4.5, 0.5], [0.2, 9.5], 12);
  return [...hook, ...tail.slice(1)];
})();

/** A dot is a blob, not a gesture — the one Rough.js shape a punctuation mark needs. */
const dot = (cx: number, cy: number, r: number, color: string): Shape => ({
  k: 'circle',
  cx,
  cy,
  r,
  fill: color,
  stroke: color,
  rough: 'detail',
  sw: 1.8,
  single: true,
});

const questionMarkDef = (color: string): AssetDef => ({
  id: 'fx-question-mark',
  size: { w: 24, h: 41 },
  shapes: [
    { k: 'stroke', pts: QUESTION_PTS, pen: 'scribble', size: 8, color },
    dot(0.5, 16.5, 3.4, color),
  ],
});

const QUESTION_MARK = questionMarkDef(PALETTE.coral);

/** Confusion beat — a fat hand-drawn "?" to float over a baffled head, ~40 units tall. */
export const QuestionMark: React.FC<MarkProps & { color?: string }> = ({
  color,
  seed = 'question-mark',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={color ? questionMarkDef(color) : QUESTION_MARK} variant={seed} />
  </PropFrame>
);

/** The "!" bar: one downstroke. The pen's pressure swell makes it fat at the top. */
const BANG_PTS: Pt[] = wobblyLine([0, -20], [-1.5, 8], 'fx-exclamation-mark', 1.1, 14);

const exclamationMarkDef = (color: string): AssetDef => ({
  id: 'fx-exclamation-mark',
  size: { w: 14, h: 40 },
  shapes: [
    { k: 'stroke', pts: BANG_PTS, pen: 'scribble', size: 9, color },
    dot(-2, 16, 3.4, color),
  ],
});

const EXCLAMATION_MARK = exclamationMarkDef(PALETTE.coral);

/** Realisation / alarm beat — a fat hand-drawn "!". */
export const ExclamationMark: React.FC<MarkProps & { color?: string }> = ({
  color,
  seed = 'exclamation-mark',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={color ? exclamationMarkDef(color) : EXCLAMATION_MARK} variant={seed} />
  </PropFrame>
);

// ---------------------------------------------------------------------------
// pointers and bursts
// ---------------------------------------------------------------------------

/**
 * Shaft plus two barbs, all freehand. The head is a nested group rotated to the shaft's
 * real approach angle, so a curved arrow points where it is actually going.
 */
const arrowDef = (length: number, curved: boolean): AssetDef => {
  const L = Math.max(24, length);
  const start: Pt = [0, curved ? 8 : 2];
  const ctrl: Pt = curved ? [L * 0.42, -L * 0.34] : [L * 0.5, -1];
  const tip: Pt = [L, curved ? -4 : -1];
  const aim = (Math.atan2(tip[1] - ctrl[1], tip[0] - ctrl[0]) * 180) / Math.PI;

  return {
    id: 'fx-arrow',
    size: { w: L, h: curved ? L * 0.5 : 24 },
    shapes: [
      { k: 'stroke', pts: quadPoints(start, ctrl, tip, 20), pen: 'accent', size: 4, color: PALETTE.ink },
      group(
        [
          {
            k: 'stroke',
            pts: quadPoints([-21, -12.5], [-8, -5.5], [2, 0.4], 12),
            pen: 'accent',
            size: 3.4,
            color: PALETTE.ink,
          },
          {
            k: 'stroke',
            pts: quadPoints([2, 0.4], [-8, 6], [-18.5, 11.5], 12),
            pen: 'accent',
            size: 3.4,
            color: PALETTE.ink,
          },
        ],
        { transform: `translate(${n2(tip[0])} ${n2(tip[1])}) rotate(${n2(aim)})`, id: 'head' },
      ),
    ],
  };
};

/** Pointer — an arrow running from the origin along +X. */
export const Arrow: React.FC<MarkProps & { length?: number; curved?: boolean }> = ({
  length = 90,
  curved = false,
  seed = 'arrow',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={arrowDef(length, curved)} variant={seed} />
  </PropFrame>
);

/** A four-point doodle sparkle is two crossed flicks — never an outlined star polygon. */
const SPARK_LONG: Pt[] = wobblyLine([0, -10], [0, 10], 'fx-sparkle-long', 0.5, 12);
const SPARK_SHORT: Pt[] = wobblyLine([-8.5, 0], [8.5, 0], 'fx-sparkle-short', 0.5, 12);

const sparkleShapes = (count: number, spread: number, color: string, seed: string): Shape[] => {
  const n = Math.max(1, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    const a = ((i + 0.5) / n) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.55;
    const rad = spread * (0.34 + r01(seed, `r${i}`) * 0.66);
    const s = 0.42 + r01(seed, `s${i}`) * 0.66;
    const rot = rSigned(seed, `t${i}`) * 34;
    return group(
      [
        { k: 'stroke', pts: SPARK_LONG, pen: 'scribble', size: 4.5, color },
        { k: 'stroke', pts: SPARK_SHORT, pen: 'scribble', size: 3.4, color },
      ],
      {
        transform:
          `translate(${n2(Math.cos(a) * rad * 1.06)} ${n2(Math.sin(a) * rad * 0.9)}) ` +
          `rotate(${n2(rot)}) scale(${s.toFixed(3)})`,
        id: `spark-${i}`,
      },
    );
  });
};

/** Cheap glitter — four-point stars scattered deterministically around a point. */
export const Sparkles: React.FC<
  MarkProps & { count?: number; spread?: number; color?: string }
> = ({ count = 5, spread = 70, color = PALETTE.gold, seed = 'sparkles', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={{ id: 'fx-sparkles', shapes: sparkleShapes(count, spread, color, seed) }}
      variant={seed}
    />
  </PropFrame>
);

/** Radiating emphasis spindles. Each is one outward flick — thick middle, sharp ends. */
const attentionShapes = (
  count: number,
  radius: number,
  length: number,
  color: string,
  seed: string,
): Shape[] => {
  const n = Math.max(2, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.12;
    const r0 = radius * (0.92 + r01(seed, `i${i}`) * 0.16);
    const r1 = r0 + length * (0.7 + r01(seed, `o${i}`) * 0.7);
    return {
      k: 'stroke',
      pts: wobblyLine(
        [Math.cos(a) * r0, Math.sin(a) * r0],
        [Math.cos(a) * r1, Math.sin(a) * r1],
        `${seed}:ray${i}`,
        1.6,
        12,
      ),
      pen: 'accent',
      size: i % 3 === 0 ? 5.2 : 3.8,
      color,
    };
  });
};

/** "This thing matters" — the classic burst of emphasis lines around a point. */
export const AttentionLines: React.FC<
  MarkProps & { count?: number; radius?: number; length?: number; color?: string }
> = ({
  count = 9,
  radius = 48,
  length = 24,
  color = PALETTE.ink,
  seed = 'attention-lines',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={{ id: 'fx-attention-lines', shapes: attentionShapes(count, radius, length, color, seed) }}
      variant={seed}
    />
  </PropFrame>
);

/** Speed streaks, authored along +X and rotated into place by the component. */
const motionShapes = (count: number, length: number, color: string, seed: string): Shape[] => {
  const n = Math.max(1, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    const y = (spread01(i, n) - 0.5) * 44 + rSigned(seed, `y${i}`) * 3.2;
    const x0 = 10 + r01(seed, `s${i}`) * 12;
    const x1 = x0 + length * (0.55 + r01(seed, `l${i}`) * 0.6);
    return {
      k: 'stroke',
      pts: wobblyLine([x0, y], [x1, y + rSigned(seed, `g${i}`) * 3], `${seed}:streak${i}`, 1.8, 14),
      pen: 'accent',
      size: i % 2 === 0 ? 3.8 : 2.9,
      color,
    };
  });
};

/** Speed streaks trailing behind something that just moved. */
export const MotionLines: React.FC<
  MarkProps & {
    count?: number;
    length?: number;
    direction?: 'left' | 'right' | 'up' | 'down';
    color?: string;
  }
> = ({
  count = 4,
  length = 70,
  direction = 'right',
  color = PALETTE.inkSoft,
  seed = 'motion-lines',
  ...rest
}) => {
  // streaks trail OPPOSITE the travel direction
  const spin =
    direction === 'right' ? 180 : direction === 'left' ? 0 : direction === 'up' ? 90 : -90;

  return (
    <PropFrame seed={seed} {...rest}>
      <RoughAsset
        def={{
          id: 'fx-motion-lines',
          shapes: [
            group(motionShapes(count, length, color, seed), { transform: `rotate(${spin})`, id: 'streaks' }),
          ],
        }}
        variant={seed}
      />
    </PropFrame>
  );
};

/**
 * A clean alternating-radius star. This is the one filled OBJECT in the file, so it is the
 * one thing here handed to Rough.js — and `accent` roughness is what makes the edges
 * jagged. Authoring the jaggedness by hand would be the V1 mistake.
 */
const starPoints = (spikes: number, rOuter: number, rInner: number): Pt[] => {
  const outer = ring(0, 0, rOuter, spikes);
  const inner = ring(0, 0, rInner, spikes, -90 + 180 / spikes);
  return outer.flatMap((p, i) => [p, inner[i]]);
};

const impactStarDef = (color: string): AssetDef => ({
  id: 'fx-impact-star',
  size: { w: 90, h: 90 },
  shapes: [{ k: 'polygon', pts: starPoints(11, 45, 20), fill: color, stroke: PALETTE.ink, rough: 'accent', sw: 4 }],
});

const IMPACT_STAR = impactStarDef(PALETTE.coral);

/** Comic impact — a jagged starburst ~90 units across for the moment something lands. */
export const ImpactStar: React.FC<MarkProps & { color?: string }> = ({
  color,
  seed = 'impact-star',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={color ? impactStarDef(color) : IMPACT_STAR} variant={seed} />
  </PropFrame>
);

/**
 * A sweat drop drawn bottom-to-top with the `hair` pen: heavy at the start, tapering to a
 * point at the end. That taper asymmetry is the whole teardrop — no outline required.
 */
const DROP_PTS: Pt[] = quadPoints([0, 6.5], [2.6, -1], [0.4, -9.5], 14);

const sweatShapes = (count: number, color: string, seed: string): Shape[] => {
  const n = Math.max(1, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    // fan them up and outward, the way sweat leaves a head
    const a = (-150 + spread01(i, n) * 120 + rSigned(seed, `a${i}`) * 12) * (Math.PI / 180);
    const rad = 26 + r01(seed, `r${i}`) * 30;
    const s = 0.62 + r01(seed, `s${i}`) * 0.5;
    const tilt = (a * 180) / Math.PI + 90 + rSigned(seed, `t${i}`) * 14;
    return group([{ k: 'stroke', pts: DROP_PTS, pen: 'hair', size: 8, color }], {
      transform:
        `translate(${n2(Math.cos(a) * rad)} ${n2(Math.sin(a) * rad)}) ` +
        `rotate(${n2(tilt)}) scale(${s.toFixed(3)})`,
      id: `drop-${i}`,
    });
  });
};

/** Panic beat — small teardrops flinging off a stressed head. */
export const SweatDrops: React.FC<MarkProps & { count?: number; color?: string }> = ({
  count = 3,
  color = PALETTE.teal,
  seed = 'sweat-drops',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={{ id: 'fx-sweat-drops', shapes: sweatShapes(count, color, seed) }} variant={seed} />
  </PropFrame>
);

/** An archimedean spiral — a single continuous gesture, so a single freehand stroke. */
const spiralPoints = (turns: number, radius = 34, steps = 96): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    return [Math.cos(a) * radius * t, Math.sin(a) * radius * t * 0.93] as Pt;
  });

const dizzySpiralDef = (turns: number, color: string): AssetDef => ({
  id: 'fx-dizzy-spiral',
  size: { w: 68, h: 64 },
  shapes: [{ k: 'stroke', pts: spiralPoints(turns), pen: 'scribble', size: 3.2, color }],
});

/** Over-stimulated beat — the spiral that says a brain has stopped reporting for duty. */
export const DizzySpiral: React.FC<MarkProps & { turns?: number; color?: string }> = ({
  turns = 2.6,
  color = PALETTE.violet,
  seed = 'dizzy-spiral',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={dizzySpiralDef(turns, color)} variant={seed} />
  </PropFrame>
);

/**
 * A scalloped ellipse: `bumps` points on an ellipse, joined by quadratics whose control
 * points are pushed radially outward. Clean parametric geometry — the lumpiness is a
 * formula, not a hand-picked wobble.
 */
const cloudPath = (rx: number, ry: number, bumps: number): string => {
  const pts: Pt[] = ring(0, 0, 1, bumps).map(([ux, uy]) => [ux * rx, uy * ry] as Pt);
  let d = `M ${n2(pts[0][0])} ${n2(pts[0][1])}`;
  for (let i = 0; i < bumps; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % bumps];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const push = 0.42 * Math.hypot(q[0] - p[0], q[1] - p[1]);
    d += ` Q ${n2(mx + (mx / len) * push)} ${n2(my + (my / len) * push)} ${n2(q[0])} ${n2(q[1])}`;
  }
  return `${d} Z`;
};

const thoughtCloudDef = (width: number, height: number): AssetDef => {
  const rx = width / 2;
  const ry = height / 2;
  return {
    id: 'fx-thought-cloud',
    size: { w: width * 1.2, h: height * 2 },
    shapes: [
      { k: 'path', d: cloudPath(rx, ry, 11), fill: PALETTE.paper, stroke: PALETTE.ink },
      // the two trailing bubbles that make it a THOUGHT rather than a speech balloon
      { k: 'ellipse', cx: -rx * 0.42, cy: ry * 1.3, rx: ry * 0.2, ry: ry * 0.17, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 3 },
      { k: 'ellipse', cx: -rx * 0.62, cy: ry * 1.75, rx: ry * 0.13, ry: ry * 0.11, fill: PALETTE.paper, stroke: PALETTE.ink, rough: 'detail', sw: 2.6 },
    ],
  };
};

const THOUGHT_CLOUD = thoughtCloudDef(220, 130);

/** A lumpy thought bubble, for the thing a character is privately telling itself. */
export const ThoughtCloud: React.FC<MarkProps & { width?: number; height?: number }> = ({
  width = 220,
  height = 130,
  seed = 'thought-cloud',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={width === 220 && height === 130 ? THOUGHT_CLOUD : thoughtCloudDef(width, height)}
      variant={seed}
    />
  </PropFrame>
);
