/**
 * ch03-waiting.tsx — 1:34-2:30. Everyone borrows, and why waiting costs so much.
 *
 * This is the chapter that most needs real footage, and the only one where stock does the
 * heavy lifting for a sustained stretch. "Businesses borrow to build factories. Airlines
 * borrow to buy planes. Farmers borrow to buy equipment. Cities borrow to build roads." is
 * four claims about the physical world in eight seconds, and a doodle factory cannot convey
 * that these are enormous, expensive, real things. Four windows of actual footage can, and the
 * cut lands on each noun.
 *
 * Then it goes straight back to drawing for the counterfactual, because the twenty-year wait
 * is a comparison between two hypotheticals and there is no footage of a factory that was
 * never built.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockWindow } from '../components/Stock';
import { HeroWord, Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Timeline } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** The four borrowers, each with the drawing and the footage that proves it is real. */
const BORROWERS = [
  { word: 'factories', stock: 'factory-industrial-1', label: 'FACTORIES' },
  { word: 'planes', stock: 'airliner-airport-1', label: 'PLANES' },
  { word: 'equipment', stock: 'farm-tractor-1', label: 'EQUIPMENT' },
  { word: 'roads', stock: 'highway-interchange-1', label: 'ROADS' },
] as const;

export const Ch03WaitingIsExpensive: React.FC = () => {
  const { at, w } = ctxFor(40, 60);

  return (
    <>
      {/* ---- 1:34-1:51 four real things, bought with borrowed money ---- */}
      <Sequence from={0} durationInFrames={at(111.8)}>
        {BORROWERS.map((b, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 560 + col * 800;
          const y = 300 + row * 420;
          return (
            <Sequence key={b.word} from={w(b.word) - 6} name={b.label}>
              <SlideIn dy={0.6} distance={70}>
                <StockWindow
                  id={b.stock}
                  x={x}
                  y={y}
                  width={700}
                  height={370}
                  frames={300}
                  label={b.label}
                />
              </SlideIn>
            </Sequence>
          );
        })}
      </Sequence>

      {/* ---- 1:42-1:51 governments, over the whole grid ---- */}
      <Sequence from={w('Governments') - 6} durationInFrames={at(111.8) - w('Governments') + 6}>
        <FadeIn>
          <div style={{
            position: 'absolute', inset: 0, background: C.paper, opacity: 1,
          }}
          />
        </FadeIn>
        <PopIn delay={6}>
          <YolkHero slug="government-issuing-bond" height={400} x={620} y={700} anchor="bottom" />
        </PopIn>
        {[
          ['infrastructure', 'INFRASTRUCTURE'],
          ['wars', 'WARS'],
          ['recessions', 'RECESSIONS'],
        ].map(([word, label], i) => (
          <Sequence key={label} from={w(word) - w('Governments') + 6}>
            <SlideIn dx={1} distance={90}>
              <Plate x={1420} y={300 + i * 130} width={620} height={100} size={T.label} tone="blue">
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
      </Sequence>

      {/* ---- 1:51-2:16 the twenty-year wait ---- */}
      <Sequence from={at(111.6)} durationInFrames={at(136.6) - at(111.6)}>
        <HeroWord y={168} delay={2} tone="red" size={72}>waiting is expensive</HeroWord>

        <Sequence from={w('factory', 1) - at(111.6) - 4}>
          <PopIn>
            <Yolk slug="factory-smoking" height={210} x={300} y={300} anchor="center" />
            <Plate x={300} y={452} width={430} height={90} size={T.label} tone="ink">
              $100,000,000
            </Plate>
          </PopIn>
        </Sequence>

        <Sequence from={w('saving') - at(111.6) - 6}>
          <Timeline
            x={1180}
            y={392}
            width={1200}
            delay={0}
            frames={30}
            caption="WITHOUT BORROWING"
            ticks={[
              { at: 0.0, label: 'YEAR 1' },
              { at: 0.24, label: 'YEAR 5' },
              { at: 0.62, label: 'YEAR 12' },
              { at: 1.0, label: 'YEAR 20', tone: C.green },
            ]}
          />
        </Sequence>

        {/*
          Each year gets its own object beneath the tick. The point of the run is that nothing
          changes for a very long time, so three of the four are variations on "still nothing"
          and only the last one is the factory.
        */}
        <Sequence from={w('one') - at(111.6) - 2}>
          <PopIn><Label x={520} y={640} size={T.note} weight={900} tone="inkSoft" caps width={300}>no factory</Label></PopIn>
        </Sequence>
        <Sequence from={w('five') - at(111.6) - 2}>
          <PopIn><Label x={810} y={640} size={T.note} weight={900} caps width={300}>still none</Label></PopIn>
        </Sequence>
        <Sequence from={w('twelve') - at(111.6) - 2}>
          <PopIn>
            <Yolk slug="spreadsheet" height={150} x={1180} y={660} anchor="center" />
            <Label x={1180} y={770} size={T.note} weight={900} caps width={420}>impressive spreadsheet</Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('twenty') - at(111.6) - 2}>
          <Pulse at={4} amount={0.14}>
            <Yolk slug="new-factory-sparkle" height={220} x={1620} y={690} anchor="center" />
          </Pulse>
        </Sequence>

        {/* The competitor gag: it arrives over the top and immediately takes the frame. */}
        <Sequence from={w('competitor') - at(111.6) - 6}>
          <FadeIn frames={8}>
            <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
          </FadeIn>
          <PopIn delay={4}>
            <YolkHero slug="smug-sunglasses" height={400} x={620} y={700} anchor="bottom" />
          </PopIn>
          <SlideIn delay={10} dx={1} distance={120}>
            <Yolk slug="factories-row" height={230} x={1350} y={360} anchor="center" />
          </SlideIn>
          <Sequence from={w('Legacy') - w('competitor') - 4}>
            <PopIn>
              <Plate x={1350} y={640} width={760} height={110} size={T.label} tone="red">
                LEGACY OPERATIONS DIVISION
              </Plate>
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 2:16-2:30 with debt, it all happens today ---- */}
      <Sequence from={at(136.4)}>
        <Camera push={0.04} frames={at(150.6) - at(136.4)}>
          <HeroWord y={150} delay={2} tone="green" size={66}>so instead, you borrow</HeroWord>

          <Sequence from={w('borrow') - at(136.4)}>
            <PopIn>
              <Yolk slug="doc-business-loan" height={230} x={300} y={470} anchor="center" />
            </PopIn>
          </Sequence>

          {[
            ['build', 'new-factory-sparkle', 'BUILT TODAY', 700],
            ['produces', 'factories-row', 'PRODUCING TODAY', 1120],
            ['generates', 'money-bag', 'REVENUE TODAY', 1540],
          ].map(([word, slug, label, x], i) => (
            <Sequence key={label as string} from={w(word as string) - at(136.4) - 4}>
              <SlideIn dx={-1} distance={80}>
                <Yolk slug={slug as string} height={200} x={x as number} y={470} anchor="center" />
                <Label x={x as number} y={620} size={T.note} weight={900} tone="green" caps width={420}>
                  {label as string}
                </Label>
              </SlideIn>
              {i < 2 && (
                <Arrow
                  from={{ x: (x as number) + 150, y: 470 }}
                  to={{ x: (x as number) + 270, y: 470 }}
                  delay={10}
                  frames={12}
                  color={C.inkFaint}
                  width={5}
                />
              )}
            </Sequence>
          ))}

          {/* Revenue loops back to repay the loan — the closing of the circle. */}
          <Sequence from={w('repays') - at(136.4) - 6}>
            <MoneyToken
              from={{ x: 1540, y: 560 }}
              to={{ x: 300, y: 560 }}
              bow={190}
              frames={40}
              repeat={2}
              gap={14}
              color={C.green}
            />
            <FadeIn delay={16}>
              <Label x={STAGE.cx} y={830} size={T.label} weight={900} tone="green" caps width={1500}>
                future revenue repays the loan
              </Label>
            </FadeIn>
          </Sequence>

          <Sequence from={w('investment') - at(136.4) - 6}>
            <FadeIn frames={10}>
              <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
            </FadeIn>
            <HeroWord y={480} delay={4} tone="ink" size={82}>
              debt turns future productivity{'\n'}into present investment
            </HeroWord>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};
