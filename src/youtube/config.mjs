/**
 * config.mjs — where the control plane keeps things that must never enter the repository.
 *
 * Two rules govern this file:
 *
 *   1. The Google OAuth client is READ FROM AN EXTERNAL PATH. It is never copied into the
 *      working tree, never committed, and never printed. The path comes from configuration
 *      (BFO_GOOGLE_CLIENT_SECRET, or a local untracked pointer file), so a fresh clone of
 *      this repo contains no credential material of any kind.
 *
 *   2. Everything the control plane persists — tokens, the SQLite database, logs — lives in
 *      %LOCALAPPDATA%\BillFindsOut, OUTSIDE the repository. That is the mechanism; the
 *      .gitignore rules are only a backstop for a mistake.
 */

import { existsSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/** Everything this system writes lives here, outside the repo. */
export const STATE_DIR =
  process.env.BFO_STATE_DIR ??
  join(process.env.LOCALAPPDATA ?? join(homedir(), '.local', 'share'), 'BillFindsOut');

export const YT_DIR = join(STATE_DIR, 'youtube');
export const TOKEN_FILE = join(YT_DIR, 'oauth-token.enc');
export const TOKEN_FILE_PLAIN = join(YT_DIR, 'oauth-token.json');
export const DB_FILE = join(STATE_DIR, 'control-plane.sqlite');

export const ensureStateDir = () => {
  mkdirSync(YT_DIR, { recursive: true });
  return YT_DIR;
};

/**
 * Resolve the OAuth client JSON path without ever embedding it.
 *
 * Order: explicit env var, then an untracked pointer file in the repo root
 * (`.google-client-path`, gitignored), then a scan of the user's Downloads folder for a
 * `client_secret*.apps.googleusercontent.com.json`. The scan exists only so the first run is
 * frictionless; it reports what it found so the choice is never silent.
 */
export function resolveClientSecretPath() {
  const fromEnv = process.env.BFO_GOOGLE_CLIENT_SECRET;
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`BFO_GOOGLE_CLIENT_SECRET points at a missing file: ${fromEnv}`);
    return { path: resolve(fromEnv), source: 'BFO_GOOGLE_CLIENT_SECRET' };
  }

  const pointer = join(process.cwd(), '.google-client-path');
  if (existsSync(pointer)) {
    const p = readFileSync(pointer, 'utf8').trim();
    if (p && existsSync(p)) return { path: resolve(p), source: '.google-client-path' };
  }

  const downloads = join(homedir(), 'Downloads');
  if (existsSync(downloads)) {
    const hit = readdirSync(downloads).find(
      (f) => /^client_secret.*\.apps\.googleusercontent\.com\.json$/i.test(f),
    );
    if (hit) return { path: join(downloads, hit), source: 'Downloads scan' };
  }

  throw new Error(
    'No Google OAuth client found. Set BFO_GOOGLE_CLIENT_SECRET to the absolute path of the ' +
    'client_secret*.json downloaded from Google Cloud Console, or write that path into ' +
    '.google-client-path in the repo root (gitignored).',
  );
}

/**
 * Load the client, returning ONLY what the flow needs plus safe descriptive metadata.
 *
 * The secret is returned because the token exchange requires it, but it is never placed on
 * the returned `describe` object, which is the only thing any caller is allowed to log.
 */
export function loadOAuthClientConfig() {
  const { path, source } = resolveClientSecretPath();
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const kind = raw.installed ? 'installed' : raw.web ? 'web' : null;
  if (!kind) {
    throw new Error(`Unrecognised OAuth client JSON at ${path}: expected an "installed" or "web" key.`);
  }
  const c = raw[kind];

  return {
    kind,
    clientId: c.client_id,
    clientSecret: c.client_secret,
    projectId: c.project_id ?? null,
    redirectUris: c.redirect_uris ?? [],
    /** Safe to print. Contains no secret. */
    describe: {
      source,
      path,
      kind,
      clientId: c.client_id,
      projectId: c.project_id ?? null,
      redirectUris: c.redirect_uris ?? [],
      hasSecret: Boolean(c.client_secret),
    },
  };
}

/**
 * Scopes, least-privilege by default.
 *
 * `youtube.readonly` covers channel identity, the uploads playlist, playlist reads and video
 * metadata reads. `yt-analytics.readonly` covers every owner analytics query including
 * audience retention. Neither can write anything, which is exactly what this architecture
 * phase is allowed to do.
 *
 * The write scopes are declared here but NOT requested by default — `youtube.upload` for
 * videos.insert and thumbnails.set, and `youtube.force-ssl` for captions, playlist edits and
 * comment replies. They are opt-in per run so that proving the read path cannot quietly
 * leave a token lying around that is able to publish.
 *
 * `yt-analytics-monetary.readonly` is deliberately absent. The channel is not monetised, we
 * do not need revenue data, and requesting it would be permission we cannot justify.
 */
export const SCOPES = {
  read: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
  publish: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
  ],
  manage: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl',
  ],

  /*
   * The narrowest grant that can configure the channel WITHOUT being able to upload.
   *
   * `youtube` covers channels.update (brandingSettings), playlists.insert and
   * channelSections.insert -- everything the finalisation phase writes. Two scopes are
   * deliberately absent:
   *
   *   youtube.upload    nothing in this phase uploads a video, so the grant should not
   *                     permit it. Publishing asks for its own consent later.
   *   youtube.force-ssl broader than `youtube`: it also carries comment moderation and
   *                     caption write, none of which is needed here.
   *
   * `yt-analytics.readonly` is retained so the existing Analytics and Retention screens keep
   * working across the re-consent rather than silently losing access.
   */
  /*
   * The publish batch: upload, update, thumbnails, playlist items AND captions.
   *
   * `youtube.upload` is deliberately absent. It is the scope everyone reaches for, but
   * videos.insert accepts any of youtube.upload / youtube / youtubepartner /
   * youtube.force-ssl, and this grant already carries two of those -- verified live by
   * initiating a resumable session, which Google issued. Adding upload would broaden the
   * grant to buy a capability it already has.
   *
   * `youtube.force-ssl` IS required, and only for captions.insert; nothing else in this phase
   * needs it. It is requested incrementally on top of the existing grant rather than
   * replacing it, so analytics access survives the re-consent.
   */
  release: [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],

  configure: [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
};
