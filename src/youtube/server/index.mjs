/**
 * server/index.mjs — the local backend.
 *
 * Binds 127.0.0.1 only. This is the secret boundary: OAuth, the client secret and the refresh
 * token live on this side and never cross to the browser. The frontend gets JSON and asset
 * streams, nothing else.
 *
 * Asset serving is by CONTENT ID, never by path. The browser cannot ask for `C:\anything`
 * because it has no way to express a path at all — it names an indexed content item and an
 * asset kind, and the backend looks the real location up in the database. Path traversal is
 * structurally impossible rather than filtered.
 */

import express from 'express';
import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';
import { z } from 'zod';

import { STATE_DIR, SCOPES } from '../config.mjs';
import { getDb, migrationStatus, now } from '../db/index.mjs';
import { discoverContent, resolveAsset } from '../ingest/discover.mjs';
import { DomainError, ERROR, toWireError } from './errors.mjs';
import { log } from './logger.mjs';
import * as svc from '../services/index.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.BFO_PORT ?? 8787);

export function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Loopback only. Belt and braces on top of binding 127.0.0.1: reject anything that somehow
  // arrives from elsewhere.
  app.use((req, res, next) => {
    const ip = req.socket.remoteAddress ?? '';
    if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', title: 'Local access only' } });
    }
    next();
  });

  const wrap = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      const { status, body } = toWireError(err);
      log.error('request failed', { path: req.path, code: body.error.code, err });
      res.status(status).json(body);
    });
  };

  // ---------------------------------------------------------------- health
  app.get('/api/health', wrap(async (_req, res) => res.json(await svc.systemHealth())));
  app.get('/api/capabilities', wrap(async (_req, res) => res.json(svc.capabilities())));

  // --------------------------------------------------------------- channel
  app.get('/api/channel', wrap(async (req, res) => {
    res.json(await svc.getChannel({ refresh: req.query.refresh === '1' }));
  }));

  app.post('/api/auth/connect', wrap(async (_req, res) => res.json(await svc.connect())));
  app.post('/api/auth/disconnect', wrap(async (_req, res) => res.json(await svc.disconnect())));

  // --------------------------------------------------------------- content
  app.get('/api/content', wrap(async (req, res) => {
    res.json(svc.listContent({ view: req.query.view ?? 'ALL', q: req.query.q ?? '' }));
  }));

  app.get('/api/content/:id', wrap(async (req, res) => {
    const item = svc.getContent(req.params.id);
    if (!item) throw new DomainError(ERROR.NOT_FOUND, 'No such content item.');
    res.json(item);
  }));

  app.post('/api/content/rescan', wrap(async (_req, res) => {
    const summary = await discoverContent();
    res.json(summary);
  }));

  // ---- assets: streamed by content id, with range support -----------------
  const MIME = { '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.srt': 'text/plain; charset=utf-8' };

  app.get('/api/asset/:id/:kind', wrap(async (req, res) => {
    const idx = Number(req.query.i ?? 0);
    const found = resolveAsset(req.params.id, req.params.kind, Number.isFinite(idx) ? idx : 0);
    if (!found) throw new DomainError(ERROR.NOT_FOUND, 'Asset not indexed.');

    const stat = statSync(found.path);
    const type = MIME[extname(found.path).toLowerCase()] ?? 'application/octet-stream';
    const range = req.headers.range;

    // Range handling matters: without it the browser cannot seek a 15 MB video, and the
    // whole file would be buffered before the first frame appears.
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : stat.size - 1;
      if (start >= stat.size) {
        res.status(416).set('Content-Range', `bytes */${stat.size}`).end();
        return;
      }
      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': type,
      });
      createReadStream(found.path, { start, end }).pipe(res);
      return;
    }

    res.set({ 'Content-Length': stat.size, 'Content-Type': type, 'Accept-Ranges': 'bytes' });
    createReadStream(found.path).pipe(res);
  }));

  // -------------------------------------------------------------- metadata
  const GenBody = z.object({ count: z.number().int().min(1).max(12).optional() });

  app.post('/api/content/:id/metadata/generate', wrap(async (req, res) => {
    const { count } = GenBody.parse(req.body ?? {});
    res.json(await svc.generateMetadata(req.params.id, { count }));
  }));

  const LintBody = z.object({
    title: z.string().default(''),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
  });

  app.post('/api/content/:id/metadata/lint', wrap(async (req, res) => {
    res.json(svc.lintMetadata(req.params.id, LintBody.parse(req.body ?? {})));
  }));

  /*
   * Description and tags generate INDEPENDENTLY of titles.
   *
   * Previously a description only appeared as a by-product of generating titles, so
   * re-rolling the copy meant losing a title you had already settled on. These are the
   * two things a creator actually iterates on, and each now has its own endpoint.
   */
  app.post('/api/content/:id/description/generate', wrap(async (req, res) =>
    res.json(svc.generateDescription(req.params.id))));

  app.post('/api/content/:id/tags/generate', wrap(async (req, res) =>
    res.json(svc.generateTagsFor(req.params.id))));

  const TagsBody = z.object({ tags: z.array(z.string()).default([]) });

  // Normalisation is a server concern: the tag budget rules are subtle enough that the
  // UI must not own a second implementation of them.
  app.post('/api/tags/normalise', wrap(async (req, res) =>
    res.json(svc.normaliseTags(TagsBody.parse(req.body ?? {}).tags))));

  // -------------------------------------------------------------- manifest
  app.get('/api/content/:id/manifest', wrap(async (req, res) => res.json(svc.getManifest(req.params.id))));

  const ManifestPatch = z.object({
    metadata: z.object({
      selectedTitle: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      categoryId: z.string().optional(),
      language: z.string().optional(),
    }).partial().optional(),
    youtube: z.object({
      privacy: z.enum(['private', 'unlisted', 'public']).optional(),
      publishAt: z.string().nullable().optional(),
      playlistIds: z.array(z.string()).optional(),
      madeForKids: z.boolean().optional(),
      containsSyntheticMedia: z.boolean().nullable().optional(),
    }).partial().optional(),
    captions: z.object({
      upload: z.boolean().optional(), language: z.string().optional(),
    }).partial().optional(),
    thumbnail: z.object({ path: z.string().nullable().optional() }).partial().optional(),
  });

  app.patch('/api/content/:id/manifest', wrap(async (req, res) => {
    res.json(svc.saveManifest(req.params.id, ManifestPatch.parse(req.body ?? {})));
  }));

  app.post('/api/content/:id/approve', wrap(async (req, res) => res.json(svc.approve(req.params.id))));
  app.post('/api/content/:id/revoke', wrap(async (req, res) => res.json(svc.revokeApproval(req.params.id))));
  app.get('/api/content/:id/manifest/export', wrap(async (req, res) => {
    const m = svc.exportManifest(req.params.id);
    res.set('Content-Type', 'application/json').send(JSON.stringify(m, null, 2));
  }));

  // ---------------------------------------------------------------- upload
  app.post('/api/content/:id/upload', wrap(async (req, res) => {
    res.json(await svc.requestPrivateUpload(req.params.id, { confirm: req.body?.confirm === true }));
  }));

  // ----------------------------------------------------------------- queue
  app.get('/api/queue', wrap(async (_req, res) => res.json(svc.listJobs())));
  app.post('/api/queue/:id/retry', wrap(async (req, res) => res.json(svc.retryJob(Number(req.params.id)))));
  app.post('/api/queue/:id/cancel', wrap(async (req, res) => res.json(svc.cancelJob(Number(req.params.id)))));
  app.post('/api/queue/dry-run', wrap(async (_req, res) => res.json(svc.enqueueDryRun())));

  // ------------------------------------------------------------- analytics
  app.get('/api/analytics/channel', wrap(async (req, res) => {
    res.json(await svc.channelAnalytics({ range: req.query.range ?? '28d' }));
  }));
  app.get('/api/analytics/video/:videoId', wrap(async (req, res) => {
    res.json(await svc.videoAnalytics(req.params.videoId, { range: req.query.range ?? '28d' }));
  }));
  app.get('/api/retention/:id', wrap(async (req, res) => res.json(await svc.retention(req.params.id))));

  // -------------------------------------------------------------- settings
  app.get('/api/settings', wrap(async (_req, res) => res.json(await svc.getSettings())));
  app.get('/api/quota', wrap(async (_req, res) => res.json(svc.quotaLedger())));
  app.get('/api/system', wrap(async (_req, res) => res.json({
    stateDir: STATE_DIR, logFile: log.file, ...migrationStatus(),
    scopes: SCOPES.read, startedAt: STARTED,
  })));

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', title: 'No such endpoint', detail: req.path } }));

  return app;
}

const STARTED = now();

export async function start() {
  getDb();
  const summary = await discoverContent();
  log.info('content discovery', summary);

  const app = createServer();
  return new Promise((resolve) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`  backend        http://${HOST}:${PORT}`);
      console.log(`  database       ${STATE_DIR}`);
      console.log(`  content        ${summary.scanned} items indexed (${summary.beats} beats, ${summary.stills} stills)`);
      resolve(server);
    });
  });
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  start();
}
