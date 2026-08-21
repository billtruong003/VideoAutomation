/**
 * ch15-war.tsx — 11:58-12:29. Borrowing as state power.
 *
 * The narration is explaining a mechanism of public finance, and the visuals stay at that
 * level. There is no war footage here and no imagery of harm: the subject is how a government
 * pays for something enormous, and the honest illustration of that is a bond poster and a tax
 * bill, not archive of the thing being paid for. Mr.Yolk in a helmet is the entire military
 * content, because the joke in the script is about the TAX ALTERNATIVE, not about the war.
 *
 * The comparison is built as two options offered side by side, since that is literally what
 * the narration says a government prefers between.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk } from '../components/Yolk';
import { HeroWord, Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Shake, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

export const Ch15WarAndPower: React.FC = () => {
  const { at, w } = ctxFor(236, 243);

  return (
    <>
      {/* ---- 11:58-12:13 the two options a government can offer ---- */}
      <Sequence from={0} durationInFrames={at(733.4)}>
        <Sequence from={w('logic') - 4}>
          <PopIn>
            <Yolk slug="soldier-helmet-spear" height={300} x={STAGE.cx} y={700} anchor="bottom" />
          </PopIn>
        </Sequence>
        <Sequence from={w('expensive') - 6}>
          <PopIn>
            <Label x={STAGE.cx} y={150} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
              wars are extremely expensive
            </Label>
          </PopIn>
        </Sequence>

        {/* Option A: the bonds. */}
        <Sequence from={w('bonds') - 6}>
          <SlideIn dx={-1} distance={110}>
            <Yolk slug="war-bonds-soldier" height={330} x={520} y={640} anchor="bottom" />
            <Plate x={520} y={760} width={700} height={130} size={T.label} tone="green" fill={C.greenSoft}>
              “WE ARE ISSUING WAR BONDS”
            </Plate>
          </SlideIn>
        </Sequence>

        {/* Option B: the bill, which nobody prefers. */}
        <Sequence from={w('afternoon') - 6}>
          <SlideIn dx={1} distance={110}>
            <Yolk slug="government-bill-huge" height={330} x={1400} y={640} anchor="bottom" />
          </SlideIn>
          <Sequence from={w('higher') - w('afternoon') - 4}>
            <Shake amount={5} frames={24}>
              <Plate x={1400} y={760} width={760} height={130} size={T.label} tone="red" fill={C.redSoft}>
                “YOUR TAXES ARE NOW 300% HIGHER”
              </Plate>
            </Shake>
          </Sequence>
          <Sequence from={w('wonderful') - w('afternoon') - 4}>
            <PopIn>
              <Label x={1400} y={890} size={T.note} weight={800} tone="inkSoft" width={800}>
                “Have a wonderful day.”
              </Label>
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 12:13-12:25 borrowing as power ---- */}
      <Sequence from={at(733.2)} durationInFrames={at(745.4) - at(733.2)}>
        <Camera push={0.04} frames={at(745.4) - at(733.2)}>
          <Sequence from={0} durationInFrames={Math.max(1, w('trust') - at(733.2) - 6)}>
            <Label x={STAGE.cx} y={430} size={T.title} weight={900} tone="ink" caps width={1700} track={2} fit>
              borrowing has been a source of state power
            </Label>
            <PopIn delay={8}>
              <Yolk slug="king-crown-cape" height={280} x={STAGE.cx} y={800} anchor="bottom" />
            </PopIn>
          </Sequence>
          <Sequence from={w('trust') - at(733.2) - 6}>
            <Node at={{ x: 470, y: 380 }} label="A GOVERNMENT PEOPLE TRUST" width={520} height={150} tone={C.blue} />
            <Yolk slug="hugging-safe-bond" height={230} x={470} y={780} anchor="bottom" />
          </Sequence>

          <Sequence from={w('mobilize') - at(733.2) - 4}>
            <Arrow from={{ x: 740, y: 380 }} to={{ x: 1180, y: 380 }} delay={0} frames={18} color={C.ink} width={7} />
            <PopIn delay={6}>
              <Node
                at={{ x: 1470, y: 380 }}
                label="FAR MORE RESOURCES"
                sub="than the cash it holds today"
                width={560}
                height={150}
                tone={C.violet}
              />
            </PopIn>
            <MoneyToken
              from={{ x: 740, y: 470 }}
              to={{ x: 1180, y: 470 }}
              delay={12}
              frames={34}
              repeat={4}
              gap={12}
              color={C.green}
              size={44}
            />
          </Sequence>

          <Sequence from={w('centuries') - at(733.2) - 4}>
            <FadeIn>
              <Label x={STAGE.cx} y={640} size={T.label} weight={800} tone="inkSoft" width={1600}>
                a source of state power for centuries
              </Label>
            </FadeIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 12:25-12:29 the turn out of the chapter ---- */}
      <Sequence from={at(745.2)}>
        <Sequence durationInFrames={Math.max(1, w('history') - at(745.2) - 2)}>
          <HeroWord y={470} delay={2} tone="inkSoft" size={86}>debt doesn’t just shape economies</HeroWord>
        </Sequence>
        <Sequence from={w('history') - at(745.2) - 6}>
          <Camera push={0.06} frames={70}>
            <HeroWord y={470} tone="ink" size={124}>debt has shaped history</HeroWord>
            <PopIn delay={12}>
              <Yolk slug="peasant-cloak" height={230} x={430} y={880} anchor="bottom" />
              <Yolk slug="king-crown-cape" height={230} x={960} y={880} anchor="bottom" />
              <Yolk slug="soldier-helmet-spear" height={230} x={1490} y={880} anchor="bottom" />
            </PopIn>
          </Camera>
        </Sequence>
      </Sequence>
    </>
  );
};
