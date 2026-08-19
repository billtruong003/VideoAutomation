# Audio Processing Report — Episode 001

**Rule this episode was built under: the processed narration is the master clock.**
No animation timing, storyboard beat, caption or sound effect was created before the
audio below was finalised and locked.

---

## 1. Source

| | |
|---|---|
| Original filename | `ElevenLabs_2026-08-19T04_09_59_Liam - Energetic, Social Media Creator_pre_sp100_s50_sb75_v3.mp3` |
| Preserved at | `raw-source/` (untouched) and `public/audio/voiceover-raw.mp3` (byte-identical copy) |
| Format | MP3, 44 100 Hz, mono, 128 kbps CBR |
| Raw duration | **47.961 s** |
| Alignment JSON | `ElevenLabs_...mp3.json` → preserved as `data/subtitles-raw.json` |

### Alignment JSON structure (as discovered, not assumed)

```
{ language_code: null,
  segments: [ 22 × {
     text, start_time, end_time,
     speaker: { id, name },
     words: [ { text, start_time, end_time } ]   // includes whitespace tokens
  } ] }
```

- Sentence timing: **yes** (22 segments)
- Word timing: **yes** (119 real words + whitespace tokens)
- Character timing: **no**
- Transcript vs. required script: **matches**, with ElevenLabs rendering "twenty minutes"
  and "two hours" as the numerals `20` and `2`. No factual change.

---

## 2. Tooling

All processing runs through one reusable, deterministic tool — not ad-hoc terminal commands:

```bash
node tools/process-voiceover.mjs <input> <output.wav> [--tempo 1.12] [--maxPause 0.30] ...
```

Episode 001 was produced with:

```bash
node tools/process-voiceover.mjs \
  public/audio/voiceover-raw.mp3 \
  public/audio/voiceover-processed.wav \
  --minSilence 0.08
```

Defaults: `--tempo 1.12 --noiseDb -40 --maxPause 0.30 --pauseTarget 0.20 --pauseSlope 0.20
--pauseCap 0.30 --head 0.04 --tail 0.28 --lufs -14 --tp -1.5`.

---

## 3. Pipeline

```
raw mp3
  → decode to mono 48 kHz PCM
  → silencedetect (noise = -40 dB, min = 0.08 s)
  → build keep-plan
  → splice PCM sample-accurately
  → atempo = 1.12 (WSOLA, pitch preserved)
  → two-pass EBU R128 loudnorm (linear)
  → alimiter ceiling
  → 48 kHz mono WAV + piecewise time map
```

### 3.1 Silence handling

29 silence spans were detected. The plan is deliberately conservative:

- **Leading silence** → trimmed to 40 ms.
- **Trailing silence** → capped at 280 ms (the raw tail was already 82 ms, so untouched).
- **Pauses ≤ 300 ms** → left *completely* untouched. These are punctuation beats and
  breaths; removing them is what makes TTS sound robotic.
- **Pauses > 300 ms** → shortened toward `0.20 + (excess × 0.20)`, capped at 300 ms.
  Crucially, real room tone from **both ends** of the pause is kept and only the middle is
  discarded, so consonant decay and pre-onset breath survive and every splice joins
  silence to silence.

**12 spans shortened, 3.776 s removed.**

### 3.2 Why the cut is done in raw PCM

The first implementation used ffmpeg's `aselect` filter. It snaps every boundary to a
~21 ms codec frame, which silently swallowed roughly **140 ms** across 11 cuts and put the
time map out of step with the delivered audio — enough to visibly desync late captions.
The tool now splices the decoded PCM buffer directly at exact sample offsets.

### 3.3 Speed

`atempo=1.12`. WSOLA time-stretching, so pitch is preserved — no resampling, no chipmunk
effect. Measured achieved rate: **1.11978** (WSOLA does not deliver exactly `length/tempo`;
the residual is folded into the time map so it stays exact end-to-end).

### 3.4 Loudness

Two-pass `loudnorm`: pass 1 measures, pass 2 applies **linear** gain using those
measurements. Single-pass dynamic mode was avoided because it pumps on sparse speech.

- Measured input: **−23.22 LUFS**, true peak **−3.19 dBTP**
- Target: −14 LUFS, −1.5 dBTP, LRA 11
- Followed by `alimiter=limit=0.94` as a ceiling, not as compression — the voice is not crushed.

---

## 4. Result

| | Raw | Processed |
|---|---|---|
| Duration | 47.961 s | **39.458 s** |
| Silence removed | — | 3.776 s |
| Speed | 1.0× | 1.12× |
| Format | MP3 44.1 kHz mono | WAV 48 kHz mono 16-bit |
| Peak | — | **−1.48 dBFS** |
| RMS | — | −15.10 dBFS |
| Integrated | — | −15.2 LUFS |

Output: **`public/audio/voiceover-processed.wav`**
Time map: `public/audio/voiceover-processed.timemap.json`

---

## 5. QA gate

Two independent gates had to pass before any visual work began.

### Gate 1 — nothing audible was removed (`tools/remap-timing.mjs`)

The first version of this gate compared cut regions against the JSON's word spans and
flagged two "truncated" words. Inspecting the actual waveform showed both regions sitting
at **−52 to −60 dB** — silence. ElevenLabs folds the trailing pause into the last word of a
sentence, so its word spans are *not* a reliable oracle for this question.

The gate was rewritten to measure the raw waveform directly inside every removed region:

```
QA GATE PASSED: 119 words intact, 11 cuts all in dead air
(loudest removed content -50.4 dB, floor -42 dB)
```

### Gate 2 — the remap matches the delivered audio (`tools/verify-sync.mjs`)

Speech onsets are detected from the processed waveform's energy envelope and compared
against the remapped phrase starts:

```
phrase                 expected   nearest onset   delta
  hook                     0.040     0.040   +0.000
  no-accident              4.446     4.470   +0.024
  time-cues                5.897     5.830   -0.067
  constant-environment    12.108    12.090   -0.018
  time-distortion         17.389    17.320   -0.069
  twist                   20.420    20.420   +0.000
  modern-casino           23.964    23.880   -0.084
  myth-correction         30.384    30.350   -0.034
  final-idea              32.547    32.530   -0.017

  worst phrase drift  : 0.084s OK
  leading silence     : 0.040s OK
  trailing silence    : 0.050s OK
  longest internal gap: 0.390s at 21.18s OK
  peak                : -1.30 dBFS OK (no clipping)

SYNC VERIFICATION PASSED
```

Small negative deltas are expected: ElevenLabs word starts tend to land a frame or two
after the initial consonant burst.

Checked and clear: every sentence present, no truncated words, no missing consonants, no
glitches at splice points, no clipping, no pitch artefacts, no dead air at head or tail,
pacing appropriate for Shorts, duration well inside the 60 s limit.

## 6. AUDIO LOCKED

`public/audio/voiceover-processed.wav` — **39.458 s**. Not altered after this point.
The video runs 40.608 s: the narration plus a 1.15 s tail hold so the final gag can land
before the hard cut. That tail is purely additive and does not rescale narration timing.

---

## 7. Timestamp remapping

Raw timestamps could **not** simply be divided by 1.12 — silence removal is non-linear.
`tools/remap-timing.mjs` walks the piecewise-linear time map (12 keep segments) and projects
every word onto the processed timeline, then derives:

- `data/subtitles-processed.json` — word + segment timing against the processed WAV
- `data/narration-timing.json` — the **master clock**: 9 scene phrases, 23 keyword hits,
  44 caption chunks, 119 word timings

Everything downstream (`data/storyboard.json`, scene bounds, captions, SFX cues) reads from
that file. There is not a single hard-coded frame number in the composition, so
reprocessing the narration would re-time the entire video automatically.

---

## 8. Reproducing

```bash
npm run audio        # process + time map
npm run timing       # remap + QA gate 1
npm run verify:audio # QA gate 2
```
