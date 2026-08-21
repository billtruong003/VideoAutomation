import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, GUS, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * tactile-paving — "The Bumpy Tiles On The Sidewalk Are A Two-Word Language"
 *
 * TONE: an accessibility feature, handled seriously. Nobody stumbles, nobody is a punchline,
 * and the comedy budget for this episode is zero. Gus appears once as Miyake, dignified, with
 * no caricature.
 *
 * The two symbols are framed identically so they read as a matched pair — a vocabulary, which
 * is the claim the episode is making.
 */
export const spec: EpisodeSpec = {
  highlights: {
    language: P.teal, stop: P.coral, safe: P.teal,
    cane: P.ink, yellow: P.gold, miyake: P.gold, blind: P.ink,
  },

  scenes: {
    hook: {
      bg: 'CityStreet',
      camera: { punchAt: 'language', punchAmount: 0.1, originX: 680, originY: 1060 },
      layers: [
        { k: 'prop', name: 'TactileTile', x: 680, y: 1060, scale: 1.5 },
        { k: 'label', text: 'A LANGUAGE', x: CX, y: LABEL_Y, at: 'language', color: P.teal, size: 60 },
        { k: 'label', text: 'TWO WORDS', x: CX, y: LABEL_LOW_Y, at: 'two-words', color: P.ink, size: 48 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'leanForward', expression: 'curious' },
      ],
    },

    domes: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'TactileTile', x: CX, y: 880, scale: 2.2, args: { kind: 'domes' } },
        { k: 'label', text: 'STOP', x: CX, y: LABEL_Y, at: 'stop', color: P.coral, size: 86 },
        { k: 'label', text: 'EDGE  ·  ROAD  ·  DROP', x: CX, y: LABEL_LOW_Y, at: 'drop', color: P.ink, size: 42 },
      ],
    },

    bars: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'TactileTile', x: CX, y: 880, scale: 2.2, args: { kind: 'bars' } },
        { k: 'label', text: 'KEEP GOING', x: CX, y: LABEL_Y, at: 'bars', color: P.teal, size: 72 },
        { k: 'label', text: 'THIS WAY IS SAFE', x: CX, y: LABEL_LOW_Y, at: 'safe', color: P.teal, size: 42 },
      ],
    },

    readable: {
      bg: 'CityStreet',
      layers: [
        { k: 'prop', name: 'TactileTile', x: 640, y: 1080, scale: 1.5, args: { kind: 'bars' } },
        { k: 'prop', name: 'CaneTip', x: 850, y: 880, scale: 1.2, at: 'cane', enter: 'slide', slideFrom: [180, -120] },
        { k: 'label', text: 'READ THROUGH A SOLE', x: CX, y: LABEL_Y, at: 'cane', color: P.ink, size: 44 },
        { k: 'prop', name: 'TactileTile', x: 640, y: 1080, scale: 1.5, at: 'yellow', args: { kind: 'bars', lit: true } },
        { k: 'actor', who: 'bill', ...BILL, pose: 'standAlert', expression: 'focused' },
      ],
    },

    miyake: {
      bg: 'OldWorkshop',
      camera: { punchAt: 'miyake', punchAmount: 0.1, originX: 640, originY: 980 },
      layers: [
        { k: 'prop', name: 'TactileTile', x: 640, y: 1000, scale: 1.3, args: { lit: false } },
        { k: 'label', text: 'OKAYAMA, 1965', x: CX, y: LABEL_Y, at: 'miyake', color: P.gold, size: 56 },
        { k: 'label', text: 'HIS OWN MONEY', x: CX, y: LABEL_LOW_Y, at: 'blind', color: P.ink, size: 44 },
        { k: 'actor', who: 'gus', ...GUS, pose: 'leanForward', expression: 'deadpan' },
      ],
    },

    payoff: {
      bg: 'CityStreet',
      camera: { dolly: { from: 1.2, to: 1.0, frames: 40 }, originX: CX, originY: 1000 },
      layers: [
        { k: 'prop', name: 'TactileTile', x: 260, y: 1120, scale: 1.0, args: { lit: true } },
        { k: 'prop', name: 'TactileTile', x: 540, y: 1080, scale: 0.9, at: 'worlds-feet', args: { lit: true, kind: 'bars' } },
        { k: 'prop', name: 'TactileTile', x: 800, y: 1050, scale: 0.8, at: 'worlds-feet', args: { lit: true } },
        { k: 'label', text: 'MOST OF THE WORLD', x: CX, y: LABEL_Y, at: 'worlds-feet', color: P.teal, size: 54 },
      ],
    },
  },
};
