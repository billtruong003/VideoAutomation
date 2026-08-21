import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * chip-bag-nitrogen — "Chip Bags Are Not Filled With Air"
 *
 * Bill starts aggrieved and is talked round; that arc IS the episode, so he opens with arms
 * crossed and ends eating a chip. The two halves of the answer are drawn as two halves of the
 * frame, ticked one at a time.
 */
export const spec: EpisodeSpec = {
  highlights: {
    oxygen: P.coral, rancid: P.coral, nitrogen: P.teal,
    inert: P.teal, pillow: P.teal, cushion: P.teal, preservative: P.gold,
  },

  scenes: {
    hook: {
      bg: 'KitchenCounter',
      camera: { punchAt: 'mostly', punchAmount: 0.12, originX: 660, originY: 900 },
      layers: [
        { k: 'prop', name: 'ChipBag', x: 660, y: 900, scale: 1.3 },
        { k: 'label', text: 'MOSTLY NOT CHIPS', x: CX, y: LABEL_Y, at: 'mostly', color: P.coral, size: 50 },
        { k: 'label', text: 'AIR', x: 660, y: 690, at: 'not-air', color: P.grey, size: 58 },
        { k: 'mark', name: 'CrossOut', x: 660, y: 690, at: 'not-air', args: { size: 180, color: P.coral } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'armsCrossed', expression: 'suspicious' },
      ],
    },

    oxygen: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'Molecule', x: 360, y: 760, scale: 1.2 },
        { k: 'mark', name: 'Molecule', x: 720, y: 760, scale: 1.2 },
        { k: 'label', text: 'A FIFTH OXYGEN', x: CX, y: LABEL_Y, at: 'oxygen', color: P.coral, size: 54 },
        { k: 'label', text: 'RANCID IN DAYS', x: CX, y: LABEL_LOW_Y, at: 'rancid', color: P.coral, size: 50 },
      ],
    },

    nitrogen: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'ChipBag', x: CX, y: 900, scale: 1.5 },
        { k: 'prop', name: 'ChipBag', x: CX, y: 900, scale: 1.5, at: 'nitrogen', args: { inflated: true } },
        { k: 'label', text: 'NITROGEN IN', x: CX, y: LABEL_Y, at: 'nitrogen', color: P.teal, size: 56 },
        { k: 'label', text: 'DOES NOTHING AT ALL', x: CX, y: LABEL_LOW_Y, at: 'inert', color: P.teal, size: 44 },
      ],
    },

    freshness: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'Tick', x: 360, y: 880, at: 'freshness', args: { size: 150, color: P.teal } },
        { k: 'label', text: 'FRESHNESS', x: 360, y: 1120, at: 'freshness', color: P.teal, size: 46 },
      ],
    },

    cushion: {
      bg: 'CityStreet',
      layers: [
        { k: 'prop', name: 'ChipBag', x: 360, y: 1000, scale: 1.0, args: { crushed: true } },
        { k: 'label', text: 'CRUMBS', x: 360, y: 1250, at: 'stacked', color: P.coral, size: 44 },
        { k: 'prop', name: 'ChipBag', x: 740, y: 1000, scale: 1.0, at: 'pillow', args: { inflated: true } },
        { k: 'label', text: 'A PILLOW', x: 740, y: 1250, at: 'pillow', color: P.teal, size: 44 },
      ],
    },

    payoff: {
      bg: 'KitchenCounter',
      layers: [
        { k: 'prop', name: 'ChipBag', x: 660, y: 900, scale: 1.3, args: { inflated: true } },
        { k: 'mark', name: 'Tick', x: 380, y: 620, at: 'cushion', args: { size: 110, color: P.teal } },
        { k: 'mark', name: 'Tick', x: 700, y: 620, at: 'cushion', args: { size: 110, color: P.teal } },
        { k: 'label', text: 'BOTH, AT ONCE', x: CX, y: LABEL_Y, at: 'preservative', color: P.gold, size: 52 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
