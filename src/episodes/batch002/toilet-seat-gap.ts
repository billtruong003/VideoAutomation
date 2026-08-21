import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * toilet-seat-gap — "Public Toilet Seats Have That Gap Because Of A Rulebook"
 *
 * TONE: plain and matter-of-fact. No smirking, no bodies, no toilet jokes. The hygiene scene
 * is a shaded contact zone on an outline and nothing else.
 *
 * NOTE FOR ACCURACY: these are plumbing CODES adopted by jurisdictions, not federal law, so
 * the stamp reads CODE and never LAW.
 */
export const spec: EpisodeSpec = {
  highlights: {
    gap: P.teal, written: P.gold, clear: P.teal,
    strangers: P.ink, rule: P.gold, 'cost-cutting': P.grey,
  },

  scenes: {
    hook: {
      bg: 'MallInterior',
      camera: { punchAt: 'gap', punchAmount: 0.14, originX: 420, originY: 1080 },
      layers: [
        { k: 'prop', name: 'ToiletSeat', x: 380, y: 900, scale: 1.2 },
        { k: 'mark', name: 'CircleIt', x: 380, y: 1060, at: 'gap', args: { rx: 78, ry: 62, color: P.teal } },
        { k: 'prop', name: 'ToiletSeat', x: 780, y: 900, scale: 1.2, at: 'house', args: { openFront: false } },
        { k: 'label', text: 'PUBLIC', x: 380, y: LABEL_Y, at: 'gap', color: P.teal, size: 46 },
        { k: 'label', text: 'HOME', x: 780, y: LABEL_Y, at: 'house', color: P.grey, size: 46 },
      ],
    },

    written: {
      bg: 'SchematicVoid',
      camera: { punchAt: 'written', punchAmount: 0.12, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'CodeBook', x: CX, y: 880, scale: 1.6, args: { open: false } },
        { k: 'prop', name: 'CodeBook', x: CX, y: 880, scale: 1.6, at: 'written', args: { open: true } },
      ],
    },

    code: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'CodeBook', x: CX, y: 900, scale: 1.7, args: { open: true } },
        { k: 'prop', name: 'CodeBook', x: CX, y: 900, scale: 1.7, at: 'open-front', args: { open: true, stamped: true } },
        { k: 'label', text: 'OPEN-FRONT, PUBLIC USE', x: CX, y: LABEL_Y, at: 'open-front', color: P.gold, size: 44 },
        { k: 'label', text: 'FOR OVER FIFTY YEARS', x: CX, y: LABEL_LOW_Y, at: 'fifty', color: P.ink, size: 44 },
      ],
    },

    hygiene: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'ToiletSeat', x: CX, y: 880, scale: 1.6, args: { openFront: false, zone: true } },
        { k: 'label', text: 'CONTACT ZONE', x: CX, y: LABEL_Y, color: P.coral, size: 46 },
        { k: 'prop', name: 'ToiletSeat', x: CX, y: 880, scale: 1.6, at: 'clear', args: { openFront: true } },
        { k: 'label', text: 'KEPT CLEAR', x: CX, y: LABEL_LOW_Y, at: 'clear', color: P.teal, size: 50 },
        { k: 'label', text: 'HUNDREDS OF STRANGERS', x: CX, y: LABEL_Y, at: 'strangers', color: P.ink, size: 42 },
      ],
    },

    pool: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'ToiletSeat', x: COMPARE_L.x, y: 900, scale: 1.0, args: { openFront: false } },
        { k: 'prop', name: 'ToiletSeat', x: COMPARE_R.x, y: 900, scale: 1.0 },
        { k: 'label', text: 'NOWHERE TO POOL', x: CX, y: LABEL_Y, at: 'pool', color: P.teal, size: 48 },
      ],
    },

    payoff: {
      bg: 'MallInterior',
      layers: [
        { k: 'prop', name: 'ToiletSeat', x: 620, y: 900, scale: 1.3 },
        { k: 'label', text: 'CHEAP', x: CX, y: LABEL_Y, until: 'rule', color: P.grey, size: 62 },
        { k: 'mark', name: 'CrossOut', x: CX, y: LABEL_Y, at: 'cost-cutting', until: 'rule', args: { size: 240, color: P.coral } },
        { k: 'label', text: "IT'S A RULE", x: CX, y: LABEL_Y, at: 'rule', color: P.gold, size: 64 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'focused' },
      ],
    },
  },
};
