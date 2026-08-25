/**
 * ch05-who-lends.tsx — 3:32-4:08. If everyone borrows, who is lending?
 *
 * The answer is a shape, not a list. "Also everyone" only lands if the viewer SEES that the
 * lenders and the borrowers are the same population, so the five institutions arrive around a
 * ring and then money starts moving between all of them at once — the same image the film
 * will return to and finish on twelve minutes later.
 *
 * Deliberately no stock here. Every one of these is an abstraction — a pension fund is not a
 * building — and a photograph of an office would add nothing except the suggestion that it is.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { MoneyToken } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

/** Five lenders on a ring around the centre, each with the drawing that names it. */
const LENDERS = [
  { word: 'retirement', slug: 'retirement-fund', label: 'RETIREMENT\nFUND', x: 380, y: 300 },
  { word: 'bank', slug: 'bank-holding-bond', label: 'A BANK', x: 960, y: 232 },
  { word: 'insurance', slug: 'insurance-company', label: 'INSURANCE\nCOMPANY', x: 1540, y: 300 },
  { word: 'funds', slug: 'investor-with-flag', label: 'INVESTMENT\nFUNDS', x: 1560, y: 660 },
  { word: 'Foreign', slug: 'government-issuing-bond', label: 'FOREIGN\nGOVERNMENTS', x: 380, y: 660 },
] as const;

export const Ch05WhoLends: React.FC = () => {
  const { at, w } = ctxFor(80, 90);

  return (
    <>
      {/* ---- 3:32-3:41 the question ---- */}
      <Sequence from={0} durationInFrames={at(220.8)}>
        <PopIn delay={2}>
          <YolkHero slug="confused-question-mark" height={400} x={STAGE.cx} y={760} anchor="bottom" />
        </PopIn>
        <Sequence from={w('borrowing') - 8}>
          <FadeIn>
            <Label x={STAGE.cx} y={230} size={T.big} weight={900} tone="ink" caps width={1700} track={2}>
              if everyone is borrowing
            </Label>
          </FadeIn>
        </Sequence>
        <Sequence from={w('lending') - 4}>
          <PopIn>
            <Label x={STAGE.cx} y={330} size={T.big} weight={900} tone="red" caps width={1700} track={2}>
              who is lending?
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 3:41-3:57 also everyone ---- */}
      <Sequence from={at(220.6)} durationInFrames={at(236.8) - at(220.6)}>
        <Camera push={0.03} frames={at(236.8) - at(220.6)}>
          <Sequence durationInFrames={Math.max(1, w('retirement') - at(220.6) - 4)}>
            <HeroWord y={480} delay={2} tone="green" size={124}>also everyone</HeroWord>
          </Sequence>

          {LENDERS.map((l, i) => (
            <Sequence key={l.label} from={w(l.word) - at(220.6) - 6}>
              <PopIn>
                <Yolk slug={l.slug} height={220} x={l.x} y={l.y} anchor="center" />
                <Label x={l.x} y={l.y + 158} size={T.note} weight={900} tone="ink" caps width={420}>
                  {l.label}
                </Label>
              </PopIn>
              {/*
                Money starts circulating the moment a lender exists, rather than waiting for
                the set to be complete. The ring should feel like it is already running by the
                time the last member joins it.
              */}
              <MoneyToken
                from={{ x: l.x, y: l.y }}
                to={{ x: LENDERS[(i + 2) % LENDERS.length].x, y: LENDERS[(i + 2) % LENDERS.length].y }}
                bow={110}
                delay={14}
                frames={54}
                repeat={3}
                gap={40}
                size={34}
                label=""
                color={C.yolk}
              />
            </Sequence>
          ))}

          <Sequence from={w('savings', 1) - at(220.6) - 4}>
            <PopIn>
              <Plate x={STAGE.cx} y={500} width={740} height={130} size={T.label} tone="violet">
                YOUR SAVINGS FUND SOMEONE ELSE
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('house') - at(220.6) - 6}>
            <PopIn>
              <Plate x={STAGE.cx} y={640} width={740} height={130} size={T.label} tone="green">
                THEIRS FUND YOUR HOUSE
              </Plate>
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 3:57-4:08 the group chat, and the sting under it ---- */}
      <Sequence from={at(236.6)}>
        <Sequence from={0}>
          <PopIn delay={2}>
            <YolkHero slug="using-tablet" height={380} x={470} y={740} anchor="bottom" />
          </PopIn>
          {/*
            The gag is a chat thread, so it is built as one: three bubbles landing in sequence,
            all saying the same thing, which is the joke.
          */}
          {['“I’ll pay you later.”', '“I’ll pay you later.”', '“I’ll pay you later.”'].map((t, i) => (
            <SlideIn key={i} delay={w('chat') - at(236.6) - 12 + i * 9} dx={1} distance={90}>
              <Plate
                x={1260}
                y={250 + i * 150}
                width={780}
                height={116}
                size={T.label}
                tone="ink"
                fill={C.wash}
                radius={30}
              >
                {t}
              </Plate>
            </SlideIn>
          ))}
          <Sequence from={w('economy') - at(236.6) + 6}>
            <FadeIn>
              <Label x={1260} y={730} size={T.note} weight={900} tone="inkSoft" caps width={900}>
                the global economy
              </Label>
            </FadeIn>
          </Sequence>
        </Sequence>

        <Sequence from={w('realize') - at(236.6) - 4}>
          <FadeIn frames={10}>
            <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
          </FadeIn>
          <Pulse at={6} amount={0.1}>
            <Label x={STAGE.cx} y={430} size={T.big} weight={900} tone="red" caps width={1700} track={2}>
              trillions of dollars depend
            </Label>
            <Label x={STAGE.cx} y={530} size={T.big} weight={900} tone="red" caps width={1700} track={2}>
              on those messages being true
            </Label>
          </Pulse>
          <PopIn delay={16}>
            <Yolk slug="skeptical-doubt" height={260} x={STAGE.cx} y={820} anchor="bottom" />
          </PopIn>
        </Sequence>
      </Sequence>
    </>
  );
};
