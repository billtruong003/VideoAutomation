/**
 * DoodleCharacter.tsx — renders the channel protagonist from a pose + an expression.
 *
 * Generic on purpose. It knows nothing about casinos; it knows how to draw a doodle
 * person doing a named thing with a named face. Episode 002 imports this unchanged.
 *
 * Everything is drawn in the rig's character space (hip at origin, ~182 units tall) and
 * placed by the caller with `x`, `y` and `scale`.
 *
 * Two details do most of the "hand-drawn" work:
 *   1. flat fills are nudged a couple of units off their outlines, the way a felt-tip
 *      overshoots the pencil line it is colouring in;
 *   2. every part carries a deterministic sub-degree wobble, so nothing is ever
 *      perfectly still or perfectly aligned.
 */

import React from 'react';
import { PALETTE, STROKE, HAND_STROKE } from '../lib/style';
import { wobble } from '../lib/rand';
import { RIG, limbPath, type Expression, type Pose } from '../character/rig';

// ---------------------------------------------------------------------------
// static geometry — deliberately lopsided
// ---------------------------------------------------------------------------

/** Head outline, centred on (0,0). Wider top-left than bottom-right: never a circle. */
const HEAD_D =
  'M -44 -4 C -44.5 -30 -24 -41.5 3 -41 C 29 -40.5 44.5 -28 44 1 ' +
  'C 43.5 26 25 41 -1 40.5 C -25 40 -43.5 25 -44 -4 Z';

/** Torso, hip at origin, shoulders at y=-56. No neck — the head just sits on it. */
const TORSO_D =
  'M -17 -56 C -21 -38 -15 -17 -11 0 C -3.5 2.5 4 2.5 11 0 ' +
  'C 15 -17 21 -38 17 -56 C 8 -60 -8 -60 -17 -56 Z';

/** Three-stroke cowlick. This is the silhouette cue that makes the mascot recognisable. */
const HAIR_D = [
  'M -11 -38 C -17 -56 -4 -61 2 -50',
  'M 5 -40 C 4 -59 16 -62 18 -52',
  'M 18 -35 C 24 -52 33 -51 32 -42',
];

const EYE_L: [number, number] = [-16, -6];
const EYE_R: [number, number] = [15, -5];
const MOUTH_Y = 19;

// ---------------------------------------------------------------------------
// face parts
// ---------------------------------------------------------------------------

function Eye({
  cx, cy, shape, look, mirrored,
}: {
  cx: number; cy: number; shape: Expression['eyes']; look: [number, number]; mirrored: boolean;
}) {
  const ink = PALETTE.ink;
  const sw = STROKE.detail;

  if (shape === 'dots') {
    return <circle cx={cx} cy={cy} r={4.6} fill={ink} />;
  }

  if (shape === 'squint' || shape === 'closed') {
    // an upward arc — the universal "happy/shut" eye
    const w = 11;
    const lift = shape === 'closed' ? 7.5 : 5.8;
    return (
      <path
        d={`M ${cx - w} ${cy + 1.5} Q ${cx} ${cy + 1.5 - lift} ${cx + w} ${cy + 1.5}`}
        stroke={ink}
        strokeWidth={sw}
        {...HAND_STROKE}
      />
    );
  }

  if (shape === 'dizzy') {
    // spiral: over-stimulated
    const turns = 2.4;
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = t * Math.PI * 2 * turns * (mirrored ? -1 : 1);
      const r = t * 9.5;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return <path d={`M ${pts.join(' L ')}`} stroke={ink} strokeWidth={2.6} {...HAND_STROKE} />;
  }

  const r = shape === 'wide' ? 12.5 : 9;
  const pupilR = shape === 'wide' ? 3.6 : 4.3;
  const reach = r - pupilR - 1.6;
  const px = cx + look[0] * reach;
  const py = cy + look[1] * reach;

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={PALETTE.paper} stroke={ink} strokeWidth={sw} />
      <circle cx={px} cy={py} r={pupilR} fill={ink} />
      {shape === 'tired' && (
        // heavy upper lid + a bag underneath
        <>
          <path
            d={`M ${cx - r - 1} ${cy - 2.5} Q ${cx} ${cy - r + 1.5} ${cx + r + 1} ${cy - 2.5}`}
            stroke={ink}
            strokeWidth={sw + 1.1}
            {...HAND_STROKE}
          />
          <path
            d={`M ${cx - r + 1} ${cy + r + 2.5} Q ${cx} ${cy + r + 5.5} ${cx + r - 1} ${cy + r + 2.5}`}
            stroke={ink}
            strokeWidth={2.1}
            {...HAND_STROKE}
          />
        </>
      )}
    </>
  );
}

function Brow({ cx, cy, brow, side }: { cx: number; cy: number; brow: number; side: -1 | 1 }) {
  // raised brows arch and lift; furrowed brows drop and angle their INNER ends down
  const lift = -brow * 4.6 - 16;
  const rot = -brow * 15 * side;
  const arch = brow > 0 ? 4.2 * brow : -1.8;
  const w = 10.5;
  return (
    <g transform={`translate(${cx} ${cy + lift}) rotate(${rot})`}>
      <path
        d={`M ${-w} 0 Q 0 ${-arch} ${w} 0`}
        stroke={PALETTE.ink}
        strokeWidth={STROKE.detail + 0.6}
        {...HAND_STROKE}
      />
    </g>
  );
}

function Mouth({ shape, scale }: { shape: Expression['mouth']; scale: number }) {
  const ink = PALETTE.ink;
  const sw = STROKE.detail;
  const inner = (() => {
    switch (shape) {
      case 'line':
        return <path d="M -8 0 L 8 0" stroke={ink} strokeWidth={sw} {...HAND_STROKE} />;
      case 'flat':
        return <path d="M -10 0.5 L 10 -0.5" stroke={ink} strokeWidth={sw} {...HAND_STROKE} />;
      case 'smile':
        return <path d="M -9.5 -2.5 Q 0 5.5 9.5 -2.5" stroke={ink} strokeWidth={sw} {...HAND_STROKE} />;
      case 'bigSmile':
        return (
          <>
            <path d="M -12.5 -4 Q 0 10.5 12.5 -4 Z" fill={ink} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
            <path d="M -8 3.6 Q 0 6.4 8 3.6" stroke={PALETTE.paper} strokeWidth={2} {...HAND_STROKE} />
          </>
        );
      case 'frown':
        return <path d="M -9.5 3.5 Q 0 -4 9.5 3.5" stroke={ink} strokeWidth={sw} {...HAND_STROKE} />;
      case 'o':
        return <ellipse cx={0} cy={0} rx={5} ry={6.2} fill={ink} />;
      case 'gasp':
        return (
          <>
            <ellipse cx={0} cy={1} rx={7} ry={10} fill={ink} />
            <ellipse cx={0} cy={7.5} rx={3.6} ry={2.4} fill={PALETTE.coral} opacity={0.85} />
          </>
        );
      case 'wavy':
        return (
          <path
            d="M -10 0 Q -5 -4.5 0 0 Q 5 4.5 10 0"
            stroke={ink}
            strokeWidth={sw}
            {...HAND_STROKE}
          />
        );
      case 'smirk':
        return <path d="M -8.5 2 Q 1.5 2.5 9.5 -4" stroke={ink} strokeWidth={sw} {...HAND_STROKE} />;
      case 'grimace':
        return (
          <>
            <path d="M -10 -4 L 10 -4 L 10 4 L -10 4 Z" fill={PALETTE.paper} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
            <path d="M -10 0 L 10 0 M -4 -4 L -4 4 M 3 -4 L 3 4" stroke={ink} strokeWidth={1.8} />
          </>
        );
      default:
        return null;
    }
  })();
  // base 1.3 keeps the mouth legible against the bigger head
  return <g transform={`translate(0 ${MOUTH_Y}) scale(${scale * 1.3})`}>{inner}</g>;
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
  /** Mirror horizontally (character faces the other way). */
  flip?: boolean;
  /** Current frame — drives the wobble. Pass the scene's frame. */
  frame: number;
  /** Stable key so two characters in one shot wobble differently but reproducibly. */
  seed?: string;
  /** Amount of hand-drawn imperfection. 0 disables it. */
  wobbleAmount?: number;
  shirtColor?: string;
  /**
   * Paper outline behind the ink, so the character reads on dark backgrounds.
   * On by default; turn it off for a character deliberately sinking into shadow.
   */
  halo?: boolean;
  opacity?: number;
  /** Extra rotation of the whole body, degrees. */
  rotate?: number;
  /** Drawn in character space, in front of the body — props held in hand, etc. */
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
  const ink = PALETTE.ink;
  const w = (k: string, amp: number, spd = 0.09) => wobble(`${seed}:${k}`, frame, spd, amp * wobbleAmount);

  const [rootX, rootY] = pose.rootOffset ?? [0, 0];
  const [headOX, headOY] = pose.headOffset ?? [0, 0];
  const [sx, sy] = pose.bodyScale ?? [1, 1];
  const look = expression.look ?? [0, 0];
  const brow = expression.brow ?? 0;
  const browSkew = expression.browSkew ?? 0;

  // whole-body breathing + drift
  const bodyRot = (pose.torsoLean ?? 0) + w('body', 0.9);
  const driftX = w('dx', 0.7, 0.06);
  const driftY = w('dy', 0.7, 0.075);
  const headRot = (pose.headTilt ?? 0) + w('head', 1.5, 0.11);
  const headBobY = w('bob', 1.1, 0.13);

  const [hx, hy] = RIG.headCenter;

  /**
   * Every ink stroke gets a paper-coloured stroke laid under it first. Noodle limbs are
   * pure ink on a warm-charcoal line, so on the dark casino backgrounds they vanished
   * completely — the character read as a floating head. The halo is the same trick the
   * captions use, and it also reads as a deliberate sticker outline.
   */
  const limb = (path: string) => (
    <>
      {halo && (
        <path d={path} stroke={PALETTE.paper} strokeWidth={STROKE.limb + 7} {...HAND_STROKE} />
      )}
      <path d={path} stroke={ink} strokeWidth={STROKE.limb} {...HAND_STROKE} />
    </>
  );
  const hand = (l: { x: number; y: number }) => (
    <>
      {halo && <circle cx={l.x} cy={l.y} r={12} fill={PALETTE.paper} />}
      <circle cx={l.x} cy={l.y} r={8.4} fill={PALETTE.skin} stroke={ink} strokeWidth={STROKE.outline - 0.8} />
    </>
  );
  const foot = (l: { x: number; y: number }, dir: number) => (
    <ellipse
      cx={l.x + dir * 4}
      cy={l.y + 3.5}
      rx={11.5}
      ry={6.4}
      fill={ink}
      stroke={halo ? PALETTE.paper : ink}
      strokeWidth={halo ? 5 : 2}
      paintOrder="stroke"
    />
  );

  const arms = (
    <>
      {limb(limbPath(RIG.shoulderL, pose.armL))}
      {limb(limbPath(RIG.shoulderR, pose.armR))}
      {hand(pose.armL)}
      {hand(pose.armR)}
    </>
  );

  return (
    <g
      transform={`translate(${x + driftX * scale} ${y + driftY * scale}) scale(${scale * (flip ? -1 : 1)} ${scale}) rotate(${rotate})`}
      opacity={opacity}
    >
      <g transform={`translate(${rootX} ${rootY})`}>
        <g transform={`rotate(${bodyRot}) scale(${sx} ${sy})`}>
          {/* ---- legs (behind everything) ---- */}
          {limb(limbPath(RIG.hipL, pose.legL))}
          {limb(limbPath(RIG.hipR, pose.legR))}
          {foot(pose.legL, -1)}
          {foot(pose.legR, 1)}

          {/*
            ---- arms: BEHIND the body ----
            Noodle arms drawn over the torso and head read as cut-out hands pasted on
            top of the character. Tucked behind the silhouette they read as limbs that
            belong to the body, and the shoulder joint stops needing to be drawn at all.
            Poses set `armsInFront` only when the hand must physically be in front of the
            face to mean anything (a hand on the chin, hands over the cheeks).
          */}
          {pose.armsInFront ? null : arms}

          {/* ---- torso: flat fill nudged off its own outline ---- */}
          {halo && (
            <path d={TORSO_D} fill={PALETTE.paper} stroke={PALETTE.paper} strokeWidth={9} strokeLinejoin="round" />
          )}
          <path d={TORSO_D} fill={shirtColor} transform="translate(2.2 1.8)" />
          <path d={TORSO_D} fill="none" stroke={ink} strokeWidth={STROKE.outline} strokeLinejoin="round" />

          {/* ---- head ---- */}
          <g transform={`translate(${hx + headOX} ${hy + headOY + headBobY}) rotate(${headRot})`}>
            {halo && (
              <path d={HEAD_D} fill={PALETTE.paper} stroke={PALETTE.paper} strokeWidth={9} strokeLinejoin="round" />
            )}
            <path d={HEAD_D} fill={PALETTE.skin} transform="translate(2.4 2)" />
            <path d={HEAD_D} fill="none" stroke={ink} strokeWidth={STROKE.outline} strokeLinejoin="round" />

            {HAIR_D.map((d, i) => (
              <path key={i} d={d} stroke={ink} strokeWidth={STROKE.hair} {...HAND_STROKE} />
            ))}

            <Eye cx={EYE_L[0]} cy={EYE_L[1]} shape={expression.eyes} look={look} mirrored={false} />
            <Eye cx={EYE_R[0]} cy={EYE_R[1]} shape={expression.eyes} look={look} mirrored />

            <Brow cx={EYE_L[0]} cy={EYE_L[1]} brow={brow} side={-1} />
            <Brow cx={EYE_R[0]} cy={EYE_R[1]} brow={brow + browSkew * 0.9} side={1} />

            <Mouth shape={expression.mouth} scale={expression.mouthScale ?? 1} />

            {expression.sweat && (
              <path
                d="M 39 -19 C 44 -8 46.5 -3 42 0.5 C 37.5 4 34.5 -2 39 -19 Z"
                fill={PALETTE.teal}
                stroke={ink}
                strokeWidth={1.8}
                strokeLinejoin="round"
                opacity={0.95}
              />
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
