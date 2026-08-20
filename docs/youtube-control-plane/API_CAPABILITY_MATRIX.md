# API Capability Matrix

Every official capability worth knowing about, whether we will use it, and what it costs.
Quota figures are current as of the **June 2026 granular quota change** — see
[API_POLICY_AND_LIMITS.md](./API_POLICY_AND_LIMITS.md) for why older numbers are wrong.

Legend — **Priority**: P1 build now · P2 build next · P3 later · ✗ not needed.

---

## Quota buckets (read this first)

Since 1 June 2026 there is no single pool.

| Bucket | Daily allowance | Members |
|---|---|---|
| `default` | **10,000 units** | everything not listed below |
| `search.list` | **100 calls** | `search.list` only |
| `videos.insert` | **100 calls** | `videos.insert` only |
| `videos.batchGetStats` | **10,000 units** | `videos.batchGetStats` only |

Resets midnight Pacific. Uploads no longer compete with reads for budget.

---

## Channel

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| Channel identity, stats, uploads playlist | `channels.list` (`mine=true`) | `youtube.readonly` | R | 1 | **Verified working.** Identity + the uploads playlist ID that every inventory sync starts from | **P1** |
| Branding settings (banner, keywords) | `channels.update` `part=brandingSettings` | `youtube` | W | 50 | ✗ — banner set by hand once; not worth the broad `youtube` scope | ✗ |
| Channel sections | `channelSections.*` | `youtube` | R/W | 1 / 50 | P3 — shelf layout once there is a catalogue | P3 |
| Watermark | `watermarks.set` | `youtube` | W | 50 | ✗ | ✗ |

> `channels.update` needs the broad `youtube` scope. Not worth it for a one-off cosmetic edit.

## Videos

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| Enumerate our uploads | `playlistItems.list` on uploads playlist | `youtube.readonly` | R | 1 | **Verified.** The cheap inventory path — never `search.list` for our own videos | **P1** |
| Batched stats | **`videos.batchGetStats`** | `youtube.readonly` | R | 1 · own bucket | **P1.** Added 3 Jun 2026. Returns publishTime, views, likes, comments, duration + durationMillis. Own bucket means the stats loop never eats the shared pool | **P1** |
| Full metadata / status | `videos.list` | `youtube.readonly` | R | 1 | Fields `batchGetStats` omits: description, tags, privacyStatus, publishAt, uploadStatus, processingStatus, rejectionReason, madeForKids | **P1** |
| Upload | `videos.insert` | `youtube.upload` | W | 1 · **100 calls/day** | **P2.** Resumable. ⚠️ audit gate — see limitations | P2 |
| Edit metadata | `videos.update` | `youtube.force-ssl` | W | **50** | P2. Also the only way to change privacy/publishAt after upload. Expensive — batch edits, don't poll-and-patch | P2 |
| Delete | `videos.delete` | `youtube.force-ssl` | W | 50 | ✗ — never automated. Destructive and irreversible | ✗ |
| Ratings | `videos.rate` | `youtube.force-ssl` | W | 50 | ✗ | ✗ |

**Known limitation — the audit gate.** Uploads from unaudited projects created after
28 Jul 2020 are *permanently private*. `publishAt` cannot override it. This is gate E in the
[smoke test report](./SMOKE_TEST_REPORT.md).

**Known limitation — `videos.update` is destructive-by-omission.** It replaces the parts you
send. Read the current resource, merge, then write, or you will blank fields you did not mention.

## Thumbnails

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| Set custom thumbnail | `thumbnails.set` | `youtube.upload` | W | 50 | P2 — from the publish manifest | P2 |

Requires a verified channel. For Shorts the custom thumbnail does **not** appear in the
Shorts feed; it shows on the channel grid, search and shares. Worth doing, not worth
overstating.

## Captions

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| List tracks | `captions.list` | `youtube.force-ssl` | R | **50** | P2 | P2 |
| Upload track | `captions.insert` | `youtube.force-ssl` | W | **400** | **P2.** We already produce accurate SRT — this is one of the highest-value cheap wins | P2 |
| Update / download / delete | `captions.update` / `.download` / `.delete` | `youtube.force-ssl` | W/R | 450 / 200 / 50 | P3 | P3 |

400 units per insert is the most expensive routine call we make — still only 4% of the daily
pool per video. Note: a **burned-in** caption (which our renders have) is not a caption track.
We will have both, deliberately.

## Playlists

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| List | `playlists.list` | `youtube.readonly` | R | 1 | P2 | P2 |
| Create | `playlists.insert` | `youtube.force-ssl` | W | 50 | P3 — series created by hand first | P3 |
| Add video | `playlistItems.insert` | `youtube.force-ssl` | W | 50 | P2 — rule-driven, configurable, not hardcoded | P2 |

## Comments

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| List threads | `commentThreads.list` | `youtube.force-ssl` | R | 1 | P3 — local inbox | P3 |
| List replies | `comments.list` | `youtube.force-ssl` | R | 1 | P3 | P3 |
| Reply | `comments.insert` | `youtube.force-ssl` | W | 50 | P3 — **drafts only, human sends** | P3 |
| Moderate / mark spam | `comments.setModerationStatus` / `.markAsSpam` | `youtube.force-ssl` | W | 50 | P3 — manual trigger only | P3 |
| Delete | `comments.delete` | `youtube.force-ssl` | W | 50 | ✗ | ✗ |

**Pinning a comment is NOT exposed by the API.** Studio-only. We can draft the text and
prepare it; a human pins it. Do not claim otherwise in the UI.

**No auto-reply.** AI may draft; a human approves and sends.

## Search & discovery

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| Public search | `search.list` | API key or OAuth | R | 1 · **100 calls/day** | P3 — competitor/topic research only. **Never** for our own videos | P3 |
| Our own videos | *use `playlistItems.list`* | — | R | 1 | The correct pattern | **P1** |

100 calls/day is a hard, low ceiling. Cache aggressively; treat each call as a budgeted
decision.

## Analytics

| Feature | Method | Scope | R/W | Quota | Our use | Priority |
|---|---|---|---|---|---|---|
| Channel/video metrics | `reports.query` | `yt-analytics.readonly` | R | not unit-billed | **Verified working.** views, engagedViews, watch time, avg duration/%, likes, shares, subs | **P1** |
| Audience retention | `reports.query` dim `elapsedVideoTimeRatio` | `yt-analytics.readonly` | R | — | **P2** — the retention overlay. Needs a published video | P2 |
| Traffic sources | `reports.query` dim `insightTrafficSourceType` | `yt-analytics.readonly` | R | — | P2 | P2 |
| Geography / demographics | dims `country`, `ageGroup`, `gender` | `yt-analytics.readonly` | R | — | P3 | P3 |
| Revenue | `yt-analytics-monetary.readonly` | — | R | — | ✗ — channel not monetised; unjustifiable permission | ✗ |

Analytics has its own request quota, not Data API units. Metric/dimension combinations are
**not** free-form; see [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md).

## Reporting API

| Feature | Method | Scope | Our use | Priority |
|---|---|---|---|---|
| Bulk scheduled CSV reports | `youtubereporting.jobs.*` | `yt-analytics.readonly` | **Not now.** Designed for bulk historical export; reports are generated daily with lag and must be downloaded and parsed | P3 |

**Recommendation:** skip until roughly **100+ videos** or a need for multi-year history.
For 10–30 videos the targeted Analytics API is simpler, fresher and sufficient. Revisit when
per-video daily queries start straining the day's request budget.

## Other

| Feature | Verdict |
|---|---|
| `activities.list` | ✗ — superseded by the uploads playlist for our purpose |
| `subscriptions.*` | ✗ |
| `members` / `membershipsLevels` | ✗ — requires monetised channel with memberships |
| `liveBroadcasts` / `liveStreams` | ✗ — classified, not needed. Shorts channel |
| `i18nLanguages` / `i18nRegions` / `videoCategories` | P2 — cheap lookups for the metadata studio's category and language pickers |

---

## Not available through any official API

Say this plainly in the UI rather than scraping or guessing.

| Studio shows | API status |
|---|---|
| Pin a comment | **NOT AVAILABLE** |
| Impressions & impression CTR | **NOT AVAILABLE** in the Analytics API |
| "Shorts feed" as a distinct traffic source | **UNKNOWN — requires validation** against real data |
| Real-time (48h) figures | **NOT AVAILABLE** — Analytics is not real-time |
| Suggested-video pairings ("viewers also watched") | **NOT AVAILABLE** |
| Live quota consumption | **NOT AVAILABLE** — Cloud Console only; ours is an estimate |
| Copyright / Content ID state | **NOT AVAILABLE** at this tier |
| Editing a Shorts remix/sound attribution | **NOT AVAILABLE** |

Scraping YouTube Studio is prohibited by the API Services Terms and is out of scope
permanently, not merely "later".
