/**
 * HookScene — "Ever notice how many casinos seem to forget one tiny invention, the clock?"
 *
 * Rules this scene obeys:
 *   - the casino AND a clock are legible at frame 0; there is no establishing shot
 *   - the clock is yanked away exactly on the word "clock", so the joke is that the
 *     thing being named is stolen mid-sentence
 *   - it ends on a deadpan straight-to-camera beat, which is the channel's house look
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { GagCard } from '../components/GagCard';
import { CasinoEntrance } from '../backgrounds';
import { WallClock } from '../props/time';
import { QuestionMark, AttentionLines, MotionLines, Sparkles } from '../fx/marks';
import { EXPRESSIONS } from '../character/expressions';
import { usePoseSwap } from '../animation/PoseSwap';
import { useWalkCycle, walkX } from '../animation/WalkCycle';
import { SceneCamera, useCameraPunch, useCameraShake } from '../animation/SceneCamera';
import { ImpactLines } from '../animation/ImpactLines';
import { PopIn } from '../animation/PopIn';
import { useIdleLook } from '../animation/EyeLook';
import { kwIn, afterSpeech } from '../lib/timing';
import { PALETTE } from '../lib/style';
import { clockAt } from '../animation/ClockSpin';

const S = 'hook';

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SIGN = kwIn(S, 'casinos');
  const F_LOOK = afterSpeech(S, 1.55);
  const F_POINT = afterSpeech(S, 2.45);
  const F_YANK = kwIn(S, 'clock');
  const F_DEADPAN = F_YANK + 9;

  // ---- Nib walks in, plants, points, then turns to camera ----
  const walking = frame < F_LOOK;
  const { pose: walkPose, bob } = useWalkCycle(frame, 4);
  const actedPose = usePoseSwap(
    [
      { at: F_LOOK, pose: 'lookRight' },
      { at: F_POINT - 4, pose: 'suspicious' },
      { at: F_POINT, pose: 'pointing' },
      { at: F_YANK, pose: 'surprised' },
      { at: F_DEADPAN, pose: 'neutral' },
    ],
    frame,
    2,
  );
  const pose = walking ? walkPose : actedPose;

  const expression =
    frame >= F_DEADPAN
      ? EXPRESSIONS.deadpan
      : frame >= F_YANK
        ? EXPRESSIONS.shocked
        : frame >= F_POINT
          ? EXPRESSIONS.curious
          : frame >= F_LOOK
            ? EXPRESSIONS.curious
            : EXPRESSIONS.neutral;

  const idle = useIdleLook(frame, { seed: 'hook-nib', holdFrames: 18, range: 0.4 });
  const look: [number, number] =
    frame >= F_DEADPAN ? [0, 0] : frame >= F_LOOK && frame < F_YANK ? [0.75, -0.5] : idle;

  const nibX = walkX(frame, { from: -170, to: 315, duration: F_LOOK });
  const nibY = 1170 + (walking ? bob * 3 : 0);

  // ---- the clock: hangs, then is violently dragged off the top-right ----
  const yankT = interpolate(frame, [F_YANK, F_YANK + 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * t,
  });
  const clockX = 762 + yankT * 620;
  const clockY = 560 - yankT * 760;
  const clockRot = yankT * 190;

  // ---- camera ----
  const punch = useCameraPunch(frame, F_YANK, { amount: 0.11, duration: 14 });
  const punch2 = useCameraPunch(frame, F_DEADPAN, { amount: 0.07, duration: 12 });
  const shake = useCameraShake(frame, F_YANK, { amount: 16, duration: 12, seed: 'hook' });

  return (
    <Stage>
      <SceneCamera
        zoom={punch * punch2}
        x={shake.x}
        y={shake.y}
        rotate={shake.rotate}
        originX={620}
        originY={800}
      >
        <CasinoEntrance frame={frame} />

        {/* the marquee is part of the entrance background; on "casinos" it lights up
            rather than a second sign appearing on top of it */}
        {frame >= F_SIGN && frame < F_SIGN + 20 && (
          <Sparkles x={545} y={655} scale={3} frame={frame} count={9} seed="hook-sign" />
        )}

        {/* the clock is on the wall from frame 0 */}
        <g transform={`translate(${clockX} ${clockY}) rotate(${clockRot})`}>
          <WallClock x={0} y={0} scale={2.5} frame={frame} seed="hook-clock" {...clockAt(10, 10)} />
        </g>
        {yankT > 0 && yankT < 1 && (
          <MotionLines
            x={clockX - 130}
            y={clockY + 90}
            scale={2.2}
            frame={frame}
            direction="right"
            count={4}
            seed="yank"
          />
        )}

        {/* "look at this" burst while pointing, before the theft */}
        {frame >= F_POINT && frame < F_YANK && (
          <AttentionLines x={762} y={560} scale={1.7} frame={frame} seed="hook-att" />
        )}

        <ImpactLines frame={frame} at={F_YANK} x={762} y={560} count={13} reach={120} color={PALETTE.coral} />

        <DoodleCharacter
          pose={pose}
          expression={{ ...expression, look }}
          x={nibX}
          y={nibY}
          scale={3.3}
          frame={frame}
          seed="nib"
        />

        <PopIn frame={frame} at={F_DEADPAN + 3} originX={nibX + 210} originY={720}>
          <QuestionMark x={nibX + 210} y={720} scale={2.6} frame={frame} seed="hook-q" />
        </PopIn>

        <GagCard
          frame={frame}
          at={F_YANK}
          text="CLOCK?"
          x={540}
          y={360}
          size={175}
          tilt={-6}
          seed="hook-gag"
        />
      </SceneCamera>
    </Stage>
  );
};
