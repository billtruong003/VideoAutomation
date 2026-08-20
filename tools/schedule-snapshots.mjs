/**
 * schedule-snapshots.mjs — queue the performance checkpoints for each scheduled video.
 *
 * Enqueues SYNC_ANALYTICS jobs at +1h, +6h, +24h, +72h and +7d after each video's
 * publishAt — not after upload. A video uploaded today and published next Thursday has
 * nothing to measure until Thursday, and a snapshot taken before publication would record
 * ten rows of zeroes and look like a failed integration.
 *
 * Reporting latency is expected and is NOT treated as failure: YouTube Analytics lags
 * real time by hours, so an early checkpoint legitimately returns partial data.
 *
 *   node tools/schedule-snapshots.mjs
 */

import { getDb, now } from '../src/youtube/db/index.mjs';
import { JOB_TYPE, JOB_STATE } from '../src/youtube/domain/states.mjs';

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
const videos = db.prepare(`
  SELECT v.video_id, v.content_id, v.publish_at FROM youtube_video v
  WHERE v.publish_at IS NOT NULL ORDER BY v.publish_at`).all();

const insert = db.prepare(`
  INSERT INTO job (type, content_id, state, idempotency_key, payload_json, next_retry_at, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?)
  ON CONFLICT(idempotency_key) DO NOTHING`);

let queued = 0;
let already = 0;
console.log('\n  ANALYTICS CHECKPOINTS\n');
for (const v of videos) {
  const base = Date.parse(v.publish_at);
  const marks = [];
  for (const cp of CHECKPOINTS) {
    const at = new Date(base + cp.ms).toISOString();
    // Idempotent on video + checkpoint, so re-running never double-queues.
    const key = `analytics:${v.video_id}:${cp.label}`;
    const before = db.prepare('SELECT 1 FROM job WHERE idempotency_key = ?').get(key);
    insert.run(JOB_TYPE.SYNC_ANALYTICS, v.content_id, JOB_STATE.PENDING, key,
      JSON.stringify({ videoId: v.video_id, checkpoint: cp.label, metrics: METRICS, dueAt: at }),
      at, now(), now());
    if (before) already++; else queued++;
    marks.push(cp.label);
  }
  console.log(`  ${v.content_id.padEnd(22)} ${v.video_id}  publishes ${v.publish_at}  ${marks.join(' ')}`);
}

console.log(`\n  ${queued} checkpoint jobs queued, ${already} already present`);
console.log(`  metrics: ${METRICS.join(', ')}`);
console.log('  each fires after its video publishes, not after upload\n');
