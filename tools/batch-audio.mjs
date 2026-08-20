#!/usr/bin/env node
/**
 * batch-audio.mjs — condition every episode's narration, in one pass.
 *
 *   node tools/batch-audio.mjs [--episode <slug>] [--tempo 1.12]
 *
 * For each episode: estimate word alignment from the SRT, then run the conditioning chain
 * (silence cleanup -> pitch-preserving speed-up -> loudness normalisation) and emit the
 * processed WAV plus its time map.
 *
 * One episode failing must not corrupt the other nine, so each runs in isolation and a
 * failure is recorded rather than thrown. Timing remap and the sync gate run afterwards as
 * their own steps — this stage only produces audio.
 *
 * TEMPO is per-episode-overridable from episode.json (`audio.tempo`). The house default is
 * 1.12x, but intelligibility beats uniformity: a narration that is already brisk gets less.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { config, paths, readJson, selection } from './episode.mjs';

const { slugs, manifest, rest } = selection();
const tempoOverride = (() => {
  const i = rest.indexOf('--tempo');
  return i >= 0 ? Number(rest[i + 1]) : null;
})();

mkdirSync('public/audio', { recursive: true });

const node = process.execPath;
const runNode = (args) =>
  execFileSync(node, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });

const rows = [];

for (const slug of slugs) {
  const P = paths(slug);
  const src = manifest.episodes.find((e) => e.slug === slug);
  mkdirSync(P.dir, { recursive: true });

  try {
    if (!existsSync(P.config)) throw new Error(`no episode.json — author it before processing audio`);
    const cfg = config(slug);
    const tempo = tempoOverride ?? cfg.audio?.tempo ?? 1.12;
    const minSilence = cfg.audio?.minSilence ?? 0.08;

    runNode(['tools/srt-to-alignment.mjs', src.audio, src.subtitle, P.raw]);
    runNode([
      'tools/process-voiceover.mjs', src.audio, P.wav,
      '--tempo', String(tempo), '--minSilence', String(minSilence),
    ]);

    const map = readJson(P.timemap);
    rows.push({
      slug,
      ok: true,
      raw: map.rawDuration,
      cut: map.cutDuration,
      out: map.processedDuration,
      tempo,
      effective: map.effectiveTempo,
      removed: map.silenceRemoved,
    });
    console.log(
      `[ok]   ${slug.padEnd(22)} ${map.rawDuration.toFixed(2)}s -> ${map.processedDuration.toFixed(2)}s ` +
      `(-${map.silenceRemoved.toFixed(2)}s silence, ${tempo}x)`,
    );
  } catch (e) {
    const detail = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`.trim().split('\n').slice(-4).join(' ');
    rows.push({ slug, ok: false, error: detail });
    console.error(`[FAIL] ${slug.padEnd(22)} ${detail}`);
  }
}

const bad = rows.filter((r) => !r.ok);
console.log('');
console.log(`${rows.length - bad.length}/${rows.length} narrations processed`);
if (bad.length) {
  for (const b of bad) console.log(`  FAILED ${b.slug}: ${b.error}`);
  process.exit(1);
}

const total = rows.reduce((a, r) => a + r.out, 0);
console.log(`total processed narration: ${total.toFixed(1)}s across ${rows.length} episodes`);
