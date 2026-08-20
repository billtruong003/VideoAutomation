#!/usr/bin/env node
/**
 * remap-timing.mjs — project raw word alignment onto the PROCESSED narration.
 *
 *   node tools/remap-timing.mjs [--episode <slug>]     (default: every episode in the batch)
 *
 * Silence removal is non-linear, so raw timestamps can not simply be divided by the tempo
 * factor. This walks the piecewise-linear time map emitted by process-voiceover.mjs and
 * remaps every word, then derives the artifacts the video is built from:
 *
 *   episodes/<slug>/subtitles-processed.json  — word + segment timing on the processed clock
 *   episodes/<slug>/narration-timing.json     — scene phrases, caption chunks, keyword hits
 *
 * It also runs the AUDIO QA GATE: if any cut region overlaps real speech rather than
 * silence, that is a truncated word and the episode fails loudly instead of proceeding.
 *
 * The scene split and the keyword list are per-episode EDITORIAL decisions and live in
 * episodes/<slug>/episode.json. Episode 001 kept them in this file, which is exactly the
 * thing that does not scale past one episode.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { FFMPEG } from './ffbin.mjs';
import { config, entry, paths, readJson, selection } from './episode.mjs';

const r3 = (n) => Math.round(n * 1000) / 1000;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

const { slugs, batchId } = selection();
let failures = 0;

for (const slug of slugs) {
  try {
    processEpisode(slug);
  } catch (e) {
    failures++;
    console.error(`\n[${slug}] FAILED: ${e.message}\n`);
  }
}

if (failures) {
  console.error(`${failures} of ${slugs.length} episodes failed timing.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------

function processEpisode(slug) {
  const P = paths(slug);
  const cfg = config(slug);
  const src = entry(slug, batchId);
  const raw = readJson(P.raw);
  const map = readJson(P.timemap);

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

  // -------------------------------------------------------------------------
  // AUDIO QA GATE — did any cut remove audible signal?
  //
  // Word spans are NOT a reliable oracle for this: a TTS export folds the trailing pause
  // into the last word of a sentence, so a perfectly safe cut inside dead air looks like it
  // "overlaps a word". The audio itself is the only truth, so this measures the raw
  // waveform inside every removed region and fails if anything audible was there.
  // -------------------------------------------------------------------------

  const realWords = [];
  for (const seg of raw.segments) {
    for (const w of seg.words) {
      if (w.text.trim() === '') continue;
      realWords.push(w);
    }
  }

  const SPEECH_FLOOR_DB = -42;
  const PROBE_SR = 16000;
  const WIN = Math.round(PROBE_SR * 0.01);

  const pcm = (() => {
    const res = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', src.audio,
      '-ac', '1', '-ar', String(PROBE_SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
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

  const violations = drops
    .map((d) => ({ cut: [r3(d.start), r3(d.end)], peakDb: r3(peakDb(d.start, d.end)) }))
    .filter((v) => v.peakDb > SPEECH_FLOOR_DB);

  if (violations.length) {
    throw new Error(
      `AUDIO QA GATE: ${violations.length} cut(s) removed audible signal — ` +
      violations.map((v) => `${v.cut[0]}-${v.cut[1]}s @ ${v.peakDb}dB`).join(', ') +
      '. Lower --noiseDb or raise --maxPause and re-run process-voiceover.',
    );
  }

  const loudestCut = drops.length ? Math.max(...drops.map((d) => peakDb(d.start, d.end))) : -Infinity;

  // -------------------------------------------------------------------------
  // remapped words
  // -------------------------------------------------------------------------

  const words = realWords.map((w, i) => ({
    i,
    text: w.text,
    start: r3(remap(w.start_time)),
    end: r3(remap(w.end_time)),
  }));

  for (let i = 0; i < words.length; i++) {
    if (words[i].end <= words[i].start) words[i].end = r3(words[i].start + 0.04);
    if (i > 0 && words[i].start < words[i - 1].end) words[i].start = words[i - 1].end;
  }

  const processedSegments = raw.segments.map((seg) => ({
    text: seg.text,
    start: r3(remap(seg.start_time)),
    end: r3(remap(seg.end_time)),
  }));

  writeFileSync(P.processedSubs, JSON.stringify({
    note: `Timings correspond to public/${P.staticAudio} (NOT the raw file).`,
    source: `${P.raw} remapped through ${P.timemap}`,
    audio: `public/${P.staticAudio}`,
    duration: map.processedDuration,
    tempo: map.tempo,
    segments: processedSegments,
    words: words.map(({ i, text, start, end }) => ({ i, text, start, end })),
  }, null, 2));

  // -------------------------------------------------------------------------
  // scene phrases
  //
  // A scene declares only the first few words it opens on, and runs until the next scene
  // opens. Episode 001 matched a scene's FULL text against the word stream, which is a
  // stronger check but has to be transcribed perfectly by hand — across ten episodes that
  // turns every "1st"/"first" or "10"/"ten" discrepancy into a build failure at the wrong
  // layer. The opening marker is unambiguous and still verified: it must exist, it must be
  // unique enough to land after the previous scene, and the scenes must tile the narration
  // with no gap.
  // -------------------------------------------------------------------------

  const tokens = words.map((w) => norm(w.text));

  function findFrom(markerWords, fromIdx, sceneId) {
    const want = markerWords.map(norm).filter(Boolean);
    for (let i = fromIdx; i + want.length <= tokens.length; i++) {
      let ok = true;
      for (let j = 0; j < want.length; j++) if (tokens[i + j] !== want[j]) { ok = false; break; }
      if (ok) return i;
    }
    throw new Error(`scene "${sceneId}" marker "${markerWords.join(' ')}" not found after word ${fromIdx}`);
  }

  const starts = [];
  let cursor = 0;
  for (const s of cfg.scenes) {
    const idx = s.from ? findFrom(s.from.split(/\s+/), cursor, s.id) : 0;
    starts.push(idx);
    cursor = idx + 1;
  }
  if (starts[0] !== 0) {
    throw new Error(`scene "${cfg.scenes[0].id}" does not start at the first word (starts at ${starts[0]})`);
  }

  const phrases = cfg.scenes.map((s, i) => {
    const a = starts[i];
    const b = (i < starts.length - 1 ? starts[i + 1] : words.length) - 1;
    if (b < a) throw new Error(`scene "${s.id}" is empty — its marker sits at or after the next scene's`);
    return {
      id: s.id,
      text: words.slice(a, b + 1).map((w) => w.text).join(' '),
      start: words[a].start,
      end: words[b].end,
      wordRange: [a, b],
    };
  });

  // -------------------------------------------------------------------------
  // keyword timings — visual actions land on these
  // -------------------------------------------------------------------------

  const keywords = {};
  for (const spec of cfg.keywords) {
    const [id, toks, occurrence = 0] = spec;
    let seen = 0;
    let hit = null;
    for (let i = 0; i + toks.length <= words.length; i++) {
      let ok = true;
      for (let j = 0; j < toks.length; j++) if (tokens[i + j] !== norm(toks[j])) { ok = false; break; }
      if (!ok) continue;
      if (seen === occurrence) { hit = { start: words[i].start, end: words[i + toks.length - 1].end, wordIndex: i }; break; }
      seen++;
    }
    if (!hit) throw new Error(`keyword "${id}" (${toks.join(' ')}#${occurrence}) not found in narration`);
    keywords[id] = hit;
  }

  // -------------------------------------------------------------------------
  // caption chunks — short, readable, gap-aware
  // -------------------------------------------------------------------------

  const MAX_CHARS = 22;
  const MAX_WORDS = 4;
  const GAP_BREAK = 0.26;

  const captions = [];
  let cur = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const gapBefore = i > 0 ? w.start - words[i - 1].end : 0;
    const endsClause = /[,.!?:;]$/.test(w.text);

    if (cur && (cur.words.length >= MAX_WORDS ||
      (cur.text + ' ' + w.text).length > MAX_CHARS ||
      gapBefore > GAP_BREAK || cur.broke)) {
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

  for (let i = 0; i < captions.length; i++) {
    const next = captions[i + 1];
    const limit = next ? next.start : map.processedDuration;
    captions[i].end = r3(Math.min(limit, captions[i].end + 0.22));
    captions[i].start = r3(captions[i].start);
    delete captions[i].broke;
  }

  // -------------------------------------------------------------------------

  writeFileSync(P.timing, JSON.stringify({
    note: `MASTER CLOCK. All timings are seconds against public/${P.staticAudio}.`,
    episode: slug,
    title: cfg.title,
    audio: `public/${P.staticAudio}`,
    staticAudio: P.staticAudio,
    duration: map.processedDuration,
    fps: 30,
    rawDuration: map.rawDuration,
    tempo: map.tempo,
    effectiveTempo: map.effectiveTempo,
    silenceRemoved: map.silenceRemoved,
    wordCount: words.length,
    phrases,
    keywords,
    captions,
    words: words.map(({ text, start, end }) => ({ text, start, end })),
  }, null, 2));

  console.log(
    `[${slug}] ${words.length} words, ${drops.length} cuts in dead air ` +
    `(loudest ${Number.isFinite(loudestCut) ? loudestCut.toFixed(1) : 'n/a'} dB) · ` +
    `${phrases.length} scenes · ${Object.keys(keywords).length} keywords · ` +
    `${captions.length} captions · ${map.processedDuration}s`,
  );
}
