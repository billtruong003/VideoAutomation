/**
 * episode.mjs — where an episode's files live, and how to find them.
 *
 * Episode 001 hard-coded `data/narration-timing.json` and `public/audio/voiceover-*.wav`
 * throughout the toolchain, which is fine for one episode and impossible for ten. This is
 * the single place that knows the layout, so a tool takes `--episode <slug>` and asks here
 * rather than assembling paths of its own.
 *
 *   episodes/<slug>/episode.json          AUTHORED  — scene split, keywords, beat plan
 *   episodes/<slug>/subtitles-raw.json    generated — word alignment from the source SRT
 *   episodes/<slug>/narration-timing.json generated — THE MASTER CLOCK
 *   episodes/<slug>/subtitles-processed.json
 *   episodes/<slug>/storyboard.json
 *   public/audio/<slug>.wav               generated — the locked narration
 *   public/audio/<slug>.timemap.json
 *
 * The WAV lives under public/ because Remotion serves episode audio through staticFile();
 * everything else lives with the episode.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ROOT = resolve(process.cwd());

export function batch(id = 'batch-001') {
  const p = `${ROOT}/data/${id}.json`;
  if (!existsSync(p)) throw new Error(`no batch manifest at ${p} — run tools/build-batch.mjs first`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function paths(slug) {
  const dir = `${ROOT}/episodes/${slug}`;
  return {
    slug,
    dir,
    config: `${dir}/episode.json`,
    raw: `${dir}/subtitles-raw.json`,
    timing: `${dir}/narration-timing.json`,
    processedSubs: `${dir}/subtitles-processed.json`,
    storyboard: `${dir}/storyboard.json`,
    wav: `${ROOT}/public/audio/${slug}.wav`,
    timemap: `${ROOT}/public/audio/${slug}.timemap.json`,
    /** Path as Remotion's staticFile() wants it. */
    staticAudio: `audio/${slug}.wav`,
  };
}

/** The manifest entry for one episode: source paths, title, raw duration. */
export function entry(slug, batchId) {
  const b = batch(batchId);
  const e = b.episodes.find((x) => x.slug === slug);
  if (!e) throw new Error(`episode "${slug}" is not in ${b.batch}`);
  return e;
}

export function config(slug) {
  const p = paths(slug).config;
  if (!existsSync(p)) throw new Error(`no episode config at ${p}`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/**
 * Read `--episode <slug>` from argv, defaulting to every episode in the batch.
 *
 * Batch-by-default is deliberate: the failure this avoids is processing nine episodes,
 * forgetting the tenth, and shipping a batch whose last video was built from stale timing.
 */
export function selection(argv = process.argv.slice(2)) {
  const opts = { batch: 'batch-001', episodes: null, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--episode' || argv[i] === '-e') opts.episodes = [argv[++i]];
    else if (argv[i] === '--batch') opts.batch = argv[++i];
    else opts.rest.push(argv[i]);
  }
  const b = batch(opts.batch);
  const slugs = opts.episodes ?? b.episodes.map((e) => e.slug);
  for (const s of slugs) {
    if (!b.episodes.some((e) => e.slug === s)) throw new Error(`unknown episode "${s}" in ${b.batch}`);
  }
  return { batchId: opts.batch, manifest: b, slugs, rest: opts.rest };
}
