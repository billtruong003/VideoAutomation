# Mr.Yolk — long-form production

A second channel sharing this repository. It has its own visual language, its own delivery
spec, and its own pipeline; it shares the bundle, ffmpeg plumbing, ElevenLabs adapter, and
nothing else.

**This is not Bill Finds Out.** Nothing in `src/mryolk/`, `tools/mryolk/`, `data/mryolk/`,
`public/mryolk/` or `qa/mryolk/` affects that channel, and no Mr.Yolk tool reads or writes its
episodes, metadata, or YouTube state.

|                | Bill Finds Out              | Mr.Yolk                              |
| -------------- | --------------------------- | ------------------------------------ |
| Format         | Shorts, 1080x1920           | Long-form, 1920x1080                 |
| Ground         | Warm paper `#F7F3E9`        | White `#FFFFFF`                      |
| Artwork        | Drawn at render by Rough.js | Supplied PNG sheets, cut once        |
| Type           | Bangers / Patrick Hand      | Nunito                               |
| Captions       | Large, central              | Phrase-length, lower third           |

---

## The one rule

**No scene may invent a frame number.**

Every time in this production derives from a word in the locked narration master. A scene says
"when the narrator says *borrow*"; it never says "at frame 412". That is what makes the audio
re-processable: change the narration, re-run the pipeline, and every visual moves with it.

The chain is `narration master → transcript → segments → scene ranges → word anchors`, and
`src/mryolk/clock.ts` is the only place any of it is converted to frames.

---

## Pipeline

Run in order. Each stage writes an artifact the next one reads.

```bash
node tools/mryolk/extract-sheets.mjs      # source art  → transparent PNGs + contact sheets
node tools/mryolk/build-registry.mjs      # + taxonomy  → semantic asset registry
node tools/mryolk/analyse-audio.mjs <f>   # measure the raw takes (reporting only)
node tools/mryolk/build-narration.mjs     # 3 takes     → one narration master
node tools/mryolk/stt.mjs public/mryolk/audio/narration-master.wav data/mryolk/stt
node tools/mryolk/research-stock.mjs      # Pexels/Pixabay → local files + provenance
node tools/mryolk/make-proxies.mjs        # stock       → render-friendly re-encodes
node tools/mryolk/make-sfx.mjs            # synthesised sound palette
node tools/mryolk/export-edit-plan.mjs    # scenes+cues → data/mryolk/edit-plan.json
npm run mryolk:render
node tools/mryolk/verify-output.mjs       # delivery gate
node tools/mryolk/qa-frames.mjs           # visual QA contact sheets
```

### Artifacts

| Path | What it is |
| --- | --- |
| `public/mryolk/assets/*.png` | 216 individual drawings, transparent |
| `public/mryolk/stock/` | researched footage as downloaded (licensing record) |
| `public/mryolk/stock/proxy/` | re-encodes the renderer actually reads |
| `public/mryolk/audio/narration-master.wav` | the master clock |
| `public/mryolk/sfx/*.wav` | 16 synthesised sounds, no licence |
| `data/mryolk/asset-registry.json` | slug → drawing, with tags |
| `data/mryolk/stt/` | transcript, words, segments, `subtitles.srt` |
| `data/mryolk/edit-plan.json` | derived edit plan — chapters, beats, cues |
| `data/mryolk/stock-provenance.json` | provider, creator, licence, hash |
| `data/mryolk/credits.md` | attribution, ready for a description |

---

## Decisions worth knowing before changing anything

**Background removal is by connectivity, not colour.** Mr.Yolk's eyes are white, so are the
documents, the airplane and the lab coat. Keying near-white globally punches holes through the
drawing. `extract-sheets.mjs` removes only the near-white region *reachable from the edge of
the sheet*, then grows two pixels into the anti-aliased rim for a soft edge.

**Assets are addressed by meaning.** `yolk('yacht-rich')`, never `finance-b-r4c5`. Grid
coordinates are an accident of how the art was laid out; `tools/mryolk/taxonomy.mjs` is the
only file that knows them, and `build-registry.mjs` fails if a cell has no meaning or a
meaning has no cell.

**The audio was measured before it was processed.** All three takes came back clean — zero
clipped samples, no dead air, LRA under 4 — so there is deliberately **no noise reduction** and
**no aggressive silence removal**. What did need fixing was a 3.5 LU drift across the takes, so
each is normalised independently *before* the join. Speed is 1.08x against a measured 159.5
wpm; the 1.3x that suits a Short would make this exhausting by minute four.

**Transcription runs on the FINAL master.** Silence removal is non-linear, so raw-take
timestamps cannot be shifted onto processed audio by any single factor.

**Stock is the minority partner.** 22 queries, each tied to a named moment in the narration.
Candidates that were retrieved and refused are recorded in `STOCK_REJECTS` with the reason —
a butterfly returned for "airplane rivets", a *green rising* chart returned for "market crash",
an airliner in a real airline's livery. Those failures are semantic; no resolution or aspect
threshold would catch any of them.

**Nothing hits the network during a render.** Research happens once, up front. By render time
every asset is a local file with a known hash.

**Sound effects are synthesised, not sourced.** `make-sfx.mjs` generates all 16 from a seeded
noise source, so the project owns them outright and a re-render cannot change the mix.
Narration renders at unity; no cue exceeds 0.30, and `assertDensity()` fails the build if any
ten-second window collects more than nine of them.

**There is no music.** No verified licence exists for this channel, so the mix is narration and
effects only.

---

## Composition

`MrYolkDebt`, 1920x1080 @ 30fps. Length is **not** written anywhere — it is
`ceil((measured audio duration + 2.2s tail) * 30)`.

Scenes are declared in `src/mryolk/scenes/index.ts` as transcript segment ranges.
`resolveScenes()` refuses a table with a gap or an overlap, so the timeline is gapless by
construction rather than by anyone keeping arithmetic correct by hand.
