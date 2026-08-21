#!/usr/bin/env node
/**
 * package-batch-002-metadata.mjs — descriptions and tags for Batch 002, titles left alone.
 *
 *   node tools/package-batch-002-metadata.mjs [--dry-run]
 *
 * Batch 001 ran `finalize-metadata.mjs`, which GENERATES titles: it builds a candidate pool,
 * scores it, and optimises the set. Batch 002 must not go through that. Its titles were
 * authored alongside the scripts, checked against the research, and rendered into videos whose
 * captions and beats are anchored to those exact words. Re-deciding them at scheduling time
 * would change the product to suit a tool.
 *
 * So this packages the two things that genuinely are missing — a description and tags — using
 * the same generators and the same linters as Batch 001, and copies the title through
 * verbatim. Everything is gated against the episode's own transcript and facts, so nothing
 * reaches YouTube that the video does not support.
 */

import { createHash } from 'node:crypto';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { buildBrief } from '../src/youtube/domain/generate.mjs';
import { buildManifest } from '../src/youtube/domain/manifest.mjs';
import { generateDescriptions, lintDescription, CTA_VARIANTS } from '../src/youtube/domain/description.mjs';
import { generateTags, lintTags, budgetOf, dedupeTags } from '../src/youtube/domain/tags.mjs';
import { defaultsForManifest } from '../src/youtube/domain/publish-defaults.mjs';

const DRY = process.argv.includes('--dry-run');
const PLAYLIST_ID = 'PLGqOZxhW6Pak';
const db = getDb();

const scripts = JSON.parse(
  await import('node:fs').then((fs) => fs.readFileSync('data/batch-002-scripts.json', 'utf8')),
);
const plan = JSON.parse(
  await import('node:fs').then((fs) => fs.readFileSync('data/batch-002-release-plan.json', 'utf8')),
);

const authored = new Map(scripts.episodes.map((e) => [e.id, e]));

/*
 * CTA history accumulates across the batch so the same sign-off does not appear on twenty
 * videos in a row. Batch 001's choices are seeded in first for the same reason -- the viewer
 * sees one channel, not two batches.
 */
const ctaHistory = [];

const tagHistory = [];
const descHistory = [];
const rows = [];
let problems = 0;

for (const entry of plan.entries) {
  const slug = entry.slug;
  const content = db.prepare('SELECT * FROM content_item WHERE content_id = ?').get(slug);
  if (!content) { console.error(`${slug}: no content_item row`); problems++; continue; }

  const src = authored.get(slug);
  const brief = buildBrief(content);

  // THE TITLE IS NOT REGENERATED. It comes from the authored script, unchanged.
  const title = src.title;

  /*
   * Same selection as Batch 001, for the same reason recorded there: prefer variants that
   * open on the HOOK. The "tight" shape is the reveal sentence alone, and a reveal is by
   * construction mid-script, so it tends to start with a pronoun pointing at a sentence the
   * reader cannot see.
   */
  const variants = generateDescriptions(brief, { ctaHistory }).map((v) => ({
    ...v,
    lint: lintDescription(v.text, {
      facts: content.facts_text ?? '',
      transcript: content.script_text ?? '',
      history: descHistory,
    }),
  }));
  const preferred = ['question-first', 'with-payoff', 'reveal-first', 'tight'];
  const chosen = variants.filter((v) => v.lint.errors === 0)
    .sort((a, b) => (preferred.indexOf(a.id) - preferred.indexOf(b.id))
      || a.lint.warnings - b.lint.warnings
      || a.text.length - b.text.length)[0] ?? variants[0];
  const description = chosen?.text ?? '';
  const descLint = chosen?.lint ?? { errors: 1, warnings: 0, issues: [] };

  const { candidates: tagCandidates } = generateTags(brief, { transcript: content.script_text ?? '' });
  const { kept } = dedupeTags(tagCandidates.map((t) => t.text));
  const tags = kept.map((k) => k.text).slice(0, 12);
  const tagLint = lintTags(tags, { history: tagHistory });
  const budget = budgetOf(tags);

  ctaHistory.unshift(CTA_VARIANTS.filter(Boolean).find((c) => description.includes(c)) ?? null);
  descHistory.push({ description });
  tagHistory.push(tags.map((t) => t.toLowerCase()));

  const manifest = buildManifest(content, {
    ...defaultsForManifest(content),
    title,
    description,
    tags,
    playlistId: PLAYLIST_ID,
    publishAt: entry.publishAt,
  });

  const metadataHash = `sha256:${createHash('sha256')
    .update(JSON.stringify({ title, description, tags })).digest('hex')}`;

  const descErrors = descLint.errors ?? 0;
  const tagErrors = tagLint.errors ?? 0;
  // YouTube's tag field is 500 characters including separators.
  const over = budget > 500;
  if (descErrors || tagErrors || over) problems++;

  rows.push({
    slug, title, tags: tags.length, chars: description.length, budget,
    descErrors, tagErrors, over,
  });

  if (!DRY) {
    const existing = db.prepare('SELECT id FROM publish_manifest WHERE content_id = ?').get(slug);
    if (existing) {
      db.prepare(`UPDATE publish_manifest SET manifest_json=?, metadata_hash=?, asset_hash=?, state=?, updated_at=?
                  WHERE content_id=?`)
        .run(JSON.stringify(manifest), metadataHash, content.content_hash, 'METADATA_LOCKED', now(), slug);
    } else {
      db.prepare(`INSERT INTO publish_manifest
        (content_id, schema_version, state, manifest_json, metadata_hash, asset_hash, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)`)
        .run(slug, 1, 'METADATA_LOCKED', JSON.stringify(manifest), metadataHash, content.content_hash, now(), now());
    }
  }
}

console.log('episode                    tags  desc-chars  tagB  descErr  tagErr  over  title');
for (const r of rows) {
  console.log(
    `${r.slug.padEnd(25)}  ${String(r.tags).padStart(4)}  ${String(r.chars).padStart(10)}  `
    + `${String(r.budget).padStart(5)}  ${String(r.descErrors).padStart(7)}  ${String(r.tagErrors).padStart(6)}  ${(r.over ? 'YES' : 'no').padEnd(4)}  ${r.title.slice(0, 36)}`,
  );
}
console.log('');
console.log(`${rows.length} packaged · ${problems} with lint errors${DRY ? ' · DRY RUN, nothing written' : ' · written as METADATA_LOCKED'}`);
process.exit(problems ? 1 : 0);
