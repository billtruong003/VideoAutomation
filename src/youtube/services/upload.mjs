/**
 * upload.mjs — resumable private upload.
 *
 * REACHABILITY: this runs only from a job that (a) passed an approval whose hashes still
 * match, (b) was explicitly confirmed by a human in the UI, and (c) requests
 * `privacyStatus: private`. There is no path from a page load or a background sync to this
 * code, which is the point.
 *
 * The upload is genuinely resumable: the session URI is persisted BEFORE any bytes are sent,
 * so a crash mid-upload resumes from the byte offset Google reports rather than restarting a
 * 15 MB transfer or — worse — creating a second video.
 */

import { createReadStream, statSync } from 'node:fs';
import { getAuthorisedClient } from '../auth.mjs';
import { SCOPES } from '../config.mjs';
import { getDb, now } from '../db/index.mjs';
import { JOB_STATE, PUBLISH_STATE } from '../domain/states.mjs';
import { log } from '../server/logger.mjs';

const UPLOAD_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CHUNK = 8 * 1024 * 1024;

const err = (code, message) => Object.assign(new Error(message), { code });

export async function runUploadJob(job) {
  const db = getDb();
  const payload = JSON.parse(job.payload_json ?? '{}');
  const manifest = payload.manifest;
  if (!manifest) throw err('INTERNAL', 'Upload job has no manifest.');

  if (manifest.youtube.privacy !== 'private') {
    // Defence in depth. The service already refuses this; a job that somehow carries a
    // non-private manifest must not proceed.
    throw err('UPLOAD_RESTRICTED_PRIVATE', 'Only private uploads are permitted.');
  }

  const { client } = await getAuthorisedClient({ scopes: SCOPES.publish, interactive: false });
  const path = manifest.asset.videoPath;
  const size = statSync(path).size;

  // ---- 1. session ---------------------------------------------------------
  let sessionUri = job.resumable_uri;
  if (!sessionUri) {
    const body = {
      snippet: {
        title: manifest.metadata.selectedTitle,
        description: manifest.metadata.description,
        tags: manifest.metadata.tags,
        categoryId: manifest.metadata.categoryId,
        defaultLanguage: manifest.metadata.language,
      },
      status: {
        privacyStatus: 'private',
        selfDeclaredMadeForKids: manifest.youtube.madeForKids,
        ...(manifest.youtube.containsSyntheticMedia === true
          ? { containsSyntheticMedia: true } : {}),
      },
    };
    const headers = toPlain(await client.getRequestHeaders(UPLOAD_URL));
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(size),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw classify(res.status, await safeJson(res));
    sessionUri = res.headers.get('location');
    if (!sessionUri) throw err('UPLOAD_FAILED', 'Google did not return a resumable session URI.');

    // Persisted before a single byte goes out — that is what makes recovery possible.
    db.prepare('UPDATE job SET resumable_uri = ?, updated_at = ? WHERE id = ?').run(sessionUri, now(), job.id);
  }

  // ---- 2. where are we? ---------------------------------------------------
  let offset = job.bytes_sent ?? 0;
  if (offset > 0 || job.attempt > 1) offset = await queryOffset(client, sessionUri, size);

  // ---- 3. send ------------------------------------------------------------
  while (offset < size) {
    const end = Math.min(offset + CHUNK, size) - 1;
    const chunk = await readSlice(path, offset, end);
    const headers = toPlain(await client.getRequestHeaders(sessionUri));

    const res = await fetch(sessionUri, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Length': String(end - offset + 1),
        'Content-Range': `bytes ${offset}-${end}/${size}`,
      },
      body: chunk,
    });

    if (res.status === 308) {
      const range = res.headers.get('range');
      offset = range ? Number(range.split('-')[1]) + 1 : end + 1;
      db.prepare('UPDATE job SET bytes_sent = ?, progress = ?, updated_at = ? WHERE id = ?')
        .run(offset, offset / size, now(), job.id);
      continue;
    }
    if (res.ok) {
      const video = await res.json();
      finish(job, manifest, video);
      return;
    }
    if (res.status === 404) throw err('UPLOAD_FAILED', 'The resumable session expired. Retry to start a new one.');
    throw classify(res.status, await safeJson(res));
  }
}

async function queryOffset(client, sessionUri, size) {
  const headers = toPlain(await client.getRequestHeaders(sessionUri));
  const res = await fetch(sessionUri, {
    method: 'PUT',
    headers: { ...headers, 'Content-Length': '0', 'Content-Range': `bytes */${size}` },
  });
  if (res.status === 308) {
    const range = res.headers.get('range');
    return range ? Number(range.split('-')[1]) + 1 : 0;
  }
  if (res.ok) return size;
  return 0;
}

function readSlice(path, start, end) {
  return new Promise((resolve, reject) => {
    const parts = [];
    createReadStream(path, { start, end })
      .on('data', (d) => parts.push(d))
      .on('error', reject)
      .on('end', () => resolve(Buffer.concat(parts)));
  });
}

function finish(job, manifest, video) {
  const db = getDb();
  db.prepare(`INSERT INTO youtube_video (video_id, content_id, title, privacy_status, upload_status, last_synced_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(video_id) DO UPDATE SET
      content_id=excluded.content_id, title=excluded.title, privacy_status=excluded.privacy_status,
      upload_status=excluded.upload_status, last_synced_at=excluded.last_synced_at`)
    .run(video.id, job.content_id, manifest.metadata.selectedTitle, 'private',
      video.status?.uploadStatus ?? 'uploaded', now());

  db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?')
    .run(PUBLISH_STATE.UPLOADED_PRIVATE, now(), job.content_id);
  db.prepare('UPDATE publish_manifest SET state = ?, updated_at = ? WHERE content_id = ?')
    .run(PUBLISH_STATE.UPLOADED_PRIVATE, now(), job.content_id);
  db.prepare('UPDATE job SET state = ?, progress = 1, updated_at = ? WHERE id = ?')
    .run(JOB_STATE.SUCCEEDED, now(), job.id);

  log.info('upload complete', { contentId: job.content_id, videoId: video.id, privacy: 'private' });
}

const toPlain = (h) => (h && typeof h.entries === 'function' ? Object.fromEntries(h.entries()) : { ...(h ?? {}) });
const safeJson = async (res) => { try { return await res.json(); } catch { return {}; } };

function classify(status, body) {
  const reason = body?.error?.errors?.[0]?.reason ?? '';
  const message = body?.error?.message ?? `HTTP ${status}`;
  if (status === 401) return err('AUTH_EXPIRED', message);
  if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded') return err('QUOTA_EXCEEDED', message);
  if (status === 403 && /scope|insufficient/i.test(message)) return err('SCOPE_MISSING', message);
  if (status >= 500) return err('UPSTREAM_ERROR', message);
  return err('UPLOAD_FAILED', message);
}
