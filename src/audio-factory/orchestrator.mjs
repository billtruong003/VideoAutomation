/**
 * orchestrator.mjs — run a batch through the audio factory, one stage at a time.
 *
 * THE STAGE BARRIER IS THE ARCHITECTURE. Every included episode finishes a stage before any
 * episode starts the next one. Running episode 1 all the way to a rendered video while
 * episode 2 has no audio yet is fast to write and impossible to operate: a failure at episode
 * 60 leaves fifty-nine finished videos, one broken one, and forty untouched scripts, with no
 * single place to look. Doing TTS for all hundred, then reviewing all hundred, means every
 * question has one answer.
 *
 * WITHIN a stage, work runs in parallel up to a ceiling the account dictates.
 *
 * THE HANDOFF IS DELIBERATELY LITERAL. When a batch reaches AUDIO_READY it has written exactly
 * the artefacts `tools/build-batch.mjs` used to produce from hand-exported ElevenLabs files:
 * a processed WAV and time map under public/audio, and word-level alignment at
 * episodes/<slug>/subtitles-raw.json in ElevenLabs' own shape. The existing
 * remap-timing/storyboard/render pipeline cannot tell the difference, which is the point --
 * this phase adds a front half rather than a second pipeline.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getDb, now } from '../youtube/db/index.mjs';
import { STATE_DIR } from '../youtube/config.mjs';
import { validateBatch, narrationTextOf, toCanonicalJson, BATCH_DEFAULTS } from './intake.mjs';
import { BATCH_STAGE, EPISODE_STATE, STAGE_TARGET_STATE, canAdvance, nextStage } from './states.mjs';
import { generateTake, runPool, TAKE_LABELS, seedFor } from './tts.mjs';
import { analyseAudio, runGates, scoreDelivery, selectTake } from './take-selection.mjs';
import { compareTranscript, criticalTermsOf } from './transcript.mjs';
import { buildSubtitles, TIMING_METHOD } from './subtitles.mjs';
import {
  getSubscription, listModels, getVoice, getVoiceSettings, listVoices,
  speechToText, forcedAlignment, ElevenLabsError, EL_ERROR,
} from './elevenlabs/client.mjs';
import { probeDuration } from '../../tools/ffbin.mjs';

const ROOT = process.cwd();

/**
 * Raw takes live OUTSIDE the repository.
 *
 * A hundred episodes is two hundred candidate files, and half of them are rejected. Putting
 * them in git would add hundreds of megabytes of audio nobody will ever play again to a
 * repository that has already grown substantially from rendered video.
 */
export const CACHE_ROOT = join(STATE_DIR, 'audio-factory');
const takeDir = (batchId, episodeId) => join(CACHE_ROOT, batchId, episodeId);

const db = () => getDb();

/* ================================================================= import */

/** Validate and persist a batch. Nothing is generated here. */
export function importBatch(rawInput, { batchId } = {}) {
  const result = validateBatch(rawInput);
  const id = batchId ?? result.batchId;
  const d = db();

  const existing = d.prepare('SELECT batch_id FROM af_batch WHERE batch_id = ?').get(id);
  if (existing) throw Object.assign(new Error(`Batch "${id}" already exists.`), { code: 'BATCH_EXISTS' });

  d.transaction(() => {
    d.prepare(`INSERT INTO af_batch
      (batch_id, stage, schema_version, source_hash, source_json, defaults_json, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, BATCH_STAGE.SCRIPT_IMPORT, result.schemaVersion, result.sourceHash,
        // The user's input is preserved verbatim so the import stays auditable.
        JSON.stringify(rawInput), JSON.stringify(result.defaults), now(), now());

    const ins = d.prepare(`INSERT INTO af_episode
      (batch_id, episode_id, title, content, content_hash, language, voice_override,
       hints_json, notes, metadata_json, state, excluded, issues_json, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (const e of result.episodes) {
      // An episode that failed validation is stored EXCLUDED rather than dropped, so the UI
      // can show what was wrong and the operator can fix or deliberately skip it.
      ins.run(id, e.id || `invalid-${e.index}`, e.title, e.content, e.contentHash ?? '', e.language,
        e.voiceId, JSON.stringify(e.pronunciationHints), e.notes, JSON.stringify(e.metadata),
        e.valid ? EPISODE_STATE.SCRIPT_IMPORTED : EPISODE_STATE.EXCLUDED,
        e.valid ? 0 : 1, JSON.stringify(e.issues), now(), now());
    }
  })();

  return { batchId: id, ...result };
}

export function listBatches() {
  return db().prepare(`
    SELECT b.batch_id, b.stage, b.created_at, b.updated_at, b.voice_lock_json,
           COUNT(e.id) AS episodes,
           SUM(CASE WHEN e.excluded = 1 THEN 1 ELSE 0 END) AS excluded
    FROM af_batch b LEFT JOIN af_episode e ON e.batch_id = b.batch_id
    GROUP BY b.batch_id ORDER BY b.created_at DESC`).all()
    .map((r) => ({ ...r, voiceLock: r.voice_lock_json ? JSON.parse(r.voice_lock_json) : null }));
}

export function getBatch(batchId) {
  const d = db();
  const b = d.prepare('SELECT * FROM af_batch WHERE batch_id = ?').get(batchId);
  if (!b) throw Object.assign(new Error(`No batch "${batchId}".`), { code: 'NOT_FOUND' });

  const episodes = d.prepare('SELECT * FROM af_episode WHERE batch_id = ? ORDER BY id').all(batchId)
    .map((e) => ({
      ...e,
      hints: JSON.parse(e.hints_json ?? '[]'),
      issues: JSON.parse(e.issues_json ?? '[]'),
      metadata: JSON.parse(e.metadata_json ?? '{}'),
      takes: d.prepare('SELECT * FROM af_take WHERE batch_id = ? AND episode_id = ? ORDER BY label')
        .all(batchId, e.episode_id)
        .map((t) => ({
          ...t,
          settings: t.settings_json ? JSON.parse(t.settings_json) : null,
          analysis: t.analysis_json ? JSON.parse(t.analysis_json) : null,
          gates: t.gate_json ? JSON.parse(t.gate_json) : null,
        })),
    }));

  const defaults = JSON.parse(b.defaults_json);
  const included = episodes.filter((e) => !e.excluded);

  return {
    batchId: b.batch_id,
    stage: b.stage,
    defaults,
    voiceLock: b.voice_lock_json ? JSON.parse(b.voice_lock_json) : null,
    voiceLockedAt: b.voice_locked_at,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    episodes,
    progress: progressOf(episodes),
    advance: canAdvance(b.stage, episodes),
    counts: {
      total: episodes.length,
      included: included.length,
      excluded: episodes.length - included.length,
      characters: included.reduce((n, e) => n + e.content.length, 0),
    },
  };
}

/** Per-stage completion, for the batch screen. */
function progressOf(episodes) {
  const inc = episodes.filter((e) => !e.excluded);
  const done = (pred) => inc.filter(pred).length;
  const SATISFIED = {
    TTS: [EPISODE_STATE.TTS_COMPLETE, EPISODE_STATE.VOICE_SELECTED, EPISODE_STATE.VOICE_PROCESSED,
      EPISODE_STATE.STT_COMPLETE, EPISODE_STATE.ALIGNMENT_COMPLETE, EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
    SELECTED: [EPISODE_STATE.VOICE_SELECTED, EPISODE_STATE.VOICE_PROCESSED, EPISODE_STATE.STT_COMPLETE,
      EPISODE_STATE.ALIGNMENT_COMPLETE, EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
    PROCESSED: [EPISODE_STATE.VOICE_PROCESSED, EPISODE_STATE.STT_COMPLETE, EPISODE_STATE.ALIGNMENT_COMPLETE,
      EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
    STT: [EPISODE_STATE.STT_COMPLETE, EPISODE_STATE.ALIGNMENT_COMPLETE, EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
    ALIGNED: [EPISODE_STATE.ALIGNMENT_COMPLETE, EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
    SRT: [EPISODE_STATE.SRT_VALIDATED, EPISODE_STATE.AUDIO_READY],
  };
  const takes = episodes.flatMap((e) => e.takes ?? []);
  return {
    total: inc.length,
    takesExpected: inc.length * (BATCH_DEFAULTS.takesPerScript),
    takesDone: takes.filter((t) => t.state === 'OK').length,
    takesCached: takes.filter((t) => t.cache_hit).length,
    takesFailed: takes.filter((t) => t.state === 'FAILED').length,
    tts: done((e) => SATISFIED.TTS.includes(e.state)),
    selected: done((e) => SATISFIED.SELECTED.includes(e.state)),
    processed: done((e) => SATISFIED.PROCESSED.includes(e.state)),
    stt: done((e) => SATISFIED.STT.includes(e.state)),
    aligned: done((e) => SATISFIED.ALIGNED.includes(e.state)),
    srt: done((e) => SATISFIED.SRT.includes(e.state)),
    regenRequired: done((e) => e.state === EPISODE_STATE.VOICE_REGEN_REQUIRED),
    sttReview: done((e) => e.state === EPISODE_STATE.STT_REVIEW_REQUIRED),
  };
}

/* ============================================================== preflight */

/**
 * Everything that must be true before spending a credit.
 *
 * Two questions this answers that a naive "just start generating" does not: is the canonical
 * voice actually reachable, and will the batch fit in the remaining allowance. Discovering the
 * second one at episode 60 leaves a half-generated batch and a spent balance.
 */
export async function preflight(batchId, { modelPreference = 'quality' } = {}) {
  const batch = getBatch(batchId);
  const included = batch.episodes.filter((e) => !e.excluded);
  const voiceId = batch.defaults.voiceId ?? BATCH_DEFAULTS.voiceId;

  const [subscription, models] = await Promise.all([getSubscription(), listModels()]);

  /*
   * The canonical voice is verified, never assumed and never substituted. If it cannot be
   * reached the batch stops with DEFAULT VOICE UNAVAILABLE -- quietly generating a hundred
   * episodes in some other voice would be far worse than not generating them.
   */
  let voice = null;
  let voiceSettings = null;
  let voiceError = null;
  try {
    voice = await getVoice(voiceId);
    voiceSettings = await getVoiceSettings(voiceId);
  } catch (e) {
    voiceError = { code: e.code ?? 'ELEVENLABS_VOICE_NOT_FOUND', message: e.message };
  }

  const model = chooseModel({ models, voice, preference: modelPreference });

  const takes = BATCH_DEFAULTS.takesPerScript;
  const characters = included.reduce((n, e) => n + e.content.length, 0);
  const projected = characters * takes;

  // Anything already generated under the same key costs nothing to reuse.
  const cached = db().prepare(
    'SELECT COUNT(*) n FROM af_take WHERE batch_id = ? AND state = ?').get(batchId, 'OK').n;
  const plannedCalls = Math.max(0, included.length * takes - cached);
  const projectedNew = Math.round(projected * (plannedCalls / Math.max(1, included.length * takes)));

  const remaining = subscription.charactersRemaining;
  const sufficient = remaining === null || projectedNew <= remaining;

  return {
    batchId,
    account: {
      tier: subscription.tier,
      status: subscription.status,
      used: subscription.characterCount,
      limit: subscription.characterLimit,
      remaining,
      resetsAt: subscription.nextResetIso,
      concurrencyHint: subscription.concurrencyHint,
    },
    voice: voice ? {
      voiceId: voice.voiceId, name: voice.name, category: voice.category,
      labels: voice.labels, verifiedLanguages: voice.verifiedLanguages,
      highQualityModelIds: voice.highQualityModelIds, settings: voiceSettings,
      isChannelDefault: voice.voiceId === BATCH_DEFAULTS.voiceId,
    } : null,
    voiceError,
    model,
    plan: {
      episodes: included.length,
      takesPerScript: takes,
      plannedTakes: included.length * takes,
      alreadyCached: cached,
      newCalls: plannedCalls,
      totalCharacters: characters,
      projectedCharacters: projectedNew,
      // A rough narration length, from a typical explainer speaking rate. Labelled as an
      // estimate because it is one -- the real duration comes from the audio.
      estimatedNarrationMinutes: Math.round((characters / 5 / 155) * 10) / 10,
    },
    credit: {
      sufficient,
      shortfall: sufficient ? 0 : projectedNew - (remaining ?? 0),
      canExtend: subscription.canExtend,
    },
    ready: Boolean(voice) && Boolean(model.chosen) && sufficient,
    blockers: [
      voiceError ? 'DEFAULT VOICE UNAVAILABLE' : null,
      model.chosen ? null : 'NO COMPATIBLE MODEL',
      sufficient ? null : 'INSUFFICIENT CHARACTER ALLOWANCE',
    ].filter(Boolean),
  };
}

/**
 * Pick one model for the whole batch.
 *
 * Quality first, because this is offline batch production: latency is irrelevant and delivery
 * consistency across a hundred episodes is not. Flash exists as an explicit choice, never as a
 * default reached by accident. Whatever is chosen is FROZEN for the batch -- episode 1 in v3
 * and episode 2 in multilingual would make the channel sound like two narrators.
 */
export function chooseModel({ models, voice, preference = 'quality' }) {
  const available = new Set(models.filter((m) => m.canDoTextToSpeech).map((m) => m.modelId));
  const voiceOk = (id) => !voice?.highQualityModelIds?.length || voice.highQualityModelIds.includes(id);

  const order = preference === 'fast'
    ? ['eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2']
    : ['eleven_v3', 'eleven_multilingual_v2', 'eleven_turbo_v2_5'];

  const chosen = order.find((id) => available.has(id) && voiceOk(id))
    ?? order.find((id) => available.has(id))
    ?? null;

  const preferred = order[0];
  return {
    chosen,
    preferred,
    // Surfaced explicitly rather than applied silently, so a fallback is a visible decision.
    isFallback: Boolean(chosen && chosen !== preferred),
    reason: !chosen ? 'No text-to-speech model is available to this account.'
      : chosen === preferred ? `${chosen} is available for this voice and account.`
        : `${preferred} is not available for this voice or account; using ${chosen}.`,
    available: [...available],
    strategy: preference,
  };
}

/* ============================================================ voice lock */

/**
 * Freeze the generation configuration.
 *
 * Once TTS starts, a dropdown change must not alter half a batch. Everything that affects the
 * audio is snapshotted here, and the cache key is built from the snapshot rather than from
 * whatever the UI currently shows.
 */
export async function lockVoice(batchId, { voiceId, modelId, outputFormat, preference } = {}) {
  const batch = getBatch(batchId);
  const pre = await preflight(batchId, { modelPreference: preference ?? batch.defaults.modelStrategy });
  const useVoice = voiceId ?? batch.defaults.voiceId ?? BATCH_DEFAULTS.voiceId;

  if (!voiceId && pre.voiceError) {
    throw new ElevenLabsError(EL_ERROR.VOICE_NOT_FOUND, { detail: `DEFAULT VOICE UNAVAILABLE: ${pre.voiceError.message}` });
  }

  const voice = useVoice === pre.voice?.voiceId ? pre.voice : await getVoice(useVoice);
  const settings = useVoice === pre.voice?.voiceId ? pre.voice.settings : await getVoiceSettings(useVoice);
  const model = modelId ?? pre.model.chosen;
  if (!model) throw new ElevenLabsError(EL_ERROR.MODEL_UNAVAILABLE, { detail: pre.model.reason });

  const lock = {
    voiceId: useVoice,
    voiceName: voice.name,
    modelId: model,
    modelWasFallback: pre.model.isFallback,
    modelReason: pre.model.reason,
    settingsSnapshot: settings,
    outputFormat: outputFormat ?? batch.defaults.outputFormat ?? BATCH_DEFAULTS.outputFormat,
    generationConfigVersion: 1,
    lockedAt: now(),
  };

  db().prepare('UPDATE af_batch SET voice_lock_json = ?, voice_locked_at = ?, stage = ?, updated_at = ? WHERE batch_id = ?')
    .run(JSON.stringify(lock), now(), BATCH_STAGE.TTS_GENERATION, now(), batchId);

  return lock;
}

/* ============================================================ stage: TTS */

/** Generate both takes for every included episode. Parallel inside, barrier outside. */
export async function runTtsStage(batchId, { concurrency, onProgress } = {}) {
  const batch = getBatch(batchId);
  if (!batch.voiceLock) throw Object.assign(new Error('Lock the voice before generating.'), { code: 'VOICE_NOT_LOCKED' });
  const lock = batch.voiceLock;
  const d = db();

  const included = batch.episodes.filter((e) => !e.excluded
    && ![EPISODE_STATE.TTS_COMPLETE, EPISODE_STATE.VOICE_SELECTED, EPISODE_STATE.VOICE_PROCESSED].includes(e.state));

  // One unit of work per TAKE, so all two hundred are scheduled together rather than in
  // episode-shaped pairs that would idle the pool at the end of each one.
  const jobs = included.flatMap((e) => TAKE_LABELS.map((label) => ({ episode: e, label })));

  const findCached = (key) => d.prepare("SELECT * FROM af_take WHERE cache_key = ? AND state = 'OK'").get(key);
  const record = (episode, take, state, error) => {
    d.prepare(`INSERT INTO af_take
      (batch_id, episode_id, label, cache_key, voice_id, model_id, seed, output_format,
       settings_json, audio_path, audio_hash, bytes, duration_s, request_id, characters_used,
       cache_hit, state, error_code, error_message, created_at, updated_at)
      VALUES (@batchId,@episodeId,@label,@cacheKey,@voiceId,@modelId,@seed,@outputFormat,
              @settings,@audioPath,@audioHash,@bytes,@durationS,@requestId,@charactersUsed,
              @cacheHit,@state,@errorCode,@errorMessage,@at,@at)
      ON CONFLICT(cache_key) DO UPDATE SET
        state=excluded.state, audio_path=excluded.audio_path, audio_hash=excluded.audio_hash,
        duration_s=excluded.duration_s, updated_at=excluded.updated_at`)
      .run({
        batchId, episodeId: episode.episode_id, label: take?.label ?? '?',
        cacheKey: take?.cacheKey ?? `failed:${episode.episode_id}:${take?.label ?? '?'}:${Date.now()}`,
        voiceId: lock.voiceId, modelId: lock.modelId, seed: take?.seed ?? null,
        outputFormat: lock.outputFormat, settings: JSON.stringify(take?.settings ?? null),
        audioPath: take?.audioPath ?? null, audioHash: take?.audioHash ?? null,
        bytes: take?.bytes ?? null, durationS: take?.durationS ?? null,
        requestId: take?.requestId ?? null, charactersUsed: take?.charactersUsed ?? null,
        cacheHit: take?.cacheHit ? 1 : 0, state,
        errorCode: error?.code ?? null, errorMessage: error?.message?.slice(0, 300) ?? null,
        at: now(),
      });
  };

  const { stats } = await runPool(jobs, async ({ episode, label }) => {
    const ep = {
      id: episode.episode_id, content: episode.content, contentHash: episode.content_hash,
    };
    try {
      const take = await generateTake({
        batchId, episode: ep, label,
        voiceId: episode.voice_override ?? lock.voiceId,
        modelId: lock.modelId,
        voiceSettings: lock.settingsSnapshot,
        outputFormat: lock.outputFormat,
        languageCode: episode.language,
        cacheDir: takeDir(batchId, episode.episode_id),
        findCached,
      });
      record(episode, take, 'OK', null);
      return take;
    } catch (e) {
      record(episode, { label }, 'FAILED', e);
      throw e;
    }
  }, { concurrency: concurrency ?? 3, onProgress });

  // An episode is TTS_COMPLETE only when BOTH its takes exist.
  for (const e of included) {
    const ok = d.prepare("SELECT COUNT(*) n FROM af_take WHERE batch_id=? AND episode_id=? AND state='OK'")
      .get(batchId, e.episode_id).n;
    d.prepare('UPDATE af_episode SET state = ?, updated_at = ? WHERE batch_id = ? AND episode_id = ?')
      .run(ok >= TAKE_LABELS.length ? EPISODE_STATE.TTS_COMPLETE : EPISODE_STATE.TTS_FAILED,
        now(), batchId, e.episode_id);
  }

  return { stats, ...getBatch(batchId).progress };
}

/* =================================================== stage: voice review */

/** Measure both takes for every episode and choose a winner. */
export function runReviewStage(batchId) {
  const batch = getBatch(batchId);
  const d = db();
  const out = [];

  for (const e of batch.episodes.filter((x) => !x.excluded)) {
    const takes = e.takes.filter((t) => t.state === 'OK' && t.audio_path && existsSync(t.audio_path));
    if (takes.length < 2) {
      d.prepare('UPDATE af_episode SET state=?, updated_at=? WHERE batch_id=? AND episode_id=?')
        .run(EPISODE_STATE.VOICE_REGEN_REQUIRED, now(), batchId, e.episode_id);
      out.push({ episodeId: e.episode_id, outcome: 'VOICE_REGEN_REQUIRED', reason: 'Fewer than two usable takes.' });
      continue;
    }

    const wordCount = e.content.split(/\s+/).filter(Boolean).length;
    const expected = wordCount / 2.6;   // a plausible explainer rate, for the truncation gate

    const evaluated = takes.map((t) => {
      const analysis = t.analysis ?? analyseAudio(t.audio_path);
      const other = takes.find((x) => x.id !== t.id);
      const gates = runGates(analysis, {
        expectedDurationS: expected, audioHash: t.audio_hash, otherAudioHash: other?.audio_hash,
      });
      const score = analysis.ok ? scoreDelivery(analysis, { wordCount }) : { total: 0, parts: {} };
      d.prepare('UPDATE af_take SET analysis_json=?, gate_json=?, score=?, updated_at=? WHERE id=?')
        .run(JSON.stringify(analysis), JSON.stringify(gates), score.total, now(), t.id);
      return { ...t, analysis, gates, score };
    });

    const a = evaluated.find((t) => t.label === 'A') ?? evaluated[0];
    const b = evaluated.find((t) => t.label === 'B') ?? evaluated[1];
    const decision = selectTake(a, b);

    d.prepare(`UPDATE af_episode SET state=?, winning_take=?, selection_method=?, selection_reason=?,
               selection_score=?, selected_at=?, updated_at=? WHERE batch_id=? AND episode_id=?`)
      .run(decision.outcome === 'VOICE_SELECTED' ? EPISODE_STATE.VOICE_SELECTED : EPISODE_STATE.VOICE_REGEN_REQUIRED,
        decision.winner, decision.method, decision.reason, decision.score ?? null,
        now(), now(), batchId, e.episode_id);

    out.push({ episodeId: e.episode_id, ...decision });
  }
  return out;
}

/** A human disagreeing with the measurement. Recorded as such, and it invalidates downstream. */
export function overrideWinner(batchId, episodeId, label, reason = 'Chosen by a human after listening.') {
  const d = db();
  const e = d.prepare('SELECT * FROM af_episode WHERE batch_id=? AND episode_id=?').get(batchId, episodeId);
  if (!e) throw Object.assign(new Error('No such episode.'), { code: 'NOT_FOUND' });

  /*
   * Changing the winner invalidates everything derived from the old one -- the processed
   * narration, the transcript, the alignment and the subtitles were all produced from a
   * different performance and are now describing audio nobody will hear.
   */
  const changed = e.winning_take !== label;
  d.prepare(`UPDATE af_episode SET winning_take=?, selection_method='HUMAN', selection_reason=?,
             selected_at=?, state=?, processed_audio=CASE WHEN ? THEN NULL ELSE processed_audio END,
             stt_path=CASE WHEN ? THEN NULL ELSE stt_path END,
             alignment_path=CASE WHEN ? THEN NULL ELSE alignment_path END,
             srt_path=CASE WHEN ? THEN NULL ELSE srt_path END, updated_at=?
             WHERE batch_id=? AND episode_id=?`)
    .run(label, reason, now(), EPISODE_STATE.VOICE_SELECTED,
      changed ? 1 : 0, changed ? 1 : 0, changed ? 1 : 0, changed ? 1 : 0, now(), batchId, episodeId);

  return { episodeId, winner: label, method: 'HUMAN', invalidatedDownstream: changed };
}

/* =============================================== stage: voice processing */

/**
 * Run the winner through the EXISTING conditioning chain.
 *
 * `process-voiceover.mjs` is untouched and authoritative: it removes silence, shortens pauses,
 * applies the pitch-preserving tempo change, normalises loudness and emits the time map that
 * every downstream timestamp is expressed against. The audio factory's only contribution is
 * choosing which file goes in.
 */
export function runProcessingStage(batchId, { slugOf = (e) => e.episode_id } = {}) {
  const batch = getBatch(batchId);
  const d = db();
  const results = [];

  for (const e of batch.episodes.filter((x) => !x.excluded && x.winning_take)) {
    const take = e.takes.find((t) => t.label === e.winning_take && t.state === 'OK');
    if (!take?.audio_path || !existsSync(take.audio_path)) {
      results.push({ episodeId: e.episode_id, ok: false, error: 'winning take file is missing' });
      continue;
    }

    const slug = slugOf(e);
    const wav = join(ROOT, 'public', 'audio', `${slug}.wav`);
    const timemap = `${wav.replace(/\.wav$/, '')}.timemap.json`;
    mkdirSync(dirname(wav), { recursive: true });

    try {
      const tempo = batch.defaults.tempo ?? 1.12;
      execFileSync(process.execPath, [
        join(ROOT, 'tools', 'process-voiceover.mjs'), take.audio_path, wav, '--tempo', String(tempo),
      ], { stdio: 'pipe', timeout: 300_000 });

      const duration = probeDuration(wav);
      d.prepare('UPDATE af_episode SET state=?, processed_audio=?, timemap_path=?, updated_at=? WHERE batch_id=? AND episode_id=?')
        .run(EPISODE_STATE.VOICE_PROCESSED, wav, timemap, now(), batchId, e.episode_id);
      results.push({ episodeId: e.episode_id, ok: true, wav, timemap, durationS: duration, rawDurationS: take.duration_s });
    } catch (err) {
      results.push({ episodeId: e.episode_id, ok: false, error: String(err.message).slice(0, 200) });
    }
  }
  return results;
}

/* ============================================================ stage: STT */

/** Transcribe the PROCESSED narration -- what a listener will actually hear. */
export async function runSttStage(batchId, { concurrency = 2, allowKeytermRetry = true } = {}) {
  const batch = getBatch(batchId);
  const d = db();
  const targets = batch.episodes.filter((e) => !e.excluded && e.processed_audio && existsSync(e.processed_audio));

  const { results } = await runPool(targets, async (e) => {
    const audio = readFileSync(e.processed_audio);
    const terms = criticalTermsOf(e.content, e.hints);

    // First pass with no hints: an independent witness, not a confirmation.
    let stt = await speechToText({ audio, filename: `${e.episode_id}.wav`, languageCode: 'eng' });
    let comparison = compareTranscript(e.content, stt.text, { criticalTerms: terms });
    let keytermRetry = false;

    /*
     * Only if a term the script actually cares about came back wrong is a second, biased pass
     * worth its extra cost -- and the keyterms sent are the handful that failed, not the whole
     * vocabulary.
     */
    if (allowKeytermRetry && !comparison.ok && comparison.suggestedKeyterms.length) {
      keytermRetry = true;
      stt = await speechToText({
        audio, filename: `${e.episode_id}.wav`, languageCode: 'eng',
        keyterms: comparison.suggestedKeyterms,
      });
      comparison = compareTranscript(e.content, stt.text, { criticalTerms: terms });
    }

    const path = join(takeDir(batchId, e.episode_id), 'stt.json');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ ...stt, comparison, keytermRetry }, null, 2)}\n`);

    d.prepare('UPDATE af_episode SET state=?, stt_path=?, issues_json=?, updated_at=? WHERE batch_id=? AND episode_id=?')
      .run(comparison.ok ? EPISODE_STATE.STT_COMPLETE : EPISODE_STATE.STT_REVIEW_REQUIRED,
        path, JSON.stringify(comparison.issues), now(), batchId, e.episode_id);

    return { episodeId: e.episode_id, ok: comparison.ok, wer: comparison.wer, issues: comparison.issues, keytermRetry };
  }, { concurrency });

  return results.map((r) => (r.ok ? r.value : { ok: false, error: r.error?.code ?? 'failed' }));
}

/* ====================================== stage: alignment + subtitles */

/**
 * Locate the KNOWN words in the processed audio, then build subtitles from them.
 *
 * Alignment and subtitle building are one stage because the fallback chain spans both: if
 * alignment fails, the subtitles are built from transcript timing instead, and which route was
 * taken is recorded on the episode so a later reader can tell an aligned subtitle from an
 * estimated one.
 */
export async function runAlignmentStage(batchId, { concurrency = 2, slugOf = (e) => e.episode_id } = {}) {
  const batch = getBatch(batchId);
  const d = db();
  const targets = batch.episodes.filter((e) => !e.excluded && e.processed_audio && existsSync(e.processed_audio));

  const { results } = await runPool(targets, async (e) => {
    const audio = readFileSync(e.processed_audio);
    const slug = slugOf(e);

    let alignment = null;
    let alignmentError = null;
    try {
      alignment = await forcedAlignment({ audio, filename: `${slug}.wav`, text: e.content });
    } catch (err) {
      // One failed alignment must not stop the factory; the fallback chain handles it.
      alignmentError = { code: err.code ?? 'ELEVENLABS_ALIGNMENT_FAILED', message: err.message };
    }

    const transcript = e.stt_path && existsSync(e.stt_path) ? JSON.parse(readFileSync(e.stt_path, 'utf8')) : null;
    const durationS = probeDuration(e.processed_audio);
    const built = buildSubtitles({
      canonicalText: e.content, alignment, transcript, audioDurationS: durationS,
    });

    const dir = join(ROOT, 'episodes', slug);
    mkdirSync(dir, { recursive: true });

    /*
     * Written in ElevenLabs' own alignment shape at exactly the path the existing pipeline
     * reads. `remap-timing.mjs` cannot tell this from a hand-exported file, which is the whole
     * handoff.
     */
    if (built.cues.length) {
      const words = alignment?.words ?? [];
      writeFileSync(join(dir, 'subtitles-raw.json'), `${JSON.stringify({
        language_code: 'en',
        note: 'Word alignment produced by the audio factory against the PROCESSED narration.',
        source: built.method,
        segments: built.cues.map((c) => ({
          text: c.text, start_time: c.start, end_time: c.end, speaker: 'narrator',
          words: (words.length ? words : []).filter((w) => w.start >= c.start - 1e-6 && w.end <= c.end + 1e-6)
            .map((w) => ({ text: w.text, start_time: w.start, end_time: w.end })),
        })),
      }, null, 2)}\n`);
      writeFileSync(join(dir, 'subtitles.srt'), built.srt);
    }

    const alignPath = join(takeDir(batchId, e.episode_id), 'alignment.json');
    writeFileSync(alignPath, `${JSON.stringify({ alignment, alignmentError, method: built.method, validation: built.validation }, null, 2)}\n`);

    const ok = built.validation.ok;
    d.prepare(`UPDATE af_episode SET state=?, alignment_path=?, alignment_method=?, srt_path=?, updated_at=?
               WHERE batch_id=? AND episode_id=?`)
      .run(ok ? EPISODE_STATE.SRT_VALIDATED : EPISODE_STATE.FAILED, alignPath, built.method,
        ok ? join(dir, 'subtitles.srt') : null, now(), batchId, e.episode_id);

    return {
      episodeId: e.episode_id, ok, method: built.method, cues: built.cues.length,
      alignmentLoss: built.alignmentLoss, unmatchedWords: built.unmatchedWords,
      validation: built.validation, alignmentError,
    };
  }, { concurrency });

  return results.map((r) => (r.ok ? r.value : { ok: false, error: r.error?.code ?? 'failed' }));
}

/* ============================================================== advance */

/** Move the batch on, but only if every included episode has finished the current stage. */
export function advanceStage(batchId) {
  const batch = getBatch(batchId);
  const check = canAdvance(batch.stage, batch.episodes);
  if (!check.ok) return { ok: false, stage: batch.stage, ...check };

  const next = nextStage(batch.stage);
  if (!next) return { ok: false, stage: batch.stage, reason: 'Already at the final stage.' };

  db().prepare('UPDATE af_batch SET stage=?, updated_at=? WHERE batch_id=?').run(next, now(), batchId);

  // Reaching AUDIO_READY writes the manifest the existing pipeline consumes.
  if (next === BATCH_STAGE.AUDIO_READY) writeHandoffManifest(batchId);

  return { ok: true, from: batch.stage, to: next };
}

/**
 * The handoff.
 *
 * Same shape `tools/build-batch.mjs` emitted from hand-exported files, written to the same
 * place, so every existing tool downstream works unchanged.
 */
export function writeHandoffManifest(batchId, { slugOf = (e) => e.episode_id } = {}) {
  const batch = getBatch(batchId);
  const episodes = batch.episodes.filter((e) => !e.excluded && e.processed_audio);

  const manifest = {
    note: 'Produced by the audio factory. Same shape as tools/build-batch.mjs so the existing pipeline is unchanged.',
    batch: batchId,
    source: 'audio-factory',
    count: episodes.length,
    episodes: episodes.map((e, i) => {
      const slug = slugOf(e);
      return {
        n: i + 1,
        slug,
        title: e.title,
        stamp: e.selected_at,
        audio: e.processed_audio,
        subtitle: join(ROOT, 'episodes', slug, 'subtitles.srt'),
        rawDuration: e.takes.find((t) => t.label === e.winning_take)?.duration_s ?? null,
        words: e.content.split(/\s+/).filter(Boolean).length,
        transcript: e.content,
      };
    }),
  };

  const out = join(ROOT, 'data', `${batchId}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  return { path: out, episodes: manifest.count };
}

/* ============================================================== episode ops */

export function excludeEpisode(batchId, episodeId, excluded = true) {
  db().prepare('UPDATE af_episode SET excluded=?, state=?, updated_at=? WHERE batch_id=? AND episode_id=?')
    .run(excluded ? 1 : 0, excluded ? EPISODE_STATE.EXCLUDED : EPISODE_STATE.SCRIPT_IMPORTED,
      now(), batchId, episodeId);
  return getBatch(batchId).progress;
}

/** Export the batch back to the canonical JSON it could have been imported from. */
export function exportBatch(batchId) {
  const b = getBatch(batchId);
  return toCanonicalJson(b.batchId, b.defaults, b.episodes.map((e) => ({
    id: e.episode_id, title: e.title, content: e.content, language: e.language,
    voiceId: e.voice_override, pronunciationHints: e.hints, notes: e.notes, metadata: e.metadata,
  })));
}

/** Delete rejected takes once the winner has made it all the way through. */
export function cleanupRejectedTakes(batchId) {
  const batch = getBatch(batchId);
  let removed = 0;
  let bytes = 0;
  for (const e of batch.episodes) {
    // Only safe once the winner has produced a validated subtitle -- before that, a rejected
    // take is the fallback if the winner turns out to be unusable.
    if (e.state !== EPISODE_STATE.SRT_VALIDATED && e.state !== EPISODE_STATE.AUDIO_READY) continue;
    for (const t of e.takes) {
      if (t.label === e.winning_take || !t.audio_path || !existsSync(t.audio_path)) continue;
      bytes += t.bytes ?? 0;
      rmSync(t.audio_path, { force: true });
      db().prepare("UPDATE af_take SET audio_path=NULL, state='CLEANED', updated_at=? WHERE id=?").run(now(), t.id);
      removed++;
    }
  }
  return { removed, bytesFreed: bytes };
}

export { listVoices, getVoice, getSubscription, listModels };
