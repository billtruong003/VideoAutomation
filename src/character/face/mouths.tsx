/**
 * mouths.tsx — the mouth vocabulary, closed and reusable.
 *
 * Fifteen emotional mouths plus four talking mouths. That is the whole set, and episodes
 * pick from it rather than authoring geometry — a mouth redrawn per scene is the fastest
 * way to lose a character's face.
 *
 * Talking is deliberately not lip sync. Four shapes switched on a rhythm read as speech
 * at Shorts length, and the emotional state survives because only the mouth is replaced:
 * `expression=worried` + `talk=talkMedium` still reads worried, because the worry was
 * never in the mouth.
 */

import React from 'react';
import { RoughAsset } from '../../assets/RoughAsset';
import { TINY, type AssetDef } from '../../assets/shapes';
import { quadPoints, type Point } from '../../lib/pathpoints';
import { PALETTE } from '../../style/tokens';
import { Ink, hand } from '../ink';
import type { MouthState, TalkState } from '../types';
import type { FaceMetrics } from './metrics';

const filled = (id: string, shapes: AssetDef['shapes']): AssetDef => ({ id, shapes });

const openMouth = (rx: number, ry: number, color: string, tongue: boolean): AssetDef =>
  filled(`mouth-open-${rx}-${ry}`, [
    { k: 'ellipse', cx: 0, cy: 0, rx, ry, fill: color, stroke: color, rough: 'detail', sw: 2, roughness: 0.7, single: true },
    ...(tongue
      ? ([
          {
            k: 'ellipse',
            cx: 0,
            cy: ry * 0.55,
            rx: rx * 0.52,
            ry: ry * 0.24,
            fill: PALETTE.coral,
            stroke: 'none',
            rough: 'detail',
            ...TINY,
          },
        ] as AssetDef['shapes'])
      : []),
  ]);

export type MouthProps = {
  state: MouthState;
  /** Overrides the emotional mouth while keeping eyes and brows. */
  talk?: TalkState;
  m: FaceMetrics;
  /** Per-expression multiplier, on top of the character's own mouth scale. */
  scale?: number;
  color: string;
  seed: string;
};

export const Mouth: React.FC<MouthProps> = ({ state, talk, m, scale = 1, color, seed }) => {
  const s = m.mouthScale * scale;
  const wrap = (node: React.ReactNode) => (
    <g transform={`translate(0 ${m.mouthY}) scale(${s.toFixed(3)})`}>{node}</g>
  );
  const stroke = (pts: Point[], size = 4.0, key = 'm') =>
    <Ink pts={pts} pen="face" size={size} color={color} seed={`${seed}:${key}`} />;

  if (talk) {
    switch (talk) {
      case 'talkClosed':
        return wrap(stroke([[-7, 0], [0, 1], [7, 0]], 4.0, 'talk0'));
      case 'talkSmall':
        return wrap(<RoughAsset def={hand(openMouth(4.2, 3.2, color, false))} variant={`${seed}:t1`} />);
      case 'talkMedium':
        return wrap(<RoughAsset def={hand(openMouth(6.2, 6.0, color, true))} variant={`${seed}:t2`} />);
      case 'talkWide':
      default:
        return wrap(<RoughAsset def={hand(openMouth(7.6, 10.0, color, true))} variant={`${seed}:t3`} />);
    }
  }

  switch (state) {
    /** Bill's default: short, slightly off, not quite a line and not quite a smile. */
    case 'squiggle':
      return wrap(stroke([[-6.5, 0], [-2, -2.4], [2.2, 1.6], [6.5, -0.6]], 3.8));

    case 'line':
      return wrap(stroke([[-8, 0], [0, 1], [8, 0]]));

    case 'flat':
      return wrap(stroke([[-10, 0.6], [0, 0], [10, -0.6]]));

    case 'tinyFrown':
      return wrap(stroke(quadPoints([-6, 2.4], [0, -3.2], [6, 2.4], 10), 3.8));

    case 'smile':
      return wrap(stroke(quadPoints([-9, -2.5], [0, 8], [9, -2.5], 12), 4.4));

    case 'frown':
      return wrap(stroke(quadPoints([-9, 3.5], [0, -6.5], [9, 3.5], 12), 4.4));

    case 'wavy':
      return wrap(stroke([[-9, 0], [-4.5, -4], [0, 0], [4.5, 4], [9, 0]], 3.8));

    case 'smirk':
      return wrap(stroke(quadPoints([-8, 2], [1, 3], [9.5, -5], 12), 4.0));

    /** A wide confident arc with two corner ticks — Dex's default. */
    case 'grin':
      return wrap(
        <>
          {stroke(quadPoints([-11, -2], [0, 8.5], [11, -2], 14), 4.2)}
          {stroke([[-11, -2], [-10.5, -5]] as Point[], 3.2, 'tickL')}
          {stroke([[11, -2], [10.5, -5]] as Point[], 3.2, 'tickR')}
        </>,
      );

    case 'bigSmile':
      return wrap(
        <>
          <RoughAsset
            def={hand(
              filled('mouth-bigsmile', [
                { k: 'path', d: 'M -12 -4 Q 0 11 12 -4 Z', fill: color, stroke: color, rough: 'detail', sw: 2.2, roughness: 0.7, single: true },
              ]),
            )}
            variant={seed}
          />
          {stroke([[-6.5, 3.4], [0, 5.6], [6.5, 3.4]], 2.4, 'tongue')}
        </>,
      );

    case 'openLaugh':
      return wrap(
        <>
          <RoughAsset
            def={hand(
              filled('mouth-laugh', [
                { k: 'path', d: 'M -13 -6 Q 0 16 13 -6 Z', fill: color, stroke: color, rough: 'detail', sw: 2.2, roughness: 0.7, single: true },
                { k: 'ellipse', cx: 0, cy: 5.5, rx: 6, ry: 3.2, fill: PALETTE.coral, stroke: 'none', rough: 'detail', ...TINY },
              ]),
            )}
            variant={seed}
          />
        </>,
      );

    case 'o':
      return wrap(<RoughAsset def={hand(openMouth(5.6, 7.0, color, false))} variant={seed} />);

    case 'gasp':
      return wrap(<RoughAsset def={hand(openMouth(8.0, 11.5, color, true))} variant={seed} />);

    /**
     * Gritted teeth.
     *
     * The first version was a bordered box with a horizontal line and two verticals — a
     * tooth grid. At the size a mouth actually occupies on this head it read as a waffle,
     * not as a mouth. This is one filled shape with a zigzag top edge instead: the teeth
     * are the silhouette rather than internal detail, so they survive the reduction.
     */
    case 'grimace':
      return wrap(
        <RoughAsset
          def={hand(
            filled('mouth-grimace', [
              {
                k: 'path',
                d: 'M -12 -5 L -6 1 L 0 -5 L 6 1 L 12 -5 L 10 6 L -10 6 Z',
                fill: color,
                stroke: color,
                rough: 'detail',
                sw: 2.2,
                roughness: 0.7,
                single: true,
              },
            ]),
          )}
          variant={seed}
        />,
      );

    /** Mochi only. Two little arcs — the cat mouth, and the reason she never needs lines. */
    case 'catW':
      return wrap(
        <>
          {stroke(quadPoints([-7, -1], [-3.5, 3.6], [0, -1], 8), 2.8, 'wl')}
          {stroke(quadPoints([0, -1], [3.5, 3.6], [7, -1], 8), 2.8, 'wr')}
        </>,
      );

    default:
      return null;
  }
};
