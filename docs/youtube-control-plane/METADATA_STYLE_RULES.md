# Metadata Style Rules — Bill Finds Out

The rules the copy linter enforces, and the reasoning a human should apply where a linter
cannot.

**Channel:** Bill Finds Out · **Positioning:** Hidden reasons behind everyday things.

---

## Voice

Curious, short, clear, human, slightly playful. Confident **only where the script's facts
support it**.

Not: corporate, fake-hype, children's-TV, keyword-stuffed, or listicle-brained.

The test: *would a person who made this video write this, or does it read like it was
generated for a channel that could be about anything?*

## Titles

Good titles from this channel's own material:

- Why Airplane Windows Have That Tiny Hole
- Escalator Brushes Aren't for Your Shoes
- How a Gas Pump Knows Your Tank Is Full
- The Hidden Reason Manhole Covers Are Round
- That Tiny Hole in a Pen Cap Has a Job

What they share: a **concrete everyday object**, a **specific** claim, no hype, and a promise
the video actually keeps.

### Grammar families

Rotate. Using one family repeatedly is the single most AI-legible failure mode, and the
linter tracks it across recent uploads.

| Family | Shape | Example |
|---|---|---|
| `WHY` | Why X *verb* Y | Why Manhole Covers Are Round |
| `HOW` | How X *verb* Y | How a Gas Pump Knows Your Tank Is Full |
| `NEGATION` | X isn't/aren't for Y | Escalator Brushes Aren't for Your Shoes |
| `HIDDEN` | The hidden/real reason … | The Hidden Reason Manhole Covers Are Round |
| `OBJECT_JOB` | That X has a job / is doing something | That Tiny Hole in a Pen Cap Has a Job |
| `CLAIM` | Flat surprising statement | Your Jeans Have a Pocket for a 19th-Century Gadget |

**Rule: no family may exceed ~40% of the last 10 titles.** `WHY` is the natural attractor and
must be actively resisted.

### Hard limits

- ≤ 70 characters — Shorts surfaces truncate hard
- no ALL-CAPS words (except genuine acronyms)
- no clickbait punctuation: `!!`, `?!`, `😱`
- ≤ 1 emoji, and only when it carries meaning
- no colon-subtitle habit — occasionally fine, as a pattern it is a tell
- **no claim stronger than the script supports**

## Descriptions

Shorts descriptions are short. **1–3 useful sentences.** Not an essay, not the script again.

Should: reinforce the actual question and reveal, add genuine context if there is any,
stay factually aligned with the narration.

Should not: restate the whole video, pad with SEO, stack hashtags, or open with a greeting.

Banned openers unless the creator explicitly chooses them:
"Welcome back to the channel!" · "Don't forget to like and subscribe!" ·
"In this exciting video…" · "Join us as we explore…"

At most **3** hashtags, and only genuinely relevant ones.

## Tags

5–12, specific, drawn from the actual subject. No competitor names, no unrelated trending
terms, no keyword stuffing. Tags are a weak signal — misusing them is a policy risk with no
upside.

---

## The anti-AI linter

Implemented in `src/youtube/metadata/lint.mjs`. Runs on every candidate before a human sees
it. **Advisory, not a gate** — the creator can always override, because a linter that blocks
a good line is worse than one that flags it.

### What it checks

**1 · Stock AI phrases** — `error` severity

"Did you know…", "You won't believe…", "Here's why…", "Let's dive in…", "In today's video…",
"Ever wondered…", "This will blow your mind…", "game-changing", "fascinating world of",
"unlock the secrets", "discover the hidden", "whether you're…", "from X to Y", "here's the
crazy part", "buckle up", "the truth about", "what happens next".

Phrases, not words. `discover` alone is fine; "discover the hidden secrets of" is not.

**2 · Template rhythm** — `warn`

The bigger problem is not any single phrase — it is *repetition*. Checks:

- title grammar family over-used across the last 10 titles (>40%)
- same opening 2 words as a recent title
- em-dash count > 1 in a title, > 3 in a description
- colon count > 1
- three-adjective runs ("simple, clever, and surprising")
- rule-of-three list rhythm
- near-identical sentence length across a description

**3 · Novelty vs. recent uploads** — `warn`

Trigram Jaccard similarity against the last 20 titles and descriptions. > 0.45 is flagged.
This is what stops the tenth video being a rewrite of the third.

**4 · Fake hype** — `error`

"insane", "mind-blowing", "shocking", "you NEED to", "nobody talks about", "they don't want
you to know", superlatives with no source in the script.

**5 · Factual alignment** — `error`

Every number, unit and proper noun in the title must appear in the episode's transcript or
`episode.json` facts. A title claiming "3 metres" when the narration says "10 feet" fails —
even though both are true, the *title* is now unsupported by the recorded material.

This is the check that matters most. Do not invent facts to improve CTR.

**6 · Mechanics** — `error` / `warn`

Length, emoji count, hashtag count, ALL-CAPS, clickbait punctuation, banned openers.

### Scoring

Candidates are ranked on **clarity, specificity, truthfulness, channel fit, curiosity,
novelty** — each a bounded, explainable sub-score, shown to the user with its reasoning.

**Not scored on:** predicted views, "virality", or any implied YouTube-algorithm probability.
We have no data to support such a number and inventing one would be dishonest to the creator
and a policy risk. See [API_POLICY_AND_LIMITS.md](./API_POLICY_AND_LIMITS.md).

### The linter's own limits

It catches rhythm and stock phrasing. It cannot tell whether a title is *interesting*. That
judgement stays with the human, which is why the flow ends in approval rather than automation.
