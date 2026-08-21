# Batch 001 — corrected release calendar (Seoul-anchored)

Supersedes the New York-anchored table in the previous revision.

## Why the dates moved again

The slots are 18:30 and 21:30 **America/New_York** — that is where the audience decision
lives, and it has not changed. What was wrong was the anchor: a New York evening lands on
the FOLLOWING morning in Seoul, so anchoring the block on "New York 22 Aug" put the first
video on **Sunday 23rd** for the person reading the calendar. The block is now anchored on
the first **Seoul** date, and the New York start day is derived from it rather than assumed.

Each day-pair also lands on a single Seoul date: 18:30 and 21:30 New York become 07:30 and
10:30 the next morning in Seoul, so "two per day" holds in both calendars.

## Calendar

| Seoul | New York | UTC | Episode | YouTube ID | State |
|---|---|---|---|---|---|
| Thu 20 Aug, 19:14 | Thu 20 Aug, 06:14 | 2026-08-20T10:14:37Z | jeans-watch-pocket | `b7vUEK2GeQg` | PUBLIC — untouched |
| Fri 21 Aug, 10:30 | Thu 20 Aug, 21:30 | 2026-08-21T01:30:00Z | round-manhole-covers | `pO4eFDH534M` | MANUAL — untouched |
| Sat 22 Aug, 07:30 | Fri 21 Aug, 18:30 | 2026-08-21T22:30:00.000Z | gas-pump-shutoff | `Ruuk2YGns0Q` | RESCHEDULED_VERIFIED |
| Sat 22 Aug, 10:30 | Fri 21 Aug, 21:30 | 2026-08-22T01:30:00.000Z | airplane-window-hole | `v-GrIqc4mwU` | PENDING — quota |
| Sun 23 Aug, 07:30 | Sat 22 Aug, 18:30 | 2026-08-22T22:30:00.000Z | microwave-door-mesh | `Dw-KxQHtOvo` | PENDING — quota |
| Sun 23 Aug, 10:30 | Sat 22 Aug, 21:30 | 2026-08-23T01:30:00.000Z | pen-cap-hole | `ta84aK1fBME` | PENDING — quota |
| Mon 24 Aug, 07:30 | Sun 23 Aug, 18:30 | 2026-08-23T22:30:00.000Z | highway-lane-lines | `NtuMydEt_Pg` | PENDING — quota |
| Mon 24 Aug, 10:30 | Sun 23 Aug, 21:30 | 2026-08-24T01:30:00.000Z | fuel-door-arrow | `i-szEklcZek` | PENDING — quota |
| Tue 25 Aug, 07:30 | Mon 24 Aug, 18:30 | 2026-08-24T22:30:00.000Z | escalator-brushes | `oZW3qt1rWIo` | PENDING — quota |
| Tue 25 Aug, 10:30 | Mon 24 Aug, 21:30 | 2026-08-25T01:30:00.000Z | old-book-smell | `Ji69OrC8YFQ` | PENDING — quota |

## Outstanding: daily API quota

The correction stopped partway through on `quotaExceeded`. Ten uploads at 1,600 units each
had already spent well past the 10,000-unit daily allowance before the schedule change
began, and a schedule update costs 50 units on top of that.

`gas-pump-shutoff` moved before the budget ran out; **seven remain**. Nothing publishes
incorrectly in the meantime — the earliest un-corrected video is not due until well after
the reset.

Quota resets at **00:00 America/Los_Angeles**. To finish:

```bash
node tools/finish-reschedule.mjs
```

It is idempotent: it skips whatever is already at its target time, moves the rest, then
rebuilds the analytics checkpoints from the live publish instants. It exits with code 2 if
quota is still exhausted. A scheduled task is also armed to run it automatically after the
reset.

## Untouched

| Episode | YouTube ID | Why |
|---|---|---|
| jeans-watch-pocket | `b7vUEK2GeQg` | already public — published by hand 2026-08-20T10:14:37Z |
| round-manhole-covers | `pO4eFDH534M` | scheduled by hand for 21:30 New York / 10:30 Seoul |
