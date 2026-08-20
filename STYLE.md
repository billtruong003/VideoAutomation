# Doodle Explainer — Visual Style Contract (V2)

> **We explain weird things with stupid drawings.**

This is the channel's binding style contract. It is injected verbatim into any process —
human or model — that authors artwork.

---

## 0. The one rule

# DESIGN CLEANLY. RENDER IMPERFECTLY.

V1 tried to produce a hand-drawn look by asking whoever authored an asset to *draw it
badly*: lopsided beziers, manually offset fills, hand-picked jitter tables. That works
exactly as well as the author's intuition on the day, which is why it drifted — every new
prop was a fresh negotiation with "what does sketchy mean".

V2 inverts the responsibility:

| Stage | Who does it | What it produces |
|---|---|---|
| **Author** | you | clean semantic geometry — a clock is a circle, twelve ticks, two hands |
| **Stylize** | `RoughAsset` | the channel's hand, applied identically to everything |

**Never author roughness. Author correctness.** The style lives in
`src/style/tokens.ts` and `src/assets/RoughAsset.tsx`, and nowhere else.

Consequence: restyling the whole channel is a token change, not 27 rewrites.

### Turning the hand off

Because styling is separated from authoring, the entire channel look is one switch:

```bash
REMOTION_STYLE_MODE=clean npx remotion render CasinoClocks out/clean.mp4
```

`clean` zeroes roughness and bowing and preserves vertices, so Rough.js emits the exact
geometry each asset was authored as. No asset file changes. Useful for two things:

1. **Proving the separation is real** — if turning the stylizer off required edits, the
   style would still be baked into the assets, which is the V1 failure.
2. **Diagnosis** — a layout problem seen in clean mode is a geometry bug; one that appears
   only in rough mode is a roughness artefact (see the dice-pip case in §4).

Since one stylizer draws everything, clean mode flattens the ENTIRE drawing. That was not
true of an earlier revision, and the asymmetry is what exposed its design flaw — see §1.

---

## 1. One stylizer draws everything

There is exactly **one** drawing engine: Rough.js, wrapped by `src/assets/RoughAsset.tsx`.
Assets choose a *preset*, never an engine.

| Preset kind | For | Shape kinds |
|---|---|---|
| **shape presets** (`ROUGH`) | things with area and edges — a clock face, a cabinet, a wall, a window frame | `rect` `circle` `ellipse` `line` `polygon` `path` `arc` `curve` |
| **pen presets** (`PEN`) | things drawn in one motion — a brow, a mouth, a limb, a swoosh, a scribble | `stroke` |

Both are the same engine with different parameters. A `stroke` is a curve through points
drawn with a thinner, calmer roughness; that is the entire difference.

### A correction, kept on the record

An earlier version of this document said:

> *"a Rough.js eyebrow looks like a snapped twig"*

and used that claim to justify adding **perfect-freehand** as a second drawing library for
gestural marks. **The claim was never tested, and it was wrong.** `qa/v2-pen-probe.png`
rendered both side by side and the Rough.js mark was the cleaner of the two. The rendered
evidence is at `qa/v2-pen-probe.png`.

Worse, the second library was actively harmful:

1. **perfect-freehand is an AUTHORING tool, not a stylizer.** Its character comes from a
   pressure profile that has to be hand-authored — which is V1's failure ("the author
   supplies the hand") wearing a library. The source geometry was no longer boring, so the
   stylizer no longer owned the look.
2. **Variable-width strokes are a different pen.** Rough.js gives a uniform ballpoint line;
   perfect-freehand gives a tapered brush stroke. On the same head the drawing visibly had
   two hands. At phone size the swelling just went muddy.
3. **It escaped the style switch.** `REMOTION_STYLE_MODE=clean` flattened every Rough.js
   shape and left every freehand mark untouched — half the frame obeyed, half didn't. That
   asymmetry is what exposed the design flaw.

The dependency was removed. All 15 `k:'stroke'` marks in the library migrated with **zero
asset edits**, because the change was one branch in the single stylizer — which is the
clearest demonstration so far that the authoring/styling separation is real.

**Generalisable rule: for a roughening pipeline to work, the source must be genuinely clean
and boring.** Anything that adds expressive character *before* the stylizer competes with
it, and the drawing ends up with two authors.

### Dialling the character's hand separately

The protagonist is the subject: largest on screen, moving, and carrying the performance in
face marks only a few units across. Roughness costs the most legibility exactly there and
almost nothing on architecture — so it is dialled separately.

```bash
REMOTION_CHARACTER=rough|single|soft|clean npx remotion render ...
```

| Mode | What it does | Reads as |
|---|---|---|
| `single` | full roughness, **one pass instead of two** (default) | drawn fast and confidently |
| `rough` | same hand as the world | sketched, but hairy at large scale |
| `soft` | one pass + roughness × 0.35 | drawn, but crisp |
| `clean` | exact geometry | clean figure against a sketched world |

**The finding worth keeping:** most of the visual noise on the character was never the
roughness — it was Rough.js drawing every outline **twice**. `single` removes the hairiness
while keeping all the character. Compare `qa/final/hand-zoom4.png`. It is the default as of
Character System V1.0; the experiment is over.

This only affects the cast. Props, FX and backgrounds keep the world's hand, which is what
gives the figure/ground separation.

### The white rim is off

Characters draw with **no paper halo** by default. It exists as an opt-in prop for the one
case that needs it — a character standing on a genuinely dark background who would
otherwise lose their outline — and on the normal paper stage it only fringes the drawing in
white and cheapens it. If a shot needs separation, that shot asks for it.

---

## 2. Hard bans

- No pure black (`#000`) and no pure white (`#fff`).
- No hex literals in asset code — colour comes from `PALETTE` only.
- No `Math.random()` anywhere. Ever. See §5.
- No hand-authored "wobbly" path data, offset fills, or jitter tables. That is V1.
- No gradients, drop shadows, blurs, bevels, glows.
- No photorealism, no raster images.
- No real casino names, logos, marks, or recognisable venues.
- No copying an identifiable creator's character design.

---

## 3. Palette

`src/style/tokens.ts` → `PALETTE`. Colour carries meaning; a prop is grey unless there is
a reason for it not to be.

| Token | Means |
|---|---|
| `paper` / `paperShade` | the notebook surface |
| `ink` / `inkSoft` | every outline (warm charcoal, never black) |
| `coral` | alarm, attention, the punchline |
| `gold` | casino light, money, cheap glitter |
| `teal` | daylight, calm, relief |
| `violet` | weird, psychological, time distortion |
| `grey` / `greyDeep` | backgrounded, unimportant |
| `nightWall` / `nightFloor` | enclosed windowless interior |
| `skin` / `shirt` | the protagonist only |

---

## 4. Roughness tokens

`ROUGH` in tokens.ts. Named by intent, never by number. Past roughness ~2.2 a drawing
stops reading as *confidently sketched* and starts reading as *shaky*.

| Token | For | roughness / bowing / width |
|---|---|---|
| `prop` | foreground hero objects | 1.35 / 1.6 / 4.2 |
| `detail` | ticks, buttons, pips inside a prop | 1.15 / 1.2 / 2.6 |
| `character` | the protagonist's body | 1.2 / 1.4 / 4.6 |
| `background` | architecture, set dressing | 1.9 / 2.4 / 2.4 |
| `card` | gag cards — text must stay legible | 0.9 / 0.8 / 5 |
| `accent` | bursts, speed lines | 2.1 / 2.0 / 3.2 |

Two calibration rules learned the hard way:

- **Below ~6 units, roughness reads as dirt, not character.** Pupils and other tiny filled
  discs override to `roughness: 0.35`. A 4-unit disc at normal settings is a scribble.
- **Use `single: true` on small details.** Rough.js draws outlines twice by default; on a
  3-unit tick the second pass reads as mud.

### Fills

`solid` is the house default. Rough.js hachure is seductive in isolation and a disaster at
1080×1920 on a phone — the hatching aliases into noise and fights the captions. `hachure`,
`crossHatch` and `sparse` exist for deliberate texture moments only.

### Pen presets

`PEN` in tokens.ts — uniform-width strokes for gestural marks, drawn by the same stylizer.

| Pen | For | width / roughness |
|---|---|---|
| `face` | brows, mouths, closed eyes | 3.6 / 0.75 |
| `hair` | cowlick | 3.8 / 0.95 |
| `limb` | noodle arms and legs | 7.0 / 0.70 |
| `accent` | emphasis marks, speed lines | 5.5 / 1.70 |
| `scribble` | loose annotation | 3.2 / 1.40 |

Face pens are deliberately the calmest in the set: a scratchy eyebrow reads as a mistake,
not as style. A tightly-coiled path (a dizzy spiral) must also use a low-roughness pen —
when the wander between points exceeds the spacing between them, the coil collapses to a blob.

---

## 5. Determinism — non-negotiable

Remotion renders frames out of order across parallel workers. Unseeded randomness produces
a different squiggle every frame, which reads as boiling static rather than a drawing.

- Every rough shape's seed derives from a **stable identity string**
  (`assetId:variant:index`) via `seedFrom()`. Never a counter, never a clock, never
  `Math.random()`.
- Scatter (sparkle positions, litter placement) uses `rand01` / `hashString` /
  `valueNoise` from `src/lib/rand.ts`.
- Same asset id → byte-identical output across frames, previews and final renders.

### The caching contract

> **Anything that changes per frame must be an SVG transform on the OUTPUT, never a change
> to the geometry handed to the stylizer.**

Roughened geometry is memoised on `(shape, options, seed)`. Position, rotation, scale and
opacity are transforms applied *around* that cached result. If a hand were generated at its
pose coordinates instead of at the origin and translated, a blended pose would mint a fresh
cache entry every frame and the character's linework would boil.

This is why every rough part in `DoodleCharacter` is authored at the origin, and why clock
hands are separate `AssetDef`s inside a `<g transform="rotate(...)">`.

---

## 6. Asset authoring pattern

`src/props/time.tsx` is the reference implementation. The shape is always:

```tsx
// 1. clean geometry as a module-level AssetDef, id kebab-case and stable
const WALL_FACE: AssetDef = {
  id: 'prop-clock-analog',
  shapes: [
    { k: 'circle', cx: 0, cy: 0, r: 34, fill: PALETTE.paper },
    ...ticks(34),
  ],
};

// 2. a component that places it and animates only via transforms
export const WallClock: React.FC<ClockArgs> = ({ hourAngle = 0, seed = 'wall-clock', ...rest }) => (
  <PropFrame seed={seed} {...rest}>
    <RoughAsset def={WALL_FACE} variant={seed} />
    <g transform={`rotate(${hourAngle})`}>
      <RoughAsset def={WALL_HOUR} variant={seed} />
    </g>
  </PropFrame>
);
```

- ids are stable and kebab-case — they are the Rough.js seed *and* the registry key
- anything that rotates is its own `AssetDef`
- sizes in character units (protagonist ~182 tall, head ~88 across)
- `PropFrame` supplies transform-level drift so props breathe without their geometry moving

### Backgrounds

Large flat colour fields are **plain SVG `<rect>`**, not rough-generated — a rough-filled
1080×1920 rectangle is thousands of hachure segments for zero visual gain. Spend rough
geometry on the *edges*: ceiling seams, wall/floor lines, window frames, silhouettes.
Under ~25 rough shapes per background. Backgrounds must recede: `rough: 'background'`,
muted colour, thin strokes.

---

## 7. Asset sourcing

Resolve in this order, and record the result in `data/asset-registry.json`:

1. **existing internal library** — `src/props/`, `src/fx/`, `src/backgrounds/`
2. **clean open/licensed sources** — e.g. `lucide-static` (ISC), normalized then roughified
3. **local licensed assets already in the workspace**
4. **generate clean semantic SVG** — and only clean; roughness is added downstream

Ingest path: `raw → SVGO normalize → roughify → registry entry → usable`.

Never scrape the web, never use unclear licensing, never use real brand marks. Every
external asset gets an entry in `ASSET_LICENSES.md`.

---

## 8. Motion

Limited animation, not smooth tweening.

- Character poses change **on twos** (every 2–4 frames).
- Camera moves **smoothly every frame**. The contrast between stepped character and fluid
  camera is what makes it read as deliberate rather than cheap.
- Squash and stretch on impact; anticipation before a big move.
- A meaningful visual beat every **0.5–2 s**, verified by `tools/motion-qa.mjs`.
- Sketch identity never animates. Objects move; their linework does not.

---

## 9. Typography and composition

- `FONTS.display` (Bangers) — gag cards, captions. `FONTS.hand` (Patrick Hand) — labels.
- Both self-hosted from `@fontsource` (OFL-1.1). Never a CDN.
- 1080×1920. Respect `SAFE` (top 140, bottom 420, left 60, right 190) — the Shorts right
  rail and bottom bar sit *on top* of the video.
- Captions live at `CAPTION_Y` (1442) with a heavy paper outline via `paint-order: stroke`.
- The camera may never zoom below 1.0: backgrounds are exactly 1080×1920 and a smaller
  zoom pulls their edges into frame. Clamped in `SceneCamera`.
