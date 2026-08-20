/**
 * Episode 03 — "How A Gas Pump Knows Your Tank Is Full"
 *
 * The most mechanism-heavy episode in the batch: five of its seven scenes live inside one
 * cutaway. That is deliberate — the whole appeal is that a machine reads your car with no
 * electronics at all, and the only way to show "no electronics" is to show the parts.
 *
 * The cutaway is ONE prop across four scenes, driven by four booleans and a fuel level. Four
 * separate drawings would have drifted, and the episode's argument depends on the viewer
 * believing it is watching the same object the whole time.
 *
 * Gus stands in the forecourt from the first frame of the payoff scene and does exactly one
 * thing at the end. He is not a punchline delivery system; he is the person who already knew.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { GagCard } from '../../components/GagCard';
import { GasStation, CutawayVoid } from '../../backgrounds/everyday';
import { GasPump, FuelNozzle, NozzleCutaway, CarSide } from '../../props/machines';
import { CircleIt, CrossOut, FlowArrows } from '../../fx/diagram';
import { Sparkles, ImpactStar, MotionLines } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraShake, useCameraDolly } from '../../animation/SceneCamera';
import { ImpactLines } from '../../animation/ImpactLines';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, StampLabel } from '../../scenes/kit';

const C = clockFor('gas-pump-shutoff');

export const HIGHLIGHTS = {
  click: PALETTE.coral,
  full: PALETTE.gold,
  hole: PALETTE.coral,
  air: PALETTE.teal,
  airflow: PALETTE.teal,
  pressure: PALETTE.coral,
  diaphragm: PALETTE.violet,
  valve: PALETTE.coral,
  wifi: PALETTE.greyDeep,
  computer: PALETTE.greyDeep,
};

/** The cutaway sits in the same place in every diagram scene, so cuts between them are cuts. */
const CUT_X = 540;
const CUT_Y = 900;
const CUT_S = 2.9;

// ===========================================================================
// hook — the click, before any explanation
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_FULL = C.kwIn(S1, 'full');
  const F_TALK = C.kwIn(S1, 'talking');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingSmall' },
      { at: F_FULL, pose: 'shockedBack' },
      { at: F_TALK, pose: 'confused' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_FULL, { amount: 0.12, duration: 14 });
  const shake = useCameraShake(frame, F_FULL, { amount: 12, duration: 10, seed: 'ep3' });

  // the "signal" the car never sends: a dashed line that reaches, snaps, and drops
  const reach = ramp(frame, F_TALK, 10);
  const snapT = ramp(frame, F_TALK + 12, 8);

  return (
    <Stage>
      <SceneCamera zoom={punch} x={shake.x} y={shake.y} rotate={shake.rotate} originX={620} originY={1000}>
        <GasStation frame={frame} />

        <GasPump x={930} y={1330} scale={1.9} frame={frame} seed="ep3-pump" display={after(frame, F_FULL) ? 'FULL' : ''} />
        <CarSide x={620} y={1370} scale={1.6} frame={frame} seed="ep3-car" />
        <FuelNozzle x={372} y={1290} scale={1.7} frame={frame} seed="ep3-nozzle" rotate={-12} />

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_TALK) ? 'confused' : after(frame, F_FULL) ? 'surprised' : 'annoyed'}
          x={300}
          y={1277}
          scale={2.8}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_FULL) && (
          <>
            <ImpactLines frame={frame} at={F_FULL} x={470} y={1130} count={12} reach={110} color={PALETTE.gold} />
            <GagCard frame={frame} at={F_FULL} until={F_TALK} text="CLICK." x={540} y={380} size={150} tilt={-5} seed="ep3-gag" />
          </>
        )}

        {/* the signal that does not exist */}
        {after(frame, F_TALK) && (
          <g opacity={1 - snapT}>
            <line
              x1={520}
              y1={1080}
              x2={520 + reach * 250}
              y2={1080 - snapT * 180}
              stroke={PALETTE.violet}
              strokeWidth={7}
              strokeDasharray="18 14"
            />
          </g>
        )}
        {after(frame, F_TALK + 12) && (
          <Reveal frame={frame} at={F_TALK + 12} originX={660} originY={1010}>
            <CrossOut x={660} y={1010} scale={1.5} frame={frame} seed="ep3-nosignal" />
          </Reveal>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// nozzle — dive into the tip
// ===========================================================================

const S2 = 'nozzle';

const Nozzle: React.FC = () => {
  const frame = useCurrentFrame();

  const F_HOLE = C.kwIn(S2, 'sensing-hole');
  const F_PASSAGE = C.kwIn(S2, 'air-passage');

  const dolly = useCameraDolly(frame, { from: 1.5, to: 1.0, start: 0, duration: 24 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        <NozzleCutaway
          x={CUT_X}
          y={CUT_Y}
          scale={CUT_S}
          frame={frame}
          seed="ep3-cut"
          holeLit={after(frame, F_HOLE)}
          passageLit={after(frame, F_PASSAGE)}
        />

        {after(frame, F_HOLE) && (
          <>
            <Reveal frame={frame} at={F_HOLE} originX={CUT_X - 39} originY={CUT_Y + 267}>
              <CircleIt x={CUT_X - 39} y={CUT_Y + 267} rx={64} ry={56} frame={frame} seed="ep3-holemark" />
            </Reveal>
            <StampLabel frame={frame} at={F_HOLE + 3} x={250} y={1420} text="SENSING HOLE" size={52} rotate={-4} />
          </>
        )}

        {after(frame, F_PASSAGE) && (
          <StampLabel
            frame={frame}
            at={F_PASSAGE}
            x={790}
            y={620}
            text="AIR PASSAGE"
            size={50}
            color={PALETTE.teal}
            rotate={3}
          />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// pumping — the baseline: air moves freely
// ===========================================================================

const S3 = 'pumping';

const Pumping: React.FC = () => {
  const frame = useCurrentFrame();
  const F_AIR = C.kwIn(S3, 'air-move');

  // fuel rises slowly through the whole scene, so the next scene's cut-off has somewhere to come from
  const level = ramp(frame, 0, C.sceneFrames(S3)) * 0.55;

  return (
    <Stage>
      <SceneCamera originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        <NozzleCutaway x={CUT_X} y={CUT_Y} scale={CUT_S} frame={frame} seed="ep3-cut" fuelLevel={level} passageLit />

        {after(frame, F_AIR) && (
          <g transform="rotate(-90 250 900)">
            <FlowArrows x={250} y={900} scale={2.0} frame={frame} count={4} len={180} seed="ep3-air" alive />
          </g>
        )}

        <Label x={250} y={560} text="AIR MOVES" size={50} color={PALETTE.teal} opacity={ramp(frame, F_AIR, 10)} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// covered — the turn: fuel seals the hole and the air stops
// ===========================================================================

const S4 = 'covered';

const Covered: React.FC = () => {
  const frame = useCurrentFrame();

  const F_GAS = C.kwIn(S4, 'gasoline');
  const F_COVER = C.kwIn(S4, 'cover');
  const F_FLOW = C.kwIn(S4, 'airflow');

  const level = 0.55 + ramp(frame, F_GAS, Math.max(8, F_COVER - F_GAS)) * 0.45;
  const dead = after(frame, F_COVER);

  return (
    <Stage>
      <SceneCamera originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        <NozzleCutaway
          x={CUT_X}
          y={CUT_Y}
          scale={CUT_S}
          frame={frame}
          seed="ep3-cut"
          fuelLevel={level}
          holeLit={!dead}
          passageLit
        />

        <g transform="rotate(-90 250 900)">
          <FlowArrows x={250} y={900} scale={2.0} frame={frame} count={4} len={180} seed="ep3-air" alive={!dead} />
        </g>

        {after(frame, F_COVER) && (
          <StampLabel frame={frame} at={F_COVER} x={540} y={1500} text="HOLE COVERED" size={58} rotate={-3} />
        )}

        {after(frame, F_FLOW) && (
          <>
            <Label x={250} y={560} text="AIRFLOW STOPS" size={48} color={PALETTE.coral} opacity={ramp(frame, F_FLOW, 8)} />
            <Reveal frame={frame} at={F_FLOW} originX={790} originY={420}>
              <Label x={790} y={420} text="VACUUM" size={44} color={PALETTE.violet} rotate={5} />
            </Reveal>
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// click — the diaphragm fires and the valve drops
// ===========================================================================

const S5 = 'click';

const Click: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CHANGE = C.kwIn(S5, 'pressure-change');
  const F_DIA = C.kwIn(S5, 'diaphragm');
  const F_CLICK = C.kwIn(S5, 'click-word');
  const F_VALVE = C.kwIn(S5, 'valve');

  const shake = useCameraShake(frame, F_CLICK, { amount: 18, duration: 12, seed: 'ep3-click' });
  const punch = useCameraPunch(frame, F_CLICK, { amount: 0.14, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} x={shake.x} y={shake.y} rotate={shake.rotate} originX={CUT_X} originY={CUT_Y}>
        <CutawayVoid frame={frame} />

        <NozzleCutaway
          x={CUT_X}
          y={CUT_Y}
          scale={CUT_S}
          frame={frame}
          seed="ep3-cut"
          fuelLevel={1}
          passageLit
          valveShut={after(frame, F_CLICK)}
        />

        {after(frame, F_CHANGE) && (
          <StampLabel frame={frame} at={F_CHANGE} x={250} y={480} text="PRESSURE DROPS" size={46} rotate={-4} />
        )}

        {after(frame, F_DIA) && (
          <Reveal frame={frame} at={F_DIA} originX={CUT_X} originY={CUT_Y - 522}>
            <CircleIt x={CUT_X} y={CUT_Y - 522} rx={110} ry={70} frame={frame} seed="ep3-dia" color={PALETTE.violet} />
          </Reveal>
        )}
        {after(frame, F_DIA) && (
          <Label x={830} y={280} text="DIAPHRAGM" size={46} color={PALETTE.violet} opacity={ramp(frame, F_DIA, 8)} />
        )}

        {after(frame, F_CLICK) && (
          <>
            <ImpactLines frame={frame} at={F_CLICK} x={CUT_X} y={CUT_Y - 380} count={14} reach={150} color={PALETTE.coral} />
            <g transform={`scale(${snap(frame, F_CLICK)})`} style={{ transformOrigin: '540px 350px' }}>
              <Label x={540} y={350} text="CLICK" size={140} color={PALETTE.coral} rotate={-5} />
            </g>
          </>
        )}

        {after(frame, F_VALVE) && (
          <StampLabel frame={frame} at={F_VALVE} x={540} y={1560} text="VALVE SHUT" size={58} rotate={2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// no-tech — three denials
// ===========================================================================

const S6 = 'no-tech';

const NoTech: React.FC = () => {
  const frame = useCurrentFrame();

  const F_WIFI = C.kwIn(S6, 'wifi');
  const F_COMP = C.kwIn(S6, 'computer');
  const F_SIG = C.kwIn(S6, 'secret-signal');

  /** Each denial: the thing pops in, then gets crossed out 10 frames later. Same rhythm. */
  const denial = (at: number, x: number, y: number, node: React.ReactNode) =>
    between(frame, at, at + 30) && (
      <g opacity={1 - ramp(frame, at + 22, 8)}>
        <Reveal frame={frame} at={at} originX={x} originY={y}>
          {node}
        </Reveal>
        {after(frame, at + 10) && (
          <Reveal frame={frame} at={at + 10} originX={x} originY={y}>
            <CrossOut x={x} y={y} scale={1.5} frame={frame} seed={`ep3-x-${at}`} />
          </Reveal>
        )}
      </g>
    );

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <GasStation frame={frame} />

        <GasPump x={930} y={1330} scale={1.9} frame={frame} seed="ep3-pump" display="FULL" />

        <DoodleCharacter
          character="bill"
          pose="armsCrossed"
          expression="suspicious"
          x={300}
          y={1277}
          scale={2.8}
          frame={frame}
          seed="bill"
        />

        {/* a wifi fan, drawn as three arcs */}
        {denial(F_WIFI, 640, 700,
          <g transform="translate(640 700)">
            {[40, 70, 100].map((r) => (
              <path
                key={r}
                d={`M ${-r} 20 A ${r} ${r} 0 0 1 ${r} 20`}
                fill="none"
                stroke={PALETTE.ink}
                strokeWidth={8}
                strokeLinecap="round"
              />
            ))}
            <circle cx={0} cy={30} r={9} fill={PALETTE.ink} />
          </g>,
        )}

        {denial(F_COMP, 640, 700,
          <g transform="translate(640 700)">
            <rect x={-80} y={-60} width={160} height={110} rx={10} fill={PALETTE.paperShade} stroke={PALETTE.ink} strokeWidth={7} />
            <rect x={-100} y={50} width={200} height={18} rx={8} fill={PALETTE.grey} stroke={PALETTE.ink} strokeWidth={6} />
          </g>,
        )}

        {denial(F_SIG, 640, 700,
          <g transform="translate(640 700)">
            <line x1={-110} y1={40} x2={110} y2={-40} stroke={PALETTE.violet} strokeWidth={9} strokeDasharray="20 16" />
            <circle cx={-110} cy={40} r={12} fill={PALETTE.violet} stroke={PALETTE.ink} strokeWidth={4} />
            <circle cx={110} cy={-40} r={12} fill={PALETTE.violet} stroke={PALETTE.ink} strokeWidth={4} />
          </g>,
        )}

        <Label x={540} y={330} text="NO ELECTRONICS" size={62} color={PALETTE.ink} opacity={ramp(frame, F_WIFI, 10)} rotate={-3} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — respect for a piece of plumbing
// ===========================================================================

const S7 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CLEVER = C.kwIn(S7, 'clever');
  const F_ENG = C.kwIn(S7, 'engineering');

  const lift = ramp(frame, 0, 20);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'standAlert' },
      { at: F_CLEVER, pose: 'presenting' },
      { at: F_ENG, pose: 'relaxed' },
    ],
    frame,
    2,
  );

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <GasStation frame={frame} />

        <GasPump x={930} y={1330} scale={1.9} frame={frame} seed="ep3-pump" display="FULL" />

        {/* the nozzle, floating, haloed, treated as an artefact */}
        <g transform={`translate(0 ${-lift * 90})`}>
          <FuelNozzle x={540} y={1080} scale={2.6} frame={frame} seed="ep3-hero" rotate={-6} />
          {after(frame, F_CLEVER) && (
            <Sparkles x={540} y={1050} scale={3.2} frame={frame} count={11} seed="ep3-halo" />
          )}
        </g>

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_CLEVER) ? 'happy' : 'curious'}
          x={250}
          y={1280}
          scale={2.7}
          frame={frame}
          seed="bill"
        />

        {/* Gus has been standing here the whole scene */}
        <DoodleCharacter
          character="gus"
          pose="armsBehindBack"
          expression={after(frame, F_ENG) ? 'tinySmile' : 'neutral'}
          x={880}
          y={1284}
          scale={2.6}
          frame={frame}
          seed="gus"
        />

        {after(frame, F_ENG) && (
          <>
            <StampLabel frame={frame} at={F_ENG} x={540} y={380} text="JUST AIR PRESSURE" size={62} color={PALETTE.teal} rotate={-3} />
            <ImpactStar x={880} y={1180} scale={1.4} frame={frame} seed="ep3-nod" color={PALETTE.gold} />
          </>
        )}

        {between(frame, F_CLEVER, F_CLEVER + 18) && (
          <MotionLines x={330} y={1100} scale={1.6} frame={frame} direction="up" count={3} seed="ep3-wow" />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  nozzle: Nozzle,
  pumping: Pumping,
  covered: Covered,
  click: Click,
  'no-tech': NoTech,
  payoff: Payoff,
};
