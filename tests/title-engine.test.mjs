/**
 * title-engine.test.mjs — the three layers, and the cases that broke them.
 *
 * The fixtures come from the brief: a good title, a textbook one, clickbait, a spoiler and an
 * unsupported claim. The important assertions are about WHICH layer handles each. Textbook and
 * spoiler must survive the gates and lose on score, because a gate that rejects them never
 * lets the scoring mechanism run at all — and that was the first version's actual bug.
 */

import { describe, expect, it } from 'vitest';

import {
  evaluateTitle, evaluatePool, runHardGates, scoreEditorial, scorePenalties, classifyFamily,
} from '../src/youtube/metadata/title-engine.mjs';
import { optimiseBatch, batchHealth, batchRepetitionCost } from '../src/youtube/metadata/title-batch.mjs';
import { generateCandidatePool } from '../src/youtube/metadata/title-candidates.mjs';
import { EDITORIAL_DIMENSIONS, EDITORIAL_TOTAL, PENALTIES } from '../src/youtube/metadata/title-config.mjs';

const FACTS = 'Your gas pump knows when your tank is full without talking to your car. '
  + 'Near the tip of the nozzle there is a small sensing hole connected to a narrow pipe. '
  + 'While fuel is flowing, air is drawn through that hole. When rising fuel blocks the hole, '
  + 'the suction changes. That pressure change triggers a mechanical diaphragm inside the nozzle and click. '
  + 'A machine reads your car without any electronics at all.';

const CTX = {
  facts: FACTS,
  script: FACTS,
  actualReveal: 'That pressure change triggers a mechanical diaphragm inside the nozzle and click.',
  payoff: 'A machine reads your car without any electronics at all.',
  coreObject: 'Gas Pump Shutoff',
  history: [],
  existingTitles: [],
};

const GOOD = 'How a Gas Pump Knows Your Tank Is Full';
const TEXTBOOK = 'The Function of the Automatic Fuel Nozzle Shutoff Mechanism';
const CLICKBAIT = "You Won't BELIEVE How Gas Pumps Know This 😱";
const SPOILER = 'Gas Pumps Stop Because Fuel Blocks the Sensing Hole';
const UNSUPPORTED = 'Gas Pumps Detect Your Tank at 30,000 PSI';

/* ================================================== LAYER A — hard gates */

describe('hard gates', () => {
  it('passes an honest, well-formed title', () => {
    expect(runHardGates(GOOD, CTX).passed).toBe(true);
  });

  it('rejects an invented number outright, not as a deduction', () => {
    const r = evaluateTitle(UNSUPPORTED, CTX);
    expect(r.rejected).toBe(true);
    expect(r.failedGates).toContain('NO_FABRICATED_NUMBER');
    // The whole point of the rebuild: a rejected candidate carries no score to compensate with.
    expect(r.score).toBeNull();
    expect(r.editorial).toBeNull();
  });

  it('names the offending figure so the creator can fix it', () => {
    const g = runHardGates(UNSUPPORTED, CTX).gates.find((x) => x.id === 'NO_FABRICATED_NUMBER');
    expect(g.detail).toContain('30,000 PSI');
  });

  it('rejects a misleading promise', () => {
    const r = evaluateTitle(CLICKBAIT, CTX);
    expect(r.rejected).toBe(true);
    expect(r.failedGates).toContain('NO_MISLEADING_PROMISE');
  });

  it('does not treat a shouted ordinary word as a fabricated name', () => {
    // "BELIEVE" is shouting, which is punctuation abuse, not an invented proper noun.
    // Reporting it as a fabricated name rejected the right title for the wrong reason.
    expect(runHardGates(CLICKBAIT, CTX).gates
      .find((g) => g.id === 'NO_FABRICATED_PROPER_NOUN').pass).toBe(true);
  });

  it('rejects an empty or stub title', () => {
    expect(evaluateTitle('', CTX).rejected).toBe(true);
    expect(evaluateTitle('Gas', CTX).rejected).toBe(true);
  });

  it('rejects a title past the API hard limit', () => {
    const long = `How a Gas Pump Knows ${'Very '.repeat(25)}Full`;
    expect(runHardGates(long, CTX).gates.find((g) => g.id === 'YOUTUBE_TITLE_VALID').pass).toBe(false);
  });

  it('rejects a near-duplicate of a title already used', () => {
    const r = evaluateTitle(GOOD, { ...CTX, existingTitles: [GOOD] });
    expect(r.failedGates).toContain('NO_NEAR_DUPLICATE_OF_EXISTING_EXACT_TITLE');
  });

  it('allows a stranded preposition in a wh-question', () => {
    // "What Is That Hole For?" is correct English; only statements are flagged.
    expect(runHardGates('What Is That Sensing Hole on a Gas Pump For?', CTX)
      .gates.find((g) => g.id === 'GRAMMAR_VALID').pass).toBe(true);
  });

  it('rejects article/plural disagreement', () => {
    // The slug fallback generates "an Escalator Brushes" whenever a slug ends in a plural.
    expect(runHardGates('How Does an Escalator Brushes Work?', {
      ...CTX, facts: 'Those brushes on the side of an escalator are not there to clean your shoes.',
      coreObject: 'Escalator Brushes',
    }).gates.find((g) => g.id === 'GRAMMAR_VALID').pass).toBe(false);
  });

  it('records the evidence that supported the title', () => {
    const { evidence } = runHardGates(GOOD, CTX);
    expect(evidence.supportedTerms.length).toBeGreaterThan(0);
    expect(evidence.matchedSentence).toBeTruthy();
  });

  it('lets ordinary English through instead of demanding word-for-word coverage', () => {
    // Requiring every content word in the source rejected "stop" and "because", which
    // suppressed the spoiler penalty entirely.
    expect(runHardGates(SPOILER, CTX).gates.find((g) => g.id === 'FACTUAL_SUPPORT').pass).toBe(true);
  });
});

/* ============================================ LAYER B — editorial score */

describe('editorial score', () => {
  it('sums to 100 across the configured dimensions', () => {
    expect(EDITORIAL_TOTAL).toBe(100);
    expect(EDITORIAL_DIMENSIONS.reduce((n, d) => n + d.max, 0)).toBe(100);
  });

  it('never exceeds a dimension maximum', () => {
    for (const t of [GOOD, TEXTBOOK, SPOILER]) {
      const { parts } = scoreEditorial(t, CTX);
      for (const [id, p] of Object.entries(parts)) {
        expect(p.points).toBeLessThanOrEqual(p.max);
        expect(p.points).toBeGreaterThanOrEqual(0);
        expect(EDITORIAL_DIMENSIONS.some((d) => d.id === id)).toBe(true);
      }
    }
  });

  it('has no truthfulness dimension — that is a gate', () => {
    expect(EDITORIAL_DIMENSIONS.some((d) => /truth/i.test(d.id))).toBe(false);
  });

  it('explains every dimension it scores', () => {
    for (const p of Object.values(scoreEditorial(GOOD, CTX).parts)) {
      expect(typeof p.why).toBe('string');
      expect(p.why.length).toBeGreaterThan(0);
    }
  });

  it('scores a textbook title below a good one, via the dimensions', () => {
    const good = evaluateTitle(GOOD, CTX);
    const textbook = evaluateTitle(TEXTBOOK, CTX);
    expect(textbook.rejected).toBe(false); // survives the gates — it is true, just dull
    expect(textbook.score).toBeLessThan(good.score);
    // And it loses where the brief says it should, not to a blacklist.
    expect(textbook.editorial.parts.curiosity.points)
      .toBeLessThan(good.editorial.parts.curiosity.points);
  });

  it('penalises a title that answers itself on the open loop', () => {
    const closed = scoreEditorial('Gas Pumps Stop Because Fuel Blocks the Hole', CTX);
    const open = scoreEditorial(GOOD, CTX);
    expect(closed.parts.openLoop.points).toBeLessThan(open.parts.openLoop.points);
  });

  it('rewards a conceptual surprise, not only an odd-looking part', () => {
    // Scoring oddity purely off words like "tiny" made the brief's own observation example
    // lose to a blander title that happened to contain one.
    const surprise = scoreEditorial('Highway Lane Lines Are Way Longer Than They Look',
      { ...CTX, coreObject: 'Highway Lane Lines' });
    expect(surprise.parts.oddity.points).toBeGreaterThanOrEqual(6);
    expect(surprise.parts.microTension.points).toBe(3);
  });

  it('does not reward "your" when it is forced', () => {
    const natural = scoreEditorial('That Hole on Your Pen Cap Has a Real Job', CTX);
    const forced = scoreEditorial('Your Manhole Covers Are Round', CTX);
    expect(forced.parts.personalRelevance.points)
      .toBeLessThan(natural.parts.personalRelevance.points);
  });
});

/* ======================================== LAYER C — history penalties */

describe('history penalties', () => {
  it('penalises a spoiler heavily without rejecting it', () => {
    const r = evaluateTitle(SPOILER, CTX);
    expect(r.rejected).toBe(false);
    const spoiler = r.penalties.applied.find((p) => p.id === 'SPOILER');
    expect(spoiler).toBeDefined();
    expect(spoiler.points).toBeGreaterThan(5);
    expect(r.score).toBeLessThan(evaluateTitle(GOOD, CTX).score);
  });

  it('does not fire the spoiler penalty on a title that only asks the question', () => {
    expect(scorePenalties('Why Do Gas Pumps Stop On Their Own?', CTX)
      .applied.some((p) => p.id === 'SPOILER')).toBe(false);
  });

  it('penalises repeated grammar families proportionally', () => {
    const history = Array.from({ length: 8 }, (_, i) => `Why Do Widgets Have That Part ${i}`);
    const heavy = scorePenalties('Why Do Gas Pumps Have That Nozzle', { ...CTX, history });
    const light = scorePenalties('Why Do Gas Pumps Have That Nozzle', { ...CTX, history: history.slice(0, 1) });
    const of = (r) => r.applied.find((p) => p.id === 'GRAMMAR_FAMILY_REPETITION')?.points ?? 0;
    expect(of(heavy)).toBeGreaterThan(of(light));
  });

  it('never exceeds a configured penalty maximum', () => {
    const history = Array.from({ length: 20 }, () => 'That Tiny Hole on a Gas Pump Has a Job');
    const r = scorePenalties('That Tiny Hole on a Gas Pump Has a Job', { ...CTX, history });
    for (const p of r.applied) {
      expect(p.points).toBeLessThanOrEqual(PENALTIES.find((x) => x.id === p.id).max);
    }
  });

  it('penalises a repeated opening phrase', () => {
    const history = ['That Hole Has a Job', 'That Mesh Has a Job', 'That Arrow Has a Job'];
    expect(scorePenalties('That Nozzle Has a Job', { ...CTX, history })
      .applied.some((p) => p.id === 'OPENING_PHRASE_REPETITION')).toBe(true);
  });

  it('penalises caps, emoji and clickbait punctuation', () => {
    const r = scorePenalties('This Gas Pump Trick Is AMAZING!! 😱🔥', CTX);
    const p = r.applied.find((x) => x.id === 'PUNCTUATION_ABUSE');
    expect(p).toBeDefined();
    expect(p.points).toBe(PENALTIES.find((x) => x.id === 'PUNCTUATION_ABUSE').max);
  });

  it('explains every penalty it applies', () => {
    const history = ['That Hole Has a Job', 'That Mesh Has a Job', 'That Arrow Has a Job'];
    for (const p of scorePenalties('That Nozzle Has a Job', { ...CTX, history }).applied) {
      expect(typeof p.why).toBe('string');
      expect(p.why.length).toBeGreaterThan(0);
    }
  });
});

/* ======================================================= final score */

describe('title selection score', () => {
  it('is editorial minus penalties, clamped to 0-100', () => {
    const r = evaluateTitle(SPOILER, CTX);
    expect(r.score).toBeCloseTo(Math.max(0, r.editorial.raw - r.penalties.total), 1);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('lets a clean title beat a stronger one that repeats the channel', () => {
    // The brief's worked example: a higher raw score can lose on history penalties.
    const history = Array.from({ length: 10 }, (_, i) => `Why Do Widgets Have That Part ${i}`);
    const repetitive = evaluateTitle('Why Do Gas Pumps Have That Nozzle', { ...CTX, history });
    const fresh = evaluateTitle('That Nozzle on a Gas Pump Has a Job', { ...CTX, history });
    expect(repetitive.penalties.total).toBeGreaterThan(fresh.penalties.total);
  });

  it('sorts rejected candidates below every scored one', () => {
    const pool = evaluatePool([UNSUPPORTED, GOOD, CLICKBAIT, TEXTBOOK], CTX);
    expect(pool[0].rejected).toBe(false);
    expect(pool[pool.length - 1].rejected).toBe(true);
  });
});

/* =================================================== families & pool */

describe('grammar families', () => {
  it('classifies the ten shapes the channel uses', () => {
    expect(classifyFamily('How Does a Gas Pump Work?')).toBe('QUESTION');
    expect(classifyFamily('How a Gas Pump Knows Your Tank Is Full')).toBe('MECHANISM');
    expect(classifyFamily("Escalator Brushes Aren't There to Clean Your Shoes")).toBe('CONTRADICTION');
    expect(classifyFamily('The Hidden Reason Manhole Covers Are Round')).toBe('HIDDEN_REASON');
    expect(classifyFamily('That Tiny Pocket on Your Jeans')).toBe('OBJECT_MYSTERY');
    expect(classifyFamily('Why Manhole Covers Are Round')).toBe('OBSERVATION');
  });

  it('prefers the mechanism reading over the incidental "your"', () => {
    // "How ... Your Tank ..." is a mechanism title that happens to address the viewer.
    expect(classifyFamily('How a Gas Pump Knows Your Tank Is Full')).not.toBe('PERSONAL_RELEVANCE');
  });
});

describe('candidate pool', () => {
  const pool = generateCandidatePool({ contentId: 'gas-pump-shutoff', coreObject: 'Gas Pump Shutoff' });

  it('produces at least sixteen candidates', () => {
    expect(pool.length).toBeGreaterThanOrEqual(16);
  });

  it('spans several grammar families', () => {
    expect(new Set(pool.map(classifyFamily)).size).toBeGreaterThanOrEqual(5);
  });

  it('does not open every candidate with "Why"', () => {
    const why = pool.filter((t) => /^why\b/i.test(t)).length;
    expect(why / pool.length).toBeLessThan(0.3);
  });

  it('includes the episode-specific angles rather than dropping them at the cap', () => {
    // Appending angles and then slicing to the cap silently discarded all of them.
    expect(pool).toContain('How a Gas Pump Knows Your Tank Is Full');
  });

  it('agrees in number for a plural feature', () => {
    const brushes = generateCandidatePool({ contentId: 'escalator-brushes', coreObject: 'Escalator Brushes' });
    expect(brushes.some((t) => /an escalator brushes/i.test(t))).toBe(false);
    expect(brushes.some((t) => /those brushes/i.test(t))).toBe(true);
  });

  it('does not force second person onto an object nobody owns', () => {
    const manholes = generateCandidatePool({ contentId: 'round-manhole-covers', coreObject: 'Round Manhole Covers' });
    expect(manholes.some((t) => /\byour\b/i.test(t))).toBe(false);
  });
});

/* ================================================= batch optimisation */

describe('batch optimisation', () => {
  const mk = (id, titles) => ({
    contentId: id,
    candidates: titles.map((t, i) => ({
      title: t, family: classifyFamily(t), rejected: false,
      score: 90 - i, penalties: { applied: [] },
    })),
  });

  it('costs a batch that repeats one grammar family', () => {
    const same = ['Why A Has X', 'Why B Has Y', 'Why C Has Z', 'Why D Has W'];
    const varied = ['Why A Has X', 'How B Works', "That C Isn't What You Think", 'The Hidden Reason D Exists'];
    expect(batchRepetitionCost(same).total).toBeGreaterThan(batchRepetitionCost(varied).total);
  });

  it('trades a little individual quality for a more varied feed', () => {
    // Every episode's best candidate is the same grammar; the second is varied.
    const episodes = ['a', 'b', 'c', 'd'].map((id, i) =>
      mk(id, [`Why ${id.toUpperCase()} Has That Part`, `How ${id.toUpperCase()} Uses That Part`,
        `That Part on ${id.toUpperCase()} Has a Job`]));
    const picked = optimiseBatch(episodes);
    const families = new Set(picked.picks.map((p) => classifyFamily(p.title)));
    expect(families.size).toBeGreaterThan(1);
  });

  it('returns one pick per episode, in the caller order', () => {
    const episodes = ['a', 'b', 'c'].map((id) =>
      mk(id, [`Why ${id} Has That Part`, `How ${id} Uses That Part`]));
    const r = optimiseBatch(episodes);
    expect(r.picks).toHaveLength(3);
    expect(r.picks.map((p) => p.contentId)).toEqual(['a', 'b', 'c']);
  });

  it('refuses to invent a pick when every candidate was rejected', () => {
    expect(() => optimiseBatch([{ contentId: 'x', candidates: [{ rejected: true, score: null }] }]))
      .toThrow(/No candidate passed/);
  });

  it('is deterministic — the same input gives the same batch', () => {
    const episodes = ['a', 'b', 'c'].map((id) =>
      mk(id, [`Why ${id} Has That Part`, `How ${id} Uses That Part`, `That Part on ${id} Has a Job`]));
    const one = optimiseBatch(episodes).picks.map((p) => p.title);
    const two = optimiseBatch(episodes).picks.map((p) => p.title);
    expect(one).toEqual(two);
  });

  it('reports the health of the chosen set', () => {
    const episodes = ['a', 'b', 'c', 'd'].map((id) =>
      mk(id, [`Why ${id} Has That Part`, `How ${id} Uses That Part`]));
    const h = batchHealth(optimiseBatch(episodes).picks);
    expect(h.count).toBe(4);
    expect(h.familyDistribution.length).toBeGreaterThan(0);
    expect(h.similarityMatrix).toHaveLength(4);
    expect(h.averageScore).toBeGreaterThan(0);
  });
});
