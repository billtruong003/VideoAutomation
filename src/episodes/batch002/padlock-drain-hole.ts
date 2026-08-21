import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * padlock-drain-hole — "The Hole In A Padlock Lets Water Out, Not In"
 *
 * The hook is an OBJECTION: a hole in a lock looks like a flaw. The episode earns its reveal
 * by letting the viewer hold that objection for a beat, so the arrow pointing INWARD is drawn
 * first and spun around later.
 *
 * The rust scene is the consequence and the drain scene is the relief. They share a framing so
 * the second reads as the first one fixed.
 */
export const spec: EpisodeSpec = {
  highlights: {
    hole: P.teal, water: P.coral, opposite: P.teal,
    rust: P.coral, freeze: P.teal, fall: P.teal, oil: P.gold,
  },

  scenes: {
    hook: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'hole', punchAmount: 0.16, originX: 680, originY: 1080 },
      layers: [
        { k: 'prop', name: 'Padlock', x: 680, y: 960, scale: 1.5 },
        { k: 'mark', name: 'CircleIt', x: 680, y: 1158, at: 'hole', args: { rx: 52, ry: 46, color: P.teal } },
        { k: 'label', text: 'WATER GETS IN?', x: CX, y: LABEL_Y, at: 'water', color: P.coral, size: 52 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'suspicious' },
      ],
    },

    opposite: {
      bg: 'OldWorkshop',
      layers: [
        { k: 'prop', name: 'Padlock', x: 680, y: 960, scale: 1.5 },
        { k: 'label', text: 'WATER GETS IN?', x: CX, y: LABEL_Y, until: 'opposite', color: P.coral, size: 52 },
        { k: 'mark', name: 'CrossOut', x: CX, y: LABEL_Y, at: 'opposite', args: { size: 400, color: P.teal } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'armsCrossed', expression: 'suspicious' },
      ],
    },

    moisture: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Padlock', x: CX, y: 900, scale: 1.7, args: { section: true } },
        { k: 'mark', name: 'Arrow', x: 300, y: 520, at: 'moisture', rotate: 55, args: { length: 130 } },
        { k: 'mark', name: 'Arrow', x: 780, y: 520, at: 'moisture', rotate: 125, args: { length: 130 } },
        { k: 'label', text: 'RAIN · WASHING · AIR', x: CX, y: LABEL_Y, at: 'air', color: P.ink, size: 44 },
        { k: 'prop', name: 'Padlock', x: CX, y: 900, scale: 1.7, at: 'air', args: { section: true, flooded: true } },
      ],
    },

    rust: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Padlock', x: CX, y: 900, scale: 1.7, args: { section: true, flooded: true } },
        { k: 'label', text: 'SPRINGS AND PINS', x: CX, y: LABEL_Y, at: 'springs', color: P.ink, size: 46 },
        { k: 'prop', name: 'Padlock', x: CX, y: 900, scale: 1.7, at: 'rust', args: { section: true, flooded: true, rusted: true } },
        { k: 'label', text: 'SEIZED', x: CX, y: LABEL_LOW_Y, at: 'rust', color: P.coral, size: 60 },
        { k: 'label', text: 'OR FROZEN', x: CX, y: LABEL_LOW_Y, at: 'freeze', color: P.teal, size: 60 },
      ],
    },

    drains: {
      bg: 'CutawayVoid',
      camera: { punchAt: 'fall', punchAmount: 0.1, originX: CX, originY: 1080 },
      layers: [
        { k: 'prop', name: 'Padlock', x: CX, y: 880, scale: 1.7, args: { section: true, flooded: true } },
        { k: 'prop', name: 'Padlock', x: CX, y: 880, scale: 1.7, at: 'fall', args: { section: true, draining: true } },
        { k: 'label', text: 'STRAIGHT BACK OUT', x: CX, y: LABEL_Y, at: 'fall', color: P.teal, size: 52 },
      ],
    },

    oil: {
      bg: 'OldWorkshop',
      layers: [
        { k: 'prop', name: 'Padlock', x: 680, y: 960, scale: 1.5, args: { draining: false } },
        { k: 'label', text: 'AND A DROP OF OIL', x: CX, y: LABEL_Y, at: 'oil', color: P.gold, size: 50 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
