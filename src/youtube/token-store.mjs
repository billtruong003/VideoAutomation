/**
 * token-store.mjs — persistent OAuth tokens, encrypted at rest, outside the repository.
 *
 * THE THREAT THIS ADDRESSES
 *
 * A refresh token for `youtube.upload` is, in practice, the ability to publish to the
 * channel. It must not be recoverable from the repository, from a backup of the repository,
 * or from a plain file that another user account on this machine can read.
 *
 * THE MECHANISM
 *
 * Windows DPAPI, reached through PowerShell's `ConvertFrom-SecureString` / `ConvertTo-
 * SecureString`. With no `-Key`, those cmdlets encrypt under the CURRENT USER's DPAPI master
 * key, so the ciphertext is useless to any other account and to anyone who copies the file
 * to another machine. It needs no native module, no keyring daemon and no key of our own to
 * store — which is the failure mode of "encrypted file" designs that end up keeping the key
 * next to the ciphertext.
 *
 * `keytar` (Windows Credential Manager) was considered and rejected: it is an unmaintained
 * native module, and Credential Manager's blob limit is uncomfortably close to the size of a
 * Google token payload.
 *
 * The plaintext fallback exists for non-Windows and for a broken PowerShell, and it says so
 * loudly every single time it is used. It is a development affordance, not a mode anyone
 * should be in.
 */

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { ensureStateDir, TOKEN_FILE, TOKEN_FILE_PLAIN } from './config.mjs';

const IS_WINDOWS = process.platform === 'win32';

/**
 * Which PowerShell can actually do DPAPI.
 *
 * Windows PowerShell 5.1 (`powershell.exe`) on this machine cannot load
 * Microsoft.PowerShell.Security, so `ConvertTo-SecureString` is simply missing there. PS7
 * (`pwsh`) has it. Both are probed once and the answer cached — falling back to a plaintext
 * token file because we asked the wrong interpreter would be a silent security downgrade.
 */
let SHELL = null;
function resolveShell() {
  if (SHELL !== null) return SHELL;
  if (!IS_WINDOWS) return (SHELL = false);
  for (const exe of ['pwsh', 'powershell']) {
    try {
      const out = execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command',
        `ConvertTo-SecureString 'probe' -AsPlainText -Force | ConvertFrom-SecureString`],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 }).trim();
      if (out.length > 0) return (SHELL = exe);
    } catch { /* try the next one */ }
  }
  return (SHELL = false);
}

const pwsh = (script) =>
  execFileSync(resolveShell() || 'pwsh', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', maxBuffer: 1 << 24,
  });

/** Is DPAPI reachable? Probed, not assumed — this machine has surprised us before. */
function dpapiAvailable() {
  return resolveShell() !== false;
}

export const storageMode = () => (dpapiAvailable() ? 'dpapi' : 'plaintext');

export function saveTokens(tokens) {
  ensureStateDir();
  const json = JSON.stringify(tokens);

  if (dpapiAvailable()) {
    // Base64 first: the token JSON contains quotes and dots that would otherwise need
    // escaping through the PowerShell command line.
    const b64 = Buffer.from(json, 'utf8').toString('base64');
    const enc = pwsh(
      `$s = ConvertTo-SecureString '${b64}' -AsPlainText -Force; ConvertFrom-SecureString $s`,
    ).trim();
    writeFileSync(TOKEN_FILE, enc, 'utf8');
    rmSync(TOKEN_FILE_PLAIN, { force: true });
    return { mode: 'dpapi', path: TOKEN_FILE };
  }

  writeFileSync(TOKEN_FILE_PLAIN, json, { encoding: 'utf8', mode: 0o600 });
  try { chmodSync(TOKEN_FILE_PLAIN, 0o600); } catch { /* best effort off-Windows */ }
  console.warn(
    '\n  WARNING: OAuth tokens stored UNENCRYPTED at\n' +
    `    ${TOKEN_FILE_PLAIN}\n` +
    '  DPAPI was not available. This file grants access to the YouTube channel.\n' +
    '  Delete it when you are finished, and do not copy it anywhere.\n',
  );
  return { mode: 'plaintext', path: TOKEN_FILE_PLAIN };
}

export function loadTokens() {
  if (existsSync(TOKEN_FILE) && dpapiAvailable()) {
    try {
      const enc = readFileSync(TOKEN_FILE, 'utf8').trim();
      const b64 = pwsh(
        `$s = '${enc}' | ConvertTo-SecureString; ` +
        `[Runtime.InteropServices.Marshal]::PtrToStringAuto(` +
        `[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))`,
      ).trim();
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch {
      // A DPAPI blob that will not decrypt means a different Windows user or machine.
      // Treat it as absent rather than crashing; the flow will simply re-authorise.
      return null;
    }
  }
  if (existsSync(TOKEN_FILE_PLAIN)) {
    try { return JSON.parse(readFileSync(TOKEN_FILE_PLAIN, 'utf8')); } catch { return null; }
  }
  return null;
}

export function clearTokens() {
  rmSync(TOKEN_FILE, { force: true });
  rmSync(TOKEN_FILE_PLAIN, { force: true });
}

/** Safe description for logs and the doctor. Never includes token material. */
export function describeStoredTokens() {
  const t = loadTokens();
  if (!t) return { present: false, mode: storageMode() };
  return {
    present: true,
    mode: storageMode(),
    path: storageMode() === 'dpapi' ? TOKEN_FILE : TOKEN_FILE_PLAIN,
    hasAccessToken: Boolean(t.access_token),
    hasRefreshToken: Boolean(t.refresh_token),
    scopes: typeof t.scope === 'string' ? t.scope.split(' ') : [],
    expiresAt: t.expiry_date ? new Date(t.expiry_date).toISOString() : null,
    expired: t.expiry_date ? Date.now() > t.expiry_date : null,
  };
}
