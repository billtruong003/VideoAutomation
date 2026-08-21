# Bill Finds Out — Local YouTube Control Plane

A localhost-only operating system for one YouTube channel. Production assets go in;
controlled publication goes out; official analytics come back and attach themselves to the
exact creative decisions that produced each video.

Not a SaaS. Not an uploader script. No cloud, no telemetry, no hosted database.

---

## Status

**Architecture phase.** OAuth and the read path are **proven against the live channel**;
publishing and analytics are designed and scaffolded, not yet built.

| Gate | Status |
|---|---|
| A · OAuth completes | ✅ verified |
| B · Data API reads | ✅ verified — channel `UCpj0K01zP4BIyLvK0Fuyq4g` |
| C · Analytics authorises | ✅ verified — valid query, `NO DATA YET` |
| D · `videos.insert` callable | ⬜ not tested — needs `youtube.upload` |
| E · API uploads can go public | ❌ **blocked** — API compliance audit |

Channel: **Bill Finds Out** · `@billfindsout` · **0 videos published**.

---

## Try it

```bash
npm run youtube:doctor
```

Read-only. Cannot upload, cannot edit, cannot comment — it only ever requests
`youtube.readonly` and `yt-analytics.readonly`, and neither scope can write.

```bash
npm run youtube:lint-demo
```

Runs the anti-AI copy linter over eight candidate titles for episode 01, using that
episode's real transcript as factual ground truth. No network.

### Credential setup

The Google OAuth client is **never** stored in this repository. Point at it with either:

```bash
setx BFO_GOOGLE_CLIENT_SECRET "C:\path\to\client_secret_….json"
```

or write the path into `.google-client-path` in the repo root (gitignored).

Tokens are stored **DPAPI-encrypted** in `%LOCALAPPDATA%\BillFindsOut\youtube\`, outside the
working tree.

---

## Documents

| | |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System shape, module boundaries, request path, error model |
| [AUDIO_FACTORY.md](./AUDIO_FACTORY.md) | Scripts to narration: stage barriers, take selection, the handoff contract |
| [BATCH_002_RESEARCH.md](./BATCH_002_RESEARCH.md) | Batch 002 evidence trail: candidates, rejections, verified sources |
| [SMOKE_TEST_REPORT.md](./SMOKE_TEST_REPORT.md) | What was actually verified, and the two bugs running it found |
| [API_CAPABILITY_MATRIX.md](./API_CAPABILITY_MATRIX.md) | Every capability, scope, quota cost and priority — plus what is *not* available |
| [OAUTH_AND_SECURITY.md](./OAUTH_AND_SECURITY.md) | Flow, scope matrix, token storage, secret handling |
| [DATA_MODEL.md](./DATA_MODEL.md) | SQLite schema and retention policy |
| [UPLOAD_AND_SCHEDULING.md](./UPLOAD_AND_SCHEDULING.md) | Publish manifest, approval gates, idempotency, resumable upload |
| [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md) | Shorts metric semantics, report definitions, retention overlay |
| [METADATA_STYLE_RULES.md](./METADATA_STYLE_RULES.md) | Channel voice and the anti-AI linter rules |
| [API_POLICY_AND_LIMITS.md](./API_POLICY_AND_LIMITS.md) | Current 2026 quota facts, policy boundaries, the flagged Viral Score |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Phases, dependencies, risk, effort |

---

## Two things a human must do in the Cloud Console

1. **Set the OAuth consent screen to "In production."**
   In *Testing*, Google issues refresh tokens that **expire after 7 days**. That makes
   unattended scheduling impossible. Verification is not needed for personal use.

2. **Submit the YouTube API compliance audit** — only if fully automated publication is
   wanted. Until it passes, every API upload is permanently private and `publishAt` cannot
   override it. The system still works; its last step is manual.

---

## The proposed UI

| Page | Does |
|---|---|
| **Dashboard** | channel identity, recent uploads, scheduled/private/public counts, OAuth health, quota ledger, last sync, scheduler online state |
| **Videos** | inventory from the uploads playlist, filterable by privacy and processing state |
| **Video detail** ★ | production (script, storyboard, render, QA) + YouTube (status, metadata, captions) + performance (views **and** engagedViews) + retention curve with beat overlay + history |
| **Publish** | pick a render, generate and lint metadata, choose thumbnail/captions/playlist, set schedule, approve |
| **Queue** | upload and publish jobs, retries, errors, missed-job warnings |
| **Analytics** | channel trends, traffic sources, comparisons |
| **Retention** ★ | the 100-point curve with storyboard beats overlaid |
| **Comments** | local inbox, filters, AI-drafted replies a human sends |
| **Settings** | account, scopes, storage mode, data deletion |

★ = the reason the system exists.

---

## Design rules

- bind `127.0.0.1`, never `0.0.0.0`
- the browser never receives the client secret or a refresh token
- Google response shapes stay behind adapters
- every Google call goes through one function, so quota, errors and redaction have one home
- an approval authorises **one exact job**, bound to the asset and metadata hashes
- visibility is never changed without explicit human intent
- if a metric is not in an official API, say **NOT AVAILABLE** — never scrape Studio
- no predicted-views or "virality" score: we have no data for one, and it would mislead
