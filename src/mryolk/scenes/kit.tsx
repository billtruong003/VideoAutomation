/**
 * kit.tsx — what every scene needs, so no scene reinvents it.
 *
 * The central helper is `at()`. A scene is mounted inside a `Sequence`, so its own
 * `useCurrentFrame()` starts at zero — but every timing decision in this production is
 * expressed in ABSOLUTE seconds taken from the transcript. `at(absoluteSeconds)` converts
 * between the two, and it is the only place that conversion happens.
 *
 * That matters more than it looks. Without it, each scene would carry its own start offset in
 * arithmetic scattered through its body, and moving a scene by one segment would mean finding
 * and fixing every one of those. With it, a scene says `delay={at(w('borrow'))}` and means
 * exactly "when the narrator says the word borrow" — which survives any re-cut.
 */

import { FPS, WORDS, spanOf, wordMatches } from '../clock';

export type SceneCtx = {
  /** Local frame for an absolute time in seconds. */
  at: (seconds: number) => number;
  /** Local frame at which a word inside this scene is spoken. */
  w: (needle: string, nth?: number) => number;
  /** Local frame of the first occurrence of a word after a given local frame. */
  wAfter: (needle: string, afterFrame: number) => number;
  /** Absolute start/end of this scene, in seconds. */
  start: number;
  end: number;
  /** Length of this scene in frames. */
  frames: number;
};

/**
 * Build the context for a scene covering a segment range.
 *
 * `w()` throws on a word that is not spoken in the range. That is deliberate: a silent
 * fallback would let a visual quietly detach from the sentence it illustrates and drift to
 * frame zero, where it would look like an animation timing bug rather than a missing word.
 */
export function ctxFor(fromIndex: number, toIndex: number, visualEndSeconds?: number): SceneCtx {
  const { start, end: spokenEnd } = spanOf(fromIndex, toIndex);
  /*
   * The word-search window is the SPOKEN span, taken from the transcript. It was briefly a
   * hand-written number per scene, which is exactly the kind of duplicated fact that goes
   * stale: a scene whose last word ended forty milliseconds after the figure someone typed
   * threw "not spoken between..." at render time, for a word that plainly was.
   *
   * The VISUAL end can legitimately run past the last word — the final scene holds through
   * the tail — so it stays a separate, optional number.
   */
  const endSeconds = spokenEnd;
  const at = (seconds: number) => Math.round((seconds - start) * FPS);

  const w = (needle: string, nth = 1) => {
    let seen = 0;
    for (const word of WORDS) {
      if (word.start < start - 0.001 || word.end > endSeconds + 0.001) continue;
      if (!wordMatches(word.text, needle)) continue;
      seen += 1;
      if (seen === nth) return at(word.start);
    }
    throw new Error(
      `"${needle}" #${nth} is not spoken between ${start.toFixed(2)}s and ${endSeconds.toFixed(2)}s`,
    );
  };

  /**
   * First occurrence of a word AFTER a given local frame.
   *
   * Safer than an ordinal whenever a word recurs. The opening says "gone" six times — once in
   * "every debt on Earth is gone", then once per document — so `w('gone', 1)` is the sentence
   * before the sequence even starts, and every card built on ordinals was silently one beat
   * early. Anchoring relative to the card's own noun cannot drift that way: it asks for "the
   * next 'gone' after 'mortgage'", which stays correct however many times the word is used
   * elsewhere.
   */
  const wAfter = (needle: string, afterFrame: number) => {
    for (const word of WORDS) {
      if (word.start < start - 0.001 || word.end > endSeconds + 0.001) continue;
      if (!wordMatches(word.text, needle)) continue;
      if (at(word.start) <= afterFrame) continue;
      return at(word.start);
    }
    throw new Error(`no "${needle}" spoken after local frame ${afterFrame} in this scene`);
  };

  const end = visualEndSeconds ?? spokenEnd;
  return { at, w, wAfter, start, end, frames: Math.round((end - start) * FPS) };
}

/** Frame geometry, so scenes agree on where the middle is. */
export const STAGE = {
  cx: 960,
  cy: 540,
  /** Where a character's feet sit when he is standing on the page. */
  ground: 760,
  /** Vertical centre of the usable action band, clear of the caption. */
  actionY: 470,
} as const;
