/**
 * Episode 02 — "Escalator Brushes Are Not For Your Shoes"
 *
 * A courtesy turns out to be a warning. The episode is built on one running contrast: Dex
 * enjoying the brushes wrongly in the wide shots, and the seam quietly eating things in the
 * close-ups. Neither ever comments on the other, which is why the last beat lands.
 *
 * The seam close-up draws the gap far wider than life. An honest hairline is invisible on a
 * phone, and a diagram nobody can see explains nothing — this is the same call the airplane
 * episode makes about its breather hole.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { GagCard } from '../../components/GagCard';
import { MallInterior, SchematicVoid } from '../../backgrounds/everyday';
import { Escalator, EscalatorSeam, Shoelace } from '../../props/travel';
import { CircleIt, Tick } from '../../fx/diagram';
import { ExclamationMark, MotionLines, AttentionLines } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraShake, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, StampLabel } from '../../scenes/kit';

const C = clockFor('escalator-brushes');

export const HIGHLIGHTS = {
  brushes: PALETTE.teal,
  warning: PALETTE.coral,
  gap: PALETTE.coral,
  caught: PALETTE.coral,
  eat: PALETTE.coral,
  shoelaces: PALETTE.gold,
  edge: PALETTE.coral,
};

// ===========================================================================
// hook — Dex is already misusing them
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CLEAN = C.kwIn(S1, 'clean');
  const F_WARN = C.kwIn(S1, 'warning');
  const F_BILL = C.atIn(S1, C.phrase(S1).start + 2.6);

  // Dex scrubs on a fast two-frame cycle until the card stops him dead
  const scrub = after(frame, F_CLEAN) ? 0 : Math.round(Math.sin(frame * 0.55) * 3) * 6;

  const dexPose = usePoseSwap(
    [
      { at: 0, pose: 'crouching' },
      { at: F_CLEAN, pose: 'shockedBack' },
      { at: F_WARN, pose: 'panic' },
    ],
    frame,
    2,
  );

  const billPose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_BILL, pose: 'leanForward' },
      { at: F_WARN, pose: 'shockedBack' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_WARN, { amount: 0.13, duration: 15 });
  const shake = useCameraShake(frame, F_WARN, { amount: 10, duration: 10, seed: 'ep2' });

  return (
    <Stage>
      <SceneCamera zoom={punch} x={shake.x} y={shake.y} rotate={shake.rotate} originX={620} originY={1000}>
        <MallInterior frame={frame} />

        <Escalator x={600} y={980} scale={2.7} frame={frame} seed="ep2-esc" stepPhase={(frame % 36) / 36} />

        <DoodleCharacter
          character="dex"
          pose={dexPose}
          expression={after(frame, F_CLEAN) ? 'shocked' : 'happy'}
          x={430 + scrub}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="dex"
        />

        <DoodleCharacter
          character="bill"
          pose={billPose}
          expression={after(frame, F_WARN) ? 'shocked' : 'confused'}
          x={880}
          y={1284}
          scale={2.6}
          frame={frame}
          seed="bill"
        />

        <GagCard
          frame={frame}
          at={F_CLEAN}
          until={F_WARN + 26}
          text="NOT A SHOE CLEANER"
          x={540}
          y={370}
          size={92}
          tilt={-5}
          seed="ep2-gag"
        />

        {after(frame, F_WARN) && (
          <>
            <Reveal frame={frame} at={F_WARN} originX={430} originY={1180}>
              <CircleIt x={430} y={1180} rx={110} ry={86} frame={frame} seed="ep2-warn" />
            </Reveal>
            <ExclamationMark x={300} y={980} scale={2.6} frame={frame} seed="ep2-ex1" color={PALETTE.coral} />
            <ExclamationMark x={600} y={930} scale={2.2} frame={frame} seed="ep2-ex2" color={PALETTE.coral} />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// gap — the mechanism, tight on the seam
// ===========================================================================

const S2 = 'gap';

const Gap: React.FC = () => {
  const frame = useCurrentFrame();

  const F_GAP = C.kwIn(S2, 'gap');
  const F_MOVING = C.kwIn(S2, 'moving-steps');
  const F_PANEL = C.kwIn(S2, 'side-panel');

  // the step slides while the panel does not — that shear IS the danger
  const shear = after(frame, F_MOVING) ? ((frame - F_MOVING) * 3.2) % 90 : 0;

  const dolly = useCameraDolly(frame, { from: 1.25, to: 1.0, start: 0, duration: 20 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={900}>
        <SchematicVoid frame={frame} />

        <g transform="translate(540 900) scale(3.1)">
          {/* the moving side, offset by the shear */}
          <g transform={`translate(0 ${-shear * 0.34})`}>
            <EscalatorSeam x={0} y={0} frame={frame} seed="ep2-seam" gapLit={after(frame, F_GAP)} />
          </g>
        </g>

        {after(frame, F_GAP) && (
          <StampLabel frame={frame} at={F_GAP} x={540} y={1330} text="THE GAP" size={72} rotate={-3} />
        )}

        {after(frame, F_MOVING) && (
          <Label x={210} y={520} text="MOVING" size={48} color={PALETTE.coral} opacity={ramp(frame, F_MOVING, 8)} rotate={-6} />
        )}
        {after(frame, F_PANEL) && (
          <Label x={880} y={520} text="STATIONARY" size={44} color={PALETTE.ink} opacity={ramp(frame, F_PANEL, 8)} rotate={4} />
        )}

        {after(frame, F_MOVING) && (
          <MotionLines x={250} y={800} scale={2.2} frame={frame} direction="down" count={4} seed="ep2-shear" />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// danger — three things get eaten, then Mochi
// ===========================================================================

const S3 = 'danger';

const Danger: React.FC = () => {
  const frame = useCurrentFrame();

  const F_LACE = C.kwIn(S3, 'shoelaces');
  const F_CLOTH = C.kwIn(S3, 'clothes');
  const F_BAG = C.kwIn(S3, 'bags');
  const F_CAUGHT = C.kwIn(S3, 'caught');

  /** Each victim is pulled into the seam on the same 9-frame curve — the rhythm is the joke. */
  const eaten = (at: number) => ramp(frame, at, 9, (t) => t * t * t);

  const laceT = eaten(F_LACE);
  const clothT = eaten(F_CLOTH);
  const bagT = eaten(F_BAG);
  const mochiT = eaten(F_CAUGHT);

  const shake = useCameraShake(frame, F_CAUGHT, { amount: 13, duration: 11, seed: 'ep2-d' });

  return (
    <Stage>
      <SceneCamera x={shake.x} y={shake.y} rotate={shake.rotate} originX={540} originY={900}>
        <SchematicVoid frame={frame} />

        <g transform="translate(540 900) scale(3.1)">
          <EscalatorSeam x={0} y={0} frame={frame} seed="ep2-seam" gapLit />
        </g>

        {/* 1. shoelace */}
        {between(frame, F_LACE - 8, F_LACE + 26) && (
          <g opacity={1 - laceT * 0.9}>
            <Shoelace x={300 + laceT * 210} y={1010 + laceT * 90} scale={2.4} frame={frame} seed="ep2-lace" pull={laceT * 30} />
          </g>
        )}

        {/* 2. a coat hem */}
        {between(frame, F_CLOTH - 8, F_CLOTH + 26) && (
          <g opacity={1 - clothT * 0.9} transform={`translate(${280 + clothT * 230} ${900 + clothT * 120}) rotate(${clothT * 40})`}>
            <rect x={-90} y={-40} width={170} height={80} rx={16} fill={PALETTE.violet} stroke={PALETTE.ink} strokeWidth={5} />
          </g>
        )}

        {/* 3. a shopping bag */}
        {between(frame, F_BAG - 8, F_BAG + 26) && (
          <g opacity={1 - bagT * 0.9} transform={`translate(${270 + bagT * 240} ${820 + bagT * 200}) rotate(${bagT * -60})`}>
            <rect x={-64} y={-70} width={128} height={140} rx={8} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={5} />
            <path d="M -34 -70 Q 0 -122 34 -70" fill="none" stroke={PALETTE.ink} strokeWidth={5} />
          </g>
        )}

        {/* 4. Mochi — stolen off-frame at speed, reappearing above, unimpressed */}
        {between(frame, F_CAUGHT - 10, F_CAUGHT + 12) && (
          <DoodleCharacter
            character="mochi"
            pose="shocked"
            expression="scared"
            x={300 + mochiT * 250}
            y={1080 + mochiT * 140}
            scale={2.0 - mochiT * 0.9}
            frame={frame}
            seed="mochi"
          />
        )}
        {after(frame, F_CAUGHT + 14) && (
          <Reveal frame={frame} at={F_CAUGHT + 14} originX={820} originY={560}>
            <DoodleCharacter
              character="mochi"
              pose="loaf"
              expression="judging"
              x={820}
              y={560}
              scale={2.0}
              frame={frame}
              seed="mochi-safe"
            />
          </Reveal>
        )}

        {after(frame, F_LACE) && (
          <AttentionLines x={430} y={1010} scale={1.6} frame={frame} seed="ep2-att" />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// mechanism — the brushes finally do their real job
// ===========================================================================

const S4 = 'mechanism';

const Mechanism: React.FC = () => {
  const frame = useCurrentFrame();

  const F_TOUCH = C.kwIn(S4, 'touch');
  const F_MOVE = C.kwIn(S4, 'move-feet');

  const bend = after(frame, F_TOUCH) ? ramp(frame, F_TOUCH, 8) * 12 : 0;
  const step = ramp(frame, F_MOVE, 10);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_TOUCH, pose: 'surprised' },
      { at: F_MOVE, pose: 'walkA' },
      { at: F_MOVE + 12, pose: 'standAlert' },
    ],
    frame,
    2,
  );

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <MallInterior frame={frame} />

        <Escalator x={600} y={980} scale={2.7} frame={frame} seed="ep2-esc" stepPhase={(frame % 36) / 36} />

        <g transform="translate(300 1120) scale(1.5)">
          <EscalatorSeam x={0} y={0} frame={frame} seed="ep2-seam-b" brushBend={bend} />
        </g>

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_MOVE) ? 'worried' : after(frame, F_TOUCH) ? 'surprised' : 'neutral'}
          x={430 + step * 210}
          y={1284}
          scale={2.6}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_MOVE + 8) && (
          <>
            <rect
              x={600}
              y={1380}
              width={330}
              height={16}
              rx={8}
              fill={PALETTE.teal}
              opacity={ramp(frame, F_MOVE + 8, 10) * 0.9}
            />
            <Label x={765} y={1330} text="SAFE" size={46} color={PALETTE.teal} opacity={ramp(frame, F_MOVE + 8, 10)} />
          </>
        )}

        {after(frame, F_TOUCH) && (
          <StampLabel frame={frame} at={F_TOUCH} x={540} y={420} text="IT'S NUDGING YOU" size={64} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — Dex has learned nothing
// ===========================================================================

const S5 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_NICE = C.kwIn(S5, 'feels-nice');
  const F_POLITE = C.kwIn(S5, 'politely');
  const F_EAT = C.kwIn(S5, 'eat');

  const scrub = after(frame, F_EAT + 8) ? 0 : Math.round(Math.sin(frame * 0.6) * 3) * 7;

  const dexPose = usePoseSwap(
    [
      { at: 0, pose: 'crouching' },
      { at: F_EAT + 8, pose: 'shockedBack' },
    ],
    frame,
    2,
  );

  const billPose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_NICE, pose: 'facepalm' },
      { at: F_EAT, pose: 'shockedBack' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_EAT, { amount: 0.11, duration: 12 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={520} originY={1050}>
        <MallInterior frame={frame} />

        <Escalator x={600} y={980} scale={2.7} frame={frame} seed="ep2-esc" stepPhase={(frame % 36) / 36} />

        <DoodleCharacter
          character="dex"
          pose={dexPose}
          expression={after(frame, F_EAT + 8) ? 'panic' : 'happy'}
          x={430 + scrub}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="dex"
        />

        <DoodleCharacter
          character="bill"
          pose={billPose}
          expression={after(frame, F_EAT) ? 'horrified' : 'annoyed'}
          x={880}
          y={1284}
          scale={2.6}
          frame={frame}
          seed="bill"
        />

        {/* a tiny heart over a man enjoying a warning label */}
        {between(frame, F_NICE, F_POLITE) && (
          <Reveal frame={frame} at={F_NICE} originX={420} originY={1010}>
            <path
              d="M 0 20 C -30 -8 -22 -40 0 -26 C 22 -40 30 -8 0 20 Z"
              transform="translate(420 1010) scale(1.7)"
              fill={PALETTE.coral}
              stroke={PALETTE.ink}
              strokeWidth={3}
            />
          </Reveal>
        )}

        {/* the brush asks nicely */}
        {between(frame, F_POLITE, F_EAT + 6) && (
          <Reveal frame={frame} at={F_POLITE} originX={330} originY={1140}>
            <Label x={310} y={1130} text="PLEASE MOVE" size={40} color={PALETTE.inkSoft} rotate={-5} />
          </Reveal>
        )}

        {/* four frames of teeth, and never again */}
        {between(frame, F_EAT, F_EAT + 4) && (
          <g transform="translate(300 1180)">
            {[0, 1, 2, 3, 4].map((i) => (
              <polygon
                key={i}
                points={`${-60 + i * 30},-26 ${-46 + i * 30},14 ${-32 + i * 30},-26`}
                fill={PALETTE.paper}
                stroke={PALETTE.ink}
                strokeWidth={4}
              />
            ))}
          </g>
        )}

        {after(frame, F_EAT) && (
          <g transform={`scale(${snap(frame, F_EAT)})`} style={{ transformOrigin: '540px 400px' }}>
            <Label x={540} y={400} text="IT EATS SHOES" size={72} color={PALETTE.coral} rotate={-4} />
          </g>
        )}

        {/* the mechanism scene proved the point; this just closes the loop on it */}
        {after(frame, F_EAT + 10) && (
          <Reveal frame={frame} at={F_EAT + 10} originX={900} originY={860}>
            <Tick x={900} y={860} scale={1.6} frame={frame} seed="ep2-tick" />
          </Reveal>
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  gap: Gap,
  danger: Danger,
  mechanism: Mechanism,
  payoff: Payoff,
};
