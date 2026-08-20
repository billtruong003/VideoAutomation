# Title scoring — audit before rebuild

Written by reading the code, not the previous reports. Every line reference below is to the
implementation as it stood at commit `495964c`, before any change in this phase.

---

## Correction to the brief's premise

The brief asks to *"replace the misleading 'viral title score'"* and to stop the system
claiming `97% viral`, `viral probability` or `predicted views`.

**No such claim exists in the codebase.** There is no "viral score". Searching the whole repo
for `viral|virality|predicted view` finds only:

- `tags.mjs:39` — `viral` in the *blocklist* of filler tags
- `lint.mjs:209` — a comment stating virality is explicitly not scored
- four docs saying the same
- `tests/domain.test.mjs:135` — a test named *"never emits a virality or predicted-views
  figure"* that asserts the score object contains exactly
  `channelFit, clarity, curiosity, novelty, overall, specificity, truthfulness`

The label displayed in the UI is **"Editorial Score"**.

That said, **the underlying critique is correct and the defect is real.** It is just a
different defect from a mislabelled number:

1. `score.overall` is a 0–1 float rendered as `Math.round(overall * 100)` — a bare two-digit
   number on a big bold line. It *reads* as a percentage even though it is labelled
   "Editorial Score", and nothing on the card explains what 84 means or where it came from.
2. **Truthfulness is a compensable scoring dimension, not a gate.** This is the serious one,
   and it is exactly what the brief's §7 objects to. Details below.

So this phase renames for clarity and rebuilds the mechanism — but it is not correcting a
false virality claim, because none was ever made.

---

## CURRENT IMPLEMENTATION

### The actual code path

```
services/index.mjs:325   generateMetadata(id, { count = 7 })
  ├─ generate.mjs:71     buildBrief(content)
  ├─ generate.mjs:123    generateTitleCandidatesDeterministic(brief)   → 7 templates
  │                        .filter(dedupe by family)                   → ~5–6 survive
  │                        .slice(0, count)
  ├─ lint.mjs:243        rankCandidates(titles, { history, facts })
  │    └─ lint.mjs:51      lintCandidate(candidate, context)   × N
  │         └─ lint.mjs:213   scoreCandidate(...)
  └─ writes every candidate to metadata_candidate, selected = 0
```

### Candidate generator

`generateTitleCandidatesDeterministic` (`generate.mjs:123`). Splits the **slug** into
`subject` + `feature` and interpolates seven hardcoded string templates:

| # | Template | Intended family |
|---|---|---|
| 1 | `How Does {a subject} {Feature} Actually Work?` | QUESTION |
| 2 | `That {Feature} on {a subject} Has a Job` | HIDDEN FUNCTION |
| 3 | `{Subject} {Feature}s Aren't What You Think` | CONTRADICTION |
| 4 | `The Hidden Reason {Subject} Has That {Feature}` | HIDDEN REASON |
| 5 | `How {a subject} {Feature} Does Its Job` | MECHANISM |
| 6 | `Why {Subject} Has That {Feature}` | WHY |
| 7 | `{Subject}: The {Feature} Is Deliberate` | CLAIM |

Then `generate.mjs:150-156` **discards** any candidate whose family was already seen. Because
templates 1 and 5 both classify as `HOW`, and 2 and 4 collide depending on wording, the real
delivered pool is typically **5–6 candidates, not 7**.

### Provider

`resolveProvider()` (`generate.mjs:38`). Reads `BFO_METADATA_API_KEY` from the environment
only. Nothing is configured, so it returns `{ id: 'deterministic', configured: false }` and
the UI shows an honest "no provider configured" notice. **There is no LLM in the loop today.**

### Grammar families

`style.mjs:46`. Six, first-match-wins, most specific first:

`NEGATION` → `HIDDEN` → `OBJECT_JOB` → `HOW` → `WHY` → `CLAIM` (catch-all, `/.*/`)

### Candidate count

7 templates → deduped to ~5–6 → `.slice(0, 7)`. Effective pool: **5–6**.

### Factual grounding

`buildBrief` (`generate.mjs:71`) reads `content.facts_text ?? content.script_text`, then:

- `coreObject` — **from the slug**, `content_id.replace(/-/g,' ')` title-cased. Not from the
  transcript.
- `coreQuestion` — `sentences[0]`
- `actualReveal` — first sentence in `sentences.slice(1, -1)` matching
  `/because|helps|manage|allows|triggers|blocks|prevents|means|so that/i`, else `middle[0]`
- `payoff` — last sentence
- `beats` — storyboard scenes flattened, if `storyboard_path` exists

### Hard rejects

**None.** There is no rejection anywhere in the path. `rankCandidates` (`lint.mjs:243`) sorts
by `errors asc, overall desc, warnings asc`. A candidate with errors sinks to the bottom of
the list but is still returned, still written to `metadata_candidate`, and still selectable in
the UI.

### Lint rules

`lintCandidate` (`lint.mjs:51`), nine blocks:

| # | Block | Codes | Severity |
|---|---|---|---|
| 1 | Stock AI phrasing (28 phrases) | `STOCK_PHRASE` | error |
| 2 | Unearned hype (13 words) | `FAKE_HYPE` | error |
| 3 | Title mechanics | `TITLE_TOO_LONG` (error), `TITLE_EMOJI`, `EM_DASH`, `COLON_HABIT`, `ALL_CAPS` (warn), `CLICKBAIT_PUNCT` (error) | mixed |
| 4 | Description shape | `DESC_TOO_LONG`, `HASHTAG_STUFFING`, `EM_DASH`, `UNIFORM_CADENCE` (warn), `BOILERPLATE_OPENER` (error) | mixed |
| 5 | Three-item list rhythm | `RULE_OF_THREE` | warn |
| 6 | Tag count | `TAG_STUFFING`, `TOO_FEW_TAGS` | warn |
| 7 | Factual alignment | `UNSUPPORTED_CLAIM` | error |
| 8 | Novelty vs history | `TOO_SIMILAR`, `REPEATED_OPENER` | warn |
| 9 | Grammar family mix | `FAMILY_OVERUSE` | warn |

### Current scoring signals, weights and formula

`scoreCandidate` (`lint.mjs:213`). Six dimensions, each clamped to 0–1:

```js
specificity  = clamp(0.4 + (hasDigit ? 0.2 : 0) + (words >= 5 ? 0.2 : 0)
                        - vagueWordCount * 0.15 + 0.2)
clarity      = clamp(len <= 60 ? 1 : len <= 70 ? 0.75 : 0.35)
truthfulness = clamp(1 - count(UNSUPPORTED_CLAIM | FAKE_HYPE) * 0.5)
channelFit   = clamp(1 - count(STOCK_PHRASE | BOILERPLATE_OPENER
                               | CLICKBAIT_PUNCT | ALL_CAPS) * 0.34)
curiosity    = clamp(0.5 + (/\b(why|how|hidden|actually|isn't|aren't)\b/ ? 0.3 : 0)
                        + (description ? 0.1 : 0) + (tags.length ? 0.1 : 0))
novelty      = clamp(1 - maxTrigramJaccardAgainstRecent)
```

```js
overall = clarity*0.20 + curiosity*0.15 + specificity*0.20
        + truthfulness*0.25 + channelFit*0.10 + novelty*0.10
```

Displayed as `Math.round(overall * 100)`.

### Current penalties

There is no penalty stage. "Penalties" are expressed only as the two derived dimensions
`truthfulness` and `channelFit`, which are *subtractions inside a positive score*.

### Recent-title history logic

`recentTitles(excludeId)` (`services/index.mjs:313`): the 20 most recent rows in
`metadata_candidate` where `kind='title' AND selected=1`. **If none are selected yet, it falls
back to `content_item.topic`** — the working titles, which are near-verbatim restatements of
the slugs.

`LIMITS.historyWindow = 20` (`style.mjs:72`).

### Semantic similarity logic

Character **trigram Jaccard** (`lint.mjs:27-39`). Normalise → strip whitespace → 3-char
shingles → `|A∩B| / |A∪B|`. Flagged above `LIMITS.noveltyMax = 0.45`.

### Clickbait detection

Two mechanisms: the 13-word `HYPE_WORDS` list, and `CLICKBAIT_PUNCT` (`/[!?]{2,}|!\?|\?!/`).
Plus `ALL_CAPS` as a warning.

### AI-writing detection

`STOCK_PHRASES` (28 phrases), `EM_DASH`, `COLON_HABIT`, `RULE_OF_THREE`, `UNIFORM_CADENCE`,
and the history-comparison checks. The stated design bet is that the tell is repetition and
template rhythm rather than any single phrase.

### Spoiler detection

**None. Does not exist.**

### Title-length handling

`titleMaxChars = 70` → `TITLE_TOO_LONG` error. Note YouTube's real hard limit is 100; 70 is a
house rule for Shorts truncation. `clarity` also steps on length at 60 / 70.

### Tie-breaking

`rankCandidates` (`lint.mjs:246-249`): `errors asc` → `overall desc` → `warnings asc`.

### Selection behaviour

Ranked candidates are written to `metadata_candidate` with `selected = 0`. **Nothing is
auto-selected.** A human clicks "Select" in Metadata Studio, which sets the title on the
manifest. There is no batch-level step.

---

## INTENDED IMPLEMENTATION

Three layers that never mix:

- **Layer A — hard gates.** Pass/fail. Ten gates. A failure rejects the candidate outright; no
  editorial strength can compensate.
- **Layer B — editorial score.** 0–100 across twelve weighted dimensions.
- **Layer C — history and style penalties.** Nine proportional deductions.

`TITLE_SELECTION_SCORE = clamp(RAW_EDITORIAL - PENALTIES, 0, 100)`

Plus: a 16–24 candidate pool spanning ten grammar families; factual traceability surfaced in
the UI; and **batch-level optimisation** so ten episodes chosen together do not converge on
one grammar.

---

## GAPS

Ordered by how much they matter.

### G1 — Truthfulness is compensable *(critical)*

An `UNSUPPORTED_CLAIM` costs `0.5 × 0.25 = 0.125` of `overall`, i.e. **12.5 points**. A title
inventing "30,000 Feet" that scores well on clarity, specificity and curiosity can and does
outrank a true, duller title. This is the precise failure the brief names in §4 and §7.

### G2 — No rejection stage exists

`rankCandidates` sorts; it never filters. Candidates with errors are persisted and remain
selectable. Sorting `errors asc` first makes this *look* like rejection without being it.

### G3 — Pool too small and self-limiting

5–6 effective candidates against the required 16–24. Worse, the family dedupe at
`generate.mjs:150` **throws candidates away** to achieve diversity rather than generating more.

### G4 — Six families, not ten

Missing `OBJECT_MYSTERY`, `PERSONAL_RELEVANCE`, `OBSERVATION`, `UNEXPECTED_FACT`,
`SHORT_DECLARATIVE`. `CLAIM` is a `/.*/ ` catch-all that absorbs everything unmatched, so
family statistics are less meaningful than they look.

### G5 — History warnings have no effect on score

`FAMILY_OVERUSE`, `REPEATED_OPENER` and `TOO_SIMILAR` are warnings. `scoreCandidate` reads
**only** `UNSUPPORTED_CLAIM`, `FAKE_HYPE`, `STOCK_PHRASE`, `BOILERPLATE_OPENER`,
`CLICKBAIT_PUNCT`, `ALL_CAPS`. Family overuse and repeated openers therefore change nothing
except the third tie-break key. The channel's loudest template signal is, in scoring terms,
free.

### G6 — No spoiler detection

Nothing distinguishes *"Why Manhole Covers Are Round"* from *"Manhole Covers Are Round So They
Can't Fall Through the Hole"*. The second is factually perfect and destroys the video.

### G7 — Curiosity is a keyword regex

`+0.3` for containing `why|how|hidden|actually|isn't|aren't`. It measures vocabulary, not an
open loop. `+0.1` each for a description and tags existing is unrelated to the *title* and
inflates every candidate equally.

### G8 — `specificity` has a dead constant

`0.4 + … + 0.2` — the trailing `+ 0.2` is unconditional, so the floor is 0.6, not 0.4. Looks
like a leftover from tuning. Harmless in ranking (it is constant) but the formula does not mean
what it reads as.

### G9 — No batch awareness

Each episode is ranked in isolation. Ten episodes optimised independently can legitimately all
pick `HOW`, and nothing would notice until the feed was published.

### G10 — Unsupported-claim check covers numbers only

The regex at `lint.mjs:153` matches digits and units. A fabricated **proper noun** — a brand,
a standards body, a place — passes untouched.

### G11 — History fallback compares against slugs

With nothing selected yet, `recentTitles` falls back to `content_item.topic`. Those are
working titles derived from slugs, so "novelty" is measured against strings the generator is
itself built from. Every candidate looks similar to history for a structural reason.

### G12 — Missing penalty dimensions

No cadence similarity, no repeated-adjective/keyword tracking, no overcomplexity measure.

### G13 — No traceability surface

`facts` is used to *check* claims but the matched evidence is never returned, so the UI cannot
show *why* a title is considered supported.

### G14 — Score presentation

A bare 0–100 integer with no breakdown, no gate results and no visible deductions. Even
correctly labelled, it is not explainable — which is the whole point of a deterministic engine.
