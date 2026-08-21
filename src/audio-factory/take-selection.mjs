/**
 * take-selection.mjs — choose between Take A and Take B, and be honest about how.
 *
 * WHAT THIS IS NOT: it is not a model listening to audio. Nothing in this process hears
 * anything. Every number below is a measurement taken from the waveform with ffmpeg, and the
 * selection is a weighted comparison of those measurements. Saying "I listened to both and
 * preferred A" would be a lie about the mechanism, and the UI says so plainly.
 *
 * WHAT MEASUREMENT CAN AND CANNOT SEE. It can see opening energy, speech rate, pause
 * distribution, dynamic range, clipping and truncation -- which is most of what separates a
 * flat read from a lively one. It cannot hear a mispronounced word, sarcasm, or a delivery
 * that is technically varied but emotionally wrong. So two takes that measure alike are
 * reported as a close call rather than resolved by a tie-break nobody can justify, and the
 * operator can always play both and override.
 *
 * TECHNICAL DEFECTS ARE GATES, NOT POINTS. A clipped or truncated take is not a slightly
 * worse take, it is unusable. Scoring it and letting a lively opening compensate is the same
 * mistake the title engine made with truthfulness.
 */

import { spawnSync } from 'node:child_process';
import { FFMPEG } from '../../tools/ffbin.mjs';

/* ============================================================== measurement */

/** Mono 16 kHz float samples. Enough resolution for envelope work, cheap to decode. */
function decode(path, sampleRate = 16_000) {
  const r = spawnSync(FFMPEG, [
    '-hide_banner', '-nostdin', '-i', path,
    '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-',
  ], { maxBuffer: 1 << 28, timeout: 60_000 });
  if (r.status !== 0 || !r.stdout?.length) return null;
  const buf = r.stdout;
  const n = Math.floor(buf.length / 4);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readFloatLE(i * 4);
  return { samples: out, sampleRate };
}

const db = (x) => (x <= 1e-10 ? -100 : 20 * Math.log10(x));

/**
 * Frame-level energy, plus the derived facts the score reads.
 *
 * 20 ms frames: short enough to resolve a syllable, long enough that one glottal pulse does
 * not read as a pause.
 */
export function analyseAudio(path) {
  const decoded = decode(path);
  if (!decoded) return { ok: false, reason: 'decode failed' };

  const { samples, sampleRate } = decoded;
  const frame = Math.round(sampleRate * 0.02);
  const frames = [];
  let peak = 0;
  let clipped = 0;

  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) {
      const v = samples[j];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      sum += v * v;
    }
    frames.push(Math.sqrt(sum / frame));
  }
  if (!frames.length) return { ok: false, reason: 'no audio' };

  const duration = samples.length / sampleRate;
  const sorted = [...frames].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const loudFrame = sorted[Math.floor(sorted.length * 0.95)];

  /*
   * The speech floor is derived from the audio itself rather than a fixed dB value: TTS output
   * varies in level between voices and models, and a fixed threshold would call a quiet
   * narration "all silence".
   */
  const floor = Math.max(median * 0.35, loudFrame * 0.04);
  const voiced = frames.map((f) => f > floor);

  // Runs of silence, in seconds.
  const pauses = [];
  let run = 0;
  for (const v of voiced) {
    if (!v) run++;
    else { if (run) pauses.push(run * 0.02); run = 0; }
  }
  const trailingSilence = run * 0.02;
  let leading = 0;
  for (const v of voiced) { if (v) break; leading += 0.02; }

  const voicedFrames = voiced.filter(Boolean).length;
  const voicedRatio = voicedFrames / frames.length;

  // Opening energy: the first 1.5 s of VOICED audio, relative to the whole.
  const openWindow = Math.round(1.5 / 0.02);
  const firstVoiced = voiced.findIndex(Boolean);
  const opening = firstVoiced < 0 ? [] : frames.slice(firstVoiced, firstVoiced + openWindow).filter((_, i) => voiced[firstVoiced + i]);
  const openingRms = opening.length ? opening.reduce((a, b) => a + b, 0) / opening.length : 0;
  const overallRms = voicedFrames
    ? frames.filter((_, i) => voiced[i]).reduce((a, b) => a + b, 0) / voicedFrames : 0;

  // Ending energy: the last 1 s of voiced audio.
  const endWindow = Math.round(1.0 / 0.02);
  const voicedIdx = frames.map((_, i) => i).filter((i) => voiced[i]);
  const endIdx = voicedIdx.slice(-endWindow);
  const endingRms = endIdx.length ? endIdx.reduce((a, i) => a + frames[i], 0) / endIdx.length : 0;

  // Dynamic range across voiced frames: a flat read has a narrow spread.
  const voicedVals = voicedIdx.map((i) => frames[i]).sort((a, b) => a - b);
  const p10 = voicedVals[Math.floor(voicedVals.length * 0.1)] ?? 0;
  const p90 = voicedVals[Math.floor(voicedVals.length * 0.9)] ?? 0;
  const dynamicRangeDb = db(p90) - db(p10);

  // How much the envelope moves frame to frame -- monotone delivery barely moves.
  let variation = 0;
  for (let i = 1; i < voicedIdx.length; i++) {
    variation += Math.abs(frames[voicedIdx[i]] - frames[voicedIdx[i - 1]]);
  }
  const envelopeVariation = voicedIdx.length > 1 ? variation / (voicedIdx.length - 1) / (overallRms || 1) : 0;

  return {
    ok: true,
    durationS: duration,
    peakDb: db(peak),
    clippedSamples: clipped,
    voicedRatio,
    leadingSilenceS: leading,
    trailingSilenceS: trailingSilence,
    pauseCount: pauses.length,
    longestPauseS: pauses.length ? Math.max(...pauses) : 0,
    meanPauseS: pauses.length ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0,
    openingRmsDb: db(openingRms),
    overallRmsDb: db(overallRms),
    endingRmsDb: db(endingRms),
    openingRatio: overallRms ? openingRms / overallRms : 0,
    endingRatio: overallRms ? endingRms / overallRms : 0,
    dynamicRangeDb,
    envelopeVariation,
  };
}

/* ================================================================== gates */

/**
 * Deterministic defects. A take failing any of these is out, whatever else it does well.
 *
 * `expectedDurationS` comes from the script length at a plausible speaking rate, and catches
 * the failure that matters most: generation that stopped early. A take that is 40% of the
 * expected length has dropped a paragraph, and no amount of energy makes that usable.
 */
export function runGates(analysis, { expectedDurationS, otherAudioHash, audioHash } = {}) {
  const gates = [];
  const gate = (id, pass, detail = null) => gates.push({ id, pass, detail });

  gate('DECODES', analysis.ok, analysis.ok ? null : analysis.reason);
  if (!analysis.ok) return { passed: false, gates };

  gate('NOT_EMPTY', analysis.voicedRatio > 0.2,
    analysis.voicedRatio <= 0.2 ? `only ${Math.round(analysis.voicedRatio * 100)}% of the file is speech` : null);

  gate('NO_CLIPPING', analysis.clippedSamples < 50 && analysis.peakDb < -0.1,
    analysis.clippedSamples >= 50 ? `${analysis.clippedSamples} clipped samples` : analysis.peakDb >= -0.1 ? `peak ${analysis.peakDb.toFixed(1)} dB` : null);

  gate('NO_DEAD_AIR', analysis.longestPauseS < 3.0,
    analysis.longestPauseS >= 3.0 ? `${analysis.longestPauseS.toFixed(1)}s of silence mid-take` : null);

  if (expectedDurationS) {
    const ratio = analysis.durationS / expectedDurationS;
    gate('NOT_TRUNCATED', ratio > 0.6, ratio <= 0.6
      ? `${analysis.durationS.toFixed(1)}s against an expected ~${expectedDurationS.toFixed(1)}s — generation looks incomplete`
      : null);
    gate('NOT_OVERLONG', ratio < 2.0, ratio >= 2.0
      ? `${analysis.durationS.toFixed(1)}s is far longer than the ~${expectedDurationS.toFixed(1)}s the script implies` : null);
  }

  /*
   * Two takes should never be byte-identical. If they are, the seed did not vary or the cache
   * returned the same file for both -- either way the review is meaningless and the bug should
   * surface here rather than as a mysteriously unanimous winner.
   */
  if (otherAudioHash && audioHash) {
    gate('DISTINCT_FROM_SIBLING', otherAudioHash !== audioHash,
      otherAudioHash === audioHash ? 'both takes are byte-identical — seeds or cache are wrong' : null);
  }

  return { passed: gates.every((g) => g.pass), gates };
}

/* ================================================================ scoring */

/** Weighted dimensions, summing to 100. Editorial heuristics, not audience predictions. */
export const DELIVERY_DIMENSIONS = [
  { id: 'hook', label: 'Opening delivery', max: 20 },
  { id: 'pacing', label: 'Pacing', max: 15 },
  { id: 'prosody', label: 'Natural prosody', max: 15 },
  { id: 'emphasis', label: 'Emphasis', max: 15 },
  { id: 'clarity', label: 'Clarity', max: 15 },
  { id: 'dynamics', label: 'Dynamic range', max: 8 },
  { id: 'pauses', label: 'Pause quality', max: 5 },
  { id: 'ending', label: 'Ending delivery', max: 4 },
  { id: 'technical', label: 'Technical quality', max: 3 },
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
/** Map a measurement onto 0..1 by how close it is to an ideal, with a tolerance band. */
const near = (value, ideal, tolerance) => clamp(1 - Math.abs(value - ideal) / tolerance, 0, 1);

/**
 * Score one take from its measurements.
 *
 * `wordsPerSecond` needs the script, so pacing is only scored when the caller supplies it --
 * guessing a word count from duration would make the dimension circular.
 */
export function scoreDelivery(analysis, { wordCount } = {}) {
  const parts = {};
  const put = (id, fraction, why) => {
    const max = DELIVERY_DIMENSIONS.find((d) => d.id === id).max;
    parts[id] = { points: Math.round(clamp(fraction, 0, 1) * max * 10) / 10, max, why };
  };

  // HOOK — the opening should be at or slightly above the take's own average, not below it.
  put('hook', near(analysis.openingRatio, 1.08, 0.45),
    `opening is ${(analysis.openingRatio * 100).toFixed(0)}% of the take's average level`);

  // PACING — 2.6 words/second is a comfortable explainer rate.
  if (wordCount && analysis.durationS) {
    const wps = wordCount / analysis.durationS;
    put('pacing', near(wps, 2.6, 1.1), `${wps.toFixed(2)} words per second`);
  } else {
    put('pacing', 0.5, 'no word count supplied');
  }

  // PROSODY — how much the envelope moves. Too little is monotone, too much is unstable.
  put('prosody', near(analysis.envelopeVariation, 0.42, 0.32),
    `envelope variation ${analysis.envelopeVariation.toFixed(3)}`);

  // EMPHASIS — a delivery that emphasises has peaks well above its own median.
  put('emphasis', near(analysis.dynamicRangeDb, 15, 9),
    `${analysis.dynamicRangeDb.toFixed(1)} dB between quiet and loud speech`);

  // CLARITY — a healthy proportion of the file should be speech.
  put('clarity', near(analysis.voicedRatio, 0.88, 0.25),
    `${(analysis.voicedRatio * 100).toFixed(0)}% speech`);

  put('dynamics', near(analysis.dynamicRangeDb, 14, 10), `${analysis.dynamicRangeDb.toFixed(1)} dB range`);

  // PAUSES — present but short. No pauses reads as breathless; long ones drag.
  put('pauses', analysis.pauseCount === 0 ? 0.3 : near(analysis.meanPauseS, 0.28, 0.3),
    `${analysis.pauseCount} pauses, mean ${analysis.meanPauseS.toFixed(2)}s`);

  // ENDING — should not trail into nothing.
  put('ending', near(analysis.endingRatio, 0.92, 0.5),
    `ending is ${(analysis.endingRatio * 100).toFixed(0)}% of average level`);

  // TECHNICAL — headroom without clipping.
  put('technical', analysis.clippedSamples > 0 ? 0 : near(analysis.peakDb, -3, 6),
    `peak ${analysis.peakDb.toFixed(1)} dB`);

  const total = Object.values(parts).reduce((n, p) => n + p.points, 0);
  return { parts, total: Math.round(total * 10) / 10 };
}

/** Below this the two takes are indistinguishable by measurement and a human should decide. */
export const CLOSE_CALL_MARGIN = 3.0;

/**
 * Compare two takes.
 *
 * A take that fails a gate loses outright, regardless of score. If both fail, the episode needs
 * another round rather than a winner -- picking the least-bad garbage to keep a batch moving is
 * how a bad episode reaches a channel.
 */
export function selectTake(takeA, takeB) {
  const aOk = takeA.gates.passed;
  const bOk = takeB.gates.passed;

  const failedOf = (t) => t.gates.gates.filter((g) => !g.pass).map((g) => g.id).join(', ');

  if (!aOk && !bOk) {
    return {
      winner: null,
      outcome: 'VOICE_REGEN_REQUIRED',
      reason: `Both takes failed hard gates (A: ${failedOf(takeA)}; B: ${failedOf(takeB)}).`,
      method: 'AUTO',
    };
  }
  if (aOk !== bOk) {
    const winner = aOk ? 'A' : 'B';
    const loser = aOk ? takeB : takeA;
    return {
      winner,
      outcome: 'VOICE_SELECTED',
      reason: `Take ${aOk ? 'B' : 'A'} failed a hard gate (${failedOf(loser)}), so take ${winner} is the only usable one.`,
      method: 'AUTO',
      score: (aOk ? takeA : takeB).score.total,
    };
  }

  const diff = takeA.score.total - takeB.score.total;
  const winner = diff >= 0 ? 'A' : 'B';
  const close = Math.abs(diff) < CLOSE_CALL_MARGIN;

  // The biggest single contributor to the gap, so the reason names something specific.
  const best = DELIVERY_DIMENSIONS
    .map((d) => ({ id: d.id, label: d.label, delta: (takeA.score.parts[d.id]?.points ?? 0) - (takeB.score.parts[d.id]?.points ?? 0) }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))[0];

  return {
    winner,
    outcome: 'VOICE_SELECTED',
    method: 'AUTO',
    close,
    humanReviewRecommended: close,
    score: Math.max(takeA.score.total, takeB.score.total),
    margin: Math.round(Math.abs(diff) * 10) / 10,
    reason: close
      ? `Takes are within ${Math.abs(diff).toFixed(1)} points — measurement cannot separate them, so take ${winner} is chosen on the higher total and a listen is recommended.`
      : `Take ${winner} leads by ${Math.abs(diff).toFixed(1)} points, mostly on ${best.label.toLowerCase()}.`,
    /*
     * Stated on every selection so it is never mistaken for a listening judgement, and so it
     * travels with the record rather than living only in a UI caption.
     */
    basis: 'ACOUSTIC_MEASUREMENT_ONLY — no audio was listened to; scores come from waveform analysis.',
  };
}
