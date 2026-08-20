/**
 * title-config.mjs — every number the title engine uses, in one file.
 *
 * Weights buried inside scoring functions cannot be argued with, and cannot be shown to the
 * creator. Both matter: a deterministic engine whose constants are scattered across three
 * modules is only nominally deterministic, because nobody can see what it is doing.
 *
 * Editing is developer-only for now. The Settings screen READS this and displays it.
 */

/**
 * Layer A — hard gates.
 *
 * Pass or fail, never a deduction. A gate exists for exactly one reason: because no amount of
 * editorial strength should be allowed to compensate for that failure. If a rule could
 * reasonably be traded off against curiosity, it belongs in Layer C instead.
 */
export const HARD_GATES = [
  { id: 'NO_EMPTY_TITLE', label: 'Not empty' },
  { id: 'YOUTUBE_TITLE_VALID', label: 'Valid for the API' },
  { id: 'GRAMMAR_VALID', label: 'Grammatical' },
  { id: 'FACTUAL_SUPPORT', label: 'Factually supported' },
  { id: 'NO_SOURCE_CONTRADICTION', label: 'Does not contradict the source' },
  { id: 'NO_FABRICATED_NUMBER', label: 'No invented number' },
  { id: 'NO_FABRICATED_PROPER_NOUN', label: 'No invented name' },
  { id: 'NO_MISLEADING_PROMISE', label: 'Promise matches the video' },
  { id: 'NO_MATERIAL_PAYOFF_CONTRADICTION', label: 'Agrees with the payoff' },
  { id: 'NO_NEAR_DUPLICATE_OF_EXISTING_EXACT_TITLE', label: 'Not already used' },
];

/**
 * Layer B — editorial dimensions. Points, summing to 100.
 *
 * Note what is NOT here: truthfulness. It was a 0.25-weight dimension in the old scorer, which
 * meant an invented figure cost 12.5 points and could be bought back with a snappier phrasing.
 * It is now `FACTUAL_SUPPORT` in Layer A, where it cannot be traded.
 */
export const EDITORIAL_DIMENSIONS = [
  { id: 'clarity', label: 'Clarity', max: 18, note: 'Parsable during a fast scroll.' },
  { id: 'curiosity', label: 'Curiosity gap', max: 16, note: 'Leaves a question the viewer wants closed.' },
  { id: 'promiseAlignment', label: 'Promise alignment', max: 12, note: 'Sells the reveal the video actually delivers.' },
  { id: 'specificity', label: 'Specificity', max: 10, note: 'Names a concrete thing, not an abstraction.' },
  { id: 'scrollReadability', label: 'Scroll readability', max: 8, note: 'Understood in about a second.' },
  { id: 'oddity', label: 'Oddity', max: 7, note: 'Something visibly or conceptually weird.' },
  { id: 'channelFit', label: 'Channel fit', max: 6, note: 'Hidden reasons behind everyday things.' },
  { id: 'familiarity', label: 'Familiarity', max: 6, note: 'The object is recognisable to anyone.' },
  { id: 'cognitiveFriction', label: 'Cognitive friction', max: 6, note: '"Wait — that IS true. Why?"' },
  { id: 'personalRelevance', label: 'Personal relevance', max: 4, note: 'Connects to the viewer where natural.' },
  { id: 'openLoop', label: 'Open loop', max: 4, note: 'Enough unanswered to justify watching.' },
  { id: 'microTension', label: 'Micro-tension', max: 3, note: 'A small contradiction, without hype.' },
];

export const EDITORIAL_TOTAL = EDITORIAL_DIMENSIONS.reduce((n, d) => n + d.max, 0); // 100

/**
 * Layer C — history and style penalties. Maximum deduction each.
 *
 * Applied proportionally: a penalty reaching its maximum should mean the failure is total, not
 * merely present. Mechanically slamming every violation to its cap produces a scorer that
 * ranks by "how many rules did you break" rather than "how badly".
 */
export const PENALTIES = [
  { id: 'GRAMMAR_FAMILY_REPETITION', label: 'Grammar family repeated', max: 10 },
  { id: 'OPENING_PHRASE_REPETITION', label: 'Opening phrase repeated', max: 6 },
  { id: 'SEMANTIC_SIMILARITY', label: 'Similar to a recent title', max: 8 },
  { id: 'CADENCE_SIMILARITY', label: 'Same rhythm as recent titles', max: 5 },
  { id: 'REPEATED_KEYWORD', label: 'Keyword or adjective reused', max: 4 },
  { id: 'SPOILER', label: 'Gives away the payoff', max: 12 },
  { id: 'AI_CLICKBAIT_STYLE', label: 'Reads as generated or baity', max: 12 },
  { id: 'OVERCOMPLEXITY', label: 'Too complex to parse quickly', max: 6 },
  { id: 'PUNCTUATION_ABUSE', label: 'Caps, emoji or punctuation abuse', max: 6 },
];

export const TITLE_CONFIG = {
  /** YouTube's hard limit is 100. 70 is the house rule: Shorts surfaces truncate earlier. */
  hardMaxChars: 100,
  houseMaxChars: 70,
  idealMaxChars: 60,
  minChars: 12,

  /** Candidate pool before gates. The brief asks for 16-24; the generator targets the top. */
  candidateTarget: 24,
  candidateMin: 16,

  /** Recent titles compared against. Includes the current unpublished batch. */
  historyWindow: 20,

  /** Trigram Jaccard above which two titles are "semantically similar". */
  semanticSimilarityThreshold: 0.45,
  /** Above this, they are effectively the same title. */
  semanticDuplicateThreshold: 0.72,

  /** No grammar family may exceed this share of the batch or of recent history. */
  familyShareMax: 0.4,

  /**
   * Batch optimisation. Diversity is worth real points, but not enough to promote a weak
   * title over a strong one -- a batch of ten mediocre-but-varied titles is not the goal.
   */
  batch: {
    diversityWeight: 0.45,
    beamWidth: 40,
    restarts: 6,
  },
};

/** Everything the Settings screen needs, in one serialisable object. */
export const titleScoringConfig = {
  hardGates: HARD_GATES,
  editorialDimensions: EDITORIAL_DIMENSIONS,
  editorialTotal: EDITORIAL_TOTAL,
  penalties: PENALTIES,
  limits: TITLE_CONFIG,
};
