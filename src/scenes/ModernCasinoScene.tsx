/**
 * ModernCasinoScene — "Some newer casinos deliberately use daylight, open spaces, and
 * even clocks because making you comfortable can work too."
 *
 * Built as the exact inverse of TimeCuesScene: there, things were removed one spoken
 * noun at a time and the room closed in. Here things are ADDED one spoken noun at a time
 * — daylight, space, a clock — and the camera opens out. Same grammar, opposite sign.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { ModernCasino } from '../backgrounds';
import { Window, Sun, Plant, ComfyChair, DrinkCup } from '../props/world';
import { WallClock } from '../props/time';
import { Sparkles } from '../fx/marks';
import { EXPRESSIONS } from '../character/expressions';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraDolly } from '../animation/SceneCamera';
import { PopIn } from '../animation/PopIn';
import { useTick, clockAt } from '../animation/ClockSpin';
import { useIdleLook } from '../animation/EyeLook';
import { PALETTE } from '../lib/style';
import { kwIn, afterSpeech } from '../lib/timing';
import { useVideoConfig } from 'remotion';

const S = 'modern-casino';

export const ModernCasinoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const F_DAYLIGHT = kwIn(S, 'daylight');
  const F_OPEN = kwIn(S, 'open-spaces');
  const F_CLOCK = kwIn(S, 'clocks-modern');
  const F_COMFY = kwIn(S, 'comfortable');
  const F_TALL = afterSpeech(S, 0.9);

  // camera opens OUT — the opposite move to the enclosing scene
  const zoom = useCameraDolly(frame, { from: 1.18, to: 1.0, start: F_OPEN, duration: 46 });
  const preZoom = useCameraDolly(frame, { from: 1.26, to: 1.18, start: 0, duration: F_OPEN });

  const clock = useTick(frame, fps, clockAt(10, 10));

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'walkA' },
      { at: 6, pose: 'neutral' },
      { at: F_TALL, pose: 'lookRight' },
      { at: F_DAYLIGHT, pose: 'surprised' },
      { at: F_DAYLIGHT + 12, pose: 'neutral' },
      { at: F_CLOCK, pose: 'pointing' },
      { at: F_COMFY, pose: 'sitting' },
    ],
    frame,
    3,
  );

  const expr =
    frame >= F_COMFY
      ? EXPRESSIONS.content
      : frame >= F_CLOCK
        ? EXPRESSIONS.happy
        : frame >= F_DAYLIGHT
          ? EXPRESSIONS.happy
          : EXPRESSIONS.curious;

  const idle = useIdleLook(frame, { seed: 'mc-nib', holdFrames: 24, range: 0.35 });
  const seated = frame >= F_COMFY;

  return (
    <Stage tint={PALETTE.paper} grain={0.12}>
      <SceneCamera zoom={frame < F_OPEN ? preZoom : zoom} originX={540} originY={900}>
        <ModernCasino frame={frame} />

        {/* daylight */}
        <PopIn frame={frame} at={F_DAYLIGHT} originX={800} originY={620}>
          <Window x={800} y={620} scale={3.1} frame={frame} daylight seed="mc-win" />
          <Sun x={800} y={415} scale={1.9} frame={frame} seed="mc-sun" />
        </PopIn>
        {frame >= F_DAYLIGHT && frame < F_DAYLIGHT + 16 && (
          <Sparkles x={800} y={620} scale={2.4} frame={frame} count={8} seed="mc-spark" />
        )}

        {/* open space: things that only exist when there is room for them */}
        <PopIn frame={frame} at={F_OPEN} originX={175} originY={1180}>
          <Plant x={175} y={1180} scale={2.6} frame={frame} seed="mc-plant" />
        </PopIn>
        <PopIn frame={frame} at={F_OPEN + 6} originX={620} originY={1235}>
          <ComfyChair x={620} y={1235} scale={2.7} frame={frame} seed="mc-chair" />
        </PopIn>

        {/* a clock, openly on the wall — the payoff of the whole scene */}
        <PopIn frame={frame} at={F_CLOCK} originX={330} originY={560}>
          <WallClock
            x={330}
            y={560}
            scale={2.4}
            frame={frame}
            seed="mc-clock"
            hourAngle={clock.hourAngle}
            minuteAngle={clock.minuteAngle}
          />
        </PopIn>

        <DoodleCharacter
          pose={pose}
          expression={{ ...expr, look: frame >= F_DAYLIGHT && frame < F_CLOCK ? [0.6, -0.3] : idle }}
          x={seated ? 618 : 470}
          y={seated ? 1178 : 1215}
          scale={2.85}
          frame={frame}
          seed="nib"
        />

        {seated && (
          <PopIn frame={frame} at={F_COMFY + 6} originX={760} originY={1120}>
            <DrinkCup x={760} y={1120} scale={2.2} frame={frame} seed="mc-cup" />
          </PopIn>
        )}
      </SceneCamera>
    </Stage>
  );
};
