# Production Pipeline — how this channel actually makes a video

> **V2.** The audio-first spine is unchanged from V1 and still correct. What was rebuilt is
> everything downstream of the storyboard: the asset architecture and the rendering stack.
> Sections marked **[V2]** are new. §11 (where the pipeline is weak) has been re-ranked
> against what V2 actually fixed.

> Written so it can be criticised and optimised. Every stage below lists **what it does**,
> **why it exists**, **what it costs**, and **where it is weak**. The weaknesses are the
> useful part — skip to §11 if that's what you're after.

Episode 001 = *Why Casinos Have No Clocks*, 40.6 s vertical Short.
Total wall-clock for the whole build: roughly 2.5 hours, of which ~35 min was rendering.

---

## 0. The governing rule

```
AUDIO IS FINISHED FIRST.
THE PROCESSED NARRATION IS THE MASTER CLOCK.
THE VIDEO IS BUILT AROUND IT.
```

This is not a preference, it is what makes the rest of the pipeline automatable. Because
one JSON file (`data/narration-timing.json`) holds every timestamp, **no frame number is
hard-coded anywhere in the composition**. Swap the narration, re-run two commands, and the
entire video re-times itself — scene boundaries, captions, camera moves, SFX.

The inverse (animate first, fit audio later) makes every later stage manual forever.

---

## 1. Stage map

```
 ┌─ INPUT ────────────────────────────────────────────────┐
 │  raw.mp3  +  alignment.json      (ElevenLabs)          │
 └───────────────┬────────────────────────────────────────┘
                 │
   [1] process-voiceover.mjs ──► processed.wav + timemap.json
                 │
   [2] remap-timing.mjs ───────► narration-timing.json     ◄── QA GATE 1
                 │                subtitles-processed.json
   [3] verify-sync.mjs ─────────────────────────────────── ◄── QA GATE 2
                 │
            ***  AUDIO LOCKED  ***
                 │
   [4] build-storyboard.mjs ───► storyboard.json  (+ pacing check)
                 │
   [5] STYLE.md ──► clean semantic geometry (props / fx / backgrounds)
                 │   normalize-svg → roughify-svg → asset-registry  [V2]
                 │
   [6] asset-qa.mjs ──────────────────────────────────────  ◄── QA GATE 3 [V2]
       build-asset-manifest.mjs ► asset-manifest.json
                 │
   [7] Remotion scenes (the only episode-specific code)
                 │
   [8] render-qa-stills.mjs ───► 17 stills                 ◄── VISUAL QA
                 │
   [9] preview render + motion-qa.mjs                      ◄── PACING QA
                 │
  [10] final render
                 │
  [11] validate-output.mjs                                 ◄── DELIVERY GATE
                 │
 ┌─ OUTPUT ───────────────────────────────────────────────┐
 │  out/why-casinos-have-no-clocks-v2.mp4                 │
 └────────────────────────────────────────────────────────┘
```

Everything left of `[7]` is **channel infrastructure**. Only `[7]` is episode-specific.

---

## 2. Stage 1 — Audio conditioning

**Tool:** `tools/process-voiceover.mjs` · **Cost:** ~8 s

```bash
node tools/process-voiceover.mjs in.mp3 out.wav --minSilence 0.08
```

Order matters and is non-negotiable:

1. decode → mono 48 kHz PCM
2. `silencedetect` (noise −40 dB, min 0.08 s)
3. build a **keep-plan**
4. splice PCM **sample-accurately**
5. `atempo=1.12` (WSOLA — pitch preserved)
6. two-pass EBU R128 `loudnorm` (linear) + limiter
7. emit the WAV **and a piecewise time map**

### The keep-plan (this is where quality lives)

| Silence type | Action |
|---|---|
| Leading | trim to 40 ms |
| Trailing | cap at 280 ms |
| **≤ 300 ms** | **leave completely alone** — these are breaths and punctuation; removing them is what makes TTS sound robotic |
| > 300 ms | shorten toward `0.20 + (excess × 0.20)`, cap 300 ms |

When shortening, room tone from **both ends** of the pause is kept and only the middle is
dropped. So consonant decay and pre-onset breath survive, and every splice joins silence to
silence — no clicks.

Result: 47.961 s → 44.185 s (cut) → 39.458 s (after tempo). 3.776 s removed across 12 spans.

### Two hard-won details

**`aselect` is the wrong filter for this.** The first implementation used
`aselect='between(t,a,b)+...'`. It snaps every boundary to a ~21 ms codec frame, which
silently swallowed **~140 ms across 11 cuts** and put the time map out of step with the
delivered audio — enough to visibly desync captions by the end. Now the decoded PCM buffer
is spliced directly at exact sample offsets.

**`atempo` does not deliver exactly `length/tempo`.** Requested 1.12, achieved 1.11978.
That residual is a uniform time-scale error, so it is measured after the render and folded
into the time map, which makes the map exact end-to-end rather than approximately right.

---

## 3. Stage 2 — Timestamp remapping + QA GATE 1

**Tool:** `tools/remap-timing.mjs` · **Cost:** ~3 s

Raw timestamps **cannot** be divided by 1.12 — silence removal is non-linear. The time map
is 12 keep-segments; every word is projected through it piecewise-linearly.

### QA GATE 1 — did any cut remove audible signal?

The first version of this gate compared cut regions against the **JSON's word spans** and
flagged two truncated words. Inspecting the waveform showed both regions at **−52 to −60 dB**
— pure silence. ElevenLabs folds the trailing pause into the last word of a sentence, so
**its word spans are not a valid oracle for this question.**

The gate now decodes the raw MP3 and measures the actual waveform inside every removed
region:

```
QA GATE PASSED: 119 words intact, 11 cuts all in dead air
(loudest removed content -50.4 dB, floor -42 dB)
```

**Generalisable lesson: when a metadata source and the signal disagree, the signal wins.**

### Outputs

- `narration-timing.json` — **the master clock**: 9 scene phrases, 23 keyword anchors,
  44 caption chunks, 119 word timings
- `subtitles-processed.json` — word + segment timing against the processed WAV

Keyword anchors are declared as `[id, tokens, occurrence]`, e.g.
`['clocks-modern', ['clocks'], 1]` = the *second* time "clocks" is spoken. Scene code then
asks `kwIn('modern-casino', 'clocks-modern')` and gets a frame number.

---

## 4. Stage 3 — QA GATE 2, then LOCK

**Tool:** `tools/verify-sync.mjs` · **Cost:** ~5 s

Remapping is only trustworthy if checked against the **delivered waveform**, not against
the arithmetic that produced it. This detects speech onsets from the processed audio's
energy envelope and measures the distance to each remapped phrase start.

```
worst phrase drift  : 0.084s OK
leading silence     : 0.040s OK
trailing silence    : 0.050s OK
longest internal gap: 0.390s at 21.18s OK
peak                : -1.30 dBFS OK (no clipping)
```

**Once both gates pass, the audio is LOCKED and never touched again.**

The video runs 40.608 s = narration (39.458 s) + a 1.15 s tail hold so the final gag lands
before the hard cut. That tail is purely additive — it never rescales narration timing.

---

## 5. Stage 4 — Storyboard

**Tool:** `tools/build-storyboard.mjs` · **Cost:** ~1 s

Scene bounds come from spoken phrases. Individual beats are anchored to **spoken keywords**,
never to wall-clock guesses:

```js
{ kw: 'twist', offset: 0.1 }      // 0.1s after the word "twist" begins
{ scene: 'hook', at: 1.55 }       // relative to the scene's own start
{ scene: 'x', fromEnd: 0.15 }     // before the scene ends
```

Two automatic checks:

- **Escape check** — a beat outside its scene's bounds is a hard error.
- **Pacing check** — reports the longest gap between beats against the 0.5–2 s target.
  First run flagged a **3.76 s dead gap**; beats were added and it is now 2.04 s max, across
  43 beats in 39.5 s.

This is a *machine-checkable* definition of "not a slideshow", which is the only kind worth
having.

---

## 5b. [V2] The rendering architecture — DESIGN CLEANLY, RENDER IMPERFECTLY

This is the change V2 exists for.

### The V1 failure

V1 produced its hand-drawn look by asking whoever authored an asset to *draw it badly*:
lopsided beziers, manually offset fills, hand-picked jitter tables. Every new prop was a
fresh negotiation with "what does sketchy mean", so the library drifted — and a generator
asked for "a sketchy hand-drawn clock" produces a different, worse clock every time, while
the same generator asked for "a clock" gets the semantics right almost always.

### The V2 split

| Stage | Owner | Output |
|---|---|---|
| **Author** | asset file | clean semantic geometry — a clock is a circle, twelve ticks, two hands |
| **Stylize** | `src/assets/RoughAsset.tsx` | the channel's hand, applied identically to everything |

There is exactly one stylizer. Restyling the channel is a token change in
`src/style/tokens.ts`, not 27 rewrites.

### One library draws everything

| | Handles | How |
|---|---|---|
| **Rough.js** 4.6.6 | STRUCTURE — clock faces, cabinets, walls, window frames, heads, torsos | shape presets: roughens an outline while preserving the shape's identity |
| **Rough.js** 4.6.6 | GESTURE — brows, mouths, noodle limbs, hair, arrows, speed lines | pen presets: a curve through deliberately boring points |

There is one stylizer and one pen family. An earlier revision routed gestures to
`perfect-freehand`, and it was removed for three reasons that are worth keeping on record:

- it is an **authoring** tool, not a stylizer — its character comes from a hand-authored
  pressure profile, which is V1's "the author supplies the hand" failure wearing a library
- variable-width and uniform-width are two different pens; on one head the drawing visibly
  had two hands, and at phone size the swelling went muddy
- it **escaped the style switch**: `REMOTION_STYLE_MODE=clean` flattened every Rough.js
  shape and left every freehand mark untouched, so half the frame obeyed

All 15 gestural marks migrated with zero asset edits — one branch in the single stylizer.

### Determinism and the caching contract

Remotion renders frames out of order across parallel workers, so unseeded roughness would
give a different squiggle every frame — boiling static, not a drawing.

- Seeds derive from a stable identity string (`assetId:variant:index`) via `seedFrom()`.
- Roughened geometry is memoised on `(shape, options, seed)` in `src/rough/generator.ts`.
- **Anything that changes per frame must be an SVG transform on the OUTPUT, never a change
  to the geometry handed to the stylizer.** Every rough part of the character is authored at
  the origin and translated into place; clock hands are separate defs inside a rotated `<g>`.
  Break this and a blended pose mints a fresh cache entry every frame.

`tools/asset-qa.mjs` proves the property: **197/197 assets byte-identical across two
independent renders** — every prop and FX mark, plus every canonical pose and expression of
all five cast members.

### The calibration lesson that keeps mattering

1. **Rough.js roughness is in absolute units, not relative to the shape.** On a 3-unit dice
   pip the default wander is larger than the pip, so a grid of them merges into a black
   smear — which is exactly how the first V2 dice rendered. Encoded as the `TINY` override
   in `src/assets/shapes.ts`; an audit found 13 latent instances across the library.

### [V2] The asset resolver chain

```
asset request
  → existing internal library (src/props, src/fx, src/backgrounds)
  → clean open/licensed source (lucide-static, ISC)      → assets/vendor/
  → local licensed assets already in the workspace
  → generate clean semantic SVG
        ↓  tools/normalize-svg.mjs   (SVGO, viewBox asserted)  → assets/normalized/
        ↓  tools/roughify-svg.mjs    (Rough.js, seeded)        → assets/stylized/
        ↓  data/asset-registry.json  (source, licence, seed, styleVersion)
        ↓  tools/asset-qa.mjs        (isolated render + validation)
  usable in scenes
```

**On svg2roughjs:** installed, evaluated, **not used**. It does not load under Node ESM (its
`main` is a UMD bundle exporting nothing) and depends on browser-only APIs — `getBBox`,
`getComputedStyle`, `canvas`, `Image` — that jsdom does not implement for SVG geometry.
`tools/roughify-svg.mjs` implements the equivalent directly against Rough.js, reusing the
same seed derivation with a startup parity assertion so the copy cannot silently drift.

## 6. Stage 5 — Asset generation

### 6.1 The style contract

`STYLE.md` is a **binding, injectable** document, not documentation-after-the-fact. It
specifies: palette (11 named tokens, no hex allowed in art code), stroke weights from a
token set, the offset-fill idiom, "no perfect circles / no exact symmetry", coordinate
systems, the component contract, and hard bans.

When work is delegated to a generator, `STYLE.md` is **read first, verbatim**. That single
constraint is what made three independently-generated asset sets look like one hand.

### 6.2 How assets are actually drawn

**Assets are React components, not static SVG files.** This is the central architectural
choice and it is worth defending:

| Approach | Can animate internals? | Inspectable? |
|---|---|---|
| Static `.svg` files | No — clock hands can't spin | Yes |
| **React components** | **Yes — via props** | Not without running Remotion |
| **Both** ← chosen | Yes | Yes |

Components are the source of truth. `tools/export-svg-assets.mjs` bundles them with esbuild,
renders each at frame 0 through `react-dom/server`, and writes **80 standalone `.svg` files**
to `public/doodle/`. So the library is browsable *and* animatable, and the two can never
drift because one is generated from the other.

Anything a scene must animate is a **prop of the component** (`hourAngle`, `lit`,
`leverAngle`, `open`, `pips`) — never internal state, never time-derived inside the asset.

### 6.3 The drawing idiom

Three rules do ~90% of the "hand-drawn" work:

1. **Offset fills** — the flat fill is translated 2–3 units off its own outline, the way a
   felt-tip overshoots the pencil line it is colouring in.
   ```tsx
   <path d={SHAPE} fill={PALETTE.gold} transform="translate(2.4 2)" />
   <path d={SHAPE} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} />
   ```
2. **Lopsided geometry** — "circles" are 4-segment bezier potatoes built from a fixed jitter
   table. No perfect circles, no exact symmetry, no dead-straight lines.
3. **Deterministic wobble** — every element carries a sub-degree drift from seeded value
   noise (`src/lib/rand.ts`). `Math.random()` is banned project-wide: Remotion renders frames
   out of order in parallel workers, so unseeded randomness would make things jitter
   differently every frame *and* every run.

### 6.4 The character rig

Borrowed from Stix's asset contract, which is a genuinely good idea: **hip at origin (0,0),
up is −Y, ~182 units tall, head ≈ 44% of height.**

A pose is pure data — no geometry:

```ts
type Limb = { x: number; y: number; bend: number };  // where the hand/foot lands + how the noodle bows
type Pose = { rootOffset?, headTilt?, headOffset?, torsoLean?, bodyScale?, armsInFront?,
              armL, armR, legL, legR };
```

Noodle limbs have no elbows or knees, so **one quadratic bezier is the entire anatomy of a
limb**. That is why two poses can be blended by interpolating numbers (`blendPose`), and why
23 poses cost ~200 lines of data rather than 23 drawings.

Face and body are independent: **any of 13 expressions can ride on any of 23 poses**. Most
of the comedy comes from the mismatch (a `relaxed` body wearing a `horrified` face).

---

## 7. Stage 6 — Asset manifest + QA GATE 3

**Tool:** `tools/build-asset-manifest.mjs` · **Cost:** <1 s

Deliberately **derived, never hand-maintained**. It parses actual component exports, actual
pose/expression tables, actual exported SVGs, and actual scene imports — then cross-checks
them. If a scene imports something the library doesn't export, **the build stops here**
rather than at render time.

A hand-written manifest goes stale on the first refactor. This one fails loudly.

---

## 8. Stage 7 — Scenes (the only episode-specific code)

Nine files in `src/scenes/`. Each is a pure function of `useCurrentFrame()`.

```tsx
const F_TWIST = kwIn('twist', 'twist');   // frame, resolved from the audio
const pose = usePoseSwap([
  { at: 0,          pose: 'exhaustedSitting' },
  { at: F_TWIST,    pose: 'exhausted' },
  { at: F_TWIST+9,  pose: 'surprised' },
], frame, 2);                              // <- quantised to twos
```

### Motion vocabulary (23 primitives across 10 files)

| Primitive | Job |
|---|---|
| `PoseSwap` | hold a drawing, then **snap** to the next — never tween |
| `WalkCycle` | 2-drawing walk + the body bob that sells it |
| `SceneCamera` | pan / zoom / rotate + `useCameraPunch`, `useCameraShake`, `useCameraDolly` |
| `PopIn` | things arrive by **popping**, never fading (a fade reads as a slideshow) |
| `Float`, `EyeLook`, `ClockSpin`, `MoneyFly`, `ImpactLines`, `HandDrawnWobble` | the rest |

**The core aesthetic decision:** character poses change **on twos** (every 2–4 frames) while
the camera moves **smoothly every frame**. That contrast between stepped character and fluid
camera is what makes limited animation read as deliberate rather than cheap.

`EyeLook` deserves a note: eyes driven by smooth noise look drugged. Real eyes **saccade** —
hold a target, then flick. So `useIdleLook` holds a direction for N frames then snaps.

---

## 9. Stages 8–9 — Visual and motion QA

### Stills (`render-qa-stills.mjs`, ~4 min)

17 stills at frames **computed from keywords**, so the QA set always lands on the actual
beat even if the audio is reprocessed. Stills decide composition, safe zones, clipping and
readability — and cost seconds where a preview costs minutes.

### Motion (`motion-qa.mjs`, ~20 s)

Decodes the preview at 64×114 greyscale and measures mean absolute pixel change between
consecutive frames, then reports the quietest 1-second windows **against the storyboard**, so
a dead stretch traces back to the scene that owns it.

```
median 1s motion score: 0.975   static threshold: 0.215
STATIC STRETCHES:
  22.37s -> 23.70s  (1.33s)  scene: twist
```

That found a real dead stretch that reads fine while scrubbing and dead while watching.
After adding secondary action: *"No static windows."*

Caveat, stated honestly: **it measures movement, not quality.** A pointless zoom scores
well. Read it alongside the storyboard, not instead of it.

### What visual QA actually caught (all real, all fixed)

1. Head overlapped the shoulders → arms sprouted from the chin. **Rig rebuilt.**
2. Ink limbs vanished on dark backgrounds → **paper halo** added under every stroke.
3. Captions ran words together (`HOWMANY`) — per-word `x` from estimated character widths.
   **Rewritten as `<tspan>`s**, letting the text engine do layout.
4. Captions collided with feet → band moved to y=1442, characters lifted.
5. **Camera zoom < 1.0 exposed the background edges** (backgrounds are exactly 1080×1920).
   Clamped inside `SceneCamera` so no future scene can reintroduce it.
6. Duplicate casino sign; giant clock sitting exactly where the head was.
7. `yuvj420p` (deprecated full-range) → forced `yuv420p` + BT.709.
8. **Arms drawn in front read as hands pasted on the character.** Moved behind the torso and
   head; six poses had their hands moved clear of the silhouette; only `thinking` and
   `horrified` keep `armsInFront`, because those hands belong on the face.

---

## 10. Stages 10–11 — Render and delivery gate

```bash
npm run render     # ~10 min, 1218 frames at 1080x1920, CRF 17
npm run validate
```

16 assertions: codec, pixel format, dimensions, aspect, fps, duration ≤ 60 s, duration ≥
narration, audio stream, sample rate, container, **faststart (moov before mdat, read from
the file head — not a trusted flag)**, decoded frame count vs. expected, no clipping,
loudness in YouTube range.

> An earlier version of this validator had a `faststart` check hard-coded to `true`. A
> check that always passes is worse than no check — it launders a guess as a fact. It now
> reads the atom offsets.

---

## 11. Where this pipeline is weak — the optimisation targets

Re-ranked after V2. Items V2 **fixed** are listed first with what actually changed, so the
list stays honest about progress rather than repeating itself.

### FIXED in V2

| Was | Now |
|---|---|
| **11.5 Asset generation was one-shot, unverified** | `tools/asset-qa.mjs` renders all 73 assets in isolation and asserts EMPTY / NAN / OVERSIZE / FLICKER before any scene renders. Determinism is proven, not assumed: 73/73 byte-identical across two renders. |
| **Style drift from "draw it sketchily"** | Assets are clean geometry; one stylizer supplies the hand. The look is now a property of `style/tokens.ts`, not of the author's mood. |
| **No asset provenance** | `data/asset-registry.json` tracks source, licence, normalization, stylizer, seed and styleVersion per asset. `ASSET_LICENSES.md` is derived from it. |
| **No ingest path for external art** | normalize (SVGO) → roughify (seeded Rough.js) → registry → QA, demonstrated end to end on 8 ISC-licensed Lucide icons. |

### STILL OPEN, in priority order

**11.1 Scene code is still hand-written — still the bottleneck.**
Nine `.tsx` files remain the only episode-specific code and still the bulk of the effort.
V2 did *not* address this; it deliberately spent its budget on the rendering architecture.
The storyboard already carries `background`, `beats[]` and keyword anchors, and V2 added a
declarative asset layer — so the remaining gap is a scene DSL of roughly
`{ actor, pose, at, x, y, expression }` + `{ prop, at, x, y, enter }`. Scene `.tsx` becomes
an interpreter and episode-specific code drops to JSON. **Highest-value change remaining.**

**11.2 No feedback loop from QA back into the build.**
QA emits reports; a human reads them and edits code. The static-stretch finder already knows
the scene *and* the timestamp — it could propose the beat.

**11.3 Composition collisions are still found by eyeball.**
Caption-vs-feet, clock-vs-head, halo weight — all caught by looking at stills. All are
computable from declared bounding boxes. V2's asset QA validates assets *individually*; it
does not yet check how they are *arranged*.

**11.4 Render cost still dominates iteration.**
~10 min final, ~4 min for 17 stills, and the 17 stills still render serially despite being
independent — an easy 3–4x win. Rough.js caching made per-frame cost lower, not zero.

**11.6 Keyword anchors are hand-declared and occurrence-indexed.**
`['clocks'], 1` is fragile: inserting an earlier "clocks" silently retargets a visual.
Anchor on `(scene, wordIndexWithinScene)` instead.

**11.7 Audio is measured, never heard.**
Sync, levels and clipping are verified numerically. Subjective voice quality at 1.12x has
never actually been listened to. A real hole. An ASR pass over the processed audio compared
against the source transcript would close it objectively.

**11.8 New in V2 — the SMEAR heuristic is unreliable.**
Path-data volume cannot distinguish "3-unit disc scribbled into a blob" from "22-vertex
filled starburst". It is a warning, not a gate, and the contact sheets still make the call.
A rasterised ink-coverage measure would be a real check.

**11.9 Minor**
- `constant-environment` still scores lowest on motion (0.55 vs 1.04 median). Intentional —
  monotony is the subject — but it is the first scene to revisit.
- Backgrounds are exactly 1080x1920, forcing `MIN_ZOOM = 1`. Authoring at 1.3x would buy
  real pull-back moves.
- The 8 ingested Lucide icons are validated and available but unused on screen; they prove
  the chain rather than appearing in the episode.
- Remotion needs a paid company licence above a size threshold — check before scaling.

## 12. Command reference

```bash
npm run audio          # 1. condition narration    -> wav + timemap      ~8s
npm run timing         # 2. remap + QA GATE 1                            ~3s
npm run verify:audio   # 3. QA GATE 2 -> LOCK                            ~5s
npm run sfx            # synthesise 15 SFX                               ~2s
npm run storyboard     # 4. shot list + pacing check                     ~1s
npm run manifest       # 6. inventory + QA GATE 3                        <1s
npm run typecheck
npm run qa:stills      # 8. 17 stills at keyword frames                  ~4m
npm run preview        # 9. low-res render                               ~4m
node tools/motion-qa.mjs                                              # ~20s
npm run render         # 10. final 1080x1920                             ~10m
npm run validate       # 11. delivery gate                               ~30s
```

## 13. Reusability ledger

**Reusable (Episode 002 gets free):** protagonist + 23 poses + 13 expressions, 27 props,
10 FX marks, 6 backgrounds, 23 animation primitives, caption system, gag-card system,
paper/stage surface, 15 SFX + the synthesiser, and all 8 tools.

**Episode-specific:** the 9 files in `src/scenes/`, and the beat plan inside
`build-storyboard.mjs`. That's it.

Generic things have generic names on purpose — `CameraPunch`, not `CasinoClockFunnyZoom`.
