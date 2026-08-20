/**
 * release-batch.mjs — run the real release, one observable stage at a time.
 *
 * Stages per video: PREFLIGHT → UPLOADING → PROCESSING → CAPTION → PLAYLIST → SCHEDULING →
 * VERIFYING → DONE. Each is recorded separately so a failure names the stage it happened in,
 * and a re-run resumes rather than repeating.
 *
 *   node tools/release-batch.mjs --canary            just the first scheduled episode
 *   node tools/release-batch.mjs --rest              everything the canary did not do
 *   node tools/release-batch.mjs --only <contentId>
 *   node tools/release-batch.mjs --schedule-only     scheduling pass over uploaded videos
 *
 * THE APPROVAL HASHES ARE RE-CHECKED IMMEDIATELY BEFORE EACH UPLOAD. A batch that started an
 * hour ago must not upload a file that changed since, and metadata that drifted from the lock
 * must not reach YouTube at all.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { computeMetadataHash } from '../src/youtube/domain/manifest.mjs';
import {
  uploadVideo, waitForProcessing, uploadCaption, addToPlaylist, scheduleVideo, readVideo,
  existingUpload, withRetry, isRetriable, api,
} from '../src/youtube/release.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? null : argv[i + 1]; };

const PLAYLIST_ID = 'PLGqOZxhW6Pak';
const db = getDb();
const report = JSON.parse(readFileSync('docs/youtube-control-plane/BATCH_001_METADATA.json', 'utf8'));
const locked = new Map(report.episodes.map((e) => [e.contentId, e]));
const plan = new Map(report.releasePlan.entries.map((e) => [e.contentId, e]));

/** Release order, from the approved plan — not the episode numbering. */
const ORDER = report.releasePlan.entries.map((e) => e.contentId);

const sha = (p) => `sha256:${createHash('sha256').update(readFileSync(p)).digest('hex')}`;

const stage = (contentId, name, detail = '') =>
  console.log(`  [${contentId}] ${name.padEnd(11)} ${detail}`);

function saveVideo(contentId, videoId, patch) {
  const existing = db.prepare('SELECT video_id FROM youtube_video WHERE video_id = ?').get(videoId);
  if (!existing) {
    db.prepare(`INSERT INTO youtube_video (video_id, content_id, last_synced_at) VALUES (?,?,?)`)
      .run(videoId, contentId, now());
  }
  const cols = Object.keys(patch);
  if (!cols.length) return;
  db.prepare(`UPDATE youtube_video SET ${cols.map((c) => `${c} = ?`).join(', ')}, last_synced_at = ? WHERE video_id = ?`)
    .run(...cols.map((c) => patch[c]), now(), videoId);
}

/* ============================================================ one episode */

async function releaseOne(contentId, { scheduleOnly = false } = {}) {
  const c = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(contentId);
  const L = locked.get(contentId);
  const slot = plan.get(contentId);
  const mrow = db.prepare('SELECT manifest_json FROM publish_manifest WHERE content_id = ?').get(contentId);
  const m = JSON.parse(mrow.manifest_json);

  /* ---------------------------------------------------------- PREFLIGHT */
  const liveHash = sha(c.video_path);
  const metaHash = computeMetadataHash(m);

  if (liveHash !== c.content_hash) {
    stage(contentId, 'PREFLIGHT', `APPROVAL_INVALIDATED — file changed since ingest`);
    return { contentId, state: 'APPROVAL_INVALIDATED', reason: 'asset hash mismatch' };
  }
  const drifted = m.metadata.selectedTitle !== L.title
    || m.metadata.description !== L.description
    || JSON.stringify(m.metadata.tags) !== JSON.stringify(L.tags);
  if (drifted) {
    stage(contentId, 'PREFLIGHT', 'APPROVAL_INVALIDATED — metadata drifted from the lock');
    return { contentId, state: 'APPROVAL_INVALIDATED', reason: 'metadata drift' };
  }

  const prior = existingUpload(contentId, liveHash);
  let videoId = prior?.video_id ?? null;
  stage(contentId, 'PREFLIGHT', videoId ? `already uploaded as ${videoId}` : 'ok');

  /* ---------------------------------------------------------- UPLOADING */
  if (!videoId && !scheduleOnly) {
    const snippet = {
      title: L.title,
      description: L.description,
      tags: L.tags,
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
      containsSyntheticMedia: Boolean(m.youtube?.containsSyntheticMedia),
    };
    stage(contentId, 'UPLOADING', `${(c.video_bytes / 1e6).toFixed(1)} MB`);
    const video = await withRetry(`${contentId} upload`, () =>
      uploadVideo({ contentId, filePath: c.video_path, snippet, status }));
    videoId = video.id;
    saveVideo(contentId, videoId, {
      title: L.title, privacy_status: 'private', upload_status: video.status?.uploadStatus ?? null,
      uploaded_at: now(), asset_hash: liveHash, metadata_hash: metaHash,
    });
    stage(contentId, 'UPLOADED', videoId);
  }
  if (!videoId) return { contentId, state: 'NOT_UPLOADED' };

  /* --------------------------------------------------------- PROCESSING */
  const proc = await waitForProcessing(videoId);
  saveVideo(contentId, videoId, {
    upload_status: proc.uploadStatus ?? null,
    processing_status: proc.processingStatus ?? null,
    rejection_reason: proc.rejectionReason ?? null,
  });
  stage(contentId, 'PROCESSING', `${proc.uploadStatus}/${proc.processingStatus}${proc.rejectionReason ? ` REJECTED:${proc.rejectionReason}` : ''}`);
  if (proc.uploadStatus === 'rejected' || proc.uploadStatus === 'failed') {
    return { contentId, videoId, state: 'REJECTED', reason: proc.rejectionReason ?? proc.failureReason };
  }

  /* ------------------------------------------------------------ CAPTION */
  let captionId = null;
  let captionNote = '';
  if (c.srt_path && existsSync(c.srt_path)) {
    try {
      const r = await uploadCaption(videoId, c.srt_path);
      captionId = r.captionId;
      captionNote = r.reused ? 'already present' : 'inserted';
      saveVideo(contentId, videoId, { caption_track_id: captionId });
    } catch (e) {
      /*
       * captions.insert needs youtube.force-ssl. Failing to add an OPTIONAL caption track must
       * not abort a release: the picture already carries burned-in captions, so this is an
       * accessibility improvement rather than a requirement.
       */
      captionNote = `skipped (${e.status ?? '?'}: ${(e.message ?? '').slice(0, 70)})`;
    }
  } else {
    captionNote = 'no SRT';
  }
  stage(contentId, 'CAPTION', captionNote);

  /* ----------------------------------------------------------- PLAYLIST */
  let playlistItemId = null;
  try {
    const r = await withRetry(`${contentId} playlist`, () => addToPlaylist(PLAYLIST_ID, videoId));
    playlistItemId = r.playlistItemId;
    saveVideo(contentId, videoId, { playlist_item_id: playlistItemId });
    stage(contentId, 'PLAYLIST', r.reused ? 'already a member' : playlistItemId);
  } catch (e) {
    stage(contentId, 'PLAYLIST', `FAILED ${e.status}: ${e.message.slice(0, 80)}`);
  }

  /* --------------------------------------------------------- SCHEDULING */
  let scheduleStatus = 'NOT_ATTEMPTED';
  let scheduleError = null;
  if (slot) {
    try {
      await scheduleVideo(videoId, slot.publishAtUtc);
      scheduleStatus = 'REQUESTED';
    } catch (e) {
      scheduleStatus = 'FAILED';
      scheduleError = { status: e.status, reason: e.reason, message: e.message };
      stage(contentId, 'SCHEDULING', `FAILED ${e.status}/${e.reason}: ${e.message.slice(0, 110)}`);
    }
  }

  /* ---------------------------------------------------------- VERIFYING */
  /*
   * Re-read with a short retry. videos.update is eventually consistent: reading back
   * immediately after setting publishAt returned null on a schedule that had in fact been
   * accepted, which would have reported the whole batch as needing manual scheduling.
   */
  let live = await readVideo(videoId);
  if (scheduleStatus === 'REQUESTED' && !live?.status?.publishAt) {
    for (let i = 0; i < 4 && !live?.status?.publishAt; i++) {
      await new Promise((r) => { setTimeout(r, 2000); });
      live = await readVideo(videoId);
    }
  }

  /*
   * Tags compare as a SET. YouTube returns them alphabetically sorted rather than in the
   * order they were submitted, so an ordered comparison reports drift on metadata that
   * matches perfectly.
   */
  const sameTags = (a1, b1) => {
    const x = [...(a1 ?? [])].map((t) => t.toLowerCase()).sort();
    const y = [...(b1 ?? [])].map((t) => t.toLowerCase()).sort();
    return x.length === y.length && x.every((t, i) => t === y[i]);
  };

  const verified = {
    title: live?.snippet?.title === L.title,
    description: live?.snippet?.description === L.description,
    tags: sameTags(live?.snippet?.tags, L.tags),
    privacy: live?.status?.privacyStatus ?? null,
    publishAt: live?.status?.publishAt ?? null,
    madeForKids: live?.status?.madeForKids ?? null,
  };
  const scheduled = Boolean(verified.publishAt);
  if (scheduleStatus === 'REQUESTED') scheduleStatus = scheduled ? 'SCHEDULED_VERIFIED' : 'NOT_APPLIED';

  saveVideo(contentId, videoId, {
    privacy_status: verified.privacy, publish_at: verified.publishAt ?? null,
    schedule_status: scheduleStatus, title: live?.snippet?.title ?? null,
  });

  stage(contentId, 'VERIFIED',
    `privacy=${verified.privacy} publishAt=${verified.publishAt ?? 'none'} `
    + `title=${verified.title ? 'ok' : 'DRIFT'} desc=${verified.description ? 'ok' : 'DRIFT'} tags=${verified.tags ? 'ok' : 'DRIFT'}`);

  return {
    contentId, videoId,
    state: scheduled ? 'SCHEDULED_VERIFIED' : 'UPLOADED_PRIVATE_MANUAL_SCHEDULE_REQUIRED',
    assetHash: liveHash, metadataHash: metaHash,
    processing: proc, captionId, captionNote, playlistItemId,
    scheduleStatus, scheduleError, verified,
    slot: slot ? { localDate: slot.localDate, localTime: slot.localTime, publishAtUtc: slot.publishAtUtc } : null,
  };
}

/* ================================================================== run */

const targets = flag('canary') ? [ORDER[0]]
  : val('only') ? [val('only')]
    : flag('rest') ? ORDER.filter((id) => !existingUpload(id, sha(
      db.prepare('SELECT video_path FROM content_item WHERE content_id = ?').get(id).video_path)))
      : ORDER;

console.log(`\n  RELEASE — ${targets.length} episode${targets.length === 1 ? '' : 's'}\n`);

const results = [];
for (const id of targets) {
  try {
    results.push(await releaseOne(id, { scheduleOnly: flag('schedule-only') }));
  } catch (e) {
    console.log(`  [${id}] ERROR ${e.status ?? ''} ${e.message.slice(0, 160)}`);
    results.push({ contentId: id, state: 'FAILED', reason: e.message, retriable: isRetriable(e) });
    // A permanent failure on one episode stops that episode, not the batch.
  }
  console.log();
}

console.log('  SUMMARY');
for (const r of results) {
  console.log(`    ${r.contentId.padEnd(22)} ${(r.videoId ?? '-').padEnd(13)} ${r.state}`);
}

const outPath = flag('canary') ? 'tmp/release-canary.json' : 'tmp/release-results.json';
try {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync('tmp', { recursive: true });
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n  written: ${outPath}\n`);
} catch { /* reporting only */ }
