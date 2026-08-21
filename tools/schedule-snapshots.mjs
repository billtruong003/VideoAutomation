/**
 * schedule-snapshots.mjs — queue the performance checkpoints, from LIVE publish times.
 *
 * Enqueues SYNC_ANALYTICS jobs at +1h, +6h, +24h, +72h and +7d after each video's actual
 * publish instant — not after upload. A video published next week has nothing to measure
 * today, and a snapshot taken early records a row of zeroes that looks like a broken
 * integration rather than a video that has not aired.
 *
 * YOUTUBE IS THE SOURCE OF TRUTH for when each video publishes. Reading the schedule from the
 * local plan was viable while the plan was the only thing that had ever set it; once a human
 * reschedules a video in Studio, or a correction pass moves eight of them, the local copy is
 * just a stale opinion. So every checkpoint is computed from `publishAt` (or `publishedAt`
 * for anything already public) as YouTube currently reports it.
 *
 * Re-running SUPERSEDES rather than duplicates. Checkpoints that have already run successfully
 * are left alone; anything still outstanding for a video whose time has moved is cancelled and
 * replaced. The idempotency key carries the publish instant, so the same schedule re-queued
 * twice collides with itself and does nothing.
 *
 *   node tools/schedule-snapshots.mjs [--dry-run]
 */

import { getDb, now } from '../src/youtube/db/index.mjs';
import { JOB_TYPE, JOB_STATE } from '../src/youtube/domain/states.mjs';
import { api } from '../src/youtube/release.mjs';

const DRY = process.argv.includes('--dry-run');

const CHECKPOINTS = [
  { label: '+1h', ms: 1 * 3600_000 },
  { label: '+6h', ms: 6 * 3600_000 },
  { label: '+24h', ms: 24 * 3600_000 },
  { label: '+72h', ms: 72 * 3600_000 },
  { label: '+7d', ms: 168 * 3600_000 },
];

/** What each snapshot collects, where the API exposes it. */
const METRICS = [
  'views', 'engagedViews', 'estimatedMinutesWatched', 'averageViewDuration',
  'averageViewPercentage', 'likes', 'comments', 'shares',
  'subscribersGained', 'subscribersLost',
];

const db = getDb();
const local = db.prepare('SELECT video_id, content_id FROM youtube_video').all();
if (!local.length) { console.log('no uploaded videos'); process.exit(0); }

const live = await api('GET',
  `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${local.map((r) => r.video_id).join(',')}`);
const byId = new Map((live.items ?? []).map((v) => [v.id, v]));

const cancel = db.prepare(`UPDATE job SET state = @cancelled, error_code = 'SUPERSEDED',
  error_message = 'publish time changed; replaced by a new checkpoint', updated_at = @at
  WHERE type = @type AND content_id = @contentId AND state != @succeeded`);
const insert = db.prepare(`
  INSERT INTO job (type, content_id, state, idempotency_key, payload_json, next_retry_at, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?)
  ON CONFLICT(idempotency_key) DO NOTHING`);

let queued = 0;
let superseded = 0;
console.log(`\n  ANALYTICS CHECKPOINTS${DRY ? ' (dry run)' : ''} — from live publish times\n`);

for (const r of local) {
  const v = byId.get(r.video_id);
  if (!v) { console.log(`  ${r.content_id.padEnd(22)} not found on YouTube`); continue; }

  /*
   * A public video's clock started at publishedAt; a scheduled one starts at publishAt.
   * Using the wrong one puts every checkpoint for the already-live video days into the future.
   */
  const isPublic = v.status.privacyStatus === 'public';
  const base = isPublic ? v.snippet.publishedAt : v.status.publishAt;
  if (!base) { console.log(`  ${r.content_id.padEnd(22)} neither published nor scheduled — skipped`); continue; }

  if (!DRY) {
    const res = cancel.run({
      cancelled: JOB_STATE.CANCELLED, at: now(),
      type: JOB_TYPE.SYNC_ANALYTICS, contentId: r.content_id, succeeded: JOB_STATE.SUCCEEDED,
    });
    superseded += res.changes;
  }

  const marks = [];
  for (const cp of CHECKPOINTS) {
    const at = new Date(Date.parse(base) + cp.ms).toISOString();
    // The publish instant is part of the key, so a re-queue of the SAME schedule is a no-op
    // while a moved schedule produces genuinely new jobs.
    const key = `analytics:${r.video_id}:${base}:${cp.label}`;
    if (!DRY) {
      insert.run(JOB_TYPE.SYNC_ANALYTICS, r.content_id, JOB_STATE.PENDING, key,
        JSON.stringify({ videoId: r.video_id, checkpoint: cp.label, metrics: METRICS, publishAt: base, dueAt: at }),
        at, now(), now());
      queued++;
    }
    marks.push(cp.label);
  }
  console.log(`  ${r.content_id.padEnd(22)} ${isPublic ? 'published' : 'publishes'} ${base}  ${marks.join(' ')}`);
}

if (!DRY) {
  console.log(`\n  ${superseded} outstanding checkpoints superseded, ${queued} queued`);
  const g = db.prepare(`SELECT state, COUNT(*) n, MIN(next_retry_at) first, MAX(next_retry_at) last
    FROM job WHERE type = ? GROUP BY state`).all(JOB_TYPE.SYNC_ANALYTICS);
  for (const x of g) console.log(`  ${x.state.padEnd(11)} ${String(x.n).padStart(3)}   ${x.first} -> ${x.last}`);
}
console.log(`\n  metrics: ${METRICS.join(', ')}\n`);
