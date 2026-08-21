/**
 * ch10-trust.tsx — 7:46-8:25. The thing the whole machine actually rests on.
 *
 * A deliberate drop in visual energy. Everything before this has been accumulating objects,
 * numbers and gags, and the narration here changes register — it stops explaining a mechanism
 * and names a precondition. Matching that with more of the same density would flatten it.
 *
 * So: one word on white, then five questions arriving in a column with nothing else on screen,
 * then a three-state gauge. No stock, no props, almost no character. The restraint IS the
 * transition, and it buys back the attention the crisis section is about to spend.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { Arrow } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const QUESTIONS = [
  { word: 'job', text: 'will this person still have a job?' },
  { word: 'company', text: 'will this company make money?' },
  { word: 'taxes', text: 'will this government still collect taxes?' },
  { word: 'property', text: 'will this property stay valuable?' },
  { word: 'factory', text: 'will this factory actually work?' },
] as const;

export const Ch10Trust: React.FC = () => {
  const { at, w, wAfter } = ctxFor(168, 181);

  return (
    <>
      {/* ---- 7:46-7:56 the eliminations, then the word ---- */}
      <Sequence from={0} durationInFrames={at(474.4)}>
        {[
          ['debt', 'NOT DEBT'],
          ['money', 'NOT MONEY'],
          ['leverage', 'NOT EVEN LEVERAGE'],
        ].map(([word, label], i) => (
          <Sequence key={label} from={w(word) - 4} durationInFrames={Math.max(1, w('Trust') - w(word) + 6)}>
            <FadeIn frames={8}>
              <Label
                x={STAGE.cx}
                y={300 + i * 110}
                size={T.title}
                weight={900}
                tone="inkSoft"
                caps
                width={1600}
                track={2}
              >
                {label}
              </Label>
            </FadeIn>
          </Sequence>
        ))}

        <Sequence from={w('Trust') - 6}>
          <Camera push={0.06} frames={110}>
            <HeroWord y={520} tone="ink" size={210}>trust</HeroWord>
          </Camera>
        </Sequence>
      </Sequence>

      {/* ---- 7:56-8:11 a promise is a prediction ---- */}
      <Sequence from={at(474.2)} durationInFrames={at(491.4) - at(474.2)}>
        <Sequence durationInFrames={Math.max(1, w('job') - at(474.2) - 6)}>
          <Label x={STAGE.cx} y={300} size={T.big} weight={900} tone="ink" caps width={1750} track={2} fit>
            debt is a promise about the future
          </Label>
          <FadeIn delay={14}>
            <Label x={STAGE.cx} y={410} size={T.title} weight={800} tone="inkSoft" width={1500}>
              so lending is making a prediction
            </Label>
          </FadeIn>
        </Sequence>

        {/*
          Five questions in a column, each landing on its own noun and all of them staying.
          The pile is the point: this is the amount of guessing inside every ordinary loan.
        */}
        {QUESTIONS.map((q, i) => (
          <Sequence key={q.word} from={w(q.word) - at(474.2) - 4}>
            <SlideIn dx={-0.4} dy={0.5} distance={70}>
              <Label
                x={STAGE.cx}
                y={230 + i * 118}
                size={T.title}
                weight={800}
                tone={i === 4 ? 'violet' : 'ink'}
                width={1700}
              >
                {q.text}
              </Label>
            </SlideIn>
          </Sequence>
        ))}
      </Sequence>

      {/* ---- 8:11-8:25 the gauge: yes, maybe, absolutely not ---- */}
      <Sequence from={at(491.2)}>
        <Label x={STAGE.cx} y={160} size={T.title} weight={900} tone="inkSoft" caps width={1700} track={2}>
          the answer sets the price
        </Label>

        <Sequence from={w('yes') - at(491.2) - 4}>
          <PopIn>
            <Plate x={430} y={420} width={520} height={180} size={T.big} tone="green" fill={C.greenSoft} sub="BORROWING IS EASY">
              YES
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('maybe') - at(491.2) - 4}>
          <PopIn>
            <Plate x={960} y={420} width={520} height={180} size={T.big} tone="ink" sub="LENDERS DEMAND MORE">
              MAYBE
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={wAfter('not', at(491.2)) - at(491.2) - 4}>
          <PopIn>
            <Plate x={1490} y={420} width={520} height={180} size={T.label} tone="red" fill={C.redSoft} sub="THE MONEY DISAPPEARS">
              ABSOLUTELY NOT
            </Plate>
          </PopIn>
        </Sequence>

        {/* An interest-rate axis running under the three states. */}
        <Sequence from={w('maybe') - at(491.2)}>
          <Arrow
            from={{ x: 300, y: 620 }}
            to={{ x: 1620, y: 620 }}
            delay={4}
            frames={26}
            color={C.inkFaint}
            width={5}
            label="INTEREST RATE"
          />
        </Sequence>

        <Sequence from={w('disappears') - at(491.2) - 6}>
          <Pulse at={4} amount={0.12}>
            <Yolk slug="credit-disappears" height={300} x={STAGE.cx} y={900} anchor="bottom" />
          </Pulse>
        </Sequence>
      </Sequence>
    </>
  );
};
