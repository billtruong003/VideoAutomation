/**
 * ch14-recession.tsx — 11:19-11:58. The downward spiral, and the interruption.
 *
 * A second feedback loop, deliberately drawn in the SAME visual grammar as the credit loop in
 * chapter 11 — same ring, same red arrows, same closing edge. The repetition is the point: by
 * this stage of the film the viewer recognises the shape and understands what it means before
 * the labels are readable, which is what lets this section move quickly.
 *
 * The flush gag is given exactly one beat and then left. It is the biggest laugh in the script
 * and the fastest way to ruin it is to hold it — so the toilet appears, the loop drains into
 * it, and the chapter moves straight on to what governments do about it.
 */

import React from 'react';
import { Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { Label, Plate } from '../components/Text';
import { Arrow, MoneyToken, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const SPIRAL = [
  { word: 'less', nth: 1, at: { x: 960, y: 250 }, label: 'PEOPLE SPEND LESS' },
  { word: 'less', nth: 2, at: { x: 1430, y: 470 }, label: 'BUSINESSES EARN LESS' },
  { word: 'workers', nth: 1, at: { x: 960, y: 690 }, label: 'WORKERS ARE FIRED' },
  { word: 'even', nth: 1, at: { x: 490, y: 470 }, label: 'THEY SPEND EVEN LESS' },
] as const;

const RESPONSES = [
  ['employment', 'EMPLOYMENT SUPPORT'],
  ['infrastructure', 'INFRASTRUCTURE'],
  ['emergency', 'EMERGENCY PROGRAMS'],
  ['assistance', 'BUSINESS ASSISTANCE'],
  ['relief', 'TAX RELIEF'],
] as const;

export const Ch14Recession: React.FC = () => {
  const { at, w } = ctxFor(223, 235);

  return (
    <>
      {/* ---- 11:19-11:31 the spiral ---- */}
      <Sequence from={0} durationInFrames={at(693.4)}>
        <Camera push={0.03} frames={at(693.4)}>
          {SPIRAL.map((n, i) => (
            <Sequence key={n.label} from={w(n.word, n.nth) - 5}>
              <Node at={n.at} label={n.label} width={470} height={116} size={26} tone={C.red} />
              <Arrow
                from={SPIRAL[i].at}
                to={SPIRAL[(i + 1) % SPIRAL.length].at}
                bow={88}
                delay={9}
                frames={16}
                color={C.red}
                width={5}
              />
            </Sequence>
          ))}
          <Sequence from={w('fired') - 4}>
            <Arrow from={SPIRAL[3].at} to={SPIRAL[0].at} bow={88} delay={0} frames={14} color={C.red} width={6} />
            <MoneyToken
              from={SPIRAL[0].at}
              to={SPIRAL[1].at}
              bow={88}
              delay={4}
              frames={20}
              repeat={4}
              gap={18}
              size={24}
              label=""
              color={C.red}
            />
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 11:30-11:34 the flush. One beat, then gone. ---- */}
      <Sequence from={at(693.2)} durationInFrames={at(700) - at(693.2)}>
        <Sequence durationInFrames={Math.max(1, w('flush') - at(693.2))}>
          <Label x={STAGE.cx} y={430} size={T.big} weight={900} tone="ink" caps width={1600} track={2}>
            congratulations
          </Label>
        </Sequence>
        <Sequence from={w('flush') - at(693.2) - 6}>
          <Pulse at={5} amount={0.16}>
            <YolkHero slug="toilet-flush-money" height={470} x={STAGE.cx} y={790} anchor="bottom" />
          </Pulse>
          <PopIn delay={10}>
            <Label x={STAGE.cx} y={240} size={T.big} weight={900} tone="red" caps width={1700} track={3}>
              the economic toilet flush
            </Label>
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 11:34-11:45 governments interrupt the cycle ---- */}
      <Sequence from={at(699.8)} durationInFrames={at(711.4) - at(699.8)}>
        <Label x={STAGE.cx} y={150} size={T.title} weight={900} tone="blue" caps width={1700} track={2}>
          governments try to interrupt it
        </Label>
        {RESPONSES.map(([word, label], i) => (
          <Sequence key={label} from={w(word) - at(699.8) - 4}>
            <SlideIn dy={0.7} distance={50}>
              <Plate
                x={STAGE.cx}
                y={290 + i * 122}
                width={1000}
                height={104}
                size={T.label}
                tone="blue"
                fill={C.blueSoft}
              >
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}
        <Sequence from={w('problem') - at(699.8) - 4}>
          <PopIn>
            <Yolk slug="government-building-worried" height={230} x={STAGE.cx} y={900} anchor="bottom" />
          </PopIn>
        </Sequence>
      </Sequence>

      {/* ---- 11:45-11:58 the annoying problem, and the answer ---- */}
      <Sequence from={at(711.2)}>
        <Camera push={0.035} frames={at(718.6) - at(711.2)}>
          <Sequence from={w('fall') - at(711.2) - 4}>
            <Plate x={480} y={330} width={620} height={150} size={T.label} tone="red" sub="EXACTLY WHEN IT IS NEEDED">
              TAX REVENUE FALLS
            </Plate>
          </Sequence>
          <Sequence from={w('borrow') - at(711.2) - 4}>
            <Arrow from={{ x: 800, y: 330 }} to={{ x: 1120, y: 330 }} delay={0} frames={14} color={C.ink} width={6} />
            <PopIn delay={4}>
              <Plate x={1440} y={330} width={620} height={150} size={T.label} tone="green" sub="SO THEY">
                BORROW
              </Plate>
            </PopIn>
          </Sequence>
          <Sequence from={w('spread') - at(711.2) - 4}>
            <FadeIn>
              <Label x={STAGE.cx} y={620} size={T.title} weight={900} tone="ink" caps width={1700} track={2}>
                debt spreads a crisis across time
              </Label>
              <Label x={STAGE.cx} y={710} size={T.note} weight={800} tone="inkSoft" width={1500}>
                instead of collecting all of it at once
              </Label>
            </FadeIn>
            <PopIn delay={12}>
              <SpreadBars />
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>
    </>
  );
};

/**
 * One tall bar becoming several short ones — the cost, spread.
 *
 * A literal picture of the sentence, and cheaper to read than any wording of it: the total
 * area stays the same while the height drops, which is exactly what "across time instead of
 * immediately" means.
 */
const SpreadBars: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [8, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eased = t * t * (3 - 2 * t);
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 760 + i * (eased * 100);
        const h = 200 - eased * 152;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: 900 - h,
              width: 74,
              height: h,
              background: C.blueSoft,
              border: `4px solid ${C.blue}`,
              borderRadius: 8,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </>
  );
};
