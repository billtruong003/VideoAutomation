# OAuth and Security

Verified live on 2026-08-20. See [SMOKE_TEST_REPORT.md](./SMOKE_TEST_REPORT.md).

---

## The credential

Inspected structurally, never printed.

| | |
|---|---|
| Type | **`installed`** — Desktop app |
| Client ID | `486113370251-…apps.googleusercontent.com` |
| Cloud project | `sage-momentum-425811-f3` |
| Registered redirect | `http://localhost` |

Because it is a Desktop client, the correct flow is unambiguous: **installed application,
authorization code, loopback redirect**. No decision to make, no redirect URI to negotiate.

## The flow

```mermaid
sequenceDiagram
    participant CLI as youtube:doctor
    participant SRV as Loopback listener<br/>127.0.0.1:&lt;random&gt;
    participant BR as Chrome
    participant G as Google

    CLI->>CLI: verifier = random(48)<br/>challenge = S256(verifier)<br/>state = random(24)
    CLI->>SRV: listen(port 0, 127.0.0.1)
    CLI->>BR: open consent URL<br/>(+challenge, +state, access_type=offline)
    BR->>G: user consents
    G->>SRV: GET /oauth2callback?code&state
    SRV->>SRV: constant check: state matches?
    SRV->>G: exchange code + verifier
    G-->>SRV: access_token + refresh_token
    SRV->>CLI: tokens
    CLI->>CLI: encrypt (DPAPI) → %LOCALAPPDATA%
```

Design points, each with a reason:

- **Random port, `server.listen(0)`.** Google does not require the exact loopback port to be
  pre-registered for installed clients. A fixed port would collide with other software.
- **`127.0.0.1`, not `localhost`.** Google's own guidance: the hostname form can trip client
  firewalls. The registered `http://localhost` entry does not constrain the loopback port.
- **PKCE S256.** Google calls it *recommended* rather than mandatory for installed apps.
  There is no reason to decline it.
- **State checked before the code is exchanged.** A mismatch aborts without exchanging.
- **No OOB.** `urn:ietf:wg:oauth:2.0:oob` is **removed**. Any tutorial still showing the
  copy-paste flow is describing a dead endpoint.
- **`access_type=offline` + `prompt=consent`** on first authorisation — that is what makes
  Google return a refresh token. Not forced on every run, because training a user to
  click through consent screens is its own vulnerability.
- **Chrome is launched explicitly.** The OS default here is Edge, and the channel's Google
  account is signed in to Chrome. Sending consent to the wrong browser authorises the wrong
  account. Override with `BFO_BROWSER`.

## Scopes — least privilege

Requested per operation, not all at once.

| Scope | Grants | Required by | Requested |
|---|---|---|---|
| `youtube.readonly` | read channel, playlists, videos, stats | channel identity, inventory, `batchGetStats`, `videos.list` | **always** |
| `yt-analytics.readonly` | owner analytics incl. retention | every analytics query, retention, traffic sources | **always** |
| `youtube.upload` | `videos.insert`, `thumbnails.set` | uploading a render, setting its thumbnail | **only for publish runs** |
| `youtube.force-ssl` | captions, playlist edits, comments, `videos.update` | caption upload, playlist add, metadata edit, comment reply | **only for manage runs** |
| `youtube` (broad account mgmt) | everything above + channel settings | — | **never** |
| `yt-analytics-monetary.readonly` | revenue | — | **never** |

Three tiers in `config.mjs`: `SCOPES.read` → `SCOPES.publish` → `SCOPES.manage`. The doctor
uses `read` only, which is *why* it structurally cannot publish — not a policy, a fact about
the token it holds.

`youtube` (broad) is avoided deliberately. The only things it would add are channel branding
edits and channel sections, both one-off cosmetic tasks better done by hand than paid for
with permanent account-management permission.

`yt-analytics-monetary.readonly` is excluded on all three of the stated tests: the channel is
not monetised, we do not need revenue data, and the permission could not be justified.

## Token storage

Hierarchy as built:

1. **Windows DPAPI** ✅ *in use.* PowerShell `ConvertFrom-SecureString` with no `-Key`
   encrypts under the current user's DPAPI master key. The ciphertext is useless to another
   Windows account and useless on another machine. No key of our own to store — which is the
   flaw in most "encrypted file" schemes, where the key ends up beside the ciphertext.
2. **Plaintext file, mode 0600** — fallback only, prints a loud warning every single use.
3. `keytar` / Credential Manager — **rejected.** Unmaintained native module; Credential
   Manager's blob limit is uncomfortably close to a Google token payload.

Location: `%LOCALAPPDATA%\BillFindsOut\youtube\oauth-token.enc` — **outside the repository**.

> Found by running it: Windows PowerShell 5.1 on this machine cannot load
> `Microsoft.PowerShell.Security`, so `ConvertTo-SecureString` was missing and the store fell
> back to plaintext while *reporting* it in a warning line nobody would read. The probe now
> tries `pwsh` first. A security downgrade that only announces itself in a log line is a
> security downgrade that ships.

## Secret handling rules

Never in: source, git, the browser, `localStorage`, a committed `.env`, a frontend bundle,
a log line, an error message, a screenshot, or this documentation.

- the client secret is read from an **external path** given by `BFO_GOOGLE_CLIENT_SECRET` or
  the gitignored `.google-client-path` pointer. It is never copied into the tree.
- `config.mjs` returns the secret to the flow but exposes a separate `describe` object that
  is the only thing any caller may log.
- redaction is central, at the log sink — not at call sites, where one omission leaks.
- the doctor reports *whether* a refresh token exists, never its value.

`.gitignore` covers `client_secret*.json`, `credentials*.json`, `oauth*.json`, `token.json`,
`.secrets/`, `*.pem`, `.env*`, `.google-client-path`. Patterns are deliberately **narrow**:
a broad `*secret*` or `*.json` rule would silently untrack episode configs, storyboards and
timing maps — a more expensive accident than it looks. Verified with
`git ls-files -i -c --exclude-standard` → no tracked file is shadowed.

---

## ⚠️ Two Cloud Console items needing a human

### 1. Consent screen: Testing vs In production — **operationally urgent**

> "A Google Cloud Platform project with an OAuth consent screen configured for an external
> user type and a publishing status of 'Testing' is issued a refresh token expiring in
> **7 days**."

A refresh token that dies weekly turns an unattended publishing system into a manual one.

**Check:** Cloud Console → APIs & Services → OAuth consent screen → *Publishing status*.

- **Testing** → refresh tokens expire in 7 days. Re-auth every week, forever.
- **In production** (unverified) → long-lived refresh tokens. Users see an "unverified app"
  warning, capped at 100 users. For a single-owner local tool this is **the correct setting**
  and needs no Google verification review.

**Recommended action:** set publishing status to **In production**. Do not submit for
verification — it is not required for personal use at this scale, and the warning screen is
irrelevant when the only user is the channel owner.

### 2. API compliance audit — gate E

Unaudited projects created after 28 Jul 2020 have every `videos.insert` upload forced
**permanently private**, and `publishAt` cannot override it. Until an audit is approved the
automated path ends at `UPLOADED_PRIVATE` and a human finishes publication in Studio.

Neither item is a blocker for building the control plane. Item 1 is a blocker for *unattended
scheduling*; item 2 is a blocker for *fully automated publication*.
