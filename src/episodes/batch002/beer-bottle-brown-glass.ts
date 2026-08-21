import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * beer-bottle-brown-glass — "Light Turns Beer Into Something Close To Skunk Spray"
 *
 * Riboflavin is a MIDDLEMAN, which is the one thing a viewer will not guess, so the transfer
 * has to be visible: light lands on one molecule, energy passes to another, that one breaks.
 * Three beats, three drawings, in that order.
 *
 * The skunk comparison is chemical rather than a joke, so the fragment is drawn beside a
 * matching molecule and the frame states plainly that it is not a metaphor.
 */
export const spec: EpisodeSpec = {
  highlights: {
    brown: P.gold, breaks: P.coral, stable: P.teal,
    riboflavin: P.gold, shatter: P.coral, skunk: P.coral, blocks: P.teal, green: P.teal,
  },

  scenes: {
    hook: {
      bg: 'KitchenCounter',
      camera: { punchAt: 'breaks', punchAmount: 0.13, originX: 700, originY: 880 },
      layers: [
        { k: 'prop', name: 'BeerBottle', x: 620, y: 900, scale: 1.1 },
        { k: 'prop', name: 'BeerBottle', x: 830, y: 900, scale: 1.1, args: { glass: 'clear' } },
        { k: 'mark', name: 'Arrow', x: 830, y: 600, at: 'breaks', rotate: 90, args: { length: 130 } },
        { k: 'prop', name: 'BeerBottle', x: 830, y: 900, scale: 1.1, at: 'breaks', args: { glass: 'clear', struck: true } },
        { k: 'label', text: 'LIGHT BREAKS BEER', x: CX, y: LABEL_Y, at: 'breaks', color: P.coral, size: 50 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'holdingSmall', expression: 'curious' },
      ],
    },

    hops: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'Molecule', x: 380, y: 860, scale: 1.3 },
        { k: 'mark', name: 'Molecule', x: 700, y: 860, scale: 1.3 },
        { k: 'label', text: 'STABLE IN THE DARK', x: CX, y: LABEL_Y, at: 'stable', color: P.teal, size: 48 },
      ],
    },

    riboflavin: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'Molecule', x: 700, y: 880, scale: 1.3 },
        { k: 'mark', name: 'Molecule', x: 360, y: 880, scale: 1.3, at: 'riboflavin' },
        { k: 'label', text: 'RIBOFLAVIN', x: 360, y: 1180, at: 'riboflavin', color: P.gold, size: 44 },
        { k: 'mark', name: 'Arrow', x: 530, y: 880, at: 'middleman', args: { length: 130 } },
        { k: 'label', text: 'A MIDDLEMAN', x: CX, y: LABEL_Y, at: 'middleman', color: P.gold, size: 52 },
      ],
    },

    shatter: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'mark', name: 'Molecule', x: CX, y: 820, scale: 1.4 },
        { k: 'mark', name: 'ImpactStar', x: CX, y: 820, at: 'shatter', args: { color: P.coral } },
        { k: 'label', text: 'CLOSE TO SKUNK SPRAY', x: CX, y: LABEL_Y, at: 'skunk', color: P.coral, size: 44 },
        { k: 'label', text: 'NOT A METAPHOR', x: CX, y: LABEL_LOW_Y, at: 'speech', color: P.ink, size: 50 },
      ],
    },

    glass: {
      bg: 'KitchenCounter',
      layers: [
        { k: 'prop', name: 'BeerBottle', x: 300, y: 900, scale: 1.0 },
        { k: 'prop', name: 'BeerBottle', x: 540, y: 900, scale: 1.0, args: { glass: 'green' } },
        { k: 'prop', name: 'BeerBottle', x: 780, y: 900, scale: 1.0, args: { glass: 'clear' } },
        { k: 'label', text: 'BLOCKS IT', x: 300, y: 1230, at: 'blocks', color: P.teal, size: 40 },
        { k: 'prop', name: 'BeerBottle', x: 540, y: 900, scale: 1.0, at: 'green', args: { glass: 'green', struck: true } },
        { k: 'label', text: 'A FRACTION', x: 540, y: 1230, at: 'green', color: P.gold, size: 40 },
        { k: 'prop', name: 'BeerBottle', x: 780, y: 900, scale: 1.0, at: 'green', args: { glass: 'clear', struck: true } },
        { k: 'label', text: 'NONE', x: 780, y: 1230, at: 'imports', color: P.coral, size: 40 },
      ],
    },
  },
};
