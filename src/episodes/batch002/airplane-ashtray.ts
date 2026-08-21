import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, GUS, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * airplane-ashtray — "Planes Still Have Ashtrays And It's Not An Oversight"
 *
 * TONE: this concerns an in-flight fire that killed people. The danger stays a DIAGRAM. No
 * character smokes on screen, nothing burns, and the bin only ever GLOWS. The comedy allowed
 * here is the dryness of the regulation itself, not the hazard.
 *
 * The two outcomes are drawn side by side in the same framing, because the argument is a
 * comparison: with an ashtray, and without one.
 */
export const spec: EpisodeSpec = {
  highlights: {
    ashtray: P.teal, banned: P.coral, require: P.gold,
    bin: P.coral, towels: P.coral, smokers: P.teal,
  },

  scenes: {
    hook: {
      bg: 'PlaneCabin',
      camera: { punchAt: 'ashtray', punchAmount: 0.15, originX: 660, originY: 1010 },
      layers: [
        { k: 'prop', name: 'LavDoor', x: 660, y: 900, scale: 1.15 },
        { k: 'label', text: 'BANNED FOR DECADES', x: CX, y: LABEL_Y, at: 'banned', color: P.coral, size: 46 },
        { k: 'mark', name: 'CircleIt', x: 660, y: 955, at: 'ashtray', args: { rx: 84, ry: 60, color: P.teal } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'leanForward', expression: 'curious' },
      ],
    },

    notleftover: {
      bg: 'PlaneCabin',
      layers: [
        { k: 'prop', name: 'LavDoor', x: 620, y: 900, scale: 1.05, args: { ashtrayLit: true } },
        { k: 'label', text: 'A LEFTOVER', x: 560, y: 560, until: 'require', color: P.grey },
        { k: 'mark', name: 'CrossOut', x: 560, y: 560, at: 0.8, until: 'require', args: { size: 210, color: P.coral } },
        { k: 'label', text: 'REQUIRED', x: CX, y: LABEL_Y, at: 'require', color: P.gold, size: 66 },
        { k: 'label', text: 'OR THE PLANE STAYS DOWN', x: CX, y: LABEL_LOW_Y, at: 'ground', color: P.ink, size: 40 },
        { k: 'actor', who: 'gus', ...GUS, pose: 'handsOnHips', expression: 'deadpan' },
      ],
    },

    reasoning: {
      bg: 'SchematicVoid',
      tint: P.paperShade,
      camera: { dolly: { from: 1.25, to: 1.05, frames: 26 }, originX: CX, originY: 900 },
      layers: [
        { k: 'prop', name: 'LavDoor', x: CX, y: 900, scale: 0.9, args: { ashtrayLit: true, signLit: false } },
      ],
    },

    cigarette: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'Cigarette', x: CX, y: 700, scale: 1.8 },
        { k: 'mark', name: 'ScentCurls', x: 420, y: 520, at: 'smoke', args: { color: P.grey } },
        { k: 'mark', name: 'QuestionMark', x: CX, y: 1060, at: 'ends-up', args: { color: P.ink } },
      ],
    },

    bin: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'WasteBin', x: COMPARE_L.x, y: 940, scale: 1.4 },
        { k: 'prop', name: 'WasteBin', x: COMPARE_L.x, y: 940, scale: 1.4, at: 'bin', args: { glowing: true } },
        { k: 'label', text: 'PAPER', x: COMPARE_L.x, y: 1240, at: 'bin', color: P.coral, size: 46 },
        { k: 'prop', name: 'LavDoor', x: COMPARE_R.x, y: 900, scale: 0.8, at: 'towels', args: { ashtrayLit: true } },
        { k: 'label', text: 'OR METAL', x: COMPARE_R.x, y: 1240, at: 'towels', color: P.teal, size: 46 },
      ],
    },

    payoff: {
      bg: 'PlaneCabin',
      layers: [
        { k: 'prop', name: 'LavDoor', x: 660, y: 900, scale: 1.15, args: { ashtrayLit: true, signLit: false } },
        { k: 'label', text: 'FOR THE ONE WHO IGNORES IT', x: CX, y: LABEL_Y, at: 'smokers', color: P.teal, size: 40 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'focused' },
      ],
    },
  },
};
