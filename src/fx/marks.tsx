/**
 * marks.tsx — the cartoon emphasis vocabulary.
 *
 * These are the little scribbles a comic artist adds AROUND a drawing to say how it
 * feels: a "?" over a confused head, sweat off a panicking one, speed streaks behind
 * something bolting for the door. They carry a huge amount of the comedy for almost no
 * drawing, which is exactly the channel's trade.
 *
 * Every mark is drawn around its own local origin (0,0) in character units — Nib's head
 * is ~88 units across — so a mark dropped next to the character is automatically in
 * scale. Placement, rotation and fade come from the shared `DoodleProp` contract.
 *
 * Nothing here reads the clock: anything a scene must animate (how many sparkles, which
 * way the streaks point) is a prop, never internal state.
 */

import React from 'react';
import { DoodleProp, type DoodlePropProps } from '../components/DoodleProp';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { hashString, rand01, valueNoise } from '../lib/rand';

/**
 * The standard prop contract minus `children` — a mark draws itself, so a caller has
 * nothing to put inside it.
 */
export type MarkProps = Omit<DoodlePropProps, 'children'>;

/** Deterministic [0,1) from a seed plus a key. Never Math.random — renders must repeat. */
const r01 = (seed: string, key: string): number => rand01(hashString(`${seed}:${key}`));

/** Deterministic [-1,1]. */
const rSigned = (seed: string, key: string): number => r01(seed, key) * 2 - 1;

// ---------------------------------------------------------------------------
// static glyph geometry — hand-cut, deliberately lopsided
// ---------------------------------------------------------------------------

/** Fat "?" hook + stem as one closed silhouette. Thicker on the left than the right. */
const QUESTION_HOOK_D =
  'M -14 -7.2 C -14.6 -19.6 -1.2 -24.4 7.8 -20.2 C 16.8 -16 17.2 -6.2 9 -0.6 ' +
  'C 3.4 3.4 1.4 5.2 1.9 11 L -6.4 11.5 C -7.7 2.2 -5 -0.7 1.4 -5.1 ' +
  'C 6.1 -8.2 6.5 -13.4 1.5 -15.4 C -3.6 -17.4 -6.7 -14.5 -6.9 -7 Z';

/** The dot. A blob, not a circle. */
const QUESTION_DOT_D =
  'M -6.8 17.2 C -6.3 14 -3 12.8 -0.4 14.2 C 2.1 15.6 2.2 19.3 -0.3 20.4 ' +
  'C -3 21.6 -7.2 20.4 -6.8 17.2 Z';

/** Fat "!" bar — wider at the top, and not quite vertical. */
const BANG_BAR_D =
  'M -6 -20.6 C -1.6 -21.8 3.6 -21.2 5.2 -19.6 C 4.4 -9.6 3.4 0.4 2.4 8.8 ' +
  'C 0.8 10.1 -2.8 10.2 -4.2 8.9 C -4.9 0.6 -5.5 -9.8 -6 -20.6 Z';

const BANG_DOT_D =
  'M -5.4 17.4 C -5 14.2 -1.7 13 0.9 14.4 C 3.5 15.8 3.5 19.5 1 20.6 ' +
  'C -1.7 21.8 -5.8 20.6 -5.4 17.4 Z';

/** A four-point doodle sparkle, ~20 units across, waisted unevenly. */
const SPARKLE_D =
  'M 0 -10 C 1.5 -3.2 3.4 -1.5 10 0 C 3.2 1.7 1.2 3.6 -0.5 10 ' +
  'C -1.9 3.4 -3.7 1.4 -10 -0.4 C -3.4 -1.9 -1.4 -3.7 0 -10 Z';

/** A teardrop, point up, ~18 units tall. */
const DROP_D =
  'M 0 -11 C 3.7 -4.2 6.4 -0.6 5.6 3 C 4.8 6.7 -0.9 7.5 -3.7 4.8 ' +
  'C -6.3 2.3 -4 -3 0 -11 Z';

// ---------------------------------------------------------------------------
// marks
// ---------------------------------------------------------------------------

/** Confusion beat — a fat hand-drawn "?" to float over a baffled head. */
export const QuestionMark: React.FC<MarkProps & { color?: string }> = ({
  color = PALETTE.coral,
  seed = 'question-mark',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <g transform="translate(2.6 2.2)">
      <path d={QUESTION_HOOK_D} fill={color} />
      <path d={QUESTION_DOT_D} fill={color} />
    </g>
    <path
      d={QUESTION_HOOK_D}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.prop}
      strokeLinejoin="round"
    />
    <path
      d={QUESTION_DOT_D}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
  </DoodleProp>
);

/** Realisation / alarm beat — a fat hand-drawn "!". */
export const ExclamationMark: React.FC<MarkProps & { color?: string }> = ({
  color = PALETTE.coral,
  seed = 'exclamation-mark',
  ...rest
}) => (
  <DoodleProp seed={seed} {...rest}>
    <g transform="translate(2.6 2.2)">
      <path d={BANG_BAR_D} fill={color} />
      <path d={BANG_DOT_D} fill={color} />
    </g>
    <path
      d={BANG_BAR_D}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.prop}
      strokeLinejoin="round"
    />
    <path
      d={BANG_DOT_D}
      fill="none"
      stroke={PALETTE.ink}
      strokeWidth={STROKE.propFine}
      strokeLinejoin="round"
    />
  </DoodleProp>
);

/** Pointer — a hand-drawn arrow running from the origin along +X, head slightly wonky. */
export const Arrow: React.FC<MarkProps & { length?: number; curved?: boolean }> = ({
  length = 90,
  curved = false,
  seed = 'arrow',
  ...rest
}) => {
  const L = Math.max(24, length);

  // last control point -> tip, so the head can be aimed along the real approach angle
  const ctrlX = curved ? L * 0.74 : L * 0.66;
  const ctrlY = curved ? -L * 0.34 : 3.2;
  const tipY = curved ? -3 : -1.2;

  const shaft = curved
    ? `M 0 8 C ${(L * 0.26).toFixed(1)} ${(-L * 0.24).toFixed(1)} ` +
      `${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${L} ${tipY}`
    : `M 0 2 C ${(L * 0.32).toFixed(1)} -2.6 ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${L} ${tipY}`;

  const aim = (Math.atan2(tipY - ctrlY, L - ctrlX) * 180) / Math.PI;

  return (
    <DoodleProp seed={seed} {...rest}>
      <path d={shaft} stroke={PALETTE.ink} strokeWidth={STROKE.prop} {...HAND_STROKE} />
      {/* head: two barbs of unequal length, so it never reads as a vector arrowhead */}
      <g transform={`translate(${L} ${tipY}) rotate(${aim.toFixed(2)})`}>
        <path
          d="M -21 -12.5 L 2.5 0.4 L -18.5 11.5"
          stroke={PALETTE.ink}
          strokeWidth={STROKE.prop}
          {...HAND_STROKE}
        />
      </g>
    </DoodleProp>
  );
};

/** Cheap glitter — four-point doodle stars scattered deterministically around a point. */
export const Sparkles: React.FC<
  MarkProps & { count?: number; spread?: number; color?: string }
> = ({ count = 5, spread = 70, color = PALETTE.gold, seed = 'sparkles', ...rest }) => {
  const n = Math.max(1, Math.round(count));
  const stars = Array.from({ length: n }, (_, i) => {
    const a = ((i + 0.5) / n) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.55;
    const rad = spread * (0.34 + r01(seed, `r${i}`) * 0.66);
    const s = 0.42 + r01(seed, `s${i}`) * 0.66;
    const rot = rSigned(seed, `t${i}`) * 34;
    return {
      key: i,
      x: Math.cos(a) * rad * 1.06,
      y: Math.sin(a) * rad * 0.9,
      s,
      rot,
    };
  });

  return (
    <DoodleProp seed={seed} {...rest}>
      {stars.map((st) => (
        <g
          key={st.key}
          transform={`translate(${st.x.toFixed(1)} ${st.y.toFixed(1)}) rotate(${st.rot.toFixed(
            1,
          )}) scale(${st.s.toFixed(2)})`}
        >
          <path d={SPARKLE_D} fill={color} transform="translate(2.2 1.8)" />
          <path
            d={SPARKLE_D}
            fill="none"
            stroke={PALETTE.ink}
            strokeWidth={STROKE.detail}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </DoodleProp>
  );
};

/** "This thing matters" — the classic burst of radiating emphasis lines around a point. */
export const AttentionLines: React.FC<
  MarkProps & { count?: number; radius?: number; length?: number; color?: string }
> = ({
  count = 9,
  radius = 48,
  length = 24,
  color = PALETTE.ink,
  seed = 'attention-lines',
  ...rest
}) => {
  const n = Math.max(2, Math.round(count));
  const rays = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.14;
    const r0 = radius * (0.92 + r01(seed, `i${i}`) * 0.16);
    const r1 = r0 + length * (0.6 + r01(seed, `o${i}`) * 0.8);
    // a hair of bow in the middle so no ray is a perfectly straight line
    const bow = rSigned(seed, `b${i}`) * 2.6;
    const mx = Math.cos(a) * ((r0 + r1) / 2) - Math.sin(a) * bow;
    const my = Math.sin(a) * ((r0 + r1) / 2) + Math.cos(a) * bow;
    return {
      key: i,
      d:
        `M ${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} ` +
        `Q ${mx.toFixed(1)} ${my.toFixed(1)} ` +
        `${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}`,
      w: i % 3 === 0 ? STROKE.prop : STROKE.propFine,
    };
  });

  return (
    <DoodleProp seed={seed} {...rest}>
      {rays.map((ray) => (
        <path key={ray.key} d={ray.d} stroke={color} strokeWidth={ray.w} {...HAND_STROKE} />
      ))}
    </DoodleProp>
  );
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
  // streaks trail OPPOSITE the travel direction; drawn along +X, then rotated into place
  const spin =
    direction === 'right' ? 180 : direction === 'left' ? 0 : direction === 'up' ? 90 : -90;

  const n = Math.max(1, Math.round(count));
  const streaks = Array.from({ length: n }, (_, i) => {
    const spanY = 44;
    const y = (i / Math.max(1, n - 1) - 0.5) * spanY + rSigned(seed, `y${i}`) * 3.2;
    const start = 10 + r01(seed, `s${i}`) * 12;
    const end = start + length * (0.55 + r01(seed, `l${i}`) * 0.6);
    const sag = rSigned(seed, `g${i}`) * 3.4;
    return {
      key: i,
      d:
        `M ${start.toFixed(1)} ${y.toFixed(1)} ` +
        `Q ${((start + end) / 2).toFixed(1)} ${(y + sag).toFixed(1)} ` +
        `${end.toFixed(1)} ${(y + sag * 0.4).toFixed(1)}`,
      w: i % 2 === 0 ? STROKE.propFine : STROKE.fine,
    };
  });

  return (
    <DoodleProp seed={seed} {...rest}>
      <g transform={`rotate(${spin})`}>
        {streaks.map((s) => (
          <path key={s.key} d={s.d} stroke={color} strokeWidth={s.w} {...HAND_STROKE} />
        ))}
      </g>
    </DoodleProp>
  );
};

/** Comic impact — a jagged starburst ~90 units across for the moment something lands. */
export const ImpactStar: React.FC<MarkProps & { color?: string }> = ({
  color = PALETTE.coral,
  seed = 'impact-star',
  ...rest
}) => {
  const spikes = 11;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.1;
    const base = i % 2 === 0 ? 45 : 20;
    const rr = base * (0.82 + r01(seed, `r${i}`) * 0.32);
    pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr * 0.94).toFixed(1)}`);
  }
  const d = `M ${pts.join(' L ')} Z`;

  return (
    <DoodleProp seed={seed} {...rest}>
      <path d={d} fill={color} transform="translate(2.8 2.2)" />
      <path
        d={d}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth={STROKE.prop}
        strokeLinejoin="round"
      />
    </DoodleProp>
  );
};

/** Panic beat — small teardrops flinging off a stressed head. */
export const SweatDrops: React.FC<MarkProps & { count?: number; color?: string }> = ({
  count = 3,
  color = PALETTE.teal,
  seed = 'sweat-drops',
  ...rest
}) => {
  const n = Math.max(1, Math.round(count));
  const drops = Array.from({ length: n }, (_, i) => {
    // fan them up and outward, the way sweat leaves a head
    const a = (-150 + (i / Math.max(1, n - 1)) * 120 + rSigned(seed, `a${i}`) * 12) * (Math.PI / 180);
    const rad = 26 + r01(seed, `r${i}`) * 30;
    const s = 0.62 + r01(seed, `s${i}`) * 0.5;
    const tilt = (a * 180) / Math.PI + 90 + rSigned(seed, `t${i}`) * 14;
    return {
      key: i,
      x: Math.cos(a) * rad,
      y: Math.sin(a) * rad,
      s,
      tilt,
    };
  });

  return (
    <DoodleProp seed={seed} {...rest}>
      {drops.map((dp) => (
        <g
          key={dp.key}
          transform={`translate(${dp.x.toFixed(1)} ${dp.y.toFixed(1)}) rotate(${dp.tilt.toFixed(
            1,
          )}) scale(${dp.s.toFixed(2)})`}
        >
          <path d={DROP_D} fill={color} transform="translate(2 1.8)" opacity={0.9} />
          <path
            d={DROP_D}
            fill="none"
            stroke={PALETTE.ink}
            strokeWidth={STROKE.detail}
            strokeLinejoin="round"
          />
        </g>
      ))}
    </DoodleProp>
  );
};

/** Over-stimulated beat — the spiral that says a brain has stopped reporting for duty. */
export const DizzySpiral: React.FC<MarkProps & { turns?: number; color?: string }> = ({
  turns = 2.6,
  color = PALETTE.violet,
  seed = 'dizzy-spiral',
  ...rest
}) => {
  const steps = 72;
  const key = hashString(seed);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    // wobble the radius so the coil is hand-wound, never a machined spiral
    const rr = t * 34 * (1 + valueNoise(t * 5, key) * 0.07);
    pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr * 0.93).toFixed(1)}`);
  }

  return (
    <DoodleProp seed={seed} {...rest}>
      <path
        d={`M ${pts.join(' L ')}`}
        stroke={color}
        strokeWidth={STROKE.detail}
        {...HAND_STROKE}
      />
    </DoodleProp>
  );
};

/** A lumpy thought bubble outline, for the thing a character is privately telling itself. */
export const ThoughtCloud: React.FC<MarkProps & { width?: number; height?: number }> = ({
  width = 220,
  height = 130,
  seed = 'thought-cloud',
  ...rest
}) => {
  const bumps = 11;
  const rx = width / 2;
  const ry = height / 2;

  const pts: Array<[number, number]> = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + rSigned(seed, `a${i}`) * 0.2;
    const k = 0.88 + r01(seed, `k${i}`) * 0.2;
    pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]);
  }

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < bumps; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % bumps];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const push = 0.36 * Math.hypot(q[0] - p[0], q[1] - p[1]);
    d +=
      ` Q ${(mx + (mx / len) * push).toFixed(1)} ${(my + (my / len) * push).toFixed(1)}` +
      ` ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  }
  d += ' Z';

  // the two trailing bubbles that make it a THOUGHT rather than a speech balloon
  const tail = [
    { cx: -rx * 0.42, cy: ry * 1.28, r: ry * 0.19 },
    { cx: -rx * 0.62, cy: ry * 1.72, r: ry * 0.115 },
  ];
  const tailPath = (cx: number, cy: number, r: number) =>
    `M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} ` +
    `C ${(cx - r).toFixed(1)} ${(cy - r * 1.35).toFixed(1)} ${(cx + r * 1.1).toFixed(1)} ${(
      cy - r * 1.25
    ).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - r * 0.1).toFixed(1)} ` +
    `C ${(cx + r * 1.05).toFixed(1)} ${(cy + r * 1.2).toFixed(1)} ${(cx - r * 0.95).toFixed(1)} ${(
      cy + r * 1.3
    ).toFixed(1)} ${(cx - r).toFixed(1)} ${cy.toFixed(1)} Z`;

  return (
    <DoodleProp seed={seed} {...rest}>
      <g transform="translate(2.6 2.4)">
        <path d={d} fill={PALETTE.paper} />
        {tail.map((t, i) => (
          <path key={i} d={tailPath(t.cx, t.cy, t.r)} fill={PALETTE.paper} />
        ))}
      </g>
      <path
        d={d}
        fill="none"
        stroke={PALETTE.ink}
        strokeWidth={STROKE.prop}
        strokeLinejoin="round"
      />
      {tail.map((t, i) => (
        <path
          key={i}
          d={tailPath(t.cx, t.cy, t.r)}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth={STROKE.propFine}
          strokeLinejoin="round"
        />
      ))}
    </DoodleProp>
  );
};
