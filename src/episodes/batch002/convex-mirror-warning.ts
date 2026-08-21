import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * convex-mirror-warning — "Why One Of Your Car Mirrors Comes With A Warning"
 *
 * US-SPECIFIC, and the script says so in its first clause. The asymmetry is the hook, so both
 * mirrors are on screen together from frame one and only one of them bulges.
 *
 * The payoff is that the text is a required ADMISSION. It etches into the glass on the last
 * beat rather than being present throughout, so it lands as a decision someone made.
 */
export const spec: EpisodeSpec = {
  highlights: {
    curved: P.teal, warning: P.coral, squeezes: P.teal,
    'blind-spot': P.gold, smaller: P.grey, misleading: P.coral,
  },

  scenes: {
    hook: {
      bg: 'CarInterior',
      camera: { punchAt: 'warning', punchAmount: 0.14, originX: 760, originY: 900 },
      layers: [
        { k: 'prop', name: 'WingMirror', x: 320, y: 900, scale: 1.15 },
        { k: 'label', text: 'FLAT', x: 320, y: 1180, color: P.grey, size: 44 },
        { k: 'prop', name: 'WingMirror', x: 760, y: 900, scale: 1.15, at: 'curved', args: { convex: true } },
        { k: 'label', text: 'CURVED', x: 760, y: 1180, at: 'curved', color: P.teal, size: 44 },
        { k: 'prop', name: 'WingMirror', x: 760, y: 900, scale: 1.15, at: 'warning', args: { convex: true, warned: true } },
      ],
    },

    curving: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'WingMirror', x: CX, y: 860, scale: 1.6 },
        { k: 'prop', name: 'WingMirror', x: CX, y: 860, scale: 1.6, at: 'squeezes', args: { convex: true } },
        { k: 'mark', name: 'FlowArrows', x: CX, y: 1180, at: 'squeezes', args: { count: 5, len: 110, color: P.teal } },
        { k: 'label', text: 'A WIDER SLICE OF ROAD', x: CX, y: LABEL_Y, at: 'squeezes', color: P.teal, size: 44 },
        { k: 'label', text: 'COVERS THE BLIND SPOT', x: CX, y: LABEL_LOW_Y, at: 'blind-spot', color: P.gold, size: 44 },
      ],
    },

    price: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'WingMirror', x: COMPARE_L.x, y: 900, scale: 1.1, args: { carScale: 1 } },
        { k: 'prop', name: 'WingMirror', x: COMPARE_R.x, y: 900, scale: 1.1, args: { convex: true, carScale: 1 } },
        { k: 'prop', name: 'WingMirror', x: COMPARE_R.x, y: 900, scale: 1.1, at: 'smaller', args: { convex: true, carScale: 0.55 } },
        { k: 'label', text: 'SMALLER READS AS FURTHER', x: CX, y: LABEL_Y, at: 'further', color: P.coral, size: 42 },
      ],
    },

    payoff: {
      bg: 'CarInterior',
      layers: [
        { k: 'prop', name: 'WingMirror', x: 660, y: 900, scale: 1.4, args: { convex: true, carScale: 0.55 } },
        { k: 'label', text: 'THE MIRROR IS MISLEADING YOU', x: CX, y: LABEL_Y, at: 'misleading', color: P.coral, size: 38 },
        { k: 'prop', name: 'WingMirror', x: 660, y: 900, scale: 1.4, at: 'writing', args: { convex: true, warned: true, carScale: 0.55 } },
        { k: 'label', text: 'SO IT SAYS SO', x: CX, y: LABEL_LOW_Y, at: 'writing', color: P.ink, size: 52 },
      ],
    },
  },
};
