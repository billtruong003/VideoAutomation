/**
 * eyes.tsx — the channel's eye vocabulary.
 *
 * One grammar, five characters. The calm states are a small FILLED ink mark; the alarmed
 * states switch to a paper disc with a pupil in it. That switch is the channel's whole
 * shock language — the eye does not grow, it changes from a mark into a hole — and it is
 * why a tiny 3-unit default eye can still carry a big reaction.
 *
 * Small filled marks bypass most of the roughening on purpose. Rough.js roughness is
 * absolute, not proportional: on a 3-unit disc the wander is bigger than the disc, and the
 * "eye" comes out as a smudge. Under about 6 units roughness stops reading as character
 * and starts reading as dirt.
 */

import React from 'react';
import { RoughAsset } from '../../assets/RoughAsset';
import { TINY, type AssetDef } from '../../assets/shapes';
import { arcPoints, quadPoints, spiralPoints, type Point } from '../../lib/pathpoints';
import { PALETTE } from '../../style/tokens';
import { Ink, hand } from '../ink';
import type { EyeState } from '../types';
import type { FaceMetrics } from './metrics';

const inkOval = (rx: number, ry: number, color: string): AssetDef => ({
  id: `eye-mark-${rx}-${ry}-${color}`,
  shapes: [{ k: 'ellipse', cx: 0, cy: 0, rx, ry, fill: color, stroke: color, rough: 'detail', sw: 1.4, ...TINY }],
});

const paperDisc = (r: number, color: string): AssetDef => ({
  id: `eye-white-${r}`,
  shapes: [{ k: 'circle', cx: 0, cy: 0, r, fill: PALETTE.paper, stroke: color, rough: 'detail', sw: 2.6, roughness: 0.8, single: true }],
});

const pupilDisc = (r: number, color: string): AssetDef => ({
  id: `eye-pupil-${r}`,
  shapes: [{ k: 'circle', cx: 0, cy: 0, r, fill: color, stroke: color, rough: 'detail', sw: 1.2, ...TINY }],
});

export type EyeProps = {
  state: EyeState;
  m: FaceMetrics;
  /** -1..1 per axis. */
  look: [number, number];
  color: string;
  seed: string;
  side: 'L' | 'R';
  /** 0 = open, 1 = fully shut. Blink rides on top of whatever the expression is. */
  blink?: number;
};

export const Eye: React.FC<EyeProps> = ({ state, m, look, color, seed, side, blink = 0 }) => {
  const mirror = side === 'R' ? -1 : 1;

  /*
   * A blink is a lid coming down over whatever the eye currently is, not a different eye
   * state. Past halfway it simply becomes the closed arc — which is what a real blink
   * looks like at 30fps and costs one branch instead of a lid-animation system.
   */
  if (blink > 0.45 && state !== 'closed' && state !== 'happyArc') {
    return <ClosedArc m={m} color={color} seed={`${seed}:blink`} />;
  }

  switch (state) {
    case 'closed':
      return <ClosedArc m={m} color={color} seed={seed} />;

    case 'happyArc':
      return (
        <Ink
          pts={quadPoints([-m.browHalfW * 0.86, 3], [0, -m.eyeRy * 2.6], [m.browHalfW * 0.86, 3], 12)}
          pen="face"
          size={4.2}
          color={color}
          seed={`${seed}:arc`}
        />
      );

    case 'squint':
      return (
        <Ink
          pts={quadPoints([-m.browHalfW * 0.8, -1.5], [0, 2.6], [m.browHalfW * 0.8, -1.5], 10)}
          pen="face"
          size={4.4}
          color={color}
          seed={`${seed}:squint`}
        />
      );

    case 'dots':
      return <RoughAsset def={hand(inkOval(m.eyeRx * 0.78, m.eyeRx * 0.78, color))} variant={seed} />;

    case 'dizzy': {
      const pts = spiralPoints(0, 0, m.wideR * 0.95, m.wideR * 0.95, 2.3, 40, mirror as 1 | -1);
      return <Ink pts={pts} pen="face" size={3.0} color={color} seed={`${seed}:spiral`} />;
    }

    case 'cross': {
      const r = m.eyeRy * 1.5;
      return (
        <>
          <Ink pts={[[-r, -r], [r, r]] as Point[]} pen="face" size={3.4} color={color} seed={`${seed}:x1`} />
          <Ink pts={[[r, -r], [-r, r]] as Point[]} pen="face" size={3.4} color={color} seed={`${seed}:x2`} />
        </>
      );
    }

    case 'sparkle': {
      const r = m.eyeRy * 1.9;
      return (
        <>
          <Ink pts={[[0, -r], [0, r]] as Point[]} pen="face" size={3.2} color={color} seed={`${seed}:s1`} />
          <Ink pts={[[-r * 0.75, 0], [r * 0.75, 0]] as Point[]} pen="face" size={3.2} color={color} seed={`${seed}:s2`} />
        </>
      );
    }

    case 'wide': {
      const reach = m.wideR - m.pupilR - 1.8;
      return (
        <>
          <RoughAsset def={hand(paperDisc(m.wideR, color))} variant={seed} />
          <g transform={`translate(${(look[0] * reach).toFixed(2)} ${(look[1] * reach).toFixed(2)})`}>
            <RoughAsset def={hand(pupilDisc(m.pupilR, color))} variant={seed} />
          </g>
        </>
      );
    }

    case 'halfLid':
    case 'tired':
    case 'open':
    default: {
      /*
       * The calm eye. `look` moves the mark itself rather than a pupil inside a white,
       * which is the only way a 3-unit eye can aim at anything.
       */
      const reach = m.eyeRx * 1.5;
      const squash = state === 'tired' ? 0.66 : state === 'halfLid' ? 0.78 : 1;
      return (
        <>
          <g transform={`translate(${(look[0] * reach).toFixed(2)} ${(look[1] * reach * 0.7).toFixed(2)})`}>
            <RoughAsset def={hand(inkOval(m.eyeRx, m.eyeRy * squash, color))} variant={seed} />
          </g>
          {(state === 'halfLid' || state === 'tired') && (
            <Ink
              pts={arcPoints(0, -m.eyeRy * 0.9, m.eyeRx * 2.4, m.eyeRy * 0.8, 200, 340, 8)}
              pen="face"
              size={2.8}
              color={color}
              seed={`${seed}:lid`}
            />
          )}
          {state === 'tired' && (
            <Ink
              pts={arcPoints(0, m.eyeRy * 1.9, m.eyeRx * 2.1, m.eyeRy * 0.5, 20, 160, 8)}
              pen="face"
              size={2.4}
              color={color}
              seed={`${seed}:bag`}
            />
          )}
        </>
      );
    }
  }
};

const ClosedArc: React.FC<{ m: FaceMetrics; color: string; seed: string }> = ({ m, color, seed }) => (
  <Ink
    pts={quadPoints([-m.browHalfW * 0.82, -1], [0, m.eyeRy * 1.8], [m.browHalfW * 0.82, -1], 12)}
    pen="face"
    size={4.2}
    color={color}
    seed={`${seed}:closed`}
  />
);

/**
 * Glasses.
 *
 * Drawn AFTER the eyes so the frame is never occluded by a wide-eye disc — the frame is
 * the identity anchor and it outranks everything behind it. Authored as one asset so both
 * lenses and the bridge share a seed and read as a single object.
 */
export const Glasses: React.FC<{ m: FaceMetrics; color: string; seed: string }> = ({ m, color, seed }) => {
  const g = m.glasses;
  if (!g) return null;
  const hw = g.w / 2;
  const hh = g.h / 2;

  const lens = (cx: number): AssetDef['shapes'] => [
    {
      k: 'path',
      d:
        `M ${cx - hw + g.r} ${g.cy - hh} H ${cx + hw - g.r} A ${g.r} ${g.r} 0 0 1 ${cx + hw} ${g.cy - hh + g.r} ` +
        `V ${g.cy + hh - g.r} A ${g.r} ${g.r} 0 0 1 ${cx + hw - g.r} ${g.cy + hh} ` +
        `H ${cx - hw + g.r} A ${g.r} ${g.r} 0 0 1 ${cx - hw} ${g.cy + hh - g.r} ` +
        `V ${g.cy - hh + g.r} A ${g.r} ${g.r} 0 0 1 ${cx - hw + g.r} ${g.cy - hh} Z`,
      stroke: color,
      sw: g.sw,
      rough: 'detail',
      roughness: 0.7,
      single: true,
    },
  ];

  const def: AssetDef = {
    id: 'glasses',
    shapes: [
      ...lens(-g.cx),
      ...lens(g.cx),
      // bridge
      { k: 'line', x1: -g.cx + hw, y1: g.cy - 1, x2: g.cx - hw, y2: g.cy - 1, stroke: color, sw: g.sw * 0.85, rough: 'detail', roughness: 0.5, single: true },
      // temple stubs, so the frame reads as worn rather than painted on
      { k: 'line', x1: -g.cx - hw, y1: g.cy - hh + 3, x2: -g.cx - hw - 6, y2: g.cy - hh + 1, stroke: color, sw: g.sw * 0.8, rough: 'detail', roughness: 0.5, single: true },
      { k: 'line', x1: g.cx + hw, y1: g.cy - hh + 3, x2: g.cx + hw + 6, y2: g.cy - hh + 1, stroke: color, sw: g.sw * 0.8, rough: 'detail', roughness: 0.5, single: true },
    ],
  };

  return <RoughAsset def={hand(def)} variant={seed} />;
};
