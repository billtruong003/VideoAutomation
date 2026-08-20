/**
 * tags.mjs — tag generation, classification, normalisation and budgeting.
 *
 * Tags are NOT a major growth lever and this file does not pretend otherwise. What they can
 * be is clean, relevant and correctly sized — which the previous comma-separated text box
 * could not guarantee.
 *
 * THE BUDGET IS THE PART EVERYONE GETS WRONG. Per the videos resource documentation:
 *
 *   - the limit is 500 characters across ALL tags
 *   - a tag containing a space is treated as though wrapped in quotation marks, and those
 *     quotes count: "Foo Baz" costs 9, "Foo-Baz" costs 7
 *   - the commas between items count too
 *
 * So the cost of a tag list is not `join(',').length`. `budgetOf` implements the real rule,
 * and the UI shows the number it produces.
 */

/** Where a tag came from, and how confident we are that it belongs. */
export const TAG_TYPE = {
  EXACT_SUBJECT: { label: 'Exact subject', relevance: 'HIGH' },
  MECHANISM: { label: 'Mechanism', relevance: 'HIGH' },
  NATURAL_QUERY: { label: 'Natural query', relevance: 'HIGH' },
  SYNONYM: { label: 'Synonym', relevance: 'MEDIUM' },
  CHANNEL_CLUSTER: { label: 'Channel cluster', relevance: 'MEDIUM' },
  BROAD: { label: 'Broad', relevance: 'LOW' },
  MANUAL: { label: 'Manual', relevance: 'HIGH' },
};

/** Official limit: 500 characters total across all tags. */
export const TAG_CHAR_BUDGET = 500;
export const TAG_COUNT_TARGET = { min: 5, max: 15 };

/**
 * Filler tags that add nothing and make a channel look like every other channel.
 * Blocked by default; a user can still type one deliberately.
 */
const FILLER = new Set([
  'viral', 'fyp', 'foryou', 'foryoupage', 'trending', 'trend', 'youtube', 'shorts',
  'wow', 'omg', 'mindblown', 'mind blown', 'funfacts', 'fun facts', 'facts',
  'interesting', 'amazing', 'incredible', 'satisfying', 'must watch', 'viral video',
  'subscribe', 'like', 'explore', 'reels', 'tiktok',
]);

/** The channel's own semantic anchors. These recur by design; episode tags must not. */
const CHANNEL_CLUSTER = ['how things work', 'hidden design', 'everyday objects', 'why things are'];

/**
 * True cost of a tag list under the API's counting rules.
 * Exposed so the UI can show a real budget rather than a guess.
 */
export function budgetOf(tags) {
  if (!tags.length) return 0;
  const chars = tags.reduce((sum, t) => sum + t.length + (/\s/.test(t) ? 2 : 0), 0);
  return chars + (tags.length - 1); // separating commas count
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Crude but effective singularisation, for near-duplicate detection only. */
const stem = (w) =>
  w.endsWith('ies') ? `${w.slice(0, -3)}y`
    : w.endsWith('ses') || w.endsWith('xes') ? w.slice(0, -2)
      : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;

const stemKey = (t) => norm(t).split(' ').map(stem).sort().join(' ');

/**
 * Deduplicate.
 *
 * Two passes: exact after normalisation, then near-duplicate by sorted stems, which collapses
 * "airplane window hole" / "airplane windows hole" / "hole airplane window" onto one entry.
 * The first occurrence wins because generation emits higher-relevance types first.
 */
export function dedupeTags(tags) {
  const seenExact = new Set();
  const seenStem = new Set();
  const kept = [];
  const dropped = [];

  for (const raw of tags) {
    const t = typeof raw === 'string' ? { text: raw, type: 'MANUAL' } : raw;
    const text = norm(t.text);
    if (!text) continue;

    if (seenExact.has(text)) { dropped.push({ ...t, reason: 'duplicate' }); continue; }
    const key = stemKey(text);
    if (seenStem.has(key)) { dropped.push({ ...t, reason: 'near-duplicate' }); continue; }

    seenExact.add(text);
    seenStem.add(key);
    kept.push({ ...t, text });
  }
  return { kept, dropped };
}

/**
 * Generate candidate tags from the episode's own material.
 *
 * Every tag traces to something real: the slug, the transcript, or the channel's fixed
 * cluster. Nothing is invented from "what tends to trend".
 */
export function generateTags(brief, { transcript = '' } = {}) {
  const object = norm(brief.coreObject ?? '');
  const words = object.split(' ').filter(Boolean);
  const out = [];
  const add = (text, type) => { if (text && text.trim()) out.push({ text: text.trim(), type }); };

  // A. EXACT SUBJECT — the thing itself, and its head noun pair.
  add(object, 'EXACT_SUBJECT');
  if (words.length > 2) add(words.slice(-2).join(' '), 'EXACT_SUBJECT');
  if (words.length > 1) add(words.slice(0, 2).join(' '), 'EXACT_SUBJECT');

  // B. MECHANISM — real technical terms, taken only if the transcript actually says them.
  const t = norm(transcript);
  for (const term of MECHANISM_TERMS) {
    if (t.includes(term)) add(term, 'MECHANISM');
  }

  // C. NATURAL QUERY — how a person would actually type the question.
  if (words.length >= 2) {
    add(`why ${plural(words[0])} have ${words.slice(1).join(' ')}`, 'NATURAL_QUERY');
    add(`what is the ${words.slice(-2).join(' ')} for`, 'NATURAL_QUERY');
  }

  // D. SYNONYM — only from a curated map, never invented.
  for (const [from, to] of Object.entries(SYNONYMS)) {
    if (object.includes(from)) add(object.replace(from, to), 'SYNONYM');
  }

  // E. CHANNEL CLUSTER — the anchors that recur across the channel by design.
  for (const c of CHANNEL_CLUSTER.slice(0, 2)) add(c, 'CHANNEL_CLUSTER');

  const { kept, dropped } = dedupeTags(out);
  return { candidates: kept.map(decorate), dropped };
}

const decorate = (t) => ({
  text: t.text,
  type: t.type,
  relevance: TAG_TYPE[t.type]?.relevance ?? 'MEDIUM',
  cost: t.text.length + (/\s/.test(t.text) ? 2 : 0),
  locked: false,
});

const plural = (w) => (w.endsWith('s') ? w : /(?:ch|sh|x|s)$/.test(w) ? `${w}es` : `${w}s`);

/** Technical vocabulary this channel's scripts genuinely use. */
const MECHANISM_TERMS = [
  'pressure', 'air pressure', 'breather hole', 'vent', 'diaphragm', 'wavelength',
  'conductive', 'mesh', 'safety', 'friction', 'gravity', 'volatile', 'vanillin',
  'perspective', 'lane marking', 'manhole', 'escalator', 'gas pump', 'microwave',
  'pocket watch', 'airway', 'valve', 'sensor', 'equalize', 'equalise',
];

const SYNONYMS = {
  airplane: 'aircraft',
  'gas pump': 'fuel pump',
  jeans: 'denim',
  manhole: 'sewer cover',
  'pen cap': 'pen lid',
};

/**
 * Lint a final tag set.
 *
 * Advisory, like the copy linter. Over-budget is an ERROR because YouTube will reject it;
 * everything else is a warning the creator may knowingly accept.
 */
export function lintTags(tags, { history = [] } = {}) {
  const texts = tags.map((t) => (typeof t === 'string' ? t : t.text));
  const issues = [];
  const budget = budgetOf(texts);

  if (budget > TAG_CHAR_BUDGET) {
    issues.push({
      severity: 'error', code: 'TAG_BUDGET_EXCEEDED',
      message: `${budget} of ${TAG_CHAR_BUDGET} characters — YouTube will reject this.`,
      hint: 'Tags with spaces cost two extra characters each, and the commas count too.',
    });
  } else if (budget > TAG_CHAR_BUDGET * 0.9) {
    issues.push({ severity: 'warn', code: 'TAG_BUDGET_TIGHT', message: `${budget} of ${TAG_CHAR_BUDGET} characters used.` });
  }

  if (texts.length > TAG_COUNT_TARGET.max) {
    issues.push({ severity: 'warn', code: 'TOO_MANY_TAGS', message: `${texts.length} tags (target ${TAG_COUNT_TARGET.max}).`, hint: 'Extra near-duplicates dilute rather than help.' });
  }
  if (texts.length && texts.length < TAG_COUNT_TARGET.min) {
    issues.push({ severity: 'warn', code: 'TOO_FEW_TAGS', message: `${texts.length} tags (target at least ${TAG_COUNT_TARGET.min}).` });
  }

  const filler = texts.filter((t) => FILLER.has(norm(t)));
  if (filler.length) {
    issues.push({
      severity: 'warn', code: 'FILLER_TAG',
      message: `Generic filler: ${filler.join(', ')}`,
      hint: 'These describe every channel on YouTube, so they describe none.',
    });
  }

  const { dropped } = dedupeTags(texts);
  if (dropped.length) {
    issues.push({ severity: 'warn', code: 'NEAR_DUPLICATE_TAGS', message: `Near-duplicates: ${dropped.map((d) => d.text).join(', ')}` });
  }

  for (const t of texts) {
    if (t.length > 60) issues.push({ severity: 'warn', code: 'TAG_TOO_LONG', message: `"${t.slice(0, 40)}…" is very long.` });
    if (/[<>]/.test(t)) issues.push({ severity: 'error', code: 'TAG_INVALID_CHAR', message: `"${t}" contains < or >, which the API rejects.` });
  }

  // Episode tags should vary. Channel anchors recurring is fine and expected.
  if (history.length >= 3) {
    const episodeTags = texts.filter((t) => !CHANNEL_CLUSTER.includes(norm(t)));
    const overlap = episodeTags.filter((t) => history.filter((h) => h.includes(norm(t))).length >= 3);
    if (overlap.length >= 3) {
      issues.push({
        severity: 'warn', code: 'TAG_BLOCK_REPEATED',
        message: `${overlap.length} tags appear on most recent videos: ${overlap.slice(0, 4).join(', ')}`,
        hint: 'Channel anchors may repeat; episode-specific tags should not.',
      });
    }
  }

  return {
    issues,
    budget,
    budgetLimit: TAG_CHAR_BUDGET,
    budgetPct: Math.round((budget / TAG_CHAR_BUDGET) * 100),
    count: texts.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
  };
}
