/**
 * logger.mjs — structured logs with CENTRAL redaction.
 *
 * Redaction happens at the sink, not at call sites. Relying on every caller to remember to
 * strip a token is how tokens end up in logs: it only takes one `console.log(err)` on a bad
 * day. Anything that looks like credential material is scrubbed here, on the way out,
 * regardless of who logged it or why.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATE_DIR } from '../config.mjs';

export const LOG_DIR = join(STATE_DIR, 'logs');
const LOG_FILE = join(LOG_DIR, `creator-os-${new Date().toISOString().slice(0, 10)}.log`);

/** Keys whose values are never written, whatever they contain. */
const SECRET_KEYS = /^(access_token|refresh_token|client_secret|id_token|authorization|cookie|code|code_verifier|codeVerifier|token)$/i;

/** Value shapes that are credential material even under an innocent key name. */
const SECRET_VALUES = [
  /ya29\.[\w.-]+/g,                 // Google access tokens
  /1\/\/[\w-]{20,}/g,               // Google refresh tokens
  /GOCSPX-[\w-]+/g,                 // Google client secrets
  /Bearer\s+[\w.-]+/gi,
];

export function redact(value, depth = 0) {
  if (depth > 6) return '[deep]';
  if (value == null) return value;

  if (typeof value === 'string') {
    let out = value;
    for (const re of SECRET_VALUES) out = out.replace(re, '[REDACTED]');
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message), code: value.code ?? null };
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

let ready = false;
function ensure() {
  if (ready) return;
  mkdirSync(LOG_DIR, { recursive: true });
  ready = true;
}

function write(level, msg, fields) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...redact(fields ?? {}) });
  ensure();
  try { appendFileSync(LOG_FILE, line + '\n'); } catch { /* logging must never throw */ }
  if (level === 'error') console.error(line);
  else if (process.env.BFO_VERBOSE) console.log(line);
}

export const log = {
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
  file: LOG_FILE,
};
