/**
 * title-batch.mjs — choose ten titles together, not ten titles separately.
 *
 * Picking each episode's highest-scoring candidate independently is the obvious approach and
 * it is wrong for a launch batch. Every episode on this channel has the same shape -- an
 * everyday object with an odd feature -- so the same grammar wins every time, and ten
 * independently optimal choices produce a feed where every title reads
 * "That Tiny X on a Y". Each one is individually the best; together they look generated.
 *
 * So selection optimises the SET. Each episode contributes its own quality, and the batch is
 * charged for repetition across grammar families, opening words, cadence, keywords and
 * semantics. The result is occasionally a title that is second-best in isolation, chosen
 * because it makes the other nine read better.
 *
 * Diversity is weighted, not lexicographic. A varied batch of weak titles is not the goal
 * either, and `TITLE_CONFIG.batch.diversityWeight` is where that trade-off is set.
 */

import { TITLE_CONFIG } from './title-config.mjs';
import { classifyFamily } from './title-engine.mjs';

const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
const wordsOf = (s) => norm(s).split(' ').filter(Boolean);

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

const stem = (w) => (w.endsWith('ies') ? `${w.slice(0, -3)}y`
  : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'that', 'this', 'on', 'in', 'of', 'to',
  'for', 'has', 'have', 'your', 'you', 'it', 'its', 'and', 'does', 'do', 'why', 'how', 'what']);

const keywordsOf = (t) => wordsOf(t).filter((w) => !STOP.has(w) && w.length > 3).map(stem);

/**
 * How much repetition a set of titles contains. Higher is worse.
 *
 * Every component is normalised to roughly 0..1 so the weights below mean what they say.
 */
export function batchRepetitionCost(titles) {
  const n = titles.length;
  if (n < 2) return { total: 0, parts: {} };

  // Grammar family concentration. A batch where one family holds half the slots is the
  // failure this whole module exists to prevent, so it carries the most weight.
  const fams = titles.map(classifyFamily);
  const famCounts = {};
  for (const f of fams) famCounts[f] = (famCounts[f] ?? 0) + 1;
  const famMax = Math.max(...Object.values(famCounts));
  const familyCost = Math.max(0, (famMax / n) - TITLE_CONFIG.familyShareMax) / (1 - TITLE_CONFIG.familyShareMax);

  // Opening word. "That" ten times reads as one writer with one habit.
  const opens = titles.map((t) => wordsOf(t)[0] ?? '');
  const openCounts = {};
  for (const o of opens) openCounts[o] = (openCounts[o] ?? 0) + 1;
  const openMax = Math.max(...Object.values(openCounts));
  const openingCost = Math.max(0, (openMax / n) - 0.3) / 0.7;

  // Cadence: identical word count and question/statement shape.
  const shapes = titles.map((t) => `${wordsOf(t).length}:${/\?$/.test(t.trim()) ? 'q' : 'd'}`);
  const shapeCounts = {};
  for (const s of shapes) shapeCounts[s] = (shapeCounts[s] ?? 0) + 1;
  const shapeMax = Math.max(...Object.values(shapeCounts));
  const cadenceCost = Math.max(0, (shapeMax / n) - 0.3) / 0.7;

  // Pairwise semantic similarity, averaged over the worst offenders.
  const tris = titles.map(trigrams);
  const sims = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) sims.push(jaccard(tris[i], tris[j]));
  }
  sims.sort((a, b) => b - a);
  const worst = sims.slice(0, Math.max(1, Math.floor(sims.length * 0.2)));
  const semanticCost = worst.reduce((a, b) => a + b, 0) / worst.length;

  // Distinctive words reused across episodes. "Tiny" in six titles is one voice, not six.
  const kwCounts = {};
  for (const t of titles) for (const k of new Set(keywordsOf(t))) kwCounts[k] = (kwCounts[k] ?? 0) + 1;
  const reused = Object.values(kwCounts).filter((c) => c >= 3).reduce((a, c) => a + (c - 2), 0);
  const keywordCost = Math.min(1, reused / n);

  const parts = { familyCost, openingCost, cadenceCost, semanticCost, keywordCost };
  const total = familyCost * 0.34 + openingCost * 0.22 + cadenceCost * 0.14
    + semanticCost * 0.20 + keywordCost * 0.10;
  return { total, parts };
}

/**
 * Choose one title per episode, optimising quality and batch diversity together.
 *
 * Beam search with restarts rather than exhaustive enumeration: ten episodes with twenty
 * surviving candidates each is 20^10 combinations. The beam keeps the best partial sets as it
 * walks the episodes, and the restarts re-run in different episode orders because a greedy
 * walk is biased by whichever episode it commits to first.
 *
 * @param episodes [{ contentId, candidates: [{title, score, ...}] }]
 * @returns { picks, objective, quality, repetition, alternatives }
 */
export function optimiseBatch(episodes, options = {}) {
  const { diversityWeight, beamWidth, restarts } = { ...TITLE_CONFIG.batch, ...options };

  const usable = episodes.map((e) => ({
    contentId: e.contentId,
    // Only gated-through candidates are eligible; a rejected title is not a trade-off.
    candidates: (e.candidates ?? []).filter((c) => !c.rejected && c.score != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12),
  }));

  const missing = usable.filter((e) => !e.candidates.length);
  if (missing.length) {
    throw new Error(`No candidate passed the hard gates for: ${missing.map((m) => m.contentId).join(', ')}`);
  }

  /** Objective: mean quality, minus the batch's repetition cost. Higher is better. */
  const objectiveOf = (picks) => {
    const quality = picks.reduce((n, p) => n + p.score, 0) / picks.length;
    const rep = batchRepetitionCost(picks.map((p) => p.title));
    // Repetition is scaled to the same 0-100 space as quality so the weight is meaningful.
    return { objective: quality - rep.total * 100 * diversityWeight, quality, rep };
  };

  let best = null;

  for (let r = 0; r < restarts; r++) {
    /*
     * Vary the episode order per restart. A beam that always starts with episode 1 lets that
     * episode's strongest candidate dictate which families are still cheap for everyone else.
     */
    const order = usable.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = (i * 7 + r * 13 + 5) % (i + 1); // deterministic shuffle; no Math.random
      [order[i], order[j]] = [order[j], order[i]];
    }

    let beam = [[]];
    for (const idx of order) {
      const ep = usable[idx];
      const next = [];
      for (const partial of beam) {
        for (const cand of ep.candidates) {
          const picks = [...partial, { contentId: ep.contentId, ...cand }];
          next.push({ picks, ...objectiveOf(picks) });
        }
      }
      next.sort((a, b) => b.objective - a.objective);
      beam = next.slice(0, beamWidth).map((x) => x.picks);
    }

    for (const picks of beam) {
      const scored = objectiveOf(picks);
      if (!best || scored.objective > best.objective) {
        best = { picks, ...scored };
      }
    }
  }

  // Restore the caller's episode order — the shuffle is an implementation detail.
  const byId = new Map(best.picks.map((p) => [p.contentId, p]));
  const picks = episodes.map((e) => byId.get(e.contentId));

  return {
    picks,
    objective: Math.round(best.objective * 100) / 100,
    quality: Math.round(best.quality * 100) / 100,
    repetition: best.rep,
  };
}

/**
 * Describe the chosen batch, for the diversity report.
 * Purely observational — it computes nothing the optimiser used, so it can disagree with it.
 */
export function batchHealth(picks) {
  const titles = picks.map((p) => p.title);
  const n = titles.length;

  const tally = (arr) => {
    const m = {};
    for (const x of arr) m[x] = (m[x] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const families = tally(titles.map(classifyFamily));
  const openings = tally(titles.map((t) => wordsOf(t)[0] ?? ''));

  const kw = {};
  for (const t of titles) for (const k of new Set(keywordsOf(t))) kw[k] = (kw[k] ?? 0) + 1;
  const repeatedKeywords = Object.entries(kw).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);

  const tris = titles.map(trigrams);
  const matrix = [];
  const pairs = [];
  for (let i = 0; i < n; i++) {
    matrix.push([]);
    for (let j = 0; j < n; j++) {
      const s = i === j ? 1 : jaccard(tris[i], tris[j]);
      matrix[i].push(Math.round(s * 100) / 100);
      if (j > i) pairs.push({ a: picks[i].contentId, b: picks[j].contentId, similarity: Math.round(s * 100) / 100 });
    }
  }
  pairs.sort((x, y) => y.similarity - x.similarity);

  const scores = picks.map((p) => p.score);
  const lengths = titles.map((t) => t.length);

  return {
    count: n,
    averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / n) * 10) / 10,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    averageTitleLength: Math.round(lengths.reduce((a, b) => a + b, 0) / n),
    familyDistribution: families,
    familyDiversity: families.length,
    openingDistribution: openings,
    repeatedKeywords,
    // "tiny" and "why" are called out by name in the brief; they are the two habits this
    // channel is most likely to fall into.
    tinyCount: titles.filter((t) => /\btiny\b/i.test(t)).length,
    whyCount: titles.filter((t) => /^why\b/i.test(t.trim())).length,
    similarityMatrix: matrix,
    mostSimilarPairs: pairs.slice(0, 5),
    spoilerWarnings: picks.filter((p) => p.penalties?.applied?.some((x) => x.id === 'SPOILER'))
      .map((p) => ({ contentId: p.contentId, title: p.title })),
    aiStyleWarnings: picks.filter((p) => p.penalties?.applied?.some((x) => x.id === 'AI_CLICKBAIT_STYLE'))
      .map((p) => ({ contentId: p.contentId, title: p.title })),
  };
}
