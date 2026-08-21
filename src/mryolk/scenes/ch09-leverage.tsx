/**
 * ch09-leverage.tsx — 6:50-7:46. Ten dollars, ninety borrowed, and where it goes.
 *
 * The most numerically precise chapter in the film, and the one where a vague visual would do
 * the most damage. Leverage is not "risky" in the abstract; it is a specific piece of
 * arithmetic in which a 10% move destroys 100% of your money, and the viewer has to be able to
 * follow the subtraction.
 *
 * So the numbers stay in FIXED positions for the whole chapter. YOUR MONEY is always in the
 * same place, BORROWED is always in the same place, TOTAL BET is always in the same place.
 * When the loss arrives, the viewer is not asked to find the relevant figure — they are
 * already looking at it, and they watch it go to zero.
 *
 * Both directions get the same layout, deliberately. Identical framing for the gain and the
 * loss is what makes the asymmetry visible: the upside changes one number, the downside
 * empties one and leaves the other standing.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockWindow } from '../components/Stock';
import { Figure, HeroWord, Label, Plate } from '../components/Text';
import { Camera, PopIn, Pulse, Shake, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** Fixed columns. Nothing in this chapter moves horizontally. */
const COL = { you: 430, borrowed: 960, bet: 1490 } as const;
const ROW = { label: 300, figure: 420 } as const;

export const Ch09Leverage: React.FC = () => {
  const { at, w } = ctxFor(144, 167);

  return (
    <>
      {/* ---- 6:50-7:03 the unlevered version ---- */}
      <Sequence from={0} durationInFrames={at(423.4)}>
        <Label x={STAGE.cx} y={170} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
          borrowed money makes a bigger bet
        </Label>

        <Sequence from={w('ten', 1) - 4}>
          <PopIn>
            <Plate x={620} y={430} width={480} height={150} size={T.figure} tone="ink" sub="YOU HAVE">
              $10
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('percent', 1) - 4}>
          <PopIn>
            <Plate x={1300} y={430} width={480} height={150} size={T.figure} tone="green" sub="IT RISES">
              +10%
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('dollar') - 4}>
          <PopIn>
            <Plate x={960} y={650} width={520} height={140} size={T.figure} tone="green" sub="YOU MAKE">
              +$1
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('coffee') - 8}>
          <PopIn>
            <Yolk slug="small-coin-stack" height={230} x={960} y={890} anchor="bottom" />
            <Label x={1420} y={840} size={T.note} weight={800} tone="inkSoft" width={700} rotate={-4}>
              half a coffee
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 7:03-7:16 the levered version, going up ---- */}
      <Sequence from={at(423.2)} durationInFrames={at(436.4) - at(423.2)}>
        <Camera push={0.03} frames={at(436.4) - at(423.2)}>
          <Label x={COL.you} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>your money</Label>
          <Label x={COL.borrowed} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>borrowed</Label>
          <Label x={COL.bet} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>total bet</Label>

          <Figure x={COL.you} y={ROW.figure} to={10} prefix="$" delay={2} size={92} tone="ink" />
          <Sequence from={w('ninety', 1) - at(423.2) - 4}>
            <Figure x={COL.borrowed} y={ROW.figure} to={90} prefix="+$" delay={0} size={92} tone="violet" />
          </Sequence>
          <Sequence from={w('hundred', 1) - at(423.2) - 4}>
            <Figure x={COL.bet} y={ROW.figure} to={100} prefix="$" delay={0} size={92} tone="ink" />
          </Sequence>

          <Sequence from={w('rises') - at(423.2) - 4}>
            <PopIn>
              <Plate x={COL.bet} y={580} width={420} height={116} size={T.label} tone="green">+10%</Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('ten', 5) - at(423.2) - 4}>
            <Pulse at={4} amount={0.14}>
              <Plate x={COL.you} y={580} width={420} height={116} size={T.label} tone="green">+$10</Plate>
            </Pulse>
          </Sequence>
          <Sequence from={w('doubled') - at(423.2) - 6}>
            <PopIn>
              <Label x={STAGE.cx} y={720} size={T.title} weight={900} tone="green" caps width={1600} track={2}>
                you just doubled your money
              </Label>
            </PopIn>
            <PopIn delay={8}>
              <Yolk slug="growth-arrow-celebrate" height={230} x={STAGE.cx} y={900} anchor="bottom" />
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 7:16-7:24 the smug interlude ---- */}
      <Sequence from={at(436.2)} durationInFrames={at(444.4) - at(436.2)}>
        <PopIn delay={2}>
          <YolkHero slug="smug-sunglasses" height={400} x={520} y={780} anchor="bottom" />
        </PopIn>
        <Sequence from={w('CNBC') - at(436.2) - 4}>
          <SlideIn dx={1} distance={110}>
            <Plate x={1330} y={260} width={860} height={110} size={T.label} tone="ink">
              CNBC WANTS AN INTERVIEW
            </Plate>
          </SlideIn>
        </Sequence>
        <Sequence from={w('LinkedIn') - at(436.2) - 4}>
          <SlideIn dx={1} distance={110}>
            <Plate x={1330} y={420} width={860} height={130} size={T.note} tone="blue" fill={C.blueSoft}>
              “INVESTOR · VISIONARY · THOUGHT LEADER”
            </Plate>
          </SlideIn>
        </Sequence>
        <Sequence from={w('yachts') - at(436.2) - 6}>
          <SlideIn dx={1} distance={110}>
            <StockWindow id="luxury-yacht-2" x={1330} y={650} width={720} height={300} frames={140} label="RESEARCHING YACHTS" />
          </SlideIn>
        </Sequence>
      </Sequence>

      {/* ---- 7:24-7:38 and then it goes the other way ---- */}
      <Sequence from={at(444.2)} durationInFrames={at(458.4) - at(444.2)}>
        <Camera push={0.045} frames={at(458.4) - at(444.2)}>
          {/* Same three columns, same places. Only the outcome differs. */}
          <Label x={COL.you} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>your money</Label>
          <Label x={COL.borrowed} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>borrowed</Label>
          <Label x={COL.bet} y={ROW.label} size={T.note} weight={900} tone="inkSoft" caps width={420}>total bet</Label>
          <Figure x={COL.borrowed} y={ROW.figure} to={90} prefix="$" delay={0} frames={1} size={92} tone="violet" />
          <Figure x={COL.bet} y={ROW.figure} to={100} prefix="$" delay={0} frames={1} size={92} tone="ink" />

          <Sequence durationInFrames={Math.max(1, w('lose') - at(444.2) - 2)}>
            <Figure x={COL.you} y={ROW.figure} to={10} prefix="$" delay={0} frames={1} size={92} tone="ink" />
          </Sequence>

          <Sequence from={w('falls') - at(444.2) - 4}>
            <Pulse at={3} amount={0.14}>
              <Plate x={COL.bet} y={580} width={420} height={116} size={T.label} tone="red">−10%</Plate>
            </Pulse>
          </Sequence>

          {/* The equity going to zero is the single most important animation in the chapter. */}
          <Sequence from={w('lose') - at(444.2) - 2}>
            <Figure x={COL.you} y={ROW.figure} from={10} to={0} prefix="$" delay={0} frames={26} size={92} tone="red" />
          </Sequence>
          <Sequence from={w('gone') - at(444.2) - 4}>
            <Shake amount={6} frames={26}>
              <Plate x={COL.you} y={580} width={480} height={116} size={T.label} tone="red">WIPED OUT</Plate>
            </Shake>
          </Sequence>

          <Sequence from={w('ninety', 2) - at(444.2) - 6}>
            <PopIn>
              <Plate x={COL.borrowed} y={580} width={520} height={140} size={T.label} tone="violet" sub="THE LENDER STILL WANTS">
                $90
              </Plate>
            </PopIn>
          </Sequence>

          <Sequence from={w('premature') - at(444.2) - 8}>
            <PopIn>
              <Yolk slug="collapsed-defeated" height={200} x={340} y={905} anchor="bottom" />
              <Label x={1080} y={790} size={T.label} weight={900} tone="red" caps width={1300} fit>
                the yacht research feels premature
              </Label>
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 7:38-7:46 what leverage is ---- */}
      <Sequence from={at(458.2)}>
        <HeroWord y={380} delay={2} tone="ink" size={92}>leverage magnifies success</HeroWord>
        <Sequence from={w('stupidity') - at(458.2) - 8}>
          <HeroWord y={520} tone="red" size={92}>and it magnifies stupidity</HeroWord>
          <PopIn delay={10}>
            <Yolk slug="crash-arrow-panic" height={280} x={STAGE.cx} y={860} anchor="bottom" />
          </PopIn>
        </Sequence>
      </Sequence>
    </>
  );
};
