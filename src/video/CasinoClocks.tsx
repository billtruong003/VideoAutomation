/**
 * CasinoClocks.tsx — Episode 001, assembled.
 *
 * The whole composition is a consequence of one file: `data/narration-timing.json`,
 * derived from the LOCKED `voiceover-processed.wav`. Scene boundaries, scene durations,
 * caption timing and SFX placement all read from it, so there is not a single hard-coded
 * frame number in this file. Re-process the narration and the entire video re-times
 * itself.
 */

import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { SCENE_SPANS } from '../lib/timing';
import { Caption } from '../components/Caption';
import { SoundDesign } from '../components/SoundDesign';

import { HookScene } from '../scenes/HookScene';
import { NoAccidentScene } from '../scenes/NoAccidentScene';
import { TimeCuesScene } from '../scenes/TimeCuesScene';
import { ConstantEnvironmentScene } from '../scenes/ConstantEnvironmentScene';
import { TimeDistortionScene } from '../scenes/TimeDistortionScene';
import { TwistScene } from '../scenes/TwistScene';
import { ModernCasinoScene } from '../scenes/ModernCasinoScene';
import { MythCorrectionScene } from '../scenes/MythCorrectionScene';
import { FinalIdeaScene } from '../scenes/FinalIdeaScene';

const SCENE_COMPONENTS: Record<string, React.FC> = {
  hook: HookScene,
  'no-accident': NoAccidentScene,
  'time-cues': TimeCuesScene,
  'constant-environment': ConstantEnvironmentScene,
  'time-distortion': TimeDistortionScene,
  twist: TwistScene,
  'modern-casino': ModernCasinoScene,
  'myth-correction': MythCorrectionScene,
  'final-idea': FinalIdeaScene,
};

export const CasinoClocks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* the master clock — every timestamp in this project is measured against it */}
      <Audio src={staticFile('audio/voiceover-processed.wav')} />
      <SoundDesign />

      {SCENE_SPANS.map((span) => {
        const Scene = SCENE_COMPONENTS[span.id];
        if (!Scene) throw new Error(`No scene component registered for "${span.id}"`);
        return (
          <Sequence
            key={span.id}
            from={span.from}
            durationInFrames={span.durationInFrames}
            name={`${span.id} — ${span.narration.slice(0, 46)}`}
          >
            <Scene />
          </Sequence>
        );
      })}

      {/* captions ride above every scene, timed off the processed audio */}
      <AbsoluteFill>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ display: 'block' }}>
          <Caption frame={frame} fps={fps} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
