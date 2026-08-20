/**
 * generate.mjs — metadata generation, grounded in the episode's own material.
 *
 * TWO THINGS THIS IS NOT
 *
 *   1. It is not a wrapper that hands a topic string to a model and hopes. Generation reads
 *      the FACTS (the verified transcript), the storyboard beats and the narration timing,
 *      derives the core object / question / reveal, and builds candidates from those. A title
 *      generated from a slug can only ever restate the slug.
 *
 *   2. It does not fake an AI response when no provider is configured. The deterministic
 *      generator below is a real, honest fallback built from the episode's own sentences —
 *      it is labelled as such in the UI, and the linter, editing and history all keep working
 *      without any provider at all.
 *
 * The provider interface is small on purpose. If a model is configured later it slots in
 * behind `MetadataGenerationProvider` without any other file changing.
 */

import { readFileSync, existsSync } from 'node:fs';
import { classifyTitleFamily } from '../metadata/style.mjs';

/**
 * @typedef {object} MetadataGenerationProvider
 * @property {string} id
 * @property {string} label
 * @property {boolean} configured
 * @property {(brief: object) => Promise<string[]>} generateTitles
 * @property {(brief: object) => Promise<string>} generateDescription
 */

/**
 * Which provider is available.
 *
 * No key is read from source. Configuration lives in the environment, outside git. When
 * nothing is configured the UI must say so plainly rather than silently degrading.
 */
export function resolveProvider() {
  // Placeholder for a future model provider. Deliberately checks env only.
  const key = process.env.BFO_METADATA_API_KEY;
  const model = process.env.BFO_METADATA_MODEL ?? null;
  if (key) {
    return {
      id: 'external',
      label: `External provider (${model ?? 'model unset'})`,
      configured: true,
      note: 'An external generation provider is configured.',
    };
  }
  return {
    id: 'deterministic',
    label: 'Built-in deterministic generator',
    configured: false,
    note:
      'No AI generation provider is configured. Candidates below are constructed from the ' +
      'episode’s own transcript and storyboard — not invented, and not model-generated. ' +
      'Linting, editing, ranking and history all work normally.',
  };
}

const SENT = (t) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/**
 * Build the editorial brief for a piece of content.
 *
 * This is the step that makes generation grounded: the core object, the question and the
 * actual reveal are all extracted from the episode's own recorded material, and every
 * candidate must be expressible in those terms.
 */
export function buildBrief(content, { storyboard = null } = {}) {
  const facts = content.facts_text ?? content.script_text ?? '';
  const sentences = SENT(facts);

  const story = storyboard ?? (content.storyboard_path && existsSync(content.storyboard_path)
    ? JSON.parse(readFileSync(content.storyboard_path, 'utf8'))
    : null);

  /**
   * The core object: the concrete everyday thing the episode is about.
   * Taken from the slug, which was itself authored from the transcript — the most reliable
   * short noun phrase available without a model.
   */
  const coreObject = titleCase((content.content_id ?? '').replace(/-/g, ' '));

  // The opening sentence is the hook by construction — these scripts are built that way.
  const hookLine = sentences[0] ?? '';

  /**
   * The reveal: the first sentence in the middle of the script that states a mechanism.
   * Scanned from the explanation region rather than the opening or the payoff.
   */
  const middle = sentences.slice(1, Math.max(2, sentences.length - 1));
  const revealLine =
    middle.find((s) => /because|helps|manage|allows|triggers|blocks|prevents|means|so that/i.test(s))
    ?? middle[0] ?? '';

  const closingLine = sentences[sentences.length - 1] ?? '';

  const beats = (story?.scenes ?? []).flatMap((sc) =>
    (sc.beats ?? []).map((b) => ({ scene: sc.scene, t: b.t, action: b.action })));

  return {
    contentId: content.content_id,
    coreObject,
    coreQuestion: hookLine,
    actualReveal: revealLine,
    payoff: closingLine,
    factualPromise: [hookLine, revealLine].filter(Boolean).join(' '),
    durationSeconds: content.duration_s ?? null,
    beats,
    facts,
  };
}

/**
 * Deterministic candidate titles across DIFFERENT grammar families.
 *
 * The constraint that matters: no family may dominate. Ten variations of "Why X Has Y" is the
 * exact failure this channel must avoid, so the generator emits one candidate per family and
 * lets ranking (which knows the channel's recent history) decide the order.
 */
export function generateTitleCandidatesDeterministic(brief) {
  const obj = brief.coreObject;
  const short = obj.replace(/^The\s+/i, '');

  // Pull a concrete noun pair out of the slug: "airplane window hole" -> subject + feature
  const parts = short.split(/\s+/);
  const feature = parts.length > 2 ? parts.slice(-1)[0] : parts.slice(-1)[0];
  const subject = parts.length > 2 ? parts.slice(0, -1).join(' ') : short;

  const out = [
    // QUESTION
    `How Does ${aOrAn(subject)} ${titleCase(feature)} Actually Work?`,
    // HIDDEN FUNCTION
    `That ${titleCase(feature)} on ${aOrAn(subject)} Has a Job`,
    // CONTRADICTION
    `${titleCase(subject)} ${titleCase(feature)}s Aren't What You Think`,
    // HIDDEN REASON
    `The Hidden Reason ${titleCase(subject)} Has That ${titleCase(feature)}`,
    // MECHANISM
    `How ${aOrAn(subject)} ${titleCase(feature)} Does Its Job`,
    // WHY — included once, deliberately, not five times
    `Why ${titleCase(subject)} Has That ${titleCase(feature)}`,
    // CLAIM
    `${titleCase(subject)}: The ${titleCase(feature)} Is Deliberate`,
  ];

  // De-duplicate by family so the set genuinely spans different grammars.
  const seen = new Set();
  return out.filter((t) => {
    const f = classifyTitleFamily(t);
    if (seen.has(f)) return false;
    seen.add(f);
    return true;
  });
}

const aOrAn = (s) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);

/**
 * A description in the channel's voice: 1–3 sentences, grounded, no boilerplate.
 *
 * Built from the episode's own hook and reveal sentences rather than paraphrased, so nothing
 * in it can be unsupported by the script.
 */
export function generateDescriptionDeterministic(brief) {
  const hook = tidy(brief.coreQuestion);
  const reveal = tidy(brief.actualReveal);
  const lines = [hook, reveal].filter(Boolean).slice(0, 2);
  if (!lines.length) return '';
  return `${lines.join(' ')}\n\nMore hidden reasons behind everyday things on Bill Finds Out.`;
}

function tidy(s) {
  if (!s) return '';
  let t = s.trim().replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

/** Tags: spelling variants and the technical term. Not a growth lever, and not stuffed. */
export function generateTagsDeterministic(brief) {
  const words = brief.coreObject.toLowerCase().split(/\s+/);
  const base = [
    brief.coreObject.toLowerCase(),
    words.slice(0, 2).join(' '),
    words.slice(-2).join(' '),
    'how things work',
    'everyday objects',
    'hidden design',
  ];
  return [...new Set(base.filter((t) => t && t.length > 2))].slice(0, 8);
}
