/**
 * secret.mjs — where the ElevenLabs API key lives, and where it does not.
 *
 * Same shape as the Google OAuth token store: Windows DPAPI via PowerShell, so the ciphertext
 * is bound to this Windows user and copying the file to another machine yields nothing. The
 * key is read on the backend only.
 *
 * THE KEY NEVER LEAVES THIS PROCESS. It is not returned by any API route, not embedded in a
 * job payload, not written to a log line, and not sent to the frontend. Everything the UI
 * needs to know about the key is whether one is present and where it came from —
 * `describeKey()` answers exactly that and nothing more.
 *
 * An environment variable is supported because it is how CI and most people configure things,
 * but it is announced rather than silent: a key sitting in the environment is readable by any
 * process this user runs, which is a different risk from one sealed by DPAPI.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { STATE_DIR } from '../../youtube/config.mjs';

const KEY_FILE = join(STATE_DIR, 'elevenlabs', 'api-key.enc');

let shell = null;
function resolveShell() {
  if (shell !== null) return shell;
  shell = false;
  // Windows PowerShell 5.1 cannot always load Microsoft.PowerShell.Security; pwsh can.
  for (const exe of ['pwsh', 'powershell']) {
    try {
      execFileSync(exe, ['-NoProfile', '-NonInteractive', '-Command',
        `ConvertTo-SecureString 'probe' -AsPlainText -Force | ConvertFrom-SecureString`],
      { stdio: 'pipe', timeout: 15_000 });
      shell = exe;
      break;
    } catch { /* try the next one */ }
  }
  return shell;
}

const pwsh = (script) =>
  execFileSync(resolveShell() || 'pwsh', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', timeout: 20_000 }).trim();

/** Seal a key with DPAPI and write it. Returns the storage mode actually used. */
export function saveKey(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') throw new Error('empty key');
  mkdirSync(dirname(KEY_FILE), { recursive: true });

  if (resolveShell()) {
    // The key is passed through an environment variable rather than the command line, so it
    // never appears in the process table or in a shell history.
    const enc = execFileSync(resolveShell(), ['-NoProfile', '-NonInteractive', '-Command',
      `ConvertTo-SecureString $env:BFO_SECRET_IN -AsPlainText -Force | ConvertFrom-SecureString`],
    { encoding: 'utf8', timeout: 20_000, env: { ...process.env, BFO_SECRET_IN: plaintext } }).trim();
    writeFileSync(KEY_FILE, JSON.stringify({ mode: 'dpapi', value: enc }), 'utf8');
    return 'dpapi';
  }

  /*
   * No DPAPI. Storing a plaintext secret is a real downgrade, so it is recorded as such and
   * `describeKey()` reports it every time rather than once at setup — a warning nobody sees
   * again is not a warning.
   */
  writeFileSync(KEY_FILE, JSON.stringify({ mode: 'plaintext', value: plaintext }), 'utf8');
  return 'plaintext';
}

/**
 * The key itself. Backend use only.
 * Returns null when nothing is configured — callers must handle that, not assume.
 */
export function loadKey() {
  const fromEnv = process.env.ELEVENLABS_API_KEY;
  if (fromEnv) return fromEnv;
  if (!existsSync(KEY_FILE)) return null;
  try {
    const { mode, value } = JSON.parse(readFileSync(KEY_FILE, 'utf8'));
    if (mode === 'plaintext') return value;
    return pwsh(
      `$s = '${value}' | ConvertTo-SecureString; ` +
      '[Runtime.InteropServices.Marshal]::PtrToStringAuto(' +
      '[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))');
  } catch {
    return null;
  }
}

export function clearKey() {
  if (existsSync(KEY_FILE)) rmSync(KEY_FILE);
}

/**
 * What the UI is allowed to know.
 *
 * Deliberately never includes the key, a prefix of it, or its length — a "safe" four-character
 * preview is still four characters of a secret, and length narrows a brute force.
 */
export function describeKey() {
  const fromEnv = Boolean(process.env.ELEVENLABS_API_KEY);
  const stored = existsSync(KEY_FILE);
  let mode = null;
  if (stored) {
    try { mode = JSON.parse(readFileSync(KEY_FILE, 'utf8')).mode; } catch { mode = 'unreadable'; }
  }
  return {
    present: fromEnv || stored,
    source: fromEnv ? 'environment' : stored ? 'encrypted-file' : null,
    storageMode: fromEnv ? 'environment' : mode,
    dpapiAvailable: Boolean(resolveShell()),
    // Surfaced so the UI can say WHY a weaker mode is in use rather than just showing a badge.
    warning: fromEnv
      ? 'Read from ELEVENLABS_API_KEY. Any process running as this user can read it.'
      : mode === 'plaintext'
        ? 'Stored WITHOUT encryption — PowerShell DPAPI was unavailable on this machine.'
        : null,
    path: stored ? KEY_FILE : null,
  };
}
