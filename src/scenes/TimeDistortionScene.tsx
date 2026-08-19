/**
 * TimeDistortionScene — "So 20 minutes can start feeling a lot like 2 hours."
 *
 * The main comedy scene, and the joke is a CONTRAST, not an event: the environment is
 * byte-for-byte identical either side of the cut while Nib is visibly destroyed. So the
 * background deliberately does not change, the machine does not move, and only the
 * character, the litter and the number on screen do.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { GagCard } from '../components/GagCard';
import { TimeDistortionVoid } from '../backgrounds';
import { SlotMachine } from '../props/casino';
import { WallClock } from '../props/time';
import { Receipt, EmptyCup, TrashPile, EmptyWallet } from '../props/money';
import { EXPRESSIONS } from '../character/expressions';
import { POSES } from '../character/poses';
import { SceneCamera, useCameraShake } from '../animation/SceneCamera';
import { useClockSpin, clockAt } from '../animation/ClockSpin';
import { ImpactLines } from '../animation/ImpactLines';
import { PALETTE } from '../lib/style';
import { kwIn } from '../lib/timing';

const S = 'time-distortion';

export const TimeDistortionScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_20 = kwIn(S, 'twenty-minutes');
  const F_SPIN = F_20 + 14;
  const F_2H = kwIn(S, 'two-hours');

  const wrecked = frame >= F_2H;

  const clock = useClockSpin(frame, {
    at: F_SPIN,
    duration: F_2H - F_SPIN,
    revolutions: 9,
    from: clockAt(10, 10),
    ease: 'accelerate',
  });

  // Nib is fine, then — on the word — ruined. A hard swap, never a tween: the whole gag
  // is that you never see the two hours happen.
  const pose = wrecked ? POSES.exhaustedSitting : POSES.sitting;
  const expr = wrecked ? EXPRESSIONS.exhausted : EXPRESSIONS.focused;

  const shake = useCameraShake(frame, F_2H, { amount: 22, duration: 14, seed: 'td' });
  const intensity = interpolate(frame, [F_SPIN, F_2H], [0.25, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Stage>
      <SceneCamera x={shake.x} y={shake.y} rotate={shake.rotate}>
        <TimeDistortionVoid frame={frame} intensity={intensity} />

        {/* identical on both sides of the reveal — deliberately unchanged */}
        <SlotMachine x={545} y={1120} scale={2.7} frame={frame} lit seed="td-slot" />

        <WallClock
          x={545}
          y={560}
          scale={2.5}
          frame={frame}
          seed="td-clock"
          hourAngle={clock.hourAngle}
          minuteAngle={clock.minuteAngle}
        />

        {/* the wreckage only exists after the cut */}
        {wrecked && (
          <>
            <TrashPile x={190} y={1345} scale={2.5} frame={frame} seed="td-trash" />
            <EmptyCup x={880} y={1350} scale={2.1} frame={frame} seed="td-cup1" />
            <EmptyCup x={965} y={1285} scale={1.8} frame={frame} rotate={22} seed="td-cup2" />
            <Receipt x={840} y={1190} scale={2} frame={frame} rotate={-14} seed="td-rec" />
            <EmptyWallet x={205} y={1195} scale={2.1} frame={frame} rotate={-8} seed="td-wallet" />
          </>
        )}

        <DoodleCharacter
          pose={pose}
          expression={{ ...expr, look: wrecked ? [0, 0.35] : [0.1, 0] }}
          x={430}
          y={1225}
          scale={2.9}
          frame={frame}
          seed="nib"
        />

        <ImpactLines
          frame={frame}
          at={F_2H}
          x={540}
          y={900}
          count={15}
          innerRadius={220}
          reach={170}
          color={PALETTE.violet}
        />

        <GagCard frame={frame} at={F_20} until={F_2H} text="20 MINUTES" x={540} y={268} size={132} color={PALETTE.gold} tilt={-4} seed="td-20" />
        <GagCard frame={frame} at={F_2H} text="2 HOURS?!" x={540} y={268} size={170} color={PALETTE.violet} tilt={5} seed="td-2h" />

        {/* a beat of squash on the reveal, sold with a pop of the number */}
        
      </SceneCamera>
    </Stage>
  );
};
