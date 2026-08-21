import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * revolving-door — "A Revolving Door Is Solving A Problem You Can't See"
 *
 * The episode is stronger if the door genuinely looks WORSE first, so the objections stack up
 * as three labels before any defence arrives.
 *
 * The mechanism only reads from directly overhead — that the seal never opens is a plan-view
 * fact — so `neveropens` switches to a top-down drawing and stays there.
 */
export const spec: EpisodeSpec = {
  highlights: {
    slower: P.grey, rises: P.coral, cold: P.teal,
    'wind-tunnel': P.coral, heating: P.coral, never: P.teal, wedge: P.teal,
  },

  scenes: {
    hook: {
      bg: 'MallInterior',
      layers: [
        { k: 'prop', name: 'RevolvingDoor', x: 680, y: 900, scale: 1.2, args: { topDown: false } },
        { k: 'label', text: 'SLOWER', x: CX, y: 380, at: 'slower', color: P.grey, size: 52 },
        { k: 'label', text: 'EXPENSIVE', x: CX, y: 480, at: 'slower', color: P.grey, size: 52 },
        { k: 'label', text: 'AWKWARD', x: CX, y: 580, at: 'installing', color: P.grey, size: 52 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'exhausted' },
      ],
    },

    stack: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.18, to: 1.0, frames: 30 }, originX: CX, originY: 900 },
      layers: [
        { k: 'prop', name: 'BuildingSection', x: CX, y: 900, scale: 1.1 },
        { k: 'prop', name: 'BuildingSection', x: CX, y: 900, scale: 1.1, at: 'rises', args: { warm: true } },
        { k: 'mark', name: 'Arrow', x: CX, y: 560, at: 'rises', rotate: 270, args: { length: 160 } },
        { k: 'mark', name: 'Arrow', x: 240, y: 1180, at: 'cold', args: { length: 140 } },
        { k: 'label', text: 'COLD AIR RUSHES IN', x: CX, y: LABEL_Y, at: 'cold', color: P.teal, size: 44 },
      ],
    },

    windtunnel: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'BuildingSection', x: CX, y: 900, scale: 1.1, args: { warm: true } },
        { k: 'mark', name: 'MotionLines', x: 300, y: 1080, at: 'wind-tunnel', args: { color: P.coral } },
        { k: 'label', text: 'A WIND TUNNEL', x: CX, y: LABEL_Y, at: 'wind-tunnel', color: P.coral, size: 54 },
        { k: 'label', text: 'HEATING, INTO THE STREET', x: CX, y: LABEL_LOW_Y, at: 'heating', color: P.coral, size: 40 },
      ],
    },

    neveropens: {
      bg: 'SchematicVoid',
      camera: { punchAt: 'never', punchAmount: 0.1, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'RevolvingDoor', x: CX, y: 880, scale: 1.7, args: { topDown: true, angle: 18 } },
        { k: 'label', text: 'NEVER ACTUALLY OPENS', x: CX, y: LABEL_Y, at: 'never', color: P.teal, size: 46 },
      ],
    },

    payoff: {
      bg: 'MallInterior',
      layers: [
        { k: 'prop', name: 'RevolvingDoor', x: 660, y: 880, scale: 1.3, args: { topDown: true, angle: 32 } },
        { k: 'prop', name: 'RevolvingDoor', x: 660, y: 880, scale: 1.3, at: 'wedge', args: { topDown: true, angle: 32, wedge: true } },
        { k: 'label', text: 'ONLY YOUR WEDGE', x: CX, y: LABEL_Y, at: 'wedge', color: P.teal, size: 52 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
