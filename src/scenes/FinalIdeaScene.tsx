/**
 * FinalIdeaScene — "The real trick is simpler: control what you notice, keep you
 * immersed, and make the outside world feel very, very far away."
 *
 * Three ideas, staged as one continuous move:
 *   - "control what you notice"  -> distractions pop in and crowd the frame
 *   - "keep you immersed"        -> the camera pushes in, Bill's eyes go spiral
 *   - "outside world ... far away" -> the camera rips back and the world becomes a dot
 *
 * Underneath all of it the wallet drifts away, unnoticed, from the moment the word
 * "notice" is spoken. The payoff is that the viewer has been watching it leave for five
 * seconds before Bill turns around. Hard cut, no outro.
 */

import React from 'react';
import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { Stage } from '../components/Stage';
import { DoodleCharacter } from '../components/DoodleCharacter';
import { SlotArea, OutsideWorld } from '../backgrounds';
import { SlotMachine, CasinoChip, PlayingCards, Dice, ChipStack } from '../props/casino';
import { Wallet } from '../props/money';
import { Sparkles, ExclamationMark, DizzySpiral } from '../fx/marks';
import { BILL_EXPRESSIONS } from '../character/characters/bill';
import { usePoseSwap } from '../animation/PoseSwap';
import { SceneCamera, useCameraPunch } from '../animation/SceneCamera';
import { PopIn, popInValues } from '../animation/PopIn';
import { ImpactLines } from '../animation/ImpactLines';
import { useFloat } from '../animation/Float';
import { PALETTE } from '../lib/style';
import { rand01, hashString } from '../lib/rand';
import { kwIn } from '../lib/timing';

const S = 'final-idea';

/** The swarm. Fixed layout, staggered entry — deterministic, never random. */
const DISTRACTIONS = [
  { kind: 'chip', x: 190, y: 830, s: 2.4, d: 0 },
  { kind: 'cards', x: 880, y: 760, s: 2.0, d: 4 },
  { kind: 'dice', x: 250, y: 1080, s: 2.2, d: 8 },
  { kind: 'chip', x: 900, y: 1060, s: 2.0, d: 12 },
  { kind: 'stack', x: 150, y: 1230, s: 2.0, d: 16 },
  { kind: 'cards', x: 300, y: 640, s: 1.7, d: 20 },
  { kind: 'dice', x: 820, y: 560, s: 1.8, d: 24 },
  { kind: 'chip', x: 620, y: 520, s: 1.9, d: 28 },
  { kind: 'stack', x: 950, y: 1250, s: 1.8, d: 32 },
  { kind: 'chip', x: 420, y: 480, s: 1.6, d: 36 },
] as const;

export const FinalIdeaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const F_TRICK = kwIn(S, 'trick');
  const F_NOTICE = kwIn(S, 'notice');
  const F_WALLET = F_NOTICE + 9;
  const F_IMMERSED = kwIn(S, 'immersed');
  const F_WORLD = kwIn(S, 'outside-world-2');
  const F_FAR = kwIn(S, 'far-away');

  // camera: push in on "immersed", then rip back on "outside world"
  const zoom =
    frame < F_IMMERSED
      ? interpolate(frame, [F_TRICK, F_IMMERSED], [1.0, 1.14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : interpolate(frame, [F_IMMERSED, F_WORLD, F_WORLD + 60], [1.14, 1.2, 1.0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: (t) => t * t * (3 - 2 * t),
        });

  // the wallet: leaves at "notice", gone well before Bill looks
  const walletT = interpolate(frame, [F_WALLET, F_FAR - 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });
  const drift = useFloat(frame, { amp: 9, speed: 0.06, seed: 'wallet' });
  const walletX = 300 + walletT * 700 + drift.x;
  const walletY = 1120 - walletT * 620 + drift.y;
  const walletScale = 2.3 * (1 - walletT * 0.72);
  const walletGone = frame >= F_FAR - 24;

  // the outside world, receding to a dot
  const worldScale = interpolate(frame, [F_WORLD, F_WORLD + 55], [0.5, 0.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });

  const turned = frame >= F_FAR;
  const pose = usePoseSwap(
    [
      { at: 0, pose: 'neutral' },
      { at: F_NOTICE, pose: 'lookLeft' },
      { at: F_IMMERSED, pose: 'pressingButton' },
      { at: F_FAR - 6, pose: 'turningBack' },
      { at: F_FAR + 4, pose: 'horrified' },
    ],
    frame,
    2,
  );

  const expr = turned
    ? BILL_EXPRESSIONS.horrified
    : frame >= F_IMMERSED
      ? BILL_EXPRESSIONS.dizzy
      : frame >= F_NOTICE
        ? BILL_EXPRESSIONS.focused
        : BILL_EXPRESSIONS.neutral;

  const punch = useCameraPunch(frame, F_FAR, { amount: 0.13, duration: 16 });

  // the camera can only pull back to 1.0 without exposing the background edge, so the
  // sense of distance comes from Bill shrinking inside the frame as the world recedes
  const billScale = interpolate(frame, [F_WORLD, F_WORLD + 60], [2.8, 2.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t * t * (3 - 2 * t),
  });

  return (
    <Stage>
      <SceneCamera zoom={zoom * punch} originX={540} originY={950}>
        <SlotArea frame={frame} lit />

        {/* the outside world, very very far away */}
        {frame >= F_WORLD - 8 && (
          <g transform={`translate(540 520) scale(${worldScale})`}>
            <clipPath id="fi-world">
              <rect x={-330} y={-240} width={660} height={480} rx={18} />
            </clipPath>
            <g clipPath="url(#fi-world)">
              <g transform="translate(-540 -960)">
                <OutsideWorld frame={frame} />
              </g>
            </g>
            <rect
              x={-330}
              y={-240}
              width={660}
              height={480}
              rx={18}
              fill="none"
              stroke={PALETTE.ink}
              strokeWidth={14}
            />
          </g>
        )}

        <SlotMachine x={545} y={1090} scale={2.7} frame={frame} lit seed="fi-slot" />

        {/* the swarm */}
        {DISTRACTIONS.map((d, i) => {
          const at = F_NOTICE + d.d;
          const { scale, opacity } = popInValues(frame, fps, { at });
          if (opacity <= 0) return null;
          const spin = rand01(hashString(`fi:${i}`)) * 40 - 20;
          const art =
            d.kind === 'chip' ? (
              <CasinoChip x={0} y={0} scale={d.s} frame={frame} seed={`fi-c${i}`} />
            ) : d.kind === 'cards' ? (
              <PlayingCards x={0} y={0} scale={d.s} frame={frame} fanned seed={`fi-k${i}`} />
            ) : d.kind === 'dice' ? (
              <Dice x={0} y={0} scale={d.s} frame={frame} pips={((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6} seed={`fi-d${i}`} />
            ) : (
              <ChipStack x={0} y={0} scale={d.s} frame={frame} seed={`fi-s${i}`} />
            );
          return (
            <g key={i} transform={`translate(${d.x} ${d.y}) scale(${scale}) rotate(${spin})`} opacity={opacity}>
              {art}
            </g>
          );
        })}

        {frame >= F_IMMERSED && (
          <>
            <Sparkles x={320} y={720} scale={2.6} frame={frame} count={7} seed="fi-sp1" />
            <Sparkles x={790} y={950} scale={2.4} frame={frame} count={6} seed="fi-sp2" />
            <DizzySpiral x={210} y={620} scale={1.8} frame={frame} seed="fi-dz" />
          </>
        )}

        {/* the wallet, quietly leaving */}
        {!walletGone && (
          <g transform={`translate(${walletX} ${walletY}) rotate(${drift.rotate + walletT * 90})`}>
            <Wallet x={0} y={0} scale={walletScale} frame={frame} seed="fi-wallet" />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={{ ...expr, look: turned ? [-0.7, 0.1] : frame >= F_IMMERSED ? [0, 0] : [0.3, 0] }}
          x={480}
          y={1240}
          scale={billScale}
          frame={frame}
          seed="bill"
        />

        <ImpactLines frame={frame} at={F_FAR} x={480} y={950} count={16} innerRadius={200} reach={190} color={PALETTE.coral} />

        <PopIn frame={frame} at={F_FAR + 3} originX={760} originY={830}>
          <ExclamationMark x={760} y={830} scale={3} frame={frame} seed="fi-ex" />
        </PopIn>
      </SceneCamera>
    </Stage>
  );
};
