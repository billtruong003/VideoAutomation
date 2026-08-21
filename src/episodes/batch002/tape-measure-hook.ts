/**
 * tape-measure-hook — "That Wobbly Tape Measure Hook Is Not Broken"
 *
 * The episode is a comparison: the same hook, measured two ways, arriving at the same zero.
 * So the two mechanism scenes are deliberately built from the SAME layers in the same
 * positions, with only the direction of travel and the colour of the highlight different.
 * Cutting between two near-identical frames is what makes "either way" land without the
 * narration having to insist on it.
 */

import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';

const CX = 540;

export const spec: EpisodeSpec = {
  highlights: {
    wobbles: P.coral,
    hook: P.teal,
    move: P.teal,
    sixteenth: P.gold,
    zero: P.teal,
    honest: P.coral,
  },

  scenes: {
    /* the wobble, before anyone explains it */
    hook: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'wobbles', punchAmount: 0.14, originX: 900, originY: 1000 },
      layers: [
        { k: 'prop', name: 'TapeMeasure', x: 680, y: 1000, scale: 2.2 },
        { k: 'mark', name: 'CircleIt', x: 984, y: 1000, at: 'wobbles', args: { rx: 78, ry: 72, color: P.coral } },
        {
          k: 'actor', who: 'bill', x: 245, y: 1265, scale: 2.5,
          pose: 'holdingSmall', expression: 'curious',
          swaps: [{ at: 'wobbles', pose: 'leanForward', expression: 'suspicious' }],
        },
        { k: 'label', text: 'WORN OUT?', x: 600, y: 470, at: 'worn-out', color: P.coral, rotate: -3 },
      ],
    },

    /* the travel and the thickness are the same dimension — draw them as one */
    slides: {
      bg: 'SchematicVoid',
      camera: { dolly: { from: 1.24, to: 1.0, frames: 22 }, originX: CX, originY: 900 },
      layers: [
        { k: 'prop', name: 'TapeMeasure', x: CX, y: 900, scale: 2.6, args: { showDim: true, hookOut: 0 } },
        { k: 'prop', name: 'TapeMeasure', x: CX, y: 900, scale: 2.6, at: 'slides', args: { showDim: true, hookOut: 26 } },
        { k: 'label', text: 'ONE SIXTEENTH', x: CX, y: 560, at: 'thick', color: P.gold, size: 58 },
        { k: 'mark', name: 'DimensionLine', x: CX + 190, y: 700, at: 'thick', args: { length: 120, color: P.teal } },
      ],
    },

    /* outside: the hook pulls OUT, and the gap it leaves is its own thickness */
    outside: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'BoardEdge', x: 800, y: 900, scale: 1.5 },
        { k: 'prop', name: 'TapeMeasure', x: 420, y: 900, scale: 2.4, args: { hookOut: 0 } },
        { k: 'prop', name: 'TapeMeasure', x: 420, y: 900, scale: 2.4, at: 'pulls', args: { hookOut: 28, showDim: true } },
        { k: 'mark', name: 'Arrow', x: 700, y: 760, at: 'pulls', args: { length: 120 } },
        { k: 'label', text: 'ADDED BACK', x: CX, y: 1180, at: 'adding', color: P.teal },
      ],
    },

    /* inside: the mirror of the scene above. Same framing, opposite direction, other colour */
    inside: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'BoardEdge', x: 800, y: 900, scale: 1.5, args: { corner: true } },
        { k: 'prop', name: 'TapeMeasure', x: 420, y: 900, scale: 2.4, args: { hookOut: 28 } },
        { k: 'prop', name: 'TapeMeasure', x: 420, y: 900, scale: 2.4, at: 'corner', args: { hookOut: 0, showDim: true } },
        { k: 'mark', name: 'Arrow', x: 700, y: 760, at: 'corner', rotate: 180, args: { length: 120 } },
        { k: 'label', text: 'TAKEN AWAY', x: CX, y: 1180, at: 'away', color: P.coral },
      ],
    },

    /* both readings resolve to the same mark */
    payoff: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'zero', punchAmount: 0.1, originX: 820, originY: 1000 },
      layers: [
        { k: 'prop', name: 'TapeMeasure', x: 680, y: 1000, scale: 2.2, args: { showDim: true } },
        { k: 'label', text: 'TRUE ZERO', x: 600, y: 470, at: 'zero', color: P.teal, size: 74 },
        {
          k: 'actor', who: 'bill', x: 245, y: 1265, scale: 2.5,
          pose: 'holdingSmall', expression: 'focused',
          swaps: [{ at: 'honest', pose: 'relaxed', expression: 'happy' }],
        },
      ],
    },
  },
};
