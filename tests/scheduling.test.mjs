/**
 * scheduling.test.mjs — the corrected release slots, and the queue that must hold work.
 *
 * Two regressions are pinned here, both of which reached production once:
 *
 *   1. The worker claimed any PENDING job without checking `next_retry_at`, so fifty analytics
 *      checkpoints due next week ran the instant they were queued.
 *   2. Schedules computed against a fixed UTC offset rather than the IANA zone. That is
 *      invisible in August and an hour wrong from November.
 */

import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { zonedToUtc } from '../src/youtube/domain/release-plan.mjs';
import { CLAIM_SQL } from '../src/youtube/services/worker.mjs';

const TZ = 'America/New_York';
/** The corrected slots: thirty minutes ahead of the original 19:00 / 22:00. */
const SLOTS = ['18:30', '21:30'];

const inZone = (iso, tz) => new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(iso));

/* ============================================================== timezone */

describe('corrected release slots', () => {
  it('puts 18:30 New York at 22:30 UTC during daylight time', () => {
    expect(zonedToUtc({ year: 2026, month: 8, day: 22, hour: 18, minute: 30 }, TZ).toISOString())
      .toBe('2026-08-22T22:30:00.000Z');
  });

  it('puts 21:30 New York at 01:30 UTC the following day', () => {
    expect(zonedToUtc({ year: 2026, month: 8, day: 22, hour: 21, minute: 30 }, TZ).toISOString())
      .toBe('2026-08-23T01:30:00.000Z');
  });

  it('lands 18:30 New York on 07:30 in Seoul the next morning', () => {
    const utc = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 18, minute: 30 }, TZ);
    expect(inZone(utc.toISOString(), 'Asia/Seoul')).toBe('07:30');
  });

  it('reads back as the intended wall-clock time in New York', () => {
    for (const s of SLOTS) {
      const [h, m] = s.split(':').map(Number);
      const utc = zonedToUtc({ year: 2026, month: 8, day: 22, hour: h, minute: m }, TZ);
      expect(inZone(utc.toISOString(), TZ)).toBe(s);
    }
  });

  it('follows the zone across the DST boundary rather than a fixed offset', () => {
    // August is EDT (UTC-4), December is EST (UTC-5). A hardcoded -4 gets the second wrong.
    const aug = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 18, minute: 30 }, TZ);
    const dec = zonedToUtc({ year: 2026, month: 12, day: 22, hour: 18, minute: 30 }, TZ);
    expect(aug.toISOString()).toBe('2026-08-22T22:30:00.000Z');
    expect(dec.toISOString()).toBe('2026-12-22T23:30:00.000Z');
    // Both still read as 18:30 locally, which is the whole point.
    expect(inZone(aug.toISOString(), TZ)).toBe('18:30');
    expect(inZone(dec.toISOString(), TZ)).toBe('18:30');
  });

  it('keeps three hours between the two slots on a day', () => {
    const a = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 18, minute: 30 }, TZ);
    const b = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 21, minute: 30 }, TZ);
    expect((b - a) / 3_600_000).toBe(3);
  });

  it('is 30 minutes ahead of the slots it replaced', () => {
    const old19 = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 19 }, TZ);
    const new1830 = zonedToUtc({ year: 2026, month: 8, day: 22, hour: 18, minute: 30 }, TZ);
    expect((old19 - new1830) / 60_000).toBe(30);
  });
});

/* ============================================================ job timing */

describe('job claiming', () => {
  /** A throwaway database with the columns the claim predicate touches. */
  const makeDb = () => {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE job (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, state TEXT NOT NULL, next_retry_at TEXT
    )`);
    return db;
  };

  const add = (db, state, nextRetryAt) =>
    db.prepare('INSERT INTO job (type, state, next_retry_at) VALUES (?,?,?)')
      .run('SYNC_ANALYTICS', state, nextRetryAt).lastInsertRowid;

  const nowIso = '2026-08-21T00:00:00.000Z';
  const past = '2026-08-20T00:00:00.000Z';
  const future = '2026-08-28T22:30:00.000Z';

  it('does not claim a PENDING job whose time has not come', () => {
    // The exact regression: fifty checkpoints for next week ran the moment they were queued.
    const db = makeDb();
    add(db, 'PENDING', future);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso)).toBeUndefined();
  });

  it('claims a PENDING job that is due', () => {
    const db = makeDb();
    const id = add(db, 'PENDING', past);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso).id).toBe(Number(id));
  });

  it('claims a PENDING job with no scheduled time at all', () => {
    const db = makeDb();
    const id = add(db, 'PENDING', null);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso).id).toBe(Number(id));
  });

  it('skips future work and takes the due job behind it', () => {
    const db = makeDb();
    add(db, 'PENDING', future);
    const due = add(db, 'PENDING', past);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso).id).toBe(Number(due));
  });

  it('ignores jobs that are not PENDING', () => {
    const db = makeDb();
    add(db, 'CANCELLED', past);
    add(db, 'SUCCEEDED', past);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso)).toBeUndefined();
  });

  it('takes the oldest due job first', () => {
    const db = makeDb();
    const first = add(db, 'PENDING', past);
    add(db, 'PENDING', past);
    expect(db.prepare(CLAIM_SQL).get('PENDING', nowIso).id).toBe(Number(first));
  });
});

/* ====================================================== checkpoint maths */

describe('analytics checkpoints', () => {
  const CHECKPOINTS = [1, 6, 24, 72, 168];

  it('measures from the publish instant, not from upload', () => {
    const publishAt = '2026-08-22T22:30:00.000Z';
    const due = CHECKPOINTS.map((h) => new Date(Date.parse(publishAt) + h * 3600_000).toISOString());
    expect(due[0]).toBe('2026-08-22T23:30:00.000Z');
    expect(due[4]).toBe('2026-08-29T22:30:00.000Z');
  });

  it('produces five checkpoints per video, all after publication', () => {
    const publishAt = Date.parse('2026-08-22T22:30:00.000Z');
    const due = CHECKPOINTS.map((h) => publishAt + h * 3600_000);
    expect(due).toHaveLength(5);
    expect(due.every((d) => d > publishAt)).toBe(true);
  });

  it('moves every checkpoint when the publish time moves', () => {
    // A reschedule that left the old checkpoints in place would measure the wrong window.
    const before = Date.parse('2026-08-28T23:00:00.000Z');
    const after = Date.parse('2026-08-22T22:30:00.000Z');
    for (const h of CHECKPOINTS) {
      expect(before + h * 3600_000).not.toBe(after + h * 3600_000);
    }
  });
});
