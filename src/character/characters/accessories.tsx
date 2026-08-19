/**
 * accessories.tsx — the costume overlay system.
 *
 * Costumes are ADDITIVE. An overlay is drawn on top of a finished, canonical character in
 * the local space of an attachment slot; it never replaces the character's geometry. That
 * is what makes "Bill as a medieval peasant" still obviously Bill — the head shape, the
 * hair, the glasses and the proportions are all still underneath, and those are four of
 * his nine identity anchors.
 *
 * The exception is `hidesHair`, which a FULL helmet needs and a cap does not. Reach for it
 * rarely: hiding Bill's hair removes one of his two strongest silhouette cues, and if the
 * glasses also go, nothing is left that says Bill.
 *
 * Deliberately only two overlays ship with V1.0. The system is the deliverable; a costume
 * wardrobe is episode work, and building twenty now would be twenty guesses about episodes
 * that have not been written.
 */

import { RoughAsset } from '../../assets/RoughAsset';
import { roundedRect, type AssetDef } from '../../assets/shapes';
import { PALETTE } from '../../style/tokens';
import { hand } from '../ink';
import type { AccessoryDef, Build, CharacterPalette } from '../types';

// ---------------------------------------------------------------------------
// head slot — local origin is the centre of the head
// ---------------------------------------------------------------------------

/**
 * A hard hat. Sits ON the mop rather than replacing it, so the side locks still flare out
 * underneath and the silhouette stays recognisable.
 */
const hardHatDef = (b: Build): AssetDef => {
  const y = -b.headHH - 4;
  const w = b.headHW + 6;
  return {
    id: 'acc-hardhat',
    shapes: [
      {
        k: 'path',
        d: `M ${-w} ${y + 4} C ${-w + 4} ${y - 30} ${w - 4} ${y - 30} ${w} ${y + 4} Z`,
        fill: PALETTE.gold,
        stroke: PALETTE.ink,
        rough: 'character',
        sw: 3.8,
      },
      // brim, wider than the dome so it reads at small size
      {
        ...roundedRect(-w - 8, y + 1, (w + 8) * 2, 8, 4),
        fill: PALETTE.gold,
        stroke: PALETTE.ink,
        rough: 'detail',
        sw: 3.2,
        roughness: 0.8,
        single: true,
      },
      // centre ridge, the one detail that says "hard hat" rather than "bowl"
      { k: 'line', x1: 0, y1: y - 22, x2: 0, y2: y + 2, stroke: PALETTE.ink, sw: 2.4, rough: 'detail', roughness: 0.5, single: true },
    ],
  };
};

// ---------------------------------------------------------------------------
// torso slot — local origin is the centre of the torso
// ---------------------------------------------------------------------------

/** An office tie. The cheapest possible "Bill has a job now" signal. */
const tieDef = (b: Build): AssetDef => {
  const collar = b.torsoTop - (b.torsoTop + b.torsoBottom) / 2;
  return {
    id: 'acc-tie',
    shapes: [
      { k: 'polygon', pts: [[-5, collar + 2], [5, collar + 2], [3, collar + 9], [-3, collar + 9]], fill: PALETTE.coral, stroke: PALETTE.ink, rough: 'detail', sw: 2.4, roughness: 0.7, single: true },
      { k: 'polygon', pts: [[-3, collar + 9], [3, collar + 9], [6, collar + 30], [0, collar + 38], [-6, collar + 30]], fill: PALETTE.coral, stroke: PALETTE.ink, rough: 'detail', sw: 2.6, roughness: 0.8, single: true },
    ],
  };
};

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

const overlay = (
  id: string,
  slot: AccessoryDef['slot'],
  build: (b: Build, p: CharacterPalette) => AssetDef,
  hidesHair = false,
): AccessoryDef => ({
  id,
  slot,
  hidesHair,
  render: ({ build: b, palette, seed }) => <RoughAsset def={hand(build(b, palette))} variant={`${seed}:${id}`} />,
});

/**
 * Overlays any humanoid can wear. Kept in one table rather than per character, because a
 * hard hat is a hard hat — duplicating it five times is exactly the drift this system
 * exists to prevent.
 */
export const SHARED_ACCESSORIES: Record<string, AccessoryDef> = {
  hardHat: overlay('hardHat', 'head', (b) => hardHatDef(b)),
  tie: overlay('tie', 'torso', (b) => tieDef(b)),
};

export const BILL_ACCESSORIES = SHARED_ACCESSORIES;
export const MINA_ACCESSORIES = SHARED_ACCESSORIES;
export const DEX_ACCESSORIES = SHARED_ACCESSORIES;
export const GUS_ACCESSORIES = SHARED_ACCESSORIES;

/** Mochi wears nothing. A cat in a hard hat is a different joke and a different episode. */
export const MOCHI_ACCESSORIES: Record<string, AccessoryDef> = {};
