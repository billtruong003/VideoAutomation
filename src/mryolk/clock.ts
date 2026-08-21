/**
 * clock.ts — the master clock.
 *
 * ONE rule, and everything downstream depends on it holding: **no scene may invent a frame
 * number.** Every time in this production is derived from a word in the locked narration
 * master. That is what keeps a re-processed audio file from silently desynchronising the
 * entire edit — re-run the audio stage and every beat moves with it, because no beat ever
 * knew its own frame in the first place.
 *
 * The composition length comes from the measured duration of the WAV, not from a number
 * anyone typed. `TAIL_HOLD` is the only additive constant, and it exists so the closing gag
 * has somewhere to land before the hard cut.
 */

import audioReport from '../../data/mryolk/audio-report.json';
import segmentsJson from '../../data/mryolk/stt/segments.json';
import wordsJson from '../../data/mryolk/stt/words.json';
import { VIDEO } from './theme';

export type Word = { text: string; start: number; end: number; logprob: number | null };
export type Segment = { index: number; start: number; end: number; text: string; wordCount: number };

export const WORDS = wordsJson as Word[];
export const SEGMENTS = segmentsJson as Segment[];

export const AUDIO_DURATION = audioReport.master.processedSeconds;

/** Hold after the last spoken word. Long-form can afford a real beat; a Short cannot. */
export const TAIL_HOLD = 2.2;

export const FPS = VIDEO.fps;
export const TOTAL_FRAMES = Math.ceil((AUDIO_DURATION + TAIL_HOLD) * FPS);

export const sec = (s: number): number => Math.round(s * FPS);

/**
 * The span of a run of sentences, as absolute seconds.
 *
 * Scenes are addressed by SEGMENT INDEX rather than by timestamp, because a segment index is
 * stable against a re-render of the audio and a timestamp is not. `spanOf(23, 39)` keeps
 * meaning "from 'let's begin with something painfully normal' to 'we began using it for
 * almost everything'" no matter how the audio is later conditioned.
 */
export function spanOf(fromIndex: number, toIndex: number): { start: number; end: number } {
  const from = SEGMENTS[fromIndex];
  const to = SEGMENTS[toIndex];
  if (!from || !to) throw new Error(`segment range ${fromIndex}..${toIndex} is out of bounds`);
  return { start: from.start, end: to.end };
}

/** Frames, for a segment range. `end` extends to the next segment's start when one follows. */
export function framesOf(fromIndex: number, toIndex: number): { from: number; durationInFrames: number } {
  const { start } = spanOf(fromIndex, toIndex);
  const next = SEGMENTS[toIndex + 1];
  const end = next ? next.start : AUDIO_DURATION + TAIL_HOLD;
  const from = sec(start);
  return { from, durationInFrames: Math.max(1, sec(end) - from) };
}

/**
 * Start of the first word matching `needle` inside a segment range.
 *
 * This is how a visual lands ON a word rather than near it — the money bag appears when the
 * narrator says "borrow", not 400ms after the sentence began.
 */
export function wordAt(fromIndex: number, toIndex: number, needle: string): number {
  const { start, end } = spanOf(fromIndex, toIndex);
  const want = needle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hit = WORDS.find(
    (w) => w.start >= start - 0.001 && w.end <= end + 0.001
      && w.text.toLowerCase().replace(/[^a-z0-9]/g, '') === want,
  );
  if (!hit) throw new Error(`word "${needle}" not spoken between segments ${fromIndex} and ${toIndex}`);
  return hit.start;
}

/**
 * Does a transcript token answer to `needle`?
 *
 * Two things the raw text does that a scene author should not have to think about:
 *
 *   POSSESSIVES. "uncle's" is one token, and a scene that wants to land a visual on the word
 *   "uncle" is not wrong. The possessive is stripped before comparison.
 *
 *   HYPHENATED COMPOUNDS. Scribe emits "twenty-five-year-old" as a SINGLE token, but it is
 *   four spoken words and the natural anchor is the first of them. So a compound matches on
 *   any of its parts as well as on the whole.
 *
 * Both were found the same way — by a scene throwing at render time for a word that is
 * plainly spoken — and fixing them here rather than at the call sites means the next scene
 * that hits one never sees it.
 */
export function wordMatches(token: string, needle: string): boolean {
  const clean = (s: string) => s.toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z0-9-]/g, '');
  const t = clean(token);
  const n = clean(needle);
  if (!n) return false;
  if (t.replace(/-/g, '') === n.replace(/-/g, '')) return true;
  return t.split('-').filter(Boolean).includes(n);
}

/** Words spoken inside a segment range. */
export const wordsIn = (fromIndex: number, toIndex: number): Word[] => {
  const { start, end } = spanOf(fromIndex, toIndex);
  return WORDS.filter((w) => w.start >= start - 0.001 && w.end <= end + 0.001);
};
