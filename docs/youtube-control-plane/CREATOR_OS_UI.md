# Creator OS — the local application

The localhost operations tool for Bill Finds Out. Production content goes in, publication is
controlled and reproducible, and official analytics come back attached to the creative
decisions that produced each video.

**Local only.** Binds `127.0.0.1`. No cloud, no telemetry, no hosted database.

---

## Run it

```bash
npm run creator:dev
```

One command starts the backend, the job worker and the UI, then prints:

```
  backend        http://127.0.0.1:8787
  content        10 items indexed (235 beats, 40 stills)
  worker         running (in-process)
  ────────────────────────────────────────────
  Creator OS:    http://127.0.0.1:5173
  ────────────────────────────────────────────
```

| Command | Does |
|---|---|
| `npm run creator:dev` | backend + worker + UI |
| `npm run creator:build` | production frontend bundle |
| `npm run creator:test` | unit tests (vitest) |
| `npm run creator:server` | backend alone |
| `npm run youtube:doctor` | read-only live verification against Google |
| `node tools/approval-qa.mjs` | proves the approval gate against the running app |
| `node tools/creator-os-shots.mjs` | captures QA screenshots of every screen |

### Where things live — all outside the repository

| | |
|---|---|
| Database | `%LOCALAPPDATA%\BillFindsOut\control-plane.sqlite` |
| OAuth token | `%LOCALAPPDATA%\BillFindsOut\youtube\oauth-token.enc` (DPAPI) |
| Logs | `%LOCALAPPDATA%\BillFindsOut\logs\creator-os-<date>.log` |
| Google client | external path from `BFO_GOOGLE_CLIENT_SECRET` or `.google-client-path` |

Nothing operational is ever written into the working tree.

---

## Screens

```
Dashboard
Content      Videos · Metadata Studio
Publish      Publish Studio · Queue
Performance  Analytics · Retention
System       API Health · Settings
```

| Screen | What it does |
|---|---|
| **Dashboard** | Channel identity, system health (OAuth, Data API, Analytics API, DPAPI), content pipeline counts by state, channel KPIs, blockers, recent content, queue summary |
| **Videos** | All ten indexed episodes with frame preview, duration, size, artifact badges, publish state. Filters and search are **local** — never `search.list` |
| **Video detail** | Five tabs: Production (player, hash, contact sheet, beats, script, captions, cast), Metadata, Publish, Analytics, Retention |
| **Metadata Studio** | Editorial brief, ranked title candidates with per-candidate lint, live linter, description and tag editing, recent-title history |
| **Publish Studio** | Player, readiness blockers, manifest export, YouTube settings, approval, private upload with confirmation |
| **Queue** | Persisted jobs with state, progress, attempts, errors, retry/cancel |
| **Analytics** | Real Analytics query with 7d/28d/90d/lifetime ranges; honest empty state |
| **Retention** | 100-point curve joined to our storyboard beats; production timeline shown even with no curve |
| **API Health** | OAuth, token storage, channel, scopes, capability gates, recent activity, quota ledger |
| **Settings** | Credential path/type, content roots, YouTube defaults, metadata provider, system locations |

---

## Content discovery

Rerunnable and idempotent — it runs on every start and on **Rescan content**, updating rows in
place. It never creates duplicates.

Reads the layout that actually exists:

| Source | Supplies |
|---|---|
| `data/batch-*.json` | slug, title, episode number, source audio/subtitle, transcript |
| `episodes/<slug>/episode.json` | authored scenes, hook, cast |
| `episodes/<slug>/storyboard.json` | beats → `production_beat` with precomputed `ratio` |
| `episodes/<slug>/narration-timing.json` | duration, word timings → script text |
| `out/<batch>/NN-<slug>.mp4` | the render, size, mtime, SHA-256 |
| `qa/<batch>/<slug>-*.png` | QA contact-sheet stills |
| external `Sub/*.srt` | the caption source, path from the batch manifest |

Everything optional is resolved defensively and stored as `null` when absent, so a
partially-produced episode still indexes. Hashing only re-runs when a file's size or mtime
changed — 110 MB of hashing on every boot is a real cost for a value that cannot have moved.

Beat labels (`HOOK`, `MECHANISM`, `REVEAL`, `PAYOFF`, `GAG`, `LOOP`…) are inferred from the
scene id and action text. A beat that matches nothing keeps a `null` label and still appears
on the chart as an unlabelled production event — more honest than forcing a category.

---

## Metadata workflow

1. **Generate** — builds an editorial brief from the episode's own transcript and storyboard:
   core object, core question, actual reveal, payoff. Never from the slug alone.
2. **Candidates** — one per grammar family (`QUESTION`, `HIDDEN`, `NEGATION`, `OBJECT_JOB`,
   `MECHANISM`, `WHY`, `CLAIM`), so the set genuinely spans different shapes rather than
   producing seven variants of "Why X Has Y".
3. **Lint + rank** — every candidate carries its own issues and an editorial score.
4. **Edit** — the linter runs live on whatever you type. It is **advisory**: it never blocks.
5. **Save draft** — writes the manifest and records the chosen title into channel history.

### Editorial score

Clarity · Curiosity · Specificity · Truthfulness · Channel fit · Novelty.

There is deliberately **no predicted-views or virality figure**. We have no data supporting
one and presenting it would mislead.

### The factual guard

Every number and unit in a title must be traceable to the episode's own transcript. Real
example from episode 01:

```
✗ UNSUPPORTED_CLAIM  "30,000 Feet" does not appear in the episode's own material
  → Use the figure the narration actually says, or drop it.
```

### Provider

If no generation provider is configured (`BFO_METADATA_API_KEY`), the Studio still loads and
says so. Candidates come from a deterministic generator built from the episode's own
sentences — labelled as such, never presented as model output. Linting, ranking, editing and
history all work with no provider at all.

---

## Approval

An approval authorises **one exact job**, not a policy. It records the asset hash, the
metadata hash and a snapshot of everything the human saw.

Change any material field afterwards — title, description, tags, privacy, publish time,
caption choice, thumbnail, playlists, made-for-kids, synthetic declaration — and the approval
is **revoked**, the item falls back to `METADATA_READY`, and the UI names the field that moved.

Proven end to end against the running application by `node tools/approval-qa.mjs` — **12/12**,
including that a one-character title edit invalidates approval and that upload is then refused
with `409 APPROVAL_REQUIRED`.

---

## Private upload

Implemented, gated, and never automatic.

- requires a valid approval whose hashes still match
- requires `privacyStatus: private`
- requires the `youtube.upload` scope
- requires **explicit confirmation** in a dialog showing channel, video, title, privacy and
  asset hash. There is no "don't ask again"
- idempotent: `sha256(asset + metadata + schedule)` is UNIQUE on the job table, plus a
  pre-flight check for an existing video and a transactional single-flight claim
- resumable: the session URI is persisted **before any bytes are sent**, so a crash resumes
  from Google's reported offset instead of restarting or double-uploading

---

## The compliance feature gate

Public and scheduled publication are **blocked at the capability layer**, not merely hidden.

> Uploads from unaudited API projects created after 28 July 2020 are permanently restricted to
> private, and `publishAt` cannot override it.

The UI shows the reason on the Dashboard, in Publish Studio and on API Health. A schedule can
still be **prepared and stored locally** in the manifest — no API write is made. The gate opens
only when the compliance audit is explicitly recorded as passed.

`OAuth working ≠ public publishing allowed`, and the app says so rather than letting anyone
assume otherwise.

---

## Analytics and retention with no data

The channel has **0 published videos**. Both pages perform the real query and report
`NO ANALYTICS DATA YET` — the query is authorised and structurally valid, there is simply
nothing to measure. No sample numbers are ever injected into the live view.

Retention shows the **production timeline regardless**, because that is ours and is real. The
curve appears only when YouTube actually reports one.

---

## Safety properties

| | |
|---|---|
| Secret boundary | the browser never receives the client secret or a refresh token; only the backend talks to Google |
| Asset serving | by content id, never by path. The browser cannot express a filesystem path, so traversal is structurally impossible |
| Video streaming | HTTP range requests; the file is never read into memory |
| Redaction | central, at the log sink — tokens, secrets, `Authorization`, cookies and OAuth codes are scrubbed regardless of who logged them |
| Binding | `127.0.0.1` only, plus a remote-address check on every request |
| Errors | normalised domain codes with human copy; raw Google errors and stack traces stay behind a disclosure |
