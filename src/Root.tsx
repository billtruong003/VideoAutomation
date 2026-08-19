import React from 'react';
import { Composition } from 'remotion';
import './lib/fonts';
import { VIDEO } from './lib/style';
import { TOTAL_FRAMES } from './lib/timing';
import { CasinoClocks } from './video/CasinoClocks';
import { CharacterSheet } from './qa/CharacterSheet';
import { AssetSheet } from './qa/AssetSheet';
import { StyleProbe } from './qa/StyleProbe';
import { BackgroundSheet } from './qa/BackgroundSheet';

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
    {/* QA-only: the pose/expression contact sheet. Not part of the episode. */}
    <Composition
      id="StyleProbe"
      component={StyleProbe}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="AssetSheet"
      component={AssetSheet}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="BackgroundSheet"
      component={BackgroundSheet}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    <Composition
      id="CharacterSheet"
      component={CharacterSheet}
      durationInFrames={1}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
