# Doodle Explainer — Episode 001: Why Casinos Have No Clocks

> **We explain weird things with stupid drawings.**

A programmatically produced vertical YouTube Short, rendered with
[Remotion](https://www.remotion.dev/). This repository is not a one-off video project — it
is the **channel engine**, with Episode 001 as its first payload.

**Output:** `out/why-casinos-have-no-clocks-v2.mp4` — 1080×1920, 30 fps, H.264, 40.6 s
(V1 preserved alongside it as `why-casinos-have-no-clocks.mp4` for comparison.)

## V2 rendering architecture — DESIGN CLEANLY, RENDER IMPERFECTLY

Assets are authored as **clean semantic geometry** (a clock is a circle, twelve ticks and
two hands) and passed through **one deterministic stylizer** that supplies the hand-drawn
look. V1 asked the author to draw badly and drifted; V2 makes the sketch quality a property
of the pipeline.

- **Rough.js** for structure — clock faces, cabinets, walls, window frames
- **perfect-freehand** for gesture — brows, mouths, noodle limbs, arrows, speed lines
- **SVGO + a seeded roughifier** to ingest external SVG (8 ISC Lucide icons prove the chain)
- **Deterministic seeds** from stable asset identity; per-frame change is transform-only, so
  roughened geometry is cached and linework never boils. Proven: 73/73 assets byte-identical
  across independent renders (`npm run qa:assets`).

Restyling the whole channel is a change to `src/style/tokens.ts`, not to 27 asset files.

---

## The one rule

```
AUDIO IS FINISHED FIRST.
THE PROCESSED NARRATION IS THE MASTER CLOCK.
THE VIDEO IS BUILT AROUND IT.
```

`data/narration-timing.json` is generated from the locked `voiceover-processed.wav` and is
the only source of timing in the project. Scene boundaries, scene durations, caption
timing, SFX cues and every visual beat resolve from it. **There is not one hard-coded frame
number in the composition** — reprocess the narration and the whole video re-times itself.

---

## Pipeline

```
raw ElevenLabs mp3 + alignment json
        ↓  tools/process-voiceover.mjs
processed wav + piecewise time map
        ↓  tools/remap-timing.mjs        ← QA GATE 1 (nothing audible was cut)
        ↓  tools/verify-sync.mjs         ← QA GATE 2 (remap matches the waveform)
   AUDIO LOCKED
        ↓  tools/build-storyboard.mjs
data/storyboard.json  (keyword-anchored beats + pacing check)
        ↓  tools/build-asset-manifest.mjs
data/asset-manifest.json
        ↓  Remotion scenes
        ↓  tools/render-qa-stills.mjs    ← visual QA
        ↓  tools/motion-qa.mjs           ← "no PowerPoint" check
out/why-casinos-have-no-clocks.mp4
        ↓  tools/validate-output.mjs     ← delivery spec gate
```

## Commands

```bash
npm install

npm run audio          # process narration -> locked wav + time map
npm run timing         # remap timestamps (fails if a cut hit speech)
npm run verify:audio   # prove the remap matches the delivered waveform
npm run sfx            # synthesise the SFX library
npm run storyboard     # derive the shot list from the narration
npm run manifest       # inventory + cross-check every asset
npm run qa:assets      # render all 73 assets in isolation and validate them
npm run assets:ingest  # vendor icons -> normalize -> roughify -> registry

npm run studio         # interactive editor
npm run typecheck
npm run qa:stills      # 17 stills at the beats that matter
npm run preview        # low-res render for motion QA
npm run render         # final 1080x1920 H.264
npm run validate       # ffprobe + loudness gate on the deliverable
```

---

## Layout

```
public/
  audio/     voiceover-raw.mp3, voiceover-processed.wav, .timemap.json
  sfx/       15 procedurally generated wavs
  doodle/    80 exported .svg snapshots (characters / props / fx / backgrounds)
raw-source/  untouched originals — never modified
data/
  subtitles-raw.json         as delivered by ElevenLabs
  subtitles-processed.json   remapped onto the processed audio
  narration-timing.json      THE MASTER CLOCK
  storyboard.json            keyword-anchored shot list
  asset-manifest.json        derived inventory
src/
  Root.tsx                   compositions (episode + 3 QA sheets)
  video/CasinoClocks.tsx     assembly — reads scene spans from timing
  scenes/                    the ONLY episode-specific visual code (9 files)
  character/                 rig.ts, poses.ts, expressions.ts
  components/                DoodleCharacter, DoodleProp, Stage, Paper, Caption, GagCard, SoundDesign
  animation/                 PoseSwap, WalkCycle, SceneCamera, PopIn, Float, EyeLook,
                             ClockSpin, MoneyFly, ImpactLines, HandDrawnWobble
  props/  fx/  backgrounds/  the reusable art library
  qa/                        contact-sheet compositions
tools/                       the whole pipeline, as reusable CLIs
qa/                          rendered QA stills
```

---

## What is reusable vs. episode-specific

**Reusable (Episode 002 gets these free):** the protagonist and their 23 poses / 13
expressions, all 27 props, 10 FX marks, 6 backgrounds, all 23 animation primitives, the
caption system, the gag-card system, the paper/stage surface, the SFX library and
synthesiser, and every tool in `tools/`.

**Episode-specific:** the nine files in `src/scenes/`, and the beat plan inside
`tools/build-storyboard.mjs`. That is all.

Generic things have generic names on purpose — `CameraPunch`, not
`CasinoClockFunnyZoom`; `WalkCycle`, not `CasinoGuyWalk`.

---

## Making Episode 002

1. Drop the new ElevenLabs mp3 + alignment json in `public/audio/` and `data/`.
2. `npm run audio && npm run timing && npm run verify:audio` — do not proceed until both
   gates pass.
3. Edit the `SCENES` list in `tools/remap-timing.mjs` to the new script's phrases and the
   `KEYWORD_SPECS` to the words the visuals should hit.
4. Write the beat plan in `tools/build-storyboard.mjs`, then `npm run storyboard` — it
   fails if a beat escapes its scene and warns if pacing exceeds the 2 s gap target.
5. Add missing props to `src/props/` following `STYLE.md`; run `npm run manifest` to
   cross-check.
6. Write scenes in `src/scenes/`, register them in `src/video/CasinoClocks.tsx`.
7. `npm run qa:stills`, `npm run preview`, `node tools/motion-qa.mjs`, then `npm run render`
   and `npm run validate`.

Steps 1–4 are already mechanical enough to automate end-to-end; the architecture does not
block that.

---

## Documentation

- **`PIPELINE.md`** — how a video actually gets made, stage by stage, with costs and a
  ranked list of where the pipeline is weak. **Start here if you want to optimise it.**
- **`STYLE.md`** — the binding visual contract, injected into any process that generates art
- **`SCRIPT.md`** — narration, scene breakdown, keyword sync map, factual position
- **`audio-processing-report.md`** — full audio pipeline, measurements and QA gate results
- **`ASSET_LICENSES.md`** — provenance for every asset

## Licensing note

Remotion is free for individuals and small companies but requires a paid company licence
above a threshold — see <https://remotion.dev/license>. Everything else in this project is
original work or OFL-1.1 fonts. See `ASSET_LICENSES.md`.
