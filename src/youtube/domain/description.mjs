/**
 * description.mjs — description generation and description-specific linting.
 *
 * Split out from the title path deliberately. A description fails in different ways from a
 * title: it repeats the transcript, it opens with channel boilerplate, it stacks hashtags, it
 * ends with the same CTA on every video. Folding it into the title linter meant those checks
 * were never really run, which is what the user hit.
 *
 * House shape: 1–3 useful sentences. Reinforce the question, state the reveal, stop.
 */

import { lintCandidate } from '../metadata/lint.mjs';

/**
 * CTA variants.
 *
 * A CTA is OPTIONAL and must not be appended to every episode. Variants exist so that when
 * one is used it is not the identical sentence every time, and `pickCta` rotates by how
 * recently each has been used.
 */
export const CTA_VARIANTS = [
  'More hidden reasons behind everyday things on Bill Finds Out.',
  'Bill Finds Out: the reasons behind ordinary things.',
  'More everyday objects, explained properly.',
  null, // no CTA at all, which should be a normal outcome
];

const BOILERPLATE = [
  'welcome back', "don't forget to", 'dont forget to', 'in this exciting', 'in today\'s video',
  'in todays video', 'join us as', 'hey guys', 'let\'s dive in', 'lets dive in',
  'have you ever wondered', 'ever wondered', 'discover the', 'unlock the', "you won't believe",
  'like and subscribe', 'smash that', 'hit the bell',
];

const tidy = (s) => {
  if (!s) return '';
  const t = s.trim().replace(/\s+/g, ' ');
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/**
 * Build description variants from the episode's own sentences.
 *
 * Every variant is assembled from material the script actually contains, so nothing in a
 * generated description can be unsupported. Variants differ in SHAPE — statement-first,
 * question-first, mechanism-first — rather than in wording, so a creator picking between them
 * is making a real editorial choice.
 */
export function generateDescriptions(brief, { ctaHistory = [] } = {}) {
  const hook = tidy(brief.coreQuestion);
  const reveal = tidy(brief.actualReveal);
  const payoff = tidy(brief.payoff);
  if (!hook && !reveal) return [];

  const cta = pickCta(ctaHistory);
  /*
   * A CTA is attached only when the body can afford it. House style is under about 250
   * characters and every variant costs 40-60, so appending one to an already-full description
   * pushes it past the limit to add a line that says nothing about the video.
   */
  const withCta = (body) => (cta && body.length <= 180 ? `${body}\n\n${cta}` : body);

  const variants = [
    {
      id: 'reveal-first',
      label: 'Reveal first',
      note: 'Leads with the answer. Best when the reveal is the interesting part.',
      text: withCta([reveal, hook].filter(Boolean).join(' ')),
    },
    {
      id: 'question-first',
      label: 'Question first',
      note: 'Leads with the setup, then the mechanism.',
      text: withCta([hook, reveal].filter(Boolean).join(' ')),
    },
    {
      id: 'tight',
      label: 'Tight',
      note: 'One sentence. Often the right choice for a Short.',
      text: reveal || hook,
    },
    {
      id: 'with-payoff',
      label: 'With payoff',
      note: 'Adds the closing thought. Longer — check it still earns the space.',
      text: withCta([hook, reveal, payoff].filter(Boolean).join(' ')),
    },
  ];

  return variants.filter((v) => v.text && v.text.trim().length > 10);
}

/**
 * Rotate the CTA.
 *
 * Returns whichever variant has been used least recently, including the "no CTA" option, so
 * that omitting it is a normal outcome rather than an exception. If the last two episodes
 * both carried a CTA, this returns null — three in a row is where it starts to read as
 * boilerplate.
 */
export function pickCta(ctaHistory) {
  const recent = ctaHistory.slice(0, 2);
  if (recent.length === 2 && recent.every(Boolean)) return null;
  const counts = new Map(CTA_VARIANTS.map((v) => [v, 0]));
  for (const h of ctaHistory) if (counts.has(h)) counts.set(h, counts.get(h) + 1);
  return [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0];
}

/**
 * Lint a description on its own terms.
 *
 * Runs the shared copy linter first (stock phrases, hype, factual claims), then adds the
 * checks that only make sense for a description.
 */
export function lintDescription(description, { facts = '', transcript = '', history = [] } = {}) {
  const base = lintCandidate({ title: '', description }, { facts, history });
  const issues = [...base.issues];
  const text = description ?? '';
  const lower = text.toLowerCase();

  /*
   * A description must be able to stand alone.
   *
   * Variants are assembled from the episode's own sentences, and the reveal is by definition
   * a MID-SCRIPT sentence -- so it frequently opens with a connective or a pronoun whose
   * antecedent was the sentence before it. Lifted into a description those read as fragments:
   * "Because that black metal mesh is doing something clever." / "So engineers didn't choose
   * the circle." / "It helps manage the pressure between the layers." Each is true, grounded
   * and completely incoherent on its own, and every one of them was selected as the preferred
   * description before this check existed.
   */
  const opener = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, '') ?? '';
  const DANGLING = new Set([
    'because', 'so', 'and', 'but', 'or', 'then', 'basically', 'also', 'however',
    'it', 'they', 'this', 'that', 'these', 'those', 'he', 'she', 'its', 'their',
    'which', 'plus', 'anyway', 'still', 'yet',
  ]);
  // "That tiny hole in your airplane window" is a fine opener -- "that" followed by a noun
  // phrase is deictic, not anaphoric. It is bare "That ..." as a pronoun that fails.
  const secondWord = text.trim().split(/\s+/)[1]?.toLowerCase() ?? '';
  const deictic = ['that', 'this', 'these', 'those'].includes(opener)
    && secondWord && !/^(is|was|are|were|means|helps|makes|does|did|pressure|change)\b/.test(secondWord);
  if (DANGLING.has(opener) && !deictic) {
    issues.push({
      severity: 'error', code: 'DANGLING_OPENER',
      message: `Opens with "${opener}", which refers back to a sentence that is not here.`,
      hint: 'Start with the setup line. A description has to make sense on its own.',
    });
  }

  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > 5000) {
    issues.push({
      severity: 'error', code: 'DESC_TOO_LONG_API',
      message: `${bytes} bytes — the API limit is 5000.`,
    });
  }
  if (/[<>]/.test(text)) {
    issues.push({ severity: 'error', code: 'DESC_INVALID_CHAR', message: 'Contains < or >, which the API rejects.' });
  }

  const alreadyFlagged = (phrase) => issues.some((i) => (i.message ?? '').toLowerCase().includes(phrase));
  for (const b of BOILERPLATE) {
    if (lower.includes(b) && !alreadyFlagged(b)) {
      issues.push({
        severity: 'error', code: 'BOILERPLATE',
        message: `Channel boilerplate: "${b}"`,
        hint: 'Say the specific thing instead. This phrase fits any video, so it describes none.',
      });
    }
  }

  // Transcript dumping: a description should reinforce the video, not restate it.
  /*
   * Quoting the reveal sentence verbatim is correct -- it is the accurate wording, and
   * paraphrasing risks changing the fact. What is wrong is pasting the whole script. So
   * this measures PROPORTION as well as length: a description that is almost entirely
   * one lifted run has stopped adding anything the video does not already say.
   */
  if (transcript && text.length > 150) {
    const overlap = longestSharedRun(lower, transcript.toLowerCase());
    // More than a sentence's worth, AND most of what was written. One quoted sentence is
    // normally well under 150 characters, so a single accurate quote never trips this.
    if (overlap > 150 && overlap / text.length > 0.7) {
      issues.push({
        severity: 'warn', code: 'TRANSCRIPT_DUMP',
        message: `${Math.round((overlap / text.length) * 100)}% of this is one run lifted from the narration.`,
        hint: 'Quoting the reveal is fine; pasting the script adds nothing the video does not already say.',
      });
    }
  }

  if (text.length > 250) {
    issues.push({
      severity: 'warn', code: 'DESC_OVER_HOUSE_LENGTH',
      message: `${text.length} characters (house style is under about 250).`,
    });
  }

  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 2);
  if (sentences.length > 4) {
    issues.push({
      severity: 'warn', code: 'DESC_TOO_MANY_SENTENCES',
      message: `${sentences.length} sentences (house style is 1–3).`,
    });
  }

  const hashtags = (text.match(/#\w+/g) ?? []).length;
  if (hashtags > 3) {
    issues.push({ severity: 'warn', code: 'HASHTAG_STUFFING', message: `${hashtags} hashtags (max 3).` });
  }

  const emoji = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) ?? []).length;
  if (emoji > 2) {
    issues.push({ severity: 'warn', code: 'EMOJI_SPAM', message: `${emoji} emoji.` });
  }

  // CTA repeated across the channel.
  const usedCta = CTA_VARIANTS.filter(Boolean).find((c) => text.includes(c));
  if (usedCta && history.filter((h) => (h.description ?? '').includes(usedCta)).length >= 2) {
    issues.push({
      severity: 'warn', code: 'CTA_REPEATED',
      message: 'This exact CTA is already on the last few videos.',
      hint: 'Vary it, or leave it off — omitting the CTA is a normal choice.',
    });
  }

  return {
    issues,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
    bytes,
    chars: text.length,
    sentences: sentences.length,
    hasCta: Boolean(usedCta),
  };
}

/** Longest common substring length, capped — enough to spot a pasted transcript. */
function longestSharedRun(a, b) {
  let best = 0;
  const step = 30;
  for (let i = 0; i + step <= a.length; i += 10) {
    const probe = a.slice(i, i + step);
    if (!b.includes(probe)) continue;
    let len = step;
    while (i + len < a.length && b.includes(a.slice(i, i + len + 1))) len++;
    best = Math.max(best, len);
    if (best > 400) break;
  }
  return best;
}
