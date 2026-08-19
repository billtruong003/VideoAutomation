/**
 * hair.ts — the strongest silhouette anchor each character has.
 *
 * Hair is authored as ONE filled path per character, in head-local space, with the shape
 * doing all the work and Rough.js supplying the hand. It is not a bundle of strokes: a
 * stroke bundle has no silhouette, and the silhouette test is the acceptance gate that
 * decides whether the cast is distinguishable at thumbnail size.
 *
 * Every path is authored so that:
 *   - the outer edge extends PAST the skull, so hair is visible in pure-black silhouette
 *   - the inner edge ends above the brow line, so it never eats the face
 *   - the left and right halves differ, because symmetric hair reads as a wig
 *
 * Head-local space for reference (Bill): x -48..48, y -43..43. Brows live at y ≈ -15,
 * so the bang tips stop around y = -19.
 */

import type { AssetDef, Shape } from '../../assets/shapes';
import type { CharacterPalette, HairId } from '../types';

type HairSpec = { main: Shape[]; /** Drawn last, offset by `MOUSTACHE_AT`. */ moustache?: Shape };

const filledPath = (d: string, palette: CharacterPalette, fill?: string): Shape => ({
  k: 'path',
  d,
  fill: fill ?? palette.hair,
  stroke: palette.outline,
  rough: 'character',
  sw: 4.0,
});

const shadeStroke = (pts: [number, number][], palette: CharacterPalette, sw = 2.6): Shape => ({
  k: 'stroke',
  pts,
  pen: 'hair',
  size: sw,
  color: palette.hairShade,
});

// ---------------------------------------------------------------------------
// Bill — the messy silver mop
// ---------------------------------------------------------------------------

/**
 * A broad soft mop with chunky irregular bangs and side locks that flare past the skull.
 *
 * Explicitly NOT anime spikes, and it took two passes to get there. The first version
 * ended each bang in a point; the second shortened the flats but kept five clusters, and
 * Rough.js exaggerates every corner it is given, so a row of five short flats still read
 * as a row of small triangles.
 *
 * What works is FEWER clusters with WIDER flats: three blunt lobes 9-10 units across,
 * separated by three notches, at uneven depths (-21, -24, -22). Wide enough that the
 * roughening rounds them rather than sharpening them.
 *
 * The whole bang line sits above y=-21, keeping clearance over the brows at y=-19.
 */
const BILL_HAIR_D =
  // outer silhouette, left lock -> over the crown -> right lock
  'M -52 10 C -59 -8 -57 -30 -46 -43 ' +
  'C -34 -55 -13 -59 5 -57 ' +
  'C 25 -55 43 -46 51 -30 ' +
  'C 56 -18 55 -4 52 12 ' +
  // inner edge: three blunt bang clusters, right to left
  'L 45 -6 L 43 -33 L 33 -21 L 24 -22 L 18 -35 ' +
  'L 6 -24 L -4 -25 L -12 -36 L -24 -22 L -34 -23 L -44 -33 L -47 -8 Z';

const billHair = (p: CharacterPalette): HairSpec => ({
  main: [
    filledPath(BILL_HAIR_D, p),
    // the parting: one recognisable interruption near the top, off-centre on purpose
    shadeStroke([[-14, -52], [-9, -42], [-11, -33]], p, 3.0),
    shadeStroke([[16, -50], [21, -40]], p, 2.4),
  ],
});

// ---------------------------------------------------------------------------
// Mina — the smooth bob
// ---------------------------------------------------------------------------

/**
 * Shoulder-length, rounded, tidy, with one prominent fringe across the forehead.
 *
 * The bob hangs BELOW the jaw on both sides, which is what separates her silhouette from
 * Bill's mop and Dex's spikes even when all three are flattened to black.
 *
 * The first version let the fringe sweep down past the cheekbone on the left, and on the
 * cast line-up it read as a hood pushed to one side rather than as hair. The fringe now
 * crosses the forehead and stops at the temple; the asymmetry lives in its ANGLE, which is
 * enough to keep her from looking like a wig.
 */
const MINA_HAIR_D =
  'M -49 40 C -57 12 -55 -22 -41 -37 ' +
  'C -26 -51 16 -53 34 -41 ' +
  'C 49 -31 52 8 49 40 ' +
  // inner edge: face opening. The fringe crosses the FOREHEAD and stops there.
  'L 36 34 C 39 6 42 -16 30 -25 ' +
  'C 16 -33 -6 -30 -20 -27 ' +
  'C -30 -25 -35 -6 -36 34 Z';

const minaHair = (p: CharacterPalette): HairSpec => ({
  main: [
    filledPath(MINA_HAIR_D, p),
    shadeStroke([[26, -33], [4, -30], [-16, -28]], p, 2.6),
  ],
});

// ---------------------------------------------------------------------------
// Dex — the directional spikes
// ---------------------------------------------------------------------------

/**
 * Short, dark, chunky and all leaning the same way.
 *
 * The direction is the point: Bill's hair is a soft blob, Mina's is a smooth curve, and
 * Dex's is a set of hard diagonals. Three completely different silhouette languages, which
 * is what makes the black-fill test pass.
 */
const DEX_HAIR_D =
  'M -45 -6 L -43 -30 L -53 -42 L -31 -35 ' +
  'L -27 -52 L -11 -37 ' +
  'L -4 -58 L 11 -39 ' +
  'L 21 -55 L 31 -35 ' +
  'L 45 -47 L 44 -22 L 48 -4 ' +
  // inner edge
  'L 35 -20 L 23 -31 L 9 -22 L -5 -33 L -19 -21 L -33 -30 Z';

const dexHair = (p: CharacterPalette): HairSpec => ({
  main: [
    filledPath(DEX_HAIR_D, p),
    shadeStroke([[-20, -30], [-6, -44]], p, 2.4),
    shadeStroke([[12, -28], [24, -44]], p, 2.4),
  ],
});

// ---------------------------------------------------------------------------
// Gus — the receding grey
// ---------------------------------------------------------------------------

/**
 * A thin band over the crown and two side tufts, with a real bald gap at the front.
 *
 * Age in this drawing language is a hairline, not wrinkles. Wrinkles would need line
 * detail the style cannot carry at phone size; a receding silhouette survives being
 * shrunk to 30%.
 */
const GUS_HAIR_D =
  'M -52 -4 C -54 -24 -44 -39 -26 -42 ' +
  'C -8 -45 14 -44 30 -38 ' +
  'C 45 -32 53 -18 51 -4 ' +
  // inner edge dips low in the middle: that dip IS the receding hairline
  'L 41 -12 C 36 -25 22 -28 6 -27 ' +
  'C -10 -26 -28 -27 -38 -14 Z';

/** Side tufts, drawn as their own lumps so they flare past the skull. */
const GUS_TUFT_L = 'M -50 -12 C -60 -6 -60 12 -50 16 C -44 12 -44 -6 -50 -12 Z';
const GUS_TUFT_R = 'M 50 -12 C 60 -6 60 12 50 16 C 44 12 44 -6 50 -12 Z';

/**
 * The moustache. One shape, always the same shape.
 *
 * Simple deliberately — it has to survive being eight pixels wide — but the first version
 * was a plump bar with a soft dip and, sitting just above the mouth in light grey, it read
 * as a pair of lips. This one is flatter, wider, and the ends taper DOWNWARD past the
 * body of it, which is the shape the eye actually reads as a moustache.
 */
export const GUS_MOUSTACHE_D =
  'M -16 2 C -11 -4 -5 -5 0 -2 C 5 -5 11 -4 16 2 C 11 3 6 2 0 3 C -6 2 -11 3 -16 2 Z';

const gusHair = (p: CharacterPalette): HairSpec => ({
  main: [filledPath(GUS_TUFT_L, p), filledPath(GUS_TUFT_R, p), filledPath(GUS_HAIR_D, p)],
  moustache: {
    k: 'path',
    d: GUS_MOUSTACHE_D,
    fill: p.hair,
    stroke: p.outline,
    rough: 'detail',
    sw: 2.4,
    roughness: 0.7,
    single: true,
  },
});

// ---------------------------------------------------------------------------
// NPCs — the plain cap
// ---------------------------------------------------------------------------

/**
 * A short, smooth, entirely unremarkable cap of hair.
 *
 * This is the shape an NPC gets, and its blandness is the feature. The four cast members
 * each own a silhouette language — blob, curve, spike, receding — and this one is
 * deliberately none of them, so a casino manager or an airline worker can never be
 * mistaken for Bill, Mina, Dex or Gus at a glance.
 */
const NPC_HAIR_D =
  'M -46 -4 C -48 -26 -34 -42 -12 -44 ' +
  'C 12 -46 34 -36 45 -18 C 48 -12 47 -6 46 -2 ' +
  'L 38 -12 C 28 -26 6 -30 -12 -27 C -28 -25 -38 -18 -40 -4 Z';

const npcHair = (p: CharacterPalette): HairSpec => ({ main: [filledPath(NPC_HAIR_D, p)] });

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

const BUILDERS: Record<HairId, (p: CharacterPalette) => HairSpec> = {
  bill: billHair,
  mina: minaHair,
  dex: dexHair,
  gus: gusHair,
  npc: npcHair,
};

export type { HairId } from '../types';

/**
 * Where a character's moustache sits, if they have one.
 *
 * It rides inside the hair asset rather than being a separate part, so it shares the
 * hair's seed and can never drift away from the rest of the face between renders.
 */
export const MOUSTACHE_AT: Partial<Record<HairId, [number, number]>> = { gus: [0, 14] };

export function hairDef(id: HairId, palette: CharacterPalette): AssetDef {
  const spec = BUILDERS[id](palette);
  const shapes: Shape[] = [...spec.main];

  if (spec.moustache) {
    const [mx, my] = MOUSTACHE_AT[id] ?? [0, 0];
    shapes.push({ k: 'group', shapes: [spec.moustache], transform: `translate(${mx} ${my})` });
  }

  return { id: `hair-${id}`, shapes };
}

/**
 * A paper-coloured copy of the same silhouette, drawn underneath the real hair.
 *
 * Without it a dark-haired character standing on a dark background loses their outer
 * edge entirely, and the outer edge is the identity. Fatter stroke, paper fill, same
 * path — so the halo can never disagree with the hair it is protecting.
 */
export function hairHaloDef(id: HairId, paper: string): AssetDef {
  const flat: CharacterPalette = {
    skin: paper, skinShade: paper, hair: paper, hairShade: paper,
    shirt: paper, shirtShade: paper, pants: paper, shoe: paper, outline: paper,
  };
  const def = hairDef(id, flat);
  const fatten = (sh: Shape): Shape =>
    sh.k === 'group' ? { ...sh, shapes: sh.shapes.map(fatten) } : { ...sh, sw: (sh.sw ?? 4) + 5 };
  return { id: `${def.id}-halo`, shapes: def.shapes.map(fatten) };
}

/** Pure-black version, for the silhouette QA sheet. */
export function hairSilhouetteDef(id: HairId, ink: string): AssetDef {
  const flat: CharacterPalette = {
    skin: ink, skinShade: ink, hair: ink, hairShade: ink,
    shirt: ink, shirtShade: ink, pants: ink, shoe: ink, outline: ink,
  };
  const def = hairDef(id, flat);
  return { id: `${def.id}-silhouette`, shapes: def.shapes };
}
