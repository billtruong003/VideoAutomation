/**
 * publish-defaults.mjs — the settings applied to every upload, and where each one lives.
 *
 * IMPORTANT DISTINCTION, and the reason this file exists separately from the channel config:
 * most of these are NOT channel-level Data API settings. YouTube has no endpoint that says
 * "default all future uploads to Education". Studio has such a screen, the Data API does not.
 *
 * So these are CREATOR OS defaults. They are stored locally and applied per video at publish
 * time by populating videos.insert. Pretending they were channel settings would mean claiming
 * a write that never happened, and the channel would silently not have them.
 *
 * Each entry records where it is actually enforced, so the final report can say so honestly.
 */

/** @typedef {'DATA_API_PER_VIDEO'|'CREATOR_OS_ONLY'|'NOT_AVAILABLE_THROUGH_API'} Enforcement */

export const PUBLISH_DEFAULTS = {
  /*
   * PRIVATE, always, at insert time.
   *
   * Not a preference. Until the project passes YouTube's API compliance audit, anything
   * uploaded by an unaudited client is forced private and `publishAt` cannot override it.
   * Writing "private" here matches what the API will do anyway, and makes the ceiling
   * visible instead of surprising.
   */
  privacyStatus: {
    value: 'private',
    field: 'status.privacyStatus',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'Forced by the compliance-audit gate regardless of what we send.',
  },

  categoryId: {
    // 27 = Education, in the US region category list.
    value: '27',
    label: 'Education',
    field: 'snippet.categoryId',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'Category ids are region-scoped; 27 is Education for the US list.',
  },

  defaultLanguage: {
    value: 'en',
    field: 'snippet.defaultLanguage',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'The language of the title and description.',
  },

  defaultAudioLanguage: {
    value: 'en',
    field: 'snippet.defaultAudioLanguage',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'The language actually spoken in the narration.',
  },

  captionLanguage: {
    value: 'en',
    field: 'captions.insert (separate call)',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'Captions are burned in AND an SRT track exists; uploading the track is its own call.',
  },

  license: {
    value: 'youtube',
    label: 'Standard YouTube License',
    field: 'status.license',
    enforcement: 'DATA_API_PER_VIDEO',
  },

  selfDeclaredMadeForKids: {
    value: false,
    field: 'status.selfDeclaredMadeForKids',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'Explainer content for a general audience; not directed at children.',
  },

  embeddable: {
    value: true,
    field: 'status.embeddable',
    enforcement: 'DATA_API_PER_VIDEO',
  },

  publicStatsViewable: {
    value: true,
    field: 'status.publicStatsViewable',
    enforcement: 'DATA_API_PER_VIDEO',
  },

  /*
   * Comments cannot be configured through the Data API at all. There is no field on
   * videos.insert for it, and the channel-level default lives only in Studio.
   */
  comments: {
    value: 'enabled',
    field: null,
    enforcement: 'NOT_AVAILABLE_THROUGH_API',
    note: 'No videos.insert field and no channel-level Data API setting. Studio only.',
  },

  /*
   * Shorts remixing is likewise Studio-only. Reported as unavailable rather than quietly
   * skipped, and definitely not achieved by driving Studio in a browser.
   */
  shortsRemixing: {
    value: 'allow',
    field: null,
    enforcement: 'NOT_AVAILABLE_THROUGH_API',
    note: 'No Data API surface. Set in Studio if it matters.',
  },

  playlist: {
    value: 'Hidden Reasons Behind Everyday Things',
    field: 'playlistItems.insert (after upload)',
    enforcement: 'DATA_API_PER_VIDEO',
    note: 'A separate call once the video id exists.',
  },
};

/**
 * Synthetic / altered content disclosure.
 *
 * Deliberately NOT hardcoded to one permanent answer, because the requirement is about what
 * the video shows, and a future batch may differ.
 *
 * For batch 001: every frame is a hand-drawn doodle animation with no photographic content,
 * no real person, no real voice cloned from a real person, and no depiction of a real event.
 * YouTube's disclosure requirement targets synthetic media that a viewer could mistake for
 * real -- realistic people, places or events. Nothing here is remotely mistakable for
 * reality, so the declaration is FALSE, per video, recorded explicitly rather than left
 * unanswered.
 *
 * The narration is an ElevenLabs synthetic voice. That is disclosed in the reasoning below
 * because it is the one element a reviewer would reasonably ask about: it is a synthetic
 * voice, but not a synthetic likeness of a real identifiable person, which is what the
 * disclosure asks about.
 */
export const SYNTHETIC_CONTENT = {
  containsSyntheticMedia: false,
  reviewed: true,
  reasoning:
    'Non-realistic hand-drawn animation throughout. No photorealistic people, places or '
    + 'events; nothing a viewer could mistake for real footage. Narration is a synthetic '
    + 'voice, but not an imitation of a real identifiable person.',
  appliesTo: 'batch-001',
};

/** Flattened for storage in a manifest. */
export const defaultsForManifest = () => ({
  privacyStatus: PUBLISH_DEFAULTS.privacyStatus.value,
  categoryId: PUBLISH_DEFAULTS.categoryId.value,
  categoryLabel: PUBLISH_DEFAULTS.categoryId.label,
  defaultLanguage: PUBLISH_DEFAULTS.defaultLanguage.value,
  defaultAudioLanguage: PUBLISH_DEFAULTS.defaultAudioLanguage.value,
  captionLanguage: PUBLISH_DEFAULTS.captionLanguage.value,
  license: PUBLISH_DEFAULTS.license.value,
  selfDeclaredMadeForKids: PUBLISH_DEFAULTS.selfDeclaredMadeForKids.value,
  embeddable: PUBLISH_DEFAULTS.embeddable.value,
  containsSyntheticMedia: SYNTHETIC_CONTENT.containsSyntheticMedia,
  syntheticReasoning: SYNTHETIC_CONTENT.reasoning,
});
