/**
 * finalize-metadata.mjs — choose and lock the metadata for all ten Shorts.
 *
 * Runs the whole pipeline in one pass so the batch is decided together:
 *
 *   read each episode's FACTS / script / storyboard
 *     -> generate 16-24 title candidates across ten grammar families
 *     -> hard gates (reject, not deduct)
 *     -> editorial score, then history penalties
 *     -> BATCH optimisation across all ten at once
 *     -> descriptions and tags, gated against the same source material
 *     -> write the manifest, hash it, mark METADATA_LOCKED
 *
 * The batch step is why this is one tool rather than ten runs. Choosing each episode's best
 * title independently converges on one grammar, because every episode here has the same
 * shape; the set has to be chosen as a set.
 *
 * Locking binds a hash of the chosen metadata. Editing any of it later invalidates the lock
 * through the existing approval machinery rather than through a flag someone has to remember.
 *
 *   node tools/finalize-metadata.mjs [--dry-run]
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { getDb, now } from '../src/youtube/db/index.mjs';
import { buildBrief } from '../src/youtube/domain/generate.mjs';
import { buildManifest } from '../src/youtube/domain/manifest.mjs';
import { generateCandidatePool } from '../src/youtube/metadata/title-candidates.mjs';
import { evaluatePool, classifyFamily } from '../src/youtube/metadata/title-engine.mjs';
import { optimiseBatch, batchHealth } from '../src/youtube/metadata/title-batch.mjs';
import { generateDescriptions, lintDescription, CTA_VARIANTS } from '../src/youtube/domain/description.mjs';
import { generateTags, lintTags, budgetOf, dedupeTags } from '../src/youtube/domain/tags.mjs';
import { defaultsForManifest, SYNTHETIC_CONTENT } from '../src/youtube/domain/publish-defaults.mjs';
import { buildReleasePlan } from '../src/youtube/domain/release-plan.mjs';

const DRY = process.argv.includes('--dry-run');
const OUT = 'docs/youtube-control-plane';
const PLAYLIST_ID = 'PLGqOZxhW6Pak';

const db = getDb();
const rows = db.prepare('SELECT * FROM content_item ORDER BY episode_number').all();
if (rows.length !== 10) console.log(`  note: ${rows.length} episodes found, expected 10`);

/* ------------------------------------------------- 1. titles, gated and scored */

console.log('\n  TITLE CANDIDATES\n');
const episodes = rows.map((c) => {
  const brief = buildBrief(c);
  const ctx = {
    facts: c.facts_text ?? '',
    script: c.script_text ?? '',
    actualReveal: brief.actualReveal,
    payoff: brief.payoff,
    coreObject: brief.coreObject,
    history: [],
    existingTitles: [],
  };
  const pool = generateCandidatePool(brief);
  const candidates = evaluatePool(pool, ctx);
  const passed = candidates.filter((x) => !x.rejected);
  console.log(`  ${c.content_id.padEnd(22)} ${String(pool.length).padStart(2)} generated  `
    + `${String(passed.length).padStart(2)} passed gates  ${candidates.length - passed.length} rejected`);
  return { contentId: c.content_id, content: c, brief, ctx, candidates };
});

/* ------------------------------------------------------- 2. batch optimisation */

const optimised = optimiseBatch(episodes);
const health = batchHealth(optimised.picks);
const chosen = new Map(optimised.picks.map((p) => [p.contentId, p]));

console.log(`\n  BATCH: mean ${optimised.quality}  repetition ${optimised.repetition.total.toFixed(3)}  `
  + `${health.familyDiversity} families\n`);

/*
 * Re-score each chosen title against the OTHER nine.
 *
 * The optimiser scores candidates with an empty history, because during the search no title is
 * settled yet -- scoring against a moving set would make the result depend on the order the
 * beam happened to explore. Once the set is fixed, each title's real history is the other
 * nine, and that is what the report and the UI should show.
 */
const finalPicks = optimised.picks.map((p) => {
  const siblings = optimised.picks.filter((x) => x.contentId !== p.contentId).map((x) => x.title);
  const ep = episodes.find((e) => e.contentId === p.contentId);
  const [rescored] = evaluatePool([p.title], { ...ep.ctx, history: siblings });
  return { ...p, ...rescored, contentId: p.contentId };
});

/* --------------------------------------------------- 3. descriptions and tags */

console.log('  DESCRIPTIONS AND TAGS\n');
const ctaHistory = [];
const records = [];

for (const pick of finalPicks) {
  const ep = episodes.find((e) => e.contentId === pick.contentId);
  const { brief, content } = ep;

  /* ---- description: pick the best variant that passes the factual gate ---- */
  const variants = generateDescriptions(brief, { ctaHistory });
  const scoredVariants = variants.map((v) => ({
    ...v,
    lint: lintDescription(v.text, {
      facts: content.facts_text ?? '',
      transcript: content.script_text ?? '',
      history: records.map((r) => ({ description: r.description })),
    }),
  }));

  /*
   * House style is one to two sentences and roughly under 250 characters, so the "tight" and
   * "reveal-first" shapes are preferred. Errors disqualify outright -- a description is not
   * allowed to be the loophole around the title's factual gate.
   */
  const eligible = scoredVariants.filter((v) => v.lint.errors === 0);
  /*
   * Hook-first, and this ordering is deliberately the reverse of what it was.
   *
   * "tight" is the reveal sentence alone, and the reveal is by construction a MID-SCRIPT
   * sentence -- so it routinely carries a pronoun or connective pointing at the sentence
   * before it. Preferring the shortest variant published "That pressure change triggers a
   * mechanical diaphragm inside the nozzle and click." as the description of an episode. The
   * hook is sentence one and always stands on its own.
   */
  const preferred = ['question-first', 'with-payoff', 'reveal-first', 'tight'];
  const description = (eligible.sort((a, b) =>
    (preferred.indexOf(a.id) - preferred.indexOf(b.id))
    || a.lint.warnings - b.lint.warnings
    || a.text.length - b.text.length)[0] ?? scoredVariants[0]);

  const usedCta = CTA_VARIANTS.filter(Boolean).find((c) => description.text.includes(c)) ?? null;
  ctaHistory.unshift(usedCta);

  /* ---- tags ---- */
  const { candidates: tagCandidates } = generateTags(brief, { transcript: content.script_text ?? '' });
  const { kept } = dedupeTags(tagCandidates.map((t) => t.text));
  const tags = kept.map((k) => k.text).slice(0, 12);
  const tagLint = lintTags(tags, { history: records.map((r) => r.tags.map((t) => t.toLowerCase())) });

  records.push({
    contentId: pick.contentId,
    episodeNumber: content.episode_number,
    title: pick.title,
    titleScore: pick.score,
    grammarFamily: pick.family,
    hardGates: pick.gates,
    evidence: pick.evidence,
    editorial: pick.editorial,
    penalties: pick.penalties,
    candidatePool: ep.candidates.map((c) => ({
      title: c.title, family: c.family, score: c.score,
      rejected: c.rejected, failedGates: c.failedGates,
    })),
    description: description.text,
    descriptionVariant: description.id,
    descriptionLint: description.lint,
    descriptionChars: description.text.length,
    tags,
    tagCount: tags.length,
    tagBudget: budgetOf(tags),
    tagLint,
    types: tagCandidates.filter((t) => tags.includes(t.text)).map((t) => ({ text: t.text, type: t.type })),
  });

  console.log(`  ${pick.contentId.padEnd(22)} title ${String(pick.score).padStart(5)}  `
    + `desc ${String(description.text.length).padStart(3)}ch/${description.lint.errors}e  `
    + `tags ${tags.length} (${budgetOf(tags)}/500)`);
}

/* --------------------------------------------------- 4. write and lock */

const defaults = defaultsForManifest();
const releasePlan = buildReleasePlan(finalPicks);

const locked = records.map((r) => {
  /*
   * The lock hash covers exactly the fields that must not drift silently: the copy, and the
   * publish settings applied with it. It deliberately excludes scores and lint output, which
   * are derived and would change the hash on a scorer tweak without the metadata changing.
   */
  const material = {
    contentId: r.contentId,
    title: r.title,
    description: r.description,
    tags: r.tags,
    defaults,
    playlistId: PLAYLIST_ID,
  };
  const metadataHash = `sha256:${createHash('sha256')
    .update(JSON.stringify(material)).digest('hex')}`;
  return { ...r, metadataHash, lockState: 'METADATA_LOCKED', lockedAt: now() };
});

if (!DRY) {
  const upsert = db.prepare(`
    INSERT INTO metadata_candidate (content_id, kind, text, family, score, lint_json, source, selected, created_at)
    VALUES (?,?,?,?,?,?,?,1,?)`);
  const clear = db.prepare("DELETE FROM metadata_candidate WHERE content_id = ? AND kind IN ('title','description')");

  db.transaction(() => {
    for (const r of locked) {
      clear.run(r.contentId);
      upsert.run(r.contentId, 'title', r.title, r.grammarFamily, r.titleScore,
        JSON.stringify({ gates: r.hardGates, editorial: r.editorial, penalties: r.penalties }),
        'title-engine', now());
      upsert.run(r.contentId, 'description', r.description, null, null,
        JSON.stringify(r.descriptionLint), 'description-engine', now());

      /*
       * Create the manifest if it does not exist yet.
       *
       * Only one episode had ever been opened in Publish Studio, so only one had a manifest
       * row -- and updating "if (row)" silently skipped the other nine. They locked their
       * title and description into metadata_candidate and lost their tags and publish
       * defaults entirely, which showed up as nine DRAFT rows with zero tags on the batch
       * screen. Locking metadata has to create the record it is locking.
       */
      const row = db.prepare('SELECT manifest_json FROM publish_manifest WHERE content_id = ?').get(r.contentId);
      const content = rows.find((c) => c.content_id === r.contentId);
      const m = row ? JSON.parse(row.manifest_json) : buildManifest(content);
      {
        m.metadata.selectedTitle = r.title;
        m.metadata.description = r.description;
        m.metadata.tags = r.tags;
        m.youtube = {
          ...m.youtube,
          privacy: defaults.privacyStatus,
          categoryId: defaults.categoryId,
          defaultLanguage: defaults.defaultLanguage,
          defaultAudioLanguage: defaults.defaultAudioLanguage,
          license: defaults.license,
          selfDeclaredMadeForKids: defaults.selfDeclaredMadeForKids,
          embeddable: defaults.embeddable,
          containsSyntheticMedia: defaults.containsSyntheticMedia,
          playlistId: PLAYLIST_ID,
        };
        if (row) {
          db.prepare('UPDATE publish_manifest SET manifest_json = ?, metadata_hash = ?, updated_at = ? WHERE content_id = ?')
            .run(JSON.stringify(m), r.metadataHash, now(), r.contentId);
        } else {
          db.prepare(`INSERT INTO publish_manifest
                        (content_id, schema_version, state, manifest_json, metadata_hash, created_at, updated_at)
                      VALUES (?,?,?,?,?,?,?)`)
            .run(r.contentId, m.schemaVersion, content.publish_state ?? 'METADATA_READY',
              JSON.stringify(m), r.metadataHash, now(), now());
        }
      }
    }
  })();
}

const report = {
  generatedAt: now(),
  batch: 'batch-001',
  playlistId: PLAYLIST_ID,
  publishDefaults: defaults,
  syntheticContent: SYNTHETIC_CONTENT,
  batchHealth: health,
  batchObjective: { objective: optimised.objective, meanQuality: optimised.quality, repetition: optimised.repetition },
  episodes: locked,
  releasePlan,
  dryRun: DRY,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BATCH_001_METADATA.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`\n  RELEASE PLAN (prepared only) — first Thursday ${releasePlan.startDate}\n`);
for (const e of releasePlan.entries) {
  console.log(`  ${String(e.order).padStart(2)}. ${e.dayName.padEnd(9)} ${e.localTime} ET  `
    + `(UTC${e.utcOffsetHours >= 0 ? '+' : ''}${e.utcOffsetHours})  ${e.contentId}`);
}

console.log(`\n  batch health: avg ${health.averageScore}  min ${health.minScore}  max ${health.maxScore}  `
  + `${health.familyDiversity} families  tiny×${health.tinyCount}  why×${health.whyCount}`);
console.log(`  ${DRY ? 'DRY RUN — nothing written to the database' : `locked ${locked.length} episodes`}`);
console.log(`  report: ${join(OUT, 'BATCH_001_METADATA.json')}\n`);
