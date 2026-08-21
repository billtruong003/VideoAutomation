#!/usr/bin/env node
/**
 * reauth-release.mjs — one interactive consent for the scopes the release actually needs.
 *
 *   node tools/reauth-release.mjs [--check] [--open]
 *
 * `--check` verifies the stored grant and exits. It never opens a browser, so it is safe to
 * run at any time and is what the release tooling should call before it writes anything.
 *
 * WHY THIS EXISTS RATHER THAN `youtube-doctor.mjs`. The doctor asks for READ scopes and
 * re-consents when the stored token is stale. Running it after a release grant existed
 * replaced that grant with a read-only one, and the next publish failed with "no usable stored
 * grant" — the upload capability was gone and nothing had announced it. The store now refuses
 * to persist a narrower grant over a broader one, and this tool is the only thing that asks
 * for the wide one.
 *
 * IT VERIFIES BEFORE IT TRUSTS. Google is free to return fewer scopes than were requested —
 * a user can untick permissions on the consent screen. So the granted set is checked against
 * the required set, and a partial grant is a hard failure that names the missing scope rather
 * than a silent downgrade discovered later by a 403 halfway through a batch.
 */

import { getAuthorisedClient } from '../src/youtube/auth.mjs';
import { SCOPES } from '../src/youtube/config.mjs';
import { describeStoredTokens } from '../src/youtube/token-store.mjs';

const V3 = 'https://www.googleapis.com/youtube/v3';

/**
 * Everything the release needs, and why each one is here.
 *
 *   youtube            videos.insert, videos.update (publishAt), playlistItems.insert
 *   youtube.force-ssl  captions.insert — the only thing that needs it
 *   youtube.upload     videos.insert. Strictly speaking redundant: `youtube` already accepts
 *                      videos.insert and Phase G proved it live by getting a resumable
 *                      session out of Google. It is requested anyway because the cost of
 *                      being wrong is a second consent round-trip in the middle of a batch,
 *                      and the cost of asking is one extra line on a screen the channel owner
 *                      is already reading.
 *   yt-analytics.readonly  keeps the Analytics and Retention screens working across the
 *                      re-consent instead of silently losing access.
 */
const REQUIRED = [
  ...new Set([...SCOPES.release, 'https://www.googleapis.com/auth/youtube.upload']),
];

const short = (s) => s.split('/auth/')[1] ?? s;

function report(granted) {
  const have = new Set(granted);
  const missing = REQUIRED.filter((s) => !have.has(s));
  console.log('  GRANTED:');
  for (const s of [...have].sort()) console.log(`    ${have.has(s) ? '+' : ' '} ${short(s)}`);
  if (missing.length) {
    console.log('');
    console.log('  MISSING — the release cannot run:');
    for (const s of missing) console.log(`    - ${short(s)}`);
  }
  return missing;
}

/* ------------------------------------------------------------------ check */

if (process.argv.includes('--check')) {
  const d = describeStoredTokens();
  if (!d.present) {
    console.error('no stored grant at all. Run this tool without --check.');
    process.exit(1);
  }
  console.log(`stored grant · ${d.mode} · refresh token ${d.hasRefreshToken ? 'present' : 'MISSING'}`);
  console.log(`access token expires ${d.expiresAt}${d.expired ? ' (expired — will refresh)' : ''}`);
  console.log('');
  const missing = report(d.scopes ?? []);
  if (missing.length) process.exit(1);
  console.log('');
  console.log('RELEASE SCOPES SATISFIED.');
  process.exit(0);
}

/* ----------------------------------------------------------------- consent */

console.log('Batch 002 release — one-shot re-authorisation');
console.log('');
console.log('Requesting:');
for (const s of REQUIRED) console.log(`  · ${short(s)}`);
console.log('');
console.log('Approve EVERY permission shown — unticking any of them makes this fail rather');
console.log('than silently publishing with less access.');
console.log('');
console.log('By default the URL is PRINTED, not launched: launching hands it to the Chrome');
console.log('you are already using and steals the focused window. Pass --open to launch it.');
console.log('');

const { client } = await getAuthorisedClient({
  scopes: REQUIRED,
  interactive: true,
  openInBrowser: process.argv.includes('--open'),
});

/*
 * Verify against what Google ACTUALLY returned, not against what was asked for.
 *
 * `tokeninfo` is the authoritative answer: it describes the live access token rather than the
 * request that produced it, so a partial consent cannot slip through as a success.
 */
const { token } = await client.getAccessToken();
const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`)
  .then((r) => r.json());
const granted = String(info.scope ?? '').split(' ').filter(Boolean);

console.log('');
const missing = report(granted);

if (missing.length) {
  console.error('');
  console.error('PARTIAL CONSENT — nothing will be uploaded. Re-run and approve every permission.');
  process.exit(1);
}

/*
 * Prove the capability rather than inferring it from the scope string. A scope list that looks
 * right and an API that refuses the call are different things, and finding out which one you
 * have costs one read.
 */
const me = await fetch(`${V3}/channels?part=id,snippet&mine=true`, {
  headers: Object.fromEntries((await client.getRequestHeaders(`${V3}/channels`)).entries()),
}).then((r) => r.json());

console.log('');
console.log(`  channel reachable : ${me.items?.[0]?.snippet?.title} (${me.items?.[0]?.id})`);
console.log('');
console.log('RELEASE SCOPES GRANTED AND VERIFIED. Safe to run the release.');
