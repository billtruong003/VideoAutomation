import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * ferrite-choke — "Charger Cables Have A Lump That Stops Them Broadcasting"
 *
 * The idea to sell is WIRE EQUALS ANTENNA, so the cable straightens out of its desk clutter
 * into a plain horizontal line before the broadcast arcs appear. A tangle cannot read as an
 * aerial.
 *
 * Selectivity is the mechanism, so both signals must be on screen when they meet the ring:
 * the smooth wave passes, the jagged one does not.
 */
export const spec: EpisodeSpec = {
  highlights: {
    lump: P.teal, ferrite: P.grey, antenna: P.coral,
    noise: P.coral, heat: P.gold, filter: P.teal,
  },

  scenes: {
    hook: {
      bg: 'DeskSurface',
      camera: { punchAt: 'lump', punchAmount: 0.16, originX: 640, originY: 960 },
      layers: [
        { k: 'prop', name: 'ChargerCable', x: 640, y: 960, scale: 1.4 },
        { k: 'mark', name: 'CircleIt', x: 630, y: 960, at: 'lump', args: { rx: 96, ry: 62, color: P.teal } },
        { k: 'label', text: 'HEAVY FOR ITS SIZE', x: CX, y: LABEL_Y, at: 'heavy', color: P.ink, size: 48 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'curious' },
      ],
    },

    inside: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.3, to: 1.0, frames: 26 }, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'FerriteRing', x: CX, y: 880, scale: 1.9 },
        { k: 'label', text: 'AN IRON CERAMIC', x: CX, y: LABEL_Y, at: 'ferrite', color: P.ink, size: 52 },
      ],
    },

    antenna: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'ChargerCable', x: CX, y: 880, scale: 1.5 },
        { k: 'label', text: 'A LONG WIRE IS AN AERIAL', x: CX, y: LABEL_Y, at: 'antenna', color: P.coral, size: 42 },
        { k: 'prop', name: 'ChargerCable', x: CX, y: 880, scale: 1.5, at: 'noise', args: { noisy: true } },
        { k: 'prop', name: 'RadioIcon', x: 800, y: 1180, scale: 0.9, at: 'carry', args: { fuzzy: true } },
      ],
    },

    filter: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'ChargerCable', x: CX, y: 900, scale: 1.5, args: { noisy: true } },
        { k: 'prop', name: 'FerriteRing', x: CX, y: 890, scale: 0.8, at: 'power' },
        { k: 'mark', name: 'Wave', x: CX, y: 1140, at: 'power', args: { span: 560, amplitude: 26, color: P.teal } },
        { k: 'label', text: 'POWER PASSES', x: CX, y: LABEL_LOW_Y + 90, at: 'power', color: P.teal, size: 44 },
        { k: 'label', text: 'NOISE BECOMES HEAT', x: CX, y: LABEL_Y, at: 'heat', color: P.gold, size: 46 },
      ],
    },

    payoff: {
      bg: 'DeskSurface',
      layers: [
        { k: 'prop', name: 'ChargerCable', x: 640, y: 960, scale: 1.4, args: { lumpLit: true } },
        { k: 'prop', name: 'RadioIcon', x: 300, y: 720, scale: 0.8, args: { fuzzy: true } },
        { k: 'prop', name: 'RadioIcon', x: 300, y: 720, scale: 0.8, at: 'transmitting', args: { fuzzy: false } },
        { k: 'label', text: 'QUIET', x: CX, y: LABEL_Y, at: 'transmitting', color: P.teal, size: 64 },
      ],
    },
  },
};
