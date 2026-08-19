# Doodle Explainer — Visual Style Guide

> **We explain weird things with stupid drawings.**

This is the channel's binding style contract. Every asset in every episode obeys it.
It is injected verbatim into any agent or process that generates new artwork, which is
what keeps a library built in pieces looking like it came from one pen.

---

## 1. The one rule

The drawing should look like a smart person scribbled it quickly in a notebook —
**not** like a design team shipped it.

Quality comes from **simple drawings + excellent timing**, never from illustration
complexity. If a prop needs more than ~30 path commands, it is too detailed.

## 2. Hard bans

- No pure black (`#000`) and no pure white (`#fff`).
- No gradients, except the single paper vignette in `Paper.tsx`.
- No drop shadows, no blurs, no bevels, no glows.
- No corporate/flat-vector look, no stock-infographic look, no Canva look.
- No photorealism, no raster images of any kind.
- No real casino names, logos, marks, or recognisable venue architecture.
- No copying any identifiable creator's character design.
- No `Math.random()` anywhere — renders must be deterministic.

## 3. Palette

Import from `src/lib/style.ts`. Never hard-code a hex value in an asset.

| Token | Hex | Means |
|---|---|---|
| `paper` | `#F7F3E9` | notebook surface |
| `ink` | `#23201D` | every outline, warm charcoal |
| `inkSoft` | `#4A443C` | secondary annotation |
| `coral` | `#E8503A` | alarm, attention, the punchline |
| `gold` | `#F2B33D` | casino light, money, cheap glitter |
| `teal` | `#2E9E8F` | daylight, calm, relief |
| `violet` | `#7B5BA6` | weird, psychological, time distortion |
| `grey` / `greyDeep` | `#C9C2B4` / `#9A9384` | backgrounded, unimportant |
| `nightFloor` / `nightWall` | `#3B3550` / `#2A2438` | enclosed windowless interior |
| `skin` / `shirt` | `#FDF8ED` / `#5B7FB9` | the protagonist only |

Colour carries meaning. A prop is grey unless there is a reason for it to be otherwise.

## 4. Line

- Every stroke: `strokeLinecap="round"`, `strokeLinejoin="round"`, `fill="none"`.
  Spread `{...HAND_STROKE}` from `src/lib/style.ts` to get all three.
- Weights come from the `STROKE` token set — `prop: 4.4`, `propFine: 2.8`,
  `detail: 3.4`, `fine: 2.4`. Never invent a weight.
- Shapes are **intentionally imperfect**: no perfect circles, no perfectly straight
  lines, no exact symmetry. Nudge a control point a unit or two off where geometry
  says it belongs. A "circle" should be a lopsided bezier potato.

## 5. Fill

Flat only. The signature move: **fills are offset 2–3 units from their own outline**,
the way a felt-tip overshoots the pencil line it is colouring in.

```tsx
<path d={SHAPE} fill={PALETTE.gold} transform="translate(2.4 2)" />
<path d={SHAPE} fill="none" stroke={PALETTE.ink} strokeWidth={STROKE.prop} />
```

## 6. Coordinates

- **Character** (`src/character/rig.ts`): hip at origin, up is −Y, ~162 units tall.
- **Props**: drawn around their own local origin `(0,0)`, sized in the same units as
  the character so a prop placed next to Nib is automatically in scale. A wall clock is
  ~70 units across; Nib's head is ~88 units across.
- **Backgrounds**: full stage, `0 0 1080 1920`.
- Never move art by rewriting path coordinates — always `translate()` the group.

## 7. Component contract

Props are React components, not static files, because they must animate parts
independently (clock hands spin, slot reels flash). Each takes `DoodlePropProps`
(`x, y, scale, rotate, opacity, frame, seed, flip`) and renders inside `<DoodleProp>`.
Static `.svg` snapshots are exported to `public/doodle/**` for the asset library by
`tools/export-svg-assets.mjs`.

```tsx
export const WallClock: React.FC<DoodlePropProps & { hourAngle?: number }> = ({
  hourAngle = 0, ...rest
}) => (
  <DoodleProp seed="wall-clock" {...rest}>
    {/* art around (0,0) */}
  </DoodleProp>
);
```

Anything that must be animated by a scene is a **prop of the component**
(`hourAngle`, `lit`, `open`), never internal state and never time-derived inside the
prop itself.

## 8. Motion

Limited animation, not smooth tweening:

- Character pose changes land on **twos or threes** (every 2–4 frames).
- Camera moves are smooth **every frame**.
- Everything carries a sub-degree deterministic wobble (`src/lib/rand.ts`).
- Squash and stretch on impact; anticipation before a big move.
- A meaningful visual beat every **0.5–2 s**. Never a slideshow, never a zoom used to
  paper over a static shot.

## 9. Typography

- `FONTS.display` (Bangers) — impact text, gag cards, captions.
- `FONTS.hand` (Patrick Hand) — small labels and asides.
- Both self-hosted from `@fontsource` (OFL-1.1). Never a CDN, never a system fallback.

## 10. Composition

1080×1920. Respect the Shorts UI safe zones from `SAFE` in `src/lib/style.ts`
(top 140, bottom 420, left 60, right 190 — the right rail and bottom bar sit *on top*
of the video). Nothing that must be read may enter those margins.
