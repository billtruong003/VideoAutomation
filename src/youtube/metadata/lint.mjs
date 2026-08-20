/**
 * lint.mjs — the anti-AI copy linter.
 *
 * Runs on every metadata candidate before a human sees it. It is ADVISORY: it annotates and
 * ranks, it does not veto. A linter that blocks a good line is worse than one that flags it,
 * because the creator stops trusting it and turns it off.
 *
 * The design bet, stated plainly: the giveaway of machine-written channel copy is rarely any
 * single phrase. It is REPETITION and TEMPLATE RHYTHM — the same grammar, the same cadence,
 * the same opener, video after video. So half these checks compare a candidate against the
 * channel's own recent history rather than against a banned-word list.
 *
 * Rules live in ./style.mjs so they can be edited without reading this file.
 */

import {
  BANNED_OPENERS, HYPE_WORDS, LIMITS, STOCK_PHRASES, classifyTitleFamily,
} from './style.mjs';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const count = (s, re) => (s.match(re) ?? []).length;

/** Character trigrams — robust to word order, which is how rewrites disguise themselves. */
function trigrams(s) {
  const t = norm(s).replace(/\s/g, '');
  const out = new Set();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const issue = (severity, code, message, hint) => ({ severity, code, message, hint });

/**
 * Lint one candidate.
 *
 * @param candidate  { title, description?, tags? }
 * @param context    { history?: {title,description}[], facts?: string }
 *                   `facts` is the episode transcript / episode.json text that any factual
 *                   claim in the title must be traceable to.
 */
export function lintCandidate(candidate, context = {}) {
  const { title = '', description = '', tags = [] } = candidate;
  const { history = [], facts = '' } = context;
  const issues = [];

  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const both = `${lowerTitle} ${lowerDesc}`;

  // --- 1. stock AI phrasing ------------------------------------------------
  for (const p of STOCK_PHRASES) {
    if (both.includes(p)) {
      issues.push(issue('error', 'STOCK_PHRASE', `Stock AI phrasing: "${p}"`,
        'Say the specific thing instead. The phrase carries no information.'));
    }
  }

  // --- 2. unearned hype ----------------------------------------------------
  for (const w of HYPE_WORDS) {
    if (both.includes(w)) {
      issues.push(issue('error', 'FAKE_HYPE', `Unearned intensity: "${w}"`,
        'Only claim what the script supports. Overclaiming costs trust once, permanently.'));
    }
  }

  // --- 3. title mechanics --------------------------------------------------
  if (title.length > LIMITS.titleMaxChars) {
    issues.push(issue('error', 'TITLE_TOO_LONG',
      `Title is ${title.length} chars (limit ${LIMITS.titleMaxChars})`,
      'Shorts surfaces truncate hard. Front-load the object and the claim.'));
  }
  if (count(title, EMOJI) > LIMITS.titleMaxEmoji) {
    issues.push(issue('warn', 'TITLE_EMOJI', 'More than one emoji in the title'));
  }
  if (count(title, /—/g) > LIMITS.titleMaxEmDash) {
    issues.push(issue('warn', 'EM_DASH', 'Em-dash habit in the title',
      'Em-dashes are the most reliable tell of generated copy.'));
  }
  if (count(title, /:/g) > LIMITS.titleMaxColon) {
    issues.push(issue('warn', 'COLON_HABIT', 'More than one colon in the title'));
  }
  if (/[!?]{2,}|!\?|\?!/.test(title)) {
    issues.push(issue('error', 'CLICKBAIT_PUNCT', 'Clickbait punctuation'));
  }
  const caps = title.split(/\s+/).filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (caps.length) {
    issues.push(issue('warn', 'ALL_CAPS', `ALL-CAPS word(s): ${caps.join(', ')}`));
  }

  // --- 4. description shape ------------------------------------------------
  if (description) {
    const sentences = description.split(/[.!?]+\s/).filter((s) => s.trim().length > 2);
    if (sentences.length > LIMITS.descMaxSentences) {
      issues.push(issue('warn', 'DESC_TOO_LONG',
        `${sentences.length} sentences (Shorts want ${LIMITS.descMinSentences}–${LIMITS.descMaxSentences})`,
        'A description is not the script again.'));
    }
    for (const opener of BANNED_OPENERS) {
      if (lowerDesc.trimStart().startsWith(opener)) {
        issues.push(issue('error', 'BOILERPLATE_OPENER', `Boilerplate opener: "${opener}"`));
      }
    }
    const hashtags = count(description, /#\w+/g);
    if (hashtags > LIMITS.descMaxHashtags) {
      issues.push(issue('warn', 'HASHTAG_STUFFING', `${hashtags} hashtags (max ${LIMITS.descMaxHashtags})`));
    }
    if (count(description, /—/g) > LIMITS.descMaxEmDash) {
      issues.push(issue('warn', 'EM_DASH', 'Em-dash habit in the description'));
    }
    // Uniform sentence length is a machine rhythm; humans vary.
    if (sentences.length >= 3) {
      const lens = sentences.map((s) => s.trim().length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const spread = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length) / mean;
      if (spread < 0.15) {
        issues.push(issue('warn', 'UNIFORM_CADENCE', 'Every sentence is nearly the same length',
          'Vary the rhythm. Identical cadence reads as generated.'));
      }
    }
  }

  // --- 5. three-adjective run ---------------------------------------------
  if (/\b(\w+),\s*(\w+),\s*and\s+(\w+)\b/i.test(`${title} ${description}`)) {
    issues.push(issue('warn', 'RULE_OF_THREE', 'Three-item list rhythm',
      'The "simple, clever, and surprising" cadence is a strong AI tell.'));
  }

  // --- 6. tags -------------------------------------------------------------
  if (tags.length) {
    if (tags.length > LIMITS.tagsMax) {
      issues.push(issue('warn', 'TAG_STUFFING', `${tags.length} tags (max ${LIMITS.tagsMax})`));
    }
    if (tags.length < LIMITS.tagsMin) {
      issues.push(issue('warn', 'TOO_FEW_TAGS', `${tags.length} tags (min ${LIMITS.tagsMin})`));
    }
  }

  // --- 7. factual alignment -----------------------------------------------
  // Every number and unit in the title must be traceable to the episode's own material.
  // This is the check that stops CTR pressure inventing facts.
  if (facts) {
    const factNorm = norm(facts);
    for (const m of title.matchAll(/\b\d[\d,.]*\s*(?:%|percent|feet|foot|ft|metres?|meters?|m|years?|mm|cm|inches?)?\b/gi)) {
      const claim = norm(m[0]);
      if (claim && !factNorm.includes(claim.replace(/\s+/g, ' '))) {
        issues.push(issue('error', 'UNSUPPORTED_CLAIM',
          `"${m[0].trim()}" does not appear in the episode's own material`,
          'Use the figure the narration actually says, or drop it.'));
      }
    }
  }

  // --- 8. novelty against the channel's own recent copy --------------------
  const recent = history.slice(0, LIMITS.historyWindow);
  let maxSim = 0;
  let mostSimilar = null;
  const tTri = trigrams(title);
  for (const h of recent) {
    const s = jaccard(tTri, trigrams(h.title ?? ''));
    if (s > maxSim) { maxSim = s; mostSimilar = h.title; }
  }
  if (maxSim > LIMITS.noveltyMax) {
    issues.push(issue('warn', 'TOO_SIMILAR',
      `${Math.round(maxSim * 100)}% similar to a recent title: "${mostSimilar}"`,
      'Find a different angle on the reveal.'));
  }

  // same opening two words as something recent
  const open2 = words(title).slice(0, 2).join(' ');
  if (open2 && recent.some((h) => words(h.title ?? '').slice(0, 2).join(' ') === open2)) {
    issues.push(issue('warn', 'REPEATED_OPENER', `Recent title already opens "${open2}…"`));
  }

  // --- 9. grammar family mix ----------------------------------------------
  const family = classifyTitleFamily(title);
  const recentFamilies = recent.slice(0, 10).map((h) => classifyTitleFamily(h.title ?? ''));
  const share = recentFamilies.length
    ? (recentFamilies.filter((f) => f === family).length + 1) / (recentFamilies.length + 1)
    : 0;
  if (share > LIMITS.familyShareMax) {
    issues.push(issue('warn', 'FAMILY_OVERUSE',
      `"${family}" would be ${Math.round(share * 100)}% of recent titles (max ${LIMITS.familyShareMax * 100}%)`,
      'Rotate the grammar. Repeated structure is the loudest template signal.'));
  }

  return {
    title, family,
    issues,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
    novelty: 1 - maxSim,
    score: scoreCandidate({ title, description, tags }, issues, 1 - maxSim),
  };
}

/**
 * Rank a candidate on explainable sub-scores.
 *
 * Explicitly NOT scored: predicted views, "virality", or any implied algorithm probability.
 * We have no data supporting such a number, and presenting one would mislead the creator and
 * sail close to the API policy line on derived metrics.
 */
function scoreCandidate({ title, description, tags }, issues, novelty) {
  const w = words(title);

  // specificity: concrete nouns and numbers beat vague ones
  const vague = ['thing', 'things', 'stuff', 'something', 'this', 'that'];
  const specificity = clamp(
    0.4 + (/\d/.test(title) ? 0.2 : 0) + (w.length >= 5 ? 0.2 : 0)
      - vague.filter((v) => w.includes(v)).length * 0.15 + 0.2,
  );

  // clarity: short enough to read at a glance, not so short it says nothing
  const clarity = clamp(title.length <= 60 ? 1 : title.length <= 70 ? 0.75 : 0.35);

  // truthfulness and fit are driven by the issues found
  const truthfulness = clamp(1 - issues.filter((i) =>
    ['UNSUPPORTED_CLAIM', 'FAKE_HYPE'].includes(i.code)).length * 0.5);
  const channelFit = clamp(1 - issues.filter((i) =>
    ['STOCK_PHRASE', 'BOILERPLATE_OPENER', 'CLICKBAIT_PUNCT', 'ALL_CAPS'].includes(i.code)).length * 0.34);
  const curiosity = clamp(0.5 + (/\b(why|how|hidden|actually|isn't|aren't)\b/i.test(title) ? 0.3 : 0)
    + (description ? 0.1 : 0) + (tags?.length ? 0.1 : 0));

  const parts = { clarity, curiosity, specificity, truthfulness, channelFit, novelty: clamp(novelty) };
  const overall = (parts.clarity * 0.2 + parts.curiosity * 0.15 + parts.specificity * 0.2
    + parts.truthfulness * 0.25 + parts.channelFit * 0.1 + parts.novelty * 0.1);
  return { ...parts, overall: Math.round(overall * 100) / 100 };
}

const clamp = (n) => Math.max(0, Math.min(1, n));

/** Lint and rank a set of candidates. Errors sink a candidate; warnings only nudge it. */
export function rankCandidates(candidates, context) {
  return candidates
    .map((c) => lintCandidate(c, context))
    .sort((a, b) =>
      a.errors - b.errors ||
      b.score.overall - a.score.overall ||
      a.warnings - b.warnings);
}
