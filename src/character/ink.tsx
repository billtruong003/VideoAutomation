/**
 * ink.tsx — the one pen every cast member is drawn with.
 *
 * Two helpers, and every mark on every character goes through one of them:
 *
 *   `hand(def)`    structural geometry — head, torso, glasses, shorts, hands, feet
 *   `<Ink/>`       gestural marks — limbs, hair strands, brows, mouths, closed eyes
 *
 * Both are the SAME Rough.js stylizer with different presets. There is no second drawing
 * engine and there will not be one: an earlier revision routed gestures to a variable-width
 * stroke library and the drawing visibly had two hands in it, half of which ignored the
 * style switch. See `PEN` in style/tokens.ts.
 *
 * CACHING CONTRACT: everything here is authored at the ORIGIN and moved into place with a
 * transform. Generating a hand at its posed coordinates instead would mint a fresh cache
 * entry every frame and the linework would boil.
 */

import React from 'react';
import { RoughShapes } from '../assets/RoughAsset';
import type { AssetDef, Shape } from '../assets/shapes';
import {
  CHARACTER_HAND,
  CHARACTER_ROUGH_SCALE,
  CHARACTER_SINGLE_PASS,
  PALETTE,
  PEN,
  ROUGH,
  type PenToken,
} from '../style/tokens';
import type { Point } from '../lib/pathpoints';

/**
 * Apply the character hand to an asset definition.
 *
 * Roughness is scaled at render time rather than baked into the module-level defs, so the
 * geometry stays one canonical description and the cache still keys on the resulting
 * options. The id is namespaced by mode so the four variants can coexist in one cache.
 *
 * At `rough` this is a no-op and the character draws with the same hand as the world.
 */
export function hand(def: AssetDef): AssetDef {
  if (CHARACTER_HAND === 'rough') return def;
  return {
    id: `${def.id}@${CHARACTER_HAND}`,
    shapes: def.shapes.map(scaleShape),
  };
}

function scaleShape(sh: Shape): Shape {
  if (sh.k === 'group') return { ...sh, shapes: sh.shapes.map(scaleShape) };
  if (sh.k === 'stroke') {
    const pen = PEN[sh.pen ?? 'face'];
    return {
      ...sh,
      roughness: (sh.roughness ?? pen.roughness) * CHARACTER_ROUGH_SCALE,
      bowing: (sh.bowing ?? pen.bowing) * CHARACTER_ROUGH_SCALE,
    };
  }
  const token = ROUGH[sh.rough ?? 'prop'];
  return {
    ...sh,
    roughness: (sh.roughness ?? token.roughness) * CHARACTER_ROUGH_SCALE,
    bowing: (sh.bowing ?? token.bowing) * CHARACTER_ROUGH_SCALE,
    single: CHARACTER_SINGLE_PASS,
  };
}

export type InkProps = {
  pts: Point[];
  pen?: PenToken;
  /** Stroke width override. */
  size?: number;
  color?: string;
  /** Stable identity for the Rough.js seed. Must be unique per mark per character. */
  seed: string;
  opacity?: number;
};

/** One gestural mark, dialled to the current character hand. */
export const Ink: React.FC<InkProps> = ({ pts, pen = 'face', size, color = PALETTE.ink, seed, opacity }) => {
  const preset = PEN[pen];
  return (
    <RoughShapes
      id={CHARACTER_HAND === 'rough' ? seed : `${seed}@${CHARACTER_HAND}`}
      shapes={[
        {
          k: 'stroke',
          pts,
          pen,
          size,
          color,
          opacity,
          ...(CHARACTER_HAND === 'rough'
            ? {}
            : {
                roughness: preset.roughness * CHARACTER_ROUGH_SCALE,
                bowing: preset.bowing * CHARACTER_ROUGH_SCALE,
              }),
        },
      ]}
    />
  );
};

/**
 * A gestural mark with a paper-coloured mark of the same shape underneath it.
 *
 * This is what makes a limb readable when it crosses the shirt, and what makes a
 * character survive a dark background. It is a halo, not an outline: the paper stroke is
 * wider and drawn first, so the ink keeps a clean rim of separation on every side.
 */
export const InkHalo: React.FC<InkProps & { haloSize: number; halo?: boolean }> = ({
  haloSize,
  halo = true,
  ...props
}) => (
  <>
    {halo && <Ink {...props} size={haloSize} color={PALETTE.paper} seed={`${props.seed}:halo`} />}
    <Ink {...props} />
  </>
);
