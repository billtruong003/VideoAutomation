/**
 * discover.mjs — index the repository's production output into the control plane.
 *
 * Reads the layout that actually exists rather than one invented for the occasion:
 *
 *   data/batch-*.json                 the batch manifest: slug, title, source audio/subtitle,
 *                                     transcript, episode number
 *   episodes/<slug>/episode.json      authored scene split, keywords, beat plan, cast
 *   episodes/<slug>/storyboard.json   resolved beats with absolute times — the retention overlay
 *   episodes/<slug>/narration-timing.json  the master clock (duration, captions, words)
 *   out/<batch>/NN-<slug>.mp4         the delivered render
 *   qa/<batch>/<slug>-*.png           QA contact-sheet stills
 *   <VoiceOver>/Sub/*.srt             the source subtitle, path recorded in the batch manifest
 *
 * Episodes vary: some have more scenes, some have no thumbnail, the SRT lives outside the
 * repository entirely. Everything optional is resolved defensively and recorded as null when
 * absent, so a partially-produced episode still indexes rather than breaking the scan.
 *
 * IDEMPOTENT BY CONTENT ID. Re-running updates rows in place and never creates duplicates,
 * which matters because this runs on every server start.
 *
 * Hashing is the expensive step (10 files, ~110 MB), so a hash is only recomputed when the
 * file's size or mtime has changed.
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { getDb, now } from '../db/index.mjs';
import { BEAT_LABEL, PUBLISH_STATE } from '../domain/states.mjs';

const ROOT = process.cwd();
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Streamed SHA-256 — never loads a 15 MB video into memory. */
function hashFile(path) {
  return new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', (d) => h.update(d))
      .on('error', rej)
      .on('end', () => res(`sha256:${h.digest('hex')}`));
  });
}

/**
 * Map a storyboard beat onto a normalised retention label.
 *
 * The storyboards were authored for rendering, not for analytics, so the label is inferred
 * from the scene id and the beat's own action text. A beat that matches nothing keeps a null
 * label — it still appears on the retention chart as an unlabelled production event, which is
 * more honest than forcing it into a category it does not belong to.
 */
function inferBeatLabel(sceneId, action, isFirst, isLast) {
  const s = `${sceneId} ${action}`.toLowerCase();
  if (isFirst) return BEAT_LABEL.HOOK;
  if (isLast) return BEAT_LABEL.LOOP;
  if (/\bhook\b/.test(s)) return BEAT_LABEL.HOOK;
  if (/payoff|punchline|final beat|hard cut/.test(s)) return BEAT_LABEL.PAYOFF;
  if (/reveal|stamp|circled|lights up|label/.test(s)) return BEAT_LABEL.REVEAL;
  if (/mechanism|cutaway|diagram|section|passage|valve|mesh|wave|pane/.test(s)) return BEAT_LABEL.MECHANISM;
  if (/not a|isn't|aren't|crossed out|wrong|defect|myth/.test(s)) return BEAT_LABEL.WRONG_ASSUMPTION;
  if (/question mark|\bwhy\b|\bhow\b|confused|suspicious/.test(s)) return BEAT_LABEL.QUESTION;
  if (/mochi|gag|sunglasses|teeth|heart|steals/.test(s)) return BEAT_LABEL.GAG;
  return null;
}

/** Find the render for a slug across whatever batch folders exist. */
function findRender(slug) {
  const outRoot = join(ROOT, 'out');
  if (!existsSync(outRoot)) return null;
  for (const dir of readdirSync(outRoot)) {
    const full = join(outRoot, dir);
    if (!statSync(full).isDirectory()) continue;
    const hit = readdirSync(full).find((f) => f.endsWith('.mp4') && f.includes(slug));
    if (hit) return join(full, hit);
  }
  // fall back to a flat out/ layout
  const flat = readdirSync(outRoot).find((f) => f.endsWith('.mp4') && f.includes(slug));
  return flat ? join(outRoot, flat) : null;
}

function findStills(slug) {
  const qaRoot = join(ROOT, 'qa');
  if (!existsSync(qaRoot)) return [];
  const out = [];
  for (const dir of readdirSync(qaRoot)) {
    const full = join(qaRoot, dir);
    if (!existsSync(full) || !statSync(full).isDirectory()) continue;
    for (const f of readdirSync(full)) {
      if (!f.startsWith(slug) || !f.endsWith('.png')) continue;
      // filenames look like `<slug>-0301-pressure.png`
      const m = new RegExp(`^${slug}-(\\d+)-(.+)\\.png$`).exec(f);
      out.push({ path: join(full, f), frame: m ? Number(m[1]) : null, scene: m ? m[2] : null });
    }
  }
  return out.sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));
}

/** Every batch manifest in data/. */
function batchManifests() {
  const dataDir = join(ROOT, 'data');
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    .filter((f) => /^batch-\d+\.json$/.test(f))
    .map((f) => readJson(join(dataDir, f)));
}

/**
 * Scan and upsert. Returns a summary the UI can show.
 */
export async function discoverContent({ rehash = false } = {}) {
  const db = getDb();
  const summary = { scanned: 0, inserted: 0, updated: 0, missingRender: [], missingSrt: [], beats: 0, stills: 0 };

  for (const batch of batchManifests()) {
    for (const ep of batch.episodes ?? []) {
      const slug = ep.slug;
      summary.scanned++;

      const epDir = join(ROOT, 'episodes', slug);
      const episodePath = join(epDir, 'episode.json');
      const storyboardPath = join(epDir, 'storyboard.json');
      const timingPath = join(epDir, 'narration-timing.json');

      const cfg = existsSync(episodePath) ? readJson(episodePath) : null;
      const story = existsSync(storyboardPath) ? readJson(storyboardPath) : null;
      const timing = existsSync(timingPath) ? readJson(timingPath) : null;

      const videoPath = findRender(slug);
      if (!videoPath) summary.missingRender.push(slug);

      // The SRT lives outside the repository; the batch manifest recorded where.
      const srtPath = ep.subtitle && existsSync(ep.subtitle) ? ep.subtitle : null;
      if (!srtPath) summary.missingSrt.push(slug);

      const existing = db.prepare('SELECT content_id, content_hash, video_bytes, rendered_at FROM content_item WHERE content_id = ?').get(slug);

      let bytes = null;
      let renderedAt = null;
      let hash = existing?.content_hash ?? null;
      if (videoPath && existsSync(videoPath)) {
        const st = statSync(videoPath);
        bytes = st.size;
        renderedAt = st.mtime.toISOString();
        // Only re-hash when the file actually changed — 110 MB of hashing on every boot is
        // a real cost for a value that cannot have moved.
        const changed = !hash || existing?.video_bytes !== bytes || existing?.rendered_at !== renderedAt;
        if (rehash || changed) hash = await hashFile(videoPath);
      }

      const duration = timing?.duration ? Number(timing.duration) + 1.15 : null; // + tail hold
      const script = timing?.words?.length
        ? timing.words.map((w) => w.text).join(' ')
        : (ep.transcript ?? null);

      const row = {
        content_id: slug,
        topic: ep.title ?? cfg?.title ?? slug,
        title_working: cfg?.title ?? ep.title ?? null,
        episode_number: ep.n ?? null,
        video_path: videoPath ?? null,
        video_bytes: bytes,
        duration_s: duration,
        width: 1080,
        height: 1920,
        content_hash: hash,
        srt_path: srtPath,
        script_text: script,
        // "FACTS" for this pipeline is the verified transcript plus the authored hook line —
        // those are the only claims the episode can support.
        facts_text: [ep.transcript, cfg?.hook].filter(Boolean).join('\n\n') || null,
        storyboard_path: existsSync(storyboardPath) ? storyboardPath : null,
        timing_path: existsSync(timingPath) ? timingPath : null,
        episode_path: existsSync(episodePath) ? episodePath : null,
        thumbnail_path: null,
        qa_status: videoPath ? 'RENDERED' : 'NO_RENDER',
        rendered_at: renderedAt,
        updated_at: now(),
      };

      if (existing) {
        db.prepare(`
          UPDATE content_item SET topic=@topic, title_working=@title_working, episode_number=@episode_number,
            video_path=@video_path, video_bytes=@video_bytes, duration_s=@duration_s, width=@width, height=@height,
            content_hash=@content_hash, srt_path=@srt_path, script_text=@script_text, facts_text=@facts_text,
            storyboard_path=@storyboard_path, timing_path=@timing_path, episode_path=@episode_path,
            thumbnail_path=@thumbnail_path, qa_status=@qa_status, rendered_at=@rendered_at, updated_at=@updated_at
          WHERE content_id=@content_id`).run(row);
        summary.updated++;
      } else {
        db.prepare(`
          INSERT INTO content_item (content_id, topic, title_working, episode_number, video_path, video_bytes,
            duration_s, width, height, content_hash, srt_path, script_text, facts_text, storyboard_path,
            timing_path, episode_path, thumbnail_path, qa_status, rendered_at, publish_state, discovered_at, updated_at)
          VALUES (@content_id,@topic,@title_working,@episode_number,@video_path,@video_bytes,@duration_s,@width,
            @height,@content_hash,@srt_path,@script_text,@facts_text,@storyboard_path,@timing_path,@episode_path,
            @thumbnail_path,@qa_status,@rendered_at,@publish_state,@discovered_at,@updated_at)`)
          .run({ ...row, publish_state: videoPath ? PUBLISH_STATE.QA_READY : PUBLISH_STATE.DRAFT, discovered_at: now() });
        summary.inserted++;
      }

      // ---- beats -------------------------------------------------------
      if (story?.scenes && duration) {
        db.prepare('DELETE FROM production_beat WHERE content_id = ?').run(slug);
        const flat = story.scenes.flatMap((sc) => (sc.beats ?? []).map((b) => ({ ...b, scene: sc.scene })));
        flat.sort((a, b) => a.t - b.t);
        const ins = db.prepare(`INSERT OR IGNORE INTO production_beat
          (content_id, scene, beat_index, t_seconds, ratio, label, action) VALUES (?,?,?,?,?,?,?)`);
        flat.forEach((b, i) => {
          ins.run(slug, b.scene, i, b.t, Math.min(1, b.t / duration),
            inferBeatLabel(b.scene, b.action ?? '', i === 0, i === flat.length - 1), b.action ?? null);
          summary.beats++;
        });
      }

      // ---- stills ------------------------------------------------------
      const stills = findStills(slug);
      if (stills.length) {
        db.prepare('DELETE FROM content_still WHERE content_id = ?').run(slug);
        const ins = db.prepare('INSERT OR IGNORE INTO content_still (content_id, path, frame, scene) VALUES (?,?,?,?)');
        for (const s of stills) { ins.run(slug, s.path, s.frame, s.scene); summary.stills++; }
      }
    }
  }

  db.prepare('INSERT INTO sync_run (kind, started_at, finished_at, status, items, detail) VALUES (?,?,?,?,?,?)')
    .run('content-discovery', now(), now(), 'OK', summary.scanned, JSON.stringify(summary));

  return summary;
}

/**
 * Resolve a content asset id to a real path, refusing anything not indexed.
 *
 * This is the ONLY way the HTTP layer turns a request into a filesystem path. The browser
 * never sends a path; it sends a content id and an asset kind, and the answer must already
 * be a row in the database. That makes path traversal structurally impossible rather than
 * something a sanitiser has to catch.
 */
export function resolveAsset(contentId, kind, index = 0) {
  const db = getDb();
  const item = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(contentId);
  if (!item) return null;

  let candidate = null;
  if (kind === 'video') candidate = item.video_path;
  else if (kind === 'srt') candidate = item.srt_path;
  else if (kind === 'thumbnail') candidate = item.thumbnail_path;
  else if (kind === 'still') {
    const rows = db.prepare('SELECT path FROM content_still WHERE content_id = ? ORDER BY frame').all(contentId);
    candidate = rows[index]?.path ?? null;
  }
  if (!candidate) return null;

  const abs = resolve(candidate);
  if (!existsSync(abs)) return null;
  return { path: abs, name: basename(abs) };
}
