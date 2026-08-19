/**
 * time.tsx — clocks and watches. V2: clean geometry, stylized by the renderer.
 *
 * REFERENCE IMPLEMENTATION for the V2 asset pattern. Every other prop file follows it.
 *
 * Note what the geometry below is: a circle, twelve evenly spaced ticks, two lines, a pin.
 * That is what a clock IS. Nothing here tries to look hand-drawn — no lopsided beziers,
 * no jitter tables, no "sketchy" intent. All of that arrives in `RoughAsset`, identically
 * for every asset in the channel, which is precisely why V2 does not drift.
 *
 * Rotating parts (hands) are separate defs so the scene can spin them with an SVG
 * transform while the roughened geometry underneath stays cached and stable.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { PALETTE } from '../style/tokens';
import { TINY, spoke, type AssetDef, type Shape } from '../assets/shapes';

// ---------------------------------------------------------------------------
// clean geometry
// ---------------------------------------------------------------------------

const R = 34;

/** Twelve ticks; the quarters are longer, exactly as on a real dial. */
const ticks = (r: number, sw = 2.4): Shape[] =>
  Array.from({ length: 12 }, (_, i) => ({
    ...spoke(0, 0, i % 3 === 0 ? r * 0.74 : r * 0.82, r * 0.93, i * 30),
    rough: 'detail' as const,
    sw: i % 3 === 0 ? sw * 1.4 : sw,
    single: true,
  }));

const clockFace = (id: string, r: number, face: string, sw: number): AssetDef => ({
  id,
  size: { w: r * 2, h: r * 2 },
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r, fill: face, stroke: PALETTE.ink, sw },
    ...ticks(r, r / 14),
    { k: 'circle', cx: 0, cy: 0, r: r * 0.09, fill: PALETTE.ink, rough: 'detail', single: true },
  ],
});

const hand = (id: string, len: number, width: number, color = PALETTE.ink): AssetDef => ({
  id,
  shapes: [{ k: 'line', x1: 0, y1: 0, x2: 0, y2: -len, rough: 'detail', sw: width, stroke: color, single: true }],
});

const WALL_FACE = clockFace('prop-clock-analog', R, PALETTE.paper, 4.2);
const WALL_HOUR = hand('prop-clock-hand-hour', R * 0.52, 4.6);
const WALL_MIN = hand('prop-clock-hand-minute', R * 0.8, 3.4);

const HUGE_R = 73;
const HUGE_FACE = clockFace('prop-clock-huge', HUGE_R, PALETTE.paper, 6.4);
const HUGE_HOUR = hand('prop-clock-huge-hand-hour', HUGE_R * 0.52, 8);
const HUGE_MIN = hand('prop-clock-huge-hand-minute', HUGE_R * 0.8, 6);

/** The hanging lug that makes a disc read as a WALL clock rather than a plate. */
const LUG: Shape = {
  k: 'arc',
  cx: 0,
  cy: -R - 3,
  rx: 5,
  ry: 5,
  start: 180,
  stop: 360,
  rough: 'detail',
  sw: 2.6,
  single: true,
};

// ---------------------------------------------------------------------------
// components
// ---------------------------------------------------------------------------

export type ClockArgs = PropArgs & {
  /** Degrees, 0 = 12 o'clock. */
  hourAngle?: number;
  minuteAngle?: number;
  faceColor?: string;
  showHands?: boolean;
};

/** Analog wall clock, ~68 units across. The episode's title object. */
export const WallClock: React.FC<ClockArgs> = ({
  hourAngle = 0,
  minuteAngle = 0,
  faceColor,
  showHands = true,
  seed = 'wall-clock',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset
      def={faceColor ? { ...WALL_FACE, shapes: recolorFace(WALL_FACE.shapes, faceColor) } : WALL_FACE}
      variant={seed}
    />
    <RoughAsset def={{ id: 'prop-clock-lug', shapes: [LUG] }} variant={seed} />
    {showHands && (
      <>
        <g transform={`rotate(${hourAngle})`}>
          <RoughAsset def={WALL_HOUR} variant={seed} />
        </g>
        <g transform={`rotate(${minuteAngle})`}>
          <RoughAsset def={WALL_MIN} variant={seed} />
        </g>
      </>
    )}
  </PropFrame>
);

/** Just the hands — for flinging them off a face, or animating them alone. */
export const ClockHands: React.FC<ClockArgs & { length?: number }> = ({
  hourAngle = 0,
  minuteAngle = 0,
  length = 25,
  seed = 'clock-hands',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <g transform={`rotate(${hourAngle})`}>
      <RoughAsset def={hand('prop-clock-hand-hour', length * 0.65, 4.6)} variant={seed} />
    </g>
    <g transform={`rotate(${minuteAngle})`}>
      <RoughAsset def={hand('prop-clock-hand-minute', length, 3.4)} variant={seed} />
    </g>
    <RoughAsset
      def={{ id: 'prop-clock-pin', shapes: [{ k: 'circle', cx: 0, cy: 0, r: 3, fill: PALETTE.ink, rough: 'detail', ...TINY }] }}
      variant={seed}
    />
  </PropFrame>
);

const WATCH: AssetDef = {
  id: 'prop-wristwatch',
  size: { w: 34, h: 40 },
  shapes: [
    // strap above and below, drawn first so the case sits on top
    { k: 'rect', x: -7, y: -22, w: 14, h: 10, fill: PALETTE.greyDeep, rough: 'detail', sw: 2.2 },
    { k: 'rect', x: -7, y: 12, w: 14, h: 10, fill: PALETTE.greyDeep, rough: 'detail', sw: 2.2 },
    { k: 'circle', cx: 0, cy: 0, r: 12.5, fill: PALETTE.paper, rough: 'detail', sw: 3 },
    { k: 'line', x1: 0, y1: 0, x2: 0, y2: -7, rough: 'detail', sw: 2.2, single: true },
    { k: 'line', x1: 0, y1: 0, x2: 5, y2: 3, rough: 'detail', sw: 2.2, single: true },
    { k: 'line', x1: 12, y1: -2, x2: 15, y2: -2, rough: 'detail', sw: 2.4, single: true },
  ],
};

/** Small wristwatch, ~34 units wide. Used to prove clocks are not banned. */
export const Wristwatch: React.FC<ClockArgs> = ({ seed = 'wristwatch', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={WATCH} variant={seed} />
  </PropFrame>
);

/** The absurdly large clock carried in the myth-correction beat, ~150 units across. */
export const HugeWallClock: React.FC<ClockArgs> = ({
  hourAngle = 0,
  minuteAngle = 0,
  showHands = true,
  seed = 'huge-clock',
  ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={HUGE_FACE} variant={seed} />
    <RoughAsset
      def={{
        id: 'prop-clock-huge-bezel',
        shapes: [{ k: 'circle', cx: 0, cy: 0, r: HUGE_R * 0.86, stroke: PALETTE.greyDeep, sw: 2.4, rough: 'detail', single: true }],
      }}
      variant={seed}
    />
    {showHands && (
      <>
        <g transform={`rotate(${hourAngle})`}>
          <RoughAsset def={HUGE_HOUR} variant={seed} />
        </g>
        <g transform={`rotate(${minuteAngle})`}>
          <RoughAsset def={HUGE_MIN} variant={seed} />
        </g>
      </>
    )}
  </PropFrame>
);

/** Swap the dial colour without rebuilding the whole definition. */
function recolorFace(shapes: Shape[], color: string): Shape[] {
  return shapes.map((s, i) => (i === 0 ? { ...s, fill: color } : s));
}
