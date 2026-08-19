/**
 * ConstantEnvironmentScene — "The lights stay the same. The machines keep flashing.
 * And the outside world basically disappears."
 *
 * Three clauses, three beats. The trick here is that the SCENE must feel monotonous
 * while the EDIT stays busy: Bill presses the same button on a loop and the lights never
 * change, but the slot flashes hard and the outside world visibly shrinks away. Sameness
 * is the subject, so sameness has to be shown, not merely stated.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { SlotArea, OutsideWorld } from '../backgrounds';
import { SlotMachine, CeilingLightRow } from '../props/casino';
import { MotionLines } from '../fx/marks';
import { BILL_EXPRESSIONS } from '../character/characters/bill';
import { POSES } from '../character/poses';
import { SceneCamera } from '../animation/SceneCamera';
import { PALETTE } from '../lib/style';
import { kwIn } from '../lib/timing';

const S = 'constant-environment';

export const ConstantEnvironmentScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_LIGHTS = kwIn(S, 'lights');
  const F_FLASH = kwIn(S, 'flashing');
  const F_WORLD = kwIn(S, 'outside-world-1');
  const F_GONE = kwIn(S, 'disappears');

  // Bill presses the button forever. Two drawings, four frames each — a loop that never
  // develops, which is the point.
  const pressing = Math.floor(frame / 5) % 2 === 0;
  const pose = pressing ? POSES.pressingButton : POSES.sitting;

  // the slot flashes hard once "flashing" is spoken
  const flashing = frame >= F_FLASH;
  const flashOn = flashing && Math.floor(frame / 3) % 2 === 0;

  // the outside world: appears as a porthole, then shrinks to a dot and is gone
  const worldScale = interpolate(frame, [F_WORLD, F_GONE, F_GONE + 12], [1, 0.32, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });
  const worldVisible = frame >= F_WORLD - 6 && worldScale > 0.01;

  return (
    <Stage>
      <SceneCamera>
        <SlotArea frame={frame} lit />

        {/* ceiling lights: identical, evenly spaced, and utterly unchanging */}
        {frame >= F_LIGHTS && (
          <CeilingLightRow x={540} y={300} scale={2.6} frame={frame} count={5} lit seed="ce-lights" />
        )}

        {/* the porthole to outside, shrinking away */}
        {worldVisible && (
          <g transform={`translate(880 620) scale(${worldScale})`}>
            <clipPath id="ce-porthole">
              <ellipse cx={0} cy={0} rx={150} ry={150} />
            </clipPath>
            <g clipPath="url(#ce-porthole)">
              <g transform="translate(-540 -960) scale(1)">
                <OutsideWorld frame={frame} />
              </g>
            </g>
            <ellipse
              cx={0}
              cy={0}
              rx={150}
              ry={150}
              fill="none"
              stroke={PALETTE.ink}
              strokeWidth={9}
            />
          </g>
        )}

        {/* the machine Bill is glued to */}
        <SlotMachine
          x={545}
          y={1040}
          scale={3.1}
          frame={frame}
          lit={flashOn}
          leverAngle={pressing ? 4 : -3}
          seed="ce-slot"
        />
        {flashOn && (
          <>
            <MotionLines x={330} y={720} scale={2} frame={frame} direction="left" count={3} seed="ce-fl" />
            <MotionLines x={760} y={720} scale={2} frame={frame} direction="right" count={3} seed="ce-fr" />
          </>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={{ ...BILL_EXPRESSIONS.focused, look: [0.15, 0.1] }}
          x={430}
          y={1215}
          scale={2.9}
          frame={frame}
          seed="bill"
        />
      </SceneCamera>
    </Stage>
  );
};
