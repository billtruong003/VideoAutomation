/**
 * ch11-crisis.tsx — 8:25-9:18. The feedback loop, and how fast it moves.
 *
 * The doom loop has to be drawn as a LOOP or it is not the argument. Four nodes in a ring —
 * risky, higher rates, weaker company, more nervous lenders — with the last arrow closing back
 * onto the first, and then the whole ring cycling faster. A vertical list of the same four
 * statements would be four facts; the ring is the claim that it feeds itself.
 *
 * The closing cascade is one nine-word-per-second sentence naming eight consequences in a row,
 * so it gets eight objects arriving in a grid at exactly the pace they are spoken. That is the
 * one place in the film where near-strobing density is correct: the narration is describing
 * something happening too fast to follow, and the visuals should be too.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockWindow } from '../components/Stock';
import { Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, Shake, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** The doom loop, clockwise from the top. */
const LOOP = [
  { word: 'risky', at: { x: 960, y: 250 }, label: 'COMPANY LOOKS RISKY' },
  { word: 'higher', at: { x: 1450, y: 470 }, label: 'LENDERS DEMAND HIGHER RATES' },
  { word: 'weaker', at: { x: 960, y: 690 }, label: 'THE COMPANY GETS WEAKER' },
  { word: 'nervous', at: { x: 470, y: 470 }, label: 'LENDERS GET MORE NERVOUS' },
] as const;

const CASCADE = [
  ['defaulting', 'BORROWERS DEFAULT'],
  ['panic', 'LENDERS PANIC'],
  ['afraid', 'BANKS STOP LENDING'],
  ['disappears', 'CREDIT DISAPPEARS'],
  ['refinance', 'NOBODY CAN REFINANCE'],
  ['sell', 'INVESTORS SELL'],
  ['fall', 'PRICES FALL'],
  ['trouble', 'MORE BORROWERS IN TROUBLE'],
] as const;

export const Ch11CreditCrisis: React.FC = () => {
  const { at, w, wAfter } = ctxFor(182, 193);

  return (
    <>
      {/* ---- 8:25-8:48 the doom loop ---- */}
      <Sequence from={0} durationInFrames={at(528.6)}>
        <Camera push={0.03} frames={at(528.6)}>
          {LOOP.map((n, i) => (
            <Sequence key={n.label} from={w(n.word) - 6}>
              <Node
                at={n.at}
                label={n.label}
                width={430}
                height={120}
                size={26}
                tone={i === 0 ? C.ink : C.red}
              />
              <Arrow
                from={LOOP[i].at}
                to={LOOP[(i + 1) % LOOP.length].at}
                bow={90}
                delay={10}
                frames={18}
                color={C.red}
                width={5}
              />
            </Sequence>
          ))}

          {/* The loop closing on itself, and then running. */}
          <Sequence from={w('again', 1) - 4}>
            <Arrow
              from={LOOP[3].at}
              to={LOOP[0].at}
              bow={90}
              delay={0}
              frames={16}
              color={C.red}
              width={6}
            />
            <MoneyToken
              from={LOOP[0].at}
              to={LOOP[1].at}
              bow={90}
              delay={6}
              frames={22}
              repeat={4}
              gap={22}
              size={26}
              label=""
              color={C.red}
            />
          </Sequence>

          <Sequence from={w('Eventually') - 6}>
            <FadeIn frames={8}>
              <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
            </FadeIn>
            <Pulse at={4} amount={0.12}>
              <Label x={STAGE.cx} y={420} size={T.big} weight={900} tone="red" caps width={1700} track={2}>
                lenders stop lending entirely
              </Label>
            </Pulse>
            <PopIn delay={10}>
              <Yolk slug="cant-refinance" height={260} x={STAGE.cx} y={860} anchor="bottom" />
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 8:46-9:02 the good times ---- */}
      <Sequence from={at(528.4)} durationInFrames={at(542.4) - at(528.4)}>
        <Sequence durationInFrames={Math.max(1, w('breaks') - at(528.4) - 4)}>
          <Label x={STAGE.cx} y={160} size={T.title} weight={900} tone="green" caps width={1700} track={2}>
            during good times
          </Label>
          {[
            ['lend', 'BANKS LEND'],
            ['invest', 'COMPANIES INVEST'],
            ['spend', 'CONSUMERS SPEND'],
            ['rise', 'ASSET PRICES RISE'],
          ].map(([word, label], i) => (
            <Sequence key={label} from={w(word) - at(528.4) - 4}>
              <PopIn>
                <Plate
                  x={470 + (i % 2) * 980}
                  y={330 + Math.floor(i / 2) * 160}
                  width={800}
                  height={120}
                  size={T.label}
                  tone="green"
                  fill={C.greenSoft}
                >
                  {label}
                </Plate>
              </PopIn>
            </Sequence>
          ))}
          <Sequence from={w('intelligent') - at(528.4) - 4}>
            <PopIn>
              <YolkHero slug="smug-arms-crossed" height={300} x={STAGE.cx} y={880} anchor="bottom" />
            </PopIn>
          </Sequence>
          <Sequence from={w('microphone') - at(528.4) - 8}>
            <PopIn>
              <Yolk slug="using-laptop" height={260} x={1480} y={880} anchor="bottom" />
              <Label x={1480} y={700} size={T.note} weight={800} tone="inkSoft" width={620} rotate={-3}>
                someone buys a podcast microphone
              </Label>
            </PopIn>
          </Sequence>
        </Sequence>

        {/* Then something breaks — hard cut to red. */}
        <Sequence from={w('breaks') - at(528.4) - 4}>
          <Shake amount={10} frames={30}>
            <YolkHero slug="bank-broken" height={420} x={STAGE.cx} y={640} anchor="center" />
          </Shake>
          <PopIn delay={8}>
            <Label x={STAGE.cx} y={870} size={T.big} weight={900} tone="red" caps width={1600} track={3}>
              then something breaks
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 9:02-9:18 the cascade ---- */}
      <Sequence from={at(542.2)}>
        {CASCADE.map(([word, label], i) => (
          <Sequence key={label} from={w(word) - at(542.2) - 3}>
            <SlideIn dy={0.7} distance={50}>
              <Plate
                x={490 + (i % 2) * 940
                }
                y={200 + Math.floor(i / 2) * 165}
                width={840}
                height={128}
                size={T.label}
                tone="red"
                fill={C.redSoft}
              >
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
        <Sequence from={wAfter('podcast', at(542.2)) - at(542.2) - 6}>
          <PopIn>
            <StockWindow id="market-crash-screen-1" x={STAGE.cx} y={800} width={520} height={230} frames={120} />
          </PopIn>
        </Sequence>
      </Sequence>
    </>
  );
};
