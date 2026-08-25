/**
 * ch17-network.tsx — 13:14-end. The network of promises, and the five-minute callback.
 *
 * The last chapter has two jobs and they pull in opposite directions: land the thesis, and
 * return to the joke the film opened on. Doing the thesis first and the joke last is the only
 * order that works — the callback is a release, and a release has to come after the thing it
 * releases from.
 *
 * The network is the film's largest diagram and is built to keep evolving for its whole
 * duration: nodes, then edges, then tokens moving on every edge at once, then a pull back that
 * lets the whole web be seen as one object. It never sits still, because "constantly flowing
 * obligations" is the claim and a static web would quietly contradict it.
 *
 * The closing timer is real. It counts from 5:00 and is still counting when the video cuts,
 * which is the joke: nothing has been resolved, the five minutes have simply started.
 */

import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { NetworkGraph } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** The same participants chapter 16 introduced, now seen all at once. */
const NODES = [
  { at: { x: 300, y: 250 }, label: 'HOUSEHOLDS' },
  { at: { x: 760, y: 180 }, label: 'BANKS' },
  { at: { x: 1230, y: 200 }, label: 'COMPANIES' },
  { at: { x: 1650, y: 300 }, label: 'INVESTORS' },
  { at: { x: 1700, y: 620 }, label: 'PENSION FUNDS' },
  { at: { x: 1280, y: 720 }, label: 'GOVERNMENTS' },
  { at: { x: 800, y: 760 }, label: 'DEPOSITORS' },
  { at: { x: 300, y: 620 }, label: 'INSURERS' },
  { at: { x: 980, y: 460 }, label: 'OTHER GOVERNMENTS' },
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
  [0, 8], [1, 8], [2, 8], [3, 8], [5, 8], [6, 8],
  [1, 5], [2, 4], [0, 6], [3, 7],
];

export const Ch17NetworkOfPromises: React.FC = () => {
  const { at, w } = ctxFor(260, 272);

  return (
    <>
      {/* ---- 13:14-13:18 three promises ---- */}
      <Sequence from={0} durationInFrames={at(798.4)}>
        {[
          ['month', 'I’LL PAY YOU NEXT MONTH'],
          ['year', 'I’LL PAY YOU NEXT YEAR'],
          ['thirty', 'I’LL PAY YOU IN THIRTY YEARS'],
        ].map(([word, label], i) => (
          <Sequence key={label} from={w(word) - 5}>
            <SlideIn dx={i % 2 === 0 ? -1 : 1} distance={110}>
              <Plate
                x={STAGE.cx}
                y={300 + i * 160}
                width={1000}
                height={126}
                size={T.label}
                tone="ink"
                fill={C.wash}
                radius={30}
              >
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
      </Sequence>

      {/* ---- 13:18-13:33 savers, borrowers, and the price of waiting ---- */}
      <Sequence from={at(798.2)} durationInFrames={at(813.4) - at(798.2)}>
        <Sequence from={w('savers') - at(798.2) - 5}>
          <PopIn>
            <Yolk slug="piggy-bank-saving" height={250} x={470} y={520} anchor="bottom" />
            <Label x={470} y={600} size={T.note} weight={900} caps width={520}>savers give up today</Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('borrowers') - at(798.2) - 5}>
          <PopIn>
            <Yolk slug="new-factory-sparkle" height={250} x={1440} y={520} anchor="bottom" />
            <Label x={1440} y={600} size={T.note} weight={900} caps width={520}>borrowers build today</Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('waiting', 1) - at(798.2) - 5}>
          <PopIn>
            <Plate x={520} y={790} width={720} height={140} size={T.label} tone="violet" sub="INTEREST IS">
              THE PRICE OF WAITING
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('Risk') - at(798.2) - 5}>
          <PopIn>
            <Plate x={1400} y={790} width={720} height={140} size={T.label} tone="red" sub="RISK SETS">
              HOW EXPENSIVE IT IS
            </Plate>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 13:33-13:51 the one gigantic assumption ---- */}
      <Sequence from={at(813.2)} durationInFrames={at(831.4) - at(813.2)}>
        <Camera push={0.05} frames={at(831.4) - at(813.2)}>
          <Sequence from={w('assumption') - at(813.2) - 6}>
            <HeroWord y={330} tone="ink" size={78}>one gigantic assumption</HeroWord>
          </Sequence>
          <Sequence from={w('tomorrow', 1) - at(813.2) - 4}>
            <PopIn>
              <Label x={STAGE.cx} y={486} size={T.big} weight={900} tone="violet" caps width={1780} track={2} fit>
                tomorrow will be productive enough
              </Label>
              <Label x={STAGE.cx} y={602} size={T.big} weight={900} tone="violet" caps width={1780} track={2} fit>
                to pay for what we build today
              </Label>
            </PopIn>
          </Sequence>
          <Sequence from={w('correct') - at(813.2) - 4}>
            <SlideIn dx={-1} distance={90}>
              <Plate x={560} y={790} width={700} height={130} size={T.label} tone="green" fill={C.greenSoft}>
                WHEN IT HOLDS: GROWTH
              </Plate>
            </SlideIn>
          </Sequence>
          <Sequence from={w('interesting') - at(813.2) - 6}>
            <SlideIn dx={1} distance={90}>
              <Plate x={1360} y={790} width={760} height={130} size={T.label} tone="red" fill={C.redSoft}>
                WHEN IT DOESN’T: “INTERESTING”
              </Plate>
            </SlideIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 13:51-14:06 the network ---- */}
      <Sequence from={at(831.2)} durationInFrames={at(846) - at(831.2)}>
        <Camera push={-0.09} frames={at(846) - at(831.2)}>
          <NetworkGraph nodes={NODES} edges={EDGES} delay={0} edgeStep={2} nodeWidth={230} />
        </Camera>
        <Sequence
          from={w('money') - at(831.2) - 4}
          durationInFrames={Math.max(1, w('stranger') - w('money'))}
        >
          <FadeIn>
            <Label x={STAGE.cx} y={862} size={T.title} weight={900} tone="inkSoft" caps width={1750} track={2} fit>
              not a giant pile of cash
            </Label>
          </FadeIn>
        </Sequence>
        <Sequence from={w('stranger') - at(831.2) - 4}>
          <Pulse at={5} amount={0.06}>
            <Label x={STAGE.cx} y={880} size={T.title} weight={900} tone="ink" width={1780} track={1} fit>
              TRUST · EXPECTATIONS · PROMISES · I.O.U.s
            </Label>
          </Pulse>
        </Sequence>
      </Sequence>

      {/* ---- 14:06-end the callback ---- */}
      <Sequence from={at(845.8)}>
        <Sequence from={w('celebrate', 1) - at(845.8) - 6}>
          <PopIn>
            <YolkHero slug="papers-flying-away-happy" height={330} x={STAGE.cx} y={890} anchor="bottom" />
          </PopIn>
          <FadeIn delay={8}>
            <Label x={STAGE.cx} y={160} size={T.title} weight={900} tone="green" caps width={1700} track={2} fit>
              if every debt disappeared tomorrow
            </Label>
          </FadeIn>
        </Sequence>

        <Sequence from={w('minutes') - at(845.8) - 10}>
          <PopIn>
            <Label x={STAGE.cx} y={252} size={T.big} weight={900} tone="red" caps width={1740} track={3} fit>
              don’t celebrate for more than
            </Label>
          </PopIn>
          <CountdownTimer startDelay={10} />
        </Sequence>
      </Sequence>
    </>
  );
};

/**
 * A five-minute timer that starts and does not finish.
 *
 * It runs for the tail hold and the video cuts while it is still going, which is the whole
 * gag: the film ends on an unresolved countdown rather than on a conclusion. Counting DOWN
 * from 5:00 rather than up, because the joke in the opening was that the celebration had a
 * deadline.
 */
const CountdownTimer: React.FC<{ startDelay: number }> = ({ startDelay }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, (frame - startDelay) / 30);
  const remaining = Math.max(0, 300 - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);
  const appear = interpolate(frame - startDelay, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 320,
      width: 1920,
      textAlign: 'center',
      fontFamily: FONT.sans,
      fontWeight: 900,
      fontSize: 196,
      color: C.ink,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: 6,
      opacity: appear,
      transform: `scale(${interpolate(appear, [0, 1], [0.8, 1])})`,
    }}
    >
      {mm}:{String(ss).padStart(2, '0')}
    </div>
  );
};
