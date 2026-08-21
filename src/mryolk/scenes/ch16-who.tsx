/**
 * ch16-who.tsx — 12:29-13:14. Aliens, Steve, and the answer.
 *
 * The joke and the thesis are the same beat here, so they share a frame. Three absurd
 * candidates are offered and dismissed, and the real answer arrives in the same position they
 * occupied — which is what makes "each other" land as a punchline rather than as a summary.
 *
 * Then the six ownership pairs build the web that chapter 17 will zoom out of. They are placed
 * where they will stay, so the final network is not a new picture but the same one seen whole.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** Who owes whom. Positions are final — chapter 17 reuses this arrangement. */
const OWES = [
  { word: 'Households', from: { x: 560, y: 250 }, to: { x: 1360, y: 250 }, a: 'HOUSEHOLDS', b: 'BANKS' },
  { word: 'Companies', from: { x: 560, y: 400 }, to: { x: 1360, y: 400 }, a: 'COMPANIES', b: 'INVESTORS' },
  { word: 'Governments', from: { x: 560, y: 550 }, to: { x: 1360, y: 550 }, a: 'GOVERNMENTS', b: 'PENSION FUNDS' },
  { word: 'depositors', from: { x: 560, y: 700 }, to: { x: 1360, y: 700 }, a: 'BANKS', b: 'DEPOSITORS' },
] as const;

export const Ch16WhoDoWeOwe: React.FC = () => {
  const { at, w } = ctxFor(244, 259);

  return (
    <>
      {/* ---- 12:29-12:44 the wrong answers ---- */}
      <Sequence from={0} durationInFrames={at(764.4)}>
        <Sequence from={w('absurd') - 6}>
          <PopIn>
            <Label x={STAGE.cx} y={190} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
              the world owes an absurd amount of money
            </Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('exactly') - 4}>
          <PopIn>
            <Label x={STAGE.cx} y={300} size={T.big} weight={900} tone="red" caps width={1700} track={2}>
              so who do we owe it to?
            </Label>
          </PopIn>
        </Sequence>

        <Sequence from={w('Aliens') - 5}>
          <PopIn>
            <Yolk slug="astronaut-suit" height={280} x={430} y={800} anchor="bottom" />
            <Label x={430} y={880} size={T.label} weight={900} caps width={520}>aliens?</Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('billionaire') - 5}>
          <PopIn>
            <Yolk slug="safe-vault" height={280} x={960} y={800} anchor="bottom" />
            <Label x={960} y={880} size={T.note} weight={900} caps width={560}>
              a billionaire{'\n'}under switzerland?
            </Label>
          </PopIn>
        </Sequence>
        <Sequence from={w('Steve') - 5}>
          <Pulse at={4} amount={0.14}>
            <Yolk slug="deadpan-blank" height={280} x={1490} y={800} anchor="bottom" />
            <Label x={1490} y={880} size={T.note} weight={900} caps width={560}>
              one patient guy{'\n'}named steve?
            </Label>
          </Pulse>
        </Sequence>
      </Sequence>

      {/* ---- 12:44-12:46 the answer, in the same place ---- */}
      <Sequence from={at(764.2)} durationInFrames={at(766.6) - at(764.2)}>
        <Camera push={0.07} frames={at(766.6) - at(764.2)}>
          <HeroWord y={480} delay={0} tone="green" size={128}>mostly, we owe each other</HeroWord>
        </Camera>
      </Sequence>

      {/* ---- 12:46-13:01 who owes whom ---- */}
      <Sequence from={at(766.4)} durationInFrames={at(781.4) - at(766.4)}>
        {OWES.map((o) => (
          <Sequence key={o.a + o.b} from={w(o.word) - at(766.4) - 5}>
            <Node at={o.from} label={o.a} width={400} height={110} size={27} />
            <Node at={o.to} label={o.b} width={400} height={110} size={27} />
            <Arrow
              from={o.from}
              to={o.to}
              bow={34}
              delay={8}
              frames={16}
              color={C.inkFaint}
              width={4}
              head={false}
            />
            <MoneyToken
              from={o.from}
              to={o.to}
              bow={34}
              delay={14}
              frames={38}
              repeat={2}
              gap={16}
              size={30}
              label=""
              color={C.yolk}
            />
          </Sequence>
        ))}

        <Sequence from={w('another') - at(766.4) - 4}>
          <FadeIn>
            <Label x={STAGE.cx} y={846} size={T.note} weight={800} tone="inkSoft" width={1600} fit>
              and financial institutions owe one another
            </Label>
          </FadeIn>
        </Sequence>
      </Sequence>

      {/* ---- 13:01-13:14 asset and liability ---- */}
      <Sequence from={at(781.2)}>
        <Camera push={0.04} frames={at(794.6) - at(781.2)}>
          <Sequence from={w('asset') - at(781.2) - 4}>
            <PopIn>
              <Plate x={520} y={380} width={620} height={160} size={T.title} tone="green" fill={C.greenSoft}>
                YOUR ASSET
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('liability') - at(781.2) - 6}>
            <Arrow from={{ x: 850, y: 380 }} to={{ x: 1090, y: 380 }} delay={0} frames={12} color={C.ink} width={6} />
            <PopIn delay={4}>
              <Plate x={1420} y={380} width={760} height={160} size={T.title} tone="red" fill={C.redSoft}>
                SOMEBODY ELSE’S LIABILITY
              </Plate>
            </PopIn>
          </Sequence>

          <Sequence from={w('savings', 1) - at(781.2) - 4}>
            <SlideIn dy={0.6} distance={60}>
              <Yolk slug="piggy-bank-saving" height={230} x={520} y={800} anchor="bottom" />
              <Yolk slug="new-factory-sparkle" height={230} x={1420} y={800} anchor="bottom" />
              <Label x={STAGE.cx} y={880} size={T.note} weight={800} tone="inkSoft" width={1500}>
                your savings fund somebody else’s future — and theirs fund yours
              </Label>
            </SlideIn>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};
