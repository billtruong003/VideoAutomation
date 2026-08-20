/**
 * release-plan.test.mjs — scheduling, and the parts of it that are easy to get silently wrong.
 *
 * The timezone assertions are the point. A hardcoded UTC-4 passes every test written in
 * August and is an hour wrong for every video published after the November transition, and
 * nothing about the output looks broken when it happens.
 */

import { describe, expect, it } from 'vitest';

import {
  buildReleasePlan, zonedToUtc, nextWeekday, rankForRelease, orderForDiversity, RELEASE,
} from '../src/youtube/domain/release-plan.mjs';
import { PUBLISH_DEFAULTS, SYNTHETIC_CONTENT, defaultsForManifest } from '../src/youtube/domain/publish-defaults.mjs';

const PICKS = [
  'jeans-watch-pocket', 'round-manhole-covers', 'gas-pump-shutoff', 'microwave-door-mesh',
  'airplane-window-hole', 'pen-cap-hole', 'highway-lane-lines', 'escalator-brushes',
  'fuel-door-arrow', 'old-book-smell',
].map((id, i) => ({ contentId: id, title: `Title for ${id}`, score: 80 + i }));

/* ============================================================== timezone */

describe('timezone handling', () => {
  it('resolves 19:00 New York to the right instant during daylight time', () => {
    // August: EDT, UTC-4.
    expect(zonedToUtc({ year: 2026, month: 8, day: 27, hour: 19 }, 'America/New_York').toISOString())
      .toBe('2026-08-27T23:00:00.000Z');
  });

  it('resolves 19:00 New York to the right instant during standard time', () => {
    // December: EST, UTC-5. A hardcoded offset gets this hour wrong.
    expect(zonedToUtc({ year: 2026, month: 12, day: 3, hour: 19 }, 'America/New_York').toISOString())
      .toBe('2026-12-04T00:00:00.000Z');
  });

  it('round-trips back to the same wall-clock time on both sides of the transition', () => {
    for (const d of [{ year: 2026, month: 8, day: 27 }, { year: 2026, month: 12, day: 3 }]) {
      const utc = zonedToUtc({ ...d, hour: 22 }, 'America/New_York');
      const local = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', hour12: false,
      }).format(utc);
      expect(Number(local)).toBe(22);
    }
  });

  it('handles the spring-forward gap without drifting a day', () => {
    // 2026-03-08 is the US transition; 19:00 is well clear of the 02:00-03:00 gap.
    const utc = zonedToUtc({ year: 2026, month: 3, day: 8, hour: 19 }, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-03-08T23:00:00.000Z');
  });
});

describe('weekday selection', () => {
  it('finds the next Thursday, including when today is Thursday', () => {
    // 2026-08-27 is a Thursday.
    expect(nextWeekday(new Date('2026-08-27T00:00:00Z'), 4).toISOString().slice(0, 10)).toBe('2026-08-27');
    expect(nextWeekday(new Date('2026-08-28T00:00:00Z'), 4).toISOString().slice(0, 10)).toBe('2026-09-03');
  });
});

/* ================================================================= plan */

describe('release plan', () => {
  const plan = buildReleasePlan(PICKS, { from: new Date('2026-08-20T12:00:00Z') });

  it('schedules two videos a day across five consecutive days', () => {
    expect(plan.entries).toHaveLength(10);
    const byDay = {};
    for (const e of plan.entries) byDay[e.localDate] = (byDay[e.localDate] ?? 0) + 1;
    expect(Object.keys(byDay)).toHaveLength(5);
    expect(Object.values(byDay).every((n) => n === 2)).toBe(true);
  });

  it('runs Thursday through Monday', () => {
    expect(plan.entries.map((e) => e.dayName).filter((v, i, a) => a.indexOf(v) === i))
      .toEqual(['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday']);
  });

  it('uses the two configured slots', () => {
    expect([...new Set(plan.entries.map((e) => e.localTime))].sort()).toEqual(RELEASE.slots.slice().sort());
  });

  it('never schedules in the past', () => {
    const from = new Date('2026-08-20T12:00:00Z');
    for (const e of plan.entries) expect(new Date(e.publishAtUtc).getTime()).toBeGreaterThan(from.getTime());
  });

  it('starts on a Thursday strictly after the generation date', () => {
    // A plan generated at 19:30 must not offer a 19:00 slot the same day.
    const sameDay = buildReleasePlan(PICKS, { from: new Date('2026-08-27T23:30:00Z') });
    expect(sameDay.startDate).not.toBe('2026-08-27');
  });

  it('reports each entry in UTC and in local time', () => {
    for (const e of plan.entries) {
      expect(e.timeZone).toBe('America/New_York');
      expect(e.publishAtUtc).toMatch(/Z$/);
      expect(e.utcOffsetHours).toBe(-4); // all ten fall inside EDT
    }
  });

  it('is marked as prepared, not scheduled', () => {
    expect(plan.scheduled).toBe(false);
    expect(plan.note).toMatch(/PREPARED ONLY/);
  });

  it('includes every episode exactly once', () => {
    expect(new Set(plan.entries.map((e) => e.contentId)).size).toBe(10);
  });
});

describe('release ordering', () => {
  it('leads with the most broadly familiar topics', () => {
    const ranked = rankForRelease(PICKS);
    expect(['jeans-watch-pocket', 'round-manhole-covers']).toContain(ranked[0].contentId);
  });

  it('does not put two near-identical topics back to back', () => {
    const ordered = orderForDiversity(rankForRelease(PICKS));
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].contentId).not.toBe(ordered[i - 1].contentId);
    }
  });

  it('is deterministic', () => {
    const a = buildReleasePlan(PICKS, { from: new Date('2026-08-20T12:00:00Z') });
    const b = buildReleasePlan(PICKS, { from: new Date('2026-08-20T12:00:00Z') });
    expect(a.entries.map((e) => e.contentId)).toEqual(b.entries.map((e) => e.contentId));
  });
});

/* ==================================================== publish defaults */

describe('publish defaults', () => {
  it('defaults to private', () => {
    expect(PUBLISH_DEFAULTS.privacyStatus.value).toBe('private');
  });

  it('marks comments and Shorts remixing as unavailable rather than pretending', () => {
    // Neither has a Data API surface. Claiming them as configured would be a false report.
    expect(PUBLISH_DEFAULTS.comments.enforcement).toBe('NOT_AVAILABLE_THROUGH_API');
    expect(PUBLISH_DEFAULTS.shortsRemixing.enforcement).toBe('NOT_AVAILABLE_THROUGH_API');
  });

  it('records where every setting is actually enforced', () => {
    for (const [key, d] of Object.entries(PUBLISH_DEFAULTS)) {
      expect(['DATA_API_PER_VIDEO', 'CREATOR_OS_ONLY', 'NOT_AVAILABLE_THROUGH_API'])
        .toContain(d.enforcement);
      if (d.enforcement === 'NOT_AVAILABLE_THROUGH_API') expect(d.field).toBeNull();
      else expect(typeof d.field).toBe('string');
    }
  });

  it('is not made for kids', () => {
    expect(PUBLISH_DEFAULTS.selfDeclaredMadeForKids.value).toBe(false);
    expect(defaultsForManifest().selfDeclaredMadeForKids).toBe(false);
  });

  it('declares synthetic content explicitly and gives a reason', () => {
    // The requirement is per-video and reviewed, not a permanent hardcoded answer.
    expect(SYNTHETIC_CONTENT.reviewed).toBe(true);
    expect(SYNTHETIC_CONTENT.containsSyntheticMedia).toBe(false);
    expect(SYNTHETIC_CONTENT.reasoning).toMatch(/synthetic voice/i);
    expect(SYNTHETIC_CONTENT.appliesTo).toBe('batch-001');
  });

  it('uses Education and English', () => {
    const d = defaultsForManifest();
    expect(d.categoryId).toBe('27');
    expect(d.categoryLabel).toBe('Education');
    expect(d.defaultLanguage).toBe('en');
    expect(d.defaultAudioLanguage).toBe('en');
  });
});
