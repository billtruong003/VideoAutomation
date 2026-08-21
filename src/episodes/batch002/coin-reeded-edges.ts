import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, GUS, LABEL_Y } from './layout';

/**
 * coin-reeded-edges — "Your Quarter Is Still Protecting Silver It Doesn't Have"
 *
 * The reveal is a NEGATIVE: a shaved reeded coin is obvious because the pattern STOPS. That
 * only reads if the intact pattern has been established first, so the edge-on coin appears in
 * the hook and again in the grooves scene, same size, same place.
 *
 * Gus plays the clipper. He is never comic and never a villain — a man with shears, doing a
 * job that used to work.
 */
export const spec: EpisodeSpec = {
  highlights: {
    ridges: P.teal, silver: P.paperShade, shaved: P.coral,
    grooves: P.teal, newton: P.gold, stayed: P.teal,
  },

  scenes: {
    hook: {
      bg: 'DeskSurface',
      camera: { punchAt: 'ridges', punchAmount: 0.15, originX: 700, originY: 960 },
      layers: [
        { k: 'prop', name: 'Coin', x: 700, y: 960, scale: 2.0, args: { edgeOn: true } },
        { k: 'mark', name: 'CircleIt', x: 700, y: 960, at: 'ridges', args: { rx: 70, ry: 130, color: P.teal } },
        { k: 'label', text: 'NOTHING WORTH STEALING', x: CX, y: LABEL_Y, at: 'stealing', color: P.coral, size: 46 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'curious' },
      ],
    },

    clipping: {
      bg: 'OldWorkshop',
      layers: [
        { k: 'prop', name: 'Coin', x: 620, y: 1010, scale: 1.7 },
        { k: 'prop', name: 'Shears', x: 620, y: 800, scale: 1.5, at: 'shaved', enter: 'slide', slideFrom: [0, -260] },
        { k: 'prop', name: 'Coin', x: 880, y: 1090, scale: 0.9, at: 'shaved', args: { silver: false } },
        { k: 'label', text: 'LOOKED NORMAL', x: CX, y: LABEL_Y, at: 'normal', color: P.ink, size: 50 },
        { k: 'actor', who: 'gus', ...GUS, pose: 'leanForward', expression: 'deadpan' },
      ],
    },

    grooves: {
      bg: 'SchematicVoid',
      camera: { dolly: { from: 1.18, to: 1.0, frames: 20 }, originX: CX, originY: 880 },
      layers: [
        { k: 'prop', name: 'Coin', x: CX, y: 880, scale: 2.4, args: { edgeOn: true, reeded: false } },
        { k: 'prop', name: 'Coin', x: CX, y: 880, scale: 2.4, at: 'grooves', args: { edgeOn: true, reeded: true } },
        { k: 'prop', name: 'Coin', x: CX, y: 880, scale: 2.4, at: 'ended', args: { edgeOn: true, reeded: true, shaved: true } },
        { k: 'label', text: 'THE PATTERN STOPS', x: CX, y: LABEL_Y, at: 'ended', color: P.coral, size: 52 },
      ],
    },

    newton: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'newton', punchAmount: 0.12, originX: 640, originY: 940 },
      layers: [
        { k: 'prop', name: 'Coin', x: 640, y: 1000, scale: 1.8, args: { reeded: true } },
        { k: 'label', text: 'ROYAL MINT', x: CX, y: LABEL_Y, at: 'newton', color: P.gold, size: 58 },
        { k: 'actor', who: 'gus', ...GUS, pose: 'handsOnHips', expression: 'deadpan' },
      ],
    },

    payoff: {
      bg: 'DeskSurface',
      layers: [
        { k: 'prop', name: 'Coin', x: 660, y: 940, scale: 2.2, args: { edgeOn: true, silver: true } },
        { k: 'prop', name: 'Coin', x: 660, y: 940, scale: 2.2, at: 'gone', args: { edgeOn: true, silver: false } },
        { k: 'label', text: 'THE RIDGES STAYED', x: CX, y: LABEL_Y, at: 'stayed', color: P.teal, size: 56 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'relaxed', expression: 'happy' },
      ],
    },
  },
};
