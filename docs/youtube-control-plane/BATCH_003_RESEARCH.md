# Batch 003 — Research Record

**STATUS: AWAITING APPROVAL.** Thirty topics researched and thirty scripts written. Nothing has
been generated, rendered or uploaded. No ElevenLabs call has been made.

Scripts: [`data/batch-003-scripts.json`](../../data/batch-003-scripts.json)

---

## Budget

`takesPerScript` is **1**, not 2, because the account is tight.

| | |
|---|---|
| ElevenLabs remaining | **13,249** characters (resets 2026-09-17) |
| Batch 003 narration | 16,294 characters, one take each |
| Observed billing ratio | **0.55×** input, measured from Batch 002 (19,862 in → 10,920 billed) |
| Projected cost | **~8,958** |
| Reserve after | ~4,291 · **32%** |

Two takes would cost ~17,900 and the account does not have it. The loss is smaller than it
looks: in Batch 002, 13 of 20 episodes were flagged as close calls where measurement could not
separate the takes, so the second take usually decided nothing.

**The allowance is shared with the Mr.Yolk project**, which consumed roughly 73,800 characters
of this month's quota. If that project runs again before 17 September, this budget shrinks.

---

## What is excluded

Thirty-one topics are already used — ten in Batch 001, twenty in Batch 002, plus
`escalator-handrail` from the factory canary. `escalator-handrail` was scripted and validated
but never published, so it is **carried into this batch** rather than wasted.

---

## Rejections

| Candidate | Why it was cut |
|---|---|
| **Suit jacket sleeve buttons** | The "military field surgeons rolled their sleeves" origin is repeated everywhere and sourced nowhere solid. The episode's whole payoff is that origin, so a shaky origin is a shaky episode. |
| **Cutting board juice groove** | Verified and true, but the answer is "it catches the juice" — a viewer works that out from the title. No gap to close. |
| **Care label symbols** | Real standard (GINETEX, ISO 3758), but "symbols so it works in every language" is guessable in one beat. |
| **Pasta spoon hole as a portion measure** | Unsupported, and hole sizes are not standardised. Same myth-guard failure as Batch 002. |
| **Shopping trolley wonky wheel** | Folklore. No mechanism to verify. |

---

## The thirty

Scored out of 100 on the same rubric as Batch 002: familiarity 20 · curiosity gap 20 · payoff
20 · visualizability 15 · fact confidence 10 · hookability 5 · short-form fit 5 · batch
novelty 5.

### Myth corrections — four episodes whose job is to fix something widely believed

| # | Episode | Score | The correction | Source |
|---|---|---|---|---|
| 1 | `phillips-cam-out` | 93 | The Phillips screw was **not** designed to slip. The 1933 patent lists "no tendency to cam out" as a goal. Cam-out was a flaw that later proved useful with clutchless power drivers. | US patent 1933; Wikipedia *Cam out*; ToolGuyd |
| 2 | `bread-stale-fridge` | 92 | Staling is starch **retrogradation**, not drying — stale bread weighs the same as fresh. It runs fastest at fridge temperature, so refrigerating bread makes it stale ~6× faster. | Wikipedia *Staling*; Red Star Yeast; FoodCrumbles |
| 3 | `toothpaste-eye-marks` | 90 | The coloured square is a printing **eye mark** for packaging sensors. The "green = natural, red = chemicals" chart is invented. | Snopes; Colgate |
| 4 | `chocolate-bloom` | 87 | The white film is cocoa butter recrystallising, not mould. Bloom is flat and even; mould is fuzzy and patchy. | Wikipedia *Chocolate bloom*; NCBI PMC8151285 |

### Safety and code — things designed around how people actually behave

| # | Episode | Score | Premise | Source |
|---|---|---|---|---|
| 5 | `emergency-exit-outward` | 95 | Exit doors open outward because 602 people died at the Iroquois Theatre in 1903 against doors that opened inward. | Smithsonian; Wikipedia *Crash bar* |
| 6 | `hi-vis-yellow-green` | 90 | The eye peaks at ~555 nm, and that wavelength is this exact colour. | Wikipedia *High-visibility clothing*; ANSI/ISEA |
| 7 | `hard-hat-gap` | 89 | The inch of air inside is the protection — shell flex plus strap stretch spreads the impact over time. | Wikipedia *Hard hat*; Ergodyne |
| 8 | `bus-hammer` | 88 | Tempered glass has a compressed skin and a tensioned core; a hard point at a corner releases the whole pane. | AAA; tempered-glass technical guidance |
| 9 | `stair-riser` | 86 | Code allows 3/8" variation across a whole flight, because after two steps you stop looking. | IBC/IRC §1011.5.4 |
| 10 | `fire-extinguisher-seal` | 82 | The tamper seal is built to break instantly. It secures nothing; it is evidence. | NFPA-aligned inspection guidance |

### Mechanisms hiding in ordinary objects

| # | Episode | Score | Premise | Source |
|---|---|---|---|---|
| 11 | `barcode-guard-bars` | 90 | The longer bars carry no data — they let a scanner read the code in either direction. | UPC/EAN spec; CYBRA glossary |
| 12 | `kettle-whistle` | 89 | Two discs, two different physical mechanisms, and the switch between them happens as it heats. | *Physics of Fluids* 25, 107101 (2013), Cambridge |
| 13 | `spirit-level` | 88 | The vial is deliberately curved, so "level" is the position where the highest point is the middle. | Johnson Level; spirit level patents |
| 14 | `twist-drill` | 87 | The spiral is chip removal, not cutting — and it is called a twist drill because Morse literally twisted a grooved bar. | RUKO; Morse, 1860s |
| 15 | `key-grooves` | 87 | The side grooves decide whether the key enters at all; the teeth do the lifting. | Art of Lock Picking; keyway patents |
| 16 | `granton-edge` | 85 | Oval hollows hold pockets of air so wet slices cannot form a seal against the blade. | Patented 1928; Tasting Table |
| 17 | `plug-prong-holes` | 85 | Vestigial detent from 1904 sockets. NEMA: "manufacturing purposes only", no electrical function. | NEMA standard; Hubbell patents |
| 18 | `banknote-thread` | 86 | The thread is inside the paper, laid in while the sheet was formed — so copying it means making paper. | Wikipedia *Security thread* |
| 19 | `book-blank-pages` | 84 | Books print in signatures of 16 or 32; the page count is forced to a multiple and the remainder is blank. | Wikipedia *Intentionally blank page* |
| 20 | `escalator-handrail` | 88 | Same motor, longer loop, smaller wheel, stretching rubber — and set deliberately fast. | US Tape / escalator engineering *(script already validated in the factory canary)* |

### Chemistry and biology

| # | Episode | Score | Premise | Source |
|---|---|---|---|---|
| 21 | `honey-never-spoils` | 89 | Water activity 0.6, pH ~4, and bee enzymes making hydrogen peroxide. Three defences, none expiring. | Compound Interest; NCBI PMC11083411 |
| 22 | `onion-tears` | 88 | A two-enzyme chemical weapon assembled only when the cell wall breaks. | ACS Molecule of the Week; Library of Congress |
| 23 | `yellow-highlighter` | 87 | Yellow reflects almost as much light as blank paper, so a copier reads it as paper. | WTAMU physics; HP support |
| 24 | `phone-oleophobic` | 85 | A fluorinated polymer molecules thick, worn away by cloth, pockets, alcohol and ammonia. | How-To Geek; PhoneArena |

### Engineering at scale

| # | Episode | Score | Premise | Source |
|---|---|---|---|---|
| 25 | `winglets` | 89 | Wings leak at the tip; the bend blocks the spill. NASA measured 6.5% less fuel. | NASA Spinoff 2010; AOPA |
| 26 | `tuned-mass-damper` | 88 | 660 tonnes on eight cables, tuned to lag the building and pull against it. Sway cut 30–40%. | CNN; Atlas Obscura; TheCivilEngineer |
| 27 | `aircraft-tyres` | 84 | Aircraft never corner at speed, so tread is contact area given away. | AeroToolbox; aircraft tyre patents |
| 28 | `ykk-zipper` | 83 | ~7 billion zippers a year, from a company that refused to buy any component. | Forbes; Carryology; Wikipedia *YKK* |

### Pharmacy

| # | Episode | Score | Premise | Source |
|---|---|---|---|---|
| 29 | `pill-score-line` | 85 | An evaluated score means the halves match. A groove alone is not that promise — and slow-release cut in half stops being slow-release. | FDA *Tablet Scoring* guidance; FDA *Tablet Splitting* |
| 30 | `pill-bottle-cotton` | 84 | Shipping padding from ~1900, kept for decades because customers expected it — and once opened it holds damp against the pills. | Reader's Digest; NIH guidance |

---

## Script statistics

30 scripts · avg **101 words** · range 76–105 · **16,294** narration characters.

Batch 001 averaged 93 and Batch 002 averaged 92, so these run slightly longer — roughly 24–30
seconds after processing rather than 21–27. Still inside the Shorts window, and none was padded
to reach a number.

**Gate result: 0 failures.** No title appears in its own narration, no stage directions, no
URLs, no markdown, no AI stock phrases, no duplicate of an earlier batch, one paragraph each.

Openings are varied by construction — imperatives (*Look at*, *Hold*, *Check*, *Take*, *Push*),
declaratives, and existentials. Four begin with "A", down from eight in the first draft. Titles
begin with fifteen different words; only one begins with "Why".

---

## What happens on approval

1. Import to the audio factory as `batch-003`, `takesPerScript: 1`
2. Preflight against the live account
3. TTS → acoustic selection → the existing voice processing chain
4. Scribe v2 → forced alignment → validated SRT → `AUDIO_READY`
5. Episode configs, timing, storyboards
6. Scene specs, render, verify

Nothing above runs until you say so.
