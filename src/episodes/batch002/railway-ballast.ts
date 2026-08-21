import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * railway-ballast — "That Gravel Under Train Tracks Isn't Landscaping"
 *
 * Four jobs, four tallies. The list structure is the episode, so the tally marks appear in the
 * hook and complete on the last beat -- the click of the set closing IS the button.
 *
 * Every mechanism scene is a with/without comparison, because "the stones are doing something"
 * is only visible against a version where they are not.
 */
export const spec: EpisodeSpec = {
  highlights: {
    gravel: P.teal, weight: P.coral, spread: P.teal,
    lock: P.teal, drains: P.teal, mud: P.grey, vibration: P.gold,
  },

  scenes: {
    hook: {
      bg: 'HighwayRoadside',
      camera: { punchAt: 'gravel', punchAmount: 0.14, originX: CX, originY: 1000 },
      layers: [
        { k: 'prop', name: 'TrackSection', x: CX, y: 1000, scale: 1.3 },
        { k: 'label', text: 'ON PURPOSE', x: CX, y: LABEL_Y, at: 'purpose', color: P.teal, size: 62 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'leanForward', expression: 'curious' },
      ],
    },

    load: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'TrackSection', x: CX, y: 940, scale: 1.4 },
        { k: 'mark', name: 'Arrow', x: CX, y: 560, at: 'weight', rotate: 90, args: { length: 170 } },
        { k: 'label', text: 'ENORMOUS WEIGHT', x: CX, y: LABEL_Y, at: 'weight', color: P.coral, size: 48 },
        { k: 'mark', name: 'FlowArrows', x: CX, y: 1120, at: 'spread', args: { count: 5, len: 110, color: P.teal } },
        { k: 'label', text: 'ONE. SPREAD OUT', x: CX, y: LABEL_LOW_Y + 60, at: 'spread', color: P.teal, size: 44 },
        { k: 'prop', name: 'TrackSection', x: CX, y: 940, scale: 1.4, at: 'sink', args: { stones: false, sunk: 46 } },
      ],
    },

    interlock: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'TrackSection', x: COMPARE_L.x, y: 900, scale: 0.85 },
        { k: 'prop', name: 'TrackSection', x: COMPARE_R.x, y: 900, scale: 0.85, args: { stones: false } },
        { k: 'label', text: 'ANGULAR: LOCKS', x: COMPARE_L.x, y: 1200, at: 'lock', color: P.teal, size: 40 },
        { k: 'label', text: 'ROUND: ROLLS', x: COMPARE_R.x, y: 1200, at: 'creeping', color: P.coral, size: 40 },
        { k: 'label', text: 'TWO. STAYS IN LINE', x: CX, y: LABEL_Y, at: 'creeping', color: P.teal, size: 46 },
      ],
    },

    drainage: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'TrackSection', x: CX, y: 940, scale: 1.3 },
        { k: 'mark', name: 'FlowArrows', x: CX, y: 1160, at: 'drains', args: { count: 5, len: 90, color: P.teal } },
        { k: 'label', text: 'THREE. DRAINS', x: CX, y: LABEL_Y, at: 'drains', color: P.teal, size: 48 },
        { k: 'prop', name: 'TrackSection', x: CX, y: 940, scale: 1.3, at: 'mud', args: { stones: false, muddy: true, sunk: 24 } },
        { k: 'label', text: 'OR TURNS TO MUD', x: CX, y: LABEL_LOW_Y, at: 'mud', color: P.grey, size: 44 },
      ],
    },

    vibration: {
      bg: 'HighwayRoadside',
      layers: [
        { k: 'prop', name: 'TrackSection', x: CX, y: 1000, scale: 1.3 },
        { k: 'mark', name: 'Wave', x: CX, y: 1180, at: 'vibration', args: { span: 620, amplitude: 20, color: P.gold } },
        { k: 'label', text: 'FOUR. SOAKS UP SHOCK', x: CX, y: LABEL_Y, at: 'vibration', color: P.gold, size: 46 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
