/**
 * EpisodeMusic.tsx — the bed under one episode.
 *
 * There are four beds and ten episodes, so beds repeat. That is deliberate and it is how a
 * channel builds a sound: a viewer who watches three of these in a row should feel that they
 * came from the same place. What the assignment below avoids is a bed appearing twice in a
 * row, which reads as running out of material rather than as having a house sound.
 *
 * Every episode gets a bed. A bed that came and went between Shorts would be more noticeable
 * than either having one or not — consistency is the whole value of texture this quiet.
 *
 * LEVEL AND PROVENANCE ARE THE TWO THINGS TO KNOW HERE:
 *
 *  - Level is measured, not chosen. Beds are normalised to −30 LUFS at import against a
 *    −14.5 LUFS narration, so gain 1.0 is about 15.5 LU down. See `duck.ts` for why the bed
 *    holds a constant level and lifts at pauses rather than ducking under speech.
 *
 *  - Provenance is USER_PROVIDED_UNKNOWN_LICENSE. These came from a downloaded pack with no
 *    licence metadata. They are fine for local renders and review; NOTHING HERE ESTABLISHES
 *    A RIGHT TO PUBLISH THEM. The publish manifest carries the same warning.
 */

import React from 'react';
import { Audio, staticFile } from 'remotion';
import { musicEnvelope, type Word } from '../lib/duck';
import type { EpisodeId } from '../episodes/registry';

/** The imported beds, by asset id. */
export const BEDS = {
  tiptoe: { file: 'music/bed-the-sneaky-tiptoe.mp3', seconds: 33.6 },
  paperweight: { file: 'music/bed-the-great-paperweight-incident.mp3', seconds: 21.0 },
  bananaLong: { file: 'music/bed-sneaky-banana-peel-1.mp3', seconds: 39.9 },
  banana: { file: 'music/bed-sneaky-banana-peel.mp3', seconds: 23.3 },
} as const;

export type BedId = keyof typeof BEDS;

/**
 * Which bed plays under which episode.
 *
 * Ordered so no bed follows itself, and spread evenly: three, three, two, two. Editing this
 * table is the whole interface for changing an episode's music — set an entry to `null` to
 * run that episode dry.
 */
export const MUSIC_PLAN: Record<EpisodeId, BedId | null> = {
  'airplane-window-hole': 'tiptoe',
  'escalator-brushes': 'paperweight',
  'fuel-door-arrow': 'bananaLong',
  'gas-pump-shutoff': 'banana',
  'highway-lane-lines': 'tiptoe',
  'jeans-watch-pocket': 'paperweight',
  'microwave-door-mesh': 'bananaLong',
  'old-book-smell': 'tiptoe',
  'pen-cap-hole': 'banana',
  'round-manhole-covers': 'paperweight',
};

export const EpisodeMusic: React.FC<{
  id: EpisodeId;
  words: Word[];
  duration: number;
  fps: number;
}> = ({ id, words, duration, fps }) => {
  const bedId = MUSIC_PLAN[id];
  if (!bedId) return null;
  const bed = BEDS[bedId];

  /*
   * The envelope is rebuilt only when the narration changes. It walks the pause list on every
   * frame, and at 30 fps over 30 seconds that is a thousand calls — cheap, but there is no
   * reason to rebuild the pause list each time.
   */
  const envelope = React.useMemo(
    () => musicEnvelope(words, duration),
    [words, duration],
  );

  return (
    <Audio
      src={staticFile(bed.file)}
      // Beds are shorter than some episodes; the pack's tracks are written to loop.
      loop={bed.seconds < duration}
      volume={(frame) => envelope(frame / fps)}
      name={`music:${bedId}`}
    />
  );
};
