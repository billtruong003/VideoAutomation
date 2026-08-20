/* eslint-disable import/no-cycle */
/**
 * style.mjs — the Bill Finds Out copy rules, as data.
 *
 * Kept separate from the linter so the rules can be read, argued with and edited by a person
 * who does not want to read matching code. The prose version lives in
 * docs/youtube-control-plane/METADATA_STYLE_RULES.md and this file is its executable form.
 */

/**
 * Stock AI phrasing.
 *
 * These are PHRASES, not words. Banning "discover" would be absurd; banning "discover the
 * hidden secrets of" is not. Each entry is matched case-insensitively against the whole
 * candidate, so word-boundary noise is avoided.
 */
import { classifyFamily } from './title-engine.mjs';

export const STOCK_PHRASES = [
  'did you know', "you won't believe", 'you wont believe', "here's why", 'heres why',
  "let's dive in", 'lets dive in', "in today's video", 'in todays video',
  'ever wondered', 'ever wonder why', 'will blow your mind', 'mind-blowing',
  'game-changing', 'game changing', 'fascinating world of', 'unlock the secrets',
  'discover the hidden', "whether you're", 'whether youre', "here's the crazy part",
  'buckle up', 'the truth about', 'what happens next will', 'little did',
  'dive deep into', 'take a deep dive', 'in this video we', 'stay tuned',
];

/** Unearned intensity. Different failure from a stock phrase — this is dishonesty, not cliché. */
export const HYPE_WORDS = [
  'insane', 'crazy', 'shocking', 'unbelievable', 'jaw-dropping', 'mind blowing',
  'you need to', 'nobody talks about', "they don't want you to know",
  'dont want you to know', 'secret nobody', 'this changes everything', 'revolutionary',
];

/** Description openers that read as channel boilerplate. */
export const BANNED_OPENERS = [
  'welcome back', "don't forget to", 'dont forget to', 'in this exciting',
  'join us as we', 'hey guys', 'what is up', "what's up guys",
];

/**
 * Title grammar families.
 *
 * Order matters — the first match wins, so the more specific patterns are listed first.
 * `WHY` is the natural attractor for an explainer channel and is exactly the one that must
 * be rationed, which is why the family mix is tracked at all.
 */
export const TITLE_FAMILIES = [
  { id: 'NEGATION', test: /\b(aren't|isn't|arent|isnt|are not|is not|don't|dont)\b/i },
  { id: 'HIDDEN', test: /\b(hidden|real|actual)\s+(reason|purpose|job)\b/i },
  { id: 'OBJECT_JOB', test: /\bhas a (job|purpose|reason)\b|\bis doing\b|\bis there for\b/i },
  { id: 'HOW', test: /^how\b/i },
  { id: 'WHY', test: /^why\b/i },
  { id: 'CLAIM', test: /.*/ },
];

export const LIMITS = {
  titleMaxChars: 70,
  titleMaxEmoji: 1,
  titleMaxEmDash: 1,
  titleMaxColon: 1,
  descMinSentences: 1,
  descMaxSentences: 4,
  descMaxChars: 500,
  descMaxHashtags: 3,
  descMaxEmDash: 3,
  tagsMin: 5,
  tagsMax: 12,
  /** No grammar family may exceed this share of recent titles. */
  familyShareMax: 0.4,
  /** Trigram Jaccard similarity against recent copy above which we flag repetition. */
  noveltyMax: 0.45,
  /** How many recent uploads form the comparison window. */
  historyWindow: 20,
};

/**
 * Grammar family.
 *
 * Delegates to the title engine so there is ONE taxonomy. Keeping a second six-family table
 * here meant the live linter reported "HOW" on the same title the engine called "MECHANISM",
 * side by side on the same screen -- exactly the drift that duplicating a judgement always
 * produces. `TITLE_FAMILIES` above is retained only for the older linter's own reporting.
 */
export const classifyTitleFamily = (title) => classifyFamily(title ?? '');
