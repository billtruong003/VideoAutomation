/**
 * auth.mjs — the one place that talks to Google's OAuth endpoints.
 *
 * FLOW: Installed Application, authorization code + PKCE, loopback listener.
 *
 * That is the flow Google documents for a Desktop client, and the credential in use is a
 * Desktop client (`installed`). Specifically:
 *
 *   - the listener binds 127.0.0.1 on a RANDOM free port. Google does not require the exact
 *     port to be pre-registered for loopback redirects on installed clients, which is what
 *     makes a random port legal and what avoids a fixed port colliding with something else.
 *   - the loopback IP is used rather than the `localhost` hostname, per Google's guidance
 *     that the hostname form can trip client firewalls.
 *   - PKCE (S256) is used. Google calls it recommended rather than mandatory for installed
 *     apps; there is no reason to decline it.
 *   - the OOB / copy-paste flow is NOT used. Google removed it, and any tutorial still
 *     showing `urn:ietf:wg:oauth:2.0:oob` is describing a dead endpoint.
 *
 * `access_type=offline` + `prompt=consent` is what makes Google return a refresh token. It
 * is requested only on first authorisation or when the stored grant lacks one, because
 * forcing the consent screen on every run trains the user to click through it.
 *
 * NOTHING in this file logs a token, a code, or the client secret.
 */

import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { OAuth2Client } from 'google-auth-library';

import { loadOAuthClientConfig, SCOPES } from './config.mjs';
import { loadTokens, saveTokens } from './token-store.mjs';

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Open the browser for consent.
 *
 * Chrome is preferred over the OS default handler. On this machine the default is Edge, and
 * the Google account the channel lives under is signed in to Chrome — sending consent to the
 * wrong browser means authorising the wrong account, or a needless sign-in.
 * `BFO_BROWSER` overrides the choice; if no Chrome is found we fall back to the OS default.
 *
 * The URL is passed as an argv element, never through a shell, so it cannot be mangled by
 * quoting or end up in a shell history.
 */
const CHROME_CANDIDATES = [
  process.env.BFO_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : null,
].filter(Boolean);

function openBrowser(url) {
  if (process.platform === 'win32') {
    for (const exe of CHROME_CANDIDATES) {
      if (existsSync(exe)) {
        spawn(exe, [url], { detached: true, stdio: 'ignore' }).unref();
        return exe;
      }
    }
    // rundll32 avoids `start`, which would need a shell and would mangle the query string.
    spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref();
    return 'system default';
  }
  const exe = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(exe, [url], { detached: true, stdio: 'ignore' }).unref();
  return exe;
}

const PAGE = (title, body) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="font:16px/1.6 system-ui;margin:14vh auto;max-width:34rem;color:#23201D;background:#F7F3E9">` +
  `<h1 style="font-size:1.35rem">${title}</h1><p>${body}</p></body>`;

/**
 * Run the interactive authorization once and return the granted tokens.
 *
 * Resolves only after Google redirects back to the loopback listener, so the caller can
 * simply await it. The listener is torn down in every path, including failure.
 */
async function authorizeInteractive(client, scopes, { openInBrowser = true } = {}) {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(24));

  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/oauth2callback') {
        res.writeHead(404).end();
        return;
      }

      const err = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const gotState = url.searchParams.get('state');

      const finish = (status, page, then) => {
        res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(page);
        server.close(() => then());
      };

      if (err) {
        finish(400, PAGE('Authorisation refused', `Google returned: <code>${err}</code>. You can close this tab.`),
          () => rejectPromise(new Error(`CONSENT_REVOKED: Google returned "${err}"`)));
        return;
      }
      if (gotState !== state) {
        // A mismatched state is the one condition where we must not exchange the code.
        finish(400, PAGE('Authorisation rejected', 'State mismatch. Nothing was stored. You can close this tab.'),
          () => rejectPromise(new Error('AUTH_STATE_MISMATCH: the callback state did not match the request')));
        return;
      }
      if (!code) {
        finish(400, PAGE('Authorisation incomplete', 'No authorisation code was returned.'),
          () => rejectPromise(new Error('AUTH_REQUIRED: no authorisation code in the callback')));
        return;
      }

      finish(200,
        PAGE('Bill Finds Out — connected', 'Authorisation complete. You can close this tab and return to the terminal.'),
        async () => {
          try {
            const { tokens } = await client.getToken({ code, codeVerifier: verifier });
            resolvePromise(tokens);
          } catch (e) {
            rejectPromise(new Error(`AUTH_TOKEN_EXCHANGE_FAILED: ${e.message}`));
          }
        });
    });

    server.on('error', rejectPromise);

    // Port 0 = let the OS pick a free one.
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      client.redirectUri = redirectUri;

      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state,
      });

      console.log(`  loopback listener : ${redirectUri}`);
      if (openInBrowser) {
        const via = openBrowser(authUrl);
        console.log(`  browser           : ${via === 'system default' ? 'OS default' : 'Chrome'}`);
      } else {
        /*
         * Launching the URL hands it to the ALREADY RUNNING Chrome, which opens a tab in
         * whichever window has focus and takes that focus away. Acceptable for a one-off
         * setup, rude in the middle of someone's work — so a caller can ask for the URL and
         * open it where it belongs.
         */
        console.log('');
        console.log('  Nothing was launched. Open this URL yourself:');
        console.log('');
        console.log(`  ${authUrl}`);
        console.log('');
      }
      console.log('  waiting for the Google consent callback (5 min timeout)…\n');
    });

    setTimeout(() => {
      try { server.close(); } catch { /* already closed */ }
      rejectPromise(new Error('AUTH_TIMEOUT: no callback within 5 minutes'));
    }, 5 * 60 * 1000).unref();
  });
}

/**
 * Get an authorised client, reusing stored tokens when possible.
 *
 * `google-auth-library` refreshes the access token on demand from the refresh token, and we
 * persist whatever it hands back so a rotated refresh token is never lost.
 */
export async function getAuthorisedClient({ scopes = SCOPES.read, interactive = true, openInBrowser = true } = {}) {
  const cfg = loadOAuthClientConfig();

  if (cfg.kind !== 'installed') {
    // Not fatal in principle, but it changes the correct flow, so it must be a loud decision
    // rather than a silent fallback into a redirect URI Google has not been told about.
    throw new Error(
      `Expected a Desktop app ("installed") OAuth client; found "${cfg.kind}". A web client ` +
      'needs its redirect URI registered in the Cloud Console before it can be used here.',
    );
  }

  const client = new OAuth2Client({ clientId: cfg.clientId, clientSecret: cfg.clientSecret });

  const stored = loadTokens();
  const storedScopes = typeof stored?.scope === 'string' ? stored.scope.split(' ') : [];
  const hasAllScopes = scopes.every((s) => storedScopes.includes(s));

  if (stored?.refresh_token && hasAllScopes) {
    client.setCredentials(stored);
    client.on('tokens', (t) => saveTokens({ ...stored, ...t }));
    try {
      // Forces a refresh if the access token is stale, and proves the grant still stands.
      await client.getAccessToken();
      return { client, config: cfg, reauthorised: false };
    } catch (e) {
      if (!interactive) {
        throw new Error(`AUTH_EXPIRED: stored grant no longer works (${e.message}). Re-run the doctor.`);
      }
      console.log('  stored grant rejected by Google — re-authorising…\n');
    }
  }

  if (!interactive) throw new Error('AUTH_REQUIRED: no usable stored grant and interactive mode is off');

  const tokens = await authorizeInteractive(client, scopes, { openInBrowser });
  client.setCredentials(tokens);
  saveTokens(tokens);
  client.on('tokens', (t) => saveTokens({ ...tokens, ...t }));
  return { client, config: cfg, reauthorised: true };
}
