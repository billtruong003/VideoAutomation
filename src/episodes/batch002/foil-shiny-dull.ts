import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * foil-shiny-dull — "The Shiny Side Of Foil Is A Manufacturing Accident"
 *
 * The payoff image is two sheets PEELING APART, each carrying one shiny and one dull face.
 * Everything before it exists to make that separation legible, which is why the mill scene
 * shows a single sheet tearing first: without the failure, running two at once looks arbitrary.
 */
export const spec: EpisodeSpec = {
  highlights: {
    shiny: P.gold, dull: P.grey, coating: P.coral,
    thinner: P.teal, tear: P.coral, stacked: P.teal, mirror: P.gold,
  },

  scenes: {
    hook: {
      bg: 'KitchenCounter',
      camera: { punchAt: 'shiny', punchAmount: 0.12, originX: 660, originY: 940 },
      layers: [
        { k: 'prop', name: 'FoilSheet', x: 660, y: 940, scale: 1.9 },
        { k: 'label', text: 'SHINY', x: 420, y: LABEL_Y, at: 'shiny', color: P.gold, size: 60 },
        { k: 'label', text: 'DULL', x: 760, y: LABEL_Y, at: 'dull', color: P.grey, size: 60 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'curious',
          swaps: [{ at: 'explains', pose: 'leanForward', expression: 'suspicious' }] },
      ],
    },

    notcoating: {
      bg: 'KitchenCounter',
      layers: [
        { k: 'prop', name: 'FoilSheet', x: 660, y: 940, scale: 1.9 },
        { k: 'label', text: 'A COATING', x: 620, y: 640, until: 'nonstick', color: P.coral },
        { k: 'mark', name: 'CrossOut', x: 620, y: 640, at: 0.9, until: 'nonstick', args: { size: 200, color: P.coral } },
        { k: 'label', text: 'NONSTICK', x: 620, y: 640, at: 'nonstick', color: P.coral },
        { k: 'mark', name: 'CrossOut', x: 620, y: 640, at: 'nonstick', args: { size: 200, color: P.coral } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'armsCrossed', expression: 'suspicious' },
      ],
    },

    mill: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'RollingMill', x: CX, y: 880, scale: 1.7 },
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.5, args: { sheets: 1 } },
        { k: 'label', text: 'THINNER, AND THINNER', x: CX, y: LABEL_Y, at: 'thinner', color: P.teal, size: 48 },
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.5, at: 'tear', until: 'stacked', args: { sheets: 1, torn: true } },
        { k: 'label', text: 'IT TEARS', x: CX, y: LABEL_LOW_Y, at: 'tear', until: 'stacked', color: P.coral },
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.5, at: 'stacked', args: { sheets: 2 } },
        { k: 'label', text: 'SO: TWO AT ONCE', x: CX, y: LABEL_LOW_Y, at: 'stacked', color: P.teal },
      ],
    },

    outer: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.0, to: 1.25, frames: 40 }, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'RollingMill', x: CX, y: 880, scale: 1.7 },
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.5, args: { sheets: 2 } },
        { k: 'label', text: 'MIRROR STEEL', x: CX, y: LABEL_Y, at: 'mirror', color: P.gold, size: 54 },
      ],
    },

    inner: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.8, args: { sheets: 2 } },
        { k: 'prop', name: 'FoilSheet', x: CX, y: 880, scale: 1.8, at: 'inner', args: { sheets: 2, peeled: 60 } },
        { k: 'label', text: 'PRESSED TOGETHER', x: CX, y: LABEL_Y, at: 'inner', color: P.grey, size: 52 },
        { k: 'label', text: 'ONE OF EACH', x: CX, y: LABEL_LOW_Y, at: 'dull-out', color: P.teal, size: 56 },
      ],
    },
  },
};
