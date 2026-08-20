/**
 * Episode 06 — "Highway Lines Are Way Bigger Than You Think"
 *
 * The narration names Bill directly ("if Bill stood next to one of those little road
 * lines"), which makes the scale gag the episode rather than a decoration on it. So the
 * roadside scene gets the most screen time and the most careful staging: Bill's full height
 * has to be visible in the same frame as the full line, or the comparison proves nothing.
 *
 * The dash is ONE component — `RoadDash` — drawn at the length perspective suggests in the
 * driving shots and at its true length beside Bill. Same prop, different number. That is the
 * argument, made structurally rather than asserted in a caption.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { HighwayRoad, HighwayTopDown, HighwayRoadside } from '../../backgrounds/everyday';
import { RoadDash } from '../../props/objects';
import { CircleIt, DimensionLine } from '../../fx/diagram';
import { MotionLines, ImpactStar } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraShake, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('highway-lane-lines');

export const HIGHLIGHTS = {
  '10': PALETTE.coral,
  '30': PALETTE.teal,
  feet: PALETTE.coral,
  meters: PALETTE.coral,
  bill: PALETTE.gold,
  perspective: PALETTE.violet,
  brain: PALETTE.violet,
  destroy: PALETTE.coral,
};

/**
 * Dashes streaming toward camera down the vanishing point.
 *
 * Position along the road is a 0..1 parameter; both the on-screen length and the x offset
 * derive from it, so a dash near the horizon is genuinely small for the same reason a real
 * one is — which is what lets the episode claim the eye is being fooled rather than the
 * drawing cheating.
 */
const StreamingDashes: React.FC<{ frame: number; speed?: number; circleFirst?: boolean }> = ({
  frame,
  speed = 0.011,
  circleFirst = false,
}) => (
  <>
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const t = ((frame * speed + i / 6) % 1) ** 2.1;
      const y = 980 + t * 980;
      const len = 30 + t * 240;
      const x = 540 + (t - 0.5) * 40;
      return (
        <g key={i}>
          <RoadDash x={x} y={y} len={len} thick={12 + t * 34} frame={frame} seed={`ep6-dash-${i}`} />
          {circleFirst && i === 0 && t > 0.35 && t < 0.75 && (
            <CircleIt x={x} y={y} rx={60 + t * 60} ry={40 + t * 130} frame={frame} seed="ep6-circle" />
          )}
        </g>
      );
    })}
  </>
);

// ===========================================================================
// hook — they look tiny, and that is the lie
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_DASH = C.kwIn(S1, 'dashed-lines');
  const F_BIG = C.kwIn(S1, 'bigger');

  // six frames where one dash swells to the truth, then snaps back — a promise, not a reveal
  const swell = between(frame, F_BIG, F_BIG + 6) ? 1 : 0;
  const punch = useCameraPunch(frame, F_BIG, { amount: 0.15, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={1300}>
        <HighwayRoad frame={frame} />
        <StreamingDashes frame={frame} circleFirst={after(frame, F_DASH)} />

        {swell > 0 && (
          <g transform="translate(540 1400) scale(2.4)">
            <RoadDash x={0} y={0} len={340} thick={60} frame={frame} seed="ep6-swell" color={PALETTE.gold} />
          </g>
        )}

        {after(frame, F_BIG) && (
          <StampLabel frame={frame} at={F_BIG} x={540} y={420} text="BIGGER THAN YOU THINK" size={54} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// ten-feet — top-down, where a measurement is readable
// ===========================================================================

const S2 = 'ten-feet';

const TenFeet: React.FC = () => {
  const frame = useCurrentFrame();

  const F_MARK = C.kwIn(S2, 'lane-marking');
  const F_TEN = C.kwIn(S2, 'ten-feet');

  /*
   * A slow push that runs the WHOLE scene.
   *
   * The first cut eased to its end value in 16 frames and then held the dimension line dead
   * still for 2.3 seconds, which motion QA flagged as a static stretch — correctly: it reads
   * fine while scrubbing and reads as a slideshow while watching.
   */
  const dolly = useCameraDolly(frame, { from: 1.22, to: 1.0, start: 0, duration: C.sceneFrames(S2) });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={900}>
        <HighwayTopDown frame={frame} />

        <RoadDash x={540} y={860} len={560} thick={64} frame={frame} seed="ep6-hero-dash" />

        {after(frame, F_MARK) && (
          <Reveal frame={frame} at={F_MARK} originX={540} originY={860}>
            <CircleIt x={540} y={860} rx={110} ry={320} frame={frame} seed="ep6-mark" />
          </Reveal>
        )}

        {after(frame, F_TEN) && (
          <g opacity={ramp(frame, F_TEN, 8)}>
            <DimensionLine
              x={760}
              y={860}
              length={560}
              vertical
              frame={frame}
              seed="ep6-dim"
              label="10 FEET"
            />
          </g>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// the-gap — three times as long again
// ===========================================================================

const S3 = 'the-gap';

const TheGap: React.FC = () => {
  const frame = useCurrentFrame();
  const F_THIRTY = C.kwIn(S3, 'thirty-feet');

  // Pull back so the gap fits — the dash shrinks on screen while staying the same object.
  // Linear and spanning the whole scene, so the shot never arrives and stops.
  const pull = ramp(frame, 0, C.sceneFrames(S3), (x) => x);
  const scale = 1 - pull * 0.42;

  return (
    <Stage>
      <SceneCamera originX={540} originY={900}>
        <HighwayTopDown frame={frame} />

        <g transform={`translate(540 900) scale(${scale}) translate(-540 -900)`}>
          <RoadDash x={540} y={560} len={560} thick={64} frame={frame} seed="ep6-hero-dash" />
          <DimensionLine x={760} y={560} length={560} vertical frame={frame} seed="ep6-dim" label="10 FT" />

          {after(frame, F_THIRTY) && (
            <g opacity={ramp(frame, F_THIRTY, 8)}>
              <DimensionLine
                x={760}
                y={1700}
                length={1680}
                vertical
                frame={frame}
                seed="ep6-dim-gap"
                label="30 FEET"
                color={PALETTE.teal}
              />
            </g>
          )}
        </g>

        {after(frame, F_THIRTY) && (
          <StampLabel frame={frame} at={F_THIRTY + 8} x={300} y={400} text="3x THE GAP" size={56} color={PALETTE.teal} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// perspective — back inside the car, knowing the truth
// ===========================================================================

const S4 = 'perspective';

const Perspective: React.FC = () => {
  const frame = useCurrentFrame();

  const F_PERSP = C.kwIn(S4, 'perspective');
  const F_PAINT = C.kwIn(S4, 'paint');

  return (
    <Stage>
      <SceneCamera originX={540} originY={1200}>
        <HighwayRoad frame={frame} />
        <StreamingDashes frame={frame} />

        {/* the converging lines drawn over the shot — the mechanism of the illusion */}
        {after(frame, F_PERSP) && (
          <g opacity={ramp(frame, F_PERSP, 10) * 0.8}>
            {[-1, -0.5, 0.5, 1].map((k, i) => (
              <line
                key={i}
                x1={540 + k * 900}
                y1={1920}
                x2={540 + k * 40}
                y2={980}
                stroke={PALETTE.violet}
                strokeWidth={4}
                strokeDasharray="16 12"
              />
            ))}
            <circle cx={540} cy={980} r={12} fill={PALETTE.violet} />
          </g>
        )}

        {after(frame, F_PERSP) && (
          <Label x={540} y={1030} text="VANISHING POINT" size={38} color={PALETTE.violet} opacity={ramp(frame, F_PERSP + 6, 10)} />
        )}

        {between(frame, F_PAINT, F_PAINT + 5) && (
          <Label x={540} y={480} text="A LIE" size={110} color={PALETTE.coral} rotate={-6} />
        )}

        <DoodleCharacter
          character="bill"
          pose="pressingButton"
          expression={after(frame, F_PAINT) ? 'suspicious' : 'neutral'}
          x={210}
          y={1304}
          scale={2.0}
          frame={frame}
          seed="bill"
        />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// bill-scale — the gag the narration asks for by name
// ===========================================================================

const S5 = 'bill-scale';

const BillScale: React.FC = () => {
  const frame = useCurrentFrame();

  const F_M = C.kwIn(S5, 'three-meters');
  const F_BILL = C.kwIn(S5, 'bill-named');
  const F_DESTROY = C.kwIn(S5, 'destroy');
  const F_HEIGHT = C.kwIn(S5, 'height');

  /**
   * The line stands on end. Bill is ~2.4 scale ≈ 445 px tall; the line is drawn 940 px, so it
   * genuinely towers. Both fit above the caption band at y=1442 — the comparison is worthless
   * if either end is cropped.
   */
  const rise = ramp(frame, F_BILL, 16, (t) => 1 - (1 - t) ** 2);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'walkA' },
      { at: F_BILL + 12, pose: 'standAlert' },
      { at: F_DESTROY, pose: 'shockedBack' },
    ],
    frame,
    2,
  );

  const walk = ramp(frame, 0, Math.max(10, F_BILL + 12));
  const shake = useCameraShake(frame, F_DESTROY, { amount: 12, duration: 12, seed: 'ep6' });

  return (
    <Stage>
      <SceneCamera x={shake.x} y={shake.y} rotate={shake.rotate} originX={540} originY={1000}>
        <HighwayRoadside frame={frame} />

        {/* the line, stood upright */}
        <g transform={`translate(700 1370) rotate(${(1 - rise) * 84}) translate(-700 -1370)`}>
          <RoadDash x={700} y={900} len={940} thick={78} frame={frame} seed="ep6-upright" color={PALETTE.paper} />
        </g>

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_DESTROY) ? 'horrified' : 'curious'}
          x={330 + walk * 90}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_M) && (
          <StampLabel frame={frame} at={F_M} x={700} y={370} text="3 METRES" size={58} rotate={-4} />
        )}

        {after(frame, F_HEIGHT) && (
          <g opacity={ramp(frame, F_HEIGHT, 8)}>
            <DimensionLine x={900} y={900} length={940} vertical frame={frame} seed="ep6-h-line" label="LINE" />
            <DimensionLine
              x={200}
              y={1150}
              length={445}
              vertical
              frame={frame}
              seed="ep6-h-bill"
              label="BILL"
              color={PALETTE.gold}
            />
          </g>
        )}

        {after(frame, F_DESTROY) && (
          <>
            <ImpactStar x={700} y={520} scale={1.8} frame={frame} seed="ep6-tower" color={PALETTE.coral} />
            <Label x={540} y={300} text="NOT CLOSE" size={64} color={PALETTE.coral} opacity={snap(frame, F_DESTROY)} rotate={-3} />
          </>
        )}

        {/* Mina holds the tape and enjoys it */}
        {after(frame, F_BILL) && (
          <SlideIn frame={frame} at={F_BILL} fromX={360} frames={12}>
            <DoodleCharacter
              character="mina"
              pose="presenting"
              expression="smallSmile"
              x={880}
              y={1297}
              scale={2.2}
              frame={frame}
              seed="mina"
            />
          </SlideIn>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the road was never the problem
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SHRINK = C.kwIn(S6, 'shrinking');
  const F_END = C.kwIn(S6, 'entire-time');

  const squeeze = ramp(frame, F_SHRINK, 20);

  return (
    <Stage>
      <SceneCamera originX={540} originY={1300}>
        <HighwayRoad frame={frame} />

        {/* the whole road compresses under the car */}
        <g transform={`translate(540 1920) scale(1 ${1 - squeeze * 0.4}) translate(-540 -1920)`}>
          <StreamingDashes frame={frame} speed={0.011 + squeeze * 0.02} />
        </g>

        {after(frame, F_SHRINK) && (
          <MotionLines x={540} y={1600} scale={2.6} frame={frame} direction="down" count={5} seed="ep6-squeeze" />
        )}

        {after(frame, F_END) && (
          <>
            <StampLabel frame={frame} at={F_END} x={540} y={400} text="YOUR BRAIN DID THIS" size={58} color={PALETTE.violet} rotate={-3} />
            {/* a small guilty brain */}
            <Reveal frame={frame} at={F_END + 6} originX={780} originY={1180}>
              <g transform="translate(780 1180)">
                <ellipse cx={0} cy={0} rx={54} ry={44} fill={PALETTE.violet} stroke={PALETTE.ink} strokeWidth={5} />
                <path d="M -30 -10 Q -10 -28 10 -10 Q 26 -26 40 -6" fill="none" stroke={PALETTE.ink} strokeWidth={4} />
              </g>
            </Reveal>
          </>
        )}

        <DoodleCharacter
          character="bill"
          pose="pressingButton"
          expression={after(frame, F_END) ? 'deadpan' : 'worried'}
          x={210}
          y={1304}
          scale={2.0}
          frame={frame}
          seed="bill"
        />
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  'ten-feet': TenFeet,
  'the-gap': TheGap,
  perspective: Perspective,
  'bill-scale': BillScale,
  payoff: Payoff,
};
