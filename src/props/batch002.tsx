/**
 * batch002.tsx — the objects Batch 002 is about.
 *
 * Twenty episodes, each built around one everyday thing, so each needs that thing drawn. The
 * library already covers rooms, characters, marks and diagram furniture; what it cannot supply
 * is a tape measure hook or a reeded coin edge.
 *
 * AUTHORED CLEAN, which is the V2 contract and now also the shipping look: a padlock is a body,
 * a shackle, a pin stack and a hole, stated as plain geometry. The stylizer decides how it is
 * drawn; this file only decides what it IS. Nothing here asks to be sketchy.
 *
 * Every prop that has a "before and after" — a lock that drains or does not, a bottle that
 * blocks light or does not, a seat with a gap or without — takes that as a BOOLEAN rather than
 * being two props. The episodes are built on comparison, and a shared outline with one thing
 * different is what makes a comparison read.
 */

import React from 'react';
import { PropFrame, type PropArgs } from '../assets/PropFrame';
import { RoughAsset } from '../assets/RoughAsset';
import { roundedRect, type AssetDef, type Pt, type Shape } from '../assets/shapes';
import { PALETTE } from '../style/tokens';

const INK = PALETTE.ink;
const P = PALETTE;

/** Shorthand for the very common "filled shape with an ink outline". */
const solid = (fill: string) => ({ fill, stroke: INK });

/* ============================================================ 01 tape measure */

const tapeDef = (hookOut: number, showDim: boolean): AssetDef => ({
  id: 'b2-tape-measure',
  size: { w: 300, h: 160 },
  shapes: [
    // case
    { ...roundedRect(-140, -60, 150, 120, 16), ...solid(P.gold) },
    { k: 'circle', cx: -65, cy: 0, r: 30, fill: P.paperShade, stroke: INK },
    // blade
    { k: 'rect', x: 10, y: -18, w: 120, h: 36, ...solid(P.paper) },
    { k: 'line', x1: 10, y1: 10, x2: 130, y2: 10, stroke: INK, sw: 1.6 },
    ...[30, 55, 80, 105].map((x): Shape => ({
      k: 'line', x1: x, y1: -18, x2: x, y2: -2, stroke: INK, sw: 1.6,
    })),
    // the hook — an L, sliding along the blade by `hookOut`
    {
      k: 'group',
      transform: `translate(${hookOut} 0)`,
      shapes: [
        { k: 'rect', x: 128, y: -26, w: 10, h: 52, ...solid(P.grey) },
        { k: 'rect', x: 128, y: 16, w: 26, h: 10, ...solid(P.grey) },
      ],
    },
    ...(showDim
      ? ([
        { k: 'line', x1: 128, y1: -44, x2: 128 + hookOut, y2: -44, stroke: P.teal, sw: 3 },
        { k: 'line', x1: 128, y1: -50, x2: 128, y2: -38, stroke: P.teal, sw: 3 },
        { k: 'line', x1: 128 + hookOut, y1: -50, x2: 128 + hookOut, y2: -38, stroke: P.teal, sw: 3 },
      ] as Shape[])
      : []),
  ],
});

export const TapeMeasure: React.FC<PropArgs & { hookOut?: number; showDim?: boolean }> = ({
  hookOut = 0, showDim = false, seed = 'tape', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={tapeDef(hookOut, showDim)} variant={`${seed}:${hookOut}:${showDim}`} />
  </PropFrame>
);

/** A board end, or an inside corner — the two things a tape gets measured against. */
const boardDef = (corner: boolean): AssetDef => ({
  id: 'b2-board',
  size: { w: 220, h: 260 },
  shapes: corner
    ? [
      { k: 'polygon', pts: [[-100, -120], [100, -120], [100, 120], [60, 120], [60, -80], [-100, -80]] as Pt[], ...solid(P.paperShade) },
    ]
    : [{ k: 'rect', x: -100, y: -60, w: 200, h: 120, ...solid(P.paperShade) }],
});

export const BoardEdge: React.FC<PropArgs & { corner?: boolean }> = ({
  corner = false, seed = 'board', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={boardDef(corner)} variant={`${seed}:${corner}`} />
  </PropFrame>
);

/* ============================================================= 02 windshield */

const windshieldDef = (dotsLit: boolean, cracked: boolean): AssetDef => ({
  id: 'b2-windshield',
  size: { w: 420, h: 300 },
  shapes: [
    { k: 'polygon', pts: [[-190, -110], [190, -110], [160, 120], [-160, 120]] as Pt[], ...solid(P.paperShade) },
    // the solid frit band along the top
    { k: 'polygon', pts: [[-190, -110], [190, -110], [186, -76], [-186, -76]] as Pt[], fill: INK, stroke: INK },
    // the dot gradient, thinning downward
    ...[0, 1, 2, 3].flatMap((row): Shape[] =>
      Array.from({ length: 9 - row * 2 }, (_, i): Shape => ({
        k: 'circle',
        cx: -150 + i * (300 / Math.max(1, 8 - row * 2)),
        cy: -66 + row * 13,
        r: 7 - row * 1.4,
        fill: dotsLit ? P.teal : INK,
        stroke: 'none',
      }))),
    ...(cracked
      ? ([{ k: 'polyline', pts: [[-60, -76], [-40, -30], [-70, 20], [-30, 70]] as Pt[], stroke: P.coral, sw: 4, fill: 'none' }] as Shape[])
      : []),
  ],
});

export const Windshield: React.FC<PropArgs & { dotsLit?: boolean; cracked?: boolean }> = ({
  dotsLit = false, cracked = false, seed = 'windshield', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={windshieldDef(dotsLit, cracked)} variant={`${seed}:${dotsLit}:${cracked}`} />
  </PropFrame>
);

/** Glass edge in section: glass, ceramic layer, adhesive bead, body. */
const glassLayersDef = (shielded: boolean): AssetDef => ({
  id: 'b2-glass-layers',
  size: { w: 340, h: 200 },
  shapes: [
    { k: 'rect', x: -150, y: -70, w: 300, h: 26, ...solid(P.paperShade) },
    { k: 'rect', x: -150, y: -44, w: 300, h: 14, fill: INK, stroke: INK },
    { k: 'rect', x: -150, y: -30, w: 300, h: 22, ...solid(shielded ? P.teal : P.grey) },
    { k: 'rect', x: -150, y: -8, w: 300, h: 30, ...solid(P.gold) },
  ],
});

export const GlassLayers: React.FC<PropArgs & { shielded?: boolean }> = ({
  shielded = true, seed = 'glass-layers', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={glassLayersDef(shielded)} variant={`${seed}:${shielded}`} />
  </PropFrame>
);

/* =================================================================== 03 coin */

const coinDef = (edgeOn: boolean, reeded: boolean, shaved: boolean, silver: boolean): AssetDef => ({
  id: 'b2-coin',
  size: { w: 220, h: 220 },
  shapes: edgeOn
    ? [
      { k: 'rect', x: -22, y: -95, w: 44, h: 190, ...solid(silver ? P.paperShade : P.grey) },
      ...(reeded
        ? Array.from({ length: 17 }, (_, i): Shape => ({
          k: 'line',
          x1: -22, y1: -88 + i * 11, x2: 22, y2: -88 + i * 11,
          // the shaved flat: the pattern simply stops
          stroke: shaved && i > 11 ? 'none' : INK,
          sw: 2.4,
        }))
        : []),
      ...(shaved
        ? ([{ k: 'rect', x: -22, y: 40, w: 44, h: 55, fill: P.coral, stroke: P.coral, opacity: 0.35 }] as Shape[])
        : []),
    ]
    : [
      { k: 'circle', cx: 0, cy: 0, r: 88, ...solid(silver ? P.paperShade : P.grey) },
      { k: 'circle', cx: 0, cy: 0, r: 70, fill: 'none', stroke: INK, sw: 2 },
      { k: 'circle', cx: 0, cy: -14, r: 26, fill: 'none', stroke: INK, sw: 2.4 },
      { k: 'line', x1: -34, y1: 40, x2: 34, y2: 40, stroke: INK, sw: 2.4 },
    ],
});

export const Coin: React.FC<
  PropArgs & { edgeOn?: boolean; reeded?: boolean; shaved?: boolean; silver?: boolean }
> = ({ edgeOn = false, reeded = true, shaved = false, silver = true, seed = 'coin', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={coinDef(edgeOn, reeded, shaved, silver)} variant={`${seed}:${edgeOn}${reeded}${shaved}${silver}`} />
  </PropFrame>
);

const shearsDef = (open: boolean): AssetDef => ({
  id: 'b2-shears',
  size: { w: 200, h: 220 },
  shapes: [
    { k: 'polygon', pts: [[-6, -100], [6, -100], [open ? 34 : 12, 40], [open ? 22 : 2, 44]] as Pt[], ...solid(P.grey) },
    { k: 'polygon', pts: [[-6, -100], [6, -100], [open ? -12 : 10, 40], [open ? -24 : 0, 44]] as Pt[], ...solid(P.grey) },
    { k: 'circle', cx: 0, cy: 40, r: 9, fill: INK, stroke: INK },
  ],
});

export const Shears: React.FC<PropArgs & { open?: boolean }> = ({
  open = true, seed = 'shears', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={shearsDef(open)} variant={`${seed}:${open}`} />
  </PropFrame>
);

/* =================================================================== 04 foil */

const foilDef = (sheets: 1 | 2, torn: boolean, peeled: number): AssetDef => ({
  id: 'b2-foil',
  size: { w: 400, h: 200 },
  shapes: [
    // lower sheet — the dull-facing one
    {
      k: 'group',
      transform: `translate(0 ${peeled})`,
      shapes: [{ k: 'rect', x: -170, y: 0, w: 340, h: 16, ...solid(P.grey) }],
    },
    ...(sheets === 2
      ? ([{
        k: 'group',
        transform: `translate(0 ${-peeled})`,
        shapes: [{ k: 'rect', x: -170, y: -16, w: 340, h: 16, ...solid(P.paperShade) }],
      }] as Shape[])
      : []),
    ...(torn
      ? ([
        { k: 'polyline', pts: [[-10, -20], [4, 0], [-6, 14], [8, 30]] as Pt[], stroke: P.coral, sw: 4, fill: 'none' },
      ] as Shape[])
      : []),
  ],
});

export const FoilSheet: React.FC<PropArgs & { sheets?: 1 | 2; torn?: boolean; peeled?: number }> = ({
  sheets = 1, torn = false, peeled = 0, seed = 'foil', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={foilDef(sheets, torn, peeled)} variant={`${seed}:${sheets}${torn}${peeled}`} />
  </PropFrame>
);

const millDef = (): AssetDef => ({
  id: 'b2-mill',
  size: { w: 300, h: 300 },
  shapes: [
    { k: 'circle', cx: 0, cy: -70, r: 62, ...solid(P.paperShade) },
    { k: 'circle', cx: 0, cy: -70, r: 14, fill: INK, stroke: INK },
    { k: 'circle', cx: 0, cy: 70, r: 62, ...solid(P.paperShade) },
    { k: 'circle', cx: 0, cy: 70, r: 14, fill: INK, stroke: INK },
  ],
});

export const RollingMill: React.FC<PropArgs> = ({ seed = 'mill', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={millDef()} variant={seed} />
  </PropFrame>
);

/* ========================================================= 05 tactile paving */

const tactileDef = (kind: 'domes' | 'bars', lit: boolean): AssetDef => ({
  id: 'b2-tactile',
  size: { w: 260, h: 260 },
  shapes: [
    { k: 'rect', x: -120, y: -120, w: 240, h: 240, ...solid(lit ? P.gold : P.paperShade) },
    ...(kind === 'domes'
      ? [0, 1, 2, 3].flatMap((r): Shape[] =>
        [0, 1, 2, 3].map((c): Shape => ({
          k: 'circle', cx: -84 + c * 56, cy: -84 + r * 56, r: 16, ...solid(P.paper),
        })))
      : [0, 1, 2, 3].map((c): Shape => ({
        k: 'rect', x: -100 + c * 56, y: -100, w: 30, h: 200, ...solid(P.paper),
      }))),
  ],
});

export const TactileTile: React.FC<PropArgs & { kind?: 'domes' | 'bars'; lit?: boolean }> = ({
  kind = 'domes', lit = true, seed = 'tactile', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={tactileDef(kind, lit)} variant={`${seed}:${kind}:${lit}`} />
  </PropFrame>
);

const caneDef = (): AssetDef => ({
  id: 'b2-cane',
  size: { w: 80, h: 300 },
  shapes: [
    { k: 'rect', x: -6, y: -140, w: 12, h: 250, ...solid(P.paper) },
    { k: 'rect', x: -6, y: -140, w: 12, h: 60, ...solid(P.coral) },
    { k: 'circle', cx: 0, cy: 118, r: 16, ...solid(P.grey) },
  ],
});

export const CaneTip: React.FC<PropArgs> = ({ seed = 'cane', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={caneDef()} variant={seed} />
  </PropFrame>
);

/* ============================================================== 06 lavatory */

const lavDoorDef = (ashtrayLit: boolean, signLit: boolean): AssetDef => ({
  id: 'b2-lav-door',
  size: { w: 320, h: 520 },
  shapes: [
    { ...roundedRect(-140, -240, 280, 480, 14), ...solid(P.paperShade) },
    { ...roundedRect(-90, -210, 180, 60, 8), ...solid(signLit ? P.coral : P.grey) },
    { k: 'line', x1: -70, y1: -180, x2: 70, y2: -180, stroke: P.paper, sw: 5 },
    // the ashtray, set into the door
    { ...roundedRect(-40, -70, 80, 46, 6), ...solid(ashtrayLit ? P.teal : P.grey) },
    { k: 'line', x1: -26, y1: -50, x2: 26, y2: -50, stroke: INK, sw: 3 },
    { k: 'circle', cx: 108, cy: 30, r: 12, fill: INK, stroke: INK },
  ],
});

export const LavDoor: React.FC<PropArgs & { ashtrayLit?: boolean; signLit?: boolean }> = ({
  ashtrayLit = false, signLit = true, seed = 'lav-door', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={lavDoorDef(ashtrayLit, signLit)} variant={`${seed}:${ashtrayLit}${signLit}`} />
  </PropFrame>
);

const binDef = (glowing: boolean): AssetDef => ({
  id: 'b2-waste-bin',
  size: { w: 200, h: 240 },
  shapes: [
    { k: 'polygon', pts: [[-70, -100], [70, -100], [56, 110], [-56, 110]] as Pt[], ...solid(P.paperShade) },
    ...[0, 1, 2].map((i): Shape => ({
      k: 'rect', x: -46 + i * 32, y: -118, w: 24, h: 26, ...solid(glowing ? P.coral : P.paper),
    })),
  ],
});

export const WasteBin: React.FC<PropArgs & { glowing?: boolean }> = ({
  glowing = false, seed = 'bin', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={binDef(glowing)} variant={`${seed}:${glowing}`} />
  </PropFrame>
);

const cigDef = (lit: boolean): AssetDef => ({
  id: 'b2-cigarette',
  size: { w: 160, h: 40 },
  shapes: [
    { k: 'rect', x: -70, y: -8, w: 110, h: 16, ...solid(P.paper) },
    { k: 'rect', x: 40, y: -8, w: 30, h: 16, ...solid(P.gold) },
    ...(lit ? ([{ k: 'circle', cx: -74, cy: 0, r: 8, fill: P.coral, stroke: 'none' }] as Shape[]) : []),
  ],
});

export const Cigarette: React.FC<PropArgs & { lit?: boolean }> = ({
  lit = true, seed = 'cig', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={cigDef(lit)} variant={`${seed}:${lit}`} />
  </PropFrame>
);

/* ========================================================= 07 car rear lamps */

const carRearDef = (high: boolean, low: boolean, tail: boolean): AssetDef => ({
  id: 'b2-car-rear',
  size: { w: 460, h: 340 },
  shapes: [
    { ...roundedRect(-210, -140, 420, 280, 22), ...solid(P.paperShade) },
    { ...roundedRect(-160, -120, 320, 96, 12), ...solid(P.grey) },
    // the third lamp: high and centred, dark until braking
    { ...roundedRect(-52, -34, 104, 22, 6), ...solid(high ? P.coral : P.grey) },
    // the original pair: low and wide
    { ...roundedRect(-190, 46, 108, 56, 10), ...solid(low ? P.coral : tail ? P.gold : P.grey) },
    { ...roundedRect(82, 46, 108, 56, 10), ...solid(low ? P.coral : tail ? P.gold : P.grey) },
  ],
});

export const CarRear: React.FC<PropArgs & { high?: boolean; low?: boolean; tail?: boolean }> = ({
  high = false, low = false, tail = true, seed = 'car-rear', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={carRearDef(high, low, tail)} variant={`${seed}:${high}${low}${tail}`} />
  </PropFrame>
);

/* ================================================================ 08 sneaker */

const sneakerDef = (locked: boolean, heelLift: number): AssetDef => ({
  id: 'b2-sneaker',
  size: { w: 420, h: 260 },
  shapes: [
    { k: 'path', d: 'M -180 70 L -180 10 Q -120 -30 -50 -40 L 40 -46 Q 120 -40 170 20 L 180 70 Z', ...solid(P.paperShade) },
    { k: 'rect', x: -184, y: 64, w: 368, h: 26, ...solid(P.grey) },
    // eyelet row, with the extra one set back
    ...[0, 1, 2, 3].map((i): Shape => ({
      k: 'circle', cx: -30 + i * 40, cy: -20 - i * 2, r: 6, fill: INK, stroke: 'none',
    })),
    { k: 'circle', cx: 124, cy: -34, r: 8, fill: locked ? P.teal : P.coral, stroke: INK },
    // laces
    ...[0, 1, 2].map((i): Shape => ({
      k: 'line', x1: -30 + i * 40, y1: -20 - i * 2, x2: 10 + i * 40, y2: -22 - i * 2, stroke: INK, sw: 3,
    })),
    ...(locked
      ? ([
        { k: 'curve', pts: [[124, -34], [150, -60], [110, -70]] as Pt[], stroke: P.teal, sw: 4, fill: 'none' },
        { k: 'curve', pts: [[110, -70], [70, -50], [90, -34]] as Pt[], stroke: P.teal, sw: 4, fill: 'none' },
      ] as Shape[])
      : []),
    // the heel, lifting or seated
    {
      k: 'group',
      transform: `translate(0 ${-heelLift})`,
      shapes: [{ k: 'ellipse', cx: 140, cy: 20, rx: 34, ry: 42, fill: P.gold, stroke: INK }],
    },
    ...(heelLift > 4
      ? ([{ k: 'circle', cx: 168, cy: 30, r: 14, fill: P.coral, stroke: 'none', opacity: 0.6 }] as Shape[])
      : []),
  ],
});

export const Sneaker: React.FC<PropArgs & { locked?: boolean; heelLift?: number }> = ({
  locked = false, heelLift = 0, seed = 'sneaker', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={sneakerDef(locked, heelLift)} variant={`${seed}:${locked}:${heelLift}`} />
  </PropFrame>
);

/* ================================================================ 09 padlock */

const padlockDef = (section: boolean, flooded: boolean, rusted: boolean, draining: boolean): AssetDef => ({
  id: 'b2-padlock',
  size: { w: 260, h: 340 },
  shapes: [
    { k: 'path', d: 'M -62 -30 L -62 -90 Q -62 -150 0 -150 Q 62 -150 62 -90 L 62 -30', fill: 'none', stroke: INK, sw: 10 },
    { ...roundedRect(-90, -30, 180, 170, 16), ...solid(P.gold) },
    ...(section
      ? ([
        // pin stack
        ...[0, 1, 2].map((i): Shape => ({
          k: 'rect', x: -40 + i * 34, y: -10, w: 16, h: 54,
          ...solid(rusted ? P.coral : P.grey),
        })),
        ...(flooded
          ? ([{ k: 'rect', x: -78, y: 60, w: 156, h: 66, fill: P.teal, stroke: 'none', opacity: 0.55 }] as Shape[])
          : []),
      ] as Shape[])
      : ([{ k: 'circle', cx: 0, cy: 40, r: 26, fill: P.paperShade, stroke: INK }] as Shape[])),
    // the drain hole
    { k: 'circle', cx: 0, cy: 132, r: 11, fill: P.paper, stroke: INK },
    ...(draining
      ? ([
        { k: 'ellipse', cx: 0, cy: 166, rx: 8, ry: 13, fill: P.teal, stroke: 'none' },
        { k: 'ellipse', cx: 0, cy: 196, rx: 6, ry: 10, fill: P.teal, stroke: 'none', opacity: 0.7 },
      ] as Shape[])
      : []),
  ],
});

export const Padlock: React.FC<
  PropArgs & { section?: boolean; flooded?: boolean; rusted?: boolean; draining?: boolean }
> = ({ section = false, flooded = false, rusted = false, draining = false, seed = 'padlock', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={padlockDef(section, flooded, rusted, draining)} variant={`${seed}:${section}${flooded}${rusted}${draining}`} />
  </PropFrame>
);

/* ================================================================ 10 ferrite */

const cableDef = (lumpLit: boolean, noisy: boolean): AssetDef => ({
  id: 'b2-charger-cable',
  size: { w: 480, h: 160 },
  shapes: [
    { k: 'curve', pts: [[-220, 20], [-90, -20], [60, 20], [210, -14]] as Pt[], stroke: INK, sw: 9, fill: 'none' },
    { ...roundedRect(-60, -28, 108, 52, 18), ...solid(lumpLit ? P.teal : P.grey) },
    ...(noisy
      ? ([{
        k: 'polyline',
        pts: [[-210, -46], [-186, -66], [-162, -40], [-138, -68], [-114, -42], [-90, -64]] as Pt[],
        stroke: P.coral, sw: 4, fill: 'none',
      }] as Shape[])
      : []),
  ],
});

export const ChargerCable: React.FC<PropArgs & { lumpLit?: boolean; noisy?: boolean }> = ({
  lumpLit = false, noisy = false, seed = 'cable', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={cableDef(lumpLit, noisy)} variant={`${seed}:${lumpLit}${noisy}`} />
  </PropFrame>
);

const ferriteRingDef = (hot: boolean): AssetDef => ({
  id: 'b2-ferrite-ring',
  size: { w: 240, h: 240 },
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: 92, ...solid(hot ? P.coral : P.grey) },
    { k: 'circle', cx: 0, cy: 0, r: 40, fill: P.paper, stroke: INK },
  ],
});

export const FerriteRing: React.FC<PropArgs & { hot?: boolean }> = ({
  hot = false, seed = 'ferrite', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={ferriteRingDef(hot)} variant={`${seed}:${hot}`} />
  </PropFrame>
);

const radioDef = (fuzzy: boolean): AssetDef => ({
  id: 'b2-radio',
  size: { w: 220, h: 180 },
  shapes: [
    { ...roundedRect(-90, -60, 180, 120, 12), ...solid(P.paperShade) },
    { k: 'circle', cx: -40, cy: 0, r: 26, fill: fuzzy ? P.coral : P.teal, stroke: INK },
    { k: 'line', x1: 20, y1: -30, x2: 70, y2: -30, stroke: INK, sw: 3 },
    { k: 'line', x1: 20, y1: 0, x2: 70, y2: 0, stroke: INK, sw: 3 },
    { k: 'line', x1: 20, y1: 30, x2: 70, y2: 30, stroke: INK, sw: 3 },
  ],
});

export const RadioIcon: React.FC<PropArgs & { fuzzy?: boolean }> = ({
  fuzzy = false, seed = 'radio', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={radioDef(fuzzy)} variant={`${seed}:${fuzzy}`} />
  </PropFrame>
);

/* ================================================================== 11 brick */

const brickDef = (holes: boolean, cracked: boolean, mortared: boolean): AssetDef => ({
  id: 'b2-brick',
  size: { w: 340, h: 180 },
  shapes: [
    { k: 'rect', x: -150, y: -66, w: 300, h: 132, ...solid(P.coral) },
    ...(holes
      ? [0, 1, 2].map((i): Shape => ({
        k: 'rect', x: -76 + i * 62, y: -34, w: 44, h: 68,
        fill: mortared ? P.grey : P.paper, stroke: INK,
      }))
      : []),
    ...(cracked
      ? ([{ k: 'polyline', pts: [[-10, -66], [6, -20], [-8, 20], [10, 66]] as Pt[], stroke: INK, sw: 5, fill: 'none' }] as Shape[])
      : []),
  ],
});

export const Brick: React.FC<PropArgs & { holes?: boolean; cracked?: boolean; mortared?: boolean }> = ({
  holes = true, cracked = false, mortared = false, seed = 'brick', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={brickDef(holes, cracked, mortared)} variant={`${seed}:${holes}${cracked}${mortared}`} />
  </PropFrame>
);

/* ================================================================ 12 ballast */

const trackDef = (stones: boolean, sunk: number, muddy: boolean): AssetDef => ({
  id: 'b2-track',
  size: { w: 480, h: 300 },
  shapes: [
    {
      k: 'group',
      transform: `translate(0 ${sunk})`,
      shapes: [
        { k: 'rect', x: -30, y: -120, w: 24, h: 60, ...solid(P.grey) },
        { k: 'rect', x: 6, y: -120, w: 24, h: 60, ...solid(P.grey) },
        { k: 'rect', x: -150, y: -60, w: 300, h: 34, ...solid(P.gold) },
      ],
    },
    ...(stones
      ? [0, 1, 2, 3, 4, 5].flatMap((r): Shape[] =>
        [0, 1, 2, 3, 4, 5, 6].map((c): Shape => ({
          k: 'polygon',
          pts: [
            [-200 + c * 62 + (r % 2) * 20, -20 + r * 26],
            [-176 + c * 62 + (r % 2) * 20, -28 + r * 26],
            [-166 + c * 62 + (r % 2) * 20, -6 + r * 26],
            [-192 + c * 62 + (r % 2) * 20, 2 + r * 26],
          ] as Pt[],
          ...solid(muddy ? P.grey : P.paperShade),
        })))
      : ([{ k: 'rect', x: -220, y: -26, w: 440, h: 160, ...solid(muddy ? P.grey : P.paperShade) }] as Shape[])),
  ],
});

export const TrackSection: React.FC<PropArgs & { stones?: boolean; sunk?: number; muddy?: boolean }> = ({
  stones = true, sunk = 0, muddy = false, seed = 'track', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={trackDef(stones, sunk, muddy)} variant={`${seed}:${stones}${sunk}${muddy}`} />
  </PropFrame>
);

/* =============================================================== 13 chip bag */

const chipBagDef = (inflated: boolean, crushed: boolean): AssetDef => ({
  id: 'b2-chip-bag',
  size: { w: 300, h: 420 },
  shapes: [
    {
      k: 'polygon',
      pts: crushed
        ? [[-70, -180], [70, -180], [86, 150], [-86, 150]] as Pt[]
        : [[-110, -180], [110, -180], [126, 170], [-126, 170]] as Pt[],
      ...solid(inflated ? P.teal : P.paperShade),
    },
    { k: 'rect', x: -110, y: -196, w: 220, h: 22, ...solid(P.grey) },
    // the chips, occupying the bottom third
    ...(crushed
      ? [0, 1, 2, 3, 4, 5].map((i): Shape => ({
        k: 'circle', cx: -60 + i * 24, cy: 110, r: 7, ...solid(P.gold),
      }))
      : [0, 1, 2, 3].map((i): Shape => ({
        k: 'ellipse', cx: -54 + i * 36, cy: 108, rx: 24, ry: 16, ...solid(P.gold),
      }))),
  ],
});

export const ChipBag: React.FC<PropArgs & { inflated?: boolean; crushed?: boolean }> = ({
  inflated = false, crushed = false, seed = 'chip-bag', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={chipBagDef(inflated, crushed)} variant={`${seed}:${inflated}${crushed}`} />
  </PropFrame>
);

/* ============================================================ 14 toilet seat */

const seatDef = (openFront: boolean, zone: boolean): AssetDef => ({
  id: 'b2-toilet-seat',
  size: { w: 300, h: 380 },
  shapes: [
    { k: 'ellipse', cx: 0, cy: 0, rx: 128, ry: 168, ...solid(P.paperShade) },
    { k: 'ellipse', cx: 0, cy: 0, rx: 88, ry: 128, fill: P.paper, stroke: INK },
    ...(openFront
      ? ([{ k: 'rect', x: -50, y: 88, w: 100, h: 96, fill: P.paper, stroke: 'none' },
        { k: 'polyline', pts: [[-50, 88], [-50, 172], [50, 172], [50, 88]] as Pt[], stroke: INK, sw: 3, fill: 'none' }] as Shape[])
      : []),
    ...(zone
      ? ([{ k: 'ellipse', cx: 0, cy: 116, rx: 62, ry: 44, fill: P.coral, stroke: 'none', opacity: 0.4 }] as Shape[])
      : []),
  ],
});

export const ToiletSeat: React.FC<PropArgs & { openFront?: boolean; zone?: boolean }> = ({
  openFront = true, zone = false, seed = 'seat', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={seatDef(openFront, zone)} variant={`${seed}:${openFront}${zone}`} />
  </PropFrame>
);

const codeBookDef = (open: boolean, stamped: boolean): AssetDef => ({
  id: 'b2-code-book',
  size: { w: 360, h: 260 },
  shapes: open
    ? [
      { k: 'polygon', pts: [[-160, -90], [0, -74], [160, -90], [160, 100], [0, 116], [-160, 100]] as Pt[], ...solid(P.paper) },
      { k: 'line', x1: 0, y1: -74, x2: 0, y2: 116, stroke: INK, sw: 3 },
      ...[0, 1, 2].map((i): Shape => ({
        k: 'line', x1: 24, y1: -40 + i * 30, x2: 140, y2: -40 + i * 30, stroke: INK, sw: 2.4,
      })),
      ...(stamped
        ? ([{ k: 'rect', x: 30, y: 20, w: 116, h: 44, fill: 'none', stroke: P.coral, sw: 5 }] as Shape[])
        : []),
    ]
    : [{ ...roundedRect(-120, -80, 240, 170, 8), ...solid(P.teal) }],
});

export const CodeBook: React.FC<PropArgs & { open?: boolean; stamped?: boolean }> = ({
  open = true, stamped = false, seed = 'code-book', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={codeBookDef(open, stamped)} variant={`${seed}:${open}${stamped}`} />
  </PropFrame>
);

/* =============================================================== 15 soda can */

const sodaCanDef = (section: boolean, lidLit: boolean): AssetDef => ({
  id: 'b2-soda-can',
  size: { w: 240, h: 400 },
  shapes: [
    { k: 'polygon', pts: [[-84, -110], [-62, -166], [62, -166], [84, -110], [84, 160], [-84, 160]] as Pt[], ...solid(P.coral) },
    // the lid — visibly thicker gauge than the wall
    { k: 'rect', x: -64, y: -180, w: 128, h: lidLit ? 22 : 16, ...solid(lidLit ? P.teal : P.grey) },
    { k: 'ellipse', cx: 0, cy: -172, rx: 26, ry: 9, fill: 'none', stroke: INK, sw: 3 },
    ...(section
      ? ([
        { k: 'rect', x: -84, y: -110, w: 5, h: 270, fill: INK, stroke: 'none' },
        { k: 'rect', x: 79, y: -110, w: 5, h: 270, fill: INK, stroke: 'none' },
      ] as Shape[])
      : []),
  ],
});

export const SodaCan: React.FC<PropArgs & { section?: boolean; lidLit?: boolean }> = ({
  section = false, lidLit = false, seed = 'can', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={sodaCanDef(section, lidLit)} variant={`${seed}:${section}${lidLit}`} />
  </PropFrame>
);

/* ========================================================== 16 revolving door */

const revolvingDef = (topDown: boolean, wedge: boolean, angle: number): AssetDef => ({
  id: 'b2-revolving-door',
  size: { w: 400, h: 400 },
  shapes: topDown
    ? [
      { k: 'circle', cx: 0, cy: 0, r: 160, fill: P.paper, stroke: INK, sw: 5 },
      ...(wedge
        ? ([{ k: 'path', d: 'M 0 0 L 160 0 A 160 160 0 0 1 0 160 Z', fill: P.teal, stroke: 'none', opacity: 0.45 }] as Shape[])
        : []),
      {
        k: 'group',
        transform: `rotate(${angle})`,
        shapes: [
          { k: 'line', x1: -160, y1: 0, x2: 160, y2: 0, stroke: INK, sw: 7 },
          { k: 'line', x1: 0, y1: -160, x2: 0, y2: 160, stroke: INK, sw: 7 },
        ],
      },
    ]
    : [
      { k: 'rect', x: -140, y: -190, w: 280, h: 380, fill: 'none', stroke: INK, sw: 6 },
      { k: 'line', x1: 0, y1: -190, x2: 0, y2: 190, stroke: INK, sw: 6 },
    ],
});

export const RevolvingDoor: React.FC<
  PropArgs & { topDown?: boolean; wedge?: boolean; angle?: number }
> = ({ topDown = true, wedge = false, angle = 0, seed = 'revolving', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={revolvingDef(topDown, wedge, angle)} variant={`${seed}:${topDown}${wedge}${Math.round(angle)}`} />
  </PropFrame>
);

const buildingDef = (warm: boolean): AssetDef => ({
  id: 'b2-building-section',
  size: { w: 320, h: 640 },
  shapes: [
    { k: 'rect', x: -130, y: -300, w: 260, h: 600, fill: 'none', stroke: INK, sw: 5 },
    ...[0, 1, 2, 3, 4].map((i): Shape => ({
      k: 'line', x1: -130, y1: -220 + i * 100, x2: 130, y2: -220 + i * 100, stroke: INK, sw: 2.5,
    })),
    ...(warm
      ? ([{ k: 'polygon', pts: [[-60, 260], [60, 260], [40, -280], [-40, -280]] as Pt[], fill: P.coral, stroke: 'none', opacity: 0.32 }] as Shape[])
      : []),
  ],
});

export const BuildingSection: React.FC<PropArgs & { warm?: boolean }> = ({
  warm = false, seed = 'building', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={buildingDef(warm)} variant={`${seed}:${warm}`} />
  </PropFrame>
);

/* ================================================================ 17 mirrors */

const wingMirrorDef = (convex: boolean, warned: boolean, carScale: number): AssetDef => ({
  id: 'b2-wing-mirror',
  size: { w: 300, h: 220 },
  shapes: [
    { ...roundedRect(-120, -84, 240, 168, 18), ...solid(P.paperShade) },
    ...(convex
      ? ([{ k: 'ellipse', cx: 0, cy: -6, rx: 104, ry: 62, fill: P.teal, stroke: INK, opacity: 0.3 }] as Shape[])
      : []),
    // a car in the glass, at whatever size the mirror renders it
    {
      k: 'group',
      transform: `translate(0 -6) scale(${carScale})`,
      shapes: [
        { ...roundedRect(-46, -22, 92, 44, 8), ...solid(P.gold) },
        { k: 'circle', cx: -26, cy: 24, r: 11, fill: INK, stroke: 'none' },
        { k: 'circle', cx: 26, cy: 24, r: 11, fill: INK, stroke: 'none' },
      ],
    },
    ...(warned
      ? ([{ k: 'rect', x: -120, y: 56, w: 240, h: 28, fill: P.paper, stroke: INK, sw: 2 }] as Shape[])
      : []),
  ],
});

export const WingMirror: React.FC<
  PropArgs & { convex?: boolean; warned?: boolean; carScale?: number }
> = ({ convex = false, warned = false, carScale = 1, seed = 'mirror', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={wingMirrorDef(convex, warned, carScale)} variant={`${seed}:${convex}${warned}${carScale}`} />
  </PropFrame>
);

/* =========================================================== 18 beer bottles */

const bottleDef = (glass: 'brown' | 'green' | 'clear', struck: boolean): AssetDef => {
  const body = glass === 'brown' ? P.gold : glass === 'green' ? P.teal : P.paperShade;
  return {
    id: 'b2-beer-bottle',
    size: { w: 180, h: 440 },
    shapes: [
      { k: 'rect', x: -26, y: -200, w: 52, h: 90, ...solid(body) },
      { k: 'path', d: 'M -26 -110 Q -70 -70 -70 -20 L -70 190 L 70 190 L 70 -20 Q 70 -70 26 -110 Z', ...solid(body) },
      { k: 'rect', x: -30, y: -212, w: 60, h: 18, ...solid(P.grey) },
      { k: 'rect', x: -56, y: 40, w: 112, h: 74, ...solid(P.paper) },
      ...(struck
        ? ([{ k: 'circle', cx: 0, cy: -40, r: 22, fill: P.coral, stroke: 'none', opacity: 0.55 }] as Shape[])
        : []),
    ],
  };
};

export const BeerBottle: React.FC<PropArgs & { glass?: 'brown' | 'green' | 'clear'; struck?: boolean }> = ({
  glass = 'brown', struck = false, seed = 'bottle', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={bottleDef(glass, struck)} variant={`${seed}:${glass}${struck}`} />
  </PropFrame>
);

/* ============================================================= 19 cabin/eyes */

const eyeDef = (pupil: number): AssetDef => ({
  id: 'b2-eye',
  size: { w: 300, h: 200 },
  shapes: [
    { k: 'path', d: 'M -130 0 Q 0 -84 130 0 Q 0 84 -130 0 Z', fill: P.paper, stroke: INK, sw: 4 },
    { k: 'circle', cx: 0, cy: 0, r: 44, fill: P.paperShade, stroke: INK },
    { k: 'circle', cx: 0, cy: 0, r: pupil, fill: INK, stroke: 'none' },
  ],
});

export const EyeDiagram: React.FC<PropArgs & { pupil?: number }> = ({
  pupil = 14, seed = 'eye', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={eyeDef(pupil)} variant={`${seed}:${Math.round(pupil)}`} />
  </PropFrame>
);

const cabinDef = (dim: boolean, pathLit: boolean): AssetDef => ({
  id: 'b2-cabin-section',
  size: { w: 520, h: 320 },
  shapes: [
    { k: 'path', d: 'M -230 120 L -230 -40 Q 0 -140 230 -40 L 230 120 Z', ...solid(dim ? P.grey : P.paperShade) },
    ...[0, 1, 2].map((i): Shape => ({
      k: 'rect', x: -170 + i * 120, y: 10, w: 80, h: 90, ...solid(dim ? P.paperShade : P.paper),
    })),
    ...(pathLit
      ? ([
        ...[0, 1, 2, 3, 4, 5].map((i): Shape => ({
          k: 'circle', cx: -190 + i * 76, cy: 112, r: 8, fill: P.gold, stroke: 'none',
        })),
        { ...roundedRect(160, -70, 76, 34, 5), ...solid(P.teal) },
      ] as Shape[])
      : []),
  ],
});

export const CabinSection: React.FC<PropArgs & { dim?: boolean; pathLit?: boolean }> = ({
  dim = false, pathLit = false, seed = 'cabin', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={cabinDef(dim, pathLit)} variant={`${seed}:${dim}${pathLit}`} />
  </PropFrame>
);

/* ================================================================ 20 receipt */

const receiptDef = (printed: number, darkened: boolean): AssetDef => ({
  id: 'b2-receipt',
  size: { w: 260, h: 420 },
  shapes: [
    { k: 'rect', x: -100, y: -190, w: 200, h: 380, ...solid(darkened ? P.grey : P.paper) },
    ...Array.from({ length: 8 }, (_, i): Shape => ({
      k: 'line',
      x1: -70, y1: -140 + i * 40, x2: i % 3 === 0 ? 40 : 70, y2: -140 + i * 40,
      stroke: INK, sw: 4,
      opacity: i < printed ? 1 : 0,
    })),
  ],
});

export const Receipt: React.FC<PropArgs & { printed?: number; darkened?: boolean }> = ({
  printed = 8, darkened = false, seed = 'receipt', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={receiptDef(printed, darkened)} variant={`${seed}:${printed}${darkened}`} />
  </PropFrame>
);

const printHeadDef = (hot: boolean): AssetDef => ({
  id: 'b2-print-head',
  size: { w: 320, h: 140 },
  shapes: [
    { ...roundedRect(-140, -60, 280, 80, 8), ...solid(P.paperShade) },
    ...Array.from({ length: 10 }, (_, i): Shape => ({
      k: 'rect', x: -124 + i * 26, y: 20, w: 16, h: 18,
      fill: hot ? P.coral : P.grey, stroke: INK,
    })),
  ],
});

export const PrintHead: React.FC<PropArgs & { hot?: boolean }> = ({
  hot = false, seed = 'print-head', ...rest
}) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={printHeadDef(hot)} variant={`${seed}:${hot}`} />
  </PropFrame>
);
