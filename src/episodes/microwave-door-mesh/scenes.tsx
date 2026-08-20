/**
 * Episode 04 — "Why You Can See Through A Microwave Door"
 *
 * The explanation is a SIZE COMPARISON, so the two waves are the same component at two
 * wavelengths rather than two drawings. If they were separate assets they could drift, and
 * the moment they drift the episode stops being an argument and becomes an assertion.
 *
 * The `blocked` and `light` scenes reuse an identical framing on purpose: same mesh, same
 * position, same camera. Only the wave changes. That repetition is what makes the contrast
 * legible in two seconds — a new composition would make the viewer re-read the shot instead
 * of reading the difference.
 *
 * Mina arrives once, says nothing, and is right.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { KitchenCounter, SchematicVoid } from '../../backgrounds/everyday';
import { Microwave, MeshPanel } from '../../props/machines';
import { CircleIt, Wave } from '../../fx/diagram';
import { Sparkles, ImpactStar } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../../animation/SceneCamera';
import { ImpactLines } from '../../animation/ImpactLines';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('microwave-door-mesh');

export const HIGHLIGHTS = {
  mesh: PALETTE.teal,
  wavelength: PALETTE.coral,
  light: PALETTE.gold,
  window: PALETTE.teal,
  barrier: PALETTE.coral,
  trapped: PALETTE.coral,
  holes: PALETTE.teal,
  sunglasses: PALETTE.violet,
};

/** The mesh sits here in every diagram scene, so the cuts between them are cuts. */
const MESH_X = 540;
const MESH_Y = 860;

// ===========================================================================
// hook — nose to the glass
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SEE = C.kwIn(S1, 'see-through');
  const F_TRAP = C.kwIn(S1, 'trapped');
  const F_END = C.beforeEnd(S1, 0.1);

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'leanForward' },
      { at: F_TRAP, pose: 'shockedBack' },
      { at: F_END, pose: 'suspicious' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_SEE, { amount: 0.15, duration: 16 });

  // energy dots piling against the inside of the door
  const dots = Array.from({ length: 9 }, (_, i) => i);

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={560} originY={900}>
        <KitchenCounter frame={frame} />

        <Microwave x={560} y={1180} scale={2.2} frame={frame} seed="ep4-mw" lit />

        {/* the plate turns through the scene — the only thing moving before the reveal */}
        <g transform={`translate(490 1100) rotate(${(frame * 1.6) % 360})`}>
          <ellipse cx={0} cy={0} rx={70} ry={22} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={4} />
        </g>

        {after(frame, F_TRAP) &&
          dots.map((i) => {
            const t = ((frame - F_TRAP) * 0.09 + i * 0.7) % 1;
            const y = 900 + Math.sin(i * 2.1) * 120;
            return (
              <circle
                key={i}
                cx={330 + t * 250}
                cy={y}
                r={11}
                fill={PALETTE.coral}
                opacity={0.85 - t * 0.5}
              />
            );
          })}

        {after(frame, F_SEE) && (
          <Reveal frame={frame} at={F_SEE} originX={MESH_X - 60} originY={900}>
            <CircleIt x={MESH_X - 60} y={900} rx={150} ry={110} frame={frame} seed="ep4-mark" />
          </Reveal>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_TRAP) ? 'worried' : 'curious'}
          x={180}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_TRAP) && (
          <StampLabel frame={frame} at={F_TRAP} x={540} y={400} text="TRAPPED INSIDE?" size={72} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// mesh — the mesh gets named as the actor
// ===========================================================================

const S2 = 'mesh';

const Mesh: React.FC = () => {
  const frame = useCurrentFrame();

  const F_MESH = C.kwIn(S2, 'mesh');
  const F_CLEVER = C.kwIn(S2, 'clever');

  const dolly = useCameraDolly(frame, { from: 1.4, to: 1.0, start: 0, duration: 20 });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={MESH_X} originY={MESH_Y}>
        <SchematicVoid frame={frame} />

        <MeshPanel x={MESH_X} y={MESH_Y} scale={2.5} frame={frame} seed="ep4-mesh" lit={after(frame, F_MESH)} />

        {after(frame, F_MESH) && (
          <StampLabel frame={frame} at={F_MESH} x={540} y={1420} text="CONDUCTIVE MESH" size={60} color={PALETTE.teal} rotate={-3} />
        )}

        {after(frame, F_CLEVER) && (
          <SlideIn frame={frame} at={F_CLEVER} fromX={340} frames={12}>
            <DoodleCharacter
              character="mina"
              pose="armsCrossed"
              expression="smallSmile"
              x={860}
              y={1294}
              scale={2.3}
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
// blocked — the big wave does not fit
// ===========================================================================

const S3 = 'blocked';

const Blocked: React.FC = () => {
  const frame = useCurrentFrame();

  const F_BIG = C.kwIn(S3, 'wavelength-big');
  const F_OPEN = C.kwIn(S3, 'openings');
  const F_ESC = C.kwIn(S3, 'escaping');

  // the wave runs at the mesh, bounces, and runs again
  const cycle = after(frame, F_OPEN) ? ((frame - F_OPEN) % 46) / 46 : 0;
  const approach = Math.sin(cycle * Math.PI) * 190;

  return (
    <Stage>
      <SceneCamera originX={MESH_X} originY={MESH_Y}>
        <SchematicVoid frame={frame} />

        <MeshPanel x={MESH_X} y={MESH_Y} scale={2.5} frame={frame} seed="ep4-mesh" />

        {after(frame, F_BIG) && (
          <g transform={`translate(${-330 + approach} 0)`} opacity={ramp(frame, F_BIG, 8)}>
            <Wave
              x={MESH_X}
              y={MESH_Y}
              frame={frame}
              seed="ep4-big"
              wavelength={300}
              amplitude={64}
              span={620}
              color={PALETTE.coral}
              weight={9}
            />
          </g>
        )}

        {after(frame, F_BIG) && (
          <Label x={220} y={480} text="TOO WIDE" size={54} color={PALETTE.coral} opacity={ramp(frame, F_BIG + 6, 8)} rotate={-5} />
        )}

        {after(frame, F_OPEN) && cycle > 0.45 && cycle < 0.62 && (
          <ImpactLines frame={frame} at={frame} x={MESH_X - 190} y={MESH_Y} count={9} reach={90} color={PALETTE.coral} />
        )}

        {after(frame, F_ESC) && (
          <StampLabel frame={frame} at={F_ESC} x={540} y={1420} text="BLOCKED" size={82} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// light — same shot, small wave, straight through
// ===========================================================================

const S4 = 'light';

const Light: React.FC = () => {
  const frame = useCurrentFrame();

  const F_SMALL = C.kwIn(S4, 'wavelength-small');
  const F_HOLES = C.kwIn(S4, 'holes');
  const F_EYES = C.kwIn(S4, 'eyes');

  const through = ramp(frame, F_HOLES, 16);

  return (
    <Stage>
      <SceneCamera originX={MESH_X} originY={MESH_Y}>
        <SchematicVoid frame={frame} />

        <MeshPanel x={MESH_X} y={MESH_Y} scale={2.5} frame={frame} seed="ep4-mesh" />

        {/* the big wave stays on screen, greyed, so the comparison is visible not remembered */}
        {after(frame, F_SMALL) && (
          <g opacity={0.22}>
            <Wave x={MESH_X} y={MESH_Y - 250} frame={frame} seed="ep4-big" wavelength={300} amplitude={50} span={620} color={PALETTE.coral} weight={8} />
          </g>
        )}

        {after(frame, F_SMALL) && (
          <g transform={`translate(${-300 + through * 620} 0)`}>
            <Wave
              x={MESH_X}
              y={MESH_Y}
              frame={frame}
              seed="ep4-small"
              wavelength={34}
              amplitude={20}
              span={420}
              color={PALETTE.gold}
              weight={5}
            />
          </g>
        )}

        {after(frame, F_SMALL) && (
          <Label x={230} y={480} text="TINY" size={54} color={PALETTE.gold} opacity={ramp(frame, F_SMALL, 8)} rotate={-4} />
        )}

        {after(frame, F_HOLES) && (
          <StampLabel frame={frame} at={F_HOLES} x={540} y={1400} text="STRAIGHT THROUGH" size={56} color={PALETTE.gold} rotate={2} />
        )}

        {after(frame, F_EYES) && (
          <>
            <SlideIn frame={frame} at={F_EYES} fromX={260} frames={10}>
              <DoodleCharacter
                character="bill"
                pose="leanForward"
                expression="surprised"
                x={880}
                y={1297}
                scale={2.2}
                frame={frame}
                seed="bill"
              />
            </SlideIn>
            <Sparkles x={860} y={1330} scale={2.0} frame={frame} count={7} seed="ep4-eye" />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// both — the door is two things at once
// ===========================================================================

const S5 = 'both';

const Both: React.FC = () => {
  const frame = useCurrentFrame();

  const F_WIN = C.kwIn(S5, 'window');
  const F_BAR = C.kwIn(S5, 'barrier');
  const F_LEFT = C.kwIn(S5, 'leftovers');

  const split = ramp(frame, 0, 18);

  return (
    <Stage>
      <SceneCamera originX={540} originY={900}>
        <SchematicVoid frame={frame} />

        {/* the door, split down the middle into its two readings */}
        <g transform={`translate(${-split * 130} 0)`}>
          <MeshPanel x={540} y={860} scale={1.9} frame={frame} seed="ep4-mesh-l" cols={5} lit={after(frame, F_WIN)} />
        </g>
        <g transform={`translate(${split * 130} 0)`}>
          <MeshPanel x={540} y={860} scale={1.9} frame={frame} seed="ep4-mesh-r" cols={5} />
        </g>

        {after(frame, F_WIN) && (
          <StampLabel frame={frame} at={F_WIN} x={250} y={1300} text="WINDOW" size={64} color={PALETTE.teal} rotate={-5} />
        )}
        {after(frame, F_BAR) && (
          <StampLabel frame={frame} at={F_BAR} x={830} y={1300} text="BARRIER" size={64} color={PALETTE.coral} rotate={5} />
        )}

        {/* the leftovers, being cooked by the energy that never got out */}
        {after(frame, F_LEFT) && (
          <Reveal frame={frame} at={F_LEFT} originX={540} originY={1600}>
            <g transform="translate(540 1600)">
              <ellipse cx={0} cy={0} rx={130} ry={38} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={6} />
              <ellipse cx={-30} cy={-14} rx={48} ry={20} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={4} />
              <ellipse cx={44} cy={-8} rx={32} ry={15} fill={PALETTE.teal} stroke={PALETTE.ink} strokeWidth={4} />
            </g>
          </Reveal>
        )}

        {after(frame, F_BAR) && (
          <ImpactStar x={830} y={700} scale={1.5} frame={frame} seed="ep4-bar" color={PALETTE.coral} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the appliance gets glasses
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_NERDY = C.kwIn(S6, 'nerdy');
  const F_SUN = C.kwIn(S6, 'sunglasses');

  const drop = ramp(frame, F_NERDY, 12, (t) => 1 - (1 - t) ** 2);
  const punch = useCameraPunch(frame, F_SUN, { amount: 0.1, duration: 14 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={560} originY={1050}>
        <KitchenCounter frame={frame} />

        <g transform={`rotate(${after(frame, F_SUN) ? snap(frame, F_SUN) * 2.5 : 0} 560 1180)`}>
          <Microwave x={560} y={1180} scale={2.2} frame={frame} seed="ep4-mw" lit glasses={drop > 0.85} />
        </g>

        {/* the glasses fall in before they land on the prop */}
        {between(frame, F_NERDY, F_NERDY + 14) && (
          <g transform={`translate(0 ${-260 + drop * 260}) rotate(${(1 - drop) * 26} 470 1010)`}>
            <rect x={370} y={990} width={130} height={72} rx={8} fill="none" stroke={PALETTE.ink} strokeWidth={9} />
            <rect x={520} y={990} width={130} height={72} rx={8} fill="none" stroke={PALETTE.ink} strokeWidth={9} />
            <line x1={500} y1={1020} x2={520} y2={1020} stroke={PALETTE.ink} strokeWidth={9} />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose="tinyShrug"
          expression={after(frame, F_SUN) ? 'laughing' : 'happy'}
          x={170}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        <DoodleCharacter
          character="mina"
          pose="armsCrossed"
          expression="unimpressed"
          x={930}
          y={1294}
          scale={2.3}
          frame={frame}
          seed="mina"
        />

        {after(frame, F_SUN) && (
          <StampLabel frame={frame} at={F_SUN} x={540} y={380} text="EXTREMELY NERDY" size={62} color={PALETTE.violet} rotate={-4} />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  mesh: Mesh,
  blocked: Blocked,
  light: Light,
  both: Both,
  payoff: Payoff,
};
