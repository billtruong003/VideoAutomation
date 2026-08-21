import type { EpisodeSpec } from '../../scenes/dsl';
import { PALETTE as P } from '../../style/tokens';
import { BILL, COMPARE_L, COMPARE_R, CX, LABEL_LOW_Y, LABEL_Y } from './layout';

/**
 * windshield-frit-dots — "What The Black Dots Around Your Windshield Are Doing"
 *
 * Two mechanisms, one strip of glass, and the episode has to keep them separate: the SOLID
 * band shields the adhesive, the DOTS grade the temperature. So the band and the dots are
 * highlighted in different colours and never lit at the same time.
 *
 * The thermal scene is a straight A/B — a hard-edged panel that cracks beside a dotted one
 * that does not. Two identical framings with one difference is the whole argument.
 */
export const spec: EpisodeSpec = {
  highlights: {
    dots: P.teal, border: P.ink, ceramic: P.ink,
    adhesive: P.gold, stress: P.coral, crack: P.coral, gradually: P.teal,
  },

  scenes: {
    hook: {
      bg: 'CarInterior',
      camera: { punchAt: 'dots', punchAmount: 0.13, originX: 700, originY: 700 },
      layers: [
        { k: 'prop', name: 'Windshield', x: 620, y: 720, scale: 1.9 },
        { k: 'prop', name: 'Windshield', x: 620, y: 720, scale: 1.9, at: 'dots', args: { dotsLit: true } },
        { k: 'label', text: 'A BLACK BORDER', x: CX, y: LABEL_Y, at: 'border', color: P.ink, size: 54 },
        { k: 'actor', who: 'bill', ...BILL, pose: 'leanForward', expression: 'curious',
          swaps: [{ at: 'dots', pose: 'standAlert', expression: 'surprised' }] },
      ],
    },

    ceramic: {
      bg: 'CutawayVoid',
      camera: { dolly: { from: 1.22, to: 1.0, frames: 24 }, originX: CX, originY: 900 },
      layers: [
        { k: 'prop', name: 'GlassLayers', x: CX, y: 900, scale: 2.2 },
        { k: 'label', text: 'CERAMIC, BAKED IN', x: CX, y: LABEL_Y, at: 'ceramic', color: P.ink, size: 52 },
        { k: 'label', text: 'ADHESIVE', x: CX, y: LABEL_LOW_Y, at: 'adhesive', color: P.gold },
      ],
    },

    glue: {
      bg: 'CutawayVoid',
      layers: [
        { k: 'prop', name: 'GlassLayers', x: CX, y: 940, scale: 2.2, args: { shielded: false } },
        { k: 'prop', name: 'GlassLayers', x: CX, y: 940, scale: 2.2, at: 'shields', args: { shielded: true } },
        { k: 'mark', name: 'Arrow', x: 300, y: 560, at: 'cook', rotate: 60, args: { length: 150 } },
        { k: 'mark', name: 'Arrow', x: 540, y: 540, at: 'cook', rotate: 75, args: { length: 150 } },
        { k: 'mark', name: 'Arrow', x: 780, y: 560, at: 'cook', rotate: 90, args: { length: 150 } },
        { k: 'label', text: 'SHIELDED', x: CX, y: LABEL_LOW_Y, at: 'shields', color: P.teal },
      ],
    },

    dots: {
      bg: 'SchematicVoid',
      camera: { punchAt: 'clever', punchAmount: 0.1, originX: CX, originY: 820 },
      layers: [
        { k: 'prop', name: 'Windshield', x: CX, y: 880, scale: 2.4, args: { dotsLit: true } },
      ],
    },

    thermal: {
      bg: 'SchematicVoid',
      layers: [
        { k: 'prop', name: 'Windshield', x: COMPARE_L.x, y: 880, scale: 1.35 },
        { k: 'prop', name: 'Windshield', x: COMPARE_R.x, y: 880, scale: 1.35, args: { dotsLit: true } },
        { k: 'mark', name: 'Wave', x: COMPARE_L.x, y: 620, at: 'heats', args: { span: 300, amplitude: 22, color: P.coral } },
        { k: 'mark', name: 'Wave', x: COMPARE_R.x, y: 620, at: 'heats', args: { span: 300, amplitude: 22, color: P.coral } },
        { k: 'prop', name: 'Windshield', x: COMPARE_L.x, y: 880, scale: 1.35, at: 'crack', args: { cracked: true } },
        { k: 'label', text: 'CRACKS', x: COMPARE_L.x, y: 1230, at: 'crack', color: P.coral, size: 46 },
        { k: 'label', text: 'GRADED', x: COMPARE_R.x, y: 1230, at: 'gradually', color: P.teal, size: 46 },
      ],
    },
  },
};
