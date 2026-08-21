#!/usr/bin/env node
/**
 * release-batch-002.mjs — run the Batch 002 release, one observable stage at a time.
 *
 *   node tools/release-batch-002.mjs [--only <contentId>] [--limit N] [--dry-run] [--upload-only]
 *
 * Stages per video: PREFLIGHT → UPLOAD → PROCESSING → CAPTION → PLAYLIST → SCHEDULE → VERIFY.
 * Each is printed separately so a failure names the stage it happened in, and every stage
 * checks whether its work is already done, so a re-run resumes instead of duplicating.
 *
 * WHY A SECOND RUNNER RATHER THAN A FLAG ON THE FIRST. `release-batch.mjs` reads its locked
 * metadata from `BATCH_001_METADATA.json` — a file that is the record of what Batch 001
 * actually shipped. Teaching it a second source would mean editing the thing that documents a
 * completed release, to serve a release it has nothing to do with. Batch 002's lock lives in
 * the database instead, so it gets its own thirty lines and Batch 001's record stays a record.
 *
 * Both share every primitive in `src/youtube/release.mjs`, which is where the resumable
 * upload, the retry policy and the eventual-consistency handling actually live.
 *
 * NOTHING HERE PUBLISHES. Every video is uploaded private and given a `publishAt` from the
 * locked calendar. A video that fails to schedule stays private and says so; it never becomes
 * public by accident.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { getDb, now } from '../src/youtube/db/index.mjs';
import {
  uploadVideo, waitForProcessing, uploadCaption, addToPlaylist, scheduleVideo, readVideo,
  existingUpload, withRetry,
} from '../src/youtube/release.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? null : argv[i + 1]; };

const PLAYLIST_ID = 'PLGqOZxhW6Pak';
const DRY = flag('dry-run');
/*
 * Upload and stop.
 *
 * `videos.insert` bills to its own daily bucket; captions, playlist and scheduling all bill to
 * the shared 10,000-unit pool. When that pool is exhausted the uploads can still run, so the
 * slow half of the work gets done while waiting for the reset rather than after it.
 */
const UPLOAD_ONLY = flag('upload-only');
const db = getDb();

const plan = JSON.parse(readFileSync('data/batch-002-release-plan.json', 'utf8'));
const SLOTS = new Map(plan.entries.map((e) => [e.slug, e]));

const sha = (p) => `sha256:${createHash('sha256').update(readFileSync(p)).digest('hex')}`;
const stage = (id, name, detail = '') => console.log(`  [${id}] ${name.padEnd(11)} ${detail}`);

function saveVideo(contentId, videoId, patch) {
  const exists = db.prepare('SELECT video_id FROM youtube_video WHERE video_id = ?').get(videoId);
  if (!exists) {
    db.prepare('INSERT INTO youtube_video (video_id, content_id, last_synced_at) VALUES (?,?,?)')
      .run(videoId, contentId, now());
  }
  const keys = Object.keys(patch);
  if (!keys.length) return;
  db.prepare(`UPDATE youtube_video SET ${keys.map((k) => `${k}=?`).join(', ')}, last_synced_at=? WHERE video_id=?`)
    .run(...keys.map((k) => patch[k]), now(), videoId);
}

/* ============================================================ one episode */

async function releaseOne(contentId) {
  const c = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(contentId);
  const mrow = db.prepare('SELECT manifest_json, state FROM publish_manifest WHERE content_id = ?').get(contentId);
  const slot = SLOTS.get(contentId);
  if (!c || !mrow || !slot) return { contentId, state: 'NOT_PREPARED' };

  const m = JSON.parse(mrow.manifest_json);
  const title = m.title;
  const description = m.description;
  const tags = m.tags ?? [];

  /* ---------------------------------------------------------- PREFLIGHT */
  /*
   * The asset hash is re-checked HERE, immediately before the upload, not at the start of the
   * batch. A run that began an hour ago must not upload a file that has changed since.
   */
  const liveHash = sha(c.video_path);
  if (liveHash !== c.content_hash) {
    stage(contentId, 'PREFLIGHT', 'APPROVAL_INVALIDATED — the rendered file changed since ingest');
    return { contentId, state: 'APPROVAL_INVALIDATED' };
  }
  if (mrow.state !== 'METADATA_LOCKED') {
    stage(contentId, 'PREFLIGHT', `refusing: manifest state is ${mrow.state}`);
    return { contentId, state: 'NOT_LOCKED' };
  }
  if (m.publishAt !== slot.publishAt) {
    stage(contentId, 'PREFLIGHT', `refusing: manifest publishAt ${m.publishAt} != plan ${slot.publishAt}`);
    return { contentId, state: 'SCHEDULE_DRIFT' };
  }

  const prior = existingUpload(contentId, liveHash);
  let videoId = prior?.video_id ?? null;
  stage(contentId, 'PREFLIGHT', videoId ? `already uploaded as ${videoId}` : `ok · ${(c.video_bytes / 1e6).toFixed(1)} MB · ${slot.ny} NY`);
  if (DRY) return { contentId, state: 'DRY_RUN', slot };

  /* ------------------------------------------------------------- UPLOAD */
  if (!videoId) {
    const snippet = {
      title, description, tags,
      categoryId: '27',
      defaultLanguage: 'en',
      defaultAudioLanguage: 'en',
    };
    const status = {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      embeddable: true,
      license: 'youtube',
      publicStatsViewable: true,
    };
    stage(contentId, 'UPLOADING', `${(c.video_bytes / 1e6).toFixed(1)} MB`);
    const video = await withRetry(`${contentId} upload`, () =>
      uploadVideo({ contentId, filePath: c.video_path, snippet, status }));
    videoId = video.id;
    saveVideo(contentId, videoId, {
      title, privacy_status: 'private', upload_status: video.status?.uploadStatus ?? null,
      uploaded_at: now(), asset_hash: liveHash,
    });
    stage(contentId, 'UPLOADED', videoId);
  }

  if (UPLOAD_ONLY) {
    stage(contentId, 'UPLOAD_ONLY', 'stopping before the metered writes');
    return { contentId, videoId, state: 'UPLOADED_PENDING_WRITES' };
  }

  /* --------------------------------------------------------- PROCESSING */
  const proc = await waitForProcessing(videoId);
  saveVideo(contentId, videoId, {
    upload_status: proc.uploadStatus ?? null,
    processing_status: proc.processingStatus ?? null,
    rejection_reason: proc.rejectionReason ?? null,
  });
  stage(contentId, 'PROCESSING', `${proc.uploadStatus}/${proc.processingStatus}`);
  if (proc.uploadStatus === 'rejected' || proc.uploadStatus === 'failed') {
    return { contentId, videoId, state: 'REJECTED', reason: proc.rejectionReason ?? proc.failureReason };
  }

  /* ------------------------------------------------------------ CAPTION */
  let captionId = null;
  let captionNote = 'no SRT';
  if (c.srt_path && existsSync(c.srt_path)) {
    try {
      const r = await withRetry(`${contentId} caption`, () => uploadCaption(videoId, c.srt_path));
      captionId = r.captionId;
      captionNote = r.reused ? `already present ${captionId}` : `inserted ${captionId}`;
      saveVideo(contentId, videoId, { caption_track_id: captionId });
    } catch (e) {
      captionNote = `FAILED ${e.status ?? '?'}: ${(e.message ?? '').slice(0, 70)}`;
    }
  }
  stage(contentId, 'CAPTION', captionNote);

  /* ----------------------------------------------------------- PLAYLIST */
  let playlistItemId = null;
  try {
    const r = await withRetry(`${contentId} playlist`, () => addToPlaylist(PLAYLIST_ID, videoId));
    playlistItemId = r.playlistItemId;
    saveVideo(contentId, videoId, { playlist_item_id: playlistItemId });
    stage(contentId, 'PLAYLIST', r.reused ? `already a member ${playlistItemId}` : playlistItemId);
  } catch (e) {
    stage(contentId, 'PLAYLIST', `FAILED ${e.status}: ${String(e.message).slice(0, 80)}`);
  }

  /* ----------------------------------------------------------- SCHEDULE */
  let scheduleStatus = 'NOT_ATTEMPTED';
  try {
    await withRetry(`${contentId} schedule`, () => scheduleVideo(videoId, slot.publishAt));
    scheduleStatus = 'REQUESTED';
  } catch (e) {
    scheduleStatus = 'FAILED';
    stage(contentId, 'SCHEDULE', `FAILED ${e.status}/${e.reason}: ${String(e.message).slice(0, 100)}`);
  }

  /* ------------------------------------------------------------- VERIFY */
  /*
   * videos.update is eventually consistent. Reading publishAt back immediately after setting
   * it has returned null on a schedule Google had in fact accepted, which would report the
   * whole batch as needing manual scheduling. So the read-back retries before believing a
   * negative.
   */
  let live = await readVideo(videoId);
  for (let i = 0; i < 5 && scheduleStatus === 'REQUESTED' && !live?.status?.publishAt; i++) {
    await new Promise((r) => { setTimeout(r, 2500); });
    live = await readVideo(videoId);
  }

  // YouTube returns tags alphabetically, so an ordered comparison reports drift on a match.
  const sameTags = (a, b) => {
    const x = [...(a ?? [])].map((t) => t.toLowerCase()).sort();
    const y = [...(b ?? [])].map((t) => t.toLowerCase()).sort();
    return x.length === y.length && x.every((t, i) => t === y[i]);
  };

  const verified = {
    title: live?.snippet?.title === title,
    description: live?.snippet?.description === description,
    tags: sameTags(live?.snippet?.tags, tags),
    privacy: live?.status?.privacyStatus ?? null,
    publishAt: live?.status?.publishAt ?? null,
  };
  const onTime = verified.publishAt
    && new Date(verified.publishAt).toISOString() === new Date(slot.publishAt).toISOString();
  if (scheduleStatus === 'REQUESTED') scheduleStatus = onTime ? 'SCHEDULED_VERIFIED' : 'NOT_APPLIED';

  saveVideo(contentId, videoId, {
    privacy_status: verified.privacy,
    publish_at: verified.publishAt ?? null,
    schedule_status: scheduleStatus,
    title: live?.snippet?.title ?? null,
  });

  stage(contentId, 'VERIFIED',
    `${scheduleStatus} · privacy=${verified.privacy} · publishAt=${verified.publishAt ?? 'none'} · `
    + `title=${verified.title ? 'ok' : 'DRIFT'} desc=${verified.description ? 'ok' : 'DRIFT'} tags=${verified.tags ? 'ok' : 'DRIFT'}`);

  return {
    contentId, videoId, state: scheduleStatus,
    captionId, captionNote, playlistItemId, verified, slot,
  };
}

/* ================================================================== run */

const order = plan.entries.map((e) => e.slug);
const only = val('only');
const limit = val('limit') ? Number(val('limit')) : null;
const targets = only ? [only] : (limit ? order.slice(0, limit) : order);

console.log(`\n  BATCH 002 RELEASE — ${targets.length} episode(s)${DRY ? ' — DRY RUN' : ''}\n`);

const results = [];
for (const id of targets) {
  try {
    results.push(await releaseOne(id));
  } catch (e) {
    console.log(`  [${id}] ABORTED    ${e.status ?? ''} ${String(e.message).slice(0, 120)}`);
    results.push({ contentId: id, state: 'ERROR', error: String(e.message) });
  }
  console.log('');
}

const done = results.filter((r) => r.state === 'SCHEDULED_VERIFIED');
console.log(`  ${done.length}/${results.length} SCHEDULED_VERIFIED`);
for (const r of results.filter((x) => x.state !== 'SCHEDULED_VERIFIED' && x.state !== 'DRY_RUN')) {
  console.log(`    ${r.contentId}: ${r.state}${r.reason ? ` — ${r.reason}` : ''}`);
}
const uploadedOnly = results.filter((r) => r.state === 'UPLOADED_PENDING_WRITES');
if (uploadedOnly.length) console.log(`  ${uploadedOnly.length} uploaded, awaiting captions/playlist/schedule`);
process.exit(done.length === results.length || DRY || UPLOAD_ONLY ? 0 : 1);
