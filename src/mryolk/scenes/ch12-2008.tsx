/**
 * ch12-2008.tsx — 9:18-10:17. One dramatic example.
 *
 * The chapter that most needs restraint. The narration is careful — it names mechanisms, not
 * culprits — and the visuals must not be less careful than the words. So: no logos, no named
 * institutions, no footage that would imply a particular bank did a particular thing. The
 * stock here is generic housing and generic markets, and every claim on screen is one the
 * narration actually makes.
 *
 * The house-price line is the spine. It draws upward while confidence builds, and the fall is
 * the same line continuing — not a new graphic — because the whole point is that nothing
 * changed except the direction.
 */

import React from 'react';
import { Sequence } from 'remotion';
import { C, T } from '../theme';
import { Yolk, YolkHero } from '../components/Yolk';
import { StockPlate } from '../components/Stock';
import { Label, Plate } from '../components/Text';
import { Arrow, LineGraph, Node } from '../components/Diagram';
import { Camera, FadeIn, PopIn, Pulse, Shake, SlideIn } from '../components/Motion';
import { ctxFor, STAGE } from './kit';

const CAUSES = [
  ['lending', 'BAD LENDING'],
  ['leverage', 'EXCESSIVE LEVERAGE'],
  ['incentives', 'WEAK INCENTIVES'],
  ['risk', 'UNDERESTIMATED RISK'],
  ['confidence', 'TOO MUCH CONFIDENCE'],
] as const;

export const Ch12Crisis2008: React.FC = () => {
  const { at, w } = ctxFor(194, 209);

  return (
    <>
      {/* ---- 9:18-9:33 mortgages, packaged, and prices rising ---- */}
      <Sequence from={0} durationInFrames={at(573.4)}>
        <Sequence durationInFrames={Math.max(1, w('packaged') - 4)}>
          <StockPlate id="housing-development-1" readability="strong" frames={200} kenBurns={0.08} />
        </Sequence>

        <Sequence from={w('mortgage') - 6}>
          <PopIn>
            <Yolk slug="doc-mortgage" height={280} x={420} y={470} anchor="center" />
          </PopIn>
        </Sequence>

        {/* Packaging: three documents converge into one product. */}
        <Sequence from={w('packaged') - 6}>
          {[0, 1, 2].map((i) => (
            <PopIn key={i} delay={i * 4}>
              <Yolk slug="doc-mortgage" height={190} x={380 + i * 130} y={420} anchor="center" />
            </PopIn>
          ))}
          <Arrow from={{ x: 760, y: 430 }} to={{ x: 1080, y: 430 }} delay={14} frames={14} color={C.inkFaint} width={5} />
          <PopIn delay={18}>
            <Node at={{ x: 1400, y: 430 }} label="FINANCIAL PRODUCTS" width={480} height={120} tone={C.blue} />
          </PopIn>
        </Sequence>

        <Sequence from={w('rising') - 6}>
          <LineGraph
            x={STAGE.cx}
            y={720}
            width={1100}
            height={230}
            points={[10, 14, 19, 26, 34, 43, 55]}
            delay={0}
            frames={40}
            color={C.green}
            label="HOUSING PRICES"
          />
          <Sequence from={w('confident') - w('rising')}>
            <PopIn>
              <Yolk slug="smug-arms-crossed" height={200} x={1640} y={880} anchor="bottom" />
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>

      {/* ---- 9:31-9:50 until it wasn't ---- */}
      <Sequence from={at(573.2)} durationInFrames={at(590.4) - at(573.2)}>
        <Camera push={0.035} frames={at(590.4) - at(573.2)}>
          <LineGraph
            x={STAGE.cx}
            y={430}
            width={1200}
            height={330}
            /* The same line, continuing. Rise then fall — one curve, not two graphics. */
            points={[10, 16, 24, 34, 46, 58, 62, 48, 33, 21, 14]}
            delay={2}
            frames={46}
            color={C.red}
            label="HOUSING PRICES"
          />

          <Sequence from={w('rose') - at(573.2) - 4}>
            <SlideIn dy={0.6} distance={60}>
              <Plate x={430} y={730} width={520} height={116} size={T.label} tone="red" fill={C.redSoft}>
                DEFAULTS ROSE
              </Plate>
            </SlideIn>
          </Sequence>
          <Sequence from={w('value') - at(573.2) - 4}>
            <SlideIn dy={0.6} distance={60}>
              <Plate x={1000} y={730} width={560} height={116} size={T.label} tone="red" fill={C.redSoft}>
                ASSETS LOST VALUE
              </Plate>
            </SlideIn>
          </Sequence>
          <Sequence from={w('safe', 2) - at(573.2) - 4}>
            <Shake amount={5} frames={24}>
              <Plate x={1560} y={730} width={520} height={116} size={T.note} tone="red" fill={C.redSoft}>
                “SAFE” THINGS WERE NOT
              </Plate>
            </Shake>
          </Sequence>
          <Sequence from={w('connected') - at(573.2) - 4}>
            <PopIn>
              <Yolk slug="safe-assets-were-not" height={260} x={STAGE.cx} y={900} anchor="bottom" />
            </PopIn>
          </Sequence>
        </Camera>
      </Sequence>

      {/* ---- 9:43-9:52 it spread ---- */}
      <Sequence from={w('global') - 8} durationInFrames={at(592) - w('global') + 8}>
        <FadeIn frames={10}>
          <StockPlate id="city-financial-district-1" readability="strong" frames={200} kenBurns={0.08} />
        </FadeIn>
        <PopIn delay={6}>
          <Label x={STAGE.cx} y={432} size={T.big} weight={900} tone="red" caps width={1750} track={2} fit>
            problems in one housing market
          </Label>
          <Label x={STAGE.cx} y={548} size={T.big} weight={900} tone="red" caps width={1750} track={2} fit>
            spread across global markets
          </Label>
        </PopIn>
      </Sequence>

      {/* ---- 9:50-10:17 what actually broke ---- */}
      <Sequence from={at(591.8)}>
        <Sequence durationInFrames={Math.max(1, w('combination') - at(591.8) - 4)}>
          <Label x={STAGE.cx} y={400} size={T.title} weight={900} tone="inkSoft" caps width={1700} track={2}>
            debt existed before the crisis
          </Label>
          <FadeIn delay={16}>
            <Label x={STAGE.cx} y={500} size={T.title} weight={900} tone="inkSoft" caps width={1700} track={2}>
              debt still exists after it
            </Label>
          </FadeIn>
        </Sequence>

        {CAUSES.map(([word, label], i) => (
          <Sequence key={label} from={w(word) - at(591.8) - 4}>
            <SlideIn dy={0.7} distance={50}>
              <Plate
                x={STAGE.cx}
                y={210 + i * 118}
                width={1000}
                height={100}
                size={T.label}
                tone="red"
                fill={C.redSoft}
              >
                {label}
              </Plate>
            </SlideIn>
          </Sequence>
        ))}

        <Sequence from={w('promises', 1) - at(591.8) - 6}>
          <FadeIn frames={10}>
            <div style={{ position: 'absolute', inset: 0, background: C.paper, opacity: 1 }} />
          </FadeIn>
          <Pulse at={5} amount={0.08}>
            <Label x={STAGE.cx} y={380} size={T.title} weight={900} tone="inkSoft" caps width={1750} track={1}>
              it did not break because people made promises
            </Label>
          </Pulse>
          <Sequence from={w('keep') - w('promises', 1)}>
            <PopIn>
              <Label x={STAGE.cx} y={500} size={T.big} weight={900} tone="red" caps width={1750} track={1}>
                it broke because too many promises
              </Label>
              <Label x={STAGE.cx} y={600} size={T.big} weight={900} tone="red" caps width={1750} track={1}>
                could not be kept
              </Label>
            </PopIn>
            <PopIn delay={14}>
              <YolkHero slug="collapsed-defeated" height={260} x={STAGE.cx} y={880} anchor="bottom" />
            </PopIn>
          </Sequence>
        </Sequence>
      </Sequence>
    </>
  );
};
