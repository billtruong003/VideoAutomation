/**
 * Episode.tsx — one composition that assembles any episode in the batch.
 *
 * The whole video is a consequence of one file: that episode's `narration-timing.json`,
 * derived from its LOCKED WAV. Scene boundaries, scene durations, caption timing and SFX
 * placement all read from it, so there is not a single hard-coded frame number here. Re-run
 * the audio and the entire video re-times itself.
 *
 * Episode 001 had a file exactly like this one per episode. Ten of them would have been ten
 * copies of the same twenty lines, and the copies would have drifted — so the assembly is
 * shared and only the SCENE MODULE differs per episode. That is the real episode-specific
 * surface: the drawing, not the plumbing.
 */

import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { EpisodeCaption, type CaptionHighlights } from '../components/EpisodeCaption';
import { EpisodeMusic } from '../components/EpisodeMusic';
import { EpisodeSfx } from '../components/EpisodeSfx';
import { clockFor, STORYBOARDS, type EpisodeId } from '../episodes/registry';
import { SCENE_MODULES } from '../episodes/scenes';
import { VIDEO } from '../style/tokens';

export const Episode: React.FC<{ id: EpisodeId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clock = clockFor(id);
  const storyboard = STORYBOARDS[id];
  const mod = SCENE_MODULES[id];

  return (
    <AbsoluteFill>
      {/* the master clock — every timestamp in this episode is measured against it */}
      <Audio src={staticFile(clock.audio)} />
      <EpisodeMusic
        id={id}
        words={clock.TIMING.words}
        duration={clock.TOTAL_FRAMES / fps}
        fps={fps}
      />
      <EpisodeSfx storyboard={storyboard} fps={fps} />

      {clock.SCENE_SPANS.map((span) => {
        const Scene = mod.SCENES[span.id];
        if (!Scene) {
          throw new Error(`[${id}] no scene component registered for "${span.id}"`);
        }
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
        <svg
          width={VIDEO.width}
          height={VIDEO.height}
          viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}
          style={{ display: 'block' }}
        >
          <EpisodeCaption
            frame={frame}
            fps={fps}
            captions={clock.TIMING.captions}
            highlights={mod.HIGHLIGHTS as CaptionHighlights}
          />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
