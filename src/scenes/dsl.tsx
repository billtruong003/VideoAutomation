/**
 * dsl.tsx — scenes as data.
 *
 * Batch 001 wrote one hand-authored `scenes.tsx` per episode, ~450 lines each, and PIPELINE.md
 * §11.1 names replacing that as the highest-value change left in the pipeline. `kit.tsx` argued
 * the opposite at the time and was right to: after ten storyboards only four patterns recurred,
 * and abstracting early would have frozen the wrong shape. Thirty storyboards later the shapes
 * have settled, and Batch 002 needs 105 scene components — nine thousand lines of bespoke
 * animation code, most of it the same six moves in a different order.
 *
 * So this is an INTERPRETER, not a renderer. It draws nothing itself. Every mark on screen
 * still comes from the existing components — Stage, the backgrounds, the props, the character
 * rig, SceneCamera, the fx marks, and the kit helpers. What this file removes is the
 * boilerplate of wiring them to frame numbers, and what it adds is a scene spec small enough
 * to read in one screen.
 *
 * THE RULE IT INHERITS AND MUST NOT BREAK: no scene may invent a frame number. Every `at` in a
 * spec is either a keyword anchor resolved through the episode clock, or seconds-in-scene
 * converted at the episode's own fps. Re-process the narration and every beat moves with it,
 * exactly as before. There is no literal frame number anywhere in this file or in any spec.
 *
 * What is deliberately NOT here: comedy. A spec can place, reveal, dim and punch. When an
 * episode wants a joke that needs real drawing, it registers a bespoke component for that one
 * scene and the interpreter steps aside — `SCENE_OVERRIDES` exists for exactly that, so the
 * DSL never becomes a cage.
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../animation/SceneCamera';
import { usePoseSwap } from '../animation/PoseSwap';
import { PALETTE } from '../style/tokens';
import { after, Dim, Label, Reveal, SlideIn, StampLabel } from './kit';
import { BACKGROUNDS, MARKS, PROPS } from './registry';
import type { Clock } from '../lib/clock';

/* ===================================================================== types */

/**
 * When something happens.
 *
 * A string is a keyword id from the episode's own keyword table — the spoken word the beat is
 * anchored to. A number is seconds from the start of THIS scene, used for secondary actions
 * that close a pacing gap and are not tied to a particular word. `{ fromEnd }` counts back
 * from the scene's end, which is how a final beat lands without being able to escape.
 */
export type At = string | number | { fromEnd: number };

type Common = {
  x: number;
  y: number;
  /** When it arrives. Absent means "present from the first frame of the scene". */
  at?: At;
  /** When it leaves. Absent means "stays for the rest of the scene". */
  until?: At;
};

export type Layer =
  | (Common & {
    k: 'prop';
    name: string;
    scale?: number;
    rotate?: number;
    flip?: boolean;
    seed?: string;
    /** How it arrives. Things in this channel POP or SLIDE; they do not fade. */
    enter?: 'pop' | 'slide' | 'none';
    slideFrom?: [number, number];
    /** Extra props forwarded to the component — `ventLit`, `section`, `open`, and so on. */
    args?: Record<string, unknown>;
    /** Dim this layer once `at` has passed on another layer. Used to point with contrast. */
    dimFrom?: At;
  })
  | (Common & {
    k: 'actor';
    who: string;
    pose: string;
    expression?: string;
    scale?: number;
    flip?: boolean;
    /** Pose/expression changes, each anchored like any other beat. Poses SNAP, never tween. */
    swaps?: { at: At; pose?: string; expression?: string }[];
  })
  | (Common & {
    k: 'label';
    text: string;
    size?: number;
    color?: string;
    rotate?: number;
    /** A stamp lands with an overshoot; a plain label simply holds. */
    stamp?: boolean;
  })
  | (Common & {
    k: 'mark';
    name: string;
    scale?: number;
    rotate?: number;
    args?: Record<string, unknown>;
  });

export type SceneSpec = {
  /** Background component name. Drawn behind the stage SVG. */
  bg: string;
  /** Paper tint, for a tonal shift inside a scene. */
  tint?: string;
  camera?: {
    punchAt?: At;
    punchAmount?: number;
    dolly?: { from: number; to: number; frames?: number };
    originX?: number;
    originY?: number;
  };
  layers: Layer[];
};

export type EpisodeSpec = {
  /** Scene id -> spec. Ids must match the scene ids in the episode's narration timing. */
  scenes: Record<string, SceneSpec>;
  /** Bare word -> palette colour, for burned-in captions. */
  highlights: Record<string, string>;
  /**
   * Scenes that need real drawing rather than arrangement. A component here replaces the
   * interpreter for that scene entirely.
   */
  overrides?: Record<string, React.FC>;
};

/* ================================================================ resolution */

/**
 * Resolve an `At` to a scene-relative frame.
 *
 * This is the one place the DSL touches time, and it is deliberately narrow: a keyword goes
 * through the clock, seconds go through the episode's own fps, and `fromEnd` is measured from
 * the scene's real duration. Nothing else can produce a frame, so no spec can drift away from
 * the audio.
 */
function resolveAt(at: At | undefined, ctx: SceneCtx, fallback: number): number {
  if (at === undefined) return fallback;
  if (typeof at === 'number') return Math.round(at * ctx.fps);
  if (typeof at === 'object') return ctx.duration - Math.round(at.fromEnd * ctx.fps);
  return ctx.clock.kwIn(ctx.sceneId, at);
}

type SceneCtx = {
  clock: Clock;
  sceneId: string;
  fps: number;
  duration: number;
  frame: number;
};

/** Is this layer on screen right now? */
const visible = (l: Layer, ctx: SceneCtx): boolean => {
  const from = resolveAt(l.at, ctx, 0);
  const to = l.until === undefined ? Infinity : resolveAt(l.until, ctx, Infinity);
  return ctx.frame >= from && ctx.frame < to;
};

/* ================================================================== layers */

const PropLayer: React.FC<{ l: Extract<Layer, { k: 'prop' }>; ctx: SceneCtx }> = ({ l, ctx }) => {
  const Comp = PROPS[l.name];
  if (!Comp) throw new Error(`[${ctx.sceneId}] unknown prop "${l.name}"`);

  const at = resolveAt(l.at, ctx, 0);
  const until = l.until === undefined ? undefined : resolveAt(l.until, ctx, Infinity);
  const dimAt = l.dimFrom === undefined ? undefined : resolveAt(l.dimFrom, ctx, Infinity);

  const node = (
    <Comp
      x={l.x}
      y={l.y}
      scale={l.scale ?? 1}
      rotate={l.rotate ?? 0}
      flip={l.flip}
      frame={ctx.frame}
      seed={l.seed ?? `${ctx.sceneId}:${l.name}`}
      {...(l.args ?? {})}
    />
  );

  const dimmed = dimAt === undefined
    ? node
    : <Dim active={after(ctx.frame, dimAt)}>{node}</Dim>;

  // Present from frame 0 with no declared entrance: just draw it, no wrapper.
  if (l.at === undefined && l.enter !== 'pop' && l.enter !== 'slide') {
    return until !== undefined && ctx.frame >= until ? null : dimmed;
  }
  if (l.enter === 'slide') {
    const [fx, fy] = l.slideFrom ?? [-320, 0];
    return <SlideIn frame={ctx.frame} at={at} fromX={fx} fromY={fy}>{dimmed}</SlideIn>;
  }
  if (l.enter === 'none') {
    return visible(l, ctx) ? dimmed : null;
  }
  return (
    <Reveal frame={ctx.frame} at={at} until={until} originX={l.x} originY={l.y}>
      {dimmed}
    </Reveal>
  );
};

const ActorLayer: React.FC<{ l: Extract<Layer, { k: 'actor' }>; ctx: SceneCtx }> = ({ l, ctx }) => {
  /*
   * Poses are quantised to twos. That contrast — stepped character against a camera that moves
   * every frame — is what makes limited animation read as deliberate rather than cheap, and it
   * is a channel rule rather than a preference, so the DSL applies it rather than offering it.
   */
  const swaps = [
    { at: 0, pose: l.pose, expression: l.expression },
    ...(l.swaps ?? []).map((s) => ({
      at: resolveAt(s.at, ctx, 0),
      pose: s.pose ?? l.pose,
      expression: s.expression ?? l.expression,
    })),
  ];
  /*
   * Pose and character names are strings in a spec and typed unions in the rig. The cast is
   * confined to these two lines: an unknown pose throws inside the character rig with the name
   * it was given, which is a better error than the spec author would get from a union of
   * fifty-seven literals.
   */
  const pose = usePoseSwap(
    swaps.map((s) => ({ at: s.at, pose: s.pose })) as never,
    ctx.frame,
    2,
  );

  // The expression in force is the last swap whose frame has passed.
  const expression = swaps.reduce(
    (acc, s) => (ctx.frame >= s.at && s.expression ? s.expression : acc),
    l.expression ?? 'neutral',
  );

  if (!visible(l, ctx)) return null;

  return (
    <DoodleCharacter
      character={l.who as never}
      pose={pose}
      expression={expression as never}
      x={l.x}
      y={l.y}
      scale={l.scale ?? 2.5}
      frame={ctx.frame}
      flip={l.flip}
      seed={`${ctx.sceneId}:${l.who}`}
    />
  );
};

const LabelLayer: React.FC<{ l: Extract<Layer, { k: 'label' }>; ctx: SceneCtx }> = ({ l, ctx }) => {
  const at = resolveAt(l.at, ctx, 0);
  const until = l.until === undefined ? undefined : resolveAt(l.until, ctx, Infinity);

  if (l.stamp === false) {
    return visible(l, ctx)
      ? <Label x={l.x} y={l.y} text={l.text} size={l.size} color={l.color} rotate={l.rotate} />
      : null;
  }
  return (
    <StampLabel
      frame={ctx.frame}
      at={at}
      until={until}
      x={l.x}
      y={l.y}
      text={l.text}
      size={l.size}
      color={l.color ?? PALETTE.coral}
      rotate={l.rotate}
    />
  );
};

const MarkLayer: React.FC<{ l: Extract<Layer, { k: 'mark' }>; ctx: SceneCtx }> = ({ l, ctx }) => {
  const Comp = MARKS[l.name];
  if (!Comp) throw new Error(`[${ctx.sceneId}] unknown mark "${l.name}"`);
  const at = resolveAt(l.at, ctx, 0);
  const until = l.until === undefined ? undefined : resolveAt(l.until, ctx, Infinity);

  const node = (
    <Comp
      x={l.x}
      y={l.y}
      scale={l.scale ?? 1}
      rotate={l.rotate ?? 0}
      frame={ctx.frame}
      seed={`${ctx.sceneId}:${l.name}:${Math.round(l.x)}`}
      {...(l.args ?? {})}
    />
  );

  if (l.at === undefined) return visible(l, ctx) ? node : null;
  return (
    <Reveal frame={ctx.frame} at={at} until={until} originX={l.x} originY={l.y}>
      {node}
    </Reveal>
  );
};

/* ================================================================== render */

/**
 * Build the React component for one scene of one episode.
 *
 * Returned as a component rather than rendered directly because `Episode.tsx` mounts each
 * scene inside its own `<Sequence>`, which is what makes `useCurrentFrame()` scene-relative.
 */
export function makeScene(clock: Clock, sceneId: string, spec: SceneSpec): React.FC {
  const Scene: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const duration = clock.sceneFrames(sceneId);
    const ctx: SceneCtx = { clock, sceneId, fps, duration, frame };

    const Bg = BACKGROUNDS[spec.bg];
    if (!Bg) throw new Error(`[${sceneId}] unknown background "${spec.bg}"`);

    const cam = spec.camera ?? {};
    const punchAt = cam.punchAt === undefined ? null : resolveAt(cam.punchAt, ctx, 0);
    const punch = punchAt === null
      ? 1
      : useCameraPunch(frame, punchAt, { amount: cam.punchAmount ?? 0.12, duration: 16 });
    const dolly = cam.dolly
      ? useCameraDolly(frame, {
        from: cam.dolly.from,
        to: cam.dolly.to,
        start: 0,
        duration: cam.dolly.frames ?? 24,
      })
      : 1;

    return (
      <Stage tint={spec.tint}>
        <SceneCamera
          zoom={punch * dolly}
          originX={cam.originX}
          originY={cam.originY}
        >
          {/*
            The background is SVG content and belongs INSIDE the camera group, exactly where a
            hand-written scene puts it. Stage's `behind` slot sits outside the <svg>, so a
            background handed to it renders nothing at all — silently, since an SVG element in
            an HTML parent is simply not drawn. Inside the camera it also pans and zooms with
            the shot, which is what makes a punch read as a camera move rather than a prop
            growing.
          */}
          <Bg frame={frame} />

          {spec.layers.map((l, i) => {
            const key = `${l.k}:${i}`;
            if (l.k === 'prop') return <PropLayer key={key} l={l} ctx={ctx} />;
            if (l.k === 'actor') return <ActorLayer key={key} l={l} ctx={ctx} />;
            if (l.k === 'label') return <LabelLayer key={key} l={l} ctx={ctx} />;
            return <MarkLayer key={key} l={l} ctx={ctx} />;
          })}
        </SceneCamera>
      </Stage>
    );
  };
  return Scene;
}

/**
 * Turn a whole episode spec into the `{ SCENES, HIGHLIGHTS }` shape `Episode.tsx` already
 * consumes, so nothing downstream of here knows the DSL exists.
 */
export function makeEpisode(clock: Clock, spec: EpisodeSpec): {
  SCENES: Record<string, React.FC>;
  HIGHLIGHTS: Record<string, string>;
} {
  const SCENES: Record<string, React.FC> = {};
  for (const [id, s] of Object.entries(spec.scenes)) {
    SCENES[id] = spec.overrides?.[id] ?? makeScene(clock, id, s);
  }
  for (const [id, Comp] of Object.entries(spec.overrides ?? {})) SCENES[id] ??= Comp;
  return { SCENES, HIGHLIGHTS: spec.highlights };
}
