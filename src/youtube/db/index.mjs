/**
 * db/index.mjs — the local operational database.
 *
 * SQLite via better-sqlite3: synchronous, single file, no daemon. For a single-user desktop
 * app the synchronous API is an advantage, not a compromise — there is no event-loop
 * contention to avoid and it removes a whole class of async ordering bugs from the services.
 *
 * The file lives in %LOCALAPPDATA%\BillFindsOut, never in the repository, so operational
 * state cannot be committed and a fresh clone starts empty.
 *
 * Migrations are numbered and idempotent. No auto-creating schema magic: if the schema
 * changes, a migration says so and `schema_migration` records that it ran.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DB_FILE } from '../config.mjs';

let db = null;

/**
 * Every migration, in order. Append only — never edit one that has shipped.
 *
 * The schema deliberately covers only what V1 uses. Speculative tables for comments,
 * playlists and reporting are absent; they arrive with the features that need them.
 */
const MIGRATIONS = [
  {
    id: 1,
    name: 'initial',
    sql: `
      -- Local production content, discovered from the repository.
      CREATE TABLE content_item (
        content_id      TEXT PRIMARY KEY,
        topic           TEXT NOT NULL,
        title_working   TEXT,
        episode_number  INTEGER,
        video_path      TEXT,
        video_bytes     INTEGER,
        duration_s      REAL,
        width           INTEGER,
        height          INTEGER,
        content_hash    TEXT,
        srt_path        TEXT,
        script_text     TEXT,
        facts_text      TEXT,
        storyboard_path TEXT,
        timing_path     TEXT,
        episode_path    TEXT,
        thumbnail_path  TEXT,
        qa_status       TEXT,
        rendered_at     TEXT,
        publish_state   TEXT NOT NULL DEFAULT 'DRAFT',
        discovered_at   TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );

      -- QA contact-sheet stills, one row per image.
      CREATE TABLE content_still (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id  TEXT NOT NULL REFERENCES content_item(content_id) ON DELETE CASCADE,
        path        TEXT NOT NULL,
        frame       INTEGER,
        scene       TEXT,
        UNIQUE(content_id, path)
      );

      -- Storyboard beats, normalised for the retention overlay.
      -- "ratio" is precomputed so it joins straight against elapsedVideoTimeRatio.
      CREATE TABLE production_beat (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id  TEXT NOT NULL REFERENCES content_item(content_id) ON DELETE CASCADE,
        scene       TEXT,
        beat_index  INTEGER,
        t_seconds   REAL NOT NULL,
        ratio       REAL NOT NULL,
        label       TEXT,
        action      TEXT,
        UNIQUE(content_id, beat_index)
      );

      -- The publish intent. One current manifest per content item.
      CREATE TABLE publish_manifest (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id      TEXT NOT NULL UNIQUE REFERENCES content_item(content_id) ON DELETE CASCADE,
        schema_version  INTEGER NOT NULL,
        state           TEXT NOT NULL,
        manifest_json   TEXT NOT NULL,
        metadata_hash   TEXT,
        asset_hash      TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );

      -- Generated title/description options, kept for comparison and history.
      CREATE TABLE metadata_candidate (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id  TEXT NOT NULL REFERENCES content_item(content_id) ON DELETE CASCADE,
        kind        TEXT NOT NULL,           -- 'title' | 'description'
        text        TEXT NOT NULL,
        family      TEXT,
        score       REAL,
        lint_json   TEXT,
        source      TEXT,                    -- 'generated' | 'manual'
        selected    INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL
      );

      -- Immutable consent records. Stores the hashes that were approved, not a boolean.
      CREATE TABLE approval (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        content_id     TEXT NOT NULL REFERENCES content_item(content_id) ON DELETE CASCADE,
        approved_at    TEXT NOT NULL,
        asset_hash     TEXT NOT NULL,
        metadata_hash  TEXT NOT NULL,
        privacy_status TEXT NOT NULL,
        publish_at     TEXT,
        snapshot_json  TEXT NOT NULL,
        revoked_at     TEXT,
        revoked_reason TEXT
      );

      -- Background jobs. Survives restart; that is the whole point.
      CREATE TABLE job (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        type             TEXT NOT NULL,
        content_id       TEXT,
        state            TEXT NOT NULL,
        idempotency_key  TEXT UNIQUE,
        payload_json     TEXT,
        progress         REAL NOT NULL DEFAULT 0,
        attempt          INTEGER NOT NULL DEFAULT 0,
        max_attempts     INTEGER NOT NULL DEFAULT 5,
        error_code       TEXT,
        error_message    TEXT,
        resumable_uri    TEXT,
        bytes_sent       INTEGER NOT NULL DEFAULT 0,
        next_retry_at    TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      );

      -- What YouTube says exists.
      CREATE TABLE youtube_video (
        video_id          TEXT PRIMARY KEY,
        content_id        TEXT REFERENCES content_item(content_id),
        channel_id        TEXT,
        title             TEXT,
        privacy_status    TEXT,
        publish_at        TEXT,
        upload_status     TEXT,
        processing_status TEXT,
        rejection_reason  TEXT,
        published_at      TEXT,
        duration          TEXT,
        view_count        INTEGER,
        like_count        INTEGER,
        comment_count     INTEGER,
        last_synced_at    TEXT
      );

      -- Point-in-time analytics captures. data_end_date records how far YouTube's data ran.
      CREATE TABLE analytics_snapshot (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id      TEXT,
        scope         TEXT NOT NULL,        -- 'channel' | 'video'
        checkpoint    TEXT,                 -- '24h' | '7d' | 'range'
        start_date    TEXT,
        end_date      TEXT,
        requested_at  TEXT NOT NULL,
        data_end_date TEXT,
        availability  TEXT NOT NULL,        -- 'OK' | 'NO_DATA' | 'PARTIAL' | 'ERROR'
        metrics_json  TEXT
      );

      -- The 100-point retention curve.
      CREATE TABLE retention_point (
        id                             INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id                       TEXT NOT NULL,
        elapsed_ratio                  REAL NOT NULL,
        audience_watch_ratio           REAL,
        relative_retention_performance REAL,
        captured_at                    TEXT NOT NULL,
        UNIQUE(video_id, elapsed_ratio, captured_at)
      );

      -- One background sync run.
      CREATE TABLE sync_run (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        kind         TEXT NOT NULL,
        started_at   TEXT NOT NULL,
        finished_at  TEXT,
        status       TEXT NOT NULL,
        error_code   TEXT,
        items        INTEGER NOT NULL DEFAULT 0,
        detail       TEXT
      );

      -- Persistent quota ledger. Local estimate; Google does not expose real consumption.
      CREATE TABLE quota_event (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        method  TEXT NOT NULL,
        bucket  TEXT NOT NULL,
        cost    INTEGER NOT NULL,
        ok      INTEGER NOT NULL,
        ms      INTEGER,
        at      TEXT NOT NULL
      );

      CREATE TABLE app_setting (
        key        TEXT PRIMARY KEY,
        value      TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_beat_content   ON production_beat(content_id);
      CREATE INDEX idx_cand_content   ON metadata_candidate(content_id, kind);
      CREATE INDEX idx_job_state      ON job(state);
      CREATE INDEX idx_quota_at       ON quota_event(at);
      CREATE INDEX idx_approval_content ON approval(content_id);
    `,
  },
  {
    id: 2,
    name: 'audio-library',
    sql: `
      -- One row per file discovered in an external pack. The packs stay READ-ONLY; this is
      -- an index of them, not a copy. Absolute source paths live here, in the local database,
      -- and deliberately never in a portable manifest.
      CREATE TABLE audio_source (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        sha256         TEXT,
        pack           TEXT NOT NULL,
        path           TEXT NOT NULL UNIQUE,
        filename       TEXT NOT NULL,
        ext            TEXT,
        bytes          INTEGER,
        mtime          REAL,
        duration_s     REAL,
        sample_rate    INTEGER,
        channels       INTEGER,
        codec          TEXT,
        bitrate_kbps   INTEGER,
        peak_db        REAL,
        rms_db         REAL,
        silence_ratio  REAL,
        fingerprint    TEXT,
        category       TEXT,
        subcategory    TEXT,
        tags           TEXT,
        provenance     TEXT NOT NULL DEFAULT 'UNKNOWN',
        valid          INTEGER NOT NULL DEFAULT 1,
        error          TEXT,
        dup_of         INTEGER,
        dup_kind       TEXT,          -- 'EXACT' | 'NEAR'
        shortlisted    INTEGER NOT NULL DEFAULT 0,
        imported_id    TEXT,
        scanned_at     TEXT NOT NULL
      );

      -- Assets actually copied into the repository. Portable: no absolute source path.
      CREATE TABLE audio_asset (
        id             TEXT PRIMARY KEY,      -- e.g. sfx-reveal-ding-001
        type           TEXT NOT NULL,         -- 'sfx' | 'music'
        category       TEXT,
        subcategory    TEXT,
        tags           TEXT,
        rel_path       TEXT NOT NULL UNIQUE,  -- relative to public/
        sha256         TEXT NOT NULL,
        duration_s     REAL,
        peak_db        REAL,
        rms_db         REAL,
        source_pack    TEXT,
        source_filename TEXT,
        provenance     TEXT NOT NULL,
        usage_count    INTEGER NOT NULL DEFAULT 0,
        imported_at    TEXT NOT NULL
      );

      -- Where each asset is used, so repetition across episodes is measurable.
      CREATE TABLE audio_usage (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id    TEXT NOT NULL REFERENCES audio_asset(id) ON DELETE CASCADE,
        content_id  TEXT NOT NULL,
        role        TEXT,
        at_seconds  REAL,
        created_at  TEXT NOT NULL,
        UNIQUE(asset_id, content_id, at_seconds)
      );

      CREATE INDEX idx_src_pack     ON audio_source(pack);
      CREATE INDEX idx_src_cat      ON audio_source(category, subcategory);
      CREATE INDEX idx_src_dup      ON audio_source(dup_of);
      CREATE INDEX idx_src_fp       ON audio_source(fingerprint);
      CREATE INDEX idx_usage_asset  ON audio_usage(asset_id);
      CREATE INDEX idx_usage_content ON audio_usage(content_id);
    `,
  },
  {
    id: 3,
    name: 'audio-risk',
    sql: `
      -- Risk is deliberately separate from category. Category answers "what is this
      -- sound?"; risk answers "can this channel actually use it?". The scan showed the
      -- two are almost independent -- plenty of correctly-categorised impacts are
      -- unusable because they are a franchise sting.
      ALTER TABLE audio_source ADD COLUMN risk         TEXT;
      ALTER TABLE audio_source ADD COLUMN risk_reasons TEXT;
      CREATE INDEX idx_src_risk ON audio_source(risk);
    `,
  },
];

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(DB_FILE), { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(conn) {
  conn.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL
  )`);
  const done = new Set(conn.prepare('SELECT id FROM schema_migration').all().map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    conn.transaction(() => {
      conn.exec(m.sql);
      conn.prepare('INSERT INTO schema_migration (id, name, applied_at) VALUES (?, ?, ?)')
        .run(m.id, m.name, new Date().toISOString());
    })();
  }
}

/** Applied migrations, for the System page. */
export function migrationStatus() {
  const conn = getDb();
  return {
    dbFile: DB_FILE,
    applied: conn.prepare('SELECT id, name, applied_at FROM schema_migration ORDER BY id').all(),
    pending: MIGRATIONS.filter((m) =>
      !conn.prepare('SELECT 1 FROM schema_migration WHERE id = ?').get(m.id)).map((m) => m.name),
  };
}

export const now = () => new Date().toISOString();

export function setSetting(key, value) {
  getDb().prepare(
    `INSERT INTO app_setting (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, typeof value === 'string' ? value : JSON.stringify(value), now());
}

export function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM app_setting WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
