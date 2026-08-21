/**
 * Video.tsx — the whole film.
 *
 * Nothing here decides how long anything is. The composition's length comes from the measured
 * duration of the narration master; each scene's length comes from the transcript segments it
 * covers; each beat inside a scene comes from the word it illustrates. Every number traces
 * back to the WAV.
 *
 * Layer order is fixed and matters:
 *
 *   1. the white page        so no scene can leak the previous one
 *   2. the scene             artwork, diagrams, stock
 *   3. chapter cards         over the scene, briefly, at real turning points
 *   4. captions              always on top, never covered by a diagram
 *   5. narration + SFX       audio, with narration at unity and effects well beneath it
 */

import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { AUDIO_DURATION, FPS, TOTAL_FRAMES, sec } from './clock';
import { C } from './theme';
import { Captions } from './components/Caption';
import { ChapterCard, Stage } from './components/Stage';
import { resolveScenes } from './scenes';
import { SfxTrack } from './Sfx';

const CARD_FRAMES = 62;

export const MrYolkDebt: React.FC = () => {
  const scenes = resolveScenes();

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      {scenes.map((s) => {
        const from = sec(s.start);
        const durationInFrames = Math.max(1, sec(s.end) - from);
        const Scene = s.component;
        return (
          <Sequence key={s.id} from={from} durationInFrames={durationInFrames} name={s.id}>
            <Stage>
              <Scene />
            </Stage>
            {s.card && (
              <Sequence from={0} durationInFrames={CARD_FRAMES} name={`${s.id}-card`}>
                <ChapterCard title={s.card.title} sub={s.card.sub} frames={CARD_FRAMES} />
              </Sequence>
            )}
          </Sequence>
        );
      })}

      <Captions />

      {/*
        Narration at unity, and it is the only thing here that is. Everything in SfxTrack is
        mixed underneath it — see Sfx.tsx for the levels and why they are where they are.
      */}
      <Audio src={staticFile('mryolk/audio/narration-master.wav')} />
      <SfxTrack />
    </AbsoluteFill>
  );
};

export const MRYOLK_COMPOSITION = {
  id: 'MrYolkDebt',
  durationInFrames: TOTAL_FRAMES,
  fps: FPS,
  width: 1920,
  height: 1080,
} as const;

export const NARRATION_SECONDS = AUDIO_DURATION;
