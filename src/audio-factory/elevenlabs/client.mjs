/**
 * client.mjs — the only place in this repository that talks to ElevenLabs.
 *
 * One adapter, so three things stay true:
 *
 *   1. THE KEY IS READ IN EXACTLY ONE FUNCTION. Scattering `fetch('https://api.elevenlabs.io')`
 *      through components means the key is read in a dozen places and eventually logged in one
 *      of them. Here the header is built in `headers()` and nothing else ever sees it.
 *   2. ERRORS ARE NORMALISED ONCE. Callers get a stable `{code, status, retriable}` and can act
 *      on it, rather than each one re-deriving whether a 429 is a rate limit or a concurrency
 *      limit from a message string.
 *   3. THE REQUEST SHAPES LIVE TOGETHER. When ElevenLabs changes an endpoint there is one file
 *      to read, not a search across the codebase.
 *
 * Endpoint shapes were checked against the current published API rather than written from
 * memory: TTS takes JSON, STT and forced alignment take multipart/form-data, and the
 * alignment response carries a per-word `loss` alongside a document-level one.
 */

import { loadKey } from './secret.mjs';

const BASE = 'https://api.elevenlabs.io';

/* ============================================================ error mapping */

/**
 * Local error codes. The UI shows these; it never shows a raw upstream body.
 *
 * The split that matters is `retriable`: a concurrency limit clears in seconds, insufficient
 * credit never does. Retrying the second one burns time and produces the same answer.
 */
export const EL_ERROR = {
  AUTH_REQUIRED: { code: 'ELEVENLABS_AUTH_REQUIRED', retriable: false, message: 'No ElevenLabs API key is configured.' },
  AUTH_INVALID: { code: 'ELEVENLABS_AUTH_INVALID', retriable: false, message: 'The ElevenLabs API key was rejected.' },
  VOICE_NOT_FOUND: { code: 'ELEVENLABS_VOICE_NOT_FOUND', retriable: false, message: 'That voice is not available to this account.' },
  MODEL_UNAVAILABLE: { code: 'ELEVENLABS_MODEL_UNAVAILABLE', retriable: false, message: 'That model is not available for this voice or account.' },
  INSUFFICIENT_CREDITS: { code: 'ELEVENLABS_INSUFFICIENT_CREDITS', retriable: false, message: 'Not enough character allowance remaining.' },
  CONCURRENCY_LIMIT: { code: 'ELEVENLABS_CONCURRENCY_LIMIT', retriable: true, message: 'Too many simultaneous requests for this plan.' },
  RATE_LIMIT: { code: 'ELEVENLABS_RATE_LIMIT', retriable: true, message: 'Rate limited.' },
  SYSTEM_BUSY: { code: 'ELEVENLABS_SYSTEM_BUSY', retriable: true, message: 'ElevenLabs is busy; the request can be retried.' },
  TTS_FAILED: { code: 'ELEVENLABS_TTS_FAILED', retriable: false, message: 'Speech generation failed.' },
  STT_FAILED: { code: 'ELEVENLABS_STT_FAILED', retriable: false, message: 'Transcription failed.' },
  ALIGNMENT_FAILED: { code: 'ELEVENLABS_ALIGNMENT_FAILED', retriable: false, message: 'Forced alignment failed.' },
  NETWORK: { code: 'ELEVENLABS_NETWORK', retriable: true, message: 'Could not reach ElevenLabs.' },
  UNKNOWN: { code: 'ELEVENLABS_UNKNOWN', retriable: false, message: 'Unexpected ElevenLabs response.' },
};

export class ElevenLabsError extends Error {
  constructor(spec, { status = null, detail = null, requestId = null } = {}) {
    super(spec.message);
    this.name = 'ElevenLabsError';
    this.code = spec.code;
    this.retriable = spec.retriable;
    this.status = status;
    /*
     * `detail` is upstream text, kept for the log and for a disclosure the operator opens
     * deliberately. It is never the primary UI copy: "unusual_activity_detected" explains
     * nothing to someone trying to publish a video.
     */
    this.detail = detail;
    this.requestId = requestId;
  }
}

/** Map an HTTP failure onto a local code. */
function classify(status, body, requestId) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const lower = raw.toLowerCase();
  const detail = raw.slice(0, 400);

  if (status === 401) return new ElevenLabsError(EL_ERROR.AUTH_INVALID, { status, detail, requestId });
  if (status === 404 && lower.includes('voice')) return new ElevenLabsError(EL_ERROR.VOICE_NOT_FOUND, { status, detail, requestId });
  if (status === 429) {
    // Two very different failures share a status code, and only one is worth backing off on
    // a per-request basis; the other means the whole pool should shrink.
    const spec = lower.includes('concurrent') ? EL_ERROR.CONCURRENCY_LIMIT : EL_ERROR.RATE_LIMIT;
    return new ElevenLabsError(spec, { status, detail, requestId });
  }
  if (status === 402 || lower.includes('quota') || lower.includes('insufficient')) {
    return new ElevenLabsError(EL_ERROR.INSUFFICIENT_CREDITS, { status, detail, requestId });
  }
  if (lower.includes('model') && (lower.includes('not found') || lower.includes('access'))) {
    return new ElevenLabsError(EL_ERROR.MODEL_UNAVAILABLE, { status, detail, requestId });
  }
  if (status === 503 || lower.includes('system_busy')) {
    return new ElevenLabsError(EL_ERROR.SYSTEM_BUSY, { status, detail, requestId });
  }
  if (status >= 500) return new ElevenLabsError(EL_ERROR.SYSTEM_BUSY, { status, detail, requestId });
  return new ElevenLabsError(EL_ERROR.UNKNOWN, { status, detail, requestId });
}

/* ================================================================ plumbing */

function headers(extra = {}) {
  const key = loadKey();
  if (!key) throw new ElevenLabsError(EL_ERROR.AUTH_REQUIRED);
  // The one place the key is attached to a request.
  return { 'xi-api-key': key, ...extra };
}

/**
 * Fields safe to log about a request. Deliberately omits every header.
 *
 * Logging `headers` "for debugging" is how an API key ends up in a log file that then ends up
 * in a bug report, so the shape here makes it awkward to do by accident.
 */
export const safeLogFields = (method, path, extra = {}) => ({
  api: 'elevenlabs', method, path: path.replace(/\/[A-Za-z0-9]{20,}/g, '/:id'), ...extra,
});

async function request(method, path, { json, form, accept = 'application/json', query } = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  let res;
  const started = Date.now();
  try {
    res = await fetch(url, {
      method,
      headers: headers({
        Accept: accept,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
      }),
      body: json ? JSON.stringify(json) : form,
    });
  } catch (e) {
    throw new ElevenLabsError(EL_ERROR.NETWORK, { detail: e.message });
  }

  const requestId = res.headers.get('x-request-id') ?? res.headers.get('request-id');
  if (!res.ok) {
    let body;
    try { body = await res.text(); } catch { body = null; }
    throw classify(res.status, body, requestId);
  }

  const durationMs = Date.now() - started;
  if (accept === 'application/json') {
    const data = await res.json();
    return { data, requestId, durationMs, headers: res.headers };
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, requestId, durationMs, headers: res.headers };
}

/* ================================================================= account */

/** Subscription and usage. Drives the credit preflight and concurrency ceiling. */
export async function getSubscription() {
  const { data } = await request('GET', '/v1/user/subscription');
  return {
    tier: data.tier ?? null,
    status: data.status ?? null,
    characterCount: data.character_count ?? null,
    characterLimit: data.character_limit ?? null,
    charactersRemaining: (data.character_limit ?? 0) - (data.character_count ?? 0),
    canExtend: Boolean(data.can_extend_character_limit),
    // Present only when the account is configured for overage; treated as opt-in, never assumed.
    extendedLimit: data.max_character_limit_extension ?? null,
    nextResetUnix: data.next_character_count_reset_unix ?? null,
    nextResetIso: data.next_character_count_reset_unix
      ? new Date(data.next_character_count_reset_unix * 1000).toISOString() : null,
    /*
     * Concurrency is not exposed as a number by the API. The plan name is, so the ceiling is
     * derived from published per-tier guidance and then treated as a HINT -- a 429 carrying
     * `concurrent_limit_exceeded` is the authority, and the pool shrinks on it.
     */
    concurrencyHint: CONCURRENCY_BY_TIER[String(data.tier ?? '').toLowerCase()] ?? 2,
  };
}

/** Published per-plan concurrency guidance, used only as a starting point. */
const CONCURRENCY_BY_TIER = {
  free: 2, starter: 3, creator: 5, pro: 10, scale: 15, business: 15, enterprise: 15,
};

export async function listModels() {
  const { data } = await request('GET', '/v1/models');
  return (data ?? []).map((m) => ({
    modelId: m.model_id,
    name: m.name ?? null,
    canDoTextToSpeech: Boolean(m.can_do_text_to_speech),
    canUseSpeakerBoost: Boolean(m.can_use_speaker_boost),
    canUseStyle: Boolean(m.can_use_style),
    languages: (m.languages ?? []).map((l) => l.language_id ?? l.iso_code).filter(Boolean),
    maxCharacters: m.max_characters_request_free_user ?? m.max_characters_request_subscribed_user ?? null,
  }));
}

/* ================================================================== voices */

/** One voice, with everything the selector shows and nothing it does not need. */
const shapeVoice = (v) => ({
  voiceId: v.voice_id,
  name: v.name ?? null,
  category: v.category ?? null,
  description: v.description ?? null,
  labels: v.labels ?? {},
  previewUrl: v.preview_url ?? null,
  verifiedLanguages: (v.verified_languages ?? []).map((l) => l.language ?? l.locale).filter(Boolean),
  // Which models this voice is actually usable with, where the API says so.
  highQualityModelIds: v.high_quality_base_model_ids ?? [],
  settings: v.settings ?? null,
});

export async function listVoices({ search, pageSize = 100 } = {}) {
  // v2 is the current listing endpoint; v1/voices is superseded.
  const { data } = await request('GET', '/v2/voices', {
    query: { page_size: pageSize, search: search || undefined },
  });
  return {
    voices: (data.voices ?? []).map(shapeVoice),
    hasMore: Boolean(data.has_more),
    total: data.total_count ?? (data.voices ?? []).length,
  };
}

export async function getVoice(voiceId) {
  const { data } = await request('GET', `/v1/voices/${encodeURIComponent(voiceId)}`);
  return shapeVoice(data);
}

/**
 * The voice's CURRENT settings, read so they can be snapshotted.
 *
 * Read only. This phase never PUTs settings back: those are global to the voice on the
 * ElevenLabs account, so writing them would silently change every other project using it.
 * Per-request `voice_settings` achieves the same thing without the side effect.
 */
export async function getVoiceSettings(voiceId) {
  const { data } = await request('GET', `/v1/voices/${encodeURIComponent(voiceId)}/settings`);
  return {
    stability: data.stability ?? null,
    similarityBoost: data.similarity_boost ?? null,
    style: data.style ?? null,
    useSpeakerBoost: data.use_speaker_boost ?? null,
    speed: data.speed ?? null,
  };
}

/* ===================================================================== TTS */

/**
 * Generate one take.
 *
 * `text` is the narration and nothing else. The caller is responsible for never putting a
 * title in it, and a test asserts that separately -- but it is worth saying here too, because
 * this is the function where a stray `${title}. ${content}` would be invisible.
 */
export async function textToSpeech({
  voiceId, text, modelId, seed, outputFormat = 'mp3_44100_128',
  voiceSettings, languageCode, applyTextNormalization = 'auto',
}) {
  if (!text || !text.trim()) throw new ElevenLabsError(EL_ERROR.TTS_FAILED, { detail: 'empty text' });

  const body = {
    text,
    model_id: modelId,
    ...(seed !== undefined && seed !== null ? { seed } : {}),
    ...(voiceSettings ? { voice_settings: voiceSettings } : {}),
    // multilingual_v2 rejects language_code; only send it where it is meaningful.
    ...(languageCode && !/multilingual_v2/.test(modelId) ? { language_code: languageCode } : {}),
    apply_text_normalization: applyTextNormalization,
  };

  const { buffer, requestId, durationMs, headers: h } = await request(
    'POST', `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    { json: body, accept: 'audio/mpeg', query: { output_format: outputFormat } });

  return {
    audio: buffer,
    requestId,
    durationMs,
    // Present on some plans; used for the "characters consumed this run" readout.
    charactersUsed: Number(h.get('x-character-cost') ?? h.get('character-cost')) || null,
  };
}

/* ===================================================================== STT */

/**
 * Transcribe. This is the INDEPENDENT hearing check, so it is deliberately given no hint of
 * what the script says unless a first pass came back wrong -- see `keyterms`.
 */
export async function speechToText({
  audio, filename = 'audio.wav', modelId = 'scribe_v2',
  languageCode = 'eng', diarize = false, keyterms,
}) {
  const form = new FormData();
  form.set('file', new Blob([audio]), filename);
  form.set('model_id', modelId);
  form.set('timestamps_granularity', 'word');
  form.set('diarize', String(diarize));
  if (languageCode) form.set('language_code', languageCode);
  /*
   * Keyterms bias the transcript and cost more, so they are opt-in per request rather than
   * always-on. Sending the whole technical vocabulary on clean synthetic narration pays for
   * an accuracy improvement that is not needed and weakens the check: a transcript told what
   * to expect is a worse witness.
   */
  if (keyterms?.length) form.set('keyterms', JSON.stringify(keyterms));

  const { data, requestId, durationMs } = await request('POST', '/v1/speech-to-text', { form });

  return {
    text: data.text ?? '',
    languageCode: data.language_code ?? null,
    languageProbability: data.language_probability ?? null,
    words: (data.words ?? [])
      .filter((w) => w.type === 'word' || w.type === undefined)
      .map((w) => ({ text: w.text, start: w.start ?? null, end: w.end ?? null, logprob: w.logprob ?? null })),
    requestId,
    durationMs,
  };
}

/* ======================================================= forced alignment */

/**
 * Align KNOWN text against audio.
 *
 * The complement of STT: transcription answers "what does this sound like", alignment answers
 * "where exactly did these words happen". The subtitle timing comes from here and the subtitle
 * TEXT comes from the script, which is how "vanillin" keeps its spelling while landing on the
 * moment it was actually said.
 */
export async function forcedAlignment({ audio, filename = 'audio.wav', text }) {
  if (!text || !text.trim()) throw new ElevenLabsError(EL_ERROR.ALIGNMENT_FAILED, { detail: 'empty text' });

  const form = new FormData();
  form.set('file', new Blob([audio]), filename);
  form.set('text', text);

  const { data, requestId, durationMs } = await request('POST', '/v1/forced-alignment', { form });

  return {
    // Lower loss is a better fit; surfaced so a poor alignment can be caught rather than used.
    loss: data.loss ?? null,
    words: (data.words ?? []).map((w) => ({
      text: w.text, start: w.start, end: w.end, loss: w.loss ?? null,
    })),
    characters: (data.characters ?? []).map((c) => ({ text: c.text, start: c.start, end: c.end })),
    requestId,
    durationMs,
  };
}
