/**
 * ch06-bonds.tsx — 4:08-5:25. Government debt, and the rollover.
 *
 * The longest chapter, so it is built as four distinct visual worlds rather than one held
 * idea: the transaction, the crowd of buyers, the credit-card gag, and the rollover loop. A
 * seventy-seven second stretch in a single visual register is where a long-form video loses
 * people, and the fix is not faster cutting — it is changing what KIND of thing is on screen.
 *
 * The rollover is the payoff and gets the most machinery: bonds physically replacing each
 * other in the same spot, faster each time, until the joke arrives on top of a mechanism the
 * viewer has already understood.
 */

import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockPlate } from '../components/Stock';
import { Label, Plate } from '../components/Text';
import { MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const BUYERS = [
  { word: 'Banks', slug: 'bank-building', label: 'BANKS' },
  { word: 'Pension', slug: 'retirement-fund', label: 'PENSION FUNDS' },
  { word: 'Investment', slug: 'investor-with-flag', label: 'INVESTMENT FUNDS' },
  { word: 'Insurance', slug: 'insurance-company', label: 'INSURERS' },
  { word: 'Foreign', slug: 'government-building-worried', label: 'FOREIGN GOVERNMENTS' },
  { word: 'central', slug: 'safe-vault', label: 'CENTRAL BANKS' },
] as const;

export const Ch06GovernmentBonds: React.FC = () => {
  const { at, w } = ctxFor(91, 123);

  return (
    <>
      {/* ---- 4:08-4:22 the bond, and the transaction ---- */}
      <Sequence from={0} durationInFrames={at(262.4)}>
        <Sequence durationInFrames={w('IOU') - 4}>
          <StockPlate id="government-building-1" readability="strong" frames={200} kenBurns={0.08} />
        </Sequence>

        <Sequence from={w('bonds') - 6}>
          <PopIn>
            <YolkHero slug="government-issuing-bond" height={380} x={520} y={740} anchor="bottom" />
          </PopIn>
        </Sequence>

        <Sequence from={w('IOU') - 8}>
          <Camera push={0.05} frames={120}>
            <PopIn>
              <YolkHero slug="holding-government-iou" height={420} x={1330} y={720} anchor="bottom" />
            </PopIn>
            <PopIn delay={8}>
              <Label x={1330} y={220} size={T.big} weight={900} tone="blue" caps track={3} width={900}>
                a very official I.O.U.
              </Label>
            </PopIn>
          </Camera>
        </Sequence>
      </Sequence>

      {/* ---- 4:22-4:32 the queue of buyers ---- */}
      <Sequence from={at(262.2)} durationInFrames={at(272.2) - at(262.2)}>
        <Sequence from={0}>
          <Node at={{ x: STAGE.cx, y: 210 }} label="GOVERNMENT BONDS" width={520} height={96} tone={C.blue} />
        </Sequence>
        {BUYERS.map((b, i) => {
          const x = 280 + (i % 3) * 700;
          const y = 470 + Math.floor(i / 3) * 300;
          return (
            <Sequence key={b.label} from={w(b.word) - at(262.2) - 4}>
              <PopIn>
                <Yolk slug={b.slug} height={170} x={x} y={y} anchor="center" />
                <Label x={x} y={y + 128} size={T.note} weight={900} caps width={480}>{b.label}</Label>
              </PopIn>
              <MoneyToken
                from={{ x, y: y - 60 }}
                to={{ x: STAGE.cx, y: 260 }}
                bow={40}
                delay={8}
                frames={34}
                repeat={2}
                gap={12}
                size={32}
                label=""
                color={C.green}
              />
            </Sequence>
          );
        })}
      </Sequence>

      {/* ---- 4:32-4:49 among the safest assets ---- */}
      <Sequence from={at(272)} durationInFrames={at(289.4) - at(272)}>
        <PopIn delay={4}>
          <YolkHero slug="hugging-safe-bond" height={420} x={560} y={760} anchor="bottom" />
        </PopIn>
        <Sequence from={w('safest') - at(272) - 6}>
          <PopIn>
            <Label x={1330} y={280} size={T.title} weight={900} tone="green" caps width={950} track={2}>
              among the safest{'\n'}assets available
            </Label>
          </PopIn>
        </Sequence>
        {[
          ['store', 'STORE MONEY'],
          ['collateral', 'USED AS COLLATERAL'],
          ['rates', 'SET THE PRICE OF OTHER LOANS'],
        ].map(([word, label], i) => (
          <Sequence key={label} from={w(word) - at(272) - 4}>
            <SlideIn dx={1} distance={90}>
              <Plate x={1330} y={470 + i * 130} width={880} height={104} size={T.note} tone="blue" fill={C.blueSoft}>
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
      </Sequence>

      {/* ---- 4:49-5:03 the credit card bill gag ---- */}
      <Sequence from={at(289.2)} durationInFrames={at(303.4) - at(289.2)}>
        <Sequence from={w('hear') - at(289.2) - 4}>
          <PopIn>
            <YolkHero slug="government-bill-huge" height={470} x={560} y={800} anchor="bottom" />
          </PopIn>
        </Sequence>
        <Sequence from={w('imagines') - at(289.2) - 4}>
          <PopIn>
            <Label x={1320} y={200} size={T.title} weight={900} tone="inkSoft" caps width={950} fit>
              what your brain pictures
            </Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('trillion') - at(289.2) - 10}>
          <Pulse at={5} amount={0.1}>
            <Plate x={1320} y={370} width={900} height={170} size={T.figure} tone="red" sub="AMOUNT DUE">
              $34,000,000,000,000
            </Plate>
          </Pulse>
        </Sequence>
        <Sequence from={w('Minimum') - at(289.2) - 4}>
          <PopIn>
            <Plate x={1320} y={590} width={900} height={140} size={T.label} tone="ink" sub="MINIMUM PAYMENT">
              YOUR ENTIRE COUNTRY
            </Plate>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 5:03-5:11 but governments are not households ---- */}
      <Sequence from={at(303.2)} durationInFrames={at(311.4) - at(303.2)}>
        <Label x={560} y={230} size={T.title} weight={900} tone="ink" caps width={760}>a household</Label>
        <Label x={1360} y={230} size={T.title} weight={900} tone="blue" caps width={760}>a government</Label>
        <Sequence from={w('cannot') - at(303.2) - 4}>
          <PopIn>
            <Yolk slug="cant-refinance" height={330} x={560} y={720} anchor="bottom" />
            <Label x={560} y={810} size={T.note} weight={900} tone="red" caps width={700}>
              cannot refinance forever
            </Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('frequently') - at(303.2) - 4}>
          <PopIn>
            <Yolk slug="rollover-old-iou-new-iou" height={330} x={1360} y={720} anchor="bottom" />
            <Label x={1360} y={810} size={T.note} weight={900} tone="green" caps width={700}>
              frequently does
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 5:11-5:25 rolling over, and next Tuesday ---- */}
      <Sequence from={at(311.2)}>
        <Camera push={0.03} frames={at(325.6) - at(311.2)}>
          <RolloverStack
            matures={[
              w('matures', 1) - at(311.2),
              w('matures', 2) - at(311.2),
              w('so') - at(311.2),
            ]}
          />

          <Sequence from={w('rolling') - at(311.2) - 6}>
            <FadeIn>
              <Label x={STAGE.cx} y={200} size={T.big} weight={900} tone="violet" caps track={3} width={1600}>
                rolling over debt
              </Label>
            </FadeIn>
          </Sequence>

          <Sequence from={w('Basically') - at(311.2) - 4}>
            <PopIn>
              <Plate x={STAGE.cx} y={830} width={760} height={110} size={T.label} tone="ink">
                “I’ll pay you Tuesday.”
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('Tuesday', 3) - at(311.2) - 8}>
            <Pulse at={5} amount={0.12}>
              <Plate x={STAGE.cx} y={830} width={1000} height={110} size={T.label} tone="red">
                “How do you feel about NEXT Tuesday?”
              </Plate>
            </Pulse>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};

/**
 * Bonds replacing bonds in the same place, each cycle faster than the last.
 *
 * The acceleration is doing the argument: the point of a rollover is not that it happens once
 * but that it never stops, and three identical-tempo swaps would read as three events rather
 * than as a treadmill.
 */
const RolloverStack: React.FC<{ matures: number[] }> = ({ matures }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {matures.map((m, i) => {
        const life = interpolate(frame, [m - 26, m], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const gone = interpolate(frame, [m, m + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (frame < m - 30) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: (1 - gone) * life,
              transform: `translateX(${gone * -420}px) rotate(${gone * -18}deg)`,
            }}
          >
            <Yolk slug="doc-government-debt" height={300} x={STAGE.cx} y={500} anchor="center" />
            <Label x={STAGE.cx} y={690} size={T.note} weight={900} caps width={620}>
              {`BOND ${i + 1}`}
            </Label>
          </div>
        );
      })}
      {matures.map((m, i) => (
        <Sequence key={`n${i}`} from={m} durationInFrames={20}>
          <SlideIn dx={1} distance={200}>
            <Label x={STAGE.cx + 480} y={500} size={T.label} weight={900} tone="green" caps width={620}>
              new bond
            </Label>
          </SlideIn>
        </Sequence>
      ))}
    </>
  );
};
