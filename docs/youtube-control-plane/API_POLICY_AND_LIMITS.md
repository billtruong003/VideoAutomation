# API Policy and Limits

Current as of **August 2026**. Quota figures verified against Google's own quota
documentation and revision history, not from secondary guides.

---

## Quota — what changed, and what most guides still get wrong

### The corrections

| Widely repeated claim | Reality (Aug 2026) |
|---|---|
| "An upload costs **1600 units**" | **Wrong since 4 Dec 2025.** Reduced to ~100 units, then moved to its own bucket on 1 Jun 2026 where it is **1 unit, capped at 100 calls/day** |
| "Everything shares one 10,000-unit pool" | **Wrong since 1 Jun 2026.** `search.list` and `videos.insert` have their own daily buckets |
| "`search.list` costs 100 units" | **Wrong.** It is **1 unit** — but capped at **100 calls/day** in its own bucket. Cheap per call, hard ceiling |
| "Uploads eat your whole day's quota" | **No longer true.** Uploads no longer compete with reads |

Anything written before June 2026 should be assumed stale on quota.

### Current buckets

| Bucket | Daily allowance | Contents |
|---|---|---|
| `default` | **10,000 units** | everything not listed below |
| `search.list` | **100 calls** | `search.list` |
| `videos.insert` | **100 calls** | `videos.insert` |
| `videos.batchGetStats` | **10,000 units** | `videos.batchGetStats` (1 unit/call) |

Reset: **midnight Pacific Time**.

### Costs we rely on

| Method | Cost | Bucket |
|---|---|---|
| `channels.list` | 1 | default |
| `playlistItems.list` | 1 | default |
| `videos.list` | 1 | default |
| **`videos.batchGetStats`** | **1** | own |
| `videos.insert` | 1 | own (100 calls/day) |
| `videos.update` | **50** | default |
| `thumbnails.set` | 50 | default |
| `captions.list` | **50** | default |
| `captions.insert` | **400** | default |
| `playlistItems.insert` | 50 | default |
| `commentThreads.list` | 1 | default |
| `comments.insert` | 50 | default |
| `search.list` | 1 | own (100 calls/day) |

### What this means for us

- **Publishing one video ≈ 550 units** + 1 insert call. Roughly 18 videos/day by units.
  Never the binding constraint at our scale.
- **Daily stats for 100 videos = 2 calls** via `batchGetStats` (50 IDs each), from its own
  bucket. Reads are effectively free.
- **`search.list` is the scarce resource.** 100 calls/day, full stop. Never use it to find
  our own videos — `playlistItems.list` on the uploads playlist does that for 1 unit from the
  large pool. Public research must be cached and budgeted deliberately.
- `captions.insert` at 400 units is our most expensive routine call — still only 4% of the
  daily pool per video.

### Local ledger ≠ real quota

Google does **not** expose live quota consumption through the API. Our ledger is a **LOCAL
ESTIMATE** computed from documented costs, and the UI must label it that way. The Cloud
Console is authoritative.

---

## The upload audit gate

> "All videos uploaded via the `videos.insert` endpoint from unverified API projects created
> after 28 July 2020 will be restricted to private viewing mode."

Project `sage-momentum-425811-f3` must be assumed unaudited.

| | |
|---|---|
| What still works | `videos.insert` succeeds; the video appears in Studio |
| What does not | it is **permanently private**. `privacyStatus` and `publishAt` are ignored |
| Is it a rate limit? | **No.** Waiting does not clear it |
| Fix | submit the **YouTube API compliance audit** and be approved |
| Meanwhile | automated path ends at `UPLOADED_PRIVATE`; a human publishes in Studio |

Design consequence: `UPLOADED_PRIVATE` is a **first-class terminal state**, not an error.
The system is useful without the audit and gains one edge with it.

---

## OAuth consent screen status

| Status | Refresh token | Recommendation |
|---|---|---|
| **Testing** | **expires in 7 days** | unusable for scheduling |
| **In production** (unverified) | long-lived, ≤100 users | ✅ correct for a single-owner local tool |
| In production (verified) | long-lived | unnecessary at this scale |

Verification is not required for personal use here; the "unverified app" warning is
irrelevant when the only user is the channel owner.

---

## Developer Policies — what we must not do

Read against the YouTube API Services Terms and Developer Policies.

### Prohibited outright

| ✗ | Why |
|---|---|
| **Scraping YouTube Studio** or any YouTube page | Explicitly prohibited. If a metric is not in an API, the answer is "NOT AVAILABLE" |
| Storing raw API responses indefinitely | Storage rules require currency and deletion; we keep aggregates, not raw bodies |
| Serving stale API data as current | Cached metadata refreshed at least every 30 days |
| Auto-replying to comments at scale | Automated engagement. Drafts only; a human sends |
| Changing video visibility without user intent | Ours by design, and the right reading of user-consent expectations |
| Requesting scopes we do not need | `youtube` broad and monetary scopes are excluded |
| Circumventing quota (multiple projects, key rotation) | Explicitly prohibited |

### ⚠️ Flagged — the "Viral Potential Score" idea

Earlier pipeline work proposed a **Viral Potential Score**. Assessed against current policy:

| Variant | Verdict |
|---|---|
| A **pre-publish** heuristic over our *own production artifacts* (hook timing, beat density, storyboard pacing) with **no API data** | ✅ **Allowed.** No YouTube data involved. Keep it entirely inside the production pipeline |
| A score **combining our YouTube API analytics with outside datasets** | ⚠️ **Policy-risky.** Blending API data with external data into derived metrics is the area the Developer Policies constrain most tightly |
| A score presented as **"probability this goes viral"** or an implied algorithm prediction | ❌ **Do not build.** We have no data supporting it; it misrepresents the API's meaning and misleads the creator |

**Decision:** keep the pre-publish heuristic in the production pipeline, computed from
storyboards and renders only. It must never read the analytics tables, and the UI must never
present a predicted-views or virality figure. This is why the metadata linter scores
*clarity, specificity, truthfulness, channel fit and novelty* — all explainable, none
pretending to model YouTube's ranking.

### Required minimum functionality

An API client must offer real functionality, not merely proxy YouTube. This system does:
production integration, publishing workflow, approval gating, metadata authoring, retention
overlay against our own storyboards. Comfortably satisfied.

### Data deletion

If the user disconnects the Google account, all locally stored YouTube-derived data must be
deletable in one action. `youtube:disconnect` must revoke the token **and** drop the
YouTube-derived tables. Our own production data is unaffected — it was never API data.

---

## Practical limits worth knowing

| Limit | Value |
|---|---|
| `playlistItems.list` / `videos.list` page size | 50 |
| Resumable upload session lifetime | ~1 week |
| Title | 100 chars (we cap at 70 for Shorts legibility) |
| Description | 5,000 chars (we target 1–3 sentences) |
| Tags | 500 chars total |
| Thumbnail | 2 MB, requires verified channel |
| Caption track | 100 MB |
| Analytics earliest data | 1 July 2008 |
| Analytics freshness | not real-time; expect lag of a day or more |
| Retention resolution | ~100 points |
