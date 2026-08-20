/**
 * ffbin.mjs — resolve the ffmpeg/ffprobe executables once, for every tool.
 *
 * Two Windows problems are handled here so no other tool has to know about either.
 *
 * 1. NAME RESOLUTION. `execFileSync('ffprobe', …)` does not work on Windows: execFile
 *    bypasses the shell, so there is no PATHEXT expansion and the bare name never resolves
 *    to `ffprobe.exe`. It fails with a bare `UNKNOWN` errno that reads like a missing
 *    install rather than a naming problem. Turning the shell on would be worse — these
 *    tools pass source paths containing spaces and commas ("George - Warm, Captivating…")
 *    and a shell would re-split them. So names are resolved to absolute paths here.
 *
 * 2. APPLICATION CONTROL. This machine enforces Smart App Control, which admits a binary
 *    on reputation. `ffmpeg.exe` is common enough to pass; `ffprobe.exe` is not, and every
 *    copy on the machine — the winget build and the one bundled with Remotion — is refused
 *    with the same `UNKNOWN` errno. Since ffprobe was only ever used to read durations, and
 *    ffmpeg can report those itself, ffprobe is treated as OPTIONAL: `probeDuration` falls
 *    back to decoding with ffmpeg. Availability is PROBED, not assumed, because "the
 *    executable exists on disk" and "the executable is allowed to start" are different
 *    questions on a locked-down machine.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const WIN = process.platform === 'win32';
const EXTS = WIN ? ['.exe', '.cmd', '.bat', ''] : [''];

/** Extra places to look beyond PATH: a project's own bundled copies. */
const EXTRA_DIRS = [
  join(process.cwd(), 'node_modules', '@remotion', 'compositor-win32-x64-msvc'),
  join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64'),
  join(process.cwd(), 'node_modules', 'ffmpeg-static'),
];

function candidates(name) {
  const out = [];
  const env = process.env[`${name.toUpperCase()}_PATH`];
  if (env) out.push(env);
  for (const dir of [...(process.env.PATH || '').split(delimiter), ...EXTRA_DIRS]) {
    if (!dir) continue;
    for (const ext of EXTS) out.push(join(dir, name + ext));
  }
  return out;
}

/** A binary counts as usable only if it actually STARTS — see note 2 above. */
function runnable(path) {
  if (!existsSync(path)) return false;
  const r = spawnSync(path, ['-version'], { encoding: 'utf8', timeout: 20000 });
  return !r.error && r.status === 0;
}

function findRunnable(name) {
  const seen = new Set();
  for (const p of candidates(name)) {
    if (seen.has(p)) continue;
    seen.add(p);
    if (runnable(p)) return p;
  }
  return null;
}

export const FFMPEG = (() => {
  const p = findRunnable('ffmpeg');
  if (!p) {
    throw new Error(
      'No runnable ffmpeg found. Either it is not installed (winget install Gyan.FFmpeg) ' +
      'or Application Control is refusing to start it. Set FFMPEG_PATH to a permitted build.',
    );
  }
  return p;
})();

/** May be null: ffprobe is optional and often the one Application Control refuses. */
export const FFPROBE = findRunnable('ffprobe');

export const ffmpegStderr = (args) => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', ...args], {
    encoding: 'utf8', maxBuffer: 1 << 28,
  });
  if (r.error) throw r.error;
  return `${r.stdout || ''}${r.stderr || ''}`;
};

/**
 * Duration of a media file in seconds.
 *
 * With ffprobe, the container's own figure. Without it, the file is DECODED to null and the
 * last reported `time=` is used — which is the decoded length rather than a header claim,
 * so it stays correct for the spliced PCM and WAV intermediates the audio stage produces,
 * where an MP3 header estimate would be wrong anyway.
 */
export function probeDuration(path) {
  if (FFPROBE) {
    const out = execFileSync(FFPROBE, [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path,
    ], { encoding: 'utf8' });
    const d = parseFloat(out.trim());
    if (Number.isFinite(d)) return d;
  }

  const log = ffmpegStderr(['-i', path, '-f', 'null', '-']);
  let last = null;
  for (const m of log.matchAll(/time=(\d+):(\d\d):(\d\d(?:\.\d+)?)/g)) {
    last = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  }
  if (last !== null) return last;

  const d = /Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/.exec(log);
  if (d) return +d[1] * 3600 + +d[2] * 60 + parseFloat(d[3]);

  throw new Error(`could not read duration of ${path}`);
}

/**
 * Stream/format facts for the delivery gate, in ffprobe's JSON shape.
 *
 * Returns null when ffprobe is unavailable, so a caller can report the gate as NOT RUN
 * rather than quietly skipping it — a validation step that silently passes is worse than
 * one that admits it did not run.
 */
export function probeJson(path, entries) {
  if (!FFPROBE) return null;
  const r = spawnSync(FFPROBE, ['-v', 'error', ...entries, '-of', 'json', path], {
    encoding: 'utf8', maxBuffer: 1 << 26,
  });
  if (r.error || r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}
