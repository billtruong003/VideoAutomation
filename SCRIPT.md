# Episode 001 — Why Casinos Have No Clocks

**Channel:** We explain weird things with stupid drawings.
**Format:** YouTube Short, 1080×1920, 30 fps, 40.6 s
**Language:** English · **Audience:** global

---

## Narration (as delivered)

> Ever notice how many casinos seem to forget one tiny invention: the clock?
>
> That's not exactly an accident.
>
> Traditional casino design often kept clocks and windows scarce, removing obvious clues
> for how long you've been inside.
>
> The lights stay the same. The machines keep flashing. And the outside world basically
> disappears.
>
> So twenty minutes can start feeling a lot like two hours.
>
> But here's the twist: not every modern casino follows this rule.
>
> Some newer casinos deliberately use daylight, open spaces, and even clocks because
> making you comfortable can work too.
>
> So casinos don't literally ban clocks.
>
> The real trick is simpler:
>
> Control what you notice, keep you immersed, and make the outside world feel very, very
> far away.

**Deviation from the written script:** none of substance. The TTS voice renders "twenty
minutes" and "two hours" as the numerals `20` and `2`. Nothing else differs.

---

## Factual position

The title is the hook; the narration carries the nuance, and the video never resolves the
two dishonestly.

- The video does **not** claim all casinos ban clocks. It says clocks and windows were
  historically kept *scarce*.
- It explicitly states the opposite case: some modern casinos use daylight, open space and
  visible clocks, because comfort also works commercially.
- Scene 8 exists purely to correct the myth — **NOT BANNED** on screen, with a passer-by
  wearing a wristwatch as a second, quieter proof.
- The closing claim is about attention design ("control what you notice"), not a
  conspiracy about clocks.

No real casino, brand, venue or logo appears anywhere in the video.

---

## Scene breakdown

Boundaries come from `data/narration-timing.json`, derived from the locked processed
audio. Durations are unequal because speech dictates structure.

| # | Scene | In | Out | Dur | Beat that defines it |
|---|---|---|---|---|---|
| 1 | `hook` | 0.04 | 4.22 | 4.18 s | Clock yanked off the wall exactly on the word "clock" |
| 2 | `no-accident` | 4.45 | 5.70 | 1.25 s | A second character hides the stolen clock behind their back |
| 3 | `time-cues` | 5.90 | 11.86 | 5.96 s | Clock, window, daylight each removed on their spoken noun |
| 4 | `constant-environment` | 12.11 | 17.11 | 5.00 s | Lights never change; the outside world shrinks to a dot |
| 5 | `time-distortion` | 17.39 | 20.18 | 2.79 s | **20 MINUTES → 2 HOURS?!** — the room identical, Nib destroyed |
| 6 | `twist` | 20.42 | 23.63 | 3.21 s | **BUT…** record scratch, hard wipe to a bright casino |
| 7 | `modern-casino` | 23.96 | 30.11 | 6.15 s | Daylight, open space and a clock ADDED, one per spoken noun |
| 8 | `myth-correction` | 30.38 | 32.51 | 2.13 s | **NOT BANNED** stamped across an absurd clock |
| 9 | `final-idea` | 32.55 | 39.38 | 6.84 s | Swarm of distractions; the wallet drifts away unnoticed |

Video runs to **40.61 s** — narration plus a 1.15 s tail so the final gag lands before the
hard cut. No outro.

---

## Keyword synchronisation

Visual actions are anchored to spoken words, not to guessed times. All 23 anchors live in
`data/narration-timing.json` and are resolved by `kwIn()` at render time.

| Word | Time | Visual |
|---|---|---|
| casinos | 0.90 | marquee lights up |
| **clock** | 3.88 | clock violently yanked off-screen + **CLOCK?** |
| accident | 5.32 | culprit's innocent smile; Nib turns suspicious |
| clocks | 7.70 | clock pops out of existence |
| windows | 8.20 | window pops out of existence |
| inside | 11.38 | walls arrive at their tightest |
| lights | 12.30 | row of identical, unblinking ceiling lights |
| flashing | 14.24 | slot machine flashes on a 3-frame cycle |
| outside world | 15.21 | porthole to outside appears, starts shrinking |
| disappears | 16.51 | porthole shrinks to a dot and vanishes |
| **20 minutes** | 17.72 | **20 MINUTES** |
| **2 hours** | 19.72 | **2 HOURS?!** — hard swap to wrecked, camera shake |
| **twist** | 20.93 | **BUT…** record scratch, freeze, wipe |
| daylight | 25.74 | window + sun revealed |
| open spaces | 26.53 | camera opens out; plant and chair appear |
| clocks | 27.81 | a clock, openly ticking on the wall |
| comfortable | 28.97 | Nib sinks into the chair |
| **ban** | 31.64 | **NOT BANNED** |
| trick | 32.96 | back to the floor |
| notice | 34.55 | distractions start; the wallet begins to leave |
| immersed | 35.48 | swarm; spiral eyes; camera pushes in |
| outside world | 36.55 | camera rips back; the world becomes a square, then a dot |
| far away | 39.21 | Nib turns — wallet gone — horrified — hard cut |

---

## On-screen gag text

Only five, on purpose. Scarcity is what makes them land.

`CLOCK?` · `20 MINUTES` · `2 HOURS?!` · `BUT…` · `NOT BANNED`

Captions are separate: 44 chunks of ≤4 words, and only a curated handful of words
(clock/clocks, 20 minutes, 2 hours, twist, ban, daylight, windows, immersed) carry colour.
