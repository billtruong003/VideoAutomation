/**
 * MythCorrectionScene — "So casinos don't literally ban clocks."
 *
 * The nuance the title deliberately leaves out. Bill lugs an absurdly large clock into
 * frame, NOT BANNED stamps across it, and a passer-by wearing a wristwatch strolls
 * through behind — a second, quieter proof of the same point.
 */

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { GagCard } from '../components/GagCard';
import { ModernCasino } from '../backgrounds';
import { HugeWallClock, Wristwatch } from '../props/time';
import { AttentionLines } from '../fx/marks';
import { BILL_EXPRESSIONS } from '../character/characters/bill';
import { makeNpc } from '../character/npc';
import { POSES } from '../character/poses';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraPunch } from '../animation/SceneCamera';
import { PALETTE } from '../lib/style';
import { kwIn } from '../lib/timing';
import { clockAt } from '../animation/ClockSpin';

const S = 'myth-correction';

/** Episode-scoped extra. Hoisted so its seed is stable across frames. */
const PASSERBY = makeNpc('civilian', 'passerby');

export const MythCorrectionScene: React.FC = () => {
  const frame = useCurrentFrame();

  const F_BAN = kwIn(S, 'ban');
  const F_PASSERBY = F_BAN + 16;

  // Bill staggers in under the weight — the clock bobs because he can barely hold it
  const stagger = Math.sin(frame * 0.55) * 7;
  const billX = interpolate(frame, [0, 18], [220, 430], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingObject' },
      { at: F_PASSERBY + 8, pose: 'lookRight' },
      { at: F_PASSERBY + 20, pose: 'holdingObject' },
    ],
    frame,
    3,
  );

  const expr =
    frame >= F_PASSERBY + 8 && frame < F_PASSERBY + 20
      ? BILL_EXPRESSIONS.shocked
      : frame >= F_BAN
        ? BILL_EXPRESSIONS.smug
        : BILL_EXPRESSIONS.focused;

  // passer-by crosses behind, wearing a watch
  const passerX = interpolate(frame, [F_PASSERBY, F_PASSERBY + 46], [1280, 620], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const passerWalk = Math.floor(frame / 4) % 2 === 0 ? POSES.walkA : POSES.walkB;

  const punch = useCameraPunch(frame, F_BAN, { amount: 0.08, duration: 13 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={820}>
        <ModernCasino frame={frame} />

        {/* A passer-by. An NPC, not a recoloured cast member — see character/npc.ts. */}
        {frame >= F_PASSERBY && (
          <g>
            <DoodleCharacter
              def={PASSERBY}
              pose={passerWalk}
              expression="neutral"
              x={passerX}
              y={1120}
              scale={2.2}
              frame={frame}
              seed="passerby"
              flip
              opacity={0.92}
            />
            <Wristwatch x={passerX - 62} y={1090} scale={1.9} frame={frame} seed="mc-watch" />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={{ ...expr, look: frame >= F_PASSERBY + 8 ? [0.8, 0.1] : [0, -0.1] }}
          x={billX}
          y={1180}
          scale={2.6}
          frame={frame}
          seed="bill"
        />

        {/* the absurd clock, hoisted in front of him — he peers over the top of it */}
        <g transform={`translate(${billX} ${1155 + stagger})`}>
          <HugeWallClock x={0} y={0} scale={1.8} frame={frame} seed="mc-huge" {...clockAt(10, 10)} />
        </g>

        {frame >= F_PASSERBY + 8 && frame < F_PASSERBY + 22 && (
          <AttentionLines x={passerX - 62} y={1090} scale={1.3} frame={frame} seed="mc-notice" />
        )}

        <GagCard
          frame={frame}
          at={F_BAN}
          text="NOT BANNED"
          x={540}
          y={1150}
          size={98}
          color={PALETTE.coral}
          tilt={-9}
          seed="mc-ban"
        />
      </SceneCamera>
    </Stage>
  );
};
