/**
 * ch08-productive.tsx — 6:26-6:50. Productive debt, stupid debt, and the tool.
 *
 * Short, and built as a single side-by-side that tips. The two columns are drawn to the same
 * spec — same amount borrowed, same layout — so the only difference the viewer can see is what
 * was bought with it, which is precisely the narration's claim.
 *
 * The statue gag gets an actual rise rather than a pop, because "four hundred metre" is doing
 * work in the sentence and a thing that grows reads as tall in a way a thing that appears
 * does not.
 */

import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, T } from '../theme';
import { Yolk } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { Camera, FadeIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

export const Ch08ProductiveOrStupid: React.FC = () => {
  const { at, w } = ctxFor(140, 143);

  return (
    <>
      <Sequence from={0} durationInFrames={at(402.4)}>
        <Label x={STAGE.cx} y={140} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
          borrow $1,000,000,000 to build…
        </Label>

        {/* Left column: productive. */}
        <Sequence from={w('infrastructure') - 6}>
          <SlideIn dx={-1} distance={110}>
            <Yolk slug="bridge-and-road" height={330} x={520} y={520} anchor="center" />
            <Plate x={520} y={760} width={640} height={126} size={T.label} tone="green" fill={C.greenSoft}>
              MAY BE EXCELLENT
            </Plate>
          </SlideIn>
        </Sequence>

        {/* Right column: the statue, rising. */}
        <Sequence from={w('golden') - 8}>
          <RisingStatue />
          <Sequence from={w('lasers') - w('golden') - 4}>
            <Pulse at={4} amount={0.16}>
              <Plate x={1400} y={760} width={700} height={126} size={T.label} tone="red" fill={C.redSoft}>
                WE HAVE QUESTIONS
              </Plate>
            </Pulse>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 6:42-6:50 the tool, and the turn into leverage ---- */}
      <Sequence from={at(402.2)}>
        <Camera push={0.05} frames={at(410.4) - at(402.2)}>
          <Sequence durationInFrames={Math.max(1, w('leverage') - at(402.2) - 2)}>
            <HeroWord y={420} delay={2} tone="ink" size={96}>debt is a tool</HeroWord>
            <FadeIn delay={16}>
              <Label x={STAGE.cx} y={540} size={T.label} weight={800} tone="inkSoft" width={1400}>
                not automatically good, not automatically bad
              </Label>
            </FadeIn>
          </Sequence>
          <Sequence from={w('leverage') - at(402.2) - 6}>
            <HeroWord y={470} tone="red" size={150}>leverage</HeroWord>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};

/** The statue rises out of the floor rather than popping in — "four hundred metre" needs height. */
const RisingStatue: React.FC = () => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eased = rise * rise * (3 - 2 * rise);
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: 'inset(0 0 22% 0)' }}>
      <Yolk
        slug="golden-statue"
        height={380}
        x={1400}
        y={640 + (1 - eased) * 420}
        anchor="center"
      />
    </div>
  );
};
