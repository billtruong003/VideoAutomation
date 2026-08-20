import React from 'react';
import { Composition } from 'remotion';
import './lib/fonts';
import { VIDEO } from './lib/style';
import { TOTAL_FRAMES } from './lib/timing';
import { CasinoClocks } from './video/CasinoClocks';
import { Episode } from './video/Episode';
import { clockFor, compositionId, EPISODE_ORDER } from './episodes/registry';
import { ChannelAvatar, ChannelBanner } from './branding/Branding';
import { AssetSheet } from './qa/AssetSheet';
import { StyleProbe } from './qa/StyleProbe';
import { BackgroundSheet } from './qa/BackgroundSheet';
import { ExpressionSheet } from './qa/characters/ExpressionSheet';
import { PoseSheet } from './qa/characters/PoseSheet';
import { ModelSheet } from './qa/characters/ModelSheet';
import { CastLineup, HandArmTest, PhoneSizeTest, Silhouettes } from './qa/characters/CastSheets';
import { CAST_ORDER } from './character/registry';

const still = { durationInFrames: 1, fps: VIDEO.fps, width: VIDEO.width, height: VIDEO.height };

/**
 * Compositions.
 *
 * One episode, plus the QA sheets. The character sheets are registered per character from
 * `CAST_ORDER` rather than typed out, so adding a cast member can never leave a character
 * silently unreviewed — the sheets appear the moment the registry does.
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CasinoClocks"
      component={CasinoClocks}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />

    {/*
      Batch 001 — ten Shorts.

      Registered from EPISODE_ORDER rather than typed out, so an episode cannot be added to
      the batch and then silently left un-renderable. Duration comes from that episode's own
      locked narration; nothing here picks a length.
    */}
    {EPISODE_ORDER.map((id) => {
      const clock = clockFor(id);
      return (
        <Composition
          key={id}
          id={compositionId(id)}
          component={Episode}
          defaultProps={{ id }}
          durationInFrames={clock.TOTAL_FRAMES}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
      );
    })}

    {/*
      Channel branding. Composed from the canonical cast components, so the avatar and
      banner cannot drift away from the character sheets — they share one source.
    */}
    <Composition
      id="ChannelAvatar"
      component={ChannelAvatar}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={1024}
      height={1024}
    />
    <Composition
      id="ChannelBanner"
      component={ChannelBanner}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={2560}
      height={1440}
    />

    {/* ---- character system QA ---- */}
    <Composition id="CharModel" component={ModelSheet} {...still} />
    <Composition id="CharLineup" component={CastLineup} {...still} />
    <Composition id="CharSilhouettes" component={Silhouettes} {...still} />
    <Composition id="CharPhoneSize" component={PhoneSizeTest} {...still} />
    <Composition id="CharHandArm" component={HandArmTest} {...still} />

    {CAST_ORDER.map((id) => (
      <React.Fragment key={id}>
        <Composition
          id={`CharExpr-${id}`}
          component={ExpressionSheet}
          defaultProps={{ character: id }}
          {...still}
        />
        <Composition
          id={`CharPose-${id}`}
          component={PoseSheet}
          defaultProps={{ character: id }}
          {...still}
        />
      </React.Fragment>
    ))}

    {/* ---- asset and style QA, inherited ---- */}
    <Composition id="StyleProbe" component={StyleProbe} {...still} />
    <Composition id="AssetSheet" component={AssetSheet} {...still} />
    <Composition id="BackgroundSheet" component={BackgroundSheet} {...still} />
  </>
);
