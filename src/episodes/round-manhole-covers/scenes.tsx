/**
 * Episode 08 — "Why Manhole Covers Are Round"
 *
 * The hook is an anticlimax: a huge build-up that pays off with "it stays on top". Playing
 * that straight — real drumroll staging, then a flat card — is funnier than any joke written
 * over it, so the scene commits to the build completely and then drops it.
 *
 * The proof scene is the only genuinely geometric argument in the batch: the circle is turned
 * through a full rotation and never fits through its own hole, and then Dex's square is turned
 * 45° and immediately does. Same test, two shapes, opposite results. Nothing is asserted.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { GagCard } from '../../components/GagCard';
import { CityStreet, CutawayVoid } from '../../backgrounds/everyday';
import { ManholeCover, ManholeShaft } from '../../props/machines';
import { CrossOut, Tick } from '../../fx/diagram';
import { Sparkles, MotionLines, ImpactStar } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraShake, useCameraDolly } from '../../animation/SceneCamera';
import { ImpactLines } from '../../animation/ImpactLines';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('round-manhole-covers');

export const HIGHLIGHTS = {
  round: PALETTE.teal,
  circular: PALETTE.teal,
  circle: PALETTE.teal,
  fall: PALETTE.coral,
  orientation: PALETTE.coral,
  problem: PALETTE.coral,
  engineers: PALETTE.violet,
};

// ===========================================================================
// hook — the drumroll and the anticlimax
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_IMP = C.kwIn(S1, 'important');
  const F_STAY = C.kwIn(S1, 'stay-above');

  // the build: it lifts and glows, promising something enormous
  const build = between(frame, F_IMP, F_STAY) ? ramp(frame, F_IMP, Math.max(8, F_STAY - F_IMP)) : after(frame, F_STAY) ? 0 : 0;
  const punch = useCameraPunch(frame, F_IMP, { amount: 0.1, duration: 20 });

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'lookLeft' },
      { at: F_IMP, pose: 'standAlert' },
      { at: F_STAY, pose: 'tinyShrug' },
    ],
    frame,
    2,
  );

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={1400}>
        <CityStreet frame={frame} />

        <g transform={`translate(0 ${-build * 70})`}>
          <ManholeCover x={560} y={1270} scale={2.0} frame={frame} seed="ep8-cover" />
          {build > 0.2 && <Sparkles x={560} y={1270} scale={3.0} frame={frame} count={10} seed="ep8-build" />}
        </g>

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_STAY) ? 'deadpan' : after(frame, F_IMP) ? 'surprised' : 'curious'}
          x={230}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        {/* the payoff card is deliberately flat and small */}
        <GagCard
          frame={frame}
          at={F_STAY}
          text="IT STAYS ON TOP"
          x={540}
          y={420}
          size={78}
          tilt={-2}
          seed="ep8-gag"
        />

        {after(frame, F_STAY + 14) && (
          <Label x={540} y={560} text="that's it. that's the feature." size={36} color={PALETTE.inkSoft} opacity={ramp(frame, F_STAY + 14, 10)} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// cannot-fall — the geometric proof
// ===========================================================================

const S2 = 'cannot-fall';

const CannotFall: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CANT = C.kwIn(S2, 'cannot-fall');
  const F_OPEN = C.kwIn(S2, 'opening');

  // a full rotation, tested at every angle
  const spin = after(frame, F_CANT) ? ((frame - F_CANT) * 5) % 360 : 0;

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <CutawayVoid frame={frame} />

        {/*
          * depth 0.6 stops the void at y≈1364, clearing the caption band that begins around
          * 1400. At full depth it reached 1540 and the caption sat inside it.
          */}
        <ManholeShaft x={540} y={1100} scale={2.2} depth={0.6} frame={frame} seed="ep8-shaft" />

        {/* the cover, tilted and turned — it catches on the rim every time */}
        <g transform={`translate(540 1010) rotate(${spin}) scale(1 ${0.4 + Math.abs(Math.cos((spin * Math.PI) / 180)) * 0.6})`}>
          <ManholeCover x={0} y={0} scale={2.4} frame={frame} seed="ep8-cover" />
        </g>

        {after(frame, F_CANT) && (
          <StampLabel frame={frame} at={F_CANT} x={540} y={430} text="NEVER FITS THROUGH" size={58} rotate={-3} />
        )}

        {after(frame, F_OPEN) && (
          <>
            <Reveal frame={frame} at={F_OPEN} originX={840} originY={1000}>
              <Tick x={840} y={1000} scale={2.0} frame={frame} seed="ep8-safe" />
            </Reveal>
            <Label x={840} y={1160} text="SAFE" size={48} color={PALETTE.teal} opacity={ramp(frame, F_OPEN, 8)} />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// other-shapes — Dex's square goes diagonal and drops
// ===========================================================================

const S3 = 'other-shapes';

const OtherShapes: React.FC = () => {
  const frame = useCurrentFrame();

  const F_OTHER = C.kwIn(S3, 'other-shapes');
  const F_ORI = C.kwIn(S3, 'orientation');
  const F_PROB = C.kwIn(S3, 'problem');

  // turn it 45 degrees and it lines up with the diagonal — then gravity does the rest
  const turn = ramp(frame, F_ORI, 12) * 45;
  const drop = ramp(frame, F_ORI + 12, 14, (t) => t * t);

  const dexPose = usePoseSwap(
    [
      { at: 0, pose: 'presenting' },
      { at: F_ORI + 14, pose: 'shockedBack' },
      { at: F_PROB, pose: 'crouching' },
    ],
    frame,
    2,
  );

  const shake = useCameraShake(frame, F_ORI + 24, { amount: 10, duration: 10, seed: 'ep8' });

  return (
    <Stage>
      <SceneCamera x={shake.x} y={shake.y} rotate={shake.rotate} originX={540} originY={1050}>
        <CutawayVoid frame={frame} />

        {/*
          * depth 0.6 stops the void at y≈1364, clearing the caption band that begins around
          * 1400. At full depth it reached 1540 and the caption sat inside it.
          */}
        <ManholeShaft x={540} y={1100} scale={2.2} depth={0.6} frame={frame} seed="ep8-shaft" />

        {/* the square, confidently placed, then gone */}
        {after(frame, F_OTHER) && drop < 1 && (
          <SlideIn frame={frame} at={F_OTHER} fromX={-320} frames={10}>
            <g transform={`translate(0 ${drop * 620}) rotate(${turn} 540 1010)`} opacity={1 - drop * 0.7}>
              <ManholeCover x={540} y={1010} scale={2.3} frame={frame} seed="ep8-square" shape="square" />
            </g>
          </SlideIn>
        )}

        {between(frame, F_ORI + 12, F_ORI + 34) && (
          <MotionLines x={540} y={1300} scale={2.4} frame={frame} direction="down" count={5} seed="ep8-drop" />
        )}

        {after(frame, F_ORI) && (
          <StampLabel frame={frame} at={F_ORI} x={540} y={430} text="TURN IT 45°" size={62} rotate={-4} />
        )}

        {after(frame, F_PROB) && (
          <>
            <Reveal frame={frame} at={F_PROB} originX={540} originY={1010}>
              <CrossOut x={540} y={1010} scale={2.0} frame={frame} seed="ep8-nope" />
            </Reveal>
            <ImpactLines frame={frame} at={F_PROB} x={540} y={1500} count={10} reach={110} color={PALETTE.coral} />
          </>
        )}

        <DoodleCharacter
          character="dex"
          pose={dexPose}
          expression={after(frame, F_ORI + 14) ? 'horrified' : 'evilIdea'}
          x={210}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="dex"
        />

        {after(frame, F_PROB) && (
          <SlideIn frame={frame} at={F_PROB} fromX={340} frames={12}>
            <DoodleCharacter
              character="gus"
              pose="armsCrossed"
              expression="mildlyAnnoyed"
              x={900}
              y={1290}
              scale={2.4}
              frame={frame}
              seed="gus"
            />
          </SlideIn>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// other-wins — three secondary benefits, fast
// ===========================================================================

const S4 = 'other-wins';

const OtherWins: React.FC = () => {
  const frame = useCurrentFrame();

  const F_ROLL = C.kwIn(S4, 'roll');
  const F_ROT = C.kwIn(S4, 'rotated');
  const F_SHAFT = C.kwIn(S4, 'shafts');

  const roll = ramp(frame, F_ROLL, 26);
  const dropBack = ramp(frame, F_ROT, 12, (t) => 1 - (1 - t) ** 2);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'leanForward' },
      { at: F_ROLL, pose: 'presenting' },
      { at: F_ROT, pose: 'relaxed' },
    ],
    frame,
    2,
  );

  return (
    <Stage>
      <SceneCamera originX={540} originY={1300}>
        {after(frame, F_SHAFT) ? <CutawayVoid frame={frame} /> : <CityStreet frame={frame} />}

        {!after(frame, F_SHAFT) && (
          <>
            {/* rolling: it turns as it travels, which is the whole benefit */}
            {!after(frame, F_ROT) && (
              <g transform={`translate(${300 + roll * 520} 1290) rotate(${roll * 500})`}>
                <ManholeCover x={0} y={0} scale={2.2} frame={frame} seed="ep8-cover" />
              </g>
            )}

            {/* dropped back on at a random angle and fitting anyway */}
            {after(frame, F_ROT) && (
              <g transform={`translate(560 ${1290 - (1 - dropBack) * 260}) rotate(${37 * dropBack})`}>
                <ManholeCover x={0} y={0} scale={2.2} frame={frame} seed="ep8-cover" />
              </g>
            )}

            <DoodleCharacter
              character="bill"
              pose={pose}
              expression={after(frame, F_ROT) ? 'happy' : 'focused'}
              x={220}
              y={1290}
              scale={2.4}
              frame={frame}
              seed="bill"
            />
          </>
        )}

        {after(frame, F_SHAFT) && (
          <>
            <ManholeShaft x={540} y={1150} scale={2.2} depth={0.52} frame={frame} seed="ep8-shaft" />
            <ManholeCover x={540} y={1130} scale={2.4} frame={frame} seed="ep8-cover" />
            <Reveal frame={frame} at={F_SHAFT + 8} originX={840} originY={1130}>
              <Tick x={840} y={1130} scale={1.8} frame={frame} seed="ep8-seats" />
            </Reveal>
          </>
        )}

        {after(frame, F_ROLL) && !after(frame, F_ROT) && (
          <StampLabel frame={frame} at={F_ROLL} x={540} y={430} text="EASY TO ROLL" size={60} color={PALETTE.teal} rotate={-3} />
        )}
        {after(frame, F_ROT) && !after(frame, F_SHAFT) && (
          <StampLabel frame={frame} at={F_ROT} x={540} y={430} text="ANY ANGLE FITS" size={60} color={PALETTE.teal} rotate={2} />
        )}
        {after(frame, F_SHAFT) && (
          <StampLabel frame={frame} at={F_SHAFT} x={540} y={430} text="ROUND SHAFT, ROUND LID" size={52} color={PALETTE.teal} rotate={-2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// engineers — not an aesthetic decision
// ===========================================================================

const S5 = 'engineers';

const Engineers: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CIRCLE = C.kwIn(S5, 'circle');
  const F_NICE = C.kwIn(S5, 'nice');
  const F_ANN = C.kwIn(S5, 'annoying');

  const TICKETS = ['CAN\'T FALL IN', 'ROLLS', 'NO ALIGNING', 'FITS THE SHAFT'];

  // The tickets land and then nothing moves for 1.3s. A slow push keeps the shot alive
  // without adding a prop that says nothing.
  const dolly = useCameraDolly(frame, { from: 1.0, to: 1.1, start: 0, duration: C.sceneFrames(S5) });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={1200}>
        <CityStreet frame={frame} />

        <ManholeCover x={560} y={1270} scale={2.0} frame={frame} seed="ep8-cover" />

        {/* a decorative flourish, then binned */}
        {between(frame, F_CIRCLE, F_NICE + 22) && (
          <g opacity={1 - ramp(frame, F_NICE + 10, 12)}>
            <Reveal frame={frame} at={F_CIRCLE} originX={560} originY={1270}>
              <circle cx={560} cy={1270} r={170} fill="none" stroke={PALETTE.violet} strokeWidth={5} strokeDasharray="24 18" />
            </Reveal>
            {after(frame, F_NICE) && (
              <Reveal frame={frame} at={F_NICE} originX={560} originY={1270}>
                <CrossOut x={560} y={1270} scale={2.0} frame={frame} seed="ep8-nolook" />
              </Reveal>
            )}
          </g>
        )}

        {after(frame, F_NICE) && (
          <StampLabel frame={frame} at={F_NICE} x={540} y={380} text="NOT FOR LOOKS" size={64} rotate={-4} />
        )}

        {/* four problems, each ticked off */}
        {after(frame, F_ANN) &&
          TICKETS.map((t, i) => (
            <SlideIn key={t} frame={frame} at={F_ANN + i * 4} fromX={420} frames={8}>
              <g transform={`translate(760 ${640 + i * 110})`}>
                <Label x={0} y={0} text={t} size={38} color={PALETTE.ink} anchor="end" />
                <g transform="translate(52 0)">
                  <Tick x={0} y={0} scale={0.9} frame={frame} seed={`ep8-t${i}`} />
                </g>
              </g>
            </SlideIn>
          ))}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — Gus nods once
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const F_SHOW = C.kwIn(S6, 'showing-off');

  const settle = ramp(frame, 0, 12, (t) => t * t);
  const punch = useCameraPunch(frame, 8, { amount: 0.08, duration: 12 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={1350}>
        <CityStreet frame={frame} />

        <g transform={`translate(0 ${-140 + settle * 140})`}>
          <ManholeCover x={560} y={1270} scale={2.0} frame={frame} seed="ep8-cover" />
        </g>

        {frame < 14 && <ImpactLines frame={frame} at={10} x={560} y={1270} count={10} reach={100} color={PALETTE.greyDeep} />}

        {/* four frames of sunglasses on a circle, and never again */}
        {between(frame, F_SHOW, F_SHOW + 4) && (
          <g transform="translate(560 1262)">
            <rect x={-110} y={-26} width={94} height={50} rx={10} fill={PALETTE.ink} />
            <rect x={16} y={-26} width={94} height={50} rx={10} fill={PALETTE.ink} />
            <line x1={-16} y1={-8} x2={16} y2={-8} stroke={PALETTE.ink} strokeWidth={10} />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose="handsOnHips"
          expression="content"
          x={220}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        <DoodleCharacter
          character="gus"
          pose="armsBehindBack"
          expression={after(frame, F_SHOW) ? 'tinySmile' : 'deadpan'}
          x={880}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="gus"
        />

        {after(frame, F_SHOW) && (
          <>
            <StampLabel frame={frame} at={F_SHOW} x={540} y={400} text="ENGINEERING, SHOWING OFF" size={48} color={PALETTE.violet} rotate={-3} />
            <ImpactStar x={880} y={1140} scale={1.3} frame={frame} seed="ep8-nod" color={PALETTE.gold} />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  'cannot-fall': CannotFall,
  'other-shapes': OtherShapes,
  'other-wins': OtherWins,
  engineers: Engineers,
  payoff: Payoff,
};
