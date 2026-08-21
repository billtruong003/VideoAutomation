#!/usr/bin/env node
/**
 * stt.mjs — transcribe the narration master with ElevenLabs Scribe.
 *
 *   node tools/mryolk/stt.mjs <audio.wav> <out-dir>
 *
 * Uses the repository's existing ElevenLabs adapter rather than a second HTTP client, so the
 * API key keeps being read in exactly one function and never travels through this file.
 *
 * THE INPUT MUST BE THE FINAL MASTER. Transcribing a raw take and then trying to shift its
 * timestamps onto processed audio cannot work: silence removal is non-linear, so there is no
 * single factor to divide by, and every subtitle would drift further out the longer the video
 * ran. The words and their timings have to come from the same file the viewer hears.
 *
 * Diarisation is off. There is one narrator, and asking for speaker separation on a single
 * voice buys nothing while giving the model a way to be wrong.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { speechToText } from '../../src/audio-factory/elevenlabs/client.mjs';
import { DATA_DIR } from './config.mjs';

/**
 * Corrections shared with the burned-in captions.
 *
 * Loaded from `data/mryolk/spelling.json` rather than duplicated here, because the exported
 * .srt and the captions rendered into the video must say the same thing — and the way that
 * guarantee fails is two copies of a list, one of which gets an entry the other does not.
 */
const SPELLING = JSON.parse(readFileSync(join(DATA_DIR, 'spelling.json'), 'utf8')).rules;

export const fixSpelling = (text) => SPELLING.reduce(
  (acc, r) => acc.split(r.find).join(r.replace),
  String(text ?? ''),
);

/** Sentence-final punctuation, used to find phrase boundaries for subtitles. */
const HARD_STOP = /[.!?]"?$/;
const SOFT_STOP = /[,;:—]"?$/;

/**
 * Group words into readable subtitle cues.
 *
 * This is long-form, so the Shorts habit of one enormous word at a time is wrong twice over:
 * it is unreadable for twelve minutes, and it forces the eye to the caption instead of the
 * diagram that is doing the explaining. Cues break on real punctuation first, then on pauses,
 * and only fall back to a length cap when a sentence runs long without either.
 */
export function buildCues(words, {
  maxChars = 84, maxSeconds = 6.0, minSeconds = 0.9, pauseBreak = 0.42,
} = {}) {
  const cues = [];
  let cur = [];

  const flush = () => {
    if (!cur.length) return;
    cues.push({
      start: cur[0].start,
      end: cur[cur.length - 1].end,
      text: cur.map((w) => w.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
      words: cur.length,
    });
    cur = [];
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    const next = words[i + 1];
    const chars = cur.map((x) => x.text).join(' ').length;
    const span = w.end - cur[0].start;
    const gapAfter = next ? next.start - w.end : Infinity;

    const longEnough = span >= minSeconds;
    if (HARD_STOP.test(w.text) && longEnough) { flush(); continue; }
    if (chars >= maxChars || span >= maxSeconds) { flush(); continue; }
    if (longEnough && gapAfter >= pauseBreak) { flush(); continue; }
    if (longEnough && SOFT_STOP.test(w.text) && chars >= maxChars * 0.6) { flush(); continue; }
  }
  flush();

  /*
   * No cue may overlap the next. Word timings occasionally come back with an end past the
   * following word's start; left alone that produces an SRT two players render as flicker.
   */
  for (let i = 0; i + 1 < cues.length; i++) {
    if (cues[i].end > cues[i + 1].start) cues[i].end = cues[i + 1].start - 0.001;
  }
  return cues;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
const srtTime = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

export const toSRT = (cues) => cues
  .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${fixSpelling(c.text)}\n`)
  .join('\n');

/** Sentence-level segments, for the story map to hang beats off. */
export function buildSegments(words) {
  const segs = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (HARD_STOP.test(w.text)) {
      segs.push({
        index: segs.length,
        start: cur[0].start,
        end: cur[cur.length - 1].end,
        text: cur.map((x) => x.text).join(' ').replace(/\s+([,.!?;:])/g, '$1'),
        wordCount: cur.length,
      });
      cur = [];
    }
  }
  if (cur.length) {
    segs.push({
      index: segs.length,
      start: cur[0].start,
      end: cur[cur.length - 1].end,
      text: cur.map((x) => x.text).join(' '),
      wordCount: cur.length,
    });
  }
  return segs;
}

export async function transcribe(audioPath) {
  const audio = readFileSync(audioPath);
  const res = await speechToText({
    audio,
    filename: basename(audioPath),
    modelId: 'scribe_v2',
    languageCode: 'eng',
    diarize: false,
  });
  const words = res.words
    .filter((w) => w.start != null && w.end != null && w.text?.trim())
    .map((w) => ({
      text: w.text.trim(),
      start: Number(w.start.toFixed(3)),
      end: Number(w.end.toFixed(3)),
      logprob: w.logprob ?? null,
    }));
  return { ...res, words };
}

async function main() {
  const [audioPath, outDir] = process.argv.slice(2);
  if (!audioPath || !outDir) {
    console.error('usage: node tools/mryolk/stt.mjs <audio.wav> <out-dir>');
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  const res = await transcribe(audioPath);
  const { words } = res;
  const cues = buildCues(words);
  const segments = buildSegments(words);

  writeFileSync(join(outDir, 'transcript.txt'), `${res.text.trim()}\n`, 'utf8');
  writeFileSync(join(outDir, 'words.json'), `${JSON.stringify(words, null, 2)}\n`);
  writeFileSync(join(outDir, 'segments.json'), `${JSON.stringify(segments, null, 2)}\n`);
  writeFileSync(join(outDir, 'subtitles.srt'), toSRT(cues), 'utf8');
  writeFileSync(join(outDir, 'transcript.json'), `${JSON.stringify({
    source: audioPath,
    model: 'scribe_v2',
    languageCode: res.languageCode,
    languageProbability: res.languageProbability,
    requestId: res.requestId,
    wordCount: words.length,
    cueCount: cues.length,
    segmentCount: segments.length,
    firstWordAt: words[0]?.start ?? null,
    lastWordAt: words[words.length - 1]?.end ?? null,
    text: res.text,
    cues,
  }, null, 2)}\n`);

  const speech = words.length
    ? words[words.length - 1].end - words[0].start
    : 0;
  console.log(`words   ${words.length}`);
  console.log(`cues    ${cues.length}`);
  console.log(`segs    ${segments.length}`);
  console.log(`span    ${speech.toFixed(2)}s`);
  console.log(`rate    ${(words.length / (speech / 60)).toFixed(1)} wpm (over span)`);
}

if (process.argv[1]?.endsWith('stt.mjs')) await main();
