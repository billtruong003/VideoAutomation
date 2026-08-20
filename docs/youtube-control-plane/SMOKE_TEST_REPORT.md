# Smoke Test Report — live verification against the real channel

Run: `npm run youtube:doctor` · 2026-08-20 · read-only, nothing was written.

This document exists because an architecture that was never connected to Google is a guess.
Everything below was produced by an actual authenticated call, not by reasoning.

---

## Result

| Gate | Question | Result |
|---|---|---|
| **A** | Does OAuth complete? | **PASS** — installed-app flow, PKCE, loopback |
| **B** | Does the Data API read? | **PASS** — channel + uploads playlist resolved |
| **C** | Does the Analytics API authorise? | **PASS** — valid query, `engagedViews` returned |
| **D** | Is `videos.insert` callable? | **NOT TESTED** — needs `youtube.upload`, deliberately not requested |
| **E** | Can API uploads become public? | **BLOCKED** — see [the audit gate](#the-audit-gate) |

A, B and C are proven. D and E are separate gates and OAuth success says nothing about them.

---

## Credential

| | |
|---|---|
| Type | `installed` — **Desktop app** |
| Client ID | `486113370251-qfnkj98f1rntipc5e199v16s7t1hp7bl.apps.googleusercontent.com` |
| Cloud project | `sage-momentum-425811-f3` |
| Registered redirect | `http://localhost` |
| Location | outside the repository; path supplied by config |

The client secret was read but never printed, never copied into the tree, and never logged.
The repository contains no credential material.

## OAuth

| | |
|---|---|
| Flow | Installed application, authorization code + **PKCE (S256)** |
| Redirect | `http://127.0.0.1:<random port>/oauth2callback` |
| Browser | Chrome, launched explicitly |
| Scopes granted | `youtube.readonly`, `yt-analytics.readonly` |
| Access token | obtained |
| **Refresh token** | **obtained** |
| Token storage | Windows **DPAPI**, per-user encrypted, in `%LOCALAPPDATA%\BillFindsOut\youtube\` |

Two real bugs were found and fixed by running this rather than trusting it:

1. **DPAPI probe failed against Windows PowerShell 5.1** — `Microsoft.PowerShell.Security`
   would not load, so `ConvertTo-SecureString` was missing and the store silently fell back
   to a plaintext token file. The probe now tries `pwsh` first. A security downgrade that
   announces itself only in a warning line is a security downgrade that ships.
2. **`google-auth-library` v10 returns a WHATWG `Headers` object** from
   `getRequestHeaders()`. Spreading it with `{...h}` yields `{}`, so the `Authorization`
   header vanished and Google replied *"Method doesn't allow unregistered callers"* — which
   reads like a Cloud project misconfiguration and is not.

## Channel resolved

| | |
|---|---|
| Channel ID | `UCpj0K01zP4BIyLvK0Fuyq4g` |
| Title | **Bill Finds Out** ✅ matches expected |
| Handle | `@billfindsout` |
| Created | 2026-01-18 |
| Subscribers | 0 |
| Total views | 0 |
| Video count | **0** |
| Uploads playlist | `UUpj0K01zP4BIyLvK0Fuyq4g` |
| Channel privacy | public |
| Long uploads | eligible |

The channel is empty. None of the ten rendered Shorts have been published.

## Analytics

Query: channel totals, last 28 days.

```
columns  views, engagedViews, estimatedMinutesWatched, averageViewDuration,
         averageViewPercentage, likes, shares, subscribersGained
row      [0, 0, 0, 0, 0, 0, 0, 0]
```

**The query path is proven.** The API accepted the metric set, authorised the request and
returned a well-formed row. Zeros are the correct answer for a channel with no videos — this
is `NO DATA YET`, not a failure.

Not yet exercisable, because they need a published video:

- `videos.batchGetStats` — no video IDs to pass
- audience retention (`elapsedVideoTimeRatio` / `audienceWatchRatio`) — needs watch data
- traffic-source reports — need impressions

The request shapes for these are implemented; they are untested against real data.

## The audit gate

This is the finding that matters most, and it is invisible from OAuth success.

> "All videos uploaded via the `videos.insert` endpoint from unverified API projects created
> after 28 July 2020 will be restricted to private viewing mode."
> — [videos.insert reference](https://developers.google.com/youtube/v3/docs/videos/insert)

Project `sage-momentum-425811-f3` must be assumed **unaudited**. Consequences:

- every API upload is **permanently private**, whatever `privacyStatus` the request asks for
- `status.publishAt` **cannot** make it public — scheduling is inert under this restriction
- the restriction is not a quota or a rate limit; waiting does not clear it

Until an API compliance audit is submitted and approved, the automated path ends at
`UPLOADED_PRIVATE`. Publication must be finished by hand in YouTube Studio.

This does not block building the control plane. It blocks exactly one edge of it, and the
architecture is shaped so that edge can be switched on later without rework.

## Quota consumed

| Bucket | Units | Calls |
|---|---|---|
| `default` | 2 | 2 |
| `analytics` | 0 | 1 |

Local estimate. Google does not expose live quota consumption through the API; the Cloud
Console is authoritative.

## Not verified — needs a human in the Cloud Console

| Item | Why it matters | Where |
|---|---|---|
| Consent screen: **Testing** or **In production** | Testing issues refresh tokens that **expire after 7 days**, which would break any scheduler | APIs & Services → OAuth consent screen |
| **YouTube Analytics API** enabled | The query succeeded, so it is enabled — recorded here for completeness | APIs & Services → Enabled APIs |
| Audit status | Gate E above | YouTube API compliance audit form |

The 7-day question is the operationally urgent one. A refresh token that dies weekly turns
an unattended publishing system into a manual one.
