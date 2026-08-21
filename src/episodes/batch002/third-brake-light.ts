import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * third-brake-light — "Why Cars Got A Third Brake Light"
 *
 * THE HONESTY BEAT IS THE POINT OF THIS EPISODE. Early trials suggested a third fewer
 * collisions; long-run data settled near four percent. The bar drawn in `trials` SHRINKS on
 * screen in `reality`. Showing only the big number would make a better video and a worse one.
 *
 * The lamps are drawn on one car seen from behind, so the geometry argument -- low and wide
 * versus high and centred -- is visible rather than asserted.
 */
export const spec: EpisodeSpec = {
  highlights: {
    third: P.teal, misread: P.coral, apart: P.grey,
    brakes: P.coral, trials: P.gold, settled: P.ink, thousands: P.coral,
  },

  scenes: {
    hook: {
      bg: 'HighwayRoad',
      camera: { punchAt: 'third', punchAmount: 0.14, originX: CX, originY: 940 },
      layers: [
        { k: 'prop', name: 'CarRear', x: CX, y: 1010, scale: 2.1, args: { tail: true } },
        { k: 'mark', name: 'CircleIt', x: CX, y: 964, at: 'third', args: { rx: 128, ry: 60, color: P.teal } },
        { k: 'label', text: 'HIGHER. CENTRED.', x: CX, y: LABEL_Y, at: 'centered', color: P.teal, size: 52 },
      ],
    },

    misread: {
      bg: 'HighwayRoad',
      layers: [
        { k: 'prop', name: 'CarRear', x: CX, y: 1010, scale: 2.1, args: { tail: true, low: true } },
        { k: 'mark', name: 'QuestionMark', x: CX, y: 560, at: 'misread', args: { color: P.coral } },
      ],
    },

    lowwide: {
      bg: 'HighwayRoad',
      layers: [
        { k: 'prop', name: 'CarRear', x: CX, y: 1010, scale: 2.1, args: { tail: true, low: true } },
        { k: 'mark', name: 'DimensionLine', x: CX, y: 1290, at: 'apart', args: { length: 420, color: P.grey, label: 'WIDE' } },
        { k: 'label', text: 'ALREADY GLOWING', x: CX, y: LABEL_Y, at: 'glowing', color: P.coral, size: 48 },
      ],
    },

    single: {
      bg: 'HighwayRoad',
      camera: { punchAt: 'brakes', punchAmount: 0.12, originX: CX, originY: 940 },
      layers: [
        { k: 'prop', name: 'CarRear', x: CX, y: 1010, scale: 2.1, args: { tail: true } },
        { k: 'prop', name: 'CarRear', x: CX, y: 1010, scale: 2.1, at: 'brakes', args: { tail: true, low: true, high: true } },
        { k: 'label', text: 'DARK UNTIL IT ISN\'T', x: CX, y: LABEL_Y, at: 'brakes', color: P.teal, size: 48 },
      ],
    },

    trials: {
      bg: 'CityStreet',
      layers: [
        { k: 'prop', name: 'CarRear', x: 300, y: 980, scale: 0.95, args: { high: true, low: true } },
        { k: 'prop', name: 'CarRear', x: 560, y: 980, scale: 0.95, args: { high: true, low: true } },
        { k: 'prop', name: 'CarRear', x: 820, y: 980, scale: 0.95, args: { high: true, low: true } },
        { k: 'label', text: 'A THIRD FEWER', x: CX, y: LABEL_Y, at: 'trials', color: P.gold, size: 74 },
      ],
    },

    reality: {
      bg: 'CityStreet',
      layers: [
        { k: 'label', text: 'A THIRD FEWER', x: CX, y: LABEL_Y, until: 'settled', color: P.gold, size: 74 },
        { k: 'mark', name: 'CrossOut', x: CX, y: LABEL_Y, at: 'settled', args: { size: 420, color: P.coral } },
        { k: 'label', text: 'NEARER FOUR PERCENT', x: CX, y: 720, at: 'settled', color: P.ink, size: 52 },
        { k: 'prop', name: 'CarRear', x: 300, y: 1060, scale: 0.55, at: 'thousands', args: { high: true } },
        { k: 'prop', name: 'CarRear', x: 540, y: 1060, scale: 0.55, at: 'thousands', args: { high: true } },
        { k: 'prop', name: 'CarRear', x: 780, y: 1060, scale: 0.55, at: 'thousands', args: { high: true } },
        { k: 'label', text: 'TENS OF THOUSANDS OF CRASHES', x: CX, y: LABEL_LOW_Y, at: 'thousands', color: P.coral, size: 38 },
      ],
    },
  },
};
