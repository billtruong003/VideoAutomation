/**
 * ch01-disappearance.tsx — 0:00-0:47. Every debt on Earth vanishes, and then the bill arrives.
 *
 * This is the most important forty-seven seconds in the video. A long-form viewer decides
 * whether to stay somewhere in here, and what they are deciding is not "is this topic
 * interesting" but "does this channel know how to show me things". So the opening spends its
 * whole budget on demonstrating the visual language rather than on establishing it: five
 * documents destroyed in eight seconds, a celebration, a hard tonal turn, and a gag.
 *
 * The five "Gone." beats are cut to the WORD, not to the sentence. Each document is already on
 * screen when its name is spoken and is struck out on the syllable "gone" — a fifth of a
 * second late and the joke reads as a slideshow keeping up rather than a punchline landing.
 */

import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockWindow, StockPlate } from '../components/Stock';
import { HeroWord, Label, Plate } from '../components/Text';
import { FadeIn, PopIn, Pulse, Shake, SlideIn, Camera, seeded } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const DEBTS = [
  { slug: 'doc-mortgage', label: 'MORTGAGE', word: 'mortgage' },
  { slug: 'doc-credit-card-bill', label: 'CREDIT CARD', word: 'credit' },
  { slug: 'doc-student-loan', label: 'STUDENT LOAN', word: 'student' },
  { slug: 'doc-corporate-debt', label: 'CORPORATE DEBT', word: 'corporate' },
  { slug: 'doc-government-debt', label: 'GOVERNMENT DEBT', word: 'government' },
] as const;

/**
 * One document: slides in on its own noun, is struck through on its own "Gone.", and then
 * STAYS — greyed and knocked slightly off-square — until the whole pile clears at once.
 *
 * The accumulation is the joke. An earlier cut threw each document off screen the instant it
 * was cancelled, which was livelier per beat and much worse overall: the frame was empty
 * again within half a second, so the viewer never saw the debts adding up, and "humanity has
 * finally defeated debt" arrived with nothing on screen to have defeated. Letting them stack
 * means the celebration lands on top of five crossed-out obligations, and the clear-out
 * becomes a single satisfying gesture instead of five small ones.
 */
const DebtCard: React.FC<{
  slug: string; label: string; inAt: number; goneAt: number; clearAt: number;
  x: number; y: number; seed: string;
}> = ({ slug, label, inAt, goneAt, clearAt, x, y, seed }) => {
  const frame = useCurrentFrame();
  const r = seeded(seed);
  const dir = r > 0.5 ? 1 : -1;

  const strike = interpolate(frame, [goneAt, goneAt + 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const settle = interpolate(frame, [goneAt, goneAt + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const away = interpolate(frame, [clearAt, clearAt + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  if (frame < inAt) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      transform: `translate(${away * dir * 1100}px, ${-away * away * 520}px) rotate(${away * dir * 70}deg)`,
      opacity: 1 - Math.max(0, (away - 0.65) / 0.35),
    }}
    >
      <SlideIn delay={inAt} dy={1} distance={60}>
        <div style={{
          // A cancelled document goes quiet and tips over slightly. It is still there; it
          // just stops being live.
          filter: `saturate(${1 - settle * 0.55}) opacity(${1 - settle * 0.28})`,
          transform: `rotate(${settle * dir * 4}deg)`,
          transformOrigin: `${x}px ${y}px`,
        }}
        >
          <Yolk slug={slug} height={286} x={x} y={y} anchor="center" />
          <Label x={x} y={y + 178} size={T.note} weight={900} tone="ink" width={420} caps>
            {label}
          </Label>
        </div>
      </SlideIn>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
        <line
          x1={x - 145} y1={y + 66} x2={x - 145 + 290 * strike} y2={y - 66}
          stroke={C.red} strokeWidth={12} strokeLinecap="round" opacity={strike > 0 ? 1 : 0}
        />
      </svg>
    </div>
  );
};

export const Ch01Disappearance: React.FC = () => {
  const c = ctxFor(0, 22);
  const { at, w, wAfter } = c;

  return (
    <>
      {/* ---- 0:00 he wakes up ---- */}
      <Sequence from={0} durationInFrames={at(4.6)}>
        <Camera push={0.06} frames={at(4.6)}>
          <PopIn delay={2}>
            <YolkHero slug="waking-up-confused" height={430} x={STAGE.cx} y={640} anchor="center" />
          </PopIn>
          <FadeIn delay={at(1.6)}>
            <Label x={STAGE.cx} y={230} size={T.title} tone="inkSoft" weight={800} caps track={3}>
              every debt on earth — gone
            </Label>
          </FadeIn>
        </Camera>
      </Sequence>

      {/* ---- 0:04-0:14 the five documents stack up, then clear together ---- */}
      <Sequence from={at(4.3)} durationInFrames={at(14.6) - at(4.3)}>
        {DEBTS.map((d, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          // Three across, then two centred beneath, so the block stays balanced as it fills.
          const x = row === 0 ? 470 + col * 490 : 715 + col * 490;
          const y = row === 0 ? 300 : 610;
          return (
            <DebtCard
              key={d.slug}
              slug={d.slug}
              label={d.label}
              x={x}
              y={y}
              seed={d.slug}
              inAt={w(d.word) - at(4.3) - 4}
              goneAt={wAfter('gone', w(d.word)) - at(4.3)}
              clearAt={w('Humanity') - at(4.3) - 6}
            />
          );
        })}
      </Sequence>

      {/* ---- 0:14-0:19 the celebration, and the sting ---- */}
      <Sequence from={at(14.4)} durationInFrames={at(19.3) - at(14.4)}>
        <PopIn delay={2}>
          <YolkHero slug="papers-flying-away-happy" height={470} x={STAGE.cx} y={720} anchor="bottom" />
        </PopIn>
        <FadeIn delay={at(15.2) - at(14.4)}>
          <Label x={STAGE.cx} y={186} size={T.title} weight={900} tone="green" caps width={1500} track={2}>
            humanity defeated debt
          </Label>
        </FadeIn>
        {/*
          The turn. "for approximately five minutes" arrives in red under a celebration that is
          still on screen — the contradiction is the joke, so both have to be visible at once.
        */}
        <Sequence from={w('approximately') - at(14.4)}>
          <PopIn>
            {/* Below the character, clear of the flying paper and above the caption band. */}
            <Label x={STAGE.cx} y={838} size={T.title} weight={900} tone="red" caps track={2} width={1500}>
              for approximately five minutes
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 0:19-0:30 the system fails, one institution at a time ---- */}
      <Sequence from={at(19.1)} durationInFrames={at(30.4) - at(19.1)}>
        <Sequence from={w('banks') - at(19.1) - 3} durationInFrames={at(24.9) - at(19.1)}>
          <Shake amount={9} frames={34} delay={4}>
            <YolkHero slug="bank-broken" height={400} x={620} y={520} anchor="center" />
          </Shake>
          <PopIn delay={10}>
            <Label x={620} y={790} size={T.label} weight={900} tone="red" caps>banks break</Label>
          </PopIn>
          <Sequence from={w('companies') - w('banks') + 3}>
            <SlideIn dx={1} distance={140}>
              <Yolk slug="closed-door-rejected" height={360} x={1330} y={720} anchor="bottom" />
              <Label x={1330} y={790} size={T.label} weight={900} tone="red" caps>no funding</Label>
            </SlideIn>
          </Sequence>
        </Sequence>

        <Sequence from={w('Construction') - at(19.1) - 3} durationInFrames={at(29.6) - at(24.9)}>
          <StockWindow
            id="construction-frozen-1"
            x={640}
            y={430}
            width={760}
            height={430}
            frames={90}
            label="PROJECTS FREEZE"
          />
          <Sequence from={w('Governments') - w('Construction') + 2}>
            <PopIn>
              <Yolk slug="government-building-worried" height={380} x={1420} y={740} anchor="bottom" />
              <Label x={1420} y={800} size={T.note} weight={900} tone="red" caps>financing gone</Label>
            </PopIn>
          </Sequence>
        </Sequence>

        <Sequence from={w('Investors') - at(19.1) - 3}>
          <Shake amount={6} frames={30} delay={3}>
            <YolkHero slug="crash-arrow-panic" height={420} x={STAGE.cx} y={560} anchor="center" />
          </Shake>
        </Sequence>
      </Sequence>

      {/* ---- 0:30-0:38 the airplane gag ---- */}
      <Sequence from={at(30.2)} durationInFrames={at(38.4) - at(30.2)}>
        <StockPlate id="airplane-detail-1" readability="strong" frames={250} kenBurns={0.09} />
        <PopIn delay={at(32.6) - at(30.2)}>
          <YolkHero slug="airplane-losing-screw" height={430} x={720} y={430} anchor="center" />
        </PopIn>
        <Sequence from={w('screws', 1) - at(30.2)}>
          <PopIn>
            <Yolk slug="airplane-screw-gag" height={370} x={1400} y={780} anchor="bottom" />
          </PopIn>
        </Sequence>
        <Sequence from={w('weight') - at(30.2) - 10}>
          <PopIn>
            <Plate x={STAGE.cx} y={880} width={860} height={92} size={T.label} tone="red">
              SCREWS ARE TECHNICALLY ADDING WEIGHT
            </Plate>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 0:38-0:47 the thesis ---- */}
      <Sequence from={at(38.2)}>
        <Camera push={0.05} frames={at(47.4) - at(38.2)}>
          <HeroWord y={430} delay={at(39.0) - at(38.2)} tone="ink" size={104}>
            the modern world
          </HeroWord>
          <HeroWord y={580} delay={w('runs') - at(38.2)} tone="yolk" size={132}>
            runs on debt
          </HeroWord>
          <Sequence from={w('different') - at(38.2) - 16}>
            <Pulse at={4} amount={0.1}>
              <Yolk slug="idea-sparkle" height={230} x={1580} y={800} anchor="bottom" />
            </Pulse>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};
