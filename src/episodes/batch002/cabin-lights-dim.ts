import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * cabin-lights-dim — "Why The Cabin Lights Go Down Before Landing"
 *
 * TONE: this is about emergency evacuation. Nothing burns, nobody panics, and the counterfactual
 * scene is a diagram going dark rather than a disaster. The restraint IS the respect.
 *
 * Both wrong explanations are offered up front, because the viewer almost certainly holds one
 * of them, and they die together in a single beat.
 */
export const spec: EpisodeSpec = {
  highlights: {
    saving: P.grey, neither: P.coral, adapt: P.teal,
    evacuation: P.coral, blind: P.ink, adjusted: P.teal, see: P.gold,
  },

  scenes: {
    hook: {
      bg: 'PlaneCabin',
      layers: [
        { k: 'prop', name: 'CabinSection', x: CX, y: 900, scale: 1.3 },
        { k: 'prop', name: 'CabinSection', x: CX, y: 900, scale: 1.3, at: 'dim-down', args: { dim: true } },
        { k: 'label', text: 'MOOD LIGHTING', x: CX, y: 420, at: 'dim-down', color: P.grey, size: 48 },
        { k: 'label', text: 'SAVING POWER', x: CX, y: 530, at: 'saving', color: P.grey, size: 48 },
      ],
    },

    neither: {
      bg: 'PlaneCabin',
      layers: [
        { k: 'prop', name: 'CabinSection', x: CX, y: 900, scale: 1.3, args: { dim: true } },
        { k: 'label', text: 'MOOD LIGHTING', x: CX, y: 420, color: P.grey, size: 48 },
        { k: 'label', text: 'SAVING POWER', x: CX, y: 530, color: P.grey, size: 48 },
        { k: 'mark', name: 'CrossOut', x: CX, y: 475, at: 'neither', args: { size: 420, color: P.coral } },
      ],
    },

    adapt: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'EyeDiagram', x: CX, y: 820, scale: 1.5 },
        { k: 'prop', name: 'EyeDiagram', x: CX, y: 820, scale: 1.5, at: 'adapt', args: { pupil: 34 } },
        { k: 'label', text: 'MINUTES, NOT SECONDS', x: CX, y: LABEL_Y, at: 'adapt', color: P.teal, size: 46 },
        { k: 'label', text: 'TAKEOFF AND LANDING', x: CX, y: LABEL_LOW_Y, at: 'evacuation', color: P.coral, size: 44 },
      ],
    },

    blind: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'CabinSection', x: CX, y: 880, scale: 1.5 },
        { k: 'prop', name: 'CabinSection', x: CX, y: 880, scale: 1.5, at: 'power', args: { dim: true } },
        { k: 'label', text: 'EFFECTIVELY BLIND', x: CX, y: LABEL_Y, at: 'blind', color: P.ink, size: 50 },
      ],
    },

    payoff: {
      bg: 'PlaneCabin',
      camera: { punchAt: 'see', punchAmount: 0.1, originX: CX, originY: 940 },
      layers: [
        { k: 'prop', name: 'CabinSection', x: CX, y: 900, scale: 1.3, args: { dim: true } },
        { k: 'prop', name: 'CabinSection', x: CX, y: 900, scale: 1.3, at: 'adjusted', args: { dim: true, pathLit: true } },
        { k: 'label', text: 'ALREADY ADJUSTED', x: CX, y: LABEL_Y, at: 'adjusted', color: P.teal, size: 50 },
        { k: 'label', text: 'SO YOU CAN SEE', x: CX, y: LABEL_LOW_Y, at: 'see', color: P.gold, size: 52 },
      ],
    },
  },
};
