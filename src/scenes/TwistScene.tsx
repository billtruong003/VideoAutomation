/**
 * TwistScene — "But here's the twist: not every modern casino follows this rule."
 *
 * A hard interruption. The scene starts in the dark enclosed world the previous four
 * scenes built, holds for two frames on the word "twist" (a freeze is louder than a
 * move), then wipes to the bright modern casino. The cut IS the joke, so nothing else
 * competes with it.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { GagCard } from '../components/GagCard';
import { TraditionalFloor, ModernCasino } from '../backgrounds';
import { SlotMachine } from '../props/casino';
import { Window, Sun } from '../props/world';
import { EXPRESSIONS } from '../character/expressions';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraShake, useCameraPunch } from '../animation/SceneCamera';
import { useIdleLook } from '../animation/EyeLook';
import { ImpactLines } from '../animation/ImpactLines';
import { VIDEO, PALETTE } from '../lib/style';
import { kwIn, afterSpeech } from '../lib/timing';

const S = 'twist';

export const TwistScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_TWIST = kwIn(S, 'twist');
  const F_CUT = F_TWIST + 9;
  const F_RECOVER = afterSpeech(S, 1.5);

  // wipe from the right — a hard-edged reveal, not a crossfade
  const wipe = interpolate(frame, [F_CUT, F_CUT + 7], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2.5),
  });
  const wipeX = VIDEO.width * (1 - wipe);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'exhaustedSitting' },
      { at: F_TWIST, pose: 'exhausted' },
      { at: F_CUT, pose: 'surprised' },
      { at: F_CUT + 10, pose: 'confused' },
      { at: F_RECOVER, pose: 'neutral' },
      { at: F_RECOVER + 13, pose: 'lookRight' },
      { at: F_RECOVER + 27, pose: 'confused' },
      { at: F_RECOVER + 41, pose: 'lookLeft' },
      { at: F_RECOVER + 54, pose: 'neutral' },
    ],
    frame,
    2,
  );

  // he takes a step into the new room rather than standing still until the cut
  const stepX = interpolate(frame, [F_RECOVER, F_RECOVER + 46], [430, 505], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });

  // and a shaft of daylight sweeps across the floor behind him
  const beamX = interpolate(frame, [F_CUT, F_CUT + 70], [1180, 240], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  const expr =
    frame >= F_RECOVER
      ? EXPRESSIONS.curious
      : frame >= F_CUT
        ? EXPRESSIONS.shocked
        : EXPRESSIONS.exhausted;

  const lookAbout = useIdleLook(frame, { seed: 'twist-nib', holdFrames: 13, range: 0.65 });
  const shake = useCameraShake(frame, F_TWIST, { amount: 26, duration: 10, seed: 'twist' });
  const punch = useCameraPunch(frame, F_CUT, { amount: 0.1, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} x={shake.x} y={shake.y} rotate={shake.rotate}>
        {/* the old, dark world */}
        <TraditionalFloor frame={frame} />
        <SlotMachine x={545} y={1030} scale={3.1} frame={frame} lit seed="tw-slot" />

        {/* the new, bright one, revealed by a hard vertical edge sweeping left */}
        <clipPath id="twist-wipe">
          <rect x={wipeX} y={0} width={VIDEO.width} height={VIDEO.height} />
        </clipPath>
        {wipe > 0 && (
          <g clipPath="url(#twist-wipe)">
            <ModernCasino frame={frame} />
            <Window x={790} y={620} scale={3} frame={frame} daylight seed="tw-win" />
            <Sun x={790} y={470} scale={1.8} frame={frame} seed="tw-sun" />
          </g>
        )}
        {wipe > 0 && wipe < 1 && (
          <rect x={wipeX - 8} y={0} width={10} height={VIDEO.height} fill={PALETTE.ink} />
        )}

        {/* sweeping daylight — keeps the frame alive while Nib takes in the room */}
        {wipe >= 1 && (
          <g opacity={0.5}>
            <path
              d={`M ${beamX} 330 L ${beamX + 190} 330 L ${beamX + 60} 1450 L ${beamX - 130} 1450 Z`}
              fill={PALETTE.gold}
              opacity={0.28}
            />
          </g>
        )}

        <DoodleCharacter
          pose={pose}
          expression={{
            ...expr,
            look:
              frame >= F_CUT && frame < F_RECOVER
                ? [0.6, -0.2]
                : frame >= F_RECOVER
                  ? lookAbout
                  : [0, 0],
          }}
          x={frame >= F_RECOVER ? stepX : 430}
          y={frame >= F_CUT ? 1190 : 1265}
          scale={2.9}
          frame={frame}
          seed="nib"
        />

        <ImpactLines frame={frame} at={F_TWIST} x={540} y={700} count={16} innerRadius={180} reach={200} color={PALETTE.coral} />

        <GagCard
          frame={frame}
          at={F_TWIST}
          until={F_CUT + 14}
          text="BUT..."
          x={540}
          y={700}
          size={210}
          color={PALETTE.coral}
          tilt={-7}
          boxed
          seed="tw-but"
        />
      </SceneCamera>
    </Stage>
  );
};
