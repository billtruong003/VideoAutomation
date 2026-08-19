#!/usr/bin/env node
/**
 * remap-timing.mjs — project raw ElevenLabs alignment onto the PROCESSED narration.
 *
 *   node tools/remap-timing.mjs
 *
 * Silence removal is non-linear, so raw timestamps can not simply be divided by the
 * tempo factor. This walks the piecewise-linear time map emitted by process-voiceover.mjs
 * and remaps every word, then derives the artifacts the video is built from:
 *
 *   data/subtitles-processed.json  — word + segment timing on the processed timeline
 *   data/narration-timing.json     — scene phrases, sentences, caption chunks, keyword hits
 *
 * It also runs the AUDIO QA GATE: if any cut region overlaps real speech (rather than
 * silence), that is a truncated word and the run fails loudly instead of proceeding.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const raw = JSON.parse(readFileSync(`${ROOT}/data/subtitles-raw.json`, 'utf8'));
const map = JSON.parse(readFileSync(`${ROOT}/public/audio/voiceover-processed.timemap.json`, 'utf8'));

const r3 = (n) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// piecewise-linear remap
// ---------------------------------------------------------------------------

const SEGS = map.segments;

/** Raw-timeline seconds -> processed-timeline seconds. */
function remap(t) {
  if (t <= SEGS[0].rawStart) return SEGS[0].outStart;
  for (const s of SEGS) {
    if (t >= s.rawStart && t <= s.rawEnd) {
      const f = (t - s.rawStart) / Math.max(1e-9, s.rawEnd - s.rawStart);
      return s.outStart + f * (s.outEnd - s.outStart);
    }
  }
  // t fell inside a dropped region: clamp to the nearest surviving boundary
  let best = SEGS[0];
  for (const s of SEGS) if (s.rawEnd <= t) best = s;
  return best.outEnd;
}

/** Regions of the raw timeline that were removed (inverse of the keep segments). */
const drops = [];
for (let i = 0; i < SEGS.length - 1; i++) {
  drops.push({ start: SEGS[i].rawEnd, end: SEGS[i + 1].rawStart });
}

// ---------------------------------------------------------------------------
// AUDIO QA GATE — did any cut remove audible signal?
//
// The JSON's word spans are NOT a reliable oracle: ElevenLabs folds the trailing
// pause into the last word of a sentence, so a perfectly safe cut inside dead air
// looks like it "overlaps a word". The audio itself is the only truth, so this
// measures the raw waveform inside every removed region and fails if anything
// audible was there.
// ---------------------------------------------------------------------------

const realWords = [];
for (const seg of raw.segments) {
  for (const w of seg.words) {
    if (w.text.trim() === '') continue;
    realWords.push(w);
  }
}

const SPEECH_FLOOR_DB = -42; // anything louder than this inside a cut is real signal
const PROBE_SR = 16000;
const WIN = Math.round(PROBE_SR * 0.01); // 10 ms

const pcm = (() => {
  const res = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostdin', '-i', `${ROOT}/public/audio/voiceover-raw.mp3`,
      '-ac', '1', '-ar', String(PROBE_SR), '-f', 's16le', '-'],
    { maxBuffer: 1 << 28 },
  );
  if (res.error) throw res.error;
  return res.stdout;
})();

function peakDb(from, to) {
  const i0 = Math.max(0, Math.floor(from * PROBE_SR));
  const i1 = Math.min(pcm.length / 2, Math.ceil(to * PROBE_SR));
  let peak = -Infinity;
  for (let i = i0; i + WIN <= i1; i += WIN) {
    let s = 0;
    for (let j = 0; j < WIN; j++) { const v = pcm.readInt16LE((i + j) * 2); s += v * v; }
    const db = 20 * Math.log10(Math.sqrt(s / WIN) / 32768 + 1e-12);
    if (db > peak) peak = db;
  }
  return peak;
}

const violations = [];
for (const d of drops) {
  const p = peakDb(d.start, d.end);
  if (p > SPEECH_FLOOR_DB) {
    violations.push({ cut: [r3(d.start), r3(d.end)], peakDb: r3(p) });
  }
}

if (violations.length) {
  console.error('AUDIO QA GATE FAILED — cuts removed audible signal:');
  for (const v of violations) console.error('  ', JSON.stringify(v));
  console.error('\nFix the audio (lower --noiseDb / raise --maxPause) and re-run process-voiceover.mjs.');
  process.exit(1);
}

const loudestCut = Math.max(...drops.map((d) => peakDb(d.start, d.end)));
console.log(
  `QA GATE PASSED: ${realWords.length} words intact, ${drops.length} cuts all in dead air ` +
  `(loudest removed content ${loudestCut.toFixed(1)} dB, floor ${SPEECH_FLOOR_DB} dB).`,
);

// ---------------------------------------------------------------------------
// remapped words
// ---------------------------------------------------------------------------

const words = realWords.map((w, i) => ({
  i,
  text: w.text,
  start: r3(remap(w.start_time)),
  end: r3(remap(w.end_time)),
  rawStart: w.start_time,
  rawEnd: w.end_time,
}));

// guard against zero/negative-length words after remapping
for (let i = 0; i < words.length; i++) {
  if (words[i].end <= words[i].start) words[i].end = r3(words[i].start + 0.04);
  if (i > 0 && words[i].start < words[i - 1].end) words[i].start = words[i - 1].end;
}

const processedSegments = raw.segments.map((seg) => ({
  text: seg.text,
  start: r3(remap(seg.start_time)),
  end: r3(remap(seg.end_time)),
}));

writeFileSync(
  `${ROOT}/data/subtitles-processed.json`,
  JSON.stringify(
    {
      note: 'Timings correspond to public/audio/voiceover-processed.wav (NOT the raw file).',
      source: 'data/subtitles-raw.json remapped through public/audio/voiceover-processed.timemap.json',
      audio: 'public/audio/voiceover-processed.wav',
      duration: map.processedDuration,
      tempo: map.tempo,
      segments: processedSegments,
      words: words.map(({ i, text, start, end }) => ({ i, text, start, end })),
    },
    null,
    2,
  ),
);

// ---------------------------------------------------------------------------
// scene phrases — canonical script split, matched onto the word stream
// ---------------------------------------------------------------------------

const SCENES = [
  { id: 'hook', text: 'Ever notice how many casinos seem to forget one tiny invention, the clock?' },
  { id: 'no-accident', text: "That's not exactly an accident." },
  { id: 'time-cues', text: "Traditional casino design often kept clocks and windows scarce, removing obvious clues for how long you've been inside." },
  { id: 'constant-environment', text: 'The lights stay the same, the machines keep flashing, and the outside world basically disappears.' },
  { id: 'time-distortion', text: 'So 20 minutes can start feeling a lot like 2 hours.' },
  { id: 'twist', text: "But here's the twist. Not every modern casino follows this rule." },
  { id: 'modern-casino', text: 'Some newer casinos deliberately use daylight, open spaces, and even clocks because making you comfortable can work too.' },
  { id: 'myth-correction', text: "So casinos don't literally ban clocks." },
  { id: 'final-idea', text: 'The real trick is simpler. Control what you notice, keep you immersed, and make the outside world feel very, very far away.' },
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

let cursor = 0;
const phrases = SCENES.map((scene) => {
  const tokens = scene.text.split(/\s+/).map(norm).filter(Boolean);
  const startIdx = cursor;
  let k = 0;
  while (cursor < words.length && k < tokens.length) {
    if (norm(words[cursor].text) === tokens[k]) k++;
    cursor++;
  }
  if (k !== tokens.length) {
    throw new Error(`Scene "${scene.id}" did not align: matched ${k}/${tokens.length} tokens`);
  }
  return {
    id: scene.id,
    text: scene.text,
    start: words[startIdx].start,
    end: words[cursor - 1].end,
    wordRange: [startIdx, cursor - 1],
  };
});

if (cursor !== words.length) {
  throw new Error(`Alignment leftover: consumed ${cursor} of ${words.length} words`);
}

// ---------------------------------------------------------------------------
// keyword timings — visual actions land on these
// ---------------------------------------------------------------------------

/** [keyword id, matcher tokens, which occurrence (0-based)] */
const KEYWORD_SPECS = [
  ['casinos', ['casinos'], 0],
  ['clock', ['clock'], 0],
  ['accident', ['accident'], 0],
  ['clocks-vanish', ['clocks'], 0],
  ['windows', ['windows'], 0],
  ['inside', ['inside'], 0],
  ['lights', ['lights'], 0],
  ['flashing', ['flashing'], 0],
  ['outside-world-1', ['outside', 'world'], 0],
  ['disappears', ['disappears'], 0],
  ['twenty-minutes', ['20', 'minutes'], 0],
  ['two-hours', ['2', 'hours'], 0],
  ['twist', ['twist'], 0],
  ['daylight', ['daylight'], 0],
  ['open-spaces', ['open', 'spaces'], 0],
  ['clocks-modern', ['clocks'], 1],
  ['comfortable', ['comfortable'], 0],
  ['ban', ['ban'], 0],
  ['trick', ['trick'], 0],
  ['notice', ['notice'], 1],
  ['immersed', ['immersed'], 0],
  ['outside-world-2', ['outside', 'world'], 1],
  ['far-away', ['away'], 0],
];

const keywords = {};
for (const [id, toks, occurrence] of KEYWORD_SPECS) {
  let seen = 0;
  let hit = null;
  for (let i = 0; i + toks.length <= words.length; i++) {
    let ok = true;
    for (let j = 0; j < toks.length; j++) {
      if (norm(words[i + j].text) !== norm(toks[j])) { ok = false; break; }
    }
    if (!ok) continue;
    if (seen === occurrence) { hit = { start: words[i].start, end: words[i + toks.length - 1].end, wordIndex: i }; break; }
    seen++;
  }
  if (!hit) throw new Error(`Keyword "${id}" (${toks.join(' ')}#${occurrence}) not found in narration`);
  keywords[id] = hit;
}

// ---------------------------------------------------------------------------
// caption chunks — short, readable, gap-aware
// ---------------------------------------------------------------------------

const MAX_CHARS = 22;
const MAX_WORDS = 4;
const GAP_BREAK = 0.26;

const captions = [];
let cur = null;
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const gapBefore = i > 0 ? w.start - words[i - 1].end : 0;
  const endsClause = /[,.!?:;]$/.test(w.text);

  if (
    cur &&
    (cur.words.length >= MAX_WORDS ||
      (cur.text + ' ' + w.text).length > MAX_CHARS ||
      gapBefore > GAP_BREAK ||
      cur.broke)
  ) {
    captions.push(cur);
    cur = null;
  }
  if (!cur) cur = { text: w.text, words: [w.text], start: w.start, end: w.end, broke: false };
  else {
    cur.text += ' ' + w.text;
    cur.words.push(w.text);
    cur.end = w.end;
  }
  if (endsClause) cur.broke = true;
}
if (cur) captions.push(cur);

// hold each caption until the next one starts (no flicker gaps inside a phrase)
for (let i = 0; i < captions.length; i++) {
  const next = captions[i + 1];
  const naturalEnd = captions[i].end;
  const limit = next ? next.start : map.processedDuration;
  captions[i].end = r3(Math.min(limit, naturalEnd + 0.22));
  captions[i].start = r3(captions[i].start);
  delete captions[i].broke;
}

// ---------------------------------------------------------------------------

const timing = {
  note: 'MASTER CLOCK. All timings are seconds against public/audio/voiceover-processed.wav.',
  audio: 'public/audio/voiceover-processed.wav',
  duration: map.processedDuration,
  fps: 30,
  rawDuration: map.rawDuration,
  tempo: map.tempo,
  silenceRemoved: map.silenceRemoved,
  wordCount: words.length,
  phrases,
  keywords,
  captions,
  words: words.map(({ text, start, end }) => ({ text, start, end })),
};

writeFileSync(`${ROOT}/data/narration-timing.json`, JSON.stringify(timing, null, 2));

console.log('');
console.log('phrases:');
for (const p of phrases) {
  console.log(`  ${p.id.padEnd(22)} ${p.start.toFixed(2).padStart(6)} -> ${p.end.toFixed(2).padStart(6)}  (${(p.end - p.start).toFixed(2)}s)`);
}
console.log('');
console.log(`keywords: ${Object.keys(keywords).length}`);
for (const [k, v] of Object.entries(keywords)) console.log(`  ${k.padEnd(18)} ${v.start.toFixed(2)}`);
console.log('');
console.log(`captions: ${captions.length} chunks`);
console.log(`duration: ${map.processedDuration}s`);
console.log('wrote data/subtitles-processed.json, data/narration-timing.json');
