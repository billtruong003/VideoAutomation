#!/usr/bin/env node
/**
 * plan-batch-002-release.mjs — decide the ORDER and the INSTANTS, and prove neither collides.
 *
 *   node tools/plan-batch-002-release.mjs [--write]
 *
 * Two jobs, both of which are easy to get quietly wrong.
 *
 * ORDER. Publishing 01..20 in manifest order would put the two aviation episodes back to back
 * and stack four packaging topics together, because that is the order they were written in.
 * Research score alone has the same problem from the other direction. So the strongest topics
 * pull toward the front, and a set of constraints stops the schedule from ever pairing two
 * episodes that would feel like the same video twice in one day.
 *
 * INSTANTS. Every time here goes through Intl with a named zone. The offset between New York
 * and Seoul is not a constant, this batch spans ten days, and an hour of drift puts a Short in
 * front of the wrong audience. There is no hardcoded offset anywhere in this file — the KST
 * column is DERIVED from the same instant the NY column is, never computed from it.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = process.cwd();
const TZ = 'America/New_York';
const TZ_KST = 'Asia/Seoul';
const SLOTS = ['18:30', '21:30'];
const START_LOCAL_DATE = '2026-08-26';   // New York. Korea is the next calendar day.

/* ------------------------------------------------------ editorial inputs */

/**
 * Score, family and mechanism for each episode, from BATCH_002_RESEARCH.md.
 *
 * `family` prevents two topics from the same world landing on one day. `mechanism` is the
 * finer check: two different objects that resolve the same way (both "a gas protects the
 * contents") still feel like a repeat.
 */
const EPISODES = {
  'tactile-paving':          { score: 94, family: 'public',    mechanism: 'accessibility' },
  'airplane-ashtray':        { score: 91, family: 'aviation',  mechanism: 'regulation' },
  'beer-bottle-brown-glass': { score: 91, family: 'food',      mechanism: 'photochemistry' },
  'tape-measure-hook':       { score: 92, family: 'personal',  mechanism: 'mechanical' },
  'windshield-frit-dots':    { score: 90, family: 'car',       mechanism: 'materials' },
  'revolving-door':          { score: 90, family: 'public',    mechanism: 'pressure' },
  'coin-reeded-edges':       { score: 89, family: 'personal',  mechanism: 'anti-fraud' },
  'soda-can-neck':           { score: 89, family: 'food',      mechanism: 'economics' },
  'foil-shiny-dull':         { score: 88, family: 'food',      mechanism: 'manufacturing' },
  'chip-bag-nitrogen':       { score: 88, family: 'food',      mechanism: 'gas' },
  'cabin-lights-dim':        { score: 88, family: 'aviation',  mechanism: 'vision' },
  'thermal-receipt-fade':    { score: 88, family: 'personal',  mechanism: 'chemistry' },
  'sneaker-lace-lock':       { score: 87, family: 'personal',  mechanism: 'friction' },
  'convex-mirror-warning':   { score: 87, family: 'car',       mechanism: 'optics' },
  'third-brake-light':       { score: 86, family: 'car',       mechanism: 'vision' },
  'toilet-seat-gap':         { score: 86, family: 'public',    mechanism: 'regulation' },
  'ferrite-choke':           { score: 85, family: 'personal',  mechanism: 'emi' },
  'railway-ballast':         { score: 85, family: 'infra',     mechanism: 'load' },
  'brick-holes':             { score: 84, family: 'infra',     mechanism: 'manufacturing' },
  'padlock-drain-hole':      { score: 82, family: 'personal',  mechanism: 'drainage' },
};

/** A day is weak if BOTH its slots are below this. The batch should never have one. */
const WEAK = 86;

/* ----------------------------------------------------------- timezone */

const partsIn = (date, tz) => Object.fromEntries(
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
);

/**
 * The UTC instant at which a given wall-clock time occurs in a named zone.
 *
 * Two passes. Guess an instant, ask what the zone calls it, and correct by the error. One pass
 * is wrong near a DST transition because the offset you need depends on the answer you are
 * still computing; the second pass settles it. This is why no offset is written down anywhere
 * here — the zone database is asked, every time.
 */
function zonedToUtc(localDate, hhmm, tz) {
  const [y, m, d] = localDate.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm, 0);
  let instant = new Date(wanted);
  for (let pass = 0; pass < 2; pass++) {
    const p = partsIn(instant, tz);
    const seen = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    instant = new Date(instant.getTime() + (wanted - seen));
  }
  return instant;
}

const show = (date, tz) => new Intl.DateTimeFormat('en-CA', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(date).replace(',', ' ');

const addDays = (isoDate, n) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

/* -------------------------------------------------------------- order */

/**
 * EVERY DAY GETS AN ANCHOR.
 *
 * Pure strongest-first is the obvious approach and it fails in a specific way: it spends all
 * the good topics early and leaves the four weakest stacked across the last two days, so the
 * batch ends on its worst work twice in a row. Ranked order is right ACROSS days and wrong
 * WITHIN one.
 *
 * So the field is split. The top half are anchors, one per day at 18:30, in descending order —
 * the run still opens strong and declines gently. The bottom half fill 21:30, also descending,
 * so no day is ever two weak topics. Then the partner list is permuted to satisfy the
 * day-level diversity rules: not the same family, not the same mechanism, not the same title
 * grammar as the anchor it shares a day with.
 */
function orderEpisodes() {
  const ranked = Object.entries(EPISODES)
    .map(([slug, e]) => ({ slug, ...e }))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  const titles = JSON.parse(readFileSync(`${ROOT}/data/batch-002-scripts.json`, 'utf8')).episodes;
  const titleOf = new Map(titles.map((e) => [e.id, e.title]));
  const firstWord = (slug) => String(titleOf.get(slug) ?? '').split(' ')[0].toLowerCase();

  const days = ranked.length / SLOTS.length;
  const anchors = ranked.slice(0, days);
  const partners = ranked.slice(days);
  const notes = [];

  const clashes = (a, b) => a.family === b.family
    || a.mechanism === b.mechanism
    || firstWord(a.slug) === firstWord(b.slug);

  /*
   * Repair by swapping partners between days rather than by re-sorting.
   *
   * A swap keeps both days' scores in the same band, so fixing a family clash on day 3 cannot
   * quietly move a weak topic onto day 1. Bounded passes: this converges in one or two, and a
   * loop that cannot converge should report rather than spin.
   */
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let i = 0; i < days; i++) {
      if (!clashes(anchors[i], partners[i])) continue;
      const j = partners.findIndex((p, k) => k !== i
        && !clashes(anchors[i], p)
        && !clashes(anchors[k], partners[i]));
      if (j >= 0) {
        [partners[i], partners[j]] = [partners[j], partners[i]];
        changed = true;
      }
    }
    if (!changed) break;
  }

  const order = [];
  for (let i = 0; i < days; i++) {
    if (clashes(anchors[i], partners[i])) {
      notes.push(`day ${i + 1}: ${anchors[i].slug} + ${partners[i].slug} still share a family, mechanism or title grammar`);
    }
    order.push(anchors[i], partners[i]);
  }
  return { order, notes, titleOf };
}

/* ------------------------------------------------------------ schedule */

const liveTaken = new Set(
  (() => {
    try {
      return JSON.parse(readFileSync(`${ROOT}/data/live-state.json`, 'utf8'))
        .videos.map((v) => v.publishAt).filter(Boolean)
        .map((t) => new Date(t).toISOString());
    } catch { return []; }
  })(),
);

const { order, notes, titleOf } = orderEpisodes();
const rows = [];
const conflicts = [];

let dayOffset = 0;
let slotIndex = 0;
for (const ep of order) {
  let instant;
  for (;;) {
    const localDate = addDays(START_LOCAL_DATE, dayOffset);
    instant = zonedToUtc(localDate, SLOTS[slotIndex], TZ);
    const iso = instant.toISOString();

    // Advance the cursor for the next episode before testing, so a conflict simply moves on.
    slotIndex += 1;
    if (slotIndex >= SLOTS.length) { slotIndex = 0; dayOffset += 1; }

    if (!liveTaken.has(iso)) break;
    conflicts.push({ slug: ep.slug, blocked: iso });
  }

  rows.push({
    n: rows.length + 1,
    slug: ep.slug,
    title: titleOf.get(ep.slug),
    score: ep.score,
    family: ep.family,
    mechanism: ep.mechanism,
    publishAt: instant.toISOString(),
    ny: show(instant, TZ),
    kst: show(instant, TZ_KST),
  });
}

/* -------------------------------------------------------------- report */

console.log('#   episode                    sc  family    mechanism       NEW YORK           SEOUL              UTC');
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(2)}  ${r.slug.padEnd(25)} ${r.score}  ${r.family.padEnd(8)}  `
    + `${r.mechanism.padEnd(14)}  ${r.ny.padEnd(17)}  ${r.kst.padEnd(17)}  ${r.publishAt}`,
  );
}

console.log('');
console.log(`${rows.length} slots · ${rows.length / SLOTS.length} days · ${SLOTS.join(' and ')} ${TZ}`);
console.log(`NY window   ${rows[0].ny.slice(0, 10)} → ${rows[rows.length - 1].ny.slice(0, 10)}`);
console.log(`KST window  ${rows[0].kst.slice(0, 10)} → ${rows[rows.length - 1].kst.slice(0, 10)}`);

// Prove the day-level rules actually hold, rather than trusting the loop that applied them.
const problems = [];
for (let i = 0; i < rows.length; i += 2) {
  const [a, b] = [rows[i], rows[i + 1]];
  if (!b) continue;
  const day = a.ny.slice(0, 10);
  if (a.family === b.family) problems.push(`${day}: both ${a.family}`);
  if (a.mechanism === b.mechanism) problems.push(`${day}: both ${a.mechanism}`);
  if (a.score < WEAK && b.score < WEAK) problems.push(`${day}: two weak topics`);
}
console.log('');
console.log(problems.length ? `DIVERSITY PROBLEMS:\n  ${problems.join('\n  ')}` : 'diversity rules hold on every day');
for (const n of notes) console.log(`  note: ${n}`);
console.log(conflicts.length
  ? `CONFLICTS MOVED: ${conflicts.map((c) => `${c.slug} off ${c.blocked}`).join(', ')}`
  : 'no conflicts with existing live slots');

if (process.argv.includes('--write')) {
  const out = `${ROOT}/data/batch-002-release-plan.json`;
  writeFileSync(out, `${JSON.stringify({
    batch: 'batch-002',
    timezone: TZ,
    slots: SLOTS,
    startLocalDate: START_LOCAL_DATE,
    generatedFrom: 'research score + family/mechanism/title diversity constraints',
    entries: rows,
  }, null, 2)}\n`);
  console.log(`\nwrote ${out}`);
}
