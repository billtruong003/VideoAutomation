/**
 * DoodleCharacter.tsx — the one component that draws any cast member.
 *
 *     <DoodleCharacter character="bill" pose="thinking" expression="confused" gaze="left" />
 *
 * Episode code names a character, a pose and an expression. It does not know hair paths,
 * glasses coordinates, mouth geometry or limb numbers, and it must never learn them —
 * that ignorance is the entire mechanism by which the cast stays canonical across
 * hundreds of episodes.
 *
 * LAYER ORDER is fixed here and nowhere else, because it is the difference between a
 * character and a pile of parts:
 *
 *     back accessory -> [arms, if behind] -> legs -> feet -> shorts -> shirt
 *       -> torso accessory -> ARMS + hands -> head (skull, hair, face)
 *       -> head accessory -> [arms, if over the head]
 *
 * The arms appear three times in that list and land in exactly one of the slots, chosen by
 * `Pose.armLayer` or derived from whether a hand rises above the jaw.
 *
 * There is no white rim in that list. The paper halo is opt-in per shot (`halo`), for
 * characters standing on a genuinely dark background; on the paper stage it only fringes
 * the drawing in white and cheapens it.
 *
 * ARMS DRAW IN FRONT OF THE TORSO. The previous revision drew them behind it, which — with
 * shoulders anchored inside the torso silhouette — meant a resting arm was completely
 * occluded and the hand read as a disc floating in space. Both halves of that bug are
 * fixed: shoulders now sit on the torso's outer edge (see `Build`), and arms are in front.
 * `Pose.armLayer` overrides that for the few poses the geometry cannot infer.
 *
 * CACHING CONTRACT, inherited and still absolute: every stylized part is authored at the
 * ORIGIN and moved by an SVG transform. Nothing per-frame may enter the geometry, or the
 * Rough.js cache misses every frame and the linework boils.
 */

import React from 'react';
import { RoughAsset } from '../assets/RoughAsset';
import { PALETTE } from '../style/tokens';
import { quadPoints } from '../lib/pathpoints';
import { wobble } from '../lib/rand';
import { hairDef, hairHaloDef } from '../character/characters/hair';
import { MOCHI_GEOM } from '../character/characters/mochi';
import { Face } from '../character/face';
import { hand, Ink } from '../character/ink';
import { blinkAt, gazeVector, idleGaze, talkFrame } from '../character/motion';
import {
  FACE_METRICS,
  getCharacter,
  isCreature,
  resolveCreaturePose,
  resolveExpression,
  resolvePose,
} from '../character/registry';
import { limbControl, shoulderOf, hipOf } from '../character/rig';
import { footDef, handDef, handHaloDef, headDef, pantsDef, torsoDef } from '../character/parts';
import type {
  CharacterId,
  CharacterPalette,
  CreaturePose,
  Expression,
  CreatureDef,
  Facing,
  GazeName,
  HandState,
  HumanoidDef,
  Limb,
  Pose,
  TalkState,
} from '../character/types';

export type DoodleCharacterProps = {
  /** Which canonical cast member. Defaults to the mascot. */
  character?: CharacterId;
  /**
   * An explicit definition, bypassing the registry.
   *
   * The ONLY intended caller is `makeNpc` — episode extras render through this component
   * but must never be reachable by name, or they end up treated as cast. If you are
   * reaching for this to build a recurring character, put them in the registry instead.
   */
  def?: HumanoidDef | CreatureDef;
  /** A pose NAME from the character's library, or a Pose object from `usePoseSwap`. */
  pose?: string | Pose | CreaturePose;
  /** An expression NAME from the character's library, or an Expression object. */
  expression?: string | Expression;
  /** Position of the character's HIP in the parent SVG's coordinate space. */
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  /** Drives transform-level idle only — never the drawn geometry. */
  frame: number;
  /** Instance identity. Two copies of one character in a shot want different seeds. */
  seed?: string;
  facing?: Facing;
  /** Where the eyes point. Omit for this character's idle saccade. */
  gaze?: GazeName | [number, number] | null;
  /** `true` runs the talk cycle; a TalkState pins one shape. */
  talk?: boolean | TalkState;
  /** Automatic blinking, on this character's own rhythm. */
  blink?: boolean;
  /** Overlay names from the character's accessory table. */
  accessories?: string[];
  /** Rendered at the hand attachment points, already in character space. */
  propLeft?: React.ReactNode;
  propRight?: React.ReactNode;
  /** Multiplies the idle drift. 0 freezes the character for a still. */
  wobbleAmount?: number;
  /**
   * Paper rim behind the ink. OFF by default.
   *
   * It exists for the one case that needs it — a character on a genuinely dark background
   * who would otherwise lose their outline — and it is opt-in per shot because on the
   * normal paper stage it just puts a white fringe around everything and makes the drawing
   * look worse. If a shot needs separation, that shot asks for it.
   */
  halo?: boolean;
  /** Flatten every colour to ink — the silhouette QA sheet, not an episode feature. */
  silhouette?: boolean;
  opacity?: number;
  rotate?: number;
  children?: React.ReactNode;
};

const flatten = (ink: string): CharacterPalette => ({
  skin: ink, skinShade: ink, hair: ink, hairShade: ink,
  shirt: ink, shirtShade: ink, pants: ink, shoe: ink, outline: ink, glasses: ink,
});

export const DoodleCharacter: React.FC<DoodleCharacterProps> = (props) => {
  const c = props.def ?? getCharacter(props.character ?? 'bill');
  const palette = props.silhouette ? flatten(PALETTE.ink) : c.palette;
  const seed = props.seed ?? c.roughSeed;
  const expression = resolveExpression(c, props.expression);
  const metrics = FACE_METRICS[c.id];

  const wobbleAmount = props.wobbleAmount ?? 1;
  const idle = c.motion.idle * wobbleAmount;
  const blink = props.blink === false ? 0 : blinkAt(props.frame, c.motion, seed);
  /*
   * Gaze precedence, and the order matters:
   *   an explicit prop      the scene is aiming the eyes at something
   *   the expression's look the library author aimed them deliberately (suspicious, sad)
   *   the idle saccade      nobody said, so the character glances around on its own
   * `null` means dead centre — used for straight-to-camera beats.
   */
  const gaze =
    props.gaze === null
      ? ([0, 0] as [number, number])
      : props.gaze !== undefined
        ? gazeVector(props.gaze)
        : (expression.look ?? idleGaze(props.frame, c.motion, seed));
  const talk: TalkState | undefined =
    props.talk === true ? talkFrame(props.frame, seed) : props.talk || undefined;

  const face = props.silhouette ? null : (
    <Face
      expression={expression}
      m={metrics}
      palette={palette}
      seed={seed}
      facing={props.facing}
      talk={talk}
      blink={blink}
      look={gaze}
    />
  );

  if (isCreature(c)) {
    return (
      <Creature
        {...props}
        pose={resolveCreaturePose(c, props.pose as string | CreaturePose | undefined)}
        palette={palette}
        seed={seed}
        idle={idle}
        face={face}
      />
    );
  }

  return (
    <Humanoid
      {...props}
      def={c}
      pose={resolvePose(c, props.pose as string | Pose | undefined)}
      palette={palette}
      seed={seed}
      idle={idle}
      face={face}
    />
  );
};

// ---------------------------------------------------------------------------
// humanoid
// ---------------------------------------------------------------------------

type HumanoidRenderProps = DoodleCharacterProps & {
  def: HumanoidDef;
  pose: Pose;
  palette: CharacterPalette;
  seed: string;
  idle: number;
  face: React.ReactNode;
};

const Humanoid: React.FC<HumanoidRenderProps> = ({
  def,
  pose,
  palette,
  seed,
  idle,
  face,
  x,
  y,
  scale = 1,
  flip = false,
  frame,
  opacity = 1,
  rotate = 0,
  accessories = [],
  propLeft,
  propRight,
  halo: haloProp = false,
  silhouette = false,
  children,
}) => {
  const b = def.build;
  const hairId = def.hair;
  /* A paper rim under a pure-black silhouette would punch white holes through it. */
  const halo = haloProp && !silhouette;
  const w = (k: string, amp: number, spd = 0.09) => wobble(`${seed}:${k}`, frame, spd, amp * idle);

  const [rootX, rootY] = pose.rootOffset ?? [0, 0];
  const [headOX, headOY] = pose.headOffset ?? [0, 0];
  const [sx, sy] = pose.bodyScale ?? [1, 1];
  const [hx, hy] = b.headCenter;

  const bodyRot = (pose.torsoLean ?? 0) + w('body', 0.9);
  const driftX = w('dx', 0.7, 0.06);
  const driftY = w('dy', 0.7, 0.075);
  const headRot = (pose.headTilt ?? 0) + w('head', 1.5, 0.11);
  const headBobY = w('bob', 1.1, 0.13);

  /** A noodle limb: one uniform-width stroke from anchor to hand or foot. */
  const limb = (anchor: readonly [number, number], l: Limb, key: string) => {
    const pts = quadPoints([anchor[0], anchor[1]], limbControl(anchor, l), [l.x, l.y], 12);
    return (
      <>
        {halo && <Ink pts={pts} pen="limb" size={13} color={PALETTE.paper} seed={`${seed}:${key}:halo`} />}
        <Ink pts={pts} pen="limb" color={palette.outline} seed={`${seed}:${key}`} />
      </>
    );
  };

  const oneHand = (l: Limb, state: HandState | undefined, rot: number | undefined, key: string) => (
    <g transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)})${rot ? ` rotate(${rot})` : ''}`}>
      {halo && <RoughAsset def={hand(handHaloDef(b))} variant={`${seed}${key}`} />}
      <RoughAsset def={hand(handDef(b, palette, state ?? 'mitten'))} variant={`${seed}${key}`} />
    </g>
  );

  /*
   * Arms go in front of the HEAD whenever a hand rises above the jaw.
   *
   * This head is 96 units wide sitting directly on a 38-unit torso, so it overhangs the
   * shoulders by ~29 units on each side. Any arm raised above the jawline therefore passes
   * through the head's footprint, and drawn behind it the whole arm disappears — the first
   * pose sheet had `celebrating`, `shockedBack` and `holdingSign` rendering as a plain
   * standing figure with no arms at all.
   *
   * Deriving it from the pose rather than from an author-set flag closes the bug class:
   * a new raised-arm pose cannot forget to set something. `Pose.armLayer` survives as the
   * explicit override for what geometry cannot infer: hands that belong ON the face, and
   * the two poses where being hidden behind the body is the entire point.
   */
  const jawY = b.headCenter[1] + b.headHH;
  const raised = pose.armL.y < jawY - 2 || pose.armR.y < jawY - 2;
  const layer = pose.armLayer ?? (raised ? 'overHead' : 'front');

  const arms = (
    <>
      {limb(shoulderOf(b, 'L'), pose.armL, 'armL')}
      {limb(shoulderOf(b, 'R'), pose.armR, 'armR')}
      {oneHand(pose.armL, pose.handL, pose.handRotL, 'L')}
      {oneHand(pose.armR, pose.handR, pose.handRotR, 'R')}
    </>
  );

  const foot = (l: Limb, dx: number, key: string) => (
    <g transform={`translate(${(l.x + dx).toFixed(2)} ${(l.y + 3.5).toFixed(2)})`}>
      {halo && <RoughAsset def={hand(footDef(b, palette, true))} variant={`${seed}${key}`} />}
      <RoughAsset def={hand(footDef(b, palette))} variant={`${seed}${key}`} />
    </g>
  );

  const worn = accessories.map((name) => def.accessories[name]).filter(Boolean);
  const inSlot = (slot: string) => worn.filter((a) => a.slot === slot);
  const hideHair = worn.some((a) => a.hidesHair);
  const renderSlot = (slot: string) =>
    inSlot(slot).map((a) => <React.Fragment key={a.id}>{a.render({ palette, build: b, seed })}</React.Fragment>);

  return (
    <g
      transform={`translate(${(x + driftX * scale).toFixed(2)} ${(y + driftY * scale).toFixed(2)}) scale(${(scale * (flip ? -1 : 1)).toFixed(4)} ${scale}) rotate(${rotate})`}
      opacity={opacity}
    >
      <g transform={`translate(${rootX} ${rootY})`}>
        <g transform={`rotate(${bodyRot.toFixed(2)}) scale(${sx} ${sy})`}>
          <g transform={`translate(0 ${((b.torsoTop + b.torsoBottom) / 2).toFixed(1)})`}>{renderSlot('back')}</g>

          {layer === 'behind' ? arms : null}

          {limb(hipOf(b, 'L'), pose.legL, 'legL')}
          {limb(hipOf(b, 'R'), pose.legR, 'legR')}
          {foot(pose.legL, -4, 'FL')}
          {foot(pose.legR, 4, 'FR')}

          {halo && <RoughAsset def={hand(pantsDef(b, palette, true))} variant={seed} />}
          <RoughAsset def={hand(pantsDef(b, palette))} variant={seed} />

          {halo && <RoughAsset def={hand(torsoDef(b, palette, true))} variant={seed} />}
          <RoughAsset def={hand(torsoDef(b, palette))} variant={seed} />

          <g transform={`translate(0 ${((b.torsoTop + b.torsoBottom) / 2).toFixed(1)})`}>{renderSlot('torso')}</g>

          {/* arms in front of the torso — the half of the floating-hands fix that layering owns */}
          {layer === 'front' ? arms : null}

          <g
            transform={`translate(${(hx + headOX).toFixed(2)} ${(hy + headOY + headBobY).toFixed(2)}) rotate(${headRot.toFixed(2)})`}
          >
            {halo && <RoughAsset def={hand(headDef(b, palette, true))} variant={seed} />}
            {halo && hairId && !hideHair && (
              <RoughAsset def={hand(hairHaloDef(hairId, PALETTE.paper))} variant={seed} />
            )}
            <RoughAsset def={hand(headDef(b, palette))} variant={seed} />
            {hairId && !hideHair && <RoughAsset def={hand(hairDef(hairId, palette))} variant={seed} />}
            {face}
            {renderSlot('head')}
            <g transform={`translate(0 ${(b.headHH * 0.08).toFixed(1)})`}>{renderSlot('face')}</g>
          </g>

          {layer === 'overHead' ? arms : null}

          {(propLeft || inSlot('handL').length > 0) && (
            <g transform={`translate(${pose.armL.x.toFixed(2)} ${pose.armL.y.toFixed(2)})`}>
              {propLeft}
              {renderSlot('handL')}
            </g>
          )}
          {(propRight || inSlot('handR').length > 0) && (
            <g transform={`translate(${pose.armR.x.toFixed(2)} ${pose.armR.y.toFixed(2)})`}>
              {propRight}
              {renderSlot('handR')}
            </g>
          )}

          {children}
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------
// creature
// ---------------------------------------------------------------------------

/**
 * Where the paws land for each named leg configuration, as offsets from the body centre.
 *
 * A cat loaf has no joints worth rigging, so legs are a lookup rather than a skeleton.
 * `null` means the configuration hides that paw entirely — which is most of what makes a
 * loaf a loaf.
 */
const PAWS: Record<string, ([number, number] | null)[]> = {
  loaf: [null, null, null, null],
  tuck: [null, null, null, null],
  stand: [[-20, 30], [-6, 32], [10, 32], [24, 30]],
  sit: [[-18, 32], [-4, 33], null, [22, 28]],
  walkA: [[-24, 28], [-6, 33], [8, 30], [26, 32]],
  walkB: [[-18, 32], [-2, 29], [12, 33], [22, 28]],
  runA: [[-30, 24], [-12, 33], [6, 26], [28, 33]],
  runB: [[-26, 33], [-8, 25], [12, 33], [30, 25]],
  jump: [[-22, 20], [-8, 24], [10, 24], [24, 20]],
  stretch: [[-32, 34], [-16, 34], [16, 30], [32, 28]],
  pounce: [[-22, 32], [-8, 34], [14, 28], [28, 26]],
};

type CreatureRenderProps = DoodleCharacterProps & {
  pose: CreaturePose;
  palette: CharacterPalette;
  seed: string;
  idle: number;
  face: React.ReactNode;
};

/**
 * Mochi, drawn from a handful of shapes.
 *
 * She gets her own renderer rather than a humanoid rig with unused joints. What she shares
 * with the rest of the cast is everything that matters for consistency: the same
 * stylizer, the same face vocabularies, the same halo rules, the same seed discipline.
 */
const Creature: React.FC<CreatureRenderProps> = ({
  pose,
  palette,
  seed,
  idle,
  face,
  x,
  y,
  scale = 1,
  flip = false,
  frame,
  halo: haloProp = false,
  opacity = 1,
  rotate = 0,
  silhouette = false,
  children,
}) => {
  const g = MOCHI_GEOM;
  const halo = haloProp && !silhouette;
  const w = (k: string, amp: number, spd = 0.09) => wobble(`${seed}:${k}`, frame, spd, amp * idle);

  const [rootX, rootY] = pose.rootOffset ?? [0, 0];
  const [bsx, bsy] = pose.bodyScale ?? [1, 1];
  const [headOX, headOY] = pose.headOffset ?? [0, 0];
  const [earL, earR] = pose.ears ?? [-5, 5];
  const [bcx, bcy] = g.bodyCenter;
  const [hcx, hcy] = g.headCenter;

  const bodyRot = (pose.bodyTilt ?? 0) + w('body', 1.1);
  const headRot = (pose.headTilt ?? 0) + w('head', 1.6, 0.12);

  /** The tail is her voice, so it is the only part with per-frame motion of its own. */
  const swing = (pose.tail.swing ?? 0) + w('tail', 0.18, 0.16);
  const [trx, try_] = g.tailRoot;
  const tailPts = quadPoints(
    [trx, try_],
    [trx + g.tailLen * (0.9 - pose.tail.curl * 0.7), try_ - g.tailLen * (0.35 + pose.tail.lift * 0.5) + swing * 14],
    [
      trx + g.tailLen * (0.45 + pose.tail.curl * 0.15),
      try_ - g.tailLen * (0.15 + pose.tail.lift) - swing * 18,
    ],
    14,
  );

  const ear = (side: -1 | 1, rot: number) => (
    <g transform={`translate(${side * g.earX} ${g.earY}) rotate(${(rot).toFixed(1)})`}>
      <RoughAsset
        def={hand({
          id: `mochi-ear-${side}`,
          shapes: [
            { k: 'polygon', pts: [[-g.earW / 2, 6], [g.earW / 2, 6], [side * 5, -g.earH]], fill: palette.skin, stroke: palette.outline, rough: 'character', sw: 3.4 },
            { k: 'polygon', pts: [[-g.earW / 4, 3], [g.earW / 4, 3], [side * 2.5, -g.earH * 0.6]], fill: palette.hair, stroke: 'none', rough: 'detail', roughness: 0.5, single: true },
          ],
        })}
        variant={`${seed}:ear${side}`}
      />
    </g>
  );

  /*
   * Paws are drawn AFTER the body, not before it.
   *
   * The first version drew them first and the body ellipse — 100 units wide — covered
   * every one of them, so Mochi had no legs in any pose on the sheet. They also sit on the
   * bottom edge of the body rather than inside it, which is where a loaf's feet actually
   * poke out.
   */
  const pawDef = (rx: number, ry: number) => ({
    id: `mochi-paw-${rx}`,
    shapes: [
      {
        k: 'ellipse' as const,
        cx: 0,
        cy: 0,
        rx,
        ry,
        fill: palette.skin,
        stroke: palette.outline,
        rough: 'detail' as const,
        sw: 2.6,
        roughness: 0.7,
        single: true,
      },
    ],
  });

  const lifted = pose.paws;
  const groundPaws = (PAWS[pose.legs] ?? PAWS.stand).map((pt, i) =>
    // a lifted front paw is drawn raised instead of planted
    pt === null || (lifted && i < 2) ? null : (
      <g key={i} transform={`translate(${pt[0]} ${pt[1]})`}>
        <RoughAsset def={hand(pawDef(g.pawRx, g.pawRy))} variant={`${seed}:paw${i}`} />
      </g>
    ),
  );

  const liftedPaws = lifted
    ? ([-1, 1] as const).map((side, i) => (
        <g key={side} transform={`translate(${side * g.pawX} ${12 + (lifted[i] ?? 0)})`}>
          <RoughAsset def={hand(pawDef(g.pawRx, g.pawRy * 1.1))} variant={`${seed}:pawup${side}`} />
        </g>
      ))
    : null;

  const blob = (cx: number, cy: number, rx: number, ry: number, id: string, isHalo: boolean) => ({
    id: `${id}${isHalo ? '-halo' : ''}`,
    shapes: [
      {
        k: 'ellipse' as const,
        cx,
        cy,
        rx: rx + (isHalo ? 3 : 0),
        ry: ry + (isHalo ? 3 : 0),
        fill: isHalo ? PALETTE.paper : palette.skin,
        stroke: isHalo ? PALETTE.paper : palette.outline,
        sw: isHalo ? 6 : undefined,
        rough: 'character' as const,
      },
    ],
  });

  return (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(scale * (flip ? -1 : 1)).toFixed(4)} ${scale}) rotate(${rotate})`}
      opacity={opacity}
    >
      <g transform={`translate(${rootX} ${rootY}) rotate(${bodyRot.toFixed(2)}) scale(${bsx} ${bsy})`}>
        {halo && <Ink pts={tailPts} pen="limb" size={14} color={PALETTE.paper} seed={`${seed}:tail:halo`} />}
        <Ink pts={tailPts} pen="limb" size={9} color={palette.outline} seed={`${seed}:tail`} />
        {!silhouette && (
          <Ink
            pts={tailPts.slice(-5)}
            pen="limb"
            size={9}
            color={palette.hair}
            seed={`${seed}:tailtip`}
          />
        )}

        {halo && <RoughAsset def={hand(blob(bcx, bcy, g.bodyRx, g.bodyRy, 'mochi-body', true))} variant={seed} />}
        <RoughAsset def={hand(blob(bcx, bcy, g.bodyRx, g.bodyRy, 'mochi-body', false))} variant={seed} />

        {groundPaws}
        {liftedPaws}

        <g transform={`translate(${hcx + headOX} ${hcy + headOY}) rotate(${headRot.toFixed(2)})`}>
          {ear(-1, earL)}
          {ear(1, earR)}
          {halo && <RoughAsset def={hand(blob(0, 0, g.headRx, g.headRy, 'mochi-head', true))} variant={seed} />}
          <RoughAsset def={hand(blob(0, 0, g.headRx, g.headRy, 'mochi-head', false))} variant={seed} />
          {face}
        </g>

        {children}
      </g>
    </g>
  );
};
