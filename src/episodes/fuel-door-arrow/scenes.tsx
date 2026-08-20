/**
 * Episode 07 — "The Arrow That Tells You Which Side Your Fuel Door Is On"
 *
 * The joke is proximity: the answer was always six inches from the viewer's face. So the
 * episode is staged as a search that ends where it started — the dashboard close-up in the
 * payoff is the SAME framing as the one in scene two, and the only thing that has changed is
 * that the arrow is now lit. Returning to an identical shot is what makes "it was right
 * there" land without saying it.
 *
 * Mina has known the whole time. She reacts exactly once, at the very end, by turning her
 * head. That is the entire performance and it is enough.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { CarInterior, CutawayVoid, GasStation } from '../../backgrounds/everyday';
import { DashboardCluster, CarTop, GasPump } from '../../props/machines';
import { CircleIt, Tick } from '../../fx/diagram';
import { QuestionMark, Sparkles, MotionLines } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('fuel-door-arrow');

export const HIGHLIGHTS = {
  arrow: PALETTE.coral,
  left: PALETTE.teal,
  right: PALETTE.gold,
  dashboard: PALETTE.violet,
  guessing: PALETTE.coral,
  face: PALETTE.coral,
  glowing: PALETTE.gold,
};

/** The dashboard close-up framing. Scene 2 and the payoff MUST match exactly. */
const DASH_X = 540;
const DASH_Y = 880;
const DASH_S = 2.6;

// ===========================================================================
// hook — a man arguing with himself
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_Q = C.kwIn(S1, 'question');
  const F_LIFE = C.kwIn(S1, 'entire-life');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'lookLeft' },
      { at: F_Q, pose: 'lookRight' },
      { at: F_LIFE, pose: 'confused' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_LIFE, { amount: 0.12, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={1100}>
        <CarInterior frame={frame} />

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_LIFE) ? 'panic' : 'confused'}
          x={380}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        <DoodleCharacter
          character="mina"
          pose="armsCrossed"
          expression="unimpressed"
          x={840}
          y={1294}
          scale={2.3}
          frame={frame}
          seed="mina"
        />

        {after(frame, F_Q) && (
          <Reveal frame={frame} at={F_Q} originX={380} originY={1000}>
            <QuestionMark x={380} y={1000} scale={3.0} frame={frame} seed="ep7-q" />
          </Reveal>
        )}

        {/* the one question becomes a crowd of them */}
        {after(frame, F_LIFE) &&
          [[200, 820, 1.6], [560, 760, 1.3], [300, 640, 1.0]].map(([x, y, s], i) => (
            <Reveal key={i} frame={frame} at={F_LIFE + i * 3} originX={x} originY={y}>
              <QuestionMark x={x} y={y} scale={s} frame={frame} seed={`ep7-q${i}`} />
            </Reveal>
          ))}

        {after(frame, F_LIFE) && (
          <StampLabel frame={frame} at={F_LIFE} x={540} y={330} text="WHICH SIDE?!" size={72} rotate={-5} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// symbol — find the pump icon first
// ===========================================================================

const S2 = 'symbol';

const Symbol: React.FC = () => {
  const frame = useCurrentFrame();

  const F_ICON = C.kwIn(S2, 'fuel-pump-symbol');
  const F_DASH = C.kwIn(S2, 'dashboard');

  const dolly = useCameraDolly(frame, { from: 1.5, to: 1.0, start: 0, duration: 22 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={DASH_X} originY={DASH_Y}>
        <CutawayVoid frame={frame} />

        <DashboardCluster
          x={DASH_X}
          y={DASH_Y}
          scale={DASH_S}
          frame={frame}
          seed="ep7-dash"
          iconLit={after(frame, F_ICON)}
          dim={after(frame, F_DASH)}
        />

        {after(frame, F_ICON) && (
          <Reveal frame={frame} at={F_ICON} originX={DASH_X - 10} originY={DASH_Y + 5}>
            <CircleIt x={DASH_X - 10} y={DASH_Y + 5} rx={90} ry={80} frame={frame} seed="ep7-icon-mark" />
          </Reveal>
        )}

        {after(frame, F_DASH) && (
          <StampLabel frame={frame} at={F_DASH} x={540} y={1380} text="THE FUEL SYMBOL" size={56} rotate={-3} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// arrow — the reveal
// ===========================================================================

const S3 = 'arrow';

const Arrow: React.FC = () => {
  const frame = useCurrentFrame();

  const F_ARROW = C.kwIn(S3, 'tiny-arrow');
  const F_TRI = C.kwIn(S3, 'triangle');

  const punch = useCameraPunch(frame, F_ARROW, { amount: 0.13, duration: 15 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={DASH_X} originY={DASH_Y}>
        <CutawayVoid frame={frame} />

        <g transform={`scale(${after(frame, F_ARROW) ? snap(frame, F_ARROW) : 1})`} style={{ transformOrigin: `${DASH_X}px ${DASH_Y}px` }}>
          <DashboardCluster
            x={DASH_X}
            y={DASH_Y}
            scale={DASH_S}
            frame={frame}
            seed="ep7-dash"
            iconLit
            arrow={after(frame, F_ARROW) ? 'right' : 'none'}
          />
        </g>

        {after(frame, F_ARROW) && (
          <Sparkles x={DASH_X + 70} y={DASH_Y + 5} scale={2.6} frame={frame} count={10} seed="ep7-reveal" />
        )}

        {after(frame, F_ARROW) && (
          <StampLabel frame={frame} at={F_ARROW} x={540} y={380} text="THERE IT IS" size={72} rotate={-4} />
        )}

        {after(frame, F_TRI) && (
          <Label x={540} y={1400} text="ARROW OR TRIANGLE" size={48} color={PALETTE.inkSoft} opacity={ramp(frame, F_TRI, 8)} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// left-right — top-down, so left and right are unambiguous
// ===========================================================================

const S4 = 'left-right';

const LeftRight: React.FC = () => {
  const frame = useCurrentFrame();

  const F_LEFT = C.kwIn(S4, 'points-left');
  const F_RIGHT = C.kwIn(S4, 'points-right');

  const side: 'left' | 'right' = after(frame, F_RIGHT) ? 'right' : 'left';

  return (
    <Stage>
      <SceneCamera originX={540} originY={950}>
        <CutawayVoid frame={frame} />

        <CarTop
          x={540}
          y={950}
          scale={2.6}
          frame={frame}
          seed="ep7-car"
          door={side}
          doorOpen={after(frame, F_LEFT)}
        />

        {/* the arrow above the car, swinging to match */}
        <g transform={`translate(540 460) scale(${after(frame, F_LEFT) ? snap(frame, side === 'left' ? F_LEFT : F_RIGHT) : 1})`}>
          <polygon
            points={side === 'left' ? '-70,0 10,-46 10,46' : '70,0 -10,-46 -10,46'}
            fill={PALETTE.coral}
            stroke={PALETTE.ink}
            strokeWidth={7}
          />
        </g>

        {after(frame, F_LEFT) && !after(frame, F_RIGHT) && (
          <StampLabel frame={frame} at={F_LEFT} x={220} y={1450} text="LEFT" size={72} color={PALETTE.teal} rotate={-5} />
        )}
        {after(frame, F_RIGHT) && (
          <StampLabel frame={frame} at={F_RIGHT} x={860} y={1450} text="RIGHT" size={72} color={PALETTE.gold} rotate={5} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// why — the industry never agreed
// ===========================================================================

const S5 = 'why';

const Why: React.FC = () => {
  const frame = useCurrentFrame();

  const F_MAN = C.kwIn(S5, 'manufacturers');
  const F_SAME = C.kwIn(S5, 'same-side');
  const F_GUESS = C.kwIn(S5, 'guessing');

  /** Four cars, alternating sides. The disagreement is the point, so it must be visible at once. */
  const cars: ('left' | 'right')[] = ['left', 'right', 'right', 'left'];

  return (
    <Stage>
      <SceneCamera originX={540} originY={950}>
        <CutawayVoid frame={frame} />

        {cars.map((door, i) => (
          <SlideIn key={i} frame={frame} at={F_MAN + i * 3} fromY={-260} frames={9}>
            <CarTop
              x={190 + i * 235}
              y={880}
              scale={1.25}
              frame={frame}
              seed={`ep7-car-${i}`}
              door={door}
              doorOpen
              body={i % 2 ? PALETTE.gold : PALETTE.teal}
            />
          </SlideIn>
        ))}

        {after(frame, F_SAME) && (
          <StampLabel frame={frame} at={F_SAME} x={540} y={880} text="NO STANDARD" size={78} rotate={-7} />
        )}

        {/* the arrow gets every one of them right */}
        {after(frame, F_GUESS) &&
          cars.map((_, i) => (
            <Reveal key={i} frame={frame} at={F_GUESS + i * 4} originX={190 + i * 235} originY={1320}>
              <Tick x={190 + i * 235} y={1320} scale={1.2} frame={frame} seed={`ep7-tick-${i}`} />
            </Reveal>
          ))}

        {after(frame, F_GUESS) && (
          <Label x={540} y={1480} text="THE ARROW IS ALWAYS RIGHT" size={46} color={PALETTE.teal} opacity={ramp(frame, F_GUESS, 10)} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// regret — the montage of past failure
// ===========================================================================

const S6 = 'regret';

const Regret: React.FC = () => {
  const frame = useCurrentFrame();

  const F_STATION = C.kwIn(S6, 'gas-station');
  const F_WRONG = C.kwIn(S6, 'wrong-pump');
  const F_REV = C.kwIn(S6, 'reversed');

  const drive = ramp(frame, F_STATION, 16);
  // the reverse is a fast stepped jerk, not a smooth slide — that is what makes it funny
  const reverse = after(frame, F_REV) ? Math.round(ramp(frame, F_REV, 14) * 5) / 5 : 0;
  const carX = 200 + drive * 300 - reverse * 260;

  return (
    <Stage>
      <SceneCamera originX={540} originY={1150}>
        <GasStation frame={frame} />

        <GasPump x={840} y={1400} scale={2.0} frame={frame} seed="ep7-pump" />

        {/* the car, from above, on the wrong side every time */}
        <CarTop x={carX} y={1350} scale={1.9} frame={frame} seed="ep7-car-regret" door="left" doorOpen />

        {after(frame, F_WRONG) && (
          <>
            <line
              x1={carX + 100}
              y1={1350}
              x2={790}
              y2={1330}
              stroke={PALETTE.coral}
              strokeWidth={8}
              strokeDasharray="20 14"
            />
            <StampLabel frame={frame} at={F_WRONG} x={540} y={400} text="WRONG SIDE" size={68} rotate={-4} />
          </>
        )}

        {after(frame, F_REV) && (
          <MotionLines x={carX + 200} y={1350} scale={2.4} frame={frame} direction="right" count={5} seed="ep7-rev" />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the identical shot, with the arrow lit
// ===========================================================================

const S7 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_GLOW = C.kwIn(S7, 'glowing');
  const F_FACE = C.kwIn(S7, 'face');

  // pull back from the dashboard to reveal it was in front of him all along
  const pull = ramp(frame, F_FACE, 20);

  return (
    <Stage>
      <SceneCamera originX={DASH_X} originY={DASH_Y}>
        {pull < 0.5 ? <CutawayVoid frame={frame} /> : <CarInterior frame={frame} />}

        <g transform={`translate(${DASH_X} ${DASH_Y}) scale(${1 - pull * 0.55}) translate(${-DASH_X} ${-DASH_Y - pull * 20})`}>
          <DashboardCluster
            x={DASH_X}
            y={DASH_Y}
            scale={DASH_S}
            frame={frame}
            seed="ep7-dash"
            iconLit
            arrow="right"
          />
          {after(frame, F_GLOW) && (
            <Sparkles x={DASH_X + 70} y={DASH_Y + 5} scale={3.0} frame={frame} count={12} seed="ep7-glow" />
          )}
        </g>

        {between(frame, F_GLOW, F_FACE + 20) && (
          <polygon
            points={`${DASH_X - 210},240 ${DASH_X + 210},240 ${DASH_X + 130},${DASH_Y - 60} ${DASH_X - 130},${DASH_Y - 60}`}
            fill={PALETTE.gold}
            opacity={0.28 * ramp(frame, F_GLOW, 10)}
          />
        )}

        {pull > 0.2 && (
          /* reaches full ink quickly — a long partial opacity read as two grey ghosts */
          <g opacity={Math.min(1, (pull - 0.2) / 0.18)}>
            <DoodleCharacter
              character="bill"
              pose="neutral"
              expression="deadpan"
              x={330}
              y={1294}
              scale={2.3}
              frame={frame}
              seed="bill"
            />
            <DoodleCharacter
              character="mina"
              pose="neutral"
              expression="unimpressed"
              x={830}
              y={1297}
              scale={2.2}
              frame={frame}
              seed="mina"
              gaze={after(frame, F_FACE + 14) ? [-0.9, 0] : [0, 0]}
            />
          </g>
        )}

        {after(frame, F_FACE) && (
          <StampLabel frame={frame} at={F_FACE} x={540} y={330} text="IT WAS RIGHT THERE" size={62} rotate={-3} />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  symbol: Symbol,
  arrow: Arrow,
  'left-right': LeftRight,
  why: Why,
  regret: Regret,
  payoff: Payoff,
};
