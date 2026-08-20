#!/usr/bin/env node
/**
 * srt-to-alignment.mjs — turn an SRT + its audio into word-level alignment.
 *
 *   node tools/srt-to-alignment.mjs <audio> <subtitle.srt> <out.json>
 *
 * Episode 001 was built from an ElevenLabs alignment JSON, which carries a start and end
 * time for every word. This batch shipped .srt instead, which carries them only per CUE —
 * a 2–5 second block of 8–12 words. Everything downstream (caption chunks, keyword anchors,
 * the QA gate that checks cuts against word spans) needs words, so the missing resolution
 * has to be recovered rather than faked.
 *
 * Dividing a cue evenly by word count would be faking it: it puts word boundaries inside
 * pauses, and a keyword anchored to one of those lands on silence. Instead the AUDIO is
 * consulted. Within each cue the waveform is split into voiced runs and gaps, and words are
 * laid out along the VOICED time only, weighted by how long each is likely to take to say.
 * Pauses therefore push words apart exactly as far as the speaker actually paused, and no
 * word boundary is ever placed inside one.
 *
 * The result is written in the same shape as ElevenLabs' export (`segments[].words[]` with
 * `start_time`/`end_time`), so remap-timing.mjs cannot tell the two sources apart.
 *
 * ACCURACY: cue bounds are ground truth and are never moved; error is confined inside a
 * single cue and is bounded by that cue's length. tools/verify-sync.mjs re-checks the
 * result against the delivered waveform, so a bad estimate fails a gate rather than
 * silently desyncing an episode.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { FFMPEG } from './ffbin.mjs';

const [AUDIO, SRT, OUT] = process.argv.slice(2);
if (!AUDIO || !SRT || !OUT) {
  console.error('usage: node tools/srt-to-alignment.mjs <audio> <subtitle.srt> <out.json>');
  process.exit(1);
}

const r3 = (n) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// 1. parse the SRT
// ---------------------------------------------------------------------------

const TIME = /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/;
const secs = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000;

const cues = [];
for (const block of readFileSync(SRT, 'utf8').replace(/^﻿/, '').split(/\r?\n\r?\n/)) {
  const lines = block.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) continue;
  const ti = lines.findIndex((l) => TIME.test(l));
  if (ti === -1) continue;
  const m = TIME.exec(lines[ti]);
  // SRT wraps a cue across two display lines; join them back into one spoken run.
  // Bracketed performance tags ([chuckles], [sighs]) are audible but are not words: left in
  // they would be spoken by the caption track and counted as narration. Dropping them here
  // keeps the time they occupy — the surrounding words simply spread across it.
  const text = lines
    .slice(ti + 1)
    .join(' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) continue;
  cues.push({ start: secs(m[1], m[2], m[3], m[4]), end: secs(m[5], m[6], m[7], m[8]), text });
}
if (!cues.length) throw new Error(`no cues parsed from ${SRT}`);

// ---------------------------------------------------------------------------
// 2. voiced/unvoiced envelope of the raw audio
// ---------------------------------------------------------------------------

const SR = 16000;
const HOP = Math.round(SR * 0.01); // 10 ms

const pcm = (() => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', resolve(AUDIO),
    '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
  if (r.error) throw r.error;
  return r.stdout;
})();

const nFrames = Math.floor(pcm.length / 2 / HOP);
const voiced = new Uint8Array(nFrames);
for (let f = 0; f < nFrames; f++) {
  let s = 0;
  for (let j = 0; j < HOP; j++) { const v = pcm.readInt16LE((f * HOP + j) * 2); s += v * v; }
  const db = 20 * Math.log10(Math.sqrt(s / HOP) / 32768 + 1e-12);
  voiced[f] = db > -38 ? 1 : 0;
}
const audioDuration = pcm.length / 2 / SR;

/**
 * Voiced runs inside [a,b].
 *
 * Gaps shorter than 90 ms are absorbed rather than treated as pauses: a stop consonant
 * ("that tiny") goes quiet for ~40 ms mid-word, and honouring those would shred a word into
 * pieces and spread the cue's words across imaginary pauses.
 */
function voicedRuns(a, b) {
  const f0 = Math.max(0, Math.floor(a / 0.01));
  const f1 = Math.min(nFrames, Math.ceil(b / 0.01));
  const runs = [];
  let start = null;
  for (let f = f0; f < f1; f++) {
    if (voiced[f] && start === null) start = f;
    else if (!voiced[f] && start !== null) { runs.push([start, f]); start = null; }
  }
  if (start !== null) runs.push([start, f1]);

  const merged = [];
  for (const r of runs) {
    const prev = merged[merged.length - 1];
    if (prev && (r[0] - prev[1]) * 0.01 < 0.09) prev[1] = r[1];
    else merged.push([...r]);
  }
  const out = merged
    .map(([s, e]) => ({ start: Math.max(a, s * 0.01), end: Math.min(b, e * 0.01) }))
    .filter((r) => r.end - r.start > 0.02);

  // A cue with no detectable voicing (very quiet delivery) still has to produce words.
  return out.length ? out : [{ start: a, end: b }];
}

// ---------------------------------------------------------------------------
// 3. lay words out along the voiced time of their cue
// ---------------------------------------------------------------------------

/**
 * Relative time a token takes to say.
 *
 * Letters dominate; a trailing comma or full stop buys extra length because the speaker
 * slows into it. Digits are spelled out ("10" is "ten", "1800s" is "eighteen hundreds"), so
 * they are weighted well above their character count.
 */
function weight(token) {
  const bare = token.replace(/[^A-Za-z0-9']/g, '');
  const digits = (bare.match(/\d/g) || []).length;
  const letters = bare.length - digits;
  let w = 1.1 + letters * 0.75 + digits * 2.2;
  if (/[,;:]$/.test(token)) w += 1.2;
  if (/[.!?]$/.test(token)) w += 1.8;
  return w;
}

const segments = [];
let wordTotal = 0;

for (const cue of cues) {
  const tokens = cue.text.split(/\s+/).filter(Boolean);
  const runs = voicedRuns(cue.start, cue.end);
  const voicedTotal = runs.reduce((a, r) => a + (r.end - r.start), 0);

  const weights = tokens.map(weight);
  const wTotal = weights.reduce((a, b) => a + b, 0);

  /** Voiced-seconds offset -> wall-clock time, stepping over the pauses. */
  const toWall = (v) => {
    let acc = 0;
    for (const r of runs) {
      const len = r.end - r.start;
      if (v <= acc + len + 1e-9) return r.start + (v - acc);
      acc += len;
    }
    return runs[runs.length - 1].end;
  };

  const words = [];
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const span = (weights[i] / wTotal) * voicedTotal;
    const start = toWall(cursor);
    cursor += span;
    const end = toWall(cursor);
    words.push({
      text: tokens[i],
      start_time: r3(start),
      end_time: r3(Math.max(end, start + 0.04)),
    });
  }

  // The cue's own bounds are ground truth; the estimate must not drift outside them.
  words[0].start_time = r3(cue.start);
  words[words.length - 1].end_time = r3(cue.end);

  wordTotal += words.length;
  segments.push({
    text: cue.text,
    start_time: r3(cue.start),
    end_time: r3(cue.end),
    speaker: { id: 'speaker_0', name: 'Speaker 0' },
    words,
  });
}

// ---------------------------------------------------------------------------
// 4. sanity checks — a silently wrong alignment is the expensive failure here
// ---------------------------------------------------------------------------

const flat = segments.flatMap((s) => s.words);
for (let i = 1; i < flat.length; i++) {
  if (flat[i].start_time < flat[i - 1].end_time - 1e-6) {
    throw new Error(`word ${i} ("${flat[i].text}") starts before the previous one ends`);
  }
}
const lastEnd = flat[flat.length - 1].end_time;
if (lastEnd > audioDuration + 0.5) {
  throw new Error(`alignment ends at ${lastEnd}s but the audio is ${audioDuration.toFixed(2)}s — wrong pair`);
}

mkdirSync(dirname(resolve(OUT)), { recursive: true });
writeFileSync(resolve(OUT), JSON.stringify({
  language_code: 'eng',
  note: 'Word timings estimated from SRT cue bounds + the audio\'s voiced/unvoiced envelope. Cue bounds are exact; within-cue positions are weighted estimates laid out over voiced time only.',
  source: { audio: resolve(AUDIO).replace(/\\/g, '/'), subtitle: resolve(SRT).replace(/\\/g, '/') },
  segments,
}, null, 2));

console.log(
  `${cues.length} cues -> ${wordTotal} words  (${lastEnd.toFixed(2)}s of ${audioDuration.toFixed(2)}s audio)  ${OUT}`,
);
