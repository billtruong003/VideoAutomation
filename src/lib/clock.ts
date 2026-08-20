/**
 * clock.ts — the MASTER CLOCK, once per episode.
 *
 * Episode 001 had one narration, so `lib/timing.ts` could import it at module scope and
 * export `kw()` as a free function. A batch cannot: ten episodes are compiled into one
 * Remotion bundle, and a free `kw('hole')` has no way to say WHICH episode's word it means.
 *
 * So the same helpers are produced by a factory instead. An episode's scene file opens with
 *
 *     const C = clockFor('airplane-window-hole');
 *
 * and then uses `C.kwIn(S, 'hole')` exactly the way Episode 001 used `kwIn`. The contract is
 * unchanged and still absolute: **no scene may invent a frame number.** Every time in this
 * project traces back to a word in a locked WAV.
 */

import { VIDEO } from '../style/tokens';

export type Phrase = {
  id: string;
  text: string;
  start: number;
  end: number;
  /**
   * `[firstWord, lastWord]`. Typed as a plain array rather than a tuple because these
   * objects arrive from an imported JSON file, and TypeScript widens JSON array literals to
   * `number[]` — asserting a tuple there would mean an `as unknown as` cast at every one of
   * the ten import sites, which buys nothing: nothing in `src/` indexes this.
   */
  wordRange: number[];
};

export type Keyword = { start: number; end: number; wordIndex: number };
export type CaptionChunk = { text: string; words?: string[]; start: number; end: number };
export type Word = { text: string; start: number; end: number };

export type NarrationTiming = {
  episode: string;
  title: string;
  staticAudio: string;
  duration: number;
  fps: number;
  tempo: number;
  rawDuration: number;
  silenceRemoved: number;
  wordCount: number;
  phrases: Phrase[];
  keywords: Record<string, Keyword>;
  captions: CaptionChunk[];
  words: Word[];
};

export type SceneSpan = {
  id: string;
  /** Absolute composition frame the scene takes over. */
  from: number;
  durationInFrames: number;
  narration: string;
};

/**
 * The video runs slightly past the last word so the final gag can land before the hard cut.
 * This is the ONLY place a video's length differs from its audio's, and it is additive — it
 * never rescales narration timing.
 */
export const TAIL_HOLD_SECONDS = 1.15;

export type Clock = ReturnType<typeof makeClock>;

export function makeClock(TIMING: NarrationTiming) {
  const fps = TIMING.fps ?? VIDEO.fps;

  /** Seconds -> frames. */
  const sec = (s: number): number => Math.round(s * fps);

  const NARRATION_FRAMES = sec(TIMING.duration);
  const TOTAL_FRAMES = sec(TIMING.duration + TAIL_HOLD_SECONDS);

  /** Look up a scene phrase. Throws loudly rather than silently returning 0. */
  function phrase(id: string): Phrase {
    const p = TIMING.phrases.find((x) => x.id === id);
    if (!p) throw new Error(`[${TIMING.episode}] unknown narration phrase "${id}"`);
    return p;
  }

  /** Keyword start in SECONDS on the processed-audio timeline. */
  function kwSec(id: string): number {
    const k = TIMING.keywords[id];
    if (!k) throw new Error(`[${TIMING.episode}] unknown narration keyword "${id}"`);
    return k.start;
  }

  /** Keyword start in FRAMES, absolute on the composition timeline. */
  const kw = (id: string): number => sec(kwSec(id));

  const kwEnd = (id: string): number => {
    const k = TIMING.keywords[id];
    if (!k) throw new Error(`[${TIMING.episode}] unknown narration keyword "${id}"`);
    return sec(k.end);
  };

  /** Does this episode have that keyword? For beats that are only in some episodes. */
  const hasKw = (id: string): boolean => Boolean(TIMING.keywords[id]);

  /**
   * Contiguous scene spans covering the whole composition.
   *
   * Each scene runs from its own first spoken word until the NEXT scene's first word, so
   * there is never a gap with no scene mounted. Scene 1 is pulled back to frame 0 — the
   * hook has to be on screen before the first syllable, not after it.
   */
  const SCENE_SPANS: SceneSpan[] = TIMING.phrases.map((p, i, all) => {
    const from = i === 0 ? 0 : sec(p.start);
    const to = i < all.length - 1 ? sec(all[i + 1].start) : TOTAL_FRAMES;
    return { id: p.id, from, durationInFrames: to - from, narration: p.text };
  });

  const SCENE_START: Record<string, number> = Object.fromEntries(
    SCENE_SPANS.map((s) => [s.id, s.from]),
  );

  /**
   * Keyword position relative to a scene's own start — what scene components want, because
   * they render inside a <Sequence> whose frame 0 is the scene start.
   */
  const kwIn = (sceneId: string, keyword: string): number => kw(keyword) - SCENE_START[sceneId];

  /** Scene-relative frame for an absolute number of seconds. */
  const atIn = (sceneId: string, seconds: number): number => sec(seconds) - SCENE_START[sceneId];

  /** Scene-relative frame, given an offset from the scene's first spoken word. */
  const afterSpeech = (sceneId: string, seconds: number): number =>
    sec(phrase(sceneId).start + seconds) - SCENE_START[sceneId];

  /** Scene-relative frame, counted back from the scene's last spoken word. */
  const beforeEnd = (sceneId: string, seconds: number): number =>
    sec(phrase(sceneId).end - seconds) - SCENE_START[sceneId];

  /** How long a scene is mounted, in frames. */
  const sceneFrames = (sceneId: string): number => {
    const s = SCENE_SPANS.find((x) => x.id === sceneId);
    if (!s) throw new Error(`[${TIMING.episode}] unknown scene "${sceneId}"`);
    return s.durationInFrames;
  };

  return {
    TIMING,
    fps,
    sec,
    NARRATION_FRAMES,
    TOTAL_FRAMES,
    phrase,
    kwSec,
    kw,
    kwEnd,
    hasKw,
    kwIn,
    atIn,
    afterSpeech,
    beforeEnd,
    sceneFrames,
    SCENE_SPANS,
    SCENE_START,
    audio: TIMING.staticAudio,
    title: TIMING.title,
    slug: TIMING.episode,
  };
}
