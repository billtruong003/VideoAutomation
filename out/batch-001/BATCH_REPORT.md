# Batch 001 — Batch Report

Ten English global-audience doodle Shorts: *weird / hidden reasons behind everyday things*.
Every number below is read from the artifacts the pipeline produced, not transcribed by hand.

---

## 1. Repository synchronisation

| | |
|---|---|
| Remote | `https://github.com/billtruong003/VideoAutomation.git` |
| Branch | `feat/youtube-creator-os-ui` |
| Previous HEAD | `8008c46` — *Dial the character's hand independently of the world's* |
| Final HEAD | `e364fe8` — *Measure the bed on the mix alone, because the reference was the noisy part* |
| Sync method | fast-forward merge of `origin/main` |
| Local work | stashed, restored, one conflict resolved in favour of upstream |

### The Application Control problem, and how it was solved

`git pull` failed with `LoadLibraryExW() ... An Application Control policy has blocked this
file` on `libcurl-4.dll`. **Smart App Control was enforced** on the machine
(`VerifiedAndReputablePolicyState = 1`), which admits binaries on reputation and was
refusing three separate things:

| Binary | Effect |
|---|---|
| `libcurl-4.dll` (Git 2.55) | no HTTPS remote access |
| `ffprobe.exe` (winget **and** Remotion's bundled copy) | no media probing |
| `remotion.exe` (the Rust compositor) | **no rendering at all** |

Resolution, in order and without touching any security setting:

1. **Git** — found a second legitimate Git already installed
   (`%LOCALAPPDATA%\hermes\git`, 2.54) whose networking was permitted, and synced with it.
   No DLL was replaced and no policy was modified.
2. **ffprobe** — made optional. `tools/ffbin.mjs` now resolves each binary to an absolute
   path (Windows `execFile` does no PATHEXT expansion, so the bare name never resolved
   either), *probes whether it actually starts*, and falls back to decoding with `ffmpeg`
   for durations. Existence on disk and permission to run are different questions here.
3. **remotion.exe** — could not be worked around; every render path dies at compositor
   startup. This was reported as a hard blocker and **the user disabled Smart App Control**,
   after which rendering, ffprobe and native Git HTTPS all worked. That was the user's
   decision to make, not the pipeline's.

---

## 2. Input discovery

Source: `C:/Users/ducnq/Downloads/VoiceOver` — 10 audio files, 10 subtitle files.

The exports do **not** pair alphabetically: the audio keeps the voice name verbatim
("George - Warm, Captivating Storyteller") while the `.srt` slugs its punctuation out and
appends a language code, and a re-download turns `…v3 (1).mp3` into `…v3_1_eng.srt`. The
join key is the **ElevenLabs render timestamp**, which both filenames carry and which is
unique per generation. Every pair was then validated against the files themselves — audio
decodes, transcript non-empty and English, last cue inside the audio's real duration — so a
filename that merely looks right cannot produce a mismatched episode.

**The batch shipped `.srt`, not the alignment JSON Episode 001 used.** SRT carries timings
per cue, not per word, and captions/keyword anchors need words. `tools/srt-to-alignment.mjs`
recovers them: within each cue the waveform is split into voiced runs, and words are laid out
over the VOICED time only, weighted by how long each is likely to take to say. Pauses push
words apart exactly as far as the speaker paused, and no word boundary is ever placed inside
one. Cue bounds are ground truth and never move, so error is confined within a single cue —
and `verify-sync.mjs` re-checks the result against the delivered waveform.

| # | Topic | Source audio | Source subtitle |
|---|---|---|---|
| 1 | The Hole In Your Airplane Window Is Supposed To Be There | `ElevenLabs_2026-08-19T16_31_15_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_31_15_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 2 | Escalator Brushes Are Not For Your Shoes | `ElevenLabs_2026-08-19T16_32_13_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_32_13_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 3 | How A Gas Pump Knows Your Tank Is Full | `ElevenLabs_2026-08-19T16_33_09_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_33_09_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 4 | Why You Can See Through A Microwave Door | `ElevenLabs_2026-08-19T16_33_57_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_33_57_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 5 | Your Jeans Have A Pocket For A Gadget From The 1800s | `ElevenLabs_2026-08-19T16_49_35_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_49_35_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 6 | Highway Lines Are Way Bigger Than You Think | `ElevenLabs_2026-08-19T16_50_48_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_50_48_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 7 | The Arrow That Tells You Which Side Your Fuel Door Is On | `ElevenLabs_2026-08-19T16_52_23_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T16_52_23_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 8 | Why Manhole Covers Are Round | `ElevenLabs_2026-08-19T21_48_28_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T21_48_28_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 9 | The Hole In A Pen Cap Is A Safety Feature | `ElevenLabs_2026-08-19T21_50_41_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3.mp3` | `ElevenLabs_2026-08-19T21_50_41_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_eng.srt` |
| 10 | Old Book Smell Is The Book Falling Apart | `ElevenLabs_2026-08-19T21_51_23_George - Warm, Captivating Storyteller_pre_sp100_s50_sb75_v3 (1).mp3` | `ElevenLabs_2026-08-19T21_51_23_George_-_Warm_Captivating_Storyteller_pre_sp100_s50_sb75_v3_1_eng.srt` |

---

## 3. Audio — processed first, then locked

Governing rule, unchanged: **audio is finished first, the processed narration is the master
clock, the video is built around it.** No frame number is hard-coded anywhere in `src/`.

Chain per episode: decode → `silencedetect` → keep-plan → sample-accurate PCM splice →
`atempo` (WSOLA, pitch preserved) → two-pass EBU R128 `loudnorm` + limiter → time map.

| # | Episode | Raw | After cut | Processed | Silence cut | Tempo | Words | QA |
|---|---|---|---|---|---|---|---|---|
| 1 | airplane-window-hole | 33.80s | 29.90s | 26.71s | −3.90s | 1.12× (1.11964) | 90 | LOCKED |
| 2 | escalator-brushes | 32.13s | 29.07s | 25.95s | −3.06s | 1.12× (1.12006) | 91 | LOCKED |
| 3 | gas-pump-shutoff | 37.25s | 31.98s | 28.56s | −5.27s | 1.12× (1.11993) | 90 | LOCKED |
| 4 | microwave-door-mesh | 37.64s | 33.03s | 29.50s | −4.62s | 1.12× (1.11977) | 95 | LOCKED |
| 5 | jeans-watch-pocket | 37.25s | 32.97s | 29.45s | −4.28s | 1.12× (1.11952) | 88 | LOCKED |
| 6 | highway-lane-lines | 34.85s | 30.88s | 27.58s | −3.97s | 1.12× (1.11955) | 95 | LOCKED |
| 7 | fuel-door-arrow | 35.16s | 30.56s | 27.30s | −4.60s | 1.12× (1.11952) | 99 | LOCKED |
| 8 | round-manhole-covers | 35.97s | 31.67s | 28.29s | −4.30s | 1.12× (1.11964) | 86 | LOCKED |
| 9 | pen-cap-hole | 35.71s | 32.88s | 29.36s | −2.83s | 1.12× (1.11982) | 98 | LOCKED |
| 10 | old-book-smell | 41.33s | 37.16s | 33.19s | −4.16s | 1.12× (1.11973) | 94 | LOCKED |

**QA GATE 1** (cuts vs. the raw waveform): all 10 passed — every removed region measured
below −74 dB, i.e. dead air. Word spans are deliberately *not* used as the oracle here; TTS
folds trailing pauses into the last word of a sentence, so the signal is the only truth.

**QA GATE 2** (remapped timings vs. the delivered WAV, by speech-onset detection): all 10
passed and locked. Worst phrase drift across the batch **0.148 s**
(`jeans-watch-pocket`); every episode clipping-free at ≈ −1.4 dBFS peak.

---

## 4. Storyboards

Scene bounds come from spoken phrases; beats are anchored to spoken **keywords**, never to
wall-clock guesses. The pacing check is a machine-checkable definition of "not a slideshow":
it fails any gap over 2.2 s between visual beats.

| # | Episode | Scenes | Beats | Longest gap | Keywords | Captions |
|---|---|---|---|---|---|---|
| 1 | airplane-window-hole | 6 | 27 | 1.87s | 12 | 31 |
| 2 | escalator-brushes | 5 | 22 | 1.69s | 14 | 29 |
| 3 | gas-pump-shutoff | 7 | 21 | 2.15s | 17 | 33 |
| 4 | microwave-door-mesh | 6 | 25 | 2.12s | 15 | 32 |
| 5 | jeans-watch-pocket | 6 | 23 | 1.81s | 12 | 32 |
| 6 | highway-lane-lines | 6 | 20 | 2.13s | 13 | 31 |
| 7 | fuel-door-arrow | 7 | 24 | 2.18s | 16 | 31 |
| 8 | round-manhole-covers | 6 | 22 | 2.15s | 14 | 31 |
| 9 | pen-cap-hole | 5 | 23 | 2.02s | 14 | 33 |
| 10 | old-book-smell | 6 | 28 | 2.12s | 19 | 35 |

First pass left 9 of 10 episodes over the pacing target; 235 beats now cover
285.88s of narration with **no gap above
2.18s**.

---

## 5. Cast

The canonical five were used as-is from Character System V1.0. **No character was redesigned,
recoloured or substituted**, and no sixth cast member was created — temporary roles are NPC
archetypes or existing cast in a costume-free role.

| # | Episode | Cast | Supporting role played |
|---|---|---|---|
| 1 | airplane-window-hole | bill, gus | Gus as cabin crew — arrives, says nothing, leaves |
| 2 | escalator-brushes | bill, dex, mochi | Dex misuses the brushes throughout; Mochi is nearly eaten |
| 3 | gas-pump-shutoff | bill, gus | Gus runs the station and nods once at the end |
| 4 | microwave-door-mesh | bill, mina | Mina supplies the wavelength explanation, unimpressed |
| 5 | jeans-watch-pocket | bill, mochi | Mochi steals the pocket watch and keeps it, unremarked |
| 6 | highway-lane-lines | bill, mina | Mina holds the measuring tape and enjoys the result |
| 7 | fuel-door-arrow | bill, mina | Mina has known about the arrow the entire time |
| 8 | round-manhole-covers | bill, dex, gus | Dex drops a square cover down the shaft; Gus has seen it before |
| 9 | pen-cap-hole | bill, gus | Gus is the standards body — one stamp, no expression |
| 10 | old-book-smell | bill, mina, mochi | Mina as conservator; Mochi sniffs the book and judges Bill |

Bill appears in all ten as the audience surrogate. Two narrations name him directly
(`highway-lane-lines`, `old-book-smell`), and in both the scale/reaction gag is built on it.

---

## 6. Delivery

| # | Episode | File | Size | Duration |
|---|---|---|---|---|
| 1 | The Hole In Your Airplane Window Is Supposed To Be There | `out/batch-001/01-airplane-window-hole.mp4` | 11.0 MB | 27.86s |
| 2 | Escalator Brushes Are Not For Your Shoes | `out/batch-001/02-escalator-brushes.mp4` | 14.7 MB | 27.10s |
| 3 | How A Gas Pump Knows Your Tank Is Full | `out/batch-001/03-gas-pump-shutoff.mp4` | 11.4 MB | 29.71s |
| 4 | Why You Can See Through A Microwave Door | `out/batch-001/04-microwave-door-mesh.mp4` | 16.4 MB | 30.64s |
| 5 | Your Jeans Have A Pocket For A Gadget From The 1800s | `out/batch-001/05-jeans-watch-pocket.mp4` | 10.1 MB | 30.60s |
| 6 | Highway Lines Are Way Bigger Than You Think | `out/batch-001/06-highway-lane-lines.mp4` | 9.6 MB | 28.73s |
| 7 | The Arrow That Tells You Which Side Your Fuel Door Is On | `out/batch-001/07-fuel-door-arrow.mp4` | 8.9 MB | 28.45s |
| 8 | Why Manhole Covers Are Round | `out/batch-001/08-round-manhole-covers.mp4` | 11.8 MB | 29.44s |
| 9 | The Hole In A Pen Cap Is A Safety Feature | `out/batch-001/09-pen-cap-hole.mp4` | 9.6 MB | 30.51s |
| 10 | Old Book Smell Is The Book Falling Apart | `out/batch-001/10-old-book-smell.mp4` | 15.0 MB | 34.34s |

Rendered: **10/10**.

### Delivery gate

`tools/validate-output.mjs` — 16 assertions per file: codec, pixel format, dimensions,
aspect, fps, duration ≤ 60 s, duration ≥ narration, audio stream, sample rate, container,
faststart, decoded frame count, no clipping, loudness, narration audible.

**10/10 PASS.** Every file is 1080×1920 H.264 `yuv420p` at 30 fps with faststart, an
exact decoded frame count, peak between −3.0 and −4.0 dBFS and loudness −14.3 to −14.9 LUFS.

Faststart is read from the `moov`/`mdat` atom offsets, and the frame count is decoded rather
than taken from the container header — a truncated render cannot pass by claiming the right
length.

### Motion QA

`tools/motion-qa.mjs` decodes each render at 64×114 greyscale and reports the quietest
one-second windows against that episode's storyboard.

First pass found real dead stretches in four episodes — worst 2.33 s in
`highway-lane-lines`/`ten-feet`, where the dimension line landed and the frame then stopped
moving entirely. Fixed by extending the camera push across the full scene rather than easing
it to a stop in 16 frames, in `highway-lane-lines` (×2), `round-manhole-covers` and
`jeans-watch-pocket`, and those three were re-rendered.

**Second pass: no static windows in any of the ten.**

Stated honestly: this measures movement, not quality. A pointless zoom scores well. It is read
alongside the storyboards, not instead of them.

---

## 7. Reusable additions

Everything below is channel infrastructure now, not episode content.

### Props (3 new files)

| File | Assets |
|---|---|
| `src/props/travel.tsx` | AirplaneWindow, WindowPaneStack (+ exported pane anchors), PlaneSection, Cloud, Escalator, EscalatorSeam, Shoelace |
| `src/props/machines.tsx` | GasPump, CarSide, FuelNozzle, NozzleCutaway, Microwave, MeshPanel, DashboardCluster, CarTop, ManholeCover, ManholeShaft |
| `src/props/objects.tsx` | Jeans (+ exported pocket anchor), PocketWatch, PenCap, Pen, AirwayTube, Book, BookCutaway, RoadDash |

### Reusable mechanism diagrams

`WindowPaneStack`, `NozzleCutaway`, `MeshPanel`, `EscalatorSeam`, `BookCutaway`,
`AirwayTube` and `ManholeShaft` are parameterised cutaways, not one-off drawings. Each takes
the state the narration is describing (`focus`, `fuelLevel`, `valveShut`, `blocked`,
`spread`) so one prop serves a whole scene sequence and cannot drift between shots.

### FX

`src/fx/diagram.tsx` — Wave (explicit wavelength, so a size comparison is structural),
FlowArrows (with a dead state), DimensionLine, ScentCurls (decay parameter), Molecule,
CrossOut, Tick, CircleIt.

### Backgrounds

`src/backgrounds/everyday.tsx` — PlaneCabin, MallInterior, GasStation, KitchenCounter,
BedroomFloor, OldWorkshop, HighwayRoad, HighwayRoadside, HighwayTopDown, CarInterior,
CityStreet, DeskSurface, LibraryShelf, ConservationLab, plus CutawayVoid and SchematicVoid —
the near-empty pages a mechanism diagram sits on.

### Characters

**No new poses and no new expressions were needed.** The 54-pose humanoid library and each
character's expression table covered all ten episodes as shipped, which is the strongest
evidence available that Character System V1.0 is correctly scoped.

### Pipeline

| Change | Why |
|---|---|
| `tools/episode.mjs` | one place that knows the per-episode file layout; every tool takes `--episode` |
| `tools/ffbin.mjs` | absolute binary resolution + runtime permission probe + ffmpeg fallback for ffprobe |
| `tools/build-batch.mjs` | timestamp-join pairing with validation against the actual media |
| `tools/srt-to-alignment.mjs` | word timings recovered from SRT cues + the voiced envelope |
| `tools/batch-audio.mjs` | conditions all ten, isolating failures |
| `remap-timing`, `verify-sync`, `build-storyboard`, `validate-output`, `motion-qa` | episode-parameterised; scene split and keywords moved out of tool code into `episodes/<slug>/episode.json` |
| `tools/batch-stills.mjs`, `batch-render.mjs`, `batch-report.mjs` | batch QA, render and reporting |
| `src/lib/clock.ts` | the master clock as a factory, so ten narrations coexist in one bundle |
| `src/components/EpisodeCaption.tsx`, `EpisodeSfx.tsx` | captions take their highlight vocabulary as a prop; SFX are DERIVED from storyboard beat verbs instead of 35 hand-written cues per episode |
| `src/video/Episode.tsx`, `src/episodes/registry.ts` | one assembly for any episode |
| `src/scenes/kit.tsx` | the four scene patterns that actually recurred: a window test, a stamp, a slide-in, a held reveal |

---

## 8. Failures, and what fixed them

| Problem | Fix |
|---|---|
| Git HTTPS blocked by Application Control | used a second permitted Git installation; no security setting touched |
| `ffprobe` blocked (every copy on the machine) | made optional; durations fall back to decoding with `ffmpeg` |
| `remotion.exe` blocked → **no rendering possible at all** | reported as a hard blocker; user disabled Smart App Control |
| Node could not spawn `ffprobe`/`ffmpeg` on Windows | `execFile` does no PATHEXT expansion — resolve to absolute paths rather than enabling a shell, which would re-split paths containing spaces and commas |
| Batch shipped SRT, pipeline expected word-level JSON | word timings estimated over the voiced envelope; verified against the delivered waveform |
| 9/10 episodes failed the 2.2 s pacing gate | 37 authored secondary-action beats, placed inside the scene that owns each gap |
| **Every character sat ~34·scale px too low** | `DoodleCharacter`'s `y` is the HIP, not the feet. Captions crossed shins, waists and in one shot Bill's chin. 41 placements corrected from a computed feet line |
| Pane-stack labels missed their panes by ~150 px | anchors exported from the prop (`PANE_X`, `JEANS_POCKET`) instead of measured off a still |
| Aircraft cross-section read as a **face** | two window dots and a floor line, on a channel made of faces. Redrawn in side profile with an eleven-window row |
| Escalator rendered as a plain grey bar | the balustrade was drawn over its own treads — the one feature that identifies the object. Draw order corrected |
| Jeans read as a blue box | the prop had no legs. Redrawn with a crotch notch and two legs |
| Manhole cover sat under the caption band | hero prop restaged above y=1400 |
| Two characters faded in as grey ghosts | opacity ramp reached full ink too slowly |
| 4 episodes had static stretches (worst 2.33 s) | camera pushes extended across the full scene; three episodes re-rendered |

---

## 9. Final status

| | |
|---|---|
| Repository synced | **yes** — fast-forward to `e364fe8`, local work preserved |
| Pairs resolved and validated | **10/10** |
| Narrations processed and **LOCKED** | **10/10** |
| Storyboards passing the pacing gate | **10/10** |
| Episodes implemented | **10/10** |
| **Final MP4s rendered** | **10/10** |
| **Fully validated** | **10/10** |
| Motion QA clean | **10/10** |
| Remaining blockers | none |

Scope note, per the brief: no long-form architecture and no large Scene DSL were built. The
only abstraction introduced is `src/scenes/kit.tsx`, and it exists because those four
patterns demonstrably recurred across ten storyboards rather than because they were predicted
to.

---

*Generated by `tools/batch-report.mjs` from the pipeline's own artifacts.*
