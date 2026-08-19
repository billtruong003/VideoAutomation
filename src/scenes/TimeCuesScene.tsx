/**
 * TimeCuesScene — "Traditional casino design often kept clocks and windows scarce,
 * removing obvious clues for how long you've been inside."
 *
 * The narration lists things being removed, so the scene removes them, one per spoken
 * noun: clock, then window, then daylight. Then the room itself closes in, which turns
 * an abstract sentence about design into something physical happening to a person.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { TraditionalFloor } from '../backgrounds';
import { WallClock } from '../props/time';
import { Window, Sun } from '../props/world';
import { SlotMachine } from '../props/casino';
import { Sparkles } from '../fx/marks';
import { BILL_EXPRESSIONS } from '../character/characters/bill';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraPunch } from '../animation/SceneCamera';
import { useIdleLook } from '../animation/EyeLook';
import { kwIn, afterSpeech } from '../lib/timing';
import { clockAt } from '../animation/ClockSpin';

const S = 'time-cues';

/** Something ceasing to exist: a quick squash to nothing, with a puff of sparkles. */
function useVanish(frame: number, at: number) {
  const t = interpolate(frame, [at, at + 7], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 2),
  });
  return { scale: t, gone: frame > at + 7, puffing: frame >= at && frame < at + 14 };
}

export const TimeCuesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CLOCK = kwIn(S, 'clocks-vanish');
  const F_WINDOW = kwIn(S, 'windows');
  const F_SUN = F_WINDOW + 22;
  const F_CLOSE = afterSpeech(S, 3.7);
  const F_INSIDE = kwIn(S, 'inside');

  const clock = useVanish(frame, F_CLOCK);
  const win = useVanish(frame, F_WINDOW);

  // daylight slides away off the top rather than popping — light leaves, it doesn't blink out
  const sunY = interpolate(frame, [F_SUN, F_SUN + 16], [300, -260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });

  // the walls of machines converge on Bill
  const close = interpolate(frame, [F_CLOSE, F_INSIDE], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });
  const leftX = interpolate(close, [0, 1], [-330, 160]);
  const rightX = interpolate(close, [0, 1], [1420, 930]);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_CLOCK, pose: 'lookLeft' },
      { at: F_WINDOW, pose: 'lookRight' },
      { at: F_SUN + 6, pose: 'confused' },
      { at: F_CLOSE + 20, pose: 'suspicious' },
      { at: F_INSIDE, pose: 'checkingWallet' },
    ],
    frame,
    3,
  );

  const expr =
    frame >= F_INSIDE
      ? BILL_EXPRESSIONS.exhausted
      : frame >= F_CLOSE + 20
        ? BILL_EXPRESSIONS.confused
        : frame >= F_SUN
          ? BILL_EXPRESSIONS.confused
          : BILL_EXPRESSIONS.curious;

  const idle = useIdleLook(frame, { seed: 'tc-nib', holdFrames: 16, range: 0.5 });
  const punch = useCameraPunch(frame, F_INSIDE, { amount: 0.09, duration: 14 });

  // as the room encloses, Bill gets smaller — the space is winning
  const billScale = interpolate(close, [0, 1], [3.1, 2.5]);

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={950}>
        <TraditionalFloor frame={frame} />

        {/* daylight, first to go */}
        {sunY > -230 && <Sun x={840} y={sunY} scale={2.2} frame={frame} seed="tc-sun" />}

        {/* the clock */}
        {!clock.gone && (
          <g transform={`translate(285 560) scale(${clock.scale})`}>
            <WallClock x={0} y={0} scale={2.2} frame={frame} seed="tc-clock" {...clockAt(2, 40)} />
          </g>
        )}
        {clock.puffing && <Sparkles x={285} y={560} scale={2} frame={frame} count={7} seed="tc-p1" />}

        {/* the window */}
        {!win.gone && (
          <g transform={`translate(820 570) scale(${win.scale})`}>
            <Window x={0} y={0} scale={2.3} frame={frame} daylight seed="tc-win" />
          </g>
        )}
        {win.puffing && <Sparkles x={820} y={570} scale={2} frame={frame} count={7} seed="tc-p2" />}

        {/* machines march in from both edges */}
        <SlotMachine x={leftX} y={1080} scale={2.5} frame={frame} lit seed="tc-m1" />
        <SlotMachine x={leftX - 260} y={1120} scale={2.3} frame={frame} seed="tc-m2" />
        <SlotMachine x={rightX} y={1080} scale={2.5} frame={frame} lit seed="tc-m3" />
        <SlotMachine x={rightX + 260} y={1120} scale={2.3} frame={frame} seed="tc-m4" />

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={{ ...expr, look: frame >= F_CLOSE ? [0, 0.2] : idle }}
          x={545}
          y={1180}
          scale={billScale}
          frame={frame}
          seed="bill"
        />
      </SceneCamera>
    </Stage>
  );
};
