/**
 * ch13-no-debt.tsx — 10:17-11:19. The counterfactual, and the bridge.
 *
 * Built as a single sustained column of consequences, because that is what the narration is:
 * five things that get worse, stacked, until the weight of the list is itself the argument.
 * Cutting away between them would let each one be considered separately, which is exactly the
 * wrong reading — no single item on the list is decisive, and the pile is.
 *
 * The bridge at the end is the film's most important diagram after the network, and it earns
 * the whole chapter: two groups who cannot reach each other, and credit as the span between
 * them. It is drawn last, alone, with everything else cleared away.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const CONSEQUENCES = [
  { word: 'longer', label: 'FACTORIES TAKE LONGER', slug: 'construction-site' },
  { word: 'expand', label: 'NEW BUSINESSES CANNOT EXPAND', slug: 'closed-door-rejected' },
  { word: 'taxation', label: 'INFRASTRUCTURE NEEDS TAX NOW', slug: 'bridge-and-road' },
  { word: 'harder', label: 'BUYING A HOUSE GETS HARDER', slug: 'house' },
  { word: 'powerful', label: 'THE ALREADY-RICH GET STRONGER', slug: 'money-rain-rich' },
] as const;

export const Ch13WhyNotRemoveIt: React.FC = () => {
  const { at, w } = ctxFor(210, 222);

  return (
    <>
      {/* ---- 10:17-10:31 so why not get rid of it ---- */}
      <Sequence from={0} durationInFrames={at(631.4)}>
        <Sequence from={w('destroy') - 6}>
          <PopIn>
            <YolkHero slug="confused-clipboard" height={380} x={470} y={760} anchor="bottom" />
          </PopIn>
          {['BANKS', 'COMPANIES', 'ECONOMIES', 'RETIREMENT ACCOUNTS'].map((label, i) => (
            <SlideIn key={label} delay={8 + i * 6} dx={1} distance={90}>
              <Plate x={1290} y={230 + i * 128} width={840} height={100} size={T.label} tone="red" fill={C.redSoft}>
                {label}
              </Plate>
            </SlideIn>
          ))}
        </Sequence>
        <Sequence from={w('uncle') - 4}>
          <PopIn>
            <Label x={1290} y={800} size={T.note} weight={800} tone="inkSoft" width={900} rotate={-2}>
              …and occasionally your uncle’s property empire
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 10:28-10:56 the world without it ---- */}
      <Sequence from={at(631.2)} durationInFrames={at(665.2) - at(631.2)}>
        <Label x={STAGE.cx} y={140} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
          a world where you can only spend what you have
        </Label>
        {CONSEQUENCES.map((c, i) => (
          <Sequence key={c.label} from={w(c.word) - at(631.2) - 4}>
            <SlideIn dy={0.7} distance={54}>
              <Yolk slug={c.slug} height={110} x={430} y={300 + i * 130} anchor="center" />
              <Plate
                x={1120}
                y={300 + i * 130}
                width={1060}
                height={104}
                size={T.label}
                tone="red"
                fill={C.redSoft}
              >
                {c.label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
      </Sequence>

      {/* ---- 10:44-10:56 the twenty-five-year-old ---- */}
      <Sequence from={w('twenty') - 6} durationInFrames={Math.max(1, w('powerful') - w('twenty'))}>
        <FadeIn frames={10}>
          <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
        </FadeIn>
        <PopIn delay={4}>
          <Yolk slug="neutral-small-smile" height={300} x={470} y={700} anchor="bottom" />
          <Label x={470} y={790} size={T.label} weight={900} caps width={620}>25 years old</Label>
        </PopIn>
        <Sequence from={w('millions') - w('twenty') - 4}>
          <PopIn>
            <Plate x={1250} y={370} width={880} height={140} size={T.label} tone="green" sub="WILL EARN OVER A LIFETIME">
              MILLIONS
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('decades') - w('twenty') - 4}>
          <PopIn>
            <Plate x={1250} y={560} width={880} height={140} size={T.label} tone="red" sub="MUST STILL WAIT">
              DECADES
            </Plate>
          </PopIn>
        </Sequence>
        <Sequence from={w('entrepreneurs') - w('twenty') - 4}>
          <PopIn>
            <Label x={STAGE.cx} y={880} size={T.note} weight={800} tone="inkSoft" width={1500}>
              great entrepreneurs with little cash might never build anything
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 11:05-11:19 the bridge ---- */}
      <Sequence from={at(665.0)}>
        <Camera push={0.04} frames={at(679.6) - at(665.0)}>
          <Sequence from={Math.max(0, w('connects') - at(665.0) - 6)}>
            <Node
              at={{ x: 400, y: 400 }}
              label="RESOURCES TODAY"
              sub="savers"
              width={470}
              height={150}
              tone={C.green}
            />
            <Yolk slug="piggy-bank-saving" height={230} x={400} y={780} anchor="bottom" />
          </Sequence>

          <Sequence from={w('tomorrow', 1) - at(665.0) - 6}>
            <Node
              at={{ x: 1520, y: 400 }}
              label="VALUE TOMORROW"
              sub="builders"
              width={470}
              height={150}
              tone={C.violet}
            />
            <Yolk slug="new-factory-sparkle" height={230} x={1520} y={780} anchor="bottom" />
          </Sequence>

          <Sequence from={w('bridge') - at(665.0) - 6}>
            <Arrow
              from={{ x: 650, y: 400 }}
              to={{ x: 1270, y: 400 }}
              delay={0}
              frames={22}
              color={C.ink}
              width={8}
              label="CREDIT"
            />
            <MoneyToken
              from={{ x: 650, y: 470 }}
              to={{ x: 1270, y: 470 }}
              delay={16}
              frames={40}
              repeat={3}
              gap={14}
              color={C.green}
            />
            <FadeIn delay={26}>
              <Label x={STAGE.cx} y={620} size={T.title} weight={900} tone="ink" caps width={1500} track={2}>
                at its best, credit is the bridge
              </Label>
            </FadeIn>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};
