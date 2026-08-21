/**
 * audio-factory.test.mjs — the rules the script-to-audio factory must not break.
 *
 * The first block is the one that matters most. `title` is a field on the same object as
 * `content`, one line apart, and every template-shaped instinct wants to write
 * `${title}. ${content}`. If that ever happens, a hundred videos narrate their own headline
 * and nobody notices until playback.
 */

import { describe, expect, it } from 'vitest';

import {
  BATCH_DEFAULTS, narrationTextOf, validateBatch, normaliseInput, parseJsonl, toCanonicalJson, sha,
} from '../src/audio-factory/intake.mjs';
import { cacheKeyFor, seedFor, requestSettingsFrom, TAKE_LABELS, GENERATOR_VERSION } from '../src/audio-factory/tts.mjs';
import { runGates, scoreDelivery, selectTake, DELIVERY_DIMENSIONS, CLOSE_CALL_MARGIN } from '../src/audio-factory/take-selection.mjs';
import { compareTranscript, normaliseWord, criticalTermsOf, tokenise } from '../src/audio-factory/transcript.mjs';
import { attachTiming, buildCues, validateCues, cuesToSrt, buildSubtitles, TIMING_METHOD } from '../src/audio-factory/subtitles.mjs';
import { BATCH_STAGE, EPISODE_STATE, canAdvance, nextStage } from '../src/audio-factory/states.mjs';

const EP = {
  id: 'episode-001',
  title: 'Why Airplane Windows Have That Tiny Hole',
  content: 'Look closely at an airplane window and you will find a tiny hole near the bottom.',
  contentHash: sha('Look closely at an airplane window and you will find a tiny hole near the bottom.'),
};

/* ================================================ the title is never spoken */

describe('narration text', () => {
  it('is the content and only the content', () => {
    expect(narrationTextOf(EP)).toBe(EP.content);
  });

  it('never contains the title', () => {
    const spoken = narrationTextOf(EP);
    expect(spoken).not.toContain('Why Airplane Windows');
    expect(spoken.toLowerCase()).not.toContain(EP.title.toLowerCase());
  });

  it('ignores every non-narration field, however tempting', () => {
    const spoken = narrationTextOf({
      ...EP,
      notes: 'REMEMBER TO SAY THIS OUT LOUD',
      metadata: { source: 'spoken?' },
      pronunciationHints: ['vanillin'],
    });
    expect(spoken).toBe(EP.content);
    for (const leak of ['REMEMBER', 'spoken?', 'vanillin']) expect(spoken).not.toContain(leak);
  });

  it('produces the same text whatever the title is changed to', () => {
    const a = narrationTextOf({ ...EP, title: 'A' });
    const b = narrationTextOf({ ...EP, title: 'A completely different headline entirely' });
    expect(a).toBe(b);
  });

  it('tidies whitespace without adding a word', () => {
    const spoken = narrationTextOf({ content: '  two   spaces\tand a tab  ' });
    expect(spoken).toBe('two spaces and a tab');
    expect(tokenise(spoken)).toHaveLength(5);
  });
});

/* ========================================================= script intake */

describe('batch validation', () => {
  const batch = (episodes, defaults = {}) => validateBatch({
    schemaVersion: 1, batch: { id: 'batch-002', defaults }, episodes,
  });

  it('accepts a bare array of episodes', () => {
    const r = normaliseInput([{ id: 'a', title: 't', content: 'c' }], { batchId: 'b' });
    expect(r.episodes).toHaveLength(1);
    expect(r.batch.id).toBe('b');
  });

  it('rejects a duplicate id', () => {
    const r = batch([
      { id: 'dup', title: 'One', content: 'Some narration long enough to pass.' },
      { id: 'dup', title: 'Two', content: 'Different narration long enough to pass.' },
    ]);
    expect(r.episodes[1].valid).toBe(false);
    expect(r.episodes[1].issues.map((i) => i.code)).toContain('DUPLICATE_ID');
  });

  it('rejects empty content', () => {
    const r = batch([{ id: 'a', title: 'Has a title', content: '   ' }]);
    expect(r.episodes[0].valid).toBe(false);
    expect(r.episodes[0].issues.map((i) => i.code)).toContain('EMPTY_CONTENT');
  });

  it('rejects an empty title even though it is never spoken', () => {
    // It identifies the episode everywhere in the UI; an untitled row is unusable.
    const r = batch([{ id: 'a', title: '', content: 'Some narration long enough to pass.' }]);
    expect(r.episodes[0].issues.map((i) => i.code)).toContain('EMPTY_TITLE');
  });

  it('warns on duplicate narration without failing it', () => {
    const same = 'Exactly the same narration in both episodes here.';
    const r = batch([
      { id: 'a', title: 'A', content: same },
      { id: 'b', title: 'B', content: same },
    ]);
    expect(r.episodes[1].valid).toBe(true);
    expect(r.episodes[1].issues.map((i) => i.code)).toContain('DUPLICATE_CONTENT');
  });

  it('defaults the voice to the Bill Finds Out voice', () => {
    expect(batch([]).defaults.voiceId).toBe('TX3LPaxmHKxFdv7VOQHJ');
    expect(BATCH_DEFAULTS.voiceId).toBe('TX3LPaxmHKxFdv7VOQHJ');
  });

  it('lets a batch default override the voice for every episode', () => {
    const r = batch([{ id: 'a', title: 'A', content: 'Some narration long enough to pass.' }],
      { voiceId: 'OTHERVOICE0000000000' });
    expect(r.defaults.voiceId).toBe('OTHERVOICE0000000000');
    expect(r.episodes[0].voiceId).toBeNull(); // null means "use the batch voice"
  });

  it('keeps a per-episode voice override distinct from the default', () => {
    const r = batch([{ id: 'a', title: 'A', content: 'Some narration long enough to pass.', voiceId: 'SPECIAL0000000000000' }]);
    expect(r.episodes[0].voiceId).toBe('SPECIAL0000000000000');
  });

  it('rejects an unknown voice override when the voice list is known', () => {
    const r = validateBatch(
      { batch: { id: 'b' }, episodes: [{ id: 'a', title: 'A', content: 'Some narration long enough to pass.', voiceId: 'NOPE' }] },
      { knownVoiceIds: new Set(['TX3LPaxmHKxFdv7VOQHJ']) });
    expect(r.episodes[0].issues.map((i) => i.code)).toContain('UNKNOWN_VOICE');
  });

  it('counts valid and invalid separately', () => {
    const r = batch([
      { id: 'a', title: 'A', content: 'Some narration long enough to pass.' },
      { id: '', title: 'B', content: 'Some other narration long enough.' },
    ]);
    expect(r.summary.total).toBe(2);
    expect(r.summary.valid).toBe(1);
    expect(r.summary.invalid).toBe(1);
  });

  it('parses JSONL and round-trips canonical JSON', () => {
    const lines = '{"id":"a","title":"A","content":"Some narration long enough to pass."}\n\n{"id":"b","title":"B","content":"More narration long enough to pass."}';
    const eps = parseJsonl(lines);
    expect(eps).toHaveLength(2);

    const r = batch(eps);
    const json = toCanonicalJson(r.batchId, r.defaults, r.episodes);
    const again = validateBatch(json);
    expect(again.episodes.map((e) => e.content)).toEqual(r.episodes.map((e) => e.content));
    expect(again.episodes.map((e) => e.title)).toEqual(r.episodes.map((e) => e.title));
  });
});

/* ==================================================== TTS cache and seeds */

describe('tts cache key', () => {
  const base = {
    contentHash: EP.contentHash, voiceId: 'V1', modelId: 'eleven_v3',
    settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 },
    seed: 123, outputFormat: 'mp3_44100_128', languageCode: 'en',
  };

  it('is stable for identical inputs', () => {
    expect(cacheKeyFor(base)).toBe(cacheKeyFor({ ...base }));
  });

  it('changes when the script changes', () => {
    expect(cacheKeyFor({ ...base, contentHash: sha('different') })).not.toBe(cacheKeyFor(base));
  });

  it('changes when the voice changes', () => {
    expect(cacheKeyFor({ ...base, voiceId: 'V2' })).not.toBe(cacheKeyFor(base));
  });

  it('changes when the model changes', () => {
    expect(cacheKeyFor({ ...base, modelId: 'eleven_multilingual_v2' })).not.toBe(cacheKeyFor(base));
  });

  it('changes when the settings change', () => {
    expect(cacheKeyFor({ ...base, settings: { ...base.settings, stability: 0.9 } })).not.toBe(cacheKeyFor(base));
  });

  it('changes when the seed changes, which is what separates take A from take B', () => {
    expect(cacheKeyFor({ ...base, seed: 456 })).not.toBe(cacheKeyFor(base));
  });

  it('is unaffected by settings key order', () => {
    const reordered = { speed: 1, use_speaker_boost: true, style: 0, similarity_boost: 0.75, stability: 0.5 };
    expect(cacheKeyFor({ ...base, settings: reordered })).toBe(cacheKeyFor(base));
  });

  it('is versioned, so changing how we build requests invalidates old audio', () => {
    expect(GENERATOR_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe('take seeds', () => {
  it('produces exactly two takes', () => {
    expect(TAKE_LABELS).toEqual(['A', 'B']);
  });

  it('gives A and B different seeds', () => {
    expect(seedFor('b', 'e', 'A')).not.toBe(seedFor('b', 'e', 'B'));
  });

  it('is deterministic, so a rerun reproduces the same performances', () => {
    expect(seedFor('b', 'e', 'A')).toBe(seedFor('b', 'e', 'A'));
  });

  it('differs per episode so two scripts do not share a performance seed', () => {
    expect(seedFor('b', 'e1', 'A')).not.toBe(seedFor('b', 'e2', 'A'));
  });

  it('stays inside the range the API accepts', () => {
    for (const l of TAKE_LABELS) {
      const s = seedFor('batch', 'episode', l);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(4_294_967_295);
    }
  });
});

describe('request settings', () => {
  it('always asks for speed 1.0, because the existing processor owns pacing', () => {
    expect(requestSettingsFrom({ speed: 1.4 }).speed).toBe(1);
    expect(requestSettingsFrom(null, { speed: 2 }).speed).toBe(1);
  });

  it('keeps the voice baseline rather than exaggerating style', () => {
    expect(requestSettingsFrom({ style: 0.1 }).style).toBe(0.1);
    expect(requestSettingsFrom(null).style).toBe(0);
  });
});

/* ======================================================== take selection */

describe('delivery gates', () => {
  const good = {
    ok: true, durationS: 30, peakDb: -3, clippedSamples: 0, voicedRatio: 0.9,
    longestPauseS: 0.4, meanPauseS: 0.25, pauseCount: 8, openingRatio: 1.05, endingRatio: 0.95,
    dynamicRangeDb: 14, envelopeVariation: 0.4, openingRmsDb: -18, overallRmsDb: -19, endingRmsDb: -20,
    leadingSilenceS: 0.05, trailingSilenceS: 0.05,
  };

  it('passes a clean take', () => {
    expect(runGates(good, { expectedDurationS: 30 }).passed).toBe(true);
  });

  it('fails a clipped take', () => {
    const r = runGates({ ...good, clippedSamples: 900, peakDb: 0 }, { expectedDurationS: 30 });
    expect(r.passed).toBe(false);
    expect(r.gates.find((g) => g.id === 'NO_CLIPPING').pass).toBe(false);
  });

  it('fails a truncated take', () => {
    const r = runGates({ ...good, durationS: 9 }, { expectedDurationS: 30 });
    expect(r.gates.find((g) => g.id === 'NOT_TRUNCATED').pass).toBe(false);
  });

  it('fails a near-empty take', () => {
    expect(runGates({ ...good, voicedRatio: 0.05 }, { expectedDurationS: 30 }).passed).toBe(false);
  });

  it('fails two byte-identical takes, which means the seed or cache is broken', () => {
    const r = runGates(good, { expectedDurationS: 30, audioHash: 'same', otherAudioHash: 'same' });
    expect(r.gates.find((g) => g.id === 'DISTINCT_FROM_SIBLING').pass).toBe(false);
  });

  it('does not score a take that failed to decode', () => {
    expect(runGates({ ok: false, reason: 'decode failed' }).passed).toBe(false);
  });
});

describe('delivery scoring', () => {
  const analysis = {
    ok: true, durationS: 30, peakDb: -3, clippedSamples: 0, voicedRatio: 0.88,
    longestPauseS: 0.4, meanPauseS: 0.28, pauseCount: 8, openingRatio: 1.08, endingRatio: 0.92,
    dynamicRangeDb: 15, envelopeVariation: 0.42,
  };

  it('sums to 100 across the configured dimensions', () => {
    expect(DELIVERY_DIMENSIONS.reduce((n, d) => n + d.max, 0)).toBe(100);
  });

  it('never exceeds a dimension maximum', () => {
    const s = scoreDelivery(analysis, { wordCount: 78 });
    for (const p of Object.values(s.parts)) {
      expect(p.points).toBeLessThanOrEqual(p.max);
      expect(p.points).toBeGreaterThanOrEqual(0);
    }
  });

  it('explains every dimension', () => {
    for (const p of Object.values(scoreDelivery(analysis, { wordCount: 78 }).parts)) {
      expect(typeof p.why).toBe('string');
      expect(p.why.length).toBeGreaterThan(0);
    }
  });

  it('prefers a lively opening to a flat one', () => {
    const lively = scoreDelivery({ ...analysis, openingRatio: 1.08 }, { wordCount: 78 });
    const flat = scoreDelivery({ ...analysis, openingRatio: 0.55 }, { wordCount: 78 });
    expect(lively.parts.hook.points).toBeGreaterThan(flat.parts.hook.points);
  });

  it('prefers a varied delivery to a monotone one', () => {
    const varied = scoreDelivery({ ...analysis, envelopeVariation: 0.42 }, { wordCount: 78 });
    const monotone = scoreDelivery({ ...analysis, envelopeVariation: 0.05 }, { wordCount: 78 });
    expect(varied.parts.prosody.points).toBeGreaterThan(monotone.parts.prosody.points);
  });
});

describe('take comparison', () => {
  const mk = (score, passed = true, failing = []) => ({
    gates: { passed, gates: [{ id: 'NO_CLIPPING', pass: passed, detail: null }, ...failing.map((id) => ({ id, pass: false, detail: 'x' }))] },
    score: { total: score, parts: Object.fromEntries(DELIVERY_DIMENSIONS.map((d) => [d.id, { points: d.max * (score / 100), max: d.max }])) },
  });

  it('lets a clean take beat a technically broken one regardless of score', () => {
    const r = selectTake(mk(40, true), mk(95, false, ['NO_CLIPPING']));
    expect(r.winner).toBe('A');
    expect(r.reason).toMatch(/hard gate/i);
  });

  it('requires regeneration when both takes fail', () => {
    const r = selectTake(mk(80, false, ['NOT_TRUNCATED']), mk(78, false, ['NO_CLIPPING']));
    expect(r.winner).toBeNull();
    expect(r.outcome).toBe('VOICE_REGEN_REQUIRED');
  });

  it('picks the higher score when both are clean', () => {
    expect(selectTake(mk(70), mk(85)).winner).toBe('B');
  });

  it('flags a close call for a human rather than pretending to be sure', () => {
    const r = selectTake(mk(80), mk(80 + CLOSE_CALL_MARGIN - 0.5));
    expect(r.close).toBe(true);
    expect(r.humanReviewRecommended).toBe(true);
  });

  it('states that the decision came from measurement, not from listening', () => {
    // The mechanism must travel with the record; a caption in the UI is not enough.
    expect(selectTake(mk(70), mk(85)).basis).toMatch(/ACOUSTIC_MEASUREMENT_ONLY/);
    expect(selectTake(mk(70), mk(85)).basis).toMatch(/no audio was listened to/i);
  });
});

/* ============================================== transcript verification */

describe('transcript comparison', () => {
  const script = 'As paper and glue age they release volatile chemicals including vanillin into the air.';

  it('passes when the transcript matches', () => {
    const r = compareTranscript(script, script);
    expect(r.wer).toBe(0);
    expect(r.ok).toBe(true);
  });

  it('ignores case and punctuation differences', () => {
    const r = compareTranscript(script, 'as paper and glue age, they release volatile chemicals including vanillin into the air');
    expect(r.wer).toBe(0);
  });

  it('treats a numeral and its spelled form as the same spoken word', () => {
    expect(normaliseWord('7')).toBe(normaliseWord('seven'));
  });

  it('catches a technical term heard wrongly', () => {
    const r = compareTranscript(script, script.replace('vanillin', 'vanilla'), { criticalTerms: ['vanillin'] });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('POSSIBLE_PRONUNCIATION_ERROR');
    expect(r.suggestedKeyterms).toContain('vanillin');
  });

  it('catches a dropped clause as a run of missing words', () => {
    const r = compareTranscript(script, 'As paper and glue age they release into the air.');
    expect(r.longestMissingRun).toBeGreaterThanOrEqual(3);
    expect(r.issues.map((i) => i.code)).toContain('POSSIBLE_TRUNCATION');
  });

  it('does not fail on one dropped function word', () => {
    expect(compareTranscript(script, script.replace(' the air', ' air')).ok).toBe(true);
  });

  it('derives critical terms from the script itself', () => {
    const terms = criticalTermsOf('The diaphragm inside the nozzle reacts to pressure.');
    expect(terms).toContain('diaphragm');
  });
});

/* ============================================================ subtitles */

describe('subtitle building', () => {
  const canonical = 'That tiny hole is there on purpose. It equalises the pressure between the panes.';
  const aligned = canonical.split(/\s+/).map((w, i) => ({ text: w, start: i * 0.4, end: i * 0.4 + 0.35, loss: 0.1 }));

  it('takes its text from the script, never from the transcript', () => {
    // The transcript mishears "equalises"; the subtitle must still say what the script says.
    const heard = aligned.map((w) => (w.text === 'equalises' ? { ...w, text: 'equalizes' } : w));
    const r = buildSubtitles({ canonicalText: canonical, alignment: { words: heard, loss: 0.1 }, audioDurationS: 20 });
    expect(r.srt).toContain('equalises');
    expect(r.srt).not.toContain('equalizes');
  });

  it('takes its timing from the alignment', () => {
    const r = buildSubtitles({ canonicalText: canonical, alignment: { words: aligned, loss: 0.1 }, audioDurationS: 20 });
    expect(r.method).toBe(TIMING_METHOD.FORCED_ALIGNMENT);
    expect(r.cues[0].start).toBeCloseTo(0, 2);
  });

  it('falls back to transcript timing when alignment is unavailable, and says so', () => {
    const r = buildSubtitles({ canonicalText: canonical, alignment: null, transcript: { words: aligned }, audioDurationS: 20 });
    expect(r.method).toBe(TIMING_METHOD.TRANSCRIPT_MAPPED);
  });

  it('reports that a human is needed when there is no timing at all', () => {
    const r = buildSubtitles({ canonicalText: canonical, alignment: null, transcript: null });
    expect(r.method).toBe(TIMING_METHOD.HUMAN_REQUIRED);
    expect(r.validation.ok).toBe(false);
  });

  it('groups words into readable cues rather than one per word', () => {
    const cues = buildCues(attachTiming(canonical, aligned));
    expect(cues.length).toBeGreaterThan(1);
    expect(cues.length).toBeLessThan(canonical.split(/\s+/).length);
  });

  it('produces monotonic, non-overlapping, positive-duration cues', () => {
    const cues = buildCues(attachTiming(canonical, aligned));
    for (const [i, c] of cues.entries()) {
      expect(c.end).toBeGreaterThan(c.start);
      if (i > 0) expect(c.start).toBeGreaterThanOrEqual(cues[i - 1].end - 1e-6);
    }
  });

  it('fails validation when a cue runs past the end of the audio', () => {
    const cues = buildCues(attachTiming(canonical, aligned));
    const v = validateCues(cues, { canonicalText: canonical, audioDurationS: 1 });
    expect(v.ok).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain('EXTENDS_PAST_AUDIO');
  });

  it('fails validation if the wording drifted from the script', () => {
    const cues = [{ text: 'Something else entirely', start: 0, end: 2, words: 3 }];
    const v = validateCues(cues, { canonicalText: canonical, audioDurationS: 20 });
    expect(v.issues.map((i) => i.code)).toContain('CANONICAL_TEXT_ALTERED');
  });

  it('gives a word the aligner missed a span between its neighbours', () => {
    const gappy = aligned.filter((w) => w.text !== 'purpose.');
    const timed = attachTiming(canonical, gappy);
    const missed = timed.find((w) => w.text === 'purpose.');
    expect(missed.matched).toBe(false);
    expect(missed.start).toBeGreaterThan(0);
    expect(missed.end).toBeGreaterThan(missed.start);
  });

  it('writes valid SRT timecodes', () => {
    const srt = cuesToSrt([{ text: 'Hello', start: 1.5, end: 3.25, words: 1 }]);
    expect(srt).toContain('00:00:01,500 --> 00:00:03,250');
  });
});

/* ======================================================= stage barriers */

describe('batch stage barrier', () => {
  const eps = (states) => states.map((state, i) => ({ episode_id: `e${i}`, state, excluded: 0 }));

  it('holds the batch until every episode finishes the stage', () => {
    const r = canAdvance(BATCH_STAGE.TTS_GENERATION,
      eps([EPISODE_STATE.TTS_COMPLETE, EPISODE_STATE.TTS_PENDING]));
    expect(r.ok).toBe(false);
    expect(r.blocking).toHaveLength(1);
  });

  it('advances when all are done', () => {
    const r = canAdvance(BATCH_STAGE.TTS_GENERATION, eps([EPISODE_STATE.TTS_COMPLETE, EPISODE_STATE.TTS_COMPLETE]));
    expect(r.ok).toBe(true);
    expect(r.ready).toBe(2);
  });

  it('does not let an excluded episode hold the batch', () => {
    const list = eps([EPISODE_STATE.TTS_COMPLETE, EPISODE_STATE.TTS_PENDING]);
    list[1].excluded = 1;
    expect(canAdvance(BATCH_STAGE.TTS_GENERATION, list).ok).toBe(true);
  });

  it('counts later progress as satisfying an earlier gate', () => {
    // An episode already processed obviously finished TTS.
    expect(canAdvance(BATCH_STAGE.TTS_GENERATION, eps([EPISODE_STATE.VOICE_PROCESSED])).ok).toBe(true);
  });

  it('refuses a batch where everything is excluded', () => {
    const list = eps([EPISODE_STATE.TTS_COMPLETE]);
    list[0].excluded = 1;
    expect(canAdvance(BATCH_STAGE.TTS_GENERATION, list).ok).toBe(false);
  });

  it('orders the stages so audio finishes before visual production begins', () => {
    expect(nextStage(BATCH_STAGE.SUBTITLE_VALIDATION)).toBe(BATCH_STAGE.AUDIO_READY);
    expect(nextStage(BATCH_STAGE.AUDIO_READY)).toBe(BATCH_STAGE.VISUAL_PRODUCTION);
  });
});
