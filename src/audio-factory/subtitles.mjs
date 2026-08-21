/**
 * subtitles.mjs — build an SRT whose words come from the script and whose timing comes from
 * the audio.
 *
 * THE SOURCE-OF-TRUTH RULE, because it is the whole reason this stage exists:
 *
 *   TEXT     — the canonical `content`. Always. Never the transcript.
 *   TIMING   — forced alignment against the processed narration.
 *   CHECKING — the independent Scribe transcript.
 *
 * Taking the text from the transcript is the obvious shortcut and it is wrong: Scribe hears
 * "vanilla" where the script says "vanillin", and a subtitle that agrees with the mistake
 * makes it look deliberate. Taking the timing from the script is equally wrong -- there is no
 * timing in a script. Each source is used for the thing only it knows.
 *
 * FALLBACK ORDER when alignment is unavailable, most trustworthy first:
 *   1. forced alignment          — exact positions of the known words
 *   2. transcript word timings mapped back onto canonical words
 *   3. the existing SRT-derived estimator already in this repo
 *   4. human review
 * Whichever was used is recorded, because a subtitle built by estimate deserves a different
 * level of trust from one built by alignment.
 */

import { tokenise, normaliseWord } from './transcript.mjs';

export const TIMING_METHOD = {
  FORCED_ALIGNMENT: 'FORCED_ALIGNMENT',
  TRANSCRIPT_MAPPED: 'TRANSCRIPT_MAPPED',
  ESTIMATED: 'ESTIMATED',
  HUMAN_REQUIRED: 'HUMAN_REQUIRED',
};

/** House subtitle shape, matching what the existing renderer already displays. */
export const SUBTITLE_RULES = {
  maxChars: 42,
  maxWords: 9,
  minDurationS: 0.6,
  maxDurationS: 4.5,
  /** A gap this long is a sentence boundary whatever the punctuation says. */
  pauseSplitS: 0.32,
};

/**
 * Attach timing to the canonical words.
 *
 * Alignment returns its own tokenisation, which may differ from a naive split on the script --
 * it may split hyphenates or drop punctuation. So the two are walked together by normalised
 * form rather than by index, and a word the aligner never produced inherits a span from its
 * neighbours instead of vanishing.
 */
export function attachTiming(canonicalText, alignedWords) {
  const canonical = String(canonicalText).split(/\s+/).filter(Boolean);
  const out = [];
  let ai = 0;

  for (const raw of canonical) {
    const key = normaliseWord(raw);
    let match = null;
    // Look ahead a little: the aligner may have emitted an extra token.
    for (let probe = ai; probe < Math.min(alignedWords.length, ai + 4); probe++) {
      if (normaliseWord(alignedWords[probe].text) === key) { match = alignedWords[probe]; ai = probe + 1; break; }
    }
    out.push(match
      ? { text: raw, start: match.start, end: match.end, loss: match.loss ?? null, matched: true }
      : { text: raw, start: null, end: null, loss: null, matched: false });
  }

  /*
   * Interpolate anything unmatched across the gap between its known neighbours, so a word
   * without an alignment still lands inside the right span rather than at zero.
   */
  for (let i = 0; i < out.length; i++) {
    if (out[i].start !== null) continue;
    let prev = i - 1;
    while (prev >= 0 && out[prev].end === null) prev--;
    let next = i + 1;
    while (next < out.length && out[next].start === null) next++;
    const from = prev >= 0 ? out[prev].end : 0;
    const to = next < out.length ? out[next].start : from + 0.3;
    const runLength = next - prev - 1;
    const slot = (to - from) / Math.max(1, runLength);
    const k = i - prev - 1;
    out[i].start = from + slot * k;
    out[i].end = from + slot * (k + 1);
  }

  return out;
}

/**
 * Group timed words into readable cues.
 *
 * One cue per word is technically valid and unreadable. Splitting is driven by sentence
 * punctuation first, then real pauses in the audio, then length -- so a break lands where the
 * narrator actually stopped rather than where a character counter ran out.
 */
export function buildCues(timedWords, rules = SUBTITLE_RULES) {
  const cues = [];
  let current = [];

  const flush = () => {
    if (!current.length) return;
    cues.push({
      text: current.map((w) => w.text).join(' '),
      start: current[0].start,
      end: current[current.length - 1].end,
      words: current.length,
    });
    current = [];
  };

  for (const [i, w] of timedWords.entries()) {
    current.push(w);
    const next = timedWords[i + 1];
    const chars = current.map((x) => x.text).join(' ').length;
    const duration = w.end - current[0].start;
    const gapToNext = next ? next.start - w.end : Infinity;

    const endsSentence = /[.!?]["')\]]?$/.test(w.text);
    const endsClause = /[,;:—]["')\]]?$/.test(w.text);

    const mustSplit = chars >= rules.maxChars
      || current.length >= rules.maxWords
      || duration >= rules.maxDurationS
      || !next;
    const shouldSplit = endsSentence
      || gapToNext >= rules.pauseSplitS
      || (endsClause && chars >= rules.maxChars * 0.6);

    if (mustSplit || shouldSplit) flush();
  }
  flush();

  /*
   * Enforce a readable minimum by borrowing from the gap to the next cue, never by overlapping
   * it. A cue that is on screen for a third of a second is a flicker, not a subtitle.
   */
  for (const [i, c] of cues.entries()) {
    if (c.end - c.start >= rules.minDurationS) continue;
    const ceiling = cues[i + 1] ? cues[i + 1].start - 0.02 : Infinity;
    c.end = Math.min(c.start + rules.minDurationS, ceiling);
  }

  return cues;
}

const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
const srtTime = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  return `${pad(ms / 3_600_000)}:${pad((ms / 60_000) % 60)}:${pad((ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`;
};

export function cuesToSrt(cues) {
  return `${cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}`).join('\n\n')}\n`;
}

/**
 * Check the finished subtitles against the things that make a viewer notice them.
 *
 * The canonical-coverage check is the important one: it proves no scripted word was lost on
 * the way through timing and grouping, which is the failure that would otherwise ship silently.
 */
export function validateCues(cues, { canonicalText, audioDurationS, rules = SUBTITLE_RULES } = {}) {
  const issues = [];

  for (const [i, c] of cues.entries()) {
    if (!c.text.trim()) issues.push({ code: 'EMPTY_CUE', severity: 'error', at: i + 1, message: 'Cue has no text.' });
    if (!(c.end > c.start)) issues.push({ code: 'NON_POSITIVE_DURATION', severity: 'error', at: i + 1, message: `${c.start.toFixed(2)} → ${c.end.toFixed(2)}` });
    if (i > 0 && c.start < cues[i - 1].end - 1e-6) {
      issues.push({ code: 'OVERLAP', severity: 'error', at: i + 1, message: `Starts before cue ${i} ends.` });
    }
    if (c.start < -1e-6) issues.push({ code: 'NEGATIVE_START', severity: 'error', at: i + 1, message: `${c.start.toFixed(2)}s` });
    if (c.text.length > rules.maxChars * 1.5) {
      issues.push({ code: 'CUE_TOO_LONG', severity: 'warn', at: i + 1, message: `${c.text.length} characters.` });
    }
  }

  if (audioDurationS && cues.length) {
    const last = cues[cues.length - 1];
    // A small tolerance: alignment can place a final consonant a few ms past the decoded end.
    if (last.end > audioDurationS + 0.25) {
      issues.push({
        code: 'EXTENDS_PAST_AUDIO', severity: 'error',
        message: `Last cue ends at ${last.end.toFixed(2)}s but the audio is ${audioDurationS.toFixed(2)}s.`,
      });
    }
  }

  if (canonicalText) {
    const wanted = tokenise(canonicalText);
    const got = tokenise(cues.map((c) => c.text).join(' '));
    if (wanted.length !== got.length || wanted.some((w, i) => w !== got[i])) {
      const missing = wanted.filter((w) => !got.includes(w));
      issues.push({
        code: 'CANONICAL_TEXT_ALTERED', severity: 'error',
        message: missing.length
          ? `Subtitles do not carry the script verbatim; missing: ${missing.slice(0, 6).join(', ')}`
          : 'Subtitle wording differs from the script.',
      });
    }
  }

  return {
    issues,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warn').length,
    ok: issues.every((i) => i.severity !== 'error'),
    cueCount: cues.length,
    totalChars: cues.reduce((n, c) => n + c.text.length, 0),
  };
}

/**
 * The whole subtitle stage for one episode.
 *
 * Returns the SRT, the cues, the validation and -- crucially -- which timing method produced
 * it, so a downstream reader can tell an aligned subtitle from an estimated one.
 */
export function buildSubtitles({ canonicalText, alignment, transcript, audioDurationS }) {
  let method = TIMING_METHOD.HUMAN_REQUIRED;
  let words = null;

  if (alignment?.words?.length) {
    method = TIMING_METHOD.FORCED_ALIGNMENT;
    words = alignment.words;
  } else if (transcript?.words?.length) {
    // Second best: the transcript knows WHEN it heard things, even if it misheard some.
    method = TIMING_METHOD.TRANSCRIPT_MAPPED;
    words = transcript.words.filter((w) => w.start !== null && w.end !== null);
  }

  if (!words?.length) {
    return { method, cues: [], srt: null, validation: { ok: false, errors: 1, issues: [{ code: 'NO_TIMING_SOURCE', severity: 'error', message: 'Neither alignment nor transcript timing is available.' }] } };
  }

  const timed = attachTiming(canonicalText, words);
  const cues = buildCues(timed);
  const validation = validateCues(cues, { canonicalText, audioDurationS });

  return {
    method,
    cues,
    srt: cuesToSrt(cues),
    validation,
    unmatchedWords: timed.filter((w) => !w.matched).length,
    alignmentLoss: alignment?.loss ?? null,
  };
}
