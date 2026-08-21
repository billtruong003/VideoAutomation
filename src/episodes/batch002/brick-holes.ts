import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * brick-holes — "A Brick Has Holes For Three Different Reasons"
 *
 * Three reasons, so three slots that fill in. The slots appear EMPTY in the second scene and
 * are filled one at a time in the payoff, which is what turns a list into a structure the
 * viewer can feel closing.
 *
 * The firing scene is an A/B: a solid brick that cracks beside a perforated one that does not.
 */
export const spec: EpisodeSpec = {
  highlights: {
    holes: P.teal, solid: P.grey, mortar: P.gold,
    keyed: P.teal, cracking: P.coral, clay: P.coral, wall: P.teal,
  },

  scenes: {
    hook: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'holes', punchAmount: 0.15, originX: 660, originY: 980 },
      layers: [
        { k: 'prop', name: 'Brick', x: 660, y: 980, scale: 1.6 },
        { k: 'label', text: 'SOLID?', x: CX, y: LABEL_Y, at: 'solid', color: P.grey, size: 66 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'suspicious' },
      ],
    },

    better: {
      bg: 'OldWorkshop',
      layers: [
        { k: 'prop', name: 'Brick', x: 660, y: 980, scale: 1.6 },
        { k: 'label', text: 'THREE REASONS', x: CX, y: LABEL_Y, at: 'better', color: P.teal, size: 60 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'thinking', expression: 'curious' },
      ],
    },

    mortar: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Brick', x: CX, y: 780, scale: 1.5 },
        { k: 'prop', name: 'Brick', x: CX, y: 980, scale: 1.5 },
        { k: 'prop', name: 'Brick', x: CX, y: 980, scale: 1.5, at: 'mortar', args: { mortared: true } },
        { k: 'label', text: 'MORTAR KEYS IN', x: CX, y: LABEL_Y, at: 'mortar', color: P.gold, size: 52 },
        { k: 'label', text: 'ONE. LOCKED COURSES', x: CX, y: LABEL_LOW_Y, at: 'keyed', color: P.teal, size: 44 },
      ],
    },

    firing: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Brick', x: COMPARE_L.x, y: 880, scale: 1.0, args: { holes: false } },
        { k: 'prop', name: 'Brick', x: COMPARE_R.x, y: 880, scale: 1.0 },
        { k: 'prop', name: 'Brick', x: COMPARE_L.x, y: 880, scale: 1.0, at: 'cracking', args: { holes: false, cracked: true } },
        { k: 'label', text: 'CRACKS', x: COMPARE_L.x, y: 1160, at: 'cracking', color: P.coral, size: 44 },
        { k: 'label', text: 'FIRES EVENLY', x: COMPARE_R.x, y: 1160, at: 'faster', color: P.teal, size: 44 },
        { k: 'label', text: 'TWO. EVEN FIRING', x: CX, y: LABEL_Y, at: 'faster', color: P.teal, size: 46 },
      ],
    },

    payoff: {
      bg: 'OldWorkshop',
      layers: [
        { k: 'prop', name: 'Brick', x: 660, y: 980, scale: 1.6, args: { mortared: true } },
        { k: 'label', text: 'LESS CLAY', x: CX, y: 420, at: 'clay', color: P.coral, size: 50 },
        { k: 'label', text: 'LESS FUEL', x: CX, y: 530, at: 'fuel', color: P.gold, size: 50 },
        { k: 'label', text: 'STRONGER WALL', x: CX, y: 640, at: 'wall', color: P.teal, size: 50 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
