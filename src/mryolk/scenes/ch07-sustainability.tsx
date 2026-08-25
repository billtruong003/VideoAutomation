/**
 * ch07-sustainability.tsx — 5:25-6:26. Not "does it have debt" but "can it carry it".
 *
 * A reasoning section, so the visuals slow down and get plainer. The two-people comparison is
 * the whole chapter: identical debt, wildly different income, and the frame has to make the
 * INCOME the thing that differs, not the debt. So both debts land first, identically, and only
 * then do the incomes arrive — if the incomes appeared alongside, the eye would read two
 * different situations rather than one variable changing.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const FACTORS = [
  ['economy', 'SIZE OF THE ECONOMY'],
  ['revenue', 'TAX REVENUE'],
  ['rates', 'INTEREST RATES'],
  ['growth', 'ECONOMIC GROWTH'],
  ['currency', 'CURRENCY'],
  ['owns', 'WHO OWNS IT'],
] as const;

export const Ch07CanItHandleIt: React.FC = () => {
  const { at, w } = ctxFor(124, 139);

  return (
    <>
      {/* ---- 5:25-5:41 government debt is not harmless ---- */}
      <Sequence from={0} durationInFrames={at(341.4)}>
        <FadeIn delay={2}>
          <Label x={STAGE.cx} y={160} size={T.title} weight={900} tone="ink" caps width={1700} track={2} fit>
            government debt is not harmless
          </Label>
        </FadeIn>
        <Sequence from={w('confidence') - 6}>
          <PopIn>
            <YolkHero slug="skeptical-doubt" height={360} x={430} y={740} anchor="bottom" />
          </PopIn>
        </Sequence>
        {[
          ['rise', 'INTEREST RATES RISE'],
          ['budgets', 'BUDGETS GET EATEN'],
          ['dangerous', 'TOO MUCH IS DANGEROUS'],
        ].map(([word, label], i) => (
          <Sequence key={label} from={w(word) - 4}>
            <SlideIn dx={1} distance={100}>
              <Plate x={1290} y={280 + i * 150} width={940} height={116} size={T.label} tone="red" fill={C.redSoft}>
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
        <Sequence from={w('control') - 8}>
          <FadeIn>
            <Label x={1290} y={790} size={T.note} weight={800} tone="inkSoft" width={1000}>
              harsher still if the debt is in a currency you do not control
            </Label>
          </FadeIn>
        </Sequence>
      </Sequence>

      {/* ---- 5:41-5:51 the better question ---- */}
      <Sequence from={at(341.2)} durationInFrames={at(351.4) - at(341.2)}>
        <Sequence durationInFrames={Math.max(1, w('better') - at(341.2))}>
          <Label x={STAGE.cx} y={400} size={T.title} weight={900} tone="inkSoft" caps width={1700} track={2}>
            not: does this country have debt?
          </Label>
          <FadeIn delay={20}>
            <Label x={STAGE.cx} y={490} size={T.note} weight={800} tone="inkSoft" width={1400}>
              almost all modern countries do
            </Label>
          </FadeIn>
        </Sequence>
        <Sequence from={w('better') - at(341.2) - 4}>
          <HeroWord y={470} tone="green" size={92}>can this country handle its debt?</HeroWord>
        </Sequence>
      </Sequence>

      {/* ---- 5:51-6:05 person A and person B ---- */}
      <Sequence from={at(351.2)} durationInFrames={at(365.4) - at(351.2)}>
        <Camera push={0.03} frames={at(365.4) - at(351.2)}>
          <PopIn delay={2}>
            <Yolk slug="neutral-small-smile" height={280} x={520} y={560} anchor="bottom" />
          </PopIn>
          <PopIn delay={8}>
            <Yolk slug="worried-sweat" height={280} x={1400} y={560} anchor="bottom" />
          </PopIn>
          <Label x={520} y={200} size={T.title} weight={900} caps width={600}>person a</Label>
          <Label x={1400} y={200} size={T.title} weight={900} caps width={600}>person b</Label>

          {/* Identical debts first — the constant. */}
          <Sequence from={w('owes', 1) - at(351.2) - 4}>
            <PopIn>
              <Plate x={520} y={680} width={520} height={110} size={T.label} tone="red" sub="OWES">$10,000</Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('owes', 2) - at(351.2) - 4}>
            <PopIn>
              <Plate x={1400} y={680} width={520} height={110} size={T.label} tone="red" sub="OWES">$10,000</Plate>
            </PopIn>
          </Sequence>

          {/* Then the incomes — the variable. */}
          <Sequence from={w('earns', 1) - at(351.2) - 4}>
            <PopIn>
              <Plate x={520} y={830} width={520} height={110} size={T.label} tone="green" sub="EARNS / YEAR">$200,000</Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('earns', 2) - at(351.2) - 4}>
            <PopIn>
              <Plate x={1400} y={830} width={520} height={110} size={T.label} tone="red" sub="EARNS / YEAR">$12,000</Plate>
            </PopIn>
          </Sequence>

          <Sequence from={w('panic') - at(351.2) - 8}>
            <Pulse at={4} amount={0.1}>
              <Label x={STAGE.cx} y={330} size={T.label} weight={900} tone="violet" caps width={800}>
                {'same debt.\nvery different panic.'}
              </Label>
            </Pulse>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 6:05-6:26 what actually matters ---- */}
      <Sequence from={at(365.2)}>
        <Label x={STAGE.cx} y={170} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
          the raw number tells you almost nothing
        </Label>
        {FACTORS.map(([word, label], i) => (
          <Sequence key={label} from={w(word) - at(365.2) - 4}>
            <PopIn>
              <Plate
                x={480 + (i % 3) * 480}
                y={340 + Math.floor(i / 3) * 150}
                width={430}
                height={116}
                size={T.note}
                tone="blue"
                fill={C.blueSoft}
              >
                {label}
              </Plate>
            </PopIn>
          </Sequence>
        ))}
        <Sequence from={w('used') - at(365.2) - 10}>
          <Pulse at={5} amount={0.1}>
            <Plate x={STAGE.cx} y={700} width={1180} height={140} size={T.label} tone="violet">
              …AND MOST OF ALL: WHAT THE MONEY WAS USED FOR
            </Plate>
          </Pulse>
          <PopIn delay={12}>
            <Yolk slug="confused-clipboard" height={210} x={STAGE.cx} y={880} anchor="bottom" />
          </PopIn>
        </Sequence>
      </Sequence>
    </>
  );
};
