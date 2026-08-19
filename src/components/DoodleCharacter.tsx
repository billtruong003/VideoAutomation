/**
 * DoodleCharacter.tsx — the channel protagonist, rendered on the V2 stack.
 *
 * The rig is unchanged from V1 (it was structurally sound): hip at origin, ~182 units
 * tall, head ~44% of height, poses as pure joint data. What changed is how it is DRAWN.
 *
 * V1 hand-authored a lopsided head path, offset fills and a jitter table, then wobbled
 * the geometry every frame to fake life. V2 authors the character as clean geometry — the
 * head is an ellipse, the torso is a trapezoid — and splits the drawing between the two
 * tools by what each is actually good at:
 *
 *   Rough.js         head, torso, hands, feet, open eyes, pupils
 *                    (things with area and edges)
 *   perfect-freehand limbs, hair, brows, mouths, closed eyes, sweat
 *                    (things drawn in one motion, where the pressure IS the mark)
 *
 * Noodle limbs in particular are transformed by this: a limb is a single confident pen
 * stroke that swells in the middle and tapers at the wrist. Rough.js cannot express that;
 * perfect-freehand does it natively.
 *
 * CACHING CONTRACT: every rough-generated part is authored at the ORIGIN and moved into
 * place with a transform. If hands were generated at their pose coordinates instead, a
 * blended pose would mint a new cache entry on every frame and the character's linework
 * would boil. Position is a transform. Always.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { freehandPath, arcPoints, quadPoints, type Point } from '../freehand/stroke';
import { PALETTE } from '../style/tokens';
import { wobble } from '../lib/rand';
import type { AssetDef } from '../assets/shapes';
import { RIG, limbControl, type Expression, type Pose } from '../character/rig';

// ---------------------------------------------------------------------------
// clean geometry, all authored at the origin
// ---------------------------------------------------------------------------

const HEAD: AssetDef = {
  id: 'char-nib-head',
  shapes: [{ k: 'ellipse', cx: 0, cy: 0, rx: RIG.headRx, ry: RIG.headRy, fill: PALETTE.skin, rough: 'character' }],
};

const HEAD_HALO: AssetDef = {
  id: 'char-nib-head-halo',
  shapes: [
    { k: 'ellipse', cx: 0, cy: 0, rx: RIG.headRx + 1.5, ry: RIG.headRy + 1.5, fill: PALETTE.paper, stroke: PALETTE.paper, sw: 6, rough: 'character' },
  ],
};

/** Torso: a clean trapezoid, shoulders wider than hips. Rough supplies the character. */
const torsoPts: [number, number][] = [[-17, -56], [17, -56], [12.5, 2], [-12.5, 2]];

const torso = (fill: string): AssetDef => ({
  id: 'char-nib-torso',
  shapes: [{ k: 'polygon', pts: torsoPts, fill, rough: 'character' }],
});

const TORSO_HALO: AssetDef = {
  id: 'char-nib-torso-halo',
  shapes: [
    { k: 'polygon', pts: [[-19, -58], [19, -58], [14, 4], [-14, 4]], fill: PALETTE.paper, stroke: PALETTE.paper, sw: 6, rough: 'character' },
  ],
};

const HAND: AssetDef = {
  id: 'char-nib-hand',
  shapes: [{ k: 'circle', cx: 0, cy: 0, r: 7.8, fill: PALETTE.skin, rough: 'detail', sw: 2.8, roughness: 0.9 }],
};
const HAND_HALO: AssetDef = {
  id: 'char-nib-hand-halo',
  shapes: [{ k: 'circle', cx: 0, cy: 0, r: 9.6, fill: PALETTE.paper, stroke: PALETTE.paper, sw: 3, rough: 'detail' }],
};

const FOOT: AssetDef = {
  id: 'char-nib-foot',
  shapes: [{ k: 'ellipse', cx: 0, cy: 0, rx: 10.5, ry: 5.8, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2, roughness: 0.7 }],
};
const FOOT_HALO: AssetDef = {
  id: 'char-nib-foot-halo',
  shapes: [{ k: 'ellipse', cx: 0, cy: 0, rx: 12, ry: 7, fill: PALETTE.paper, stroke: PALETTE.paper, sw: 3, rough: 'detail' }],
};

const eyeWhite = (r: number): AssetDef => ({
  id: `char-nib-eye-${r}`,
  shapes: [{ k: 'circle', cx: 0, cy: 0, r, fill: PALETTE.paper, rough: 'detail', sw: 2.7, roughness: 0.85 }],
});
/**
 * Pupils bypass most of the roughening. A 4-unit filled disc put through Rough.js at
 * normal settings comes out as a scribble rather than an eye — below roughly 6 units,
 * roughness stops reading as character and starts reading as dirt.
 */
const pupil = (r: number): AssetDef => ({
  id: `char-nib-pupil-${r}`,
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 1.2, roughness: 0.35, bowing: 0.3, single: true },
  ],
});

const MOUTH_O: AssetDef = {
  id: 'char-nib-mouth-o',
  shapes: [{ k: 'ellipse', cx: 0, cy: 0, rx: 6.5, ry: 8, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2 }],
};
const MOUTH_GASP: AssetDef = {
  id: 'char-nib-mouth-gasp',
  shapes: [
    { k: 'ellipse', cx: 0, cy: 1, rx: 9, ry: 13, fill: PALETTE.ink, stroke: PALETTE.ink, rough: 'detail', sw: 2 },
    { k: 'ellipse', cx: 0, cy: 9, rx: 4.6, ry: 3, fill: PALETTE.coral, stroke: 'none', rough: 'detail' },
  ],
};
const MOUTH_GRIMACE: AssetDef = {
  id: 'char-nib-mouth-grimace',
  shapes: [
    { k: 'rect', x: -13, y: -5, w: 26, h: 10, fill: PALETTE.paper, rough: 'detail', sw: 2.6 },
    { k: 'line', x1: -13, y1: 0, x2: 13, y2: 0, rough: 'detail', sw: 1.8, single: true },
    { k: 'line', x1: -5, y1: -5, x2: -5, y2: 5, rough: 'detail', sw: 1.8, single: true },
    { k: 'line', x1: 4, y1: -5, x2: 4, y2: 5, rough: 'detail', sw: 1.8, single: true },
  ],
};
const SWEAT: AssetDef = {
  id: 'char-nib-sweat',
  shapes: [
    { k: 'path', d: 'M 0 -14 C 5 -5 7 0 3 3 C -1 6 -4 1 0 -14 Z', fill: PALETTE.teal, rough: 'detail', sw: 2 },
  ],
};

/** Three-stroke cowlick — the silhouette cue that makes the mascot recognisable. */
const HAIR_STROKES: Point[][] = [
  [[-11, -38], [-15, -48], [-8, -55], [2, -50]],
  [[5, -40], [3, -52], [10, -60], [18, -52]],
  [[18, -35], [22, -46], [30, -50], [32, -42]],
];

const EYE_L: Point = [-16, -6];
const EYE_R: Point = [15, -5];
const MOUTH_Y = 19;

// ---------------------------------------------------------------------------
// face parts
// ---------------------------------------------------------------------------

const inkStroke = (
  pts: Point[],
  pen: Parameters<typeof freehandPath>[1],
  seed: string,
  size?: number,
  color: string = PALETTE.ink,
) => <path d={freehandPath(pts, pen, seed, size ? { size } : {})} fill={color} />;

function Eye({
  at, shape, look, seed, mirrored,
}: {
  at: Point; shape: Expression['eyes']; look: [number, number]; seed: string; mirrored: boolean;
}) {
  const [cx, cy] = at;

  if (shape === 'squint' || shape === 'closed') {
    const lift = shape === 'closed' ? 7.5 : 5.8;
    return (
      <g transform={`translate(${cx} ${cy})`}>
        {inkStroke(quadPoints([-11, 1.5], [0, 1.5 - lift * 2], [11, 1.5], 12), 'face', `${seed}:eye`, 4.6)}
      </g>
    );
  }

  if (shape === 'dizzy') {
    // over-stimulated spiral, drawn as one continuous gesture
    const pts: Point[] = [];
    for (let i = 0; i <= 44; i++) {
      const t = i / 44;
      const a = t * Math.PI * 2 * 2.3 * (mirrored ? -1 : 1);
      const r = t * 9.5;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return <g transform={`translate(${cx} ${cy})`}>{inkStroke(pts, 'scribble', `${seed}:spiral`, 3.4)}</g>;
  }

  if (shape === 'dots') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <RoughAsset def={pupil(4.6)} variant={seed} />
      </g>
    );
  }

  const r = shape === 'wide' ? 12.5 : 9;
  const pr = shape === 'wide' ? 3.6 : 4.3;
  const reach = r - pr - 1.6;

  return (
    <g transform={`translate(${cx} ${cy})`}>
      <RoughAsset def={eyeWhite(r)} variant={seed} />
      <g transform={`translate(${(look[0] * reach).toFixed(2)} ${(look[1] * reach).toFixed(2)})`}>
        <RoughAsset def={pupil(pr)} variant={seed} />
      </g>
      {shape === 'tired' && (
        <>
          {inkStroke(arcPoints(0, -1, r + 1, r - 3, 200, 340, 10), 'face', `${seed}:lid`, 6)}
          {inkStroke(arcPoints(0, r + 3, r - 1, 3, 20, 160, 8), 'face', `${seed}:bag`, 3)}
        </>
      )}
    </g>
  );
}

function Brow({ at, brow, side, seed }: { at: Point; brow: number; side: -1 | 1; seed: string }) {
  const lift = -brow * 4.6 - 16;
  const rot = -brow * 15 * side;
  const arch = brow > 0 ? 4.2 * brow : -1.8;
  return (
    <g transform={`translate(${at[0]} ${at[1] + lift}) rotate(${rot})`}>
      {inkStroke(quadPoints([-10.5, 0], [0, -arch * 2], [10.5, 0], 10), 'face', `${seed}:brow`, 4.4)}
    </g>
  );
}

function Mouth({ shape, scale, seed }: { shape: Expression['mouth']; scale: number; seed: string }) {
  const s = scale * 1.3;
  const wrap = (node: React.ReactNode) => (
    <g transform={`translate(0 ${MOUTH_Y}) scale(${s})`}>{node}</g>
  );

  switch (shape) {
    case 'o':
      return wrap(<RoughAsset def={MOUTH_O} variant={seed} />);
    case 'gasp':
      return wrap(<RoughAsset def={MOUTH_GASP} variant={seed} />);
    case 'grimace':
      return wrap(<RoughAsset def={MOUTH_GRIMACE} variant={seed} />);
    case 'line':
      return wrap(inkStroke([[-9, 0], [0, 1], [9, 0]], 'face', `${seed}:m`, 4.2));
    case 'flat':
      return wrap(inkStroke([[-11, 0.5], [0, 0], [11, -0.5]], 'face', `${seed}:m`, 4.2));
    case 'smile':
      return wrap(inkStroke(quadPoints([-10, -3], [0, 9], [10, -3], 12), 'face', `${seed}:m`, 4.6));
    case 'bigSmile':
      return wrap(
        <>
          <RoughAsset
            def={{
              id: 'char-nib-mouth-big',
              shapes: [{ k: 'path', d: 'M -13 -4 Q 0 12 13 -4 Z', fill: PALETTE.ink, rough: 'detail', sw: 2.4 }],
            }}
            variant={seed}
          />
          {inkStroke([[-7, 4], [0, 6.4], [7, 4]], 'face', `${seed}:tongue`, 2.6, PALETTE.paper)}
        </>,
      );
    case 'frown':
      return wrap(inkStroke(quadPoints([-10, 4], [0, -7], [10, 4], 12), 'face', `${seed}:m`, 4.6));
    case 'wavy':
      return wrap(inkStroke([[-10, 0], [-5, -4.5], [0, 0], [5, 4.5], [10, 0]], 'face', `${seed}:m`, 4.2));
    case 'smirk':
      return wrap(inkStroke(quadPoints([-9, 2], [1, 3], [10, -5], 12), 'face', `${seed}:m`, 4.2));
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// character
// ---------------------------------------------------------------------------

export type DoodleCharacterProps = {
  pose: Pose;
  expression: Expression;
  /** Position of the character's HIP in the parent SVG's coordinate space. */
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  /** Drives transform-level breathing only — never the drawn geometry. */
  frame: number;
  /** Stable identity: the Rough.js seed namespace for this character instance. */
  seed?: string;
  /** Retained from V1 for scene compatibility; now scales the transform-level drift. */
  wobbleAmount?: number;
  shirtColor?: string;
  /** Paper outline behind the ink so the character survives dark backgrounds. */
  halo?: boolean;
  opacity?: number;
  rotate?: number;
  children?: React.ReactNode;
};

export const DoodleCharacter: React.FC<DoodleCharacterProps> = ({
  pose,
  expression,
  x,
  y,
  scale = 1,
  flip = false,
  frame,
  seed = 'nib',
  wobbleAmount = 1,
  shirtColor = PALETTE.shirt,
  halo = true,
  opacity = 1,
  rotate = 0,
  children,
}) => {
  const w = (k: string, amp: number, spd = 0.09) => wobble(`${seed}:${k}`, frame, spd, amp * wobbleAmount);

  const [rootX, rootY] = pose.rootOffset ?? [0, 0];
  const [headOX, headOY] = pose.headOffset ?? [0, 0];
  const [sx, sy] = pose.bodyScale ?? [1, 1];
  const look = expression.look ?? [0, 0];
  const brow = expression.brow ?? 0;
  const browSkew = expression.browSkew ?? 0;

  const bodyRot = (pose.torsoLean ?? 0) + w('body', 0.9);
  const driftX = w('dx', 0.7, 0.06);
  const driftY = w('dy', 0.7, 0.075);
  const headRot = (pose.headTilt ?? 0) + w('head', 1.5, 0.11);
  const headBobY = w('bob', 1.1, 0.13);

  const [hx, hy] = RIG.headCenter;

  /** A noodle limb: one freehand stroke from anchor to hand/foot. */
  const limb = (anchor: readonly [number, number], l: { x: number; y: number; bend: number }, key: string) => {
    const c = limbControl(anchor, l);
    const pts = quadPoints([anchor[0], anchor[1]], c, [l.x, l.y], 16);
    return (
      <>
        {halo && <path d={freehandPath(pts, 'limb', `${seed}:${key}`, { size: 11 })} fill={PALETTE.paper} />}
        <path d={freehandPath(pts, 'limb', `${seed}:${key}`)} fill={PALETTE.ink} />
      </>
    );
  };

  const at = (p: { x: number; y: number }, node: React.ReactNode) => (
    <g transform={`translate(${p.x} ${p.y})`}>{node}</g>
  );

  const arms = (
    <>
      {limb(RIG.shoulderL, pose.armL, 'armL')}
      {limb(RIG.shoulderR, pose.armR, 'armR')}
      {halo && at(pose.armL, <RoughAsset def={HAND_HALO} variant={`${seed}L`} />)}
      {halo && at(pose.armR, <RoughAsset def={HAND_HALO} variant={`${seed}R`} />)}
      {at(pose.armL, <RoughAsset def={HAND} variant={`${seed}L`} />)}
      {at(pose.armR, <RoughAsset def={HAND} variant={`${seed}R`} />)}
    </>
  );

  return (
    <g
      transform={`translate(${(x + driftX * scale).toFixed(2)} ${(y + driftY * scale).toFixed(2)}) scale(${scale * (flip ? -1 : 1)} ${scale}) rotate(${rotate})`}
      opacity={opacity}
    >
      <g transform={`translate(${rootX} ${rootY})`}>
        <g transform={`rotate(${bodyRot}) scale(${sx} ${sy})`}>
          {/* ---- legs ---- */}
          {limb(RIG.hipL, pose.legL, 'legL')}
          {limb(RIG.hipR, pose.legR, 'legR')}
          {halo && at({ x: pose.legL.x - 4, y: pose.legL.y + 3.5 }, <RoughAsset def={FOOT_HALO} variant={`${seed}FL`} />)}
          {halo && at({ x: pose.legR.x + 4, y: pose.legR.y + 3.5 }, <RoughAsset def={FOOT_HALO} variant={`${seed}FR`} />)}
          {at({ x: pose.legL.x - 4, y: pose.legL.y + 3.5 }, <RoughAsset def={FOOT} variant={`${seed}FL`} />)}
          {at({ x: pose.legR.x + 4, y: pose.legR.y + 3.5 }, <RoughAsset def={FOOT} variant={`${seed}FR`} />)}

          {/* ---- arms behind the body (V1 lesson: drawn on top they read as pasted-on) ---- */}
          {pose.armsInFront ? null : arms}

          {/* ---- torso ---- */}
          {halo && <RoughAsset def={TORSO_HALO} variant={seed} />}
          <RoughAsset def={torso(shirtColor)} variant={seed} />

          {/* ---- head ---- */}
          <g transform={`translate(${hx + headOX} ${hy + headOY + headBobY}) rotate(${headRot})`}>
            {halo && <RoughAsset def={HEAD_HALO} variant={seed} />}
            <RoughAsset def={HEAD} variant={seed} />

            {HAIR_STROKES.map((pts, i) => (
              <path key={i} d={freehandPath(pts, 'hair', `${seed}:hair${i}`)} fill={PALETTE.ink} />
            ))}

            <Eye at={EYE_L} shape={expression.eyes} look={look} seed={`${seed}:L`} mirrored={false} />
            <Eye at={EYE_R} shape={expression.eyes} look={look} seed={`${seed}:R`} mirrored />

            <Brow at={EYE_L} brow={brow} side={-1} seed={`${seed}:L`} />
            <Brow at={EYE_R} brow={brow + browSkew * 0.9} side={1} seed={`${seed}:R`} />

            <Mouth shape={expression.mouth} scale={expression.mouthScale ?? 1} seed={seed} />

            {expression.sweat && (
              <g transform="translate(39 -12)">
                <RoughAsset def={SWEAT} variant={seed} />
              </g>
            )}
          </g>

          {/* the two poses whose hands must sit in front of the face to read at all */}
          {pose.armsInFront ? arms : null}

          {children}
        </g>
      </g>
    </g>
  );
};
