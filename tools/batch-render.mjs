#!/usr/bin/env node
/**
 * batch-render.mjs — render every episode in the batch to its final MP4.
 *
 *   node tools/batch-render.mjs [--episode <slug>] [--preview]
 *
 * `--preview` renders small and cheap (scale 0.35, CRF 32) into preview/batch-001/, for
 * pacing checks. Without it, the delivery render: full 1080x1920, H.264, CRF 17.
 *
 * Episodes render SEQUENTIALLY and independently. Remotion already saturates the machine
 * with per-frame workers, so running two episodes at once just makes both slower — and more
 * importantly, one episode failing must not take the batch down with it. A failure is
 * recorded and the run continues, because nine delivered videos and one honest error beats
 * ten missing ones.
 *
 * Output names are derived from the topic slug, numbered in channel order, so the folder
 * sorts the way the batch is meant to be watched.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { selection } from './episode.mjs';

const { slugs, manifest, rest, batchId } = selection();
const preview = rest.includes('--preview');
/**
 * Re-render something that already exists.
 *
 * Off by default so an interrupted batch resumes instead of starting over: twenty episodes is
 * over an hour of rendering, and losing all of it to one crash at episode nineteen is the
 * failure mode this run has to survive.
 */
const force = rest.includes('--force');

/*
 * The output folder follows the BATCH. This was hard-coded to batch-001, which was correct
 * when there was one batch and silently wrong the moment there were two -- batch 002 would
 * have rendered straight over batch 001's delivered files, in a folder whose name said they
 * were something else.
 */
const OUT_DIR = `${preview ? 'preview' : 'out'}/${batchId}`;
mkdirSync(OUT_DIR, { recursive: true });

const compositionId = (slug) =>
  slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');

const started = process.hrtime.bigint();
const results = [];

for (const slug of slugs) {
  const entry = manifest.episodes.find((e) => e.slug === slug);
  const n = String(entry.n).padStart(2, '0');
  const file = `${OUT_DIR}/${n}-${slug}.mp4`;

  const args = ['remotion', 'render', compositionId(slug), file, '--codec=h264'];
  args.push(...(preview ? ['--scale=0.35', '--crf=32'] : ['--crf=17']));

  const t0 = process.hrtime.bigint();
  process.stdout.write(`[${n}] ${slug} ... `);

  // Resume: a finished file is left alone unless --force asks for it again.
  if (!force && existsSync(file) && statSync(file).size > 0) {
    const size = statSync(file).size;
    results.push({ slug, file, ok: true, secs: 0, size, skipped: true });
    console.log(`skip (exists ${(size / 1e6).toFixed(1)} MB)`);
    continue;
  }

  try {
    execFileSync('npx', args, {
      stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', shell: true, maxBuffer: 1 << 26,
    });
    const secs = Number(process.hrtime.bigint() - t0) / 1e9;
    const size = existsSync(file) ? statSync(file).size : 0;
    if (!size) throw new Error('render reported success but produced no file');
    results.push({ slug, file, ok: true, secs, size });
    console.log(`ok  ${(size / 1e6).toFixed(1)} MB  ${secs.toFixed(0)}s`);
  } catch (e) {
    const detail = `${e.stderr || ''}${e.message || ''}`.trim().split('\n').slice(-5).join(' ');
    results.push({ slug, file, ok: false, error: detail });
    console.log(`FAILED\n      ${detail}`);
  }
}

const total = Number(process.hrtime.bigint() - started) / 1e9;
const good = results.filter((r) => r.ok);

console.log('');
console.log(`${good.length}/${results.length} rendered in ${(total / 60).toFixed(1)} min -> ${OUT_DIR}`);
for (const r of results.filter((x) => !x.ok)) console.log(`  FAILED ${r.slug}: ${r.error}`);
process.exit(good.length === results.length ? 0 : 1);
