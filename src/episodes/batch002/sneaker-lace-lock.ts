import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * sneaker-lace-lock — "Sneakers Come With An Anti-Blister Setting"
 *
 * Instructional: a viewer should be able to copy this. So the thread and cross scenes are
 * drawn large, on a plain field, with the shoe in the same position both times -- the only
 * thing that changes between them is the lace.
 *
 * The heel cutaway is the mechanism, and it is the one place the episode compares two states
 * directly: lifting, and held.
 */
export const spec: EpisodeSpec = {
  highlights: {
    extra: P.teal, nobody: P.grey, loop: P.teal,
    clamps: P.teal, lifting: P.coral, blister: P.coral,
  },

  scenes: {
    hook: {
      bg: 'BedroomFloor',
      camera: { punchAt: 'extra', punchAmount: 0.16, originX: 780, originY: 940 },
      layers: [
        { k: 'prop', name: 'Sneaker', x: 640, y: 980, scale: 1.5 },
        { k: 'mark', name: 'CircleIt', x: 826, y: 929, at: 'extra', args: { rx: 56, ry: 52, color: P.teal } },
        { k: 'label', text: 'NEVER USED', x: CX, y: LABEL_Y, at: 'nobody', color: P.grey, size: 56 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'leanForward', expression: 'curious' },
      ],
    },

    thread: {
      bg: 'SchematicVoid',
      camera: { dolly: { from: 1.2, to: 1.0, frames: 22 }, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'Sneaker', x: CX, y: 880, scale: 2.0 },
        { k: 'label', text: 'THREAD IT THROUGH', x: CX, y: LABEL_Y, at: 'thread', color: P.ink, size: 50 },
        { k: 'prop', name: 'Sneaker', x: CX, y: 880, scale: 2.0, at: 'loop', args: { locked: true } },
        { k: 'label', text: 'A SMALL LOOP', x: CX, y: LABEL_LOW_Y, at: 'loop', color: P.teal, size: 46 },
      ],
    },

    cross: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'Sneaker', x: CX, y: 880, scale: 2.0, args: { locked: true } },
        { k: 'label', text: 'CROSS, THEN PULL', x: CX, y: LABEL_Y, at: 'cross', color: P.ink, size: 50 },
        { k: 'mark', name: 'FlowArrows', x: CX + 60, y: 700, at: 'clamps', args: { count: 3, len: 100, color: P.teal } },
        { k: 'label', text: 'THE COLLAR CLAMPS', x: CX, y: LABEL_LOW_Y, at: 'clamps', color: P.teal, size: 46 },
      ],
    },

    heel: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Sneaker', x: COMPARE_L.x, y: 900, scale: 1.15, args: { heelLift: 26 } },
        { k: 'label', text: 'LIFTS', x: COMPARE_L.x, y: 1230, color: P.coral, size: 48 },
        { k: 'prop', name: 'Sneaker', x: COMPARE_R.x, y: 900, scale: 1.15, at: 'lifting', args: { locked: true, heelLift: 0 } },
        { k: 'label', text: 'HELD', x: COMPARE_R.x, y: 1230, at: 'lifting', color: P.teal, size: 48 },
      ],
    },

    blister: {
      bg: 'BedroomFloor',
      layers: [
        { k: 'prop', name: 'Sneaker', x: 640, y: 980, scale: 1.5, args: { heelLift: 22 } },
        { k: 'label', text: 'FRICTION', x: CX, y: LABEL_Y, at: 'blister', color: P.coral, size: 60 },
        { k: 'prop', name: 'Sneaker', x: 640, y: 980, scale: 1.5, at: 'walk', args: { locked: true, heelLift: 0 } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'walkA', expression: 'happy',
          swaps: [{ at: 'walk', pose: 'walkB' }] },
      ],
    },
  },
};
