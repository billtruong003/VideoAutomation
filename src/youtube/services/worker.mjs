/**
 * worker.mjs — the in-process background job runner.
 *
 * One worker, polling a SQLite table. No broker, no external queue: for a single-user desktop
 * app those add operational surface without buying anything.
 *
 * Two properties matter more than throughput:
 *
 *   1. SURVIVES RESTART. Job state is in the database, not in memory, so closing the app and
 *      reopening it resumes rather than forgets. A `RUNNING` job found at startup was
 *      interrupted by a crash and is returned to `PENDING`.
 *
 *   2. RETRIES ONLY WHAT RETRYING CAN FIX. `QUOTA_EXCEEDED` and `SCOPE_MISSING` are states, not
 *      transient faults; retrying them burns budget on an outcome that cannot change.
 */

import { getDb, now } from '../db/index.mjs';
import { JOB_STATE, JOB_TYPE, PUBLISH_STATE } from '../domain/states.mjs';
import { log } from '../server/logger.mjs';

const POLL_MS = 1000;
const RETRYABLE = new Set(['UPSTREAM_ERROR', 'NETWORK', 'INTERNAL']);

let timer = null;
let running = false;

/** Backoff: 5s, 15s, 45s, 135s … capped. */
const backoffMs = (attempt) => Math.min(5_000 * 3 ** attempt, 15 * 60_000);

export function startWorker() {
  const db = getDb();

  // Anything left RUNNING was interrupted mid-flight by a crash or a close.
  const orphans = db.prepare('SELECT id FROM job WHERE state = ?').all(JOB_STATE.RUNNING);
  if (orphans.length) {
    db.prepare('UPDATE job SET state = ?, updated_at = ? WHERE state = ?')
      .run(JOB_STATE.PENDING, now(), JOB_STATE.RUNNING);
    log.warn('recovered interrupted jobs', { count: orphans.length });
  }

  timer = setInterval(tick, POLL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}

async function tick() {
  if (running) return;
  const db = getDb();

  // Promote any retry whose wait has elapsed.
  db.prepare(`UPDATE job SET state = ?, updated_at = ?
              WHERE state = ? AND next_retry_at IS NOT NULL AND next_retry_at <= ?`)
    .run(JOB_STATE.PENDING, now(), JOB_STATE.RETRY_WAIT, now());

  // Claim exactly one job in a transaction — a double-click cannot take it twice.
  const claim = db.transaction(() => {
    const j = db.prepare('SELECT * FROM job WHERE state = ? ORDER BY id ASC LIMIT 1').get(JOB_STATE.PENDING);
    if (!j) return null;
    db.prepare('UPDATE job SET state = ?, attempt = attempt + 1, updated_at = ? WHERE id = ?')
      .run(JOB_STATE.RUNNING, now(), j.id);
    return j;
  });

  const job = claim();
  if (!job) return;

  running = true;
  try {
    await runJob(job);
    db.prepare('UPDATE job SET state = ?, progress = 1, updated_at = ? WHERE id = ?')
      .run(JOB_STATE.SUCCEEDED, now(), job.id);
    log.info('job succeeded', { jobId: job.id, type: job.type });
  } catch (err) {
    const code = err?.code ?? 'INTERNAL';
    const attempt = (job.attempt ?? 0) + 1;
    const canRetry = RETRYABLE.has(code) && attempt < (job.max_attempts ?? 5);

    db.prepare(`UPDATE job SET state = ?, error_code = ?, error_message = ?, next_retry_at = ?, updated_at = ?
                WHERE id = ?`).run(
      canRetry ? JOB_STATE.RETRY_WAIT : JOB_STATE.FAILED,
      code, String(err?.message ?? '').slice(0, 400),
      canRetry ? new Date(Date.now() + backoffMs(attempt)).toISOString() : null,
      now(), job.id,
    );

    if (!canRetry && job.content_id) {
      db.prepare('UPDATE content_item SET publish_state = ?, updated_at = ? WHERE content_id = ?')
        .run(PUBLISH_STATE.FAILED, now(), job.content_id);
    }
    log.error('job failed', { jobId: job.id, type: job.type, code, retry: canRetry });
  } finally {
    running = false;
  }
}

async function runJob(job) {
  const db = getDb();
  switch (job.type) {
    case JOB_TYPE.DRY_RUN: {
      // Deliberately harmless. Exercises claim → progress → success without any network call,
      // so the queue can be verified end to end without touching the real channel.
      const steps = JSON.parse(job.payload_json ?? '{}').steps ?? 5;
      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, 400));
        db.prepare('UPDATE job SET progress = ?, updated_at = ? WHERE id = ?').run(i / steps, now(), job.id);
      }
      return;
    }
    case JOB_TYPE.UPLOAD_VIDEO:
      // The upload implementation lives in upload.mjs and is only reachable from an
      // explicitly confirmed, approved job. It is never triggered by the worker on its own.
      return (await import('./upload.mjs')).runUploadJob(job);
    default:
      throw Object.assign(new Error(`Unhandled job type ${job.type}`), { code: 'INTERNAL' });
  }
}
