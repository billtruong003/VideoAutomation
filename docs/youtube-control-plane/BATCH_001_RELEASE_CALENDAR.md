# Batch 001 — corrected release calendar

Supersedes the schedule in `BATCH_001_RELEASE_RECORD.md`. The original plan ran
2026-08-27 → 2026-08-31 at 19:00 / 22:00; the user then published one video and
scheduled a second by hand, and the rest were compacted forward.

**Live YouTube state is the source of truth for this table.** Every value was read back
from the API after the change.

## Slots

Two per day at **18:30** and **21:30 America/New_York** — thirty minutes ahead of the
original 19:00 / 22:00, so each Short is already circulating as the larger US evening
audience arrives rather than landing exactly on the peak. There is one `publishAt`; the
video goes public at the earlier time.

## Calendar

| New York | Seoul | UTC | Episode | Title | YouTube ID | State |
|---|---|---|---|---|---|---|
| Thu 20 Aug, 06:14 | Thu 20 Aug, 19:14 | 2026-08-20T10:14:37Z | jeans-watch-pocket | That Tiny Pocket on Your Jeans Has a Real Job | `b7vUEK2GeQg` | PUBLIC |
| Thu 20 Aug, 21:30 | Fri 21 Aug, 10:30 | 2026-08-21T01:30:00Z | round-manhole-covers | The Hidden Reason Manhole Covers Are Round | `pO4eFDH534M` | MANUAL — UNTOUCHED |
| Sat 22 Aug, 18:30 | Sun 23 Aug, 07:30 | 2026-08-22T22:30:00Z | gas-pump-shutoff | How a Gas Pump Knows Your Tank Is Full | `Ruuk2YGns0Q` | RESCHEDULED_VERIFIED |
| Sat 22 Aug, 21:30 | Sun 23 Aug, 10:30 | 2026-08-23T01:30:00Z | airplane-window-hole | Why Do Airplane Windows Have That Hole? | `v-GrIqc4mwU` | RESCHEDULED_VERIFIED |
| Sun 23 Aug, 18:30 | Mon 24 Aug, 07:30 | 2026-08-23T22:30:00Z | microwave-door-mesh | How Microwave Doors Use That Mesh | `Dw-KxQHtOvo` | RESCHEDULED_VERIFIED |
| Sun 23 Aug, 21:30 | Mon 24 Aug, 10:30 | 2026-08-24T01:30:00Z | pen-cap-hole | Your Pen Cap Has a Hole You've Never Used | `ta84aK1fBME` | RESCHEDULED_VERIFIED |
| Mon 24 Aug, 18:30 | Tue 25 Aug, 07:30 | 2026-08-24T22:30:00Z | highway-lane-lines | What Are Those Lane Lines on a Highway For? | `NtuMydEt_Pg` | RESCHEDULED_VERIFIED |
| Mon 24 Aug, 21:30 | Tue 25 Aug, 10:30 | 2026-08-25T01:30:00Z | fuel-door-arrow | That Tiny Arrow on Your Car Has a Real Job | `i-szEklcZek` | RESCHEDULED_VERIFIED |
| Tue 25 Aug, 18:30 | Wed 26 Aug, 07:30 | 2026-08-25T22:30:00Z | escalator-brushes | How Does an Escalator Use Those Brushes? | `oZW3qt1rWIo` | RESCHEDULED_VERIFIED |
| Tue 25 Aug, 21:30 | Wed 26 Aug, 10:30 | 2026-08-26T01:30:00Z | old-book-smell | What You're Actually Smelling in an Old Book | `Ji69OrC8YFQ` | RESCHEDULED_VERIFIED |

## What changed

| Episode | YouTube ID | Old publishAt | New publishAt | Verified |
|---|---|---|---|---|
| gas-pump-shutoff | `Ruuk2YGns0Q` | 2026-08-28T23:00:00Z | 2026-08-22T22:30:00.000Z | yes |
| airplane-window-hole | `v-GrIqc4mwU` | 2026-08-29T23:00:00Z | 2026-08-23T01:30:00.000Z | yes |
| microwave-door-mesh | `Dw-KxQHtOvo` | 2026-08-29T02:00:00Z | 2026-08-23T22:30:00.000Z | yes |
| pen-cap-hole | `ta84aK1fBME` | 2026-08-30T02:00:00Z | 2026-08-24T01:30:00.000Z | yes |
| highway-lane-lines | `NtuMydEt_Pg` | 2026-08-30T23:00:00Z | 2026-08-24T22:30:00.000Z | yes |
| fuel-door-arrow | `i-szEklcZek` | 2026-08-31T23:00:00Z | 2026-08-25T01:30:00.000Z | yes |
| escalator-brushes | `oZW3qt1rWIo` | 2026-08-31T02:00:00Z | 2026-08-25T22:30:00.000Z | yes |
| old-book-smell | `Ji69OrC8YFQ` | 2026-09-01T02:00:00Z | 2026-08-26T01:30:00.000Z | yes |

## Order

Two swaps against the approved order, both forced by compaction rather than by taste.
Removing the published and the manually-scheduled episode from the middle of the ten
pulled pairs together that were never adjacent in the plan the user approved:

- `airplane-window-hole` and `microwave-door-mesh` swapped — otherwise day 1 carried two
  MECHANISM titles both opening "How".
- `fuel-door-arrow` and `escalator-brushes` swapped — otherwise day 3 carried two
  QUESTION titles, and day 2 paired two episodes both about a hole.

All eight permutations were enumerated; this is the collision-free order closest to the
one approved. No title, description or tag was regenerated.

## Untouched

| Episode | YouTube ID | Why |
|---|---|---|
| jeans-watch-pocket | `b7vUEK2GeQg` | already public — published by hand 2026-08-20T10:14:37Z |
| round-manhole-covers | `pO4eFDH534M` | scheduled by hand for today, 21:30 New York |

## Analytics

50 checkpoints rebuilt from the corrected publish instants at +1h, +6h, +24h, +72h, +7d.
The 50 keyed to the old schedule were cancelled as SUPERSEDED rather than deleted, so the
record of what was planned survives.
