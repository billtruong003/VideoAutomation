# Character Bible — Character System V1.0

> **This document is binding.** Any agent or person touching a recurring character reads
> this first. Where it and a scene disagree, this wins and the scene is wrong.

The cast is **Bill, Mina, Dex, Gus and Mochi**. Five, and the list is closed.

They are not episode assets. They are the channel's IP, and they are expected to carry
hundreds of Shorts and eventual long-form. Everything below exists so that the version of
Bill in Episode 200 is the same person as the one in Episode 001.

---

## 0. Philosophy

```
CHARACTER SHAPE  defines IDENTITY
EXPRESSION       defines EMOTION
ROUGH.JS         defines LINE CHARACTER
REMOTION         defines MOVEMENT
```

These four never blur into each other. A character is recognised by silhouette and
proportion; an emotion is chosen from a closed vocabulary of eyes, brows and mouths; the
hand-drawn quality comes from one stylizer that no character overrides; and motion is
poses over time. If you find yourself changing a head shape to convey an emotion, or
authoring a squiggle to convey a hand, you are in the wrong layer.

A recurring character must be instantly recognisable, extremely consistent, easy to
animate, easy to redraw, readable on a phone, simple enough for hundreds of episodes, and
expressive without becoming visually complicated. Every rule below serves one of those.

### The mechanism, not the promise

Consistency here is enforced by code, not by good intentions:

- A scene names a character (`character="bill"`), a pose and an expression. It cannot
  reach hair geometry, glasses coordinates or limb numbers — those are not exported to it.
- Asking for a pose or expression that does not exist **throws**. It does not fall back to
  neutral, because a character silently rendering wrong for a whole episode is worse than
  a crash during a still render.
- There is exactly one definition per character, in `src/character/characters/`, and one
  registry that hands it out. There is no second copy to drift from.

---

## 1. Bill — the mascot

**File:** `src/character/characters/bill.ts`

### Narrative role

Main protagonist and the **default audience surrogate**. Whatever an episode is
explaining, it happens to Bill: he gambles in the casino episode, he boards the plane in
the airline episode, he is the peasant in the medieval episode, he is the phone in the
battery episode. That gives the channel continuity without every story having to be
literally about him.

Most episodes are Bill plus zero to two others.

### Personality

Nerdy, awkward, curious, slightly clueless, quietly chaotic, unintentionally funny,
likeable. Expressive through **reaction** rather than through complex acting.

He is not heroic, not cool, not handsome, not babyish, not creepy, not overdesigned.

### Appearance

| | |
|---|---|
| Head | 96 × 86 units — **46%** of his 185-unit height, wider than tall |
| Skull | Rounded square, corner radius 20. Broad cheeks, simple lower jaw, no chin, no ears |
| Body | Short blocky torso, 58 units. A little box hanging below a huge head |
| Arms | Very short noodles, ~36 units at rest, subordinate to the head |
| Legs | Short, slightly spread, ~32 units visible below the shorts |
| Hair | Silver-grey mop: three blunt bang clusters at uneven depths, side locks flaring past the skull, off-centre parting |
| Glasses | Black rectangles, 30 × 24 at (±17, +6), thick frame, short bridge. **Mandatory** |
| Eyes | Tiny vertical ink ovals, 5.8 × 9.2 units. The glasses do the framing |
| Mouth | Tiny, low on the face. `squiggle` at rest — not quite a line, not quite a smile |
| Top | Mustard yellow, oversized and blocky |
| Bottom | Dark deep-blue shorts |
| Feet | Small light shapes. Never a visual feature |

### Identity anchors — non-negotiable

1. Huge rounded-square head, 46% of total height, wider than tall
2. Tiny body: a short blocky torso hanging below the head
3. Messy silver-grey mop with chunky uneven bangs and side locks
4. Black rectangular glasses, always, dominating the mid-face
5. Tiny simple eyes — small ink marks, never large pupils
6. Tiny awkward mouth, low on the face
7. Bright mustard-yellow top
8. Dark deep-blue shorts
9. Goofy nerdy silhouette: broad hair, narrow body, short limbs

If a costume covers anchors 7 and 8, the other seven must all survive.

### Palette

`billSkin #F6DCBE` · `billHair #C9C6C2` · `billShirt #F2B33D` ·
`billPants #2B3A66` · `billGlasses #1E1B18` · `billOutline #23201D`

Never write a hex value in character or scene code. Use the token.

### Expression language — 20 canonical

`neutral` `happy` `smug` `confused` `surprised` `shocked` `horrified` `angry` `annoyed`
`suspicious` `worried` `sad` `exhausted` `deadpan` `laughing` `panic` `curious` `focused`
`content` `dizzy`

His signature is **deadpan** straight to camera. His comedy is a beat of delay and then
everything at once.

### Motion personality

Hesitant. `idle 1.0`, `reactionDelay 3`, `holdStep 2`, `gestureScale 1.0`. He reacts three
frames after the thing happens and then snaps — the delay is the joke, the snap is the
punchline.

---

## 2. Mina — the counterweight

**File:** `src/character/characters/mina.ts`

**Role.** The smart, calm, rational counterweight. She understands what is happening,
explains it correctly, notices Bill's mistake, supplies audience sanity, and occasionally
turns out to be more ruthless about the situation than Bill ever was.

**Personality.** Intelligent, composed, observant, practical, quietly sarcastic. Never mean.

**Appearance.** Large head (86 × 84), rounder skull (radius 30), narrower everywhere than
Bill — shoulders ±16, hips ±12. Smooth dark shoulder-length bob that hangs **below the
jaw**, with one prominent fringe crossing the forehead. Flatter, more horizontal eyes than
Bill. Small simple mouth. Teal top, dark plum bottom.

**Identity anchors.** Smooth dark bob with side fringe · teal top · flat calm eye shape ·
narrow tidy silhouette · still level posture.

**Palette.** `minaSkin #F3D3B5` · `minaHair #3A2E2A` · `minaShirt #2E9E8F` ·
`minaPants #4A3350`

**Expressions (12).** `neutral` `smallSmile` `happy` **`unimpressed`** `suspicious`
`confused` `surprised` `shocked` `annoyed` `angry` `worried` `deadpan`

`unimpressed` is her most important expression and the one her whole design serves. Three
things make it land and all three are required: the lids come **down** (`halfLid`, not a
squint — a squint reads as effort), the brow goes dead **flat** rather than angry, and the
gaze sits slightly **off** the target as though she has already stopped bothering.

**Motion.** Controlled. `idle 0.6`, `reactionDelay 1`, `holdStep 3`, `gestureScale 0.75`.
She under-reacts on purpose and holds longer than Bill.

---

## 3. Dex — the bad-idea generator

**File:** `src/character/characters/dex.ts`

**Role.** Chaotic friend and catalyst. He exists so that things happen: proposes terrible
ideas confidently, presses the button, buys the suspicious thing, starts the challenge,
escalates, drags Bill in, stays optimistic throughout.

**Personality.** Energetic, impulsive, confident, mischievous, friendly, chaotic. **Never
malicious.**

**Appearance.** Slightly narrower and more oval skull than Bill (86 × 88, radius 30). Dark
charcoal hair in hard directional diagonal spikes, shorter than Bill's mop and
deliberately asymmetric. Slightly larger, rounder eyes. Orange top, dark olive bottom.
Forward-leaning pose language.

**Identity anchors.** Dark energetic directional spikes · orange top · a grin at rest ·
forward-leaning posture · wiry narrow frame.

**Palette.** `dexSkin #E9BE95` · `dexHair #2A2724` · `dexShirt #E8703A` ·
`dexPants #40452F`

**Expressions (12).** `neutralGrin` `happy` `excited` `smug` **`evilIdea`** `surprised`
`shocked` `confused` `panic` `fakeInnocent` `angry` `horrified`

`evilIdea` is the "I HAVE A TERRIBLE IDEA" face and must read with no dialogue. Narrowed
eyes plus an asymmetric brow gives scheming; the wide grin under it gives delight; the
sparkle accent says he is pleased with himself. Remove any one and it collapses into
ordinary smugness.

**Motion.** Fast in, big out. `idle 1.7`, `reactionDelay 0`, `holdStep 2`,
`gestureScale 1.35`. He overshoots every pose and never waits a beat.

---

## 4. Gus — the deadpan authority

**File:** `src/character/characters/gus.ts`

**Role.** Whichever adult is in charge of wherever the episode happens: manager, security
guard, older coworker, boss, shop owner, official. **The role changes per episode; the
character does not.** A viewer should recognise him instantly in a job they have never seen
him do.

**Personality.** Dry, calm, tired, practical, blunt, extremely difficult to impress. He
usually delivers the final punchline with the smallest reaction on screen.

**Appearance.** The most grounded build in the cast. Wider and squarer head (100 × 84,
radius 18), wider shoulders (±23), stockier, and genuinely **shorter** — his head sits 6
units lower while his feet stay on the same ground line, so he loses height from the
middle rather than looking like a shrunk Bill. Grey receding hairline with two side tufts.
One small simple moustache, always the same shape. Tired half-lidded eyes, near-horizontal
brows. Muted sage top, brown-charcoal bottom.

Age in this drawing language is a **hairline**, not wrinkles — line detail that fine does
not survive being shrunk to 30%.

**Identity anchors.** Grey receding hairline with side tufts · the moustache · stocky
compact shorter body · tired half-lidded eyes · muted sage green.

**Palette.** `gusSkin #EACAA6` · `gusHair #B9B5AE` · `gusShirt #7C8F6B` ·
`gusPants #4A4038`

**Expressions (12).** `neutral` `deadpan` `mildlyAnnoyed` `suspicious` `tinySmile`
`disappointed` `confused` `surprised` `angry` `exhausted` `horrified` `smug`

His emotions are deliberately **smaller** than Dex's. Even his `surprised` keeps the mouth
small. His restraint is encoded, not left to a scene author's judgement.

**Motion.** Barely moves. `idle 0.35`, `reactionDelay 6`, `holdStep 4`,
`gestureScale 0.55`. Long holds, slow turns, late and small reactions.

---

## 5. Mochi — the silent mascot

**File:** `src/character/characters/mochi.ts`

**Role.** Pet and silent chaos element. Reaction gags, background gags, theft, silent
judgement of Bill, appearing where she should not, becoming the visual payoff, and
occasionally saving the situation by accident.

**She does not speak.** Everything comes from body shape, ears, tail, movement and timing —
which is why her pose library is large relative to her expression library. For Mochi, the
pose *is* the line.

**Appearance.** A simplified cat-like chibi blob, not a realistic cat. Cream loaf body with
the head **merged into it** — never a neck. Two small triangular ears with charcoal
insides. Dot eyes, a tiny cat mouth, short paws, an expressive tail with a charcoal tip.
No fur detail. No whisker complexity. No anatomical realism. She is drawable from a handful
of shapes, which is the requirement for a character who has to survive being a 40-pixel
background gag.

**Identity anchors.** Cream loaf with a merged head · two small triangular ears · charcoal
ear and tail-tip accents · tiny deadpan face · expressive tail.

**Palette.** `mochiBody #F4E4C6` · `mochiAccent #59544E` · `mochiNose #E8896F`

**Expressions (10).** `neutral` `happy` `smug` `curious` `shocked` `angry` `scared`
`asleep` **`judging`** `hungry`

`judging` is the silent stare and her most useful state — Mina's `unimpressed` translated
into a face with no eyebrows to speak of.

**Motion.** Nothing, nothing, nothing, then everything at once. `idle 0.5`,
`reactionDelay 0`, `holdStep 3`, `gestureScale 1.5`. Holds and bursts.

---

## 6. What must NEVER change

- The **identity anchors** listed for each character.
- The **rig contract**: hip at origin, up is negative Y, poses are pure joint data,
  position and scale are transforms applied to the output.
- The **palette tokens**. Correct them centrally in `src/style/tokens.ts` if a colour is
  wrong; never override one at a call site.
- **One stylizer.** Rough.js draws everything. `perfect-freehand` is gone and does not
  come back — it is an authoring tool wearing a stylizer's clothes, and it escaped the
  global style switch.
- **Determinism.** Seeds derive from stable identity strings. Nothing may use
  `Math.random()`, a clock, or a frame counter to decide geometry.
- **The cast is five.** See §11.

## 7. What MAY vary

- Pose, expression, gaze, blink and talk state — freely, from the canonical libraries.
- Scale, position, flip, rotation, opacity — these are camera decisions.
- Costume overlays, within the costume rules below.
- The paper halo (`halo`), per shot. It is **off by default**; turn it on only for a
  character standing on a genuinely dark background who would otherwise lose their
  outline. On the normal paper stage it just fringes the drawing in white.
- Adding a NEW pose or expression to a canonical library — see §8 and §9.

---

## 8. Expression rules

The expression system is **closed**.

A scene writes:

```tsx
<DoodleCharacter character="bill" pose="thinking" expression="confused" />
```

It never writes "draw a funny scared face here", and it never hands the renderer a
hand-built expression object.

If an episode genuinely needs a face that does not exist:

1. Add it to that character's canonical library in `src/character/characters/`.
2. Run `npm run qa:characters` and inspect the expression sheet.
3. Only then use it.

An expression is three picks from the closed vocabularies (`EyeState`, `BrowState`,
`MouthState`) plus optional accents. It may **never** contain coordinates, sizes or
geometry. That is what makes the expression sheet a real test: every cell is the same
head, the same metrics and the same part libraries, so a bad face is always a bug in a
vocabulary or in the metrics — fixable once, for every expression at once.

Talking is not lip sync. Four mouth shapes (`talkClosed` `talkSmall` `talkMedium`
`talkWide`) switched on a rhythm. The emotional state survives because only the mouth is
replaced: `expression="worried"` with `talk` still reads worried.

## 9. Pose rules

Same contract. Prefer `pose="pointing"` over episode-specific arm coordinates.

There is **one shared pose library** for all four humanoids, because a pose is a body
attitude and not a personality — `shrug` means the same thing on Bill as on Gus. Giving
each character a private copy is how a library rots into sixty near-identical entries.
Personality comes from which poses a character reaches for (`corePoses`) and how fast they
get there (`MotionPersonality`).

Passing a `Pose` *object* rather than a name is allowed and is not a loophole: it is how
`usePoseSwap` returns a blended pose mid-transition.

When authoring a new pose:

- The torso is 19 half-widths at the shoulder and 14 at the hip. A hand at |x| < 26 will
  touch the body. That is fine — it is no longer invisible — but check the hand/arm sheet.
- Raised hands live at |x| ≥ 56 unless the pose wants a hand ON the face. The head is 96
  units wide on a 38-unit torso and overhangs the shoulders badly.
- The renderer decides arm layering automatically from whether a hand rises above the jaw.
  Override with `armLayer` only for the two cases geometry cannot infer: hands on the
  face (`overHead`) and hands genuinely hidden behind the body (`behind`).

## 10. Costume and scale rules

**Costumes are additive.** An overlay is drawn on top of a finished canonical character in
the local space of an attachment slot (`head`, `face`, `torso`, `back`, `handL`, `handR`).
It never replaces geometry. Bill in an astronaut helmet is still visibly Bill because the
head shape, hair, glasses and proportions are all still underneath.

`hidesHair` exists for a full helmet. Reach for it rarely — it removes one of Bill's two
strongest silhouette cues, and with the glasses also gone there is nothing left that says
Bill.

**Scale** comes from each character's `scaleProfile` (`hero` / `medium` / `background`),
not from a number typed into a scene. Mochi's profile is smaller than everyone else's,
which is what keeps her small without scenes guessing.

Bill leads the cast by **identity**, not by size. Do not make him physically enormous
relative to the others.

Every character must work at 100%, 60%, 30% and thumbnail scale — see
`qa/characters/phone-size-test.png`. The channel is watched on phones. A design that only
works zoomed in is a failed design.

## 11. NPCs versus the recurring cast

Future episodes will need a casino manager, a Roman soldier, a scientist, an airline
worker, a medieval peasant, a CEO, a customer, a stranger.

**None of them may become a sixth recurring character.** Every addition dilutes the
identity that makes the other five worth having.

They are **NPC archetypes** instead: `makeNpc('civilian' | 'staff' | 'suit' | 'shadow')` in
`src/character/npc.ts`. Same rig, same stylizer, same pose and expression libraries, but a
deliberately generic look — no signature hair, no glasses, a smaller head, a muted
desaturated palette that avoids all four cast hues.

Two rules:

1. **An NPC is never a recoloured cast member.** Handing Bill a different shirt colour and
   calling him "the manager" is exactly the drift this system exists to prevent — it
   teaches the audience that Bill's yellow top means nothing. Episode 001 shipped with two
   of these and both are now NPCs.
2. **NPCs are episode-scoped.** They have no registry entry, no identity anchors, and
   nothing is promised about them between episodes. They are passed to `DoodleCharacter`
   by `def`, never by name — which is what makes "recurring cast" a fact about the code
   rather than a promise in a document.

## 12. Suggested narrative functions

| | |
|---|---|
| **Bill** | Experiences the concept. The audience is standing where he is standing |
| **Mina** | Facts, sanity, correction, the skeptical reaction |
| **Dex** | Catalyst, escalation, temptation, the bad idea |
| **Gus** | Authority, the employee, the manager, the final deadpan beat |
| **Mochi** | Silent gag, background joke, visual punchline |

Do not force all five into every episode. Most episodes should be Bill plus zero to two
supporting characters.

## 13. Views

The rig is **front-facing**. There is no z-axis, no turnaround and no true profile.

`facing="left34" | "right34"` shifts the features off-centre and swings the parting, which
sells a head turn in a 40-second Short and cannot break, because nothing actually rotates.

A real three-quarter would need a second set of head geometry, a second hair path and a
second glasses shape per character — five characters' worth of drift risk to buy an angle
this channel's shot language does not use. Consistency is chosen over fake perspective. If
a future episode genuinely needs a profile, it is a deliberate project, not a prop.

## 14. QA gates

Before any character change ships:

```bash
npm run typecheck
npm run qa:assets        # every pose and expression, in isolation, byte-identical twice
npm run qa:characters    # renders qa/characters/*.png
```

Then **open the sheets and look**. Rendering them is half the job.

Reject any face that appears creepy, malformed, grotesque, unintentionally angry,
unintentionally sad, visually noisy, unreadable, or inconsistent with the same character.
Do not rationalise a bad face as "doodle style" — simple can still be ugly. The objective
is **simple, appealing and readable**.

The hand/arm sheet has one pass condition: in every cell you can trace shoulder → arm →
hand without guessing. The silhouette sheet has one: name all five without reading the
labels.
