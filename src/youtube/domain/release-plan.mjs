/**
 * release-plan.mjs — when each Short goes out, and in what order.
 *
 * PREPARES ONLY. Nothing here calls YouTube. It produces a plan for a human to approve, and
 * the publish phase is what acts on it.
 *
 * TIMEZONE HANDLING IS THE PART THAT IS EASY TO GET WRONG. The canonical zone is
 * America/New_York and the slots are 19:00 and 22:00 LOCAL. Hardcoding UTC-4 would be correct
 * only between March and November: a launch block straddling the DST boundary would silently
 * shift one video by an hour, and a plan generated in July for a November publish would be
 * wrong by an hour for every entry. So local wall time is converted to a UTC instant through
 * the IANA database via Intl, which knows where the boundaries are.
 */

export const RELEASE = {
  timeZone: 'America/New_York',
  slots: ['19:00', '22:00'],
  /** Thursday through Monday. 4 = Thursday in JS getDay() terms. */
  days: [4, 5, 6, 0, 1],
  dayNames: ['Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'],
  perDay: 2,
};

/**
 * The offset of a zone at a given instant, in milliseconds.
 * Derived by formatting the instant in that zone and reading the difference back.
 */
function zoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +(p.hour % 24), +p.minute, +p.second);
  return asIfUtc - date.getTime();
}

/**
 * Convert a local wall-clock time in a zone to the correct UTC instant.
 *
 * Two passes: guess using the offset at the naive instant, then re-check the offset at the
 * corrected instant. The second pass is what makes a time near a DST transition land right.
 */
export function zonedToUtc({ year, month, day, hour, minute = 0 }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = zoneOffsetMs(new Date(naive), timeZone);
  let ts = naive - first;
  const second = zoneOffsetMs(new Date(ts), timeZone);
  if (second !== first) ts = naive - second;
  return new Date(ts);
}

/** The next date on or after `from` whose weekday matches. */
export function nextWeekday(from, weekday) {
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function trigrams(s) {
  const t = norm(s).replace(/\s/g, '');
  const out = new Set();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * How broadly recognisable each topic is.
 *
 * Ordering a launch is not the same problem as scoring a title. What matters first is whether
 * a stranger scrolling past instantly knows what the object IS -- everyone has seen a manhole
 * cover and a gas pump; fewer people have consciously noticed escalator brushes. Familiar
 * objects earn the strongest slots.
 *
 * Hand-ranked from the batch rather than computed, because there is no signal in the repo
 * that measures public familiarity and inventing one would be worse than admitting judgement.
 */
export const TOPIC_APPEAL = {
  'round-manhole-covers': { familiarity: 10, curiosity: 9, visual: 9, note: 'Everyone has seen one; the question is instantly graspable.' },
  'jeans-watch-pocket': { familiarity: 10, curiosity: 9, visual: 8, note: 'The viewer is probably wearing the object.' },
  'gas-pump-shutoff': { familiarity: 9, curiosity: 9, visual: 7, note: 'Universal experience, genuinely surprising mechanism.' },
  'airplane-window-hole': { familiarity: 8, curiosity: 9, visual: 8, note: 'Widely noticed, mildly alarming, strong hook.' },
  'microwave-door-mesh': { familiarity: 9, curiosity: 8, visual: 8, note: 'In every kitchen; the question sounds like a paradox.' },
  'pen-cap-hole': { familiarity: 9, curiosity: 8, visual: 6, note: 'Ubiquitous object, small visual premise.' },
  'old-book-smell': { familiarity: 8, curiosity: 7, visual: 5, note: 'Sensory rather than visual — hardest to animate.' },
  'highway-lane-lines': { familiarity: 8, curiosity: 8, visual: 7, note: 'Strong scale reveal, needs the payoff to land.' },
  'fuel-door-arrow': { familiarity: 7, curiosity: 8, visual: 6, note: 'Not everyone drives; huge payoff for those who do.' },
  'escalator-brushes': { familiarity: 6, curiosity: 9, visual: 8, note: 'Least-noticed object, but the contradiction is the best in the batch.' },
};

/**
 * Rank the batch for release order.
 *
 * Strength combines how recognisable the topic is with how good the chosen title turned out.
 * Familiarity is weighted hardest: on a channel with no subscribers, the first videos have to
 * work on people who have never heard of it, and an unfamiliar object asks for trust the
 * channel has not earned yet.
 */
export function rankForRelease(picks) {
  return picks
    .map((p) => {
      const a = TOPIC_APPEAL[p.contentId] ?? { familiarity: 6, curiosity: 6, visual: 6, note: '' };
      const strength = a.familiarity * 0.4 + a.curiosity * 0.3 + a.visual * 0.15
        + ((p.score ?? 70) / 10) * 0.15;
      return { ...p, appeal: a, strength: Math.round(strength * 100) / 100 };
    })
    .sort((x, y) => y.strength - x.strength);
}

/**
 * Order the ten so that semantically similar topics are not adjacent.
 *
 * Greedy from strongest: at each step take the strongest remaining topic that is not too
 * close to the one just placed. Two "hole in a thing" episodes back to back make the second
 * look like a repeat even when it is not.
 */
export function orderForDiversity(ranked, { maxAdjacentSimilarity = 0.33 } = {}) {
  const remaining = [...ranked];
  const out = [];
  while (remaining.length) {
    let idx = 0;
    if (out.length) {
      const prev = trigrams(`${out[out.length - 1].contentId} ${out[out.length - 1].title}`);
      const ok = remaining.findIndex((r) =>
        jaccard(prev, trigrams(`${r.contentId} ${r.title}`)) < maxAdjacentSimilarity);
      idx = ok >= 0 ? ok : 0;
    }
    out.push(remaining.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * Build the full schedule.
 *
 * @param picks   the chosen titles, one per episode
 * @param from    the earliest date the block may start (defaults to now)
 * @returns { startDate, entries, days }
 */
export function buildReleasePlan(picks, { from = new Date() } = {}) {
  const ordered = orderForDiversity(rankForRelease(picks));

  // The block always starts on a Thursday, and never today -- a plan generated at 19:30
  // cannot schedule a 19:00 slot that has already passed.
  const earliest = new Date(from);
  earliest.setUTCDate(earliest.getUTCDate() + 1);
  const firstThursday = nextWeekday(earliest, 4);

  const entries = [];
  for (let i = 0; i < ordered.length; i++) {
    const dayIndex = Math.floor(i / RELEASE.perDay);
    const slotIndex = i % RELEASE.perDay;

    const date = new Date(firstThursday);
    date.setUTCDate(date.getUTCDate() + dayIndex);

    const [hh, mm] = RELEASE.slots[slotIndex].split(':').map(Number);
    const publishAt = zonedToUtc({
      year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
      hour: hh, minute: mm,
    }, RELEASE.timeZone);

    entries.push({
      order: i + 1,
      contentId: ordered[i].contentId,
      title: ordered[i].title,
      score: ordered[i].score,
      strength: ordered[i].strength,
      reason: ordered[i].appeal.note,
      dayName: RELEASE.dayNames[dayIndex],
      localDate: date.toISOString().slice(0, 10),
      localTime: RELEASE.slots[slotIndex],
      timeZone: RELEASE.timeZone,
      publishAtUtc: publishAt.toISOString(),
      /*
       * Shown so a reader can confirm the DST handling by eye rather than trusting it.
       * `zoneOffsetMs` already returns the zone's offset FROM UTC (negative for New York),
       * so negating it printed "UTC+4" for a zone that is UTC-4 in August.
       */
      utcOffsetHours: zoneOffsetMs(publishAt, RELEASE.timeZone) / 3_600_000,
    });
  }

  return {
    timeZone: RELEASE.timeZone,
    slots: RELEASE.slots,
    startDate: firstThursday.toISOString().slice(0, 10),
    entries,
    scheduled: false,
    note: 'PREPARED ONLY. No schedule has been written to YouTube.',
  };
}
