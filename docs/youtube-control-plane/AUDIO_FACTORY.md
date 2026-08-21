# Audio Factory

The front half of the pipeline. **Scripts in, narration and validated subtitles out.**

Before this existed, production started at a hand-exported MP3 and SRT pair sitting in
`Downloads/VoiceOver/`. Someone typed a script into the ElevenLabs web app, generated it,
listened, downloaded, renamed, and dropped the files where `tools/build-batch.mjs` could
find them. That is fine for ten episodes and impossible for a hundred.

Now the input is a script — `title` and `content` — and everything up to `AUDIO_READY`
is machine work.

---

## The one rule that outranks the rest

**The title is never spoken.**

`title` and `content` are fields on the same object, one line apart, and every
template-shaped instinct wants to write `${title}. ${content}`. If that ever happens, a
hundred videos narrate their own headline and nobody notices until playback.

Exactly one function produces text for the voice:

```js
narrationTextOf(episode)   // returns episode.content. Never the title. Never the notes.
```

It is the only path to TTS, and the first block of `tests/audio-factory.test.mjs` exists to
keep it that way. `notes` is likewise never spoken — it is where pronunciation hints and
production comments live, and it is inert by construction.

The UI says the same thing in the import panel, above the paste box, because the rule has to
survive people as well as code.

---

## Stage barriers — the batch moves, not the episode

Each stage runs for **every included episode** before **any** episode starts the next one.

| # | Stage | Produces |
|---|---|---|
| 1 | `TTS_GENERATION` | two takes per script |
| 2 | `VOICE_REVIEW` | one winner per episode |
| 3 | `VOICE_PROCESSING` | conditioned WAV + time map |
| 4 | `STT` | an independent transcript |
| 5 | `ALIGNMENT` | word positions in the audio |
| 6 | `SUBTITLE_VALIDATION` | a checked SRT |
| — | `AUDIO_READY` | **stops here** |

Driving one episode all the way to a rendered video while the next has no audio is easier to
write and impossible to operate: a failure at episode 60 leaves fifty-nine finished videos,
one broken one, and forty untouched scripts, with nowhere single to look. The barrier means
the batch has exactly one state and a failure is visible while it is still cheap.

`advanceStage()` refuses to move unless every included episode has cleared the current stage.
Each `run*Stage()` worker independently filters on its precondition physically existing
(`processed_audio && existsSync(...)`), so running one early is a no-op rather than a
corruption.

**`AUDIO_READY` does not advance automatically.** Visual production, rendering and YouTube
release are downstream of a human looking at the batch.

---

## Where each fact comes from

The subtitle stage takes three inputs and uses each for the only thing it actually knows:

| Source | Supplies | Never supplies |
|---|---|---|
| the script `content` | **the words** | timing |
| forced alignment | **the timing** | the words |
| Scribe transcript | **an independent check** | either of the above |

Taking subtitle text from the transcript is the obvious shortcut and it is wrong: Scribe hears
*vanilla* where the script says *vanillin*, and a subtitle agreeing with the mistake makes it
look deliberate. Taking timing from the script is equally wrong — there is no timing in a
script.

Fallback order when alignment is unavailable, most trustworthy first:

1. `FORCED_ALIGNMENT` — exact positions of known words
2. `TRANSCRIPT_MAPPED` — transcript timings mapped onto canonical words
3. `ESTIMATED` — the existing SRT-derived estimator
4. `HUMAN_REQUIRED`

Whichever was used is recorded on the episode, because a subtitle built by estimate deserves
different trust from one built by alignment.

---

## Take selection measures; it does not listen

Two takes are generated per script from deterministic seeds. Selection runs seven gates
(decodes, not empty, no clipping, no dead air, not truncated, not overlong, distinct from
sibling), then scores nine delivery dimensions from waveform analysis.

**No audio is listened to.** Every selection carries this verbatim:

> `ACOUSTIC_MEASUREMENT_ONLY — no audio was listened to; scores come from waveform analysis.`

When the two takes land within `CLOSE_CALL_MARGIN`, the result is flagged
`humanReviewRecommended` and the UI says measurement could not separate them and a listen is
recommended. Both takes are playable side by side, and `overrideWinner()` records a human
choice as `HUMAN` rather than `AUTO`.

A measurement can prove an audio file is *broken*. It cannot prove a performance is *good*.
The system is built to state which of those it did.

---

## The handoff is deliberately literal

At `AUDIO_READY` the batch has written exactly what `tools/build-batch.mjs` used to produce
from hand-exported files:

- `public/audio/<slug>.wav` + `.timemap.json`
- `episodes/<slug>/subtitles.srt`
- `episodes/<slug>/subtitles-raw.json` — word alignment in ElevenLabs' own shape
- `data/<batchId>.json` — the manifest

The manifest is a **contract**, not an output. Every field `build-batch.mjs` emitted is still
emitted, including `subtitleEnd` (the last cue's end time), which downstream uses to prove the
subtitle belongs to the audio — a subtitle running past the file is a wrong pair, one ending
far short of it is a truncated export. Paths carry forward slashes for the same reason: "same
shape" has to include the strings themselves.

`remap-timing` and everything after it cannot tell the difference, which is the whole point.
This is a front half, not a second pipeline. `process-voiceover.mjs` is untouched and still
owns pacing, loudness and the master clock; the factory only chooses which file goes into it.

---

## Voice and model are locked per batch

Default voice is **`TX3LPaxmHKxFdv7VOQHJ`** — *Liam, Energetic Social Media Creator*. It is
never silently substituted; if it is unreachable, preflight blocks rather than picking
something that sounds close.

A model is chosen **once** and frozen for the batch. Episode 1 in one model and episode 2 in
another is two narrators. A fallback is **reported, not applied silently** —
`modelWasFallback` and `modelReason` travel with the lock and appear in the UI.

> Verified on the live account: `eleven_v3` is **not** available for this voice, so a quality
> preference resolves to `eleven_multilingual_v2` with that reason attached.

Preflight answers the two questions naive generation discovers too late: is the canonical
voice actually reachable, and will the batch fit in the remaining character allowance.
Discovering the second at episode 60 leaves a half-generated batch and a spent balance.

---

## Secrets

The ElevenLabs API key is sealed with **Windows DPAPI** under `%LOCALAPPDATA%\BillFindsOut\`,
scoped to the current user.

The key never reaches the frontend. `describeKey()` returns whether a key is present and how
it is stored — deliberately **not** a prefix and **not** a length, because four "safe"
characters are still four characters of a secret. The `xi-api-key` header is never logged, and
the browser never calls ElevenLabs directly.

`src/audio-factory/elevenlabs/client.mjs` is the only file that talks to ElevenLabs.

---

## What is not in git

Raw takes live in `%LOCALAPPDATA%\BillFindsOut\audio-factory\`, outside the repository. A
hundred episodes is two hundred candidates and half are rejected; committing them would add
hundreds of megabytes of audio nobody will play again.

Rejected takes are kept until the winner has produced a **validated** subtitle, then cleaned
by `cleanupRejectedTakes()`. Deleting them earlier removes the fallback at exactly the moment
it might be needed.

---

## Cache key

A take is regenerated only when something that changes the audio changes:

```
hash(contentHash, voiceId, modelId, settings, seed, outputFormat, languageCode, GENERATOR_VERSION)
```

`GENERATOR_VERSION` is the manual escape hatch: bump it to invalidate every cached take when
the generation logic itself changes in a way the other inputs cannot express.

---

## Concurrency

The plan's documented limit is a **starting point**, not the authority. A `429` carrying
`concurrent_limit_exceeded` shrinks the pool and the floor is remembered for the rest of the
run, with full-jitter backoff on retry. The account is the authority; the documentation is a
hint.

---

## Proven end to end

One canary script, one real round trip through the live API:

| Check | Result |
|---|---|
| Takes generated | 2 (22.11 s / 49 pauses, 22.71 s / 45 pauses — genuinely distinct) |
| Gates | 7/7 passed on both |
| Selection margin | 0.7 → flagged `humanReviewRecommended` |
| Word error rate | **0.0 %** |
| Alignment loss | 0.018 |
| Unmatched words | 0 |
| Subtitle validation | 12 cues, 0 errors, 0 warnings |
| Pair check | subtitle ends 18.079 s against 18.312 s audio |
| Title in narration | **no** |
| Title heard by Scribe | **no** |
| Billed | 438 characters |
