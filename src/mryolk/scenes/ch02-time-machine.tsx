/**
 * ch02-time-machine.tsx — 0:47-1:34. The mortgage, and what it actually is.
 *
 * The whole chapter builds to one image: money travelling BACKWARD along a timeline, from a
 * future self to a present one. Everything before it is setup for that, so the visual budget
 * is spent accordingly — the house and the empty account are quick and plain, and the
 * timeline gets the space.
 *
 * The direction of travel is the thing to get right. It is very easy to draw this section as
 * "money goes from the bank to you", which is true and completely misses the point; what makes
 * a mortgage strange is that the money is coming from a person who does not exist yet. So the
 * token moves right-to-left, against the arrow of time, and the timeline is on screen while it
 * does.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { MoneyToken, Timeline } from '../components/Diagram';
import { Camera, FadeIn, Float, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

export const Ch02TimeMachine: React.FC = () => {
  const { at, w } = ctxFor(23, 39);

  return (
    <>
      {/* ---- 0:47-0:58 the house, and the account that cannot buy it ---- */}
      <Sequence from={0} durationInFrames={at(58.6)}>
        <Sequence from={w('house') - 4} durationInFrames={at(58.6)}>
          <PopIn>
            <YolkHero slug="loving-the-house" height={400} x={640} y={640} anchor="bottom" />
          </PopIn>
        </Sequence>

        <Sequence from={w('costs') - 2}>
          <Pulse at={3} amount={0.12}>
            <Plate x={1360} y={330} width={480} height={140} size={T.figure} tone="ink">
              $300,000
            </Plate>
          </Pulse>
        </Sequence>

        {/* The account arrives beside the price, so the gap between them is the joke. */}
        <Sequence from={w('account') - 6}>
          <SlideIn dx={1} distance={120}>
            <Yolk slug="account-balance-zero" height={260} x={1360} y={620} anchor="center" />
          </SlideIn>
          <Sequence from={w('not') - w('account') + 6}>
            <PopIn>
              <Label x={1360} y={800} size={T.label} weight={900} tone="red" caps width={620}>
                not $300,000
              </Label>
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 0:58-1:06 but you have a job ---- */}
      <Sequence from={at(58.4)} durationInFrames={at(66.4) - at(58.4)}>
        <PopIn delay={2}>
          <YolkHero slug="holding-cash-notes" height={400} x={560} y={700} anchor="bottom" />
        </PopIn>
        <Sequence from={w('job') - at(58.4) - 4}>
          <PopIn>
            <Yolk slug="doc-paycheck" height={230} x={1120} y={400} anchor="center" />
            <Label x={1120} y={560} size={T.note} weight={900} caps>a job</Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('decades') - at(58.4) - 4}>
          <PopIn>
            <Yolk slug="hourglass" height={230} x={1470} y={400} anchor="center" />
            <Label x={1470} y={560} size={T.note} weight={900} caps>several decades</Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 1:06-1:14 the time machine, drawn ---- */}
      <Sequence from={at(66.2)} durationInFrames={at(74.4) - at(66.2)}>
        <Camera push={0.045} frames={at(74.4) - at(66.2)}>
          <Timeline
            x={STAGE.cx}
            y={560}
            width={1420}
            delay={4}
            frames={26}
            caption="BORROWING AGAINST A PERSON WHO DOES NOT EXIST YET"
            ticks={[
              { at: 0.03, label: 'TODAY' },
              { at: 0.5, label: '2035', tone: C.inkFaint },
              { at: 0.97, label: '2047', tone: C.violet },
            ]}
          />

          <Sequence from={w('bank') - at(66.2) - 6}>
            <Yolk slug="at-the-bank" height={280} x={330} y={430} anchor="bottom" />
          </Sequence>
          <Sequence from={w('future', 1) - at(66.2) - 6}>
            <Float seed="futureself" amount={7}>
              <Yolk slug="meeting-future-self" height={230} x={1580} y={430} anchor="bottom" />
            </Float>
            <Label x={1580} y={148} size={T.note} weight={900} tone="violet" caps width={420} fit>
              future you
            </Label>
          </Sequence>

          {/*
            Right to left: the value moves from the future toward the present. That is the
            entire claim of the chapter, so it is the only thing moving in the frame.
          */}
          <Sequence from={w('gives') - at(66.2)}>
            <MoneyToken
              from={{ x: 1500, y: 500 }}
              to={{ x: 420, y: 500 }}
              bow={-120}
              delay={0}
              frames={46}
              repeat={3}
              gap={16}
              label="$"
              color={C.violet}
              size={62}
            />
          </Sequence>

          <Sequence from={w('back') - at(66.2) - 10}>
            <FadeIn>
              <Label x={STAGE.cx} y={760} size={T.label} weight={900} tone="inkSoft" caps width={1500}>
                20–30 years of repayments, the other way
              </Label>
            </FadeIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 1:14-1:26 that is a mortgage, and the conversation ---- */}
      <Sequence from={at(74.2)} durationInFrames={at(86.6) - at(74.2)}>
        <Sequence from={w('mortgage') - at(74.2) - 3} durationInFrames={at(78) - at(74.2)}>
          <PopIn>
            <YolkHero slug="doc-mortgage-contract" height={430} x={STAGE.cx} y={470} anchor="center" />
          </PopIn>
          <PopIn delay={8}>
            <Label x={STAGE.cx} y={790} size={T.big} weight={900} caps track={4}>a mortgage</Label>
          </PopIn>
        </Sequence>

        {/*
          Four lines of dialogue as four plates, each landing on its own line. Kept as speech
          rather than narration because the joke is that it is a negotiation nobody thinks
          about — seeing it written down as a conversation is what makes it land.
        */}
        <Sequence from={at(77.8)}>
          <Yolk slug="shrug-empty-hands" height={300} x={430} y={720} anchor="bottom" />
          <Yolk slug="at-the-bank" height={300} x={1490} y={720} anchor="bottom" />

          <Sequence from={w('money', 1) - at(77.8) - 10}>
            <PopIn>
              <Plate x={620} y={230} width={620} height={96} size={T.note} tone="ink">
                “I don’t have the money.”
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('Correct') - at(77.8) - 6}>
            <PopIn>
              <Plate x={1300} y={350} width={480} height={96} size={T.note} tone="blue">
                “Correct.”
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('probably') - at(77.8) - 16}>
            <PopIn>
              <Plate x={620} y={470} width={720} height={96} size={T.note} tone="violet">
                “But 2047 me probably will.”
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('enough') - at(77.8) - 8}>
            <PopIn>
              <Plate x={1300} y={590} width={520} height={96} size={T.note} tone="green">
                “Good enough.”
              </Plate>
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 1:26-1:34 the thesis of the chapter ---- */}
      <Sequence from={at(86.4)}>
        <Sequence durationInFrames={w('machine') - at(86.4) + 4}>
          <FadeIn delay={2}>
            <Label x={STAGE.cx} y={330} size={T.title} weight={900} tone="inkSoft" caps width={1600} track={2}>
              debt brings future income
            </Label>
            <Label x={STAGE.cx} y={410} size={T.title} weight={900} tone="ink" caps width={1600} track={2}>
              into the present
            </Label>
          </FadeIn>
        </Sequence>

        <Sequence from={w('machine') - at(86.4) - 8}>
          <Camera push={0.07} frames={90}>
            <HeroWord y={300} tone="violet" size={110}>a time machine for money</HeroWord>
            <PopIn delay={10}>
              <YolkHero slug="money-through-time-portal" height={420} x={STAGE.cx} y={640} anchor="center" />
            </PopIn>
          </Camera>
        </Sequence>
      </Sequence>
    </>
  );
};
