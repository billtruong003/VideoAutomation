/**
 * EpisodeMusic.tsx — the bed under one episode. Currently: none.
 *
 * MUSIC IS DISABLED FOR BATCH 001, and the reason is licensing rather than taste.
 *
 * The four beds came from a downloaded folder containing four bare WAV files and nothing
 * else -- no README, no licence, no terms, no source URL, no creator notice. The rights
 * pre-flight before publishing searched every pack directory and the imported asset registry
 * and found no evidence of any kind. The three meme packs at least carry a README, and what
 * it says is that they were scraped from a public soundboard site, which is not a licence
 * either; none of those are used here.
 *
 * Provenance is not permission. An asset whose right to publish cannot be substantiated does
 * not go into a public video, however good it sounds, so every MUSIC_PLAN entry is null and
 * the batch publishes with narration and original generated effects only.
 *
 * This is not a deletion. The plan table, the mixing model in ../lib/duck.ts and the QA gate
 * all remain, so the day a licensed library exists this is one table of ten entries away from
 * working again.
 *
 * If beds return, the level is already settled: normalise to -30 LUFS at import against a
 * -14.5 LUFS narration, hold that constant under speech and lift 4 dB in genuine pauses.
 * See ../lib/duck.ts for why it is inverted from conventional sidechain ducking.
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
/**
 * PARTIAL on purpose: an episode with no entry runs dry.
 *
 * Requiring a key per episode made adding one a compile error whose only fix was to type
 * `null` again, and the rights-safe default is exactly that. Absence and `null` mean the same
 * thing — narration plus generated SFX, no bed — so the safe answer is also the one you get by
 * doing nothing, which is the right way round for a rights decision.
 */
export const MUSIC_PLAN: Partial<Record<EpisodeId, BedId | null>> = {
  /*
   * All null: see the file header. Every bed had unverifiable rights, and the publish
   * pre-flight rule is that an asset without substantiated permission does not ship.
   *
   * Setting these back to a bed id is all that is needed once a licensed library exists --
   * and note that EpisodeSfx keys its TEXTURE cues off whether an episode has a bed, so
   * turning music back on will automatically thin the effects again.
   */
  'airplane-window-hole': null,
  'escalator-brushes': null,
  'fuel-door-arrow': null,
  'gas-pump-shutoff': null,
  'highway-lane-lines': null,
  'jeans-watch-pocket': null,
  'microwave-door-mesh': null,
  'old-book-smell': null,
  'pen-cap-hole': null,
  'round-manhole-covers': null,
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
