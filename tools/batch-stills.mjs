#!/usr/bin/env node
/**
 * batch-stills.mjs — render QA stills at semantic frames, for every episode.
 *
 *   node tools/batch-stills.mjs [--episode <slug>] [--per 5]
 *
 * Frames are chosen from the STORYBOARD rather than picked by hand, so the QA set always
 * lands on real beats — and if a narration is reprocessed the stills follow it instead of
 * quietly drifting onto nothing. Beats are sampled evenly across the episode so the set
 * covers every scene rather than clustering in whichever one has the most going on.
 *
 * Stills are the cheapest QA in the pipeline: they decide composition, safe zones, clipping
 * and readability in seconds where a preview costs minutes. Renders run one episode at a
 * time because each `remotion still` re-bundles; that is the price of using the CLI.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { paths, readJson, selection } from './episode.mjs';

const { slugs, rest } = selection();
const per = (() => {
  const i = rest.indexOf('--per');
  return i >= 0 ? Number(rest[i + 1]) : 5;
})();

const OUT = 'qa/batch-001';
mkdirSync(OUT, { recursive: true });

const compositionId = (slug) =>
  slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

let rendered = 0;

for (const slug of slugs) {
  const sb = readJson(paths(slug).storyboard);
  const beats = sb.scenes
    .flatMap((s) => s.beats.map((b) => ({ ...b, scene: s.scene })))
    .sort((a, b) => a.t - b.t);

  // Sample evenly across the whole episode, and always take the very first beat: the hook
  // has to be right at frame 0 and it is the one beat that cannot be judged from any other.
  const picks = [];
  for (let i = 0; i < per; i++) {
    const idx = Math.min(beats.length - 1, Math.round((i / Math.max(1, per - 1)) * (beats.length - 1)));
    if (!picks.includes(idx)) picks.push(idx);
  }

  for (const idx of picks) {
    const beat = beats[idx];
    // land a few frames AFTER the beat, so whatever it triggers has actually appeared
    const frame = Math.max(0, beat.frame + 6);
    const file = `${OUT}/${slug}-${String(frame).padStart(4, '0')}-${beat.scene}.png`;
    try {
      execFileSync('npx', ['remotion', 'still', compositionId(slug), file, `--frame=${frame}`, '--scale=0.5'], {
        stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', shell: true,
      });
      rendered++;
      console.log(`  ${file}   (${beat.scene}: ${beat.action.slice(0, 62)})`);
    } catch (e) {
      console.error(`  FAILED ${slug} @${frame}: ${(e.stderr || e.message).split('\n').slice(-3).join(' ')}`);
    }
  }
}

console.log(`\n${rendered} stills in ${OUT}`);
