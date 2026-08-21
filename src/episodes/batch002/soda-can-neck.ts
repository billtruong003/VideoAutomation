import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_Y } from './layout';

/**
 * soda-can-neck — "Why Soda Cans Get Narrower At The Top"
 *
 * SCALE IS THE PAYOFF. Six millimetres is nothing; the episode works only if that nothing is
 * held alone on screen before the multiplication starts. So the final scene draws the tiny
 * dimension first and lets it sit there.
 *
 * The lid/wall gauge difference is drawn at true relative thickness, because the whole
 * argument rests on the lid being the expensive part.
 */
export const spec: EpisodeSpec = {
  highlights: {
    narrower: P.teal, tapering: P.teal, mouth: P.grey,
    thicker: P.coral, pressure: P.coral, shrinking: P.teal, pounds: P.gold,
  },

  scenes: {
    hook: {
      bg: 'KitchenCounter',
      camera: { punchAt: 'narrower', punchAmount: 0.14, originX: 660, originY: 780 },
      layers: [
        { k: 'prop', name: 'SodaCan', x: 660, y: 900, scale: 1.5 },
        { k: 'mark', name: 'DimensionLine', x: 660, y: 1200, at: 'narrower', args: { length: 250, color: P.teal } },
        { k: 'mark', name: 'DimensionLine', x: 660, y: 600, at: 'tapering', args: { length: 190, color: P.teal } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'curious' },
      ],
    },

    notmouth: {
      bg: 'KitchenCounter',
      layers: [
        { k: 'prop', name: 'SodaCan', x: 660, y: 900, scale: 1.5 },
        { k: 'label', text: 'FOR YOUR MOUTH', x: CX, y: LABEL_Y, color: P.grey, size: 50 },
        { k: 'mark', name: 'CrossOut', x: CX, y: LABEL_Y, at: 'mouth', args: { size: 360, color: P.coral } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'armsCrossed', expression: 'suspicious' },
      ],
    },

    lid: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.25, to: 1.0, frames: 26 }, originX: CX, originY: 820 },
      layers: [
        { k: 'prop', name: 'SodaCan', x: CX, y: 900, scale: 1.8, args: { section: true } },
        { k: 'label', text: 'THICKER THAN THE WALLS', x: CX, y: LABEL_Y, at: 'thicker', color: P.coral, size: 44 },
        { k: 'mark', name: 'FlowArrows', x: CX, y: 700, at: 'pressure', args: { count: 3, len: 90, color: P.coral } },
        { k: 'prop', name: 'SodaCan', x: CX, y: 900, scale: 1.8, at: 'tab', args: { section: true, lidLit: true } },
      ],
    },

    saving: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'SodaCan', x: COMPARE_L.x, y: 900, scale: 1.2, args: { lidLit: true } },
        { k: 'label', text: 'SHRINK THE LID', x: COMPARE_L.x, y: 1210, at: 'shrinking', color: P.teal, size: 40 },
        { k: 'prop', name: 'SodaCan', x: COMPARE_R.x, y: 900, scale: 1.2 },
        { k: 'label', text: 'SHAVE THE SIDES', x: COMPARE_R.x, y: 1210, at: 'shaving', color: P.grey, size: 40 },
        { k: 'mark', name: 'CrossOut', x: COMPARE_R.x, y: 900, at: 'shaving', args: { size: 260, color: P.coral } },
      ],
    },

    scale: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'DimensionLine', x: CX, y: 700, at: 'millimeters', args: { length: 70, color: P.ink, label: '6 MM' } },
        { k: 'prop', name: 'SodaCan', x: 260, y: 1000, scale: 0.55, at: 'pounds' },
        { k: 'prop', name: 'SodaCan', x: 430, y: 1000, scale: 0.55, at: 'pounds' },
        { k: 'prop', name: 'SodaCan', x: 600, y: 1000, scale: 0.55, at: 'pounds' },
        { k: 'prop', name: 'SodaCan', x: 770, y: 1000, scale: 0.55, at: 'pounds' },
        { k: 'label', text: '200 MILLION POUNDS A YEAR', x: CX, y: LABEL_Y, at: 'pounds', color: P.gold, size: 42 },
      ],
    },
  },
};
