/**
 * Episode 05 — "Your Jeans Have A Pocket For A Gadget From The 1800s"
 *
 * The reveal is a FIT. Three modern objects are tried and rejected, then a pocket watch
 * slides in and seats perfectly — and that single moment of something fitting is the whole
 * payoff, so it gets the scene's longest hold and its only satisfying sound.
 *
 * Mochi steals the watch during the history scene and is still wearing it in the background
 * of the last shot. Nobody in the episode ever acknowledges this. A gag that the characters
 * notice stops being a background gag.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';

import { Stage } from '../../components/Stage';
import { DoodleCharacter } from '../../components/DoodleCharacter';
import { BedroomFloor, OldWorkshop, CutawayVoid } from '../../backgrounds/everyday';
import { Jeans, PocketWatch, JEANS_POCKET } from '../../props/objects';
import { Wristwatch } from '../../props/time';
import { CircleIt, CrossOut, Tick } from '../../fx/diagram';
import { QuestionMark, Sparkles, MotionLines } from '../../fx/marks';
import { usePoseSwap } from '../../animation/PoseSwap';
import { SceneCamera, useCameraPunch, useCameraDolly } from '../../animation/SceneCamera';
import { PALETTE } from '../../style/tokens';
import { clockFor } from '../registry';
import { after, between, ramp, snap, Label, Reveal, SlideIn, StampLabel } from '../../scenes/kit';

const C = clockFor('jeans-watch-pocket');

export const HIGHLIGHTS = {
  '1800s': PALETTE.gold,
  pocket: PALETTE.teal,
  watch: PALETTE.gold,
  fossil: PALETTE.violet,
  survived: PALETTE.teal,
  coins: PALETTE.greyDeep,
  airpods: PALETTE.greyDeep,
};

/**
 * The jeans are staged at one place per shot type, and the little pocket's screen position
 * is DERIVED from the prop rather than measured off a still — the prop was redrawn once
 * already and every hand-tuned marker went stale in the same edit.
 */
const HOOK = { x: 660, y: 1080, s: 1.5 };
const CLOSE = { x: 560, y: 980, s: 2.0 };
const pocketAt = (p: { x: number; y: number; s: number }) => ({
  x: p.x + JEANS_POCKET.x * p.s,
  y: p.y + JEANS_POCKET.y * p.s,
});

// ===========================================================================
// hook — a man confused by his own trousers
// ===========================================================================

const S1 = 'hook';

const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  const F_1800 = C.kwIn(S1, '1800s');
  const F_LOOK = F_1800 + 21;

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'checkingWallet' },
      { at: F_1800, pose: 'surprised' },
      { at: F_LOOK, pose: 'confused' },
    ],
    frame,
    2,
  );

  const punch = useCameraPunch(frame, F_1800, { amount: 0.14, duration: 15 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={620} originY={1100}>
        <BedroomFloor frame={frame} />

        <Jeans x={HOOK.x} y={HOOK.y} scale={HOOK.s} frame={frame} seed="ep5-jeans" littleLit={after(frame, F_1800)} />

        {after(frame, F_1800) && (
          <>
            <Reveal frame={frame} at={F_1800} originX={pocketAt(HOOK).x} originY={pocketAt(HOOK).y}>
              <CircleIt x={pocketAt(HOOK).x} y={pocketAt(HOOK).y} rx={66} ry={54} frame={frame} seed="ep5-mark" />
            </Reveal>
            <StampLabel frame={frame} at={F_1800 + 4} x={540} y={380} text="MADE FOR THE 1800s" size={62} color={PALETTE.gold} rotate={-4} />
          </>
        )}

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_LOOK) ? 'confused' : after(frame, F_1800) ? 'surprised' : 'neutral'}
          x={200}
          y={1287}
          scale={2.5}
          frame={frame}
          seed="bill"
        />

        {after(frame, F_LOOK) && (
          <Reveal frame={frame} at={F_LOOK} originX={330} originY={880}>
            <QuestionMark x={330} y={880} scale={2.4} frame={frame} seed="ep5-q" />
          </Reveal>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// not-for — three wrong answers
// ===========================================================================

const S2 = 'not-for';

const NotFor: React.FC = () => {
  const frame = useCurrentFrame();

  const F_COINS = C.kwIn(S2, 'coins');
  const F_PODS = C.kwIn(S2, 'airpods');
  const F_FIT = C.kwIn(S2, 'barely-fit');

  const dolly = useCameraDolly(frame, { from: 1.35, to: 1.05, start: 0, duration: 18 });

  /** Same rhythm every time: the object arrives, refuses to fit, gets crossed out. */
  const attempt = (at: number, node: React.ReactNode) =>
    between(frame, at - 6, at + 30) && (
      <g opacity={1 - ramp(frame, at + 22, 8)}>
        <SlideIn frame={frame} at={at} fromY={-220} frames={8}>
          {node}
        </SlideIn>
        {after(frame, at + 12) && (
          <Reveal frame={frame} at={at + 12} originX={720} originY={820}>
            <CrossOut x={720} y={820} scale={1.4} frame={frame} seed={`ep5-x-${at}`} />
          </Reveal>
        )}
      </g>
    );

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={640} originY={880}>
        <CutawayVoid frame={frame} />

        <Jeans x={CLOSE.x} y={CLOSE.y} scale={CLOSE.s} frame={frame} seed="ep5-jeans-close" littleLit />

        {attempt(F_COINS,
          <g transform="translate(720 820)">
            <circle cx={0} cy={0} r={44} fill={PALETTE.gold} stroke={PALETTE.ink} strokeWidth={6} />
            <circle cx={0} cy={0} r={30} fill="none" stroke={PALETTE.ink} strokeWidth={4} />
          </g>,
        )}

        {attempt(F_PODS,
          <g transform="translate(720 820)">
            <rect x={-52} y={-40} width={104} height={80} rx={22} fill={PALETTE.paper} stroke={PALETTE.ink} strokeWidth={6} />
            <line x1={-52} y1={-4} x2={52} y2={-4} stroke={PALETTE.ink} strokeWidth={4} />
          </g>,
        )}

        {after(frame, F_FIT) && (
          <>
            <StampLabel frame={frame} at={F_FIT} x={540} y={400} text="NOTHING FITS" size={68} rotate={-3} />
            <MotionLines x={760} y={960} scale={1.8} frame={frame} direction="up" count={3} seed="ep5-stuck" />
          </>
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// watch-pocket — the fit
// ===========================================================================

const S3 = 'watch-pocket';

const WatchPocket: React.FC = () => {
  const frame = useCurrentFrame();

  const F_WATCH = C.kwIn(S3, 'watch-pocket');
  const F_TICK = F_WATCH + 24;

  // it lowers in and SEATS — the ease settles rather than bounces, so it reads as a fit
  const seat = ramp(frame, F_WATCH, 14, (t) => 1 - (1 - t) ** 2);
  const punch = useCameraPunch(frame, F_WATCH + 13, { amount: 0.08, duration: 12 });

  return (
    <Stage>
      <SceneCamera zoom={punch} originX={540} originY={900}>
        {/* four frames of sepia — an old photograph, then back */}
        <CutawayVoid frame={frame} opacity={frame < 4 ? 0.5 : 1} />

        <Jeans x={CLOSE.x} y={CLOSE.y} scale={CLOSE.s} frame={frame} seed="ep5-jeans-close" littleLit />

        {after(frame, F_WATCH - 10) && (
          <g transform={`translate(0 ${-320 + seat * 320})`}>
            <PocketWatch x={pocketAt(CLOSE).x} y={pocketAt(CLOSE).y} scale={2.0} frame={frame} seed="ep5-watch" chain={seat < 0.95} />
          </g>
        )}

        {after(frame, F_TICK) && (
          <>
            <Reveal frame={frame} at={F_TICK} originX={760} originY={720}>
              <Tick x={760} y={720} scale={1.9} frame={frame} seed="ep5-fit" />
            </Reveal>
            <Label x={760} y={880} text="PERFECT FIT" size={52} color={PALETTE.teal} opacity={ramp(frame, F_TICK, 8)} rotate={4} />
            <Sparkles x={pocketAt(CLOSE).x} y={pocketAt(CLOSE).y} scale={2.4} frame={frame} count={9} seed="ep5-sparkle" />
          </>
        )}

        <StampLabel frame={frame} at={F_WATCH} x={540} y={380} text="A WATCH POCKET" size={66} color={PALETTE.gold} rotate={-3} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// history — Bill as the worker, Mochi as the thief
// ===========================================================================

const S4 = 'history';

const History: React.FC = () => {
  const frame = useCurrentFrame();

  const F_WORKERS = C.kwIn(S4, 'workers');
  const F_PROT = C.kwIn(S4, 'protected');

  const pose = usePoseSwap(
    [
      { at: 0, pose: 'holdingSmall' },
      { at: F_WORKERS, pose: 'relaxed' },
      { at: F_PROT + 30, pose: 'lookRight' },
    ],
    frame,
    2,
  );

  // Mochi crosses behind, takes the watch, and keeps walking
  const steal = ramp(frame, F_PROT, 34);
  const mochiX = 1180 - steal * 900;

  return (
    <Stage>
      <SceneCamera originX={540} originY={1050}>
        <OldWorkshop frame={frame} />

        <DoodleCharacter
          character="bill"
          pose={pose}
          expression={after(frame, F_PROT + 30) ? 'confused' : 'content'}
          x={430}
          y={1280}
          scale={2.7}
          frame={frame}
          seed="bill"
        />

        {/* the watch is on him until Mochi passes, then it is on Mochi */}
        {!after(frame, F_PROT + 14) && (
          <PocketWatch x={560} y={1130} scale={1.5} frame={frame} seed="ep5-watch-worn" />
        )}

        {after(frame, F_WORKERS) && !after(frame, F_PROT) && (
          <Sparkles x={560} y={1130} scale={1.6} frame={frame} count={6} seed="ep5-protect" />
        )}

        {after(frame, F_PROT - 8) && (
          <>
            <DoodleCharacter
              character="mochi"
              pose={steal > 0.2 && steal < 0.9 ? 'carrying' : 'walkA'}
              expression="smug"
              x={mochiX}
              y={1311}
              scale={1.8}
              frame={frame}
              seed="mochi"
            />
            {steal > 0.25 && (
              <PocketWatch x={mochiX - 40} y={1440} scale={1.1} frame={frame} seed="ep5-watch-stolen" chain={false} />
            )}
          </>
        )}

        <StampLabel frame={frame} at={F_WORKERS} x={540} y={400} text="EVERY WORKER HAD ONE" size={52} color={PALETTE.ink} rotate={-3} />
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// extinction — the watch goes, the pocket stays
// ===========================================================================

const S5 = 'extinction';

const Extinction: React.FC = () => {
  const frame = useCurrentFrame();

  const F_WRIST = C.kwIn(S5, 'wristwatches');
  const F_GONE = C.kwIn(S5, 'disappeared');
  const F_SURV = C.kwIn(S5, 'survived');

  const fade = ramp(frame, F_GONE, 22);
  const clear = ramp(frame, F_SURV, 18);

  // Between the wristwatch snapping on and the pocket watch fading out there was a second
  // of nothing. A slow push covers it without inventing a beat the narration does not have.
  const dolly = useCameraDolly(frame, { from: 1.08, to: 1.0, start: 0, duration: C.sceneFrames(S5) });

  return (
    <Stage>
      <SceneCamera zoom={dolly} originX={540} originY={1000}>
        <OldWorkshop frame={frame} opacity={1 - clear * 0.75} />

        {/* the wristwatch straps on with a snap */}
        {after(frame, F_WRIST) && (
          <g transform={`scale(${snap(frame, F_WRIST)})`} style={{ transformOrigin: '340px 900px' }}>
            <Wristwatch x={340} y={900} scale={2.2} frame={frame} seed="ep5-wrist" />
          </g>
        )}

        {/* the pocket watch greys out and blows away */}
        {fade < 1 && (
          <g opacity={1 - fade} transform={`translate(${fade * 420} ${-fade * 200}) rotate(${fade * 90} 760 900)`}>
            <PocketWatch x={760} y={900} scale={2.2} frame={frame} seed="ep5-watch-dying" />
          </g>
        )}

        {between(frame, F_GONE, F_GONE + 26) && (
          <MotionLines x={860} y={860} scale={2.0} frame={frame} direction="right" count={4} seed="ep5-blow" />
        )}

        {/* everything clears; the pocket remains */}
        <g opacity={clear}>
          <Jeans x={540} y={1050} scale={1.6} frame={frame} seed="ep5-jeans-alone" littleLit />
        </g>

        {after(frame, F_SURV) && (
          <StampLabel frame={frame} at={F_SURV} x={540} y={420} text="THE POCKET SURVIVED" size={58} color={PALETTE.teal} rotate={-3} />
        )}
      </SceneCamera>
    </Stage>
  );
};

// ===========================================================================
// payoff — a seam in a museum, and a cat with the exhibit
// ===========================================================================

const S6 = 'payoff';

const Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  const F_FOSSIL = C.kwIn(S6, 'fossil');
  const F_NOBODY = C.kwIn(S6, 'nobody-carries');

  const rise = ramp(frame, 0, 20);
  const mochiX = after(frame, F_NOBODY) ? 1220 - ramp(frame, F_NOBODY, 40) * 700 : 1220;

  return (
    <Stage>
      <SceneCamera originX={560} originY={1050}>
        <BedroomFloor frame={frame} />

        {/* a plinth for a pocket */}
        <g transform={`translate(0 ${(1 - rise) * 120})`} opacity={rise}>
          <rect x={430} y={1320} width={260} height={150} fill={PALETTE.paperShade} stroke={PALETTE.ink} strokeWidth={6} />
          <rect x={400} y={1300} width={320} height={30} fill={PALETTE.grey} stroke={PALETTE.ink} strokeWidth={5} />
          <Jeans x={560} y={1190} scale={0.85} frame={frame} seed="ep5-jeans-exhibit" littleLit />
        </g>

        {after(frame, F_FOSSIL) && (
          <StampLabel frame={frame} at={F_FOSSIL} x={560} y={1530} text="FOSSIL" size={62} color={PALETTE.violet} rotate={-2} />
        )}

        <DoodleCharacter
          character="bill"
          pose="thinking"
          expression={after(frame, F_FOSSIL) ? 'curious' : 'neutral'}
          x={200}
          y={1290}
          scale={2.4}
          frame={frame}
          seed="bill"
        />

        {/* still wearing it. Nobody comments. */}
        {after(frame, F_NOBODY) && (
          <g opacity={0.9}>
            <DoodleCharacter
              character="mochi"
              pose="walkB"
              expression="smug"
              x={mochiX}
              y={880}
              scale={1.3}
              frame={frame}
              seed="mochi-payoff"
            />
            <PocketWatch x={mochiX - 26} y={840} scale={0.8} frame={frame} seed="ep5-watch-kept" chain={false} />
          </g>
        )}
      </SceneCamera>
    </Stage>
  );
};

export const SCENES: Record<string, React.FC> = {
  hook: Hook,
  'not-for': NotFor,
  'watch-pocket': WatchPocket,
  history: History,
  extinction: Extinction,
  payoff: Payoff,
};
