/**
 * states.mjs — the batch stages and the episode states, as data.
 *
 * The batch owns advancement. An episode can be finished with TTS while the batch is still in
 * TTS_GENERATION, and that is the point: the whole batch does one stage before any of it moves
 * on. Processing episode 1 all the way to a rendered video while episode 2 has no audio yet is
 * how a hundred-script run becomes impossible to reason about.
 *
 * Explicit named stages rather than a spread of booleans. `ttsDone && !reviewed && !processed`
 * has eight combinations, six of which are nonsense, and nothing prevents writing them.
 */

/** The batch's position in the factory. Ordered; advancement is always to the next one. */
export const BATCH_STAGE = {
  SCRIPT_IMPORT: 'SCRIPT_IMPORT',
  TTS_GENERATION: 'TTS_GENERATION',
  VOICE_REVIEW: 'VOICE_REVIEW',
  VOICE_PROCESSING: 'VOICE_PROCESSING',
  STT: 'STT',
  ALIGNMENT: 'ALIGNMENT',
  SUBTITLE_VALIDATION: 'SUBTITLE_VALIDATION',
  /** The handoff. Everything past here is the existing, unchanged production pipeline. */
  AUDIO_READY: 'AUDIO_READY',
  VISUAL_PRODUCTION: 'VISUAL_PRODUCTION',
  AUDIO_FINISH: 'AUDIO_FINISH',
  QA: 'QA',
  PUBLISH_READY: 'PUBLISH_READY',
};

export const STAGE_ORDER = [
  BATCH_STAGE.SCRIPT_IMPORT,
  BATCH_STAGE.TTS_GENERATION,
  BATCH_STAGE.VOICE_REVIEW,
  BATCH_STAGE.VOICE_PROCESSING,
  BATCH_STAGE.STT,
  BATCH_STAGE.ALIGNMENT,
  BATCH_STAGE.SUBTITLE_VALIDATION,
  BATCH_STAGE.AUDIO_READY,
  BATCH_STAGE.VISUAL_PRODUCTION,
  BATCH_STAGE.AUDIO_FINISH,
  BATCH_STAGE.QA,
  BATCH_STAGE.PUBLISH_READY,
];

export const STAGE_META = {
  SCRIPT_IMPORT: { label: 'Script import', blurb: 'Scripts validated and stored.' },
  TTS_GENERATION: { label: 'TTS', blurb: 'Two takes generated for every episode.' },
  VOICE_REVIEW: { label: 'Voice review', blurb: 'The better delivery is chosen for each episode.' },
  VOICE_PROCESSING: { label: 'Voice processing', blurb: 'The existing conditioning chain runs on each winner.' },
  STT: { label: 'Transcription', blurb: 'Scribe hears the processed audio, independently of the script.' },
  ALIGNMENT: { label: 'Alignment', blurb: 'Known words are located in the processed audio.' },
  SUBTITLE_VALIDATION: { label: 'Subtitles', blurb: 'SRT built from canonical text and real timing.' },
  AUDIO_READY: { label: 'Audio ready', blurb: 'Handed to the existing visual pipeline.' },
  VISUAL_PRODUCTION: { label: 'Visual production', blurb: 'Storyboard, assets, render.' },
  AUDIO_FINISH: { label: 'Audio finish', blurb: 'Effects and mix.' },
  QA: { label: 'QA', blurb: 'Vision and audio gates.' },
  PUBLISH_READY: { label: 'Publish ready', blurb: 'Ready for the scheduler.' },
};

/** Per-episode state within whatever stage the batch is in. */
export const EPISODE_STATE = {
  SCRIPT_IMPORTED: 'SCRIPT_IMPORTED',

  TTS_PENDING: 'TTS_PENDING',
  TTS_RUNNING: 'TTS_RUNNING',
  TTS_COMPLETE: 'TTS_COMPLETE',
  TTS_FAILED: 'TTS_FAILED',

  VOICE_REVIEW_PENDING: 'VOICE_REVIEW_PENDING',
  VOICE_SELECTED: 'VOICE_SELECTED',
  /** Both takes failed the hard gates. Needs another round, or a human. */
  VOICE_REGEN_REQUIRED: 'VOICE_REGEN_REQUIRED',

  VOICE_PROCESSING: 'VOICE_PROCESSING',
  VOICE_PROCESSED: 'VOICE_PROCESSED',

  STT_PENDING: 'STT_PENDING',
  STT_COMPLETE: 'STT_COMPLETE',
  /** The transcript disagrees with the script in a way a person should look at. */
  STT_REVIEW_REQUIRED: 'STT_REVIEW_REQUIRED',

  ALIGNMENT_PENDING: 'ALIGNMENT_PENDING',
  ALIGNMENT_COMPLETE: 'ALIGNMENT_COMPLETE',

  SRT_VALIDATED: 'SRT_VALIDATED',
  AUDIO_READY: 'AUDIO_READY',

  FAILED: 'FAILED',
  EXCLUDED: 'EXCLUDED',
};

/**
 * What an episode must reach before the batch may leave a stage.
 *
 * The barrier is expressed as a target state per stage rather than as ad-hoc checks scattered
 * through the orchestrator, so "can this batch advance" is one comparison.
 */
export const STAGE_TARGET_STATE = {
  SCRIPT_IMPORT: EPISODE_STATE.SCRIPT_IMPORTED,
  TTS_GENERATION: EPISODE_STATE.TTS_COMPLETE,
  VOICE_REVIEW: EPISODE_STATE.VOICE_SELECTED,
  VOICE_PROCESSING: EPISODE_STATE.VOICE_PROCESSED,
  STT: EPISODE_STATE.STT_COMPLETE,
  ALIGNMENT: EPISODE_STATE.ALIGNMENT_COMPLETE,
  SUBTITLE_VALIDATION: EPISODE_STATE.SRT_VALIDATED,
};

/** States that satisfy a stage target -- later progress counts as satisfying an earlier gate. */
const SATISFIES = {
  [EPISODE_STATE.SCRIPT_IMPORTED]: 0,
  [EPISODE_STATE.TTS_COMPLETE]: 1,
  [EPISODE_STATE.VOICE_SELECTED]: 2,
  [EPISODE_STATE.VOICE_PROCESSED]: 3,
  [EPISODE_STATE.STT_COMPLETE]: 4,
  [EPISODE_STATE.ALIGNMENT_COMPLETE]: 5,
  [EPISODE_STATE.SRT_VALIDATED]: 6,
  [EPISODE_STATE.AUDIO_READY]: 7,
};

/**
 * May this batch move to the next stage?
 *
 * Every included episode must have reached the stage's target. An excluded episode does not
 * hold the batch: exclusion is the deliberate act of taking one out, and is recorded.
 */
export function canAdvance(stage, episodes) {
  const target = STAGE_TARGET_STATE[stage];
  if (!target) return { ok: false, reason: `${stage} does not advance automatically.` };

  const included = episodes.filter((e) => !e.excluded);
  if (!included.length) return { ok: false, reason: 'Every episode is excluded.' };

  const need = SATISFIES[target];
  const blocking = included.filter((e) => (SATISFIES[e.state] ?? -1) < need);

  return blocking.length
    ? {
      ok: false,
      reason: `${blocking.length} of ${included.length} episodes are not yet ${target}.`,
      blocking: blocking.map((e) => ({ episodeId: e.episode_id ?? e.episodeId, state: e.state })),
    }
    : { ok: true, ready: included.length };
}

export const nextStage = (stage) => STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1] ?? null;
