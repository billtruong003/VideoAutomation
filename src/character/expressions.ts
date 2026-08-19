/**
 * expressions.ts — the protagonist's face library.
 *
 * Face and body are independent on purpose: any expression can ride on any pose, which
 * is where most of the comedy comes from (a `relaxed` body wearing a `horrified` face).
 * Reusable across episodes — nothing here is casino-specific.
 */

import type { Expression } from './rig';

export const EXPRESSIONS = {
  neutral: { eyes: 'open', mouth: 'line', brow: 0 },

  curious: { eyes: 'open', mouth: 'o', mouthScale: 0.7, brow: 0.45, look: [0.25, -0.2] },

  confused: { eyes: 'open', mouth: 'wavy', brow: 0.3, browSkew: 0.7, look: [0.3, 0.15] },

  happy: { eyes: 'squint', mouth: 'bigSmile', brow: 0.25 },

  focused: { eyes: 'squint', mouth: 'flat', brow: -0.5, look: [0.1, 0] },

  suspicious: { eyes: 'squint', mouth: 'smirk', brow: -0.3, browSkew: 1, look: [-0.45, 0] },

  shocked: { eyes: 'wide', mouth: 'gasp', brow: 1, mouthScale: 1.15 },

  exhausted: { eyes: 'tired', mouth: 'frown', brow: -0.15, look: [0, 0.3], sweat: true },

  horrified: { eyes: 'wide', mouth: 'gasp', brow: 0.85, mouthScale: 1.35, sweat: true },

  smug: { eyes: 'squint', mouth: 'smirk', brow: -0.1 },

  /** Spiral eyes — over-stimulated, used at the peak of the immersion scene. */
  dizzy: { eyes: 'dizzy', mouth: 'wavy', brow: 0.2 },

  /** Eyes shut, content — the modern-casino relief beat. */
  content: { eyes: 'closed', mouth: 'smile', brow: 0.2 },

  /** Deadpan straight-to-camera. The channel's house look. */
  deadpan: { eyes: 'dots', mouth: 'flat', brow: 0 },
} satisfies Record<string, Expression>;

export type ExpressionName = keyof typeof EXPRESSIONS;

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS) as ExpressionName[];
