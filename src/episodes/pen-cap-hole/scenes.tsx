/**
 * Episode 09 — "The Hole In A Pen Cap Is A Safety Feature"
 *
 * TONE, and it governs every choice in this file: the subject is a real choking hazard. The
 * danger stays a DIAGRAM. Nobody chokes on screen, nobody is in distress, and no beat is
 * played for laughs. The airway is a plain tube with no body drawn around it, and the vent is
 * shown doing its job calmly rather than dramatically.
 *
 * The comedy this episode is allowed is RESPECT — the cheapest object on the desk being
 * lit and handled like an artefact. That is why the payoff greys out everything else and ends
 * on Bill putting the cap back on carefully, not on a punchline.
 *
 * Gus stamps a document once. He is a standards body, not a joke.
 *
 * The narration names a brand; the drawing does not. `PenCap` is generic by construction.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { DeskSurface, SchematicVoid } from '../../backgrounds/everyday';
import { PenCap, Pen, AirwayTube } from '../../props/objects';
import { CircleIt, FlowArrows } from '../../fx/diagram';
import { WallClock } from '../../props/time';
import { clockAt } from '../../animation/ClockSpin';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('pen-cap-hole');

export const HIGHLIGHTS = {
  hole: PALETTE.teal,
  vent: PALETTE.teal,
  vented: PALETTE.teal,
  safety: PALETTE.coral,
  airway: PALETTE.coral,
  air: PALETTE.teal,
  breaths: PALETTE.teal,
  matter: PALETTE.coral,
};

// ===========================================================================
// hook — an idle object becomes a serious one
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_HOLE = C.kwIn(S1, 'hole');
  const F_SERIOUS = C.kwIn(S1, 'serious');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingSmall' },
      { at: F_HOLE, pose: 'leanForward' },
      { at: F_SERIOUS, pose: 'standAlert' },
    ],
    frame,
    2,
  );

  // he is turning it over, then stops
  const turn = after(frame, F_HOLE) ? 0 : Math.sin(frame * 0.12) * 22;
  const punch = useCameraPunch(frame, F_HOLE, { amount: 0.14, duration: 16 });

  return (
    <Stage tint={after(frame, F_SERIOUS) ? PALETTE.paperShade : undefined}>
      <SceneCamera zoom={punch} originX={660} originY={950}>
        <DeskSurface frame={frame} />

        <g transform={`rotate(${turn} 660 950)`}>
          <PenCap x={660} y={950} scale={3.2} frame={frame} seed="ep9-cap" ventLit={after(frame, F_HOLE)} />
        </g>

        {after(frame, F_HOLE) && (
          <Reveal frame={frame} at={F_HOLE} originX={660} originY={764}>
            <CircleIt x={660} y={764} rx={70} ry={60} frame={frame} seed="ep9-mark" color={PALETTE.teal} />
          </Reveal>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_SERIOUS) ? 'focused' : 'curious'}
          x={230}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_SERIOUS) && (
          <StampLabel frame={frame} at={F_SERIOUS} x={540} y={400} text="THIS ONE IS SERIOUS" size={58} color={PALETTE.ink} rotate={-2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// vented — the cap, generic, opened up
// ===========================================================================

const S2 = 'vented';

const Vented: React.FC = () => {
  const frame = useCurrentFrame();

  const F_VENT = C.kwIn(S2, 'vented');
  const F_SAFETY = C.kwIn(S2, 'safety');

  const dolly = useCameraDolly(frame, { from: 1.3, to: 1.0, start: 0, duration: 20 });
  // the section rotates slowly so the channel reads end to end
  const spin = Math.sin(frame * 0.035) * 12;

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={900}>
        <SchematicVoid frame={frame} />

        <g transform={`rotate(${spin} 540 900)`}>
          <PenCap
            x={540}
            y={900}
            scale={5.2}
            frame={frame}
            seed="ep9-cap-big"
            section={after(frame, F_VENT)}
            ventLit={after(frame, F_VENT)}
          />
        </g>

        {after(frame, F_VENT) && (
          <StampLabel frame={frame} at={F_VENT} x={540} y={1420} text="VENTED CAP" size={62} color={PALETTE.teal} rotate={-3} />
        )}

        {after(frame, F_SAFETY) && (
          <Label
            x={540}
            y={1560}
            text="a safety feature"
            size={44}
            color={PALETTE.inkSoft}
            opacity={ramp(frame, F_SAFETY, 10)}
          />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// airway — a schematic, and nothing more
// ===========================================================================

const S3 = 'airway';

const Airway: React.FC = () => {
  const frame = useCurrentFrame();

  const F_LODGED = C.kwIn(S3, 'lodged');
  const F_VENT = C.kwIn(S3, 'vent');
  const F_PASS = C.kwIn(S3, 'pass-through');
  const F_HELP = C.kwIn(S3, 'emergency-help');

  const blocked = after(frame, F_LODGED);
  const flowing = after(frame, F_PASS);

  return (
    <Stage>
      <SceneCamera originX={540} originY={950}>
        <SchematicVoid frame={frame} />

        <AirwayTube
          x={540}
          y={950}
          scale={3.0}
          frame={frame}
          seed="ep9-airway"
          blocked={blocked}
          ventFlow={after(frame, F_VENT)}
        />

        {after(frame, F_LODGED) && (
          <StampLabel frame={frame} at={F_LODGED} x={540} y={420} text="BLOCKED" size={64} rotate={-3} />
        )}

        {after(frame, F_VENT) && (
          <Reveal frame={frame} at={F_VENT} originX={540} originY={800}>
            <CircleIt x={540} y={800} rx={70} ry={60} frame={frame} seed="ep9-vent-mark" color={PALETTE.teal} />
          </Reveal>
        )}

        {/* air moving through, steadily — not dramatically */}
        {flowing && (
          <g transform="rotate(-90 540 950)">
            <FlowArrows x={540} y={950} scale={2.0} frame={frame} count={3} len={220} seed="ep9-air" alive />
          </g>
        )}

        {flowing && (
          <StampLabel frame={frame} at={F_PASS} x={540} y={1420} text="AIR STILL PASSES" size={56} color={PALETTE.teal} rotate={2} />
        )}

        {/* the vent buys time; it does not solve anything, and the clock says so */}
        {after(frame, F_HELP) && (
          <SlideIn frame={frame} at={F_HELP} fromX={280} frames={12}>
            <WallClock
              x={880}
              y={620}
              scale={1.7}
              frame={frame}
              seed="ep9-clock"
              {...clockAt(10, Math.round(((frame - F_HELP) * 1.5) % 60))}
            />
          </SlideIn>
        )}
        {after(frame, F_HELP) && (
          <Label x={880} y={790} text="BUYS TIME" size={38} color={PALETTE.inkSoft} opacity={ramp(frame, F_HELP + 6, 10)} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// standards — one stamp, no expression
// ===========================================================================

const S4 = 'standards';

const Standards: React.FC = () => {
  const frame = useCurrentFrame();

  const F_STD = C.kwIn(S4, 'standards');
  const F_REASON = C.kwIn(S4, 'this-reason');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'clipboard' },
      { at: F_STD - 3, pose: 'pointing' },
      { at: F_STD + 4, pose: 'clipboard' },
      { at: F_REASON, pose: 'walkA' },
    ],
    frame,
    2,
  );

  const leave = ramp(frame, F_REASON, 18);
  const fileAway = ramp(frame, F_REASON, 14);

  return (
    <Stage>
      <SceneCamera originX={540} originY={1050}>
        <DeskSurface frame={frame} />

        {/* the document */}
        <g transform={`translate(${470 + fileAway * 300} ${1080 + fileAway * 260})`} opacity={1 - fileAway}>
          <rect x={-140} y={-190} width={280} height={370} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={6} />
          {[-130, -90, -50, -10, 30].map((y) => (
            <line key={y} x1={-108} y1={y} x2={108} y2={y} stroke={PALETTE.greyDeep} strokeWidth={5} />
          ))}
          {after(frame, F_STD) && (
            <g transform="rotate(-11)">
              <rect x={-116} y={60} width={232} height={78} fill="none" stroke={PALETTE.coral} strokeWidth={7} />
              <Label x={0} y={99} text="VENTED CAPS" size={38} color={PALETTE.coral} />
            </g>
          )}
        </g>

        <DoodleCharacter
          character="gus"
          pose={pose}
          expression="deadpan"
          x={800 + leave * 420}
          y={1284}
          scale={2.6}
          frame={frame}
          seed="gus"
        />

        <StampLabel frame={frame} at={F_STD} x={540} y={400} text="INTERNATIONAL STANDARD" size={50} color={PALETTE.ink} rotate={-2} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — the cheapest object on the desk, taken seriously
// ===========================================================================

const S5 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_CHEAP = C.kwIn(S5, 'cheapest');
  const F_PLASTIC = C.kwIn(S5, 'plastic');
  const F_BREATH = C.kwIn(S5, 'breaths');
  const F_MATTER = C.kwIn(S5, 'matter');

  // everything but the cap desaturates
  const grey = ramp(frame, F_CHEAP, 18);
  const lift = ramp(frame, F_PLASTIC, 20);
  const turn = after(frame, F_PLASTIC) ? (frame - F_PLASTIC) * 1.4 : 0;
  const capBack = ramp(frame, F_MATTER, 16, (t) => 1 - (1 - t) ** 2);

  return (
    <Stage>
      <SceneCamera originX={540} originY={1000}>
        <DeskSurface frame={frame} opacity={1 - grey * 0.55} />

        <g opacity={1 - grey * 0.75}>
          <Pen x={280} y={1180} scale={1.5} frame={frame} seed="ep9-pen" capped={false} />
        </g>

        {/* the cap: lifted, turned, lit like an artefact, then put back */}
        <g transform={`translate(${540 + capBack * -260} ${1000 - lift * 200 + capBack * 150}) rotate(${turn * (1 - capBack)})`}>
          <PenCap x={0} y={0} scale={3.4} frame={frame} seed="ep9-cap-hero" ventLit />
        </g>

        {after(frame, F_BREATH) && capBack < 0.2 && (
          <g transform="rotate(-90 540 740)">
            <FlowArrows x={540} y={740} scale={1.5} frame={frame} count={2} len={90} seed="ep9-breath" alive />
          </g>
        )}

        <DoodleCharacter
          character="bill"
          pose={after(frame, F_MATTER) ? 'holdingSmall' : 'thinking'}
          expression={after(frame, F_MATTER) ? 'content' : 'focused'}
          x={230}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        {between(frame, F_CHEAP, F_MATTER) && (
          <StampLabel
            frame={frame}
            at={F_CHEAP}
            until={F_MATTER}
            x={540}
            y={400}
            text="THE CHEAPEST THING HERE"
            size={50}
            color={PALETTE.inkSoft}
            rotate={-2}
          />
        )}

        {after(frame, F_MATTER) && (
          <StampLabel frame={frame} at={F_MATTER} x={540} y={400} text="AND IT COULD MATTER" size={56} color={PALETTE.coral} rotate={-2} />
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  vented: Vented,
  airway: Airway,
  standards: Standards,
  payoff: Payoff,
};
