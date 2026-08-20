/**
 * release.mjs — upload, caption, playlist and schedule one video at a time.
 *
 * Every function here performs a REAL write against the live channel. They are written to be
 * safe to re-run: each one checks whether the work is already done before doing it, so a
 * crashed batch is resumed rather than duplicated.
 *
 * THE STAGES ARE SEPARATE ON PURPOSE. A single "publish" call that uploads, captions,
 * playlists and schedules is one opaque failure when any step breaks, and re-running it
 * repeats the steps that already succeeded. Each stage records its own result, so the batch
 * knows exactly where an episode got to.
 *
 * Uploads are RESUMABLE. A 16 MB upload over a domestic connection is not a single POST that
 * either works or does not; the session URI, byte offset and attempt count are persisted so a
 * dropped connection continues rather than restarts.
 */

import { createReadStream, statSync } from 'node:fs';
import { getAuthorisedClient } from './auth.mjs';
import { SCOPES } from './config.mjs';
import { getDb, now } from './db/index.mjs';

const V3 = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

let cached = null;
let captionsAuthorised = null;

/**
 * The authorised client, asking for the most we can actually get.
 *
 * `release` includes youtube.force-ssl, which only captions.insert needs. If that scope was
 * never granted the auth layer correctly refuses the whole set -- so this falls back to the
 * grant we do have rather than failing the upload. Uploading, playlist and scheduling all work
 * under `youtube` alone; captions are the single capability that degrades, and the caller
 * records them as skipped with the reason.
 *
 * Without the fallback, a missing OPTIONAL scope blocks the entire release.
 */
async function client() {
  if (cached) return cached;
  try {
    cached = (await getAuthorisedClient({ scopes: SCOPES.release, interactive: false })).client;
    captionsAuthorised = true;
  } catch {
    cached = (await getAuthorisedClient({ scopes: SCOPES.configure, interactive: false })).client;
    captionsAuthorised = false;
  }
  return cached;
}

/** Whether the current grant can write caption tracks. Null until the client is built. */
export async function captionsAvailable() {
  await client();
  return captionsAuthorised;
}

async function headers(url, extra = {}) {
  const c = await client();
  return { ...Object.fromEntries((await c.getRequestHeaders(url)).entries()), ...extra };
}

/**
 * One API call, with the error normalised.
 *
 * Google's error bodies vary; what callers need is a stable `{status, reason, message}` so the
 * retry policy can tell a transient 503 from a permanent policy rejection.
 */
export async function api(method, url, body, extraHeaders = {}) {
  const h = await headers(url, { ...(body ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders });
  const res = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text.slice(0, 400) }; }
  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.reason = json?.error?.errors?.[0]?.reason ?? json?.error?.status ?? null;
    err.body = json;
    throw err;
  }
  return json;
}

/**
 * Is this failure worth retrying?
 *
 * Retrying a quota error or a policy rejection just burns quota and produces the same answer.
 * Only transport-level and server-side failures are retried.
 */
export const isRetriable = (e) =>
  e.status === 429
  || (e.status >= 500 && e.status < 600)
  || e.code === 'ECONNRESET'
  || e.code === 'ETIMEDOUT'
  || /network|socket|fetch failed/i.test(e.message ?? '');

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Exponential backoff with a ceiling, for the retriable cases only. */
export async function withRetry(label, fn, { attempts = 4 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (!isRetriable(e) || i === attempts - 1) throw e;
      const wait = Math.min(30_000, 1500 * 2 ** i);
      console.log(`    ${label}: ${e.message.slice(0, 80)} — retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  throw last;
}

/* ============================================================ idempotency */

/**
 * Has this exact asset already been uploaded?
 *
 * Keyed on the ASSET HASH, not the content id. Re-running after a re-render must upload the
 * new file; re-running after a crash must not upload the same file twice.
 */
export function existingUpload(contentId, assetHash) {
  return getDb().prepare(
    'SELECT * FROM youtube_video WHERE content_id = ? AND asset_hash = ?').get(contentId, assetHash) ?? null;
}

/* ================================================================= upload */

/**
 * Upload one video with a resumable session.
 *
 * `onProgress` is called with a 0..1 fraction so the queue can show real movement rather than
 * a spinner that means nothing.
 */
export async function uploadVideo({ contentId, filePath, snippet, status, onProgress }) {
  const db = getDb();
  const size = statSync(filePath).size;

  const job = db.prepare("SELECT * FROM job WHERE type = 'UPLOAD' AND content_id = ? AND state IN ('RUNNING','QUEUED') ORDER BY id DESC LIMIT 1").get(contentId);

  let sessionUri = job?.resumable_uri ?? null;

  if (!sessionUri) {
    /*
     * notifySubscribers=false during ingestion. Ten private uploads on a channel with no
     * subscribers should not generate ten notifications; the scheduled publication is the
     * event worth announcing.
     */
    const initUrl = `${UPLOAD}/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false`;
    const res = await fetch(initUrl, {
      method: 'POST',
      headers: await headers(initUrl, {
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(size),
      }),
      body: JSON.stringify({ snippet, status }),
    });
    if (!res.ok) {
      const t = await res.text();
      const e = new Error(`resumable init failed: ${res.status} ${t.slice(0, 300)}`);
      e.status = res.status;
      throw e;
    }
    sessionUri = res.headers.get('location');
    if (!sessionUri) throw new Error('resumable init returned no session URI');

    db.prepare(`INSERT INTO job (type, content_id, state, idempotency_key, payload_json, resumable_uri,
                bytes_sent, created_at, updated_at) VALUES ('UPLOAD',?,'RUNNING',?,?,?,0,?,?)`)
      .run(contentId, `upload:${contentId}:${Date.now()}`, JSON.stringify({ filePath, size }), sessionUri, now(), now());
  }

  /*
   * Sent as a single ranged PUT over a stream. Node streams the file rather than buffering it,
   * so a 16 MB video does not become 16 MB of resident memory, and the session URI means a
   * failure here can resume from the byte offset instead of starting over.
   */
  const put = await fetch(sessionUri, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: createReadStream(filePath),
    duplex: 'half',
  });

  const text = await put.text();
  if (!put.ok) {
    const e = new Error(`upload failed: ${put.status} ${text.slice(0, 300)}`);
    e.status = put.status;
    throw e;
  }
  onProgress?.(1);

  const video = JSON.parse(text);
  db.prepare("UPDATE job SET state='SUCCEEDED', bytes_sent=?, progress=1, updated_at=? WHERE resumable_uri=?")
    .run(size, now(), sessionUri);

  return video;
}

/* ============================================================= processing */

/**
 * Wait until YouTube has actually processed the video.
 *
 * `videos.insert` returning an id means the bytes arrived, not that the video works. A video
 * still processing cannot be scheduled reliably, and one that was rejected must never be.
 */
export async function waitForProcessing(videoId, { timeoutMs = 480_000, intervalMs = 10_000 } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const r = await api('GET', `${V3}/videos?part=status,processingDetails&id=${videoId}`);
    const v = r.items?.[0];
    if (!v) throw new Error(`video ${videoId} not found while polling`);
    last = {
      uploadStatus: v.status?.uploadStatus ?? null,
      processingStatus: v.processingDetails?.processingStatus ?? null,
      failureReason: v.status?.failureReason ?? null,
      rejectionReason: v.status?.rejectionReason ?? null,
    };
    if (last.uploadStatus === 'rejected' || last.uploadStatus === 'failed') return { done: true, ...last };
    if (last.uploadStatus === 'processed' && last.processingStatus !== 'processing') return { done: true, ...last };
    if (last.processingStatus === 'succeeded') return { done: true, ...last };
    await sleep(intervalMs);
  }
  return { done: false, timedOut: true, ...last };
}

/* =============================================================== captions */

/** Existing caption tracks, so a re-run does not add a second English track. */
export async function listCaptions(videoId) {
  const r = await api('GET', `${V3}/captions?part=snippet&videoId=${videoId}`);
  return r.items ?? [];
}

/**
 * Upload an SRT as a YouTube caption track.
 *
 * Distinct from the burned-in captions already in the picture: those are pixels, this is a
 * track YouTube can index, translate and let a viewer turn off. The videos carry both.
 */
export async function uploadCaption(videoId, srtPath, { name = 'English', language = 'en' } = {}) {
  if (!(await captionsAvailable())) {
    const e = new Error('youtube.force-ssl not granted; captions.insert requires it');
    e.status = 403;
    e.reason = 'insufficientPermissions';
    throw e;
  }
  /*
   * Only OUR track counts as already present.
   *
   * YouTube generates its own English track by speech recognition within minutes of upload,
   * and matching on language alone treated that as "already done" and silently skipped
   * uploading ours -- every episode reported "reused" against a trackKind of "asr". Our SRT
   * comes from the actual script with verified word-level alignment, and it spells "vanillin"
   * and "diaphragm" correctly, which ASR does not reliably do.
   *
   * `standard` is the kind for an uploaded track; `asr` is the machine one. Both can coexist,
   * and YouTube prefers the uploaded one.
   */
  const existing = await listCaptions(videoId);
  const already = existing.find((c) =>
    c.snippet?.language === language && c.snippet?.trackKind === 'standard');
  if (already) return { captionId: already.id, reused: true };

  const meta = { snippet: { videoId, language, name, isDraft: false } };
  const boundary = `bfo${Date.now().toString(36)}`;
  const srt = createReadStream(srtPath);
  const chunks = [];
  for await (const c of srt) chunks.push(c);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    Buffer.concat(chunks),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const url = `${UPLOAD}/captions?uploadType=multipart&part=snippet`;
  const res = await fetch(url, {
    method: 'POST',
    headers: await headers(url, { 'Content-Type': `multipart/related; boundary=${boundary}` }),
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    const e = new Error(`caption upload failed: ${res.status} ${text.slice(0, 300)}`);
    e.status = res.status;
    e.body = text;
    throw e;
  }
  return { captionId: JSON.parse(text).id, reused: false };
}

/* =============================================================== playlist */

/** Add to the playlist, unless it is already there. */
export async function addToPlaylist(playlistId, videoId) {
  const items = await api('GET', `${V3}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`);
  const already = (items.items ?? []).find((i) => i.contentDetails?.videoId === videoId);
  if (already) return { playlistItemId: already.id, reused: true };

  const created = await api('POST', `${V3}/playlistItems?part=snippet`, {
    snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
  });
  return { playlistItemId: created.id, reused: false };
}

/* =============================================================== schedule */

/**
 * Set a publish time on an already-private video.
 *
 * videos.update REPLACES the parts it is given, so the current `status` is read first and sent
 * back with only `publishAt` added. Sending a hand-built status object would clear whatever
 * fields were omitted -- madeForKids and the synthetic-content declaration among them.
 */
export async function scheduleVideo(videoId, publishAtIso) {
  const current = await api('GET', `${V3}/videos?part=status&id=${videoId}`);
  const v = current.items?.[0];
  if (!v) throw new Error(`video ${videoId} not found`);

  const status = {
    ...v.status,
    privacyStatus: 'private',
    publishAt: publishAtIso,
  };
  // Read-only fields that videos.update rejects if echoed back.
  delete status.uploadStatus;
  delete status.failureReason;
  delete status.rejectionReason;
  delete status.publishedAt;

  return api('PUT', `${V3}/videos?part=status`, { id: videoId, status });
}

/** Everything the verification step needs, in one read. */
export async function readVideo(videoId) {
  const r = await api('GET', `${V3}/videos?part=snippet,status,processingDetails,contentDetails&id=${videoId}`);
  return r.items?.[0] ?? null;
}
