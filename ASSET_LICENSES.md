# Asset Provenance & Licences

Everything in this video is either **original work created for this project** or a
**self-hosted OFL font**. No stock art, no third-party illustration, no third-party audio,
no scraped images.

---

## Artwork — 100% original

| Asset group | Count | Origin |
|---|---|---|
| Protagonist "Nib" (rig, 23 poses, 13 expressions) | 36 | Original. Parametric SVG rig authored for this channel. |
| Props (clocks, slots, chips, cards, wallet, window, plant…) | 27 | Original SVG components. |
| FX marks (?, !, sparkles, impact lines, spirals…) | 10 | Original SVG components. |
| Backgrounds | 6 | Original SVG components. |
| Exported `.svg` snapshots in `public/doodle/` | 80 | Generated from the above by `tools/export-svg-assets.mjs`. |

Every path in the library was authored as code in this repository. Nothing was traced,
imported, or derived from an existing illustration set.

### Character originality

The protagonist was designed from scratch for this channel. Open Doodles and Open Peeps
were reviewed only as references for *modular SVG structure* (how to decompose a figure so
parts can animate independently) — **no geometry, path data, or design element from either
was used or adapted.** The rig, proportions, cowlick silhouette, face system and palette
are original.

The general category of "limited doodle animation" is a style, not property. No specific
creator's character design was cloned. Named-as-off-limits and deliberately avoided:
Rennrat, Its ok koy, Sam O'Nella, Haminations, ChainsFR.

### No trademarks

No real casino name, logo, mark, slogan, venue architecture, currency, or card-brand
symbol appears. The one sign in the library reads the generic word "CASINO" set in the
project's own display font. Reel symbols are abstract doodle glyphs.

---

## Audio

### Narration

Generated with ElevenLabs (voice: "Liam — Energetic, Social Media Creator") by the project
owner, then processed locally by `tools/process-voiceover.mjs`. Raw source and alignment
JSON preserved unmodified in `raw-source/`. Commercial usage rights follow the owner's
ElevenLabs subscription terms.

### Sound effects — 100% original, procedurally synthesised

All 15 effects are generated from scratch by `tools/make-sfx.mjs` using an inline
oscillator/noise/filter synth. No sample libraries, no downloads, no third-party audio.
The project owns them outright: nothing to licence, nothing to attribute, and no Content ID
exposure.

```
tick · whoosh · clock-pull · pop · vanish · slot-beep · chip-clack · clock-spin
money-flutter · record-scratch · impact · reveal-sting · swarm · light-hum · blip
```

Deterministic: the generator uses a seeded xorshift, so re-running produces byte-identical
files.

### Music

None. Voice + SFX only, which is an explicitly acceptable outcome. No commercial music was
used, so there is no music licensing exposure.

---

## Typography

| Family | Used for | Source | Licence |
|---|---|---|---|
| **Bangers** | gag cards, captions | `@fontsource/bangers` (npm) | SIL Open Font License 1.1 |
| **Patrick Hand** | small labels | `@fontsource/patrick-hand` (npm) | SIL Open Font License 1.1 |

Both are self-hosted from `node_modules` rather than a CDN. That keeps renders offline-safe
and deterministic, and guarantees the render can never silently fall back to a system font.
OFL-1.1 permits embedding and commercial use; the fonts are not sold or redistributed
standalone.

Full licence text ships with each package at
`node_modules/@fontsource/<name>/LICENSE`.

---

## Software

| | |
|---|---|
| Remotion | Renderer. **Remotion is free for individuals and small companies but requires a paid company licence above a threshold — see <https://remotion.dev/license>.** This is the one obligation in this project that needs checking before commercial publication at scale. |
| FFmpeg | Audio processing (LGPL/GPL build) |
| React, TypeScript, esbuild | MIT |

---

## Summary

| Category | Third-party content? |
|---|---|
| Illustration | None |
| Character design | None |
| Sound effects | None |
| Music | None (unused) |
| Fonts | Yes — 2 fonts, OFL-1.1, self-hosted |
| Narration voice | ElevenLabs, per owner's subscription |
