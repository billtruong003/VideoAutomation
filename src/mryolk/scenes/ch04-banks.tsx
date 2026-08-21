/**
 * ch04-banks.tsx — 2:30-3:32. Where a loan actually comes from.
 *
 * This is the section an explainer is most likely to get WRONG, and getting it right is
 * mostly a matter of what the animation refuses to show.
 *
 * The wrong version draws a bank conjuring money out of nothing and hands it over. It is
 * vivid, it is memorable, and it leaves the viewer believing something false. The accounting
 * is the correction: the loan and the deposit are created by the SAME act, one on each side of
 * the balance sheet, and they are equal. So the two entries land together, and a bracket
 * closes around them.
 *
 * The constraints get real screen time for the same reason. "Banks create money when they
 * lend" is the memorable half of the sentence and "not infinite money" is the half that stops
 * it being nonsense, so the limits are not a footnote here — they are six objects arriving one
 * after another while the narrator lists them.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockPlate } from '../components/Stock';
import { HeroWord, Label, Plate } from '../components/Text';
import { Arrow, BalanceSheet, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, Shake, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const LIMITS = [
  { word: 'capital', label: 'CAPITAL\nRULES' },
  { word: 'liquidity', label: 'LIQUIDITY\nREQUIREMENTS' },
  { word: 'funding', label: 'FUNDING\nCOSTS' },
  { word: 'regulation', label: 'REGULATION' },
  { word: 'risk', label: 'RISK' },
] as const;

export const Ch04BanksCreateMoney: React.FC = () => {
  const { at, w } = ctxFor(61, 79);

  return (
    <>
      {/* ---- 2:30-2:45 the cinematic version, which is wrong ---- */}
      <Sequence from={0} durationInFrames={at(165.4)}>
        <StockPlate id="bank-vault-1" readability="strong" frames={330} kenBurns={0.1} />
        <Sequence from={w('vault') - 4}>
          <PopIn>
            <YolkHero slug="at-the-vault" height={430} x={620} y={720} anchor="bottom" />
          </PopIn>
        </Sequence>
        <Sequence from={w('scoops') - 6}>
          <SlideIn dx={1} distance={120}>
            <Yolk slug="money-bag" height={250} x={1380} y={560} anchor="center" />
          </SlideIn>
        </Sequence>
        <Sequence from={w('cinematic') - 6}>
          <PopIn>
            <Plate x={1380} y={790} width={560} height={100} size={T.label} tone="ink">
              VERY CINEMATIC
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('McDuck') - 8}>
          <Pulse at={4} amount={0.16}>
            <Plate x={1380} y={790} width={620} height={100} size={T.label} tone="red">
              ALSO NOT WHAT HAPPENS
            </Plate>
          </Pulse>
        </Sequence>
      </Sequence>

      {/* ---- 2:45-3:05 the balance sheet ---- */}
      <Sequence from={at(165.2)} durationInFrames={at(185.6) - at(165.2)}>
        <Camera push={0.035} frames={at(185.6) - at(165.2)}>
          <Sequence from={w('Suppose') - at(165.2) - 4}>
            <PopIn>
              <Yolk slug="at-the-bank" height={330} x={300} y={760} anchor="bottom" />
            </PopIn>
          </Sequence>
          <Sequence from={w('approves') - at(165.2) - 6}>
            <PopIn>
              <Yolk slug="screen-loan-approved" height={200} x={300} y={230} anchor="center" />
            </PopIn>
          </Sequence>

          <BalanceSheet
            x={STAGE.cx}
            y={520}
            width={1180}
            title="THE BANK, AT THE MOMENT IT LENDS"
            delay={w('records') - at(165.2) - 8}
            rows={[
              {
                asset: 'YOUR LOAN  +$100,000',
                liability: 'YOUR DEPOSIT  +$100,000',
                delay: 0,
                tone: C.ink,
              },
            ]}
          />

          {/*
            The bracket. Drawn only after both entries exist, because the claim it makes is
            about the pair — that they are one act, not two.
          */}
          <Sequence from={w('liability') - at(165.2) - 4}>
            <Arrow
              from={{ x: 470, y: 690 }}
              to={{ x: 1450, y: 690 }}
              bow={70}
              delay={0}
              frames={22}
              color={C.violet}
              width={5}
              head={false}
              label="CREATED BY THE SAME ACT"
            />
          </Sequence>

          <Sequence from={w('lend') - at(165.2) - 6}>
            <FadeIn>
              <Label x={STAGE.cx} y={880} size={T.title} weight={900} tone="violet" caps width={1600} track={2}>
                banks create money when they lend
              </Label>
            </FadeIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 3:05-3:19 not infinite money ---- */}
      <Sequence from={at(185.4)} durationInFrames={at(199.4) - at(185.4)}>
        <Sequence durationInFrames={w('Lamborghini') - at(185.4) + 44}>
          <HeroWord y={220} delay={2} tone="red" size={86}>not infinite money</HeroWord>
        </Sequence>

        <Sequence from={w('Lamborghini') - at(185.4) - 10} durationInFrames={54}>
          <Shake amount={5} frames={26} delay={4}>
            <YolkHero slug="money-rain-rich" height={380} x={STAGE.cx} y={760} anchor="bottom" />
          </Shake>
        </Sequence>

        {/* The limits, arriving in time with the list being read. */}
        {LIMITS.map((l, i) => (
          <Sequence key={l.word} from={w(l.word) - at(185.4) - 4}>
            <PopIn>
              <Plate
                x={330 + i * 330}
                y={520}
                width={300}
                height={150}
                size={T.note}
                tone="blue"
                fill={C.blueSoft}
              >
                {l.label}
              </Plate>
            </PopIn>
          </Sequence>
        ))}
        <Sequence from={w('back') - at(185.4) - 10}>
          <PopIn>
            <Yolk slug="doc-past-due" height={210} x={STAGE.cx} y={790} anchor="center" />
            <Label x={STAGE.cx} y={905} size={T.note} weight={900} tone="red" caps width={700}>
              …and borrowers who don’t pay back
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 3:19-3:32 your money is someone else's debt ---- */}
      <Sequence from={at(199.2)}>
        <Camera push={0.04} frames={at(212.6) - at(199.2)}>
          <Sequence from={w('deposit') - at(199.2) - 6}>
            <Node at={{ x: 560, y: 400 }} label="YOUR DEPOSIT" sub="an asset, to you" width={420} height={130} tone={C.green} />
            <Yolk slug="thumbs-up-wink" height={220} x={560} y={720} anchor="bottom" />
          </Sequence>

          <Sequence from={w('balance') - at(199.2) - 6}>
            <Node at={{ x: 1400, y: 400 }} label="SOMEONE’S LIABILITY" sub="on another balance sheet" width={480} height={130} tone={C.red} />
            <Yolk slug="carrying-loan-bag" height={220} x={1400} y={720} anchor="bottom" />
            <Arrow
              from={{ x: 790, y: 400 }}
              to={{ x: 1150, y: 400 }}
              delay={8}
              frames={16}
              color={C.inkFaint}
              width={5}
              head={false}
            />
          </Sequence>

          <Sequence from={w('everywhere') - at(199.2) - 12}>
            <FadeIn>
              <Label x={STAGE.cx} y={880} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
                your money is connected to somebody else’s debt
              </Label>
            </FadeIn>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};
