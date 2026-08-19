/**
 * NoAccidentScene — "That's not exactly an accident."
 *
 * Only ~1.4s long, so it gets exactly two ideas: a second character slides in hiding the
 * stolen clock, and on the word "accident" they give an innocent smile while Bill turns
 * suspicious. Anything more would not read at this length.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { TraditionalFloor } from '../backgrounds';
import { WallClock } from '../props/time';
import { SweatDrops } from '../fx/marks';
import { BILL_EXPRESSIONS } from '../character/characters/bill';
import { makeNpc } from '../character/npc';
import { POSES } from '../character/poses';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraPunch } from '../animation/SceneCamera';
import { PopIn } from '../animation/PopIn';
import { kwIn } from '../lib/timing';
import { clockAt } from '../animation/ClockSpin';

const S = 'no-accident';

/** Episode-scoped extra. Hoisted so its seed is stable across frames. */
const CULPRIT = makeNpc('suit', 'culprit');

export const NoAccidentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const F_ACCIDENT = kwIn(S, 'accident');

  // the culprit slides in from off the right edge
  const managerX = interpolate(frame, [0, 14], [1320, 790], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const billPose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_ACCIDENT - 3, pose: 'lookRight' },
      { at: F_ACCIDENT, pose: 'suspicious' },
    ],
    frame,
    2,
  );

  const billExpr = frame >= F_ACCIDENT ? BILL_EXPRESSIONS.suspicious : BILL_EXPRESSIONS.curious;
  const managerExpr = frame >= F_ACCIDENT ? BILL_EXPRESSIONS.smug : BILL_EXPRESSIONS.neutral;

  const punch = useCameraPunch(frame, F_ACCIDENT, { amount: 0.06, duration: 12 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={640} originY={950}>
        <TraditionalFloor frame={frame} />

        <DoodleCharacter
          character="bill"
          pose={billPose}
          expression={{ ...billExpr, look: frame >= F_ACCIDENT - 3 ? [0.8, -0.1] : [0.2, 0] }}
          x={330}
          y={1170}
          scale={3.1}
          frame={frame}
          seed="bill"
        />

        {/* The culprit. An NPC archetype, NOT Bill in a different shirt: recolouring a
            cast member is what teaches an audience that Bill's yellow means nothing. */}
        <g>
          {/* stolen clock, hidden behind their back */}
          <g transform={`translate(${managerX + 95} 1010)`}>
            <WallClock x={0} y={0} scale={1.5} frame={frame} seed="hidden-clock" {...clockAt(10, 10)} />
          </g>
          <DoodleCharacter
            def={CULPRIT}
            pose={frame >= F_ACCIDENT ? POSES.suspicious : POSES.neutral}
            expression={managerExpr}
            gaze={[-0.6, 0]}
            x={managerX}
            y={1170}
            scale={3.1}
            frame={frame}
            seed="manager"
            flip
          />
        </g>

        <PopIn frame={frame} at={F_ACCIDENT + 2} originX={470} originY={790}>
          <SweatDrops x={470} y={790} scale={2.2} frame={frame} seed="na-sweat" />
        </PopIn>
      </SceneCamera>
    </Stage>
  );
};
