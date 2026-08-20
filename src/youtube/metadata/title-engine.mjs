/**
 * title-engine.mjs — pick the strongest true title, and be able to explain why.
 *
 * THREE LAYERS THAT NEVER MIX.
 *
 *   A. HARD GATES        pass / fail. A failure rejects the candidate.
 *   B. EDITORIAL SCORE   0-100 across twelve weighted dimensions.
 *   C. HISTORY PENALTIES proportional deductions for repeating the channel.
 *
 *   TITLE_SELECTION_SCORE = clamp(EDITORIAL - PENALTIES, 0, 100)
 *
 * The separation is the point. The scorer this replaces folded truthfulness in as a 0.25-weight
 * dimension, so an invented "30,000 feet" cost twelve points and a snappier phrasing bought
 * them straight back. A title that says something the episode does not is not a weaker title;
 * it is not a candidate. That belongs in Layer A and nowhere else.
 *
 * WHAT THIS SCORE IS NOT. It is not a prediction of views, virality, or anything about the
 * recommendation system. We have no data that could support such a number. It answers one
 * narrower question: how strong is this title editorially, for this specific episode, on this
 * specific channel, given what the channel has already published?
 *
 * Every number lives in ./title-config.mjs so the whole engine can be read and argued with.
 */

import {
  EDITORIAL_DIMENSIONS, HARD_GATES, PENALTIES, TITLE_CONFIG,
} from './title-config.mjs';
import { HYPE_WORDS, STOCK_PHRASES } from './style.mjs';

/* ============================================================ text helpers */

const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
const wordsOf = (s) => norm(s).split(' ').filter(Boolean);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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

/** Crude singularisation, for near-duplicate keyword detection only. */
const stem = (w) =>
  w.endsWith('ies') ? `${w.slice(0, -3)}y`
    : w.endsWith('sses') || w.endsWith('shes') || w.endsWith('ches') ? w.slice(0, -2)
      : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'at',
  'for', 'with', 'and', 'or', 'but', 'that', 'this', 'these', 'those', 'it', 'its', 'as',
  'has', 'have', 'had', 'do', 'does', 'did', 'you', 'your', 'we', 'they', 'there', 'here',
  'why', 'how', 'what', 'when', 'where', 'who', 'not', 'so', 'can', 'will', 'just', 'from',
  'by', 'about', 'into', 'than', 'then', 'actually', 'really',
]);

const contentWords = (s) => wordsOf(s).filter((w) => !STOPWORDS.has(w) && w.length > 2);

/**
 * Ordinary English that carries no factual claim.
 *
 * Used only by the factual gate, to separate "words this title happens to use" from "subject
 * matter this title asserts". Saying a pump "stops" is not a claim about pumps that needs
 * sourcing; saying it does so at "30,000 PSI" is, and that is a different gate.
 */
const COMMON_WORDS = new Set([
  'actually', 'really', 'know', 'knows', 'stop', 'stops', 'work', 'works', 'working',
  'make', 'makes', 'made', 'use', 'uses', 'used', 'using', 'look', 'looks', 'looking',
  'think', 'thinks', 'guess', 'want', 'need', 'take', 'takes', 'get', 'gets', 'got',
  'come', 'comes', 'give', 'gives', 'find', 'finds', 'keep', 'keeps', 'put', 'puts',
  'thing', 'things', 'way', 'ways', 'time', 'times', 'reason', 'reasons', 'job', 'jobs',
  'purpose', 'point', 'part', 'parts', 'kind', 'sort', 'something', 'anything', 'nothing',
  'everything', 'someone', 'nobody', 'everyone', 'people', 'lot', 'bit', 'one', 'two',
  'because', 'since', 'while', 'until', 'after', 'before', 'through', 'without', 'inside',
  'outside', 'around', 'behind', 'between', 'under', 'over', 'above', 'below', 'down', 'out',
  'good', 'bad', 'big', 'small', 'tiny', 'little', 'long', 'short', 'high', 'low', 'new',
  'old', 'real', 'actual', 'true', 'right', 'wrong', 'same', 'different', 'own', 'other',
  'more', 'most', 'less', 'least', 'many', 'much', 'few', 'every', 'each', 'both', 'all',
  'weird', 'odd', 'strange', 'simple', 'easy', 'hard', 'better', 'best', 'worse', 'worst',
  'hidden', 'secret', 'exist', 'exists', 'happen', 'happens', 'mean', 'means', 'let', 'lets',
  'never', 'always', 'still', 'even', 'also', 'only', 'never', 'yet', 'ever', 'again',
  'function', 'functions', 'mechanism', 'mechanisms', 'automatic', 'design', 'designed',
  'believe', 'believes', 'story', 'truth', 'fact', 'facts', 'answer', 'question',
  'mistake', 'accident', 'accidental', 'deliberate', 'explains', 'explain', 'nobody',
  'seems', 'guessed', 'expected', 'obvious', 'pointless', 'useless', 'clever', 'stranger',
]);

/* ============================================ grammar families (ten of them) */

/**
 * Ordered, first match wins, most specific first.
 *
 * The old table had six with a `/.*​/` catch-all absorbing everything, which made family
 * statistics look more meaningful than they were. `SHORT_DECLARATIVE` is now the fallback and
 * it is a real category rather than a bucket.
 */
export const GRAMMAR_FAMILIES = [
  { id: 'QUESTION', label: 'Question', test: (t) => /\?\s*$/.test(t.trim()) },
  { id: 'CONTRADICTION', label: 'Contradiction', test: (t) => /\b(aren'?t|isn'?t|are not|is not|don'?t|doesn'?t|never|not (?:actually|really|there))\b/i.test(t) },
  { id: 'HIDDEN_REASON', label: 'Hidden reason', test: (t) => /\b(hidden|real|actual|secret)\s+(reason|purpose|point)\b/i.test(t) },
  { id: 'HIDDEN_FUNCTION', label: 'Hidden function', test: (t) => /\b(has|had|does|doing)\s+(a|one|its|real)?\s*(job|purpose|reason|task)\b|\bis (?:there|doing)\b/i.test(t) },
  { id: 'OBJECT_MYSTERY', label: 'Object mystery', test: (t) => /^(that|this|the)\s+(tiny|little|small|weird|odd|strange|extra|spare)\b/i.test(t.trim()) },
  { id: 'MECHANISM', label: 'Mechanism', test: (t) => /^how\b/i.test(t.trim()) },
  { id: 'PERSONAL_RELEVANCE', label: 'Personal relevance', test: (t) => /\byour\b/i.test(t) },
  { id: 'UNEXPECTED_FACT', label: 'Unexpected fact', test: (t) => /\b(way|far|much)\s+(bigger|longer|smaller|older|heavier|more)\b|\bthan (?:they|you|it) look/i.test(t) },
  { id: 'OBSERVATION', label: 'Observation', test: (t) => /^why\b/i.test(t.trim()) },
  { id: 'SHORT_DECLARATIVE', label: 'Short declarative', test: () => true },
];

export const classifyFamily = (title) =>
  GRAMMAR_FAMILIES.find((f) => f.test(title ?? ''))?.id ?? 'SHORT_DECLARATIVE';

/* ================================================== LAYER A — hard gates */

/**
 * Numbers and units the title asserts.
 * Bare small integers are skipped: "One Job" is not a factual claim about quantity.
 */
const NUMERIC_CLAIM = /\b\d[\d,.]*\s*(?:%|percent|feet|foot|ft|miles?|metres?|meters?|m\b|years?|mm|cm|inches?|inch|psi|degrees?|volts?|watts?|mph|km\/h|kg|lbs?)?\b/gi;

/** Capitalised multi-word names, ignoring sentence-initial and title-case noise. */
function properNouns(title) {
  const out = [];
  /*
   * Deciding "is this a name?" from a title-cased string alone is not possible, so this looks
   * only for the shapes that actually mislead a viewer: acronyms, and Xx & Xx brand pairs.
   *
   * ALL-CAPS ordinary words ("You Won't BELIEVE") are shouting, not a name. Treating them as
   * fabricated proper nouns rejected the right candidate for the wrong reason and buried the
   * real finding; shouting is punctuation abuse and is penalised there instead.
   */
  for (const m of (title.match(/\b[A-Z]{2,6}\b/g) ?? [])) {
    if (!COMMON_WORDS.has(m.toLowerCase())) out.push(m);
  }
  for (const m of (title.match(/\b[A-Z][a-z]+\s?&\s?[A-Z][a-z]+\b/g) ?? [])) out.push(m);
  return out;
}

const ACRONYM_ALLOW = new Set(['A', 'I', 'TV', 'US', 'UK', 'DIY', 'LED', 'USB', 'PSI']);

/**
 * Run every hard gate.
 *
 * @returns {{ passed: boolean, gates: {id,label,pass,detail}[], evidence: object }}
 */
export function runHardGates(title, ctx = {}) {
  const {
    facts = '', script = '', payoff = '', existingTitles = [], coreObject = '',
  } = ctx;

  const source = norm(`${facts} ${script}`);
  const t = (title ?? '').trim();
  const results = [];
  const evidence = { supportedTerms: [], numericClaims: [], matchedSentence: null };

  const gate = (id, pass, detail = null) => {
    const meta = HARD_GATES.find((g) => g.id === id);
    results.push({ id, label: meta?.label ?? id, pass, detail });
  };

  // --- NO_EMPTY_TITLE
  gate('NO_EMPTY_TITLE', t.length >= TITLE_CONFIG.minChars,
    t.length < TITLE_CONFIG.minChars ? `Only ${t.length} characters.` : null);

  // --- YOUTUBE_TITLE_VALID
  const apiInvalid = t.length > TITLE_CONFIG.hardMaxChars ? `${t.length} chars, API limit is ${TITLE_CONFIG.hardMaxChars}.`
    : /[<>]/.test(t) ? 'Contains < or >, which the API rejects.'
      : null;
  gate('YOUTUBE_TITLE_VALID', !apiInvalid, apiInvalid);

  // --- GRAMMAR_VALID
  // Not a parser. It catches the shapes a template generator actually produces when its slot
  // values are wrong: doubled articles, a dangling preposition, "a" before a vowel.
  const g = wordsOf(t);
  const grammarProblem =
    /\b(a|an|the)\s+(a|an|the)\b/i.test(t) ? 'Doubled article.'
      /*
       * A stranded preposition is correct English in a wh-question -- "What Is That Hole
       * FOR?" -- so this fires only on statements, where it signals a truncated template.
       */
      : !/^(what|who|where|which|how|why)\b/i.test(t)
        && /\b(of|for|with|on|in|to|at|by)\s*$/i.test(t.replace(/[?.!]+$/, '')) ? 'Ends on a preposition.'
        : /\ba\s+[aeiou]/i.test(t) && !/\ba\s+(?:u[nst]|use|uni|one)/i.test(t) ? 'Uses "a" before a vowel sound.'
          : g.length < 3 ? 'Too few words to be a sentence.'
            // A repeated word ("That Tiny Tiny Pocket") is always a template slot colliding
            // with a noun that already carried the adjective.
            : /\b(\w+)\s+\1\b/i.test(t) ? `Repeated word: "${(t.match(/\b(\w+)\s+\1\b/i) ?? [])[1]}".`
            /*
             * Number agreement. The slug fallback generates "an Escalator Brushes" and
             * "That Tiny Covers on a Round Manhole" whenever a slug's last word is a plural
             * noun, and those shipped straight through the old gates. An article or a
             * singular demonstrative immediately followed by a plural noun is the whole tell.
             */
            : /\b(?:a|an)\s+(?:[a-z]+\s+){0,2}[a-z]+(?:es|s)\b(?!['’]s)/i.test(t)
              && /\b(?:a|an)\s+(?:[a-z]+\s+){0,2}(?:brushes|covers|lines|holes|pockets|meshes|arrows|nozzles|windows|caps|books|pumps|doors|escalators|highways)\b/i.test(t)
              ? 'Article with a plural noun.'
              : /\b(?:that|this)\s+(?:tiny\s+|odd\s+|little\s+|weird\s+)?(?:brushes|covers|lines|holes|pockets|meshes|arrows)\b/i.test(t)
                ? 'Singular demonstrative with a plural noun.'
                : null;
  gate('GRAMMAR_VALID', !grammarProblem, grammarProblem);

  // --- NO_FABRICATED_NUMBER
  const numeric = [...t.matchAll(NUMERIC_CLAIM)].map((m) => m[0].trim())
    .filter((s) => /\d/.test(s))
    // A lone digit under 10 with no unit is not a factual assertion worth gating.
    .filter((s) => !/^\d$/.test(s));
  evidence.numericClaims = numeric;
  const badNumber = source
    ? numeric.find((n) => !source.includes(norm(n)) && !source.includes(norm(n).replace(/\s+/g, '')))
    : null;
  gate('NO_FABRICATED_NUMBER', !badNumber,
    badNumber ? `"${badNumber}" does not appear in the episode's own material.` : null);

  // --- NO_FABRICATED_PROPER_NOUN
  const names = properNouns(t).filter((n) => !ACRONYM_ALLOW.has(n));
  const badName = source ? names.find((n) => !source.includes(norm(n))) : null;
  gate('NO_FABRICATED_PROPER_NOUN', !badName,
    badName ? `"${badName}" is not named anywhere in the episode.` : null);

  /*
   * --- FACTUAL_SUPPORT
   *
   * Every content word in the title must appear in the source, OR the title must be a
   * recognisable restatement of a source sentence. Requiring literal term coverage alone
   * would reject perfectly honest rephrasings, so the sentence-overlap route exists too --
   * and whichever route passes is recorded, so the UI can show WHY it passed.
   */
  let supported = true;
  if (source) {
    /*
     * TOPICAL GROUNDING, not word-for-word coverage.
     *
     * The first version of this gate required every content word of the title to appear in
     * the source. That rejects ordinary English -- "Gas Pumps Stop Because Fuel Blocks the
     * Sensing Hole" failed on the words "stop" and "because" -- and it wrecks two things the
     * brief is explicit about: a spoiler must be PENALISED rather than rejected, and a
     * technically-correct textbook title must survive to be scored low on curiosity. A gate
     * that rejects them never lets either mechanism run.
     *
     * Invented specifics are caught by NO_FABRICATED_NUMBER and NO_FABRICATED_PROPER_NOUN.
     * What is left for this gate is the question those cannot answer: is this title even
     * about this episode? So it checks SALIENT terms -- the domain words, with common English
     * removed -- and accepts a clear restatement of a source sentence as an alternative route.
     */
    const salient = contentWords(t).filter((x) => !COMMON_WORDS.has(x));
    const grounded = salient.filter((x) => source.includes(stem(x)) || source.includes(x));
    const ungrounded = salient.filter((x) => !grounded.includes(x));
    evidence.supportedTerms = grounded;

    const sentences = `${facts} ${script}`.split(/(?<=[.!?])\s+/).filter(Boolean);
    let best = 0;
    for (const sen of sentences) {
      const sim = jaccard(trigrams(t), trigrams(sen));
      if (sim > best) { best = sim; evidence.matchedSentence = sen.trim(); }
    }

    /*
     * About this episode if it names the core object, shares two or more domain terms, or
     * restates a source sentence. Requiring two grounded terms alone rejected short honest
     * titles: "That Shutoff Isn't a Mistake" grounds "shutoff" and nothing else -- exactly
     * one -- and it is plainly about the episode.
     */
    const namesCoreObject = coreObject
      ? contentWords(coreObject).some((x) => norm(t).includes(stem(x)))
      : false;
    supported = namesCoreObject || grounded.length >= 2 || best >= 0.28
      || (salient.length > 0 && ungrounded.length === 0);
    if (!supported) evidence.missingTerms = ungrounded;
    gate('FACTUAL_SUPPORT', supported,
      supported ? null
        : `Not about this episode -- no subject matter in common (${ungrounded.join(', ') || 'no salient terms'})`);
  } else {
    gate('FACTUAL_SUPPORT', false, 'No source material available to check against.');
    supported = false;
  }

  /*
   * --- NO_SOURCE_CONTRADICTION
   *
   * The specific failure worth gating: the title negates something the source asserts, or
   * asserts something the source negates. Detected by looking for a polarity flip on a shared
   * predicate rather than by trying to reason about meaning.
   */
  let contradiction = null;
  if (source) {
    const titleNegated = /\b(aren'?t|isn'?t|are not|is not|doesn'?t|don'?t|never|no longer)\b/i.test(t);
    const cw = contentWords(t);
    if (titleNegated) {
      // "X isn't for Y" contradicts the source if the source plainly says "X is for Y".
      const focus = cw.slice(-2).join(' ');
      const positive = new RegExp(`\\b(is|are)\\s+(?:actually\\s+)?(?:there\\s+)?(?:for|to)\\b[^.]{0,40}${focus.split(' ').pop()}`, 'i');
      if (focus && positive.test(facts) && !/\b(not|isn'?t|aren'?t)\b/i.test(facts)) {
        contradiction = `Title negates something the source states plainly ("${focus}").`;
      }
    }
  }
  gate('NO_SOURCE_CONTRADICTION', !contradiction, contradiction);

  /*
   * --- NO_MISLEADING_PROMISE
   *
   * Hype vocabulary and stock phrasing are not merely stylistic here: they promise an
   * intensity of payoff these episodes do not deliver. A 28-second explanation of a pen cap
   * cannot be "shocking".
   */
  const lower = t.toLowerCase();
  const hype = HYPE_WORDS.find((w) => lower.includes(w));
  const stock = STOCK_PHRASES.find((p) => lower.includes(p));
  gate('NO_MISLEADING_PROMISE', !hype && !stock,
    hype ? `Unearned intensity: "${hype}".` : stock ? `Stock phrasing: "${stock}".` : null);

  /*
   * --- NO_MATERIAL_PAYOFF_CONTRADICTION
   *
   * The title must not assert the opposite of what the episode concludes. Checked against the
   * payoff line specifically, because that is where the episode commits to its position.
   */
  let payoffClash = null;
  if (payoff) {
    const tNeg = /\b(aren'?t|isn'?t|not|never)\b/i.test(t);
    const pNeg = /\b(aren'?t|isn'?t|not|never|no)\b/i.test(payoff);
    const shared = contentWords(t).filter((w) => norm(payoff).includes(stem(w)));
    // Opposite polarity while talking about the same thing is the case worth catching.
    if (shared.length >= 2 && tNeg && !pNeg && /\b(defect|mistake|accident|useless|pointless)\b/i.test(payoff) === false) {
      // Negation in the title is a legitimate house grammar ("Aren't There To..."), so this
      // only fires when the payoff positively asserts the very thing being negated.
      const focus = shared.slice(-1)[0];
      if (new RegExp(`\\bis\\s+(?:the\\s+)?${focus}`, 'i').test(payoff)) {
        payoffClash = `Title denies "${focus}" but the payoff asserts it.`;
      }
    }
  }
  gate('NO_MATERIAL_PAYOFF_CONTRADICTION', !payoffClash, payoffClash);

  // --- NO_NEAR_DUPLICATE_OF_EXISTING_EXACT_TITLE
  const dupe = existingTitles.find((h) =>
    norm(h) === norm(t) || jaccard(trigrams(h), trigrams(t)) >= TITLE_CONFIG.semanticDuplicateThreshold);
  gate('NO_NEAR_DUPLICATE_OF_EXISTING_EXACT_TITLE', !dupe,
    dupe ? `Effectively the same as "${dupe}".` : null);

  return { passed: results.every((r) => r.pass), gates: results, evidence };
}

/* ============================================ LAYER B — editorial score */

const ODD_WORDS = /\b(tiny|little|small|weird|odd|strange|hidden|secret|extra|spare|useless|pointless|brush(es)?|hole|notch|slot|dimple|bump|ridge|arrow|mesh|pocket)\b/i;

/*
 * A claim that something familiar is not the size or shape you assume.
 *
 * This shape needed its own detector. Oddity, friction and tension were all keyed off
 * odd-LOOKING parts -- a hole, a notch, a brush -- so "Highway Lane Lines Are Way Longer Than
 * They Look" scored 69 while a bland "Those Tiny Lane Lines on a Highway" scored 81, purely
 * because the second contains the word "tiny". That is the brief's own example of a good
 * observation title losing to exactly the vocabulary-list scoring it warns against. The
 * surprise here is conceptual rather than visual, and it is precisely the "wait -- that IS
 * true" reaction the cognitive-friction dimension exists to measure.
 */
const SCALE_SURPRISE = /\bthan (?:they|you|it|your|i)\b|\b(?:way|much|far) (?:bigger|longer|smaller|shorter|older|heavier|wider|more)\b|\bno idea how\b|\bnot what (?:you|they|it)\b|\bcompletely wrong\b|\bnothing like\b/i;
const CONCRETE = /\b(hole|pocket|brush|cover|line|arrow|mesh|cap|door|pump|window|book|escalator|manhole|jeans|pen|microwave|highway|nozzle|lid|button|switch|vent|seal|pane|tab)\b/i;

/**
 * Score a candidate that has already passed the gates.
 * Every dimension returns 0..max and explains itself.
 */
export function scoreEditorial(title, ctx = {}) {
  const { actualReveal = '', coreObject = '' } = ctx;
  const t = (title ?? '').trim();
  const w = wordsOf(t);
  const cw = contentWords(t);
  const len = t.length;
  const parts = {};
  const put = (id, points, why) => {
    const max = EDITORIAL_DIMENSIONS.find((d) => d.id === id).max;
    parts[id] = { points: Math.round(clamp(points, 0, max) * 10) / 10, max, why };
  };

  /* CLARITY 18 — can it be parsed at a glance. Length and clause count, not vocabulary. */
  const clauses = (t.match(/,|—|:|;| that | which | because /gi) ?? []).length;
  let clarity = 18;
  if (len > TITLE_CONFIG.houseMaxChars) clarity -= 6;
  else if (len > TITLE_CONFIG.idealMaxChars) clarity -= 2.5;
  if (len < 20) clarity -= 3;
  clarity -= clauses * 2.5;
  if (w.length > 12) clarity -= 2;
  put('clarity', clarity, `${len} chars, ${w.length} words, ${clauses} subordinate breaks`);

  /*
   * CURIOSITY 16 — does it leave a question open.
   *
   * Deliberately NOT a keyword test. The old scorer gave +0.3 for containing "why|how|hidden",
   * which rewarded vocabulary rather than an actual gap. What creates a gap is naming a thing
   * and withholding its explanation.
   */
  let curiosity = 4;
  const asksDirectly = /\?$/.test(t) || /^(why|how|what)\b/i.test(t);
  const namesWithoutExplaining = CONCRETE.test(t) && !/\bbecause\b|\bso (?:they|it|you)\b/i.test(t);
  if (asksDirectly) curiosity += 6;
  if (namesWithoutExplaining) curiosity += 4;
  if (ODD_WORDS.test(t)) curiosity += 3;
  if (/\b(has a|had a|isn'?t|aren'?t|actually)\b/i.test(t)) curiosity += 3;
  put('curiosity', curiosity, asksDirectly ? 'asks outright' : namesWithoutExplaining ? 'names the thing, withholds the reason' : 'weak gap');

  /*
   * PROMISE ALIGNMENT 12 — does the title sell the reveal the video delivers.
   * Measured as overlap between the title and the actual reveal sentence.
   */
  const revealOverlap = actualReveal ? jaccard(trigrams(t), trigrams(actualReveal)) : 0;
  const sharedWithReveal = actualReveal
    ? cw.filter((x) => norm(actualReveal).includes(stem(x))).length : 0;
  let promise = 4 + Math.min(6, sharedWithReveal * 2) + Math.min(2, revealOverlap * 8);
  if (!actualReveal) promise = 6;
  put('promiseAlignment', promise, `${sharedWithReveal} shared terms with the reveal`);

  /* SPECIFICITY 10 — concrete object rather than an abstraction. */
  const vague = ['thing', 'things', 'stuff', 'something', 'anything', 'everything'];
  let spec = 3;
  if (CONCRETE.test(t)) spec += 4;
  if (coreObject && cw.some((x) => norm(coreObject).includes(stem(x)))) spec += 3;
  spec -= vague.filter((v) => w.includes(v)).length * 3;
  put('specificity', spec, CONCRETE.test(t) ? 'names a concrete object' : 'abstract');

  /* SCROLL READABILITY 8 — one-second comprehension. Syllable-ish and comma load. */
  const longWords = w.filter((x) => x.length >= 10).length;
  let scroll = 8 - longWords * 2 - Math.max(0, w.length - 10) * 0.6 - clauses * 1.2;
  put('scrollReadability', scroll, `${longWords} long words`);

  /* ODDITY 7 — is there a visibly weird feature. */
  put('oddity',
    ODD_WORDS.test(t) ? 7 : SCALE_SURPRISE.test(t) ? 6 : CONCRETE.test(t) ? 3 : 1,
    ODD_WORDS.test(t) ? 'names an odd feature'
      : SCALE_SURPRISE.test(t) ? 'claims something familiar is not what it seems'
        : 'nothing unusual foregrounded');

  /* CHANNEL FIT 6 — hidden reasons behind everyday things. */
  const fitsHouse = /\b(hidden|real|actual|reason|job|purpose|why|there for|supposed to)\b/i.test(t);
  put('channelFit', (fitsHouse ? 4 : 2) + (CONCRETE.test(t) ? 2 : 0),
    fitsHouse ? 'reads as a hidden-reason episode' : 'generic framing');

  /* FAMILIARITY 6 — would anyone recognise the object. */
  const EVERYDAY = /\b(airplane|plane|window|escalator|gas|pump|microwave|jeans|pocket|highway|lane|manhole|pen|book|door|car|shoe|phone)\b/i;
  put('familiarity', EVERYDAY.test(t) ? 6 : CONCRETE.test(t) ? 4 : 2,
    EVERYDAY.test(t) ? 'universally recognisable object' : 'less common object');

  /* COGNITIVE FRICTION 6 — "wait, that IS true". Needs an observation the viewer can verify. */
  const observable = /\b(that|those|your|every|all)\b/i.test(t) && CONCRETE.test(t);
  put('cognitiveFriction', (observable ? 4 : 1) + (ODD_WORDS.test(t) ? 2 : 0),
    observable ? 'points at something the viewer has seen' : 'no verifiable observation');

  /* PERSONAL RELEVANCE 4 — natural second person, not forced. */
  const hasYour = /\byour\b/i.test(t);
  const naturallyOwned = /\byour\s+(jeans|tank|car|window|pen|book|shoes?|phone|pocket)\b/i.test(t);
  put('personalRelevance', naturallyOwned ? 4 : hasYour ? 2 : 1,
    naturallyOwned ? 'second person fits the object' : hasYour ? '"your" used loosely' : 'impersonal');

  /* OPEN LOOP 4 — is enough withheld to justify watching. */
  const explainsItself = /\bbecause\b|\bso (?:they|it|you|the)\b|\bin order to\b/i.test(t);
  put('openLoop', explainsItself ? 0.5 : asksDirectly ? 4 : 3,
    explainsItself ? 'answers itself in the title' : 'leaves the answer to the video');

  /* MICRO-TENSION 3 — a small contradiction without hype. */
  // A claim that something is not the size you assume IS a small contradiction, even with
  // no negation word anywhere in it.
  const tension = /\b(aren'?t|isn'?t|not (?:for|to|there)|actually|really|had a|still)\b/i.test(t)
    || SCALE_SURPRISE.test(t);
  put('microTension', tension ? 3 : 1, tension ? 'sets up a small contradiction' : 'flat statement');

  const raw = Object.values(parts).reduce((n, p) => n + p.points, 0);
  return { parts, raw: Math.round(raw * 10) / 10 };
}

/* ======================================== LAYER C — history penalties */

/**
 * Deduct for repeating the channel. Proportional, never mechanically maxed.
 *
 * @param ctx.history  recent titles, most recent first (includes the unpublished batch)
 * @param ctx.actualReveal / ctx.payoff  used for spoiler detection
 */
export function scorePenalties(title, ctx = {}) {
  const { history = [], actualReveal = '', payoff = '' } = ctx;
  const t = (title ?? '').trim();
  const recent = history.slice(0, TITLE_CONFIG.historyWindow).filter(Boolean);
  const applied = [];
  const add = (id, points, why) => {
    if (points <= 0.05) return;
    const max = PENALTIES.find((p) => p.id === id).max;
    applied.push({ id, label: PENALTIES.find((p) => p.id === id).label, points: Math.round(clamp(points, 0, max) * 10) / 10, why });
  };

  /* GRAMMAR FAMILY REPETITION -10 — proportional to how far past the cap the share goes. */
  const family = classifyFamily(t);
  if (recent.length >= 3) {
    const same = recent.filter((h) => classifyFamily(h) === family).length;
    const share = (same + 1) / (recent.length + 1);
    if (share > TITLE_CONFIG.familyShareMax) {
      const over = (share - TITLE_CONFIG.familyShareMax) / (1 - TITLE_CONFIG.familyShareMax);
      add('GRAMMAR_FAMILY_REPETITION', 10 * over, `"${family}" would be ${Math.round(share * 100)}% of recent titles`);
    }
  }

  /* OPENING PHRASE REPETITION -6 — first two words, scaled by how many repeat it. */
  /*
   * Both the first word and the first two.
   *
   * Matching only on two words missed the habit that actually shows. Seven titles opening
   * "That ..." differ at word two every time, so the two-word key never collided and the
   * penalty stayed silent on the most visible repetition in the batch.
   */
  const w1 = wordsOf(t)[0] ?? '';
  const open2 = wordsOf(t).slice(0, 2).join(' ');
  if (w1 && recent.length) {
    const n2 = open2 ? recent.filter((h) => wordsOf(h).slice(0, 2).join(' ') === open2).length : 0;
    const n1 = recent.filter((h) => (wordsOf(h)[0] ?? '') === w1).length;
    if (n2) {
      add('OPENING_PHRASE_REPETITION', Math.min(6, 3 + (n2 - 1) * 1.5),
        `${n2} recent title${n2 > 1 ? 's' : ''} open "${open2}…"`);
    } else if (n1 >= 2) {
      add('OPENING_PHRASE_REPETITION', Math.min(6, 1.5 + (n1 - 2) * 1.2),
        `${n1} recent titles start with "${w1}"`);
    }
  }

  /* SEMANTIC SIMILARITY -8 — trigram Jaccard against the nearest recent title. */
  let maxSim = 0; let nearest = null;
  const tri = trigrams(t);
  for (const h of recent) {
    const s = jaccard(tri, trigrams(h));
    if (s > maxSim) { maxSim = s; nearest = h; }
  }
  if (maxSim > TITLE_CONFIG.semanticSimilarityThreshold) {
    const over = (maxSim - TITLE_CONFIG.semanticSimilarityThreshold) / (1 - TITLE_CONFIG.semanticSimilarityThreshold);
    add('SEMANTIC_SIMILARITY', 8 * over, `${Math.round(maxSim * 100)}% similar to "${nearest}"`);
  }

  /* CADENCE SIMILARITY -5 — same word count and same shape, repeatedly. */
  if (recent.length >= 3) {
    const shape = (s) => `${wordsOf(s).length}:${/\?$/.test(s.trim()) ? 'q' : 'd'}`;
    const mine = shape(t);
    const same = recent.filter((h) => shape(h) === mine).length;
    if (same >= 2) add('CADENCE_SIMILARITY', Math.min(5, same * 1.6), `${same} recent titles share this length and shape`);
  }

  /* REPEATED KEYWORD -4 — a distinctive content word the channel keeps reusing. */
  if (recent.length >= 2) {
    const mine = new Set(contentWords(t).map(stem));
    let worstWord = null; let worstCount = 0;
    for (const wrd of mine) {
      const n = recent.filter((h) => contentWords(h).map(stem).includes(wrd)).length;
      if (n > worstCount) { worstCount = n; worstWord = wrd; }
    }
    if (worstCount >= 2) add('REPEATED_KEYWORD', Math.min(4, worstCount * 1.3), `"${worstWord}" appears in ${worstCount} recent titles`);
  }

  /*
   * SPOILER -12 — the title gives away the payoff.
   *
   * The distinction that matters: "Why Manhole Covers Are Round" sells the question, while
   * "Manhole Covers Are Round So They Can't Fall Through" answers it. Both are true. The
   * second has nothing left to watch for.
   *
   * Detected structurally -- the title contains a causal connective AND carries the reveal's
   * own content words -- rather than by matching a phrase list.
   */
  const causal = /\bso (?:they|it|you|the|that)\b|\bbecause\b|\bin order to\b|\bto (?:stop|prevent|keep|avoid)\b|\bwhich is why\b/i.test(t);
  /*
   * Compared against the whole explanation, not just the one sentence `buildBrief` picked as
   * THE reveal. That heuristic takes the first sentence containing a causal verb, which is
   * often not the sentence a spoiler gives away -- for the gas pump it selects the diaphragm
   * sentence while the spoiler is about fuel blocking the hole, so the penalty never fired.
   */
  const explanation = `${actualReveal} ${ctx.facts ?? ''}`.trim();
  if (causal && explanation) {
    const revealTerms = new Set(contentWords(explanation).map(stem));
    const shared = contentWords(t).map(stem).filter((x) => revealTerms.has(x)).length;
    if (shared >= 2) {
      add('SPOILER', Math.min(12, 5 + shared * 2.2), `states the mechanism (${shared} terms from the reveal) instead of the question`);
    } else if (shared === 1) {
      add('SPOILER', 4, 'hints at the mechanism rather than the question');
    }
  } else if (causal && payoff && contentWords(t).map(stem).filter((x) => norm(payoff).includes(x)).length >= 2) {
    add('SPOILER', 6, 'delivers the payoff in the title');
  }

  /*
   * AI / CLICKBAIT STYLE -12.
   *
   * Hype and stock phrasing are already hard gates, so what remains here are the softer
   * generated-copy tells: em-dash habit, colon stacking, the rule of three, hedging adverbs.
   */
  let ai = 0;
  const tells = [];
  if ((t.match(/—/g) ?? []).length >= 1) { ai += 3; tells.push('em-dash'); }
  if ((t.match(/:/g) ?? []).length >= 1) { ai += 2.5; tells.push('colon'); }
  if (/\b(\w+),\s*(\w+),\s*and\s+(\w+)\b/i.test(t)) { ai += 4; tells.push('rule of three'); }
  if (/\b(truly|simply|literally|absolutely|genuinely|arguably)\b/i.test(t)) { ai += 2.5; tells.push('hedging adverb'); }
  if (/\bthe (?:fascinating|surprising|incredible) (?:reason|truth|story)\b/i.test(t)) { ai += 5; tells.push('stock construction'); }
  if (ai) add('AI_CLICKBAIT_STYLE', ai, tells.join(', '));

  /* OVERCOMPLEXITY -6 */
  const wc = wordsOf(t).length;
  const long = wordsOf(t).filter((x) => x.length >= 11).length;
  const cx = Math.max(0, wc - 11) * 1.2 + long * 1.8;
  if (cx > 0) add('OVERCOMPLEXITY', cx, `${wc} words, ${long} long words`);

  /* PUNCTUATION ABUSE -6 */
  let punct = 0;
  const punctTells = [];
  const caps = t.split(/\s+/).filter((x) => x.length > 3 && x === x.toUpperCase() && /[A-Z]/.test(x));
  if (caps.length) { punct += 3 * caps.length; punctTells.push(`ALL-CAPS: ${caps.join(', ')}`); }
  const emoji = (t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) ?? []).length;
  if (emoji) { punct += 3 * emoji; punctTells.push(`${emoji} emoji`); }
  if (/[!?]{2,}|!\?|\?!/.test(t)) { punct += 6; punctTells.push('clickbait punctuation'); }
  if (/!/.test(t)) { punct += 2; punctTells.push('exclamation mark'); }
  if (punct) add('PUNCTUATION_ABUSE', punct, punctTells.join('; '));

  const total = applied.reduce((n, p) => n + p.points, 0);
  return { applied, total: Math.round(total * 10) / 10, family };
}

/* ================================================ the whole evaluation */

/**
 * Gate, score, penalise. One candidate.
 *
 * A rejected candidate still returns its gate results so the UI can say what failed, but it
 * carries no score: scoring something that will never be used invites exactly the compensation
 * this design exists to prevent.
 */
export function evaluateTitle(title, ctx = {}) {
  const gates = runHardGates(title, ctx);
  const family = classifyFamily(title);

  if (!gates.passed) {
    return {
      title, family, rejected: true, gates: gates.gates, evidence: gates.evidence,
      failedGates: gates.gates.filter((g) => !g.pass).map((g) => g.id),
      editorial: null, penalties: null, score: null,
    };
  }

  const editorial = scoreEditorial(title, ctx);
  const penalties = scorePenalties(title, ctx);
  const score = Math.round(clamp(editorial.raw - penalties.total, 0, 100) * 10) / 10;

  return {
    title, family, rejected: false, gates: gates.gates, evidence: gates.evidence,
    failedGates: [], editorial, penalties, score,
  };
}

/** Evaluate a pool and order it. Rejected candidates are kept but sorted to the end. */
export function evaluatePool(titles, ctx = {}) {
  const seen = new Set();
  const unique = titles.filter((t) => {
    const k = norm(t);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return unique
    .map((t) => evaluateTitle(t, ctx))
    .sort((a, b) => Number(a.rejected) - Number(b.rejected) || (b.score ?? -1) - (a.score ?? -1));
}
