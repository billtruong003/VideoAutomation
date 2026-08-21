import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * thermal-receipt-fade — "Your Receipt Was Never Printed With Ink"
 *
 * The printer reveal works by ABSENCE: show the empty cartridge slot and the missing ribbon
 * before showing the heaters. Naming what is not there is what makes the heaters land.
 *
 * The last scene has to show the same chemistry continuing where it should not — the reaction
 * never locks — so the printed receipt and the blank one are the same prop, one beat apart.
 */
export const spec: EpisodeSpec = {
  highlights: {
    blank: P.grey, ink: P.coral, dye: P.teal,
    developer: P.gold, heaters: P.coral, black: P.ink, vanishes: P.grey,
  },

  scenes: {
    hook: {
      bg: 'DeskSurface',
      camera: { punchAt: 'blank', punchAmount: 0.14, originX: 660, originY: 900 },
      layers: [
        { k: 'prop', name: 'Receipt', x: 660, y: 900, scale: 1.3, args: { printed: 3 } },
        { k: 'prop', name: 'Receipt', x: 660, y: 900, scale: 1.3, at: 'blank', args: { printed: 0 } },
        { k: 'label', text: 'NO INK', x: CX, y: LABEL_Y, at: 'ink', color: P.coral, size: 66 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'exhausted' },
      ],
    },

    coating: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.3, to: 1.0, frames: 26 }, originX: CX, originY: 880 },
      layers: [
        { k: 'mark', name: 'Molecule', x: 380, y: 880, scale: 1.1, at: 'dye' },
        { k: 'label', text: 'COLOURLESS DYE', x: 380, y: 1180, at: 'dye', color: P.teal, size: 40 },
        { k: 'mark', name: 'Molecule', x: 700, y: 880, scale: 1.1, at: 'developer' },
        { k: 'label', text: 'DEVELOPER', x: 700, y: 1180, at: 'developer', color: P.gold, size: 40 },
        { k: 'label', text: 'DOING NOTHING', x: CX, y: LABEL_Y, at: 'developer', color: P.ink, size: 48 },
      ],
    },

    heaters: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'label', text: 'NO INK. NO RIBBON.', x: CX, y: LABEL_Y, at: 'ribbon', color: P.grey, size: 50 },
        { k: 'prop', name: 'PrintHead', x: CX, y: 900, scale: 1.6, at: 'heaters' },
        { k: 'label', text: 'A ROW OF HEATERS', x: CX, y: LABEL_LOW_Y, at: 'heaters', color: P.coral, size: 48 },
      ],
    },

    reaction: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'PrintHead', x: CX, y: 660, scale: 1.5, args: { hot: true } },
        { k: 'prop', name: 'Receipt', x: CX, y: 1050, scale: 1.1, args: { printed: 0 } },
        { k: 'label', text: 'THEY MELT AND MEET', x: CX, y: LABEL_Y, at: 'melts', color: P.coral, size: 46 },
        { k: 'prop', name: 'Receipt', x: CX, y: 1050, scale: 1.1, at: 'black', args: { printed: 8 } },
      ],
    },

    fade: {
      bg: 'DeskSurface',
      layers: [
        { k: 'prop', name: 'Receipt', x: 660, y: 900, scale: 1.3, args: { printed: 8 } },
        { k: 'label', text: 'IT NEVER LOCKS', x: CX, y: LABEL_Y, at: 'locks', color: P.coral, size: 52 },
        { k: 'prop', name: 'Receipt', x: 660, y: 900, scale: 1.3, at: 'dashboard', args: { printed: 8, darkened: true } },
        { k: 'prop', name: 'Receipt', x: 660, y: 900, scale: 1.3, at: 'vanishes', args: { printed: 0 } },
        { k: 'label', text: 'UNTIL IT IS GONE', x: CX, y: LABEL_LOW_Y, at: 'vanishes', color: P.grey, size: 50 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'exhausted' },
      ],
    },
  },
};
