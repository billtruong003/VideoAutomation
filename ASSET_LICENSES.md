# Asset Provenance & Licences (V2)

Machine-readable companion: **`data/asset-registry.json`** — every ingested asset's source,
licence, normalization state, stylizer, seed and style version.

---

## 1. Artwork authored in this repository

| Asset group | Count | Origin |
|---|---|---|
| Recurring cast — Bill, Mina, Dex, Gus, Mochi: rig, 54 humanoid poses, 18 creature poses, 66 expressions | 132 | Original. Parametric rig and character system authored for this channel. See CHARACTER_BIBLE.md. |
| Props (clocks, slots, chips, cards, wallet, window, plant…) | 27 | Original clean geometry, stylized at render time. |
| FX marks (?, !, sparkles, impact lines, spirals…) | 10 | Original. |
| Backgrounds | 6 | Original. |

All authored as **clean semantic geometry** in `src/props/`, `src/fx/`, `src/backgrounds/`
and `src/character/`. Nothing traced, imported, or adapted from an existing illustration set.

### Character originality

Designed from scratch for this channel. Open Doodles and Open Peeps were reviewed only as
references for *modular SVG structure* — **no geometry, path data, or design element from
either was used or adapted**. The rig, proportions, cowlick silhouette, face system and
palette are original.

"Limited doodle animation" is a style, not property. No identifiable creator's character
design was cloned; Rennrat, Its ok koy, Sam O'Nella, Haminations and ChainsFR were
explicitly avoided.

### No trademarks

No real casino name, logo, mark, venue architecture, currency or card-brand symbol appears.
The one sign reads the generic word "CASINO" in the project's own display font. Reel
symbols and card suits are abstract geometric glyphs.

---

## 2. Third-party artwork — Lucide icons (NEW in V2)

**V1 contained no third-party illustration. V2 does.** Eight icons are ingested from
`lucide-static` to exercise and prove the asset resolver chain end to end.

| | |
|---|---|
| Package | `lucide-static@1.32.0` (npm) |
| Licence | **ISC** — © 2026 Lucide Icons and Contributors |
| Licence text | `node_modules/lucide-static/LICENSE`, and <https://github.com/lucide-icons/lucide/blob/main/LICENSE> |
| Modified | **Yes** — normalized with SVGO, then stylized with Rough.js |
| Icons | `alarm-clock`, `clock`, `eye`, `eye-off`, `hourglass`, `moon`, `sun`, `wallet` |

Ingest chain, all recorded per-asset in the registry:

```
node_modules/lucide-static/icons/<name>.svg     (upstream, untouched)
  → assets/vendor/lucide/<name>.svg             verbatim provenance copy
  → assets/normalized/<name>.svg                SVGO, viewBox asserted
  → assets/stylized/<name>.svg                  Rough.js, deterministic seed
```

ISC permits use, modification and redistribution with the copyright notice retained.

> **Notice retention.** SVGO strips Lucide's upstream `<!-- @license -->` comment during
> normalization. The notice is therefore preserved here and in every registry entry
> (`license`, `licenseUrl`, `source`, `sourcePath`) rather than inside the SVG files.
> `tools/ingest-vendor-assets.mjs` prints a warning if this ledger stops mentioning an
> ingested source package.

**Current usage:** these icons are ingested, validated and available to scenes. As of this
build every entry's `usedIn` is empty — Episode 001's on-screen assets are all
repository-authored. They exist to prove the pipeline, not to pad the episode.

---

## 3. Audio

### Narration

Generated with ElevenLabs (voice: "Liam — Energetic, Social Media Creator") by the project
owner, then processed locally by `tools/process-voiceover.mjs`. Raw source and alignment
JSON preserved unmodified in `raw-source/`. Commercial rights follow the owner's ElevenLabs
subscription terms.

### Sound effects — original, procedurally synthesised

All 15 effects are generated from scratch by `tools/make-sfx.mjs` using an inline
oscillator/noise/filter synth. No sample libraries, no downloads, no third-party audio.
Deterministic (seeded xorshift), so re-running produces byte-identical files.

```
tick · whoosh · clock-pull · pop · vanish · slot-beep · chip-clack · clock-spin
money-flutter · record-scratch · impact · reveal-sting · swarm · light-hum · blip
```

### Music

None. Voice + SFX only. No music licensing exposure.

---

## 4. Typography

| Family | Used for | Source | Licence |
|---|---|---|---|
| **Bangers** | gag cards, captions | `@fontsource/bangers` | SIL OFL 1.1 |
| **Patrick Hand** | small labels | `@fontsource/patrick-hand` | SIL OFL 1.1 |

Self-hosted from `node_modules`, never a CDN — renders stay offline-safe and deterministic,
and can never silently fall back to a system font. Licence text ships at
`node_modules/@fontsource/<name>/LICENSE`. OFL-1.1 permits embedding and commercial use;
the fonts are not redistributed standalone.

---

## 5. Software

| | Licence / obligation |
|---|---|
| **Remotion** | Renderer. **Free for individuals and small companies, but requires a paid company licence above a threshold — <https://remotion.dev/license>.** The one obligation in this project that needs checking before commercial publication at scale. |
| Rough.js 4.6.6 | MIT |
| SVGO 4.0.2 | MIT |
| lucide-static 1.32.0 | ISC |
| React, TypeScript, esbuild | MIT |
| FFmpeg | LGPL/GPL build, audio processing only |

> **Two libraries were evaluated and removed:**
>
> - **svg2roughjs** — fails to load under Node ESM (its `main` is a UMD bundle exporting
>   nothing) and depends on browser-only APIs (`getBBox`, `getComputedStyle`, `canvas`,
>   `Image`) that jsdom does not implement for SVG geometry. `tools/roughify-svg.mjs`
>   implements the equivalent directly against Rough.js.
> - **perfect-freehand** — used briefly for gestural marks, then removed. It is an authoring
>   tool rather than a stylizer: its character comes from a hand-authored pressure profile,
>   which reintroduced the very problem V2 exists to solve, and its variable-width strokes
>   read as a second hand in the drawing. See `STYLE.md` §1.
>
> Neither is a dependency any more.

---

## 6. Summary

| Category | Third-party content? |
|---|---|
| Illustration (on screen in the episode) | **None** |
| Illustration (ingested, available) | Yes — 8 Lucide icons, ISC |
| Character design | None |
| Sound effects | None |
| Music | None (unused) |
| Fonts | Yes — 2 fonts, OFL-1.1, self-hosted |
| Narration voice | ElevenLabs, per owner's subscription |
