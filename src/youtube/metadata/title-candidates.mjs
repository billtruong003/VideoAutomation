/**
 * title-candidates.mjs — propose titles. Do not judge them.
 *
 * The split matters. A generator that scores its own output starts optimising for the scorer,
 * and a scorer that generates loses the ability to reject. So this file only proposes, and
 * everything about quality lives in ./title-engine.mjs.
 *
 * The generator this replaces emitted seven templates and then THREW AWAY any whose grammar
 * family had already appeared, leaving five or six. That is diversity by deletion: it shrinks
 * the pool to achieve variety, when the pool was already too small to choose from. Here every
 * family is populated deliberately and nothing is discarded before the gates run.
 *
 * Templates read their nouns from ./episode-nouns.mjs, which was authored from each episode's
 * transcript. Interpolating a slug split on its last word produced "an Escalator Brushes" and
 * "That Tiny Covers on a Round Manhole" -- see that file for why the slug cannot carry this.
 *
 * Everything is still grounded: the hard gates check every candidate against the transcript,
 * so a wrong noun spec yields a rejected candidate, never a false claim. If a provider is
 * configured it adds creative candidates, and they pass through the identical gates -- an LLM
 * is never asked which title is best, only for more raw material.
 */

import { TITLE_CONFIG } from './title-config.mjs';
import { nounsFor } from './episode-nouns.mjs';

const titleCase = (s) => (s ?? '').replace(/\b([a-z])/g, (m) => m.toUpperCase());
const lower = (s) => (s ?? '').toLowerCase();

/** "a" / "an", chosen on the sound rather than the letter where it matters. */
const article = (s) => {
  if (/^(?:hour|honest|heir)/i.test(s)) return 'an';
  if (/^(?:uni|use|user|euro|one)/i.test(s)) return 'a';
  return /^[aeiou]/i.test(s) ? 'an' : 'a';
};
const withArticle = (s) => `${article(s)} ${s}`;

/** Fallback pluralisation, only used when an episode has no authored spec. */
const pluralise = (w) => {
  if (!w) return w;
  if (/(?:s|sh|ch|x|z)$/i.test(w)) return `${w}es`;
  if (/[^aeiou]y$/i.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
};

/**
 * Nouns for an episode: the authored spec, or a slug split as a last resort.
 *
 * The fallback is deliberately unambitious. It exists so a new episode still produces
 * candidates before anyone writes its spec, and the grammar gate is what stops the agreement
 * errors it will sometimes make from reaching a human.
 */
function nounsOrFallback(brief) {
  const authored = nounsFor(brief.contentId);
  if (authored) return authored;

  const raw = lower(brief.coreObject ?? '').replace(/^the\s+/, '').trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return {
      subject: { one: raw, many: pluralise(raw) },
      feature: { one: raw, many: pluralise(raw), plural: false },
      kind: 'PART', evidence: 'slug fallback — no authored spec',
    };
  }
  const feat = parts[parts.length - 1];
  const subj = parts.slice(0, -1).join(' ');
  return {
    subject: { one: subj, many: pluralise(subj) },
    feature: { one: feat, many: pluralise(feat), plural: /s$/.test(feat) },
    kind: 'PART', evidence: 'slug fallback — no authored spec',
  };
}

/**
 * Build the candidate pool: 16-24 titles across ten grammar families.
 *
 * Families are populated where they are natural and skipped where they would produce
 * nonsense. The brief asks for breadth, not for every slot filled regardless -- a
 * PERSONAL_RELEVANCE title about manhole covers would be forced, and forcing it is exactly
 * the "your" habit the brief warns against.
 */
export function generateCandidatePool(brief) {
  const n = nounsOrFallback(brief);
  const S1 = n.subject.one;
  const SN = n.subject.many;
  const F1 = n.feature.one;
  const FN = n.feature.many;
  const featurePlural = n.feature.plural;

  // The feature as it is normally spoken: plural for brushes and lane lines, singular else.
  const F = featurePlural ? FN : F1;
  // Demonstrative that agrees with it.
  const THAT = featurePlural ? 'Those' : 'That';
  const HAS = featurePlural ? 'Have' : 'Has';
  const IS = featurePlural ? 'Are' : 'Is';

  const out = [];
  const push = (t) => {
    if (!t) return;
    const clean = t.replace(/\s+/g, ' ').trim();
    if (clean.length >= TITLE_CONFIG.minChars) out.push(clean);
  };

  const T = (s) => titleCase(s);

  /*
   * Some features are named with their adjective already attached ("tiny pocket"), so a
   * template that prepends "Tiny" produces "That Tiny Tiny Pocket". Only prepend when the
   * noun does not already carry it.
   */
  const canPrependTiny = Boolean(n.small) && !/^(tiny|little|small)\b/i.test(F1);

  if (n.kind === 'PROPERTY') {
    /*
     * The episode is about a quality of the whole object, not a part of it. "What is that
     * round shape FOR?" is not how anyone asks; "Why are manhole covers round?" is.
     */
    const P = n.property ?? F;
    push(`Why Are ${T(SN)} ${T(P)}?`);
    push(`Why ${T(SN)} Are ${T(P)}`);
    push(`How Being ${T(P)} Changes What ${T(SN)} Can Do`);
    push(`${T(SN)} ${IS} ${T(P)} on Purpose`);
    push(`The Hidden Reason ${T(SN)} Are ${T(P)}`);
    push(`The Real Reason ${T(SN)} Are ${T(P)}`);
    push(`${T(SN)} Aren't ${T(P)} by Accident`);
    push(`${T(SN)} Aren't ${T(P)} for the Reason You Think`);
    push(`Nothing About ${T(SN)} Being ${T(P)} Is Accidental`);
    push(`${T(SN)} Are Stranger Than They Look`);
    push(`${T(S1)}: Being ${T(P)} Is the Whole Point`);
    push(`${T(SN)} Are Built Around One Shape`);
    push(`Being ${T(P)} Is What Makes ${T(SN)} Work`);
    if (n.owned) {
      push(`${T(n.owned)} Are ${T(P)} for a Reason`);
      push(`Why ${T(n.owned)} Do That`);
    }
    push(`The Point of ${T(P)} ${T(SN)}`);
    push(`${T(SN)} Are More Deliberate Than They Look`);
  } else if (n.kind === 'PHENOMENON') {
    /*
     * Nobody designed this and it is not for anything, so every "what is it FOR" and "has a
     * job" template is wrong here. The question worth asking is what it actually is.
     */
    push(`Why Do ${T(SN)} ${T(F)} Like That?`);
    push(`What ${THAT} ${T(S1)} ${T(F)} Actually Is`);
    push(`Why ${T(SN)} ${T(F)} the Way They Do`);
    push(`${THAT} ${T(S1)} ${T(F)} ${IS}n't What You Think`);
    push(`Where ${THAT} ${T(S1)} ${T(F)} Comes From`);
    push(`${THAT} ${T(S1)} ${T(F)} Is Telling You Something`);
    push(`The Real Reason ${T(SN)} ${T(F)} Like That`);
    push(`${T(SN)} ${T(F)} Like That for a Reason`);
    push(`How ${THAT} ${T(F)} Actually Happens`);
    push(`${THAT} ${T(F)} Is the Sound of Something Ending`);
    push(`${T(SN)} Are Stranger Than They ${T(F)}`);
    push(`What You're Actually Smelling in ${withArticle(T(S1))}`);
    push(`${THAT} ${T(F)} Has an Explanation`);
    push(`Nothing About ${THAT} ${T(F)} Is Random`);
    push(`${T(S1)}: ${THAT} ${T(F)} Explained`);
    if (n.owned) push(`Why ${T(n.owned)} ${T(F)} Like That`);
  } else {
    /* QUESTION */
    push(`What ${IS} ${THAT} ${T(F)} on ${withArticle(T(S1))} For?`);
    push(`Why Do ${T(SN)} Have ${THAT} ${T(F)}?`);
    push(`How Does ${withArticle(T(S1))} Use ${THAT} ${T(F)}?`);

    /* MECHANISM */
    push(`How ${T(SN)} Use ${THAT} ${T(F)}`);
    push(`How ${THAT} ${T(F)} Actually Works`);

    /* HIDDEN FUNCTION */
    push(`${THAT} ${T(F)} on ${withArticle(T(S1))} ${HAS} a Job`);
    push(`${THAT} ${T(F)} ${HAS} a Real Job`);
    push(`${THAT} ${T(F)} ${IS} Doing Something`);

    /* HIDDEN REASON */
    push(`The Hidden Reason ${T(SN)} Have ${THAT} ${T(F)}`);
    push(`The Real Reason ${THAT} ${T(F)} ${IS} There`);

    /* CONTRADICTION */
    push(`${THAT} ${T(F)} ${IS}n't What You Think`);
    push(`${THAT} ${T(F)} ${IS}n't a Mistake`);
    push(`${T(SN)} Aren't Built the Way You'd Guess`);

    /*
     * OBJECT MYSTERY. "Tiny" only where the source itself calls the thing small -- otherwise
     * the title wins oddity points on an adjective that is simply not true.
     */
    if (canPrependTiny) push(`${THAT} Tiny ${T(F)} on ${withArticle(T(S1))}`);
    push(`${THAT} Odd Little ${T(F)} Nobody Explains`);

    /* PERSONAL RELEVANCE — only where the viewer genuinely owns the thing. */
    if (n.owned) {
      push(`${T(n.owned)} ${HAS} a ${T(F1)} You've Never Used`);
      push(`${THAT} ${T(F)} on ${T(n.owned)} ${HAS} a Real Job`);
      if (canPrependTiny) push(`${THAT} Tiny ${T(F)} on ${T(n.owned)} ${HAS} a Real Job`);
    }

    /* OBSERVATION — the "Why" attractor, rationed to two. */
    push(`Why ${T(SN)} Have ${THAT} ${T(F)}`);
    push(`Why ${THAT} ${T(F)} ${IS} There`);

    /* UNEXPECTED FACT */
    push(`${THAT} ${T(F)} ${IS} Doing More Than It Looks`);
    push(`${T(SN)} Are Stranger Than They Look`);

    /* SHORT DECLARATIVE */
    push(`${THAT} ${T(F)} ${IS} Deliberate`);
    push(`${T(S1)}: ${THAT} ${T(F)} ${IS} on Purpose`);
    push(`Nothing About ${THAT} ${T(F)} Is Accidental`);
  }

  /*
   * Episode-specific angles are appended, but room is RESERVED for them first.
   *
   * Appending and then slicing to the cap silently dropped every one of them, because the
   * generic templates already filled the pool -- the angles were generated, counted, and
   * thrown away before the gates ever saw them. They are frequently the strongest candidates,
   * since they come from the episode's actual hook rather than a shape that fits every
   * episode equally, so the generics yield the space instead.
   */
  const angles = dedupe(n.angles ?? []).filter((a) => a.length >= TITLE_CONFIG.minChars);
  const room = Math.max(TITLE_CONFIG.candidateMin, TITLE_CONFIG.candidateTarget - angles.length);
  return dedupe([...dedupe(out).slice(0, room), ...angles]);
}

const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter((t) => {
    const k = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * Ask a configured provider for extra creative candidates.
 *
 * Returns [] when nothing is configured, and the UI says so rather than implying a model was
 * consulted. Anything it returns is gated and scored identically, so a model cannot talk its
 * way past a factual failure.
 */
export async function generateProviderCandidates(brief, provider) {
  if (!provider?.configured) return [];
  // No provider is wired up yet. When one is, it returns strings and nothing else changes.
  return [];
}
