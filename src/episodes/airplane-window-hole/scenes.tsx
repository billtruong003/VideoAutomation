/**
 * Episode 01 — "The Hole In Your Airplane Window Is Supposed To Be There"
 *
 * The shape of the episode: a thing you assumed was a defect turns out to be load-bearing.
 * So the hole is introduced as a THREAT (circled in coral, Bill recoiling) and finishes as a
 * hero (the same circle, flipped to teal). Reusing the identical mark for both readings is
 * the whole rhetorical move, and it is cheaper than any amount of new drawing.
 *
 * Rules this episode obeys:
 *   - the window AND its hole are legible at frame 0; there is no establishing shot
 *   - the mechanism scenes are flat side-on cutaways, never perspective — a 5-unit hole in
 *     perspective is nothing
 *   - Gus arrives, does nothing, and leaves; the restraint is the joke
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { GagCard } from '../../components/GagCard';
import { PlaneCabin, CutawayVoid } from '../../backgrounds/everyday';
import { AirplaneWindow, WindowPaneStack, PlaneSection, Cloud, PANE_X, PANE_HOLE_Y } from '../../props/travel';
import { CircleIt, FlowArrows, Tick } from '../../fx/diagram';
import { QuestionMark, SweatDrops, Sparkles } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraShake, useCameraDolly } from '../../animation/SceneCamera';
import { useIdleLook } from '../../animation/EyeLook';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('airplane-window-hole');

/** Only the words the episode is actually about. Anything more and nothing is emphasised. */
export const HIGHLIGHTS = {
  hole: PALETTE.coral,
  defect: PALETTE.coral,
  pressure: PALETTE.coral,
  layers: PALETTE.teal,
  panes: PALETTE.teal,
  pane: PALETTE.teal,
  moisture: PALETTE.teal,
  supposed: PALETTE.gold,
};

/** Where the window sits in the cabin shot, and where its hole lands on screen there. */
const WIN_X = 700;
const WIN_Y = 700;
const WIN_SCALE = 3.1;
const HOLE_Y = WIN_Y + (112 / 2 - 22) * WIN_SCALE;

/**
 * The cutaway's placement, shared by all three diagram scenes.
 *
 * Centred at y=820 rather than 860 and scaled 3.0: at 2.5 the stack read as three thin bars
 * in a mostly empty frame. Everything below y≈1350 belongs to the caption band (y=1442) and
 * the Shorts bottom bar, so the diagram is kept clear of it and any character in these scenes
 * stands ABOVE it — the first pass put Bill at y=1600 and his head sat inside the captions.
 */
const CUT_X = 540;
const CUT_Y = 820;
const CUT_S = 3.0;

/** Stage-space position of a pane, so a label can never drift off the thing it names. */
const paneAt = (which: keyof typeof PANE_X) => CUT_X + PANE_X[which] * CUT_S;
const HOLE_STAGE_Y = CUT_Y + PANE_HOLE_Y * CUT_S;

// ===========================================================================
// hook — nose to the glass, the hole gets circled, Bill recoils
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_HOLE = C.kwIn(S1, 'hole');
  const F_SUPPOSED = C.kwIn(S1, 'supposed');
  const F_DEADPAN = C.beforeEnd(S1, 0.15);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'leanForward' },
      { at: F_HOLE, pose: 'surprised' },
      { at: F_SUPPOSED, pose: 'shockedBack' },
      { at: F_DEADPAN, pose: 'neutral' },
    ],
    frame,
    2,
  );

  const expression = after(frame, F_DEADPAN)
    ? 'deadpan'
    : after(frame, F_SUPPOSED)
      ? 'horrified'
      : after(frame, F_HOLE)
        ? 'surprised'
        : 'curious';

  const idle = useIdleLook(frame, { seed: 'ep1-hook', holdFrames: 20, range: 0.35 });
  const look: [number, number] = after(frame, F_DEADPAN)
    ? [0, 0]
    : after(frame, F_HOLE)
      ? [0.8, 0.3]
      : idle;

  // He is pressed to the glass, then thrown back by what he sees.
  const recoil = ramp(frame, F_SUPPOSED, 7);
  const billX = 380 - recoil * 96;

  const punch = useCameraPunch(frame, F_HOLE, { amount: 0.16, duration: 16 });
  const punch2 = useCameraPunch(frame, F_SUPPOSED, { amount: 0.08, duration: 12 });
  const shake = useCameraShake(frame, F_SUPPOSED, { amount: 11, duration: 10, seed: 'ep1' });

  return (
    <Stage>
      <SceneCamera
        zoom={punch * punch2}
        x={shake.x}
        y={shake.y}
        rotate={shake.rotate}
        originX={WIN_X}
        originY={WIN_Y}
      >
        <PlaneCabin frame={frame} />

        <AirplaneWindow
          x={WIN_X}
          y={WIN_Y}
          scale={WIN_SCALE}
          frame={frame}
          seed="ep1-window"
          holeLit={after(frame, F_HOLE)}
        />

        {/* the mark that carries the episode: coral now, teal at the end */}
        {after(frame, F_HOLE) && (
          <g transform={`scale(${snap(frame, F_HOLE)})`} style={{ transformOrigin: `${WIN_X}px ${HOLE_Y}px` }}>
            <CircleIt x={WIN_X} y={HOLE_Y} rx={62} ry={54} frame={frame} seed="ep1-mark" />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={expression}
          x={billX}
          y={1210}
          scale={3.0}
          frame={frame}
          seed="bill"
          gaze={look}
        />

        {between(frame, F_SUPPOSED, F_SUPPOSED + 40) && (
          <SweatDrops x={billX + 130} y={800} scale={2.1} frame={frame} seed="ep1-sweat" />
        )}

        {after(frame, F_DEADPAN + 3) && (
          <Reveal frame={frame} at={F_DEADPAN + 3} originX={billX - 190} originY={760}>
            <QuestionMark x={billX - 190} y={760} scale={2.4} frame={frame} seed="ep1-q" />
          </Reveal>
        )}

        <GagCard frame={frame} at={F_HOLE} text="A HOLE?" x={430} y={330} size={150} tilt={-6} seed="ep1-gag" />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// layers — the cutaway builds itself, one pane at a time
// ===========================================================================

const S2 = 'layers';

const Layers: React.FC = () => {
  const frame = useCurrentFrame();

  const F_STACK = C.kwIn(S2, 'multiple-layers');
  const F_BREATHER = C.kwIn(S2, 'breather');
  const F_INNER = C.kwIn(S2, 'inner-panes');

  const dolly = useCameraDolly(frame, { from: 1.18, to: 1.0, start: 0, duration: 22 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        {/* the panes arrive from the right and stack, one per beat */}
        <g transform={`translate(${CUT_X} ${CUT_Y}) scale(${CUT_S})`}>
          <SlideIn frame={frame} at={F_STACK} fromX={260} frames={9}>
            <WindowPaneStack
              x={0}
              y={0}
              frame={frame}
              seed="ep1-stack"
              focus={after(frame, F_INNER) ? 'middle' : 'none'}
            />
          </SlideIn>
        </g>

        {/* labels sit on the panes they name, derived from the prop rather than guessed */}
        <StampLabel frame={frame} at={F_STACK + 6} x={paneAt('outer')} y={370} text="OUTER" size={46} color={PALETTE.ink} rotate={-4} />
        <StampLabel frame={frame} at={F_STACK + 10} x={paneAt('middle')} y={300} text="MIDDLE" size={46} color={PALETTE.ink} rotate={2} />
        <StampLabel frame={frame} at={F_STACK + 14} x={paneAt('inner')} y={370} text="INNER" size={46} color={PALETTE.ink} rotate={-3} />

        {/* the hole gets pointed at, in the pane it actually lives in */}
        {after(frame, F_BREATHER) && (
          <>
            <Reveal frame={frame} at={F_BREATHER} originX={paneAt('middle')} originY={HOLE_STAGE_Y}>
              <CircleIt x={paneAt('middle')} y={HOLE_STAGE_Y} rx={86} ry={74} frame={frame} seed="ep1-breather-mark" />
            </Reveal>
            <StampLabel
              frame={frame}
              at={F_BREATHER + 4}
              x={CUT_X}
              y={1290}
              text="BREATHER HOLE"
              size={62}
              rotate={-2}
            />
          </>
        )}

        {after(frame, F_INNER) && (
          <Label x={CUT_X} y={1385} text="it lives in the middle pane" size={38} color={PALETTE.inkSoft} />
        )}

        <DoodleCharacter
          character="bill"
          pose="thinking"
          expression="focused"
          x={165}
          y={1330}
          scale={1.25}
          frame={frame}
          seed="bill"
        />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// pressure — the outer pane visibly takes the load
// ===========================================================================

const S3 = 'pressure';

const Pressure: React.FC = () => {
  const frame = useCurrentFrame();

  const F_PRESSURE = C.kwIn(S3, 'pressure');
  const F_OUTER = C.kwIn(S3, 'outer-pane');
  const F_ALT = C.kwIn(S3, 'altitude');

  // the outer pane bows under load and holds — a few units only; more reads as breaking
  const bow = ramp(frame, F_PRESSURE, 14) * 9 * (after(frame, F_ALT) ? 0 : 1);
  const wide = after(frame, F_ALT);
  const pull = ramp(frame, F_ALT, 20);

  return (
    <Stage>
      <SceneCamera originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        {/* the cutaway lifts and fades out as the shot widens to the whole aircraft */}
        {pull < 0.9 && (
          <g
            transform={`translate(${CUT_X} ${CUT_Y - pull * 260}) scale(${CUT_S - pull * 1.2})`}
            opacity={1 - pull}
          >
            <WindowPaneStack
              x={0}
              y={0}
              frame={frame}
              seed="ep1-stack"
              bow={bow}
              focus={after(frame, F_OUTER) ? 'outer' : 'none'}
            />
          </g>
        )}

        {/* pressure pushing in on the outer pane */}
        {after(frame, F_PRESSURE) && !wide && (
          <g opacity={1 - pull}>
            <FlowArrows x={130} y={CUT_Y} scale={2.4} frame={frame} count={5} len={190} seed="ep1-press" color={PALETTE.coral} />
            <Label x={140} y={1200} text="PRESSURE" size={48} color={PALETTE.coral} />
          </g>
        )}

        {after(frame, F_OUTER) && !wide && (
          <StampLabel frame={frame} at={F_OUTER} x={paneAt('outer')} y={330} text="STRUCTURAL" size={56} rotate={-3} />
        )}

        {/* the aircraft, at altitude */}
        {wide && (
          <>
            <SlideIn frame={frame} at={F_ALT} fromX={-320} frames={16}>
              <PlaneSection x={CUT_X} y={980} scale={2.0} frame={frame} seed="ep1-plane" />
              {/* the window this whole episode has been about, marked on the actual aircraft */}
              <CircleIt x={CUT_X - 130} y={956} rx={70} ry={46} frame={frame} seed="ep1-plane-win" />
            </SlideIn>
            <Cloud x={200 + ((frame - F_ALT) * 2.4) % 1200} y={1300} scale={1.5} frame={frame} seed="ep1-cloud-a" />
            <Cloud x={880 - ((frame - F_ALT) * 1.8) % 1100} y={560} scale={1.2} frame={frame} seed="ep1-cloud-b" />
            <Label x={CUT_X} y={380} text="AT ALTITUDE" size={52} color={PALETTE.inkSoft} opacity={ramp(frame, F_ALT + 6, 10)} />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// moisture — the same hole, doing its second job
// ===========================================================================

const S4 = 'moisture';

const Moisture: React.FC = () => {
  const frame = useCurrentFrame();
  const F_MOIST = C.kwIn(S4, 'moisture');

  // fog fills the gap, then streams out through the hole
  const fog = after(frame, F_MOIST) ? 1 - ramp(frame, F_MOIST, 26) : ramp(frame, 0, 16);

  return (
    <Stage>
      <SceneCamera originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        <g transform={`translate(${CUT_X} ${CUT_Y}) scale(${CUT_S})`}>
          <WindowPaneStack x={0} y={0} frame={frame} seed="ep1-stack" focus="none" />
        </g>

        {/* the fog itself: a soft band in the gap between outer and middle, clearing as it escapes */}
        <rect
          x={paneAt('outer') + 22}
          y={CUT_Y - 330}
          width={paneAt('middle') - paneAt('outer') - 44}
          height={660}
          fill={PALETTE.grey}
          opacity={fog * 0.8}
          rx={22}
        />

        {after(frame, F_MOIST) && (
          <g opacity={1 - ramp(frame, F_MOIST + 20, 14)}>
            <FlowArrows
              x={paneAt('middle') + 130}
              y={HOLE_STAGE_Y}
              scale={1.9}
              frame={frame}
              count={3}
              len={90}
              seed="ep1-escape"
              color={PALETTE.teal}
            />
          </g>
        )}

        <StampLabel frame={frame} at={F_MOIST} x={CUT_X} y={1300} text="MOISTURE OUT" size={60} color={PALETTE.teal} rotate={2} />

        {after(frame, F_MOIST + 22) && (
          <Reveal frame={frame} at={F_MOIST + 22} originX={870} originY={620}>
            <Tick x={870} y={620} scale={1.9} frame={frame} seed="ep1-tick" />
          </Reveal>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// verdict — Gus arrives, contributes nothing, leaves
// ===========================================================================

const S5 = 'verdict';

const Verdict: React.FC = () => {
  const frame = useCurrentFrame();

  const F_DEFECT = C.kwIn(S5, 'defect');
  const F_GUS = F_DEFECT + 18;
  const F_GONE = C.beforeEnd(S5, 0.1);

  const billPose = usePoseSwap(
    [
      { at: 0, pose: 'pointUp' },
      { at: F_GUS + 10, pose: 'tinyShrug' },
      { at: F_GONE, pose: 'neutral' },
    ],
    frame,
    2,
  );

  // Gus walks in, stops, and walks out again. He never changes expression.
  const gusIn = ramp(frame, F_GUS, 14);
  const gusOut = ramp(frame, F_GONE, 14);
  const gusX = 1290 - gusIn * 480 - gusOut * 460;

  const punch = useCameraPunch(frame, F_DEFECT, { amount: 0.07, duration: 12 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={620} originY={860}>
        <PlaneCabin frame={frame} />

        <AirplaneWindow x={WIN_X} y={WIN_Y} scale={WIN_SCALE} frame={frame} seed="ep1-window" holeLit />

        <DoodleCharacter
          character="bill"
          pose={billPose}
          expression={after(frame, F_GUS + 12) ? 'worried' : 'panic'}
          x={360}
          y={1210}
          scale={3.0}
          frame={frame}
          seed="bill"
        />

        {between(frame, F_GUS - 2, F_GONE + 40) && (
          <DoodleCharacter
            character="gus"
            pose="armsBehindBack"
            expression="deadpan"
            x={gusX}
            y={1230}
            scale={2.9}
            frame={frame}
            seed="gus"
          />
        )}

        <StampLabel frame={frame} at={F_DEFECT} x={700} y={470} text="NOT A DEFECT" size={72} rotate={-7} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the suspicious mark is promoted, then hard cut
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SUS = C.kwIn(S6, 'suspicious');
  const F_FLIP = F_SUS + 27;
  const F_END = C.kwIn(S6, '1st-place');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'suspicious' },
      { at: F_FLIP, pose: 'standAlert' },
      { at: F_END, pose: 'pointing' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_FLIP, { amount: 0.09, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={WIN_X} originY={HOLE_Y}>
        <PlaneCabin frame={frame} />

        <AirplaneWindow x={WIN_X} y={WIN_Y} scale={WIN_SCALE} frame={frame} seed="ep1-window" holeLit />

        {/* the same circle as the hook, re-drawn in teal — suspect becomes hero */}
        {after(frame, F_SUS) && (
          <g transform={`scale(${snap(frame, F_SUS)})`} style={{ transformOrigin: `${WIN_X}px ${HOLE_Y}px` }}>
            <CircleIt
              x={WIN_X}
              y={HOLE_Y}
              rx={62}
              ry={54}
              frame={frame}
              seed={after(frame, F_FLIP) ? 'ep1-mark-good' : 'ep1-mark'}
              color={after(frame, F_FLIP) ? PALETTE.teal : PALETTE.coral}
            />
          </g>
        )}

        {between(frame, F_FLIP, F_FLIP + 30) && (
          <Sparkles x={WIN_X} y={HOLE_Y} scale={2.6} frame={frame} count={10} seed="ep1-promote" />
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_FLIP) ? 'content' : 'suspicious'}
          x={340}
          y={1210}
          scale={3.0}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_END) && (
          <StampLabel frame={frame} at={F_END} x={540} y={420} text="LOAD-BEARING" size={64} color={PALETTE.teal} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  layers: Layers,
  pressure: Pressure,
  moisture: Moisture,
  verdict: Verdict,
  payoff: Payoff,
};
