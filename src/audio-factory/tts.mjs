/**
 * tts.mjs — generate exactly two takes per script, and never pay for the same audio twice.
 *
 * THE CACHE KEY IS THE IMPORTANT PART OF THIS FILE. Every input that can change the audio is
 * hashed into it: the narration, the voice, the model, the settings snapshot, the seed, the
 * output format and a generator version. If that key has produced audio before, the file is
 * reused and no request is made. Re-running a hundred-script batch after a crash then costs
 * nothing rather than a second full bill.
 *
 * The generator version exists because a change in how WE build the request -- a different
 * normalisation setting, a different default -- must invalidate the cache even though the
 * script did not change. Without it, a bug fix silently keeps serving audio made by the bug.
 *
 * TWO TAKES, NOT FIVE. Two genuine performances of the same words is the cost/quality
 * compromise for a batch that might be a hundred scripts. Brute-forcing ten and picking the
 * best would cost five times as much for a marginally better delivery.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { textToSpeech, ElevenLabsError, EL_ERROR } from './elevenlabs/client.mjs';
import { narrationTextOf } from './intake.mjs';
import { probeDuration } from '../../tools/ffbin.mjs';

/**
 * Bump when anything about how a request is BUILT changes.
 * The cache is keyed on it, so old audio stops being reused when the recipe changes.
 */
export const GENERATOR_VERSION = 1;

export const TAKE_LABELS = ['A', 'B'];

/**
 * A stable 32-bit seed from the batch, episode and take label.
 *
 * Deterministic so a rerun reproduces the same two performances rather than rolling fresh
 * ones -- which would make the cache useless and the review non-reproducible. Take A and
 * take B differ only in this number: same words, same voice, same model, same settings.
 */
export function seedFor(batchId, episodeId, label) {
  const h = createHash('sha256').update(`${batchId}:${episodeId}:${label}`).digest();
  // ElevenLabs accepts 0 .. 4294967295.
  return h.readUInt32BE(0);
}

/** Everything that can change the audio, hashed. */
export function cacheKeyFor({
  contentHash, voiceId, modelId, settings, seed, outputFormat, languageCode,
}) {
  const material = JSON.stringify({
    contentHash, voiceId, modelId, seed, outputFormat, languageCode,
    // Settings are ordered explicitly: JSON key order would otherwise make the key unstable.
    settings: settings ? {
      stability: settings.stability ?? null,
      similarity_boost: settings.similarity_boost ?? null,
      style: settings.style ?? null,
      use_speaker_boost: settings.use_speaker_boost ?? null,
      speed: settings.speed ?? null,
    } : null,
    generator: GENERATOR_VERSION,
  });
  return createHash('sha256').update(material).digest('hex');
}

/**
 * The settings sent with each request.
 *
 * SPEED IS ALWAYS 1.0. The existing `process-voiceover.mjs` owns pacing -- it removes silence,
 * shortens pauses and applies a pitch-preserving tempo change, then emits the time map every
 * downstream timestamp depends on. Asking ElevenLabs to speed up as well would compound the
 * two and make the master clock a function of both, for no gain.
 *
 * Style is left at the voice's own baseline rather than exaggerated. A narrator who is
 * performing harder is not the same as one who is performing better, and across a hundred
 * episodes the exaggeration is what makes a channel sound synthetic.
 */
export function requestSettingsFrom(voiceSettings, overrides = {}) {
  return {
    stability: overrides.stability ?? voiceSettings?.stability ?? 0.5,
    similarity_boost: overrides.similarityBoost ?? voiceSettings?.similarityBoost ?? 0.75,
    style: overrides.style ?? voiceSettings?.style ?? 0,
    use_speaker_boost: overrides.useSpeakerBoost ?? voiceSettings?.useSpeakerBoost ?? true,
    speed: 1.0,
  };
}

const extensionFor = (fmt) => (fmt.startsWith('mp3') ? 'mp3' : fmt.startsWith('pcm') ? 'pcm' : fmt.startsWith('ulaw') ? 'ulaw' : 'wav');

/**
 * Generate (or reuse) one take.
 *
 * Returns `{ cacheHit }` so the UI can show honestly whether a run actually called the API --
 * a progress bar that says "generated" for a cache hit teaches the operator to distrust it.
 */
export async function generateTake({
  batchId, episode, label, voiceId, modelId, voiceSettings, outputFormat, cacheDir,
  languageCode, findCached, recordTake,
}) {
  const text = narrationTextOf(episode);
  const seed = seedFor(batchId, episode.id, label);
  const settings = requestSettingsFrom(voiceSettings);
  const key = cacheKeyFor({
    contentHash: episode.contentHash, voiceId, modelId, settings, seed, outputFormat, languageCode,
  });

  const cached = findCached?.(key);
  if (cached?.audio_path && existsSync(cached.audio_path)) {
    return {
      label, cacheKey: key, seed, cacheHit: true,
      audioPath: cached.audio_path, audioHash: cached.audio_hash,
      bytes: cached.bytes, durationS: cached.duration_s,
      modelId, voiceId, settings, requestId: cached.request_id ?? null, charactersUsed: 0,
    };
  }

  const result = await textToSpeech({
    voiceId, text, modelId, seed, outputFormat, voiceSettings: settings, languageCode,
  });

  const ext = extensionFor(outputFormat);
  const audioPath = join(cacheDir, `take-${label.toLowerCase()}.${ext}`);
  mkdirSync(dirname(audioPath), { recursive: true });
  writeFileSync(audioPath, result.audio);

  const audioHash = createHash('sha256').update(result.audio).digest('hex');
  let durationS = null;
  try { durationS = probeDuration(audioPath); } catch { durationS = null; }

  /*
   * The sidecar sits next to the audio so a take is self-describing on disk. Someone finding
   * `take-a.mp3` six months later can tell which voice, model, seed and script produced it
   * without the database.
   */
  const sidecar = {
    batchId, episodeId: episode.id, label,
    voiceId, modelId, seed, outputFormat, settings,
    languageCode: languageCode ?? null,
    contentHash: episode.contentHash,
    contentChars: text.length,
    audioHash, bytes: result.audio.length, durationS,
    requestId: result.requestId ?? null,
    charactersUsed: result.charactersUsed ?? null,
    generatorVersion: GENERATOR_VERSION,
    cacheKey: key,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(join(cacheDir, `take-${label.toLowerCase()}.json`), `${JSON.stringify(sidecar, null, 2)}\n`);

  const take = {
    label, cacheKey: key, seed, cacheHit: false,
    audioPath, audioHash, bytes: result.audio.length, durationS,
    modelId, voiceId, settings,
    requestId: result.requestId ?? null,
    charactersUsed: result.charactersUsed ?? text.length,
  };
  recordTake?.(take);
  return take;
}

/* ==================================================== concurrency + retry */

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/**
 * Exponential backoff with FULL jitter.
 *
 * Full jitter rather than a fixed ramp because every worker in the pool hits the same limit at
 * the same moment; without jitter they all retry together and hit it again in lockstep.
 */
const backoff = (attempt) => Math.floor(Math.random() * Math.min(30_000, 1000 * 2 ** attempt));

/**
 * Run tasks with a concurrency ceiling that SHRINKS when the account says so.
 *
 * The plan's documented limit is only a starting point. A 429 carrying
 * `concurrent_limit_exceeded` is the authority: the pool narrows, the task is retried, and the
 * batch continues rather than failing. `system_busy` is waited out rather than treated as an
 * error, because it is about ElevenLabs' load and not about this request.
 */
export async function runPool(items, worker, {
  concurrency = 3, maxRetries = 5, onProgress, minConcurrency = 1,
} = {}) {
  const results = new Array(items.length);
  let active = 0;
  let index = 0;
  let limit = Math.max(minConcurrency, concurrency);
  let completed = 0;

  const stats = { generated: 0, cached: 0, failed: 0, retries: 0, charactersUsed: 0, concurrencyFloor: limit };

  return new Promise((resolve) => {
    const pump = () => {
      if (completed === items.length) { resolve({ results, stats }); return; }
      while (active < limit && index < items.length) {
        const i = index++;
        active++;
        (async () => {
          let attempt = 0;
          for (;;) {
            try {
              const r = await worker(items[i], i);
              results[i] = { ok: true, value: r };
              if (r?.cacheHit) stats.cached++; else stats.generated++;
              stats.charactersUsed += r?.charactersUsed ?? 0;
              break;
            } catch (e) {
              const retriable = e instanceof ElevenLabsError ? e.retriable : false;
              if (e?.code === EL_ERROR.CONCURRENCY_LIMIT.code) {
                // The account is the authority on how many we may run at once.
                limit = Math.max(minConcurrency, limit - 1);
                stats.concurrencyFloor = Math.min(stats.concurrencyFloor, limit);
              }
              if (!retriable || attempt >= maxRetries) {
                results[i] = { ok: false, error: e };
                stats.failed++;
                break;
              }
              attempt++;
              stats.retries++;
              await sleep(backoff(attempt));
            }
          }
          active--;
          completed++;
          onProgress?.({ completed, total: items.length, active, limit, ...stats });
          pump();
        })();
      }
    };
    pump();
  });
}
