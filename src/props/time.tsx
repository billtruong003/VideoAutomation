/**
 * time.tsx — clocks. The props that carry "how long have you actually been in here?".
 *
 * Everything here is drawn around its own local origin (0,0) at the centre of the dial,
 * in character units (Nib's head is ~88 across), so a clock dropped next to Nib is
 * automatically in scale. Hand angles are always component props — a scene owns the
 * animation, the prop owns the drawing.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { DoodleProp, type DoodlePropProps } from '../components/DoodleProp';

/** Every prop takes the standard placement contract; children come from the art itself. */
type PropArt = Omit<DoodlePropProps, 'children'>;

// ---------------------------------------------------------------------------
// geometry helpers — deterministic, deliberately lopsided
// ---------------------------------------------------------------------------

/**
 * Anchors for the dial rim: [angle°, radius multiplier]. Neither the angles nor the
 * radii are regular, which is what stops the "circle" from ever closing as a circle.
 */
const RIM_ANCHORS: readonly (readonly [number, number])[] = [
  [-94, 1.0],
  [-31, 0.975],
  [27, 1.025],
  [91, 0.985],
  [151, 1.015],
  [-147, 0.965],
];

/** Catmull-Rom through the anchors, emitted as a closed cubic path: a bezier potato. */
function blobPath(r: number, anchors: readonly (readonly [number, number])[]): string {
  const n = anchors.length;
  const pts: [number, number][] = anchors.map(([deg, f]) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r * f, Math.sin(a) * r * f];
  });
  const f2 = (v: number) => v.toFixed(2);
  let d = `M ${f2(pts[0][0])} ${f2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const pm = pts[(i - 1 + n) % n];
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    const p2 = pts[(i + 2) % n];
    const c1x = p0[0] + (p1[0] - pm[0]) / 6;
    const c1y = p0[1] + (p1[1] - pm[1]) / 6;
    const c2x = p1[0] - (p2[0] - p0[0]) / 6;
    const c2y = p1[1] - (p2[1] - p0[1]) / 6;
    d += ` C ${f2(c1x)} ${f2(c1y)} ${f2(c2x)} ${f2(c2y)} ${f2(p1[0])} ${f2(p1[1])}`;
  }
  return `${d} Z`;
}

/** Per-tick nudge, in degrees-ish. Hand-drawn dials never get the twelve marks even. */
const TICK_JITTER = [0.9, -1.4, 1.8, -0.7, 1.2, -1.9, 0.5, 1.6, -1.1, 0.8, -1.6, 1.3];

/** All twelve marks as ONE path with twelve subpaths — cheap, and still irregular. */
function ticksPath(r: number, len: number): string {
  const f2 = (v: number) => v.toFixed(2);
  return TICK_JITTER.map((j, i) => {
    const a = ((i * 30 + j * 1.8) * Math.PI) / 180 - Math.PI / 2;
    const inner = r - len - Math.abs(j) * 0.9;
    const outer = r - len * 0.42 + j * 0.35;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return `M ${f2(c * inner)} ${f2(s * inner)} L ${f2(c * outer)} ${f2(s * outer)}`;
  }).join(' ');
}

/** A hand that bows very slightly, so it never reads as a ruler line. */
function handPath(len: number, bow: number): string {
  return `M ${(-bow * 0.3).toFixed(2)} 3.2 Q ${bow.toFixed(2)} ${(-len * 0.45).toFixed(2)} ${(bow * 0.35).toFixed(2)} ${(-len).toFixed(2)}`;
}

/** Shared hand pair + centre pin, used by every clock in the file. */
function HandPair({
  hourAngle,
  minuteAngle,
  length,
  weight,
  pin,
}: {
  hourAngle: number;
  minuteAngle: number;
  length: number;
  weight: number;
  pin: number;
}) {
  return (
    <>
      <g transform={`rotate(${hourAngle})`}>
        <path
          d={handPath(length * 0.6, 2.1)}
          stroke={PALETTE.ink}
          strokeWidth={weight}
          {...HAND_STROKE}
        />
      </g>
      <g transform={`rotate(${minuteAngle})`}>
        <path
          d={handPath(length, -1.7)}
          stroke={PALETTE.ink}
          strokeWidth={weight * 0.72}
          {...HAND_STROKE}
        />
      </g>
      <circle cx={0.5} cy={-0.4} r={pin} fill={PALETTE.ink} />
    </>
  );
}

// ---------------------------------------------------------------------------
// clocks
// ---------------------------------------------------------------------------

const CLOCK_R = 34;
const CLOCK_RIM = blobPath(CLOCK_R, RIM_ANCHORS);

/** The standard analog wall clock — the episode's "how long has it been" instrument. */
export const WallClock: React.FC<
  PropArt & {
    hourAngle?: number;
    minuteAngle?: number;
    faceColor?: string;
    showHands?: boolean;
  }
> = ({
  hourAngle = 0,
  minuteAngle = 0,
  faceColor = PALETTE.paper,
  showHands = true,
  seed = 'wall-clock',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    {/* face fill, nudged off its own outline the way a felt-tip overshoots */}
    <path d={CLOCK_RIM} fill={faceColor} transform="translate(2.4 2)" />
    <path d={CLOCK_RIM} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} strokeLinejoin="round" />
    <path d={ticksPath(CLOCK_R, 6.5)} stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    {/* the little wall hook, off-centre on purpose */}
    <path d="M -3.5 -37.5 C 0.5 -42.5 3 -41.5 4.5 -38" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    {showHands && (
      <HandPair hourAngle={hourAngle} minuteAngle={minuteAngle} length={25} weight={STROKE.prop} pin={3.2} />
    )}
  </DoodleProp>
);

/** Bare hands with no dial — so a scene can spin, detach or fling them on their own. */
export const ClockHands: React.FC<
  PropArt & { hourAngle?: number; minuteAngle?: number; length?: number }
> = ({ hourAngle = 0, minuteAngle = 0, length = 25, seed = 'clock-hands', ...rest }) => (
  <DoodleProp seed={seed} {...rest}>
    <HandPair hourAngle={hourAngle} minuteAngle={minuteAngle} length={length} weight={STROKE.prop} pin={3.2} />
  </DoodleProp>
);

const WATCH_R = 12.5;
const WATCH_CASE = blobPath(WATCH_R, RIM_ANCHORS);

/** A wristwatch — the small, personal, ignorable version of the same information. */
export const Wristwatch: React.FC<
  PropArt & { hourAngle?: number; minuteAngle?: number; faceColor?: string }
> = ({
  hourAngle = 0,
  minuteAngle = 0,
  faceColor = PALETTE.paper,
  seed = 'wristwatch',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    {/* strap, drawn behind the case; upper and lower halves are not the same shape */}
    <path
      d="M -7.5 -11 C -9 -17.5 -8 -22.5 -7 -26.5 C -1.5 -28 3.5 -27.5 8 -26 C 8.5 -21 8 -16 7 -10.5 Z"
      fill={PALETTE.greyDeep}
      transform="translate(1.8 1.5)"
    />
    <path
      d="M -7.5 -11 C -9 -17.5 -8 -22.5 -7 -26.5 C -1.5 -28 3.5 -27.5 8 -26 C 8.5 -21 8 -16 7 -10.5"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      {...HAND_STROKE}
    />
    <path
      d="M -7 11 C -8.5 17 -7.5 22 -6.5 26.5 C -1 28 4 27.5 8.5 26 C 8.5 21 8 16 7.5 10.5"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      {...HAND_STROKE}
    />
    {/* crown nub */}
    <path d="M 13 -1.5 L 16.5 -2.5" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} {...HAND_STROKE} />
    <path d={WATCH_CASE} fill={faceColor} transform="translate(1.6 1.4)" />
    <path d={WATCH_CASE} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.propFine} strokeLinejoin="round" />
    <HandPair hourAngle={hourAngle} minuteAngle={minuteAngle} length={8.5} weight={STROKE.fine} pin={1.4} />
  </DoodleProp>
);

const HUGE_R = 73;
const HUGE_RIM = blobPath(HUGE_R, RIM_ANCHORS);

/** The absurdly oversized clock, for the gag where the thing has to be physically carried. */
export const HugeWallClock: React.FC<
  PropArt & {
    hourAngle?: number;
    minuteAngle?: number;
    faceColor?: string;
    showHands?: boolean;
  }
> = ({
  hourAngle = 0,
  minuteAngle = 0,
  faceColor = PALETTE.paper,
  showHands = true,
  seed = 'huge-wall-clock',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <path d={HUGE_RIM} fill={faceColor} transform="translate(3 2.6)" />
    <path d={HUGE_RIM} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.limb} strokeLinejoin="round" />
    {/* an inner bezel line, drifting away from the rim as it goes round */}
    <path d={blobPath(HUGE_R - 8.5, RIM_ANCHORS)} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.fine} strokeLinejoin="round" opacity={0.55} />
    <path d={ticksPath(HUGE_R - 6, 12)} stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
    <path d="M -7 -79 C 0 -88 6 -87 9 -80" stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
    {showHands && (
      <HandPair hourAngle={hourAngle} minuteAngle={minuteAngle} length={52} weight={STROKE.limb} pin={5.6} />
    )}
  </DoodleProp>
);
