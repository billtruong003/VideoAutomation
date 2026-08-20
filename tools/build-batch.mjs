#!/usr/bin/env node
/**
 * build-batch.mjs — resolve a folder of ElevenLabs exports into an episode manifest.
 *
 *   node tools/build-batch.mjs <source-dir> <batch-id>
 *
 * ElevenLabs names its audio and its subtitle export differently — the audio keeps the
 * voice name verbatim ("George - Warm, Captivating Storyteller") while the .srt slugs the
 * punctuation out of it and appends a language code. Alphabetical order therefore does NOT
 * pair them, and a duplicate download turns "…v3 (1).mp3" into "…v3_1_eng.srt".
 *
 * The one field both exports agree on is the RENDER TIMESTAMP baked into the filename
 * (`2026-08-19T16_31_15`), which is unique per generation. That is the join key. Every
 * pair is then validated against the actual files — audio decodes, transcript is non-empty
 * English, and the SRT's last cue lands inside the audio's real duration — so a filename
 * that merely *looks* right cannot silently produce a mismatched episode.
 *
 * Titles/slugs are NOT derived from filenames (they carry no topic). They come from
 * data/batch-topics.json, keyed by the same timestamp, and every pair must have one.
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';
import { probeDuration } from './ffbin.mjs';

const [SRC, BATCH_ID = 'batch-001'] = process.argv.slice(2);
if (!SRC) {
  console.error('usage: node tools/build-batch.mjs <source-dir> [batch-id]');
  process.exit(1);
}
const ROOT = resolve(process.cwd());
const TOPICS = JSON.parse(readFileSync(`${ROOT}/data/batch-topics.json`, 'utf8'));

/** `2026-08-19T16_31_15` — unique per ElevenLabs generation, present in both exports. */
const STAMP = /(\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2})/;

/** A re-download appends "(1)" to the audio and "_1_" to the srt. Same generation, so the
 *  suffix has to join too or the two "21_51_23" files cross-pair. */
const dupTag = (name) => (/\(\d+\)|_\d+_eng\./.test(name) ? '1' : '0');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(resolve(SRC));
const audio = new Map();
const subs = new Map();

for (const f of files) {
  const ext = extname(f).toLowerCase();
  const m = STAMP.exec(basename(f));
  if (!m) continue;
  const key = `${m[1]}#${dupTag(basename(f))}`;
  if (['.mp3', '.wav', '.m4a'].includes(ext)) audio.set(key, f);
  else if (['.srt', '.json', '.vtt'].includes(ext)) subs.set(key, f);
}

const keys = [...new Set([...audio.keys(), ...subs.keys()])].sort();

const probe = (p) => probeDuration(p);

/** Last cue end in an SRT, in seconds — the transcript's own claim about its length. */
function srtEnd(text) {
  const times = [...text.matchAll(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/g)];
  if (!times.length) return null;
  const last = times[times.length - 1];
  return +last[5] * 3600 + +last[6] * 60 + +last[7] + +last[8] / 1000;
}

const episodes = [];
const problems = [];

for (const key of keys) {
  const a = audio.get(key);
  const s = subs.get(key);
  const stamp = key.split('#')[0];

  if (!a) { problems.push(`${key}: subtitle with no audio (${s})`); continue; }
  if (!s) { problems.push(`${key}: audio with no subtitle (${a})`); continue; }

  const topic = TOPICS[key] ?? TOPICS[stamp];
  if (!topic) { problems.push(`${key}: no topic entry in data/batch-topics.json`); continue; }

  const text = readFileSync(s, 'utf8');
  const cueEnd = srtEnd(text);
  const dur = probe(a);
  const transcript = text
    .split(/\r?\n\r?\n/)
    .map((b) => b.split(/\r?\n/).slice(2).join(' ').trim())
    .filter(Boolean)
    .join(' ');

  // --- pair validation (Phase 2.1) ---
  if (!Number.isFinite(dur) || dur <= 0) problems.push(`${key}: audio will not decode`);
  if (!transcript) problems.push(`${key}: transcript is empty`);
  if (cueEnd === null) problems.push(`${key}: no cue timestamps in subtitle`);
  // The transcript must belong to THIS audio: its last cue cannot run past the file.
  else if (cueEnd > dur + 0.5) {
    problems.push(`${key}: subtitle runs to ${cueEnd.toFixed(2)}s but audio is only ${dur.toFixed(2)}s — wrong pair`);
  } else if (cueEnd < dur * 0.6) {
    problems.push(`${key}: subtitle ends at ${cueEnd.toFixed(2)}s, far short of ${dur.toFixed(2)}s audio — wrong pair`);
  }
  if (dur > 60) problems.push(`${key}: ${dur.toFixed(1)}s raw is too long for a Short even after speed-up`);
  // English check: these are global-audience Shorts, so a non-Latin transcript is a bad export.
  const latin = (transcript.match(/[a-zA-Z]/g) || []).length / transcript.length;
  if (latin < 0.6) problems.push(`${key}: transcript does not look like English (${(latin * 100).toFixed(0)}% latin)`);

  episodes.push({
    n: episodes.length + 1,
    slug: topic.slug,
    title: topic.title,
    stamp,
    audio: a.replace(/\\/g, '/'),
    subtitle: s.replace(/\\/g, '/'),
    rawDuration: Math.round(dur * 1000) / 1000,
    subtitleEnd: cueEnd,
    words: transcript.split(/\s+/).length,
    transcript,
  });
}

if (problems.length) {
  console.error('BATCH PAIRING FAILED:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

// Renumber in the order the topics file declares, so episode numbers are editorial rather
// than an accident of when each file was generated.
const order = Object.values(TOPICS).map((t) => t.slug);
episodes.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
episodes.forEach((e, i) => { e.n = i + 1; });

mkdirSync(`${ROOT}/data`, { recursive: true });
writeFileSync(
  `${ROOT}/data/${BATCH_ID}.json`,
  JSON.stringify({
    note: 'Resolved audio+subtitle pairs. Join key is the ElevenLabs render timestamp in both filenames.',
    batch: BATCH_ID,
    source: resolve(SRC).replace(/\\/g, '/'),
    count: episodes.length,
    episodes,
  }, null, 2),
);

console.log(`${episodes.length} pairs resolved -> data/${BATCH_ID}.json\n`);
for (const e of episodes) {
  console.log(
    `${String(e.n).padStart(2, '0')}  ${e.slug.padEnd(24)} ${e.rawDuration.toFixed(2).padStart(6)}s  ` +
    `${String(e.words).padStart(3)}w  ${e.title}`,
  );
}
