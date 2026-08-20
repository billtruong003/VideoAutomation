#!/usr/bin/env node
/**
 * metadata-lint-demo.mjs — prove the anti-AI copy linter on real episode material.
 *
 *   npm run youtube:lint-demo
 *
 * Uses episode 01's ACTUAL transcript from data/batch-001.json as the factual ground truth,
 * and a synthetic "recent uploads" history built from the batch's own titles, so the novelty
 * and grammar-family checks have something real to compare against.
 *
 * Nothing here touches Google. It is pure local domain logic, which is exactly the point:
 * the metadata studio must be testable without a network.
 */

import { readFileSync } from 'node:fs';
import { rankCandidates } from '../src/youtube/metadata/lint.mjs';

const batch = JSON.parse(readFileSync('data/batch-001.json', 'utf8'));
const ep = batch.episodes.find((e) => e.slug === 'airplane-window-hole');

/** Stand-in for published history until the channel has one. */
const history = batch.episodes
  .filter((e) => e.slug !== ep.slug)
  .slice(0, 6)
  .map((e) => ({ title: e.title, description: '' }));

const CANDIDATES = [
  { title: 'Why Airplane Windows Have That Tiny Hole' },
  { title: 'That Tiny Hole in Your Airplane Window Has a Job' },
  { title: 'Did You Know Airplane Windows Have a Secret Hole?' },
  { title: "The Hole in Your Airplane Window Isn't a Defect" },
  { title: 'You Won\'t Believe What That Insane Airplane Window Hole Does!!' },
  { title: 'Why Your Airplane Window Has a 3 Inch Hole' },
  { title: 'Airplane Window Holes: The Hidden Reason — Explained' },
  { title: 'How an Airplane Window Survives 30,000 Feet' },
];

const results = rankCandidates(CANDIDATES, { history, facts: ep.transcript });

console.log(`\nEpisode : ${ep.title}`);
console.log(`Facts   : ${ep.transcript.slice(0, 92)}…`);
console.log(`History : ${history.length} recent titles\n`);
console.log('='.repeat(78));

for (const [i, r] of results.entries()) {
  const badge = r.errors ? `${r.errors} ERROR` : r.warnings ? `${r.warnings} warn` : 'clean';
  console.log(`\n${i + 1}. ${r.title}`);
  console.log(`   score ${r.score.overall.toFixed(2)}  family ${r.family.padEnd(10)} ${badge}`);
  console.log(`   clarity ${r.score.clarity.toFixed(2)} · curiosity ${r.score.curiosity.toFixed(2)} · ` +
    `specificity ${r.score.specificity.toFixed(2)} · truth ${r.score.truthfulness.toFixed(2)} · ` +
    `fit ${r.score.channelFit.toFixed(2)} · novelty ${r.score.novelty.toFixed(2)}`);
  for (const is of r.issues) {
    console.log(`   ${is.severity === 'error' ? '✗' : '!'} ${is.code}: ${is.message}`);
    if (is.hint) console.log(`     → ${is.hint}`);
  }
}

console.log(`\n${'='.repeat(78)}`);
console.log(`\nWinner: "${results[0].title}"`);
console.log('\nNote: ranked on clarity, specificity, truthfulness, channel fit and novelty.');
console.log('There is deliberately no "predicted views" or "virality" score — we have no data');
console.log('to support one, and inventing it would mislead the creator.\n');
