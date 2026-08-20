#!/usr/bin/env node
/**
 * build-storyboard.mjs — turn locked narration timing into a shot list.
 *
 *   node tools/build-storyboard.mjs [--episode <slug>]   (default: every episode in the batch)
 *
 * Scene boundaries come from `phrases` in the episode's narration-timing.json; individual
 * beats are anchored to spoken KEYWORDS rather than to wall-clock guesses, so if a narration
 * is ever reprocessed the whole storyboard re-times itself instead of drifting.
 *
 * A beat anchor is one of:
 *   { "kw": "twist", "offset": 0.1 }   -> 0.1s after the word "twist" begins
 *   { "at": 0.9 }                      -> relative to its own scene's start
 *   { "scene": "hook", "at": 1.2 }     -> relative to another scene's start
 *   { "fromEnd": 0.3 }                 -> before its scene ends
 *
 * Two automatic checks run per episode: a beat outside its scene is a hard error, and the
 * pacing report measures the longest gap between beats against the 0.5–2s Shorts target.
 * That second one is a machine-checkable definition of "not a slideshow".
 */

import { writeFileSync } from 'node:fs';
import { config, paths, readJson, selection } from './episode.mjs';

const r3 = (n) => Math.round(n * 1000) / 1000;
const PACING_TARGET = 2.2;

const { slugs } = selection();
const summary = [];
let failures = 0;

for (const slug of slugs) {
  try {
    summary.push(build(slug));
  } catch (e) {
    failures++;
    console.error(`[${slug}] FAILED: ${e.message}`);
  }
}

console.log('');
console.log('episode                 scenes  beats   longest gap');
for (const s of summary) {
  const flag = s.maxGap > PACING_TARGET ? `  <-- ${s.gapAt.toFixed(1)}s needs a secondary action` : '';
  console.log(
    `  ${s.slug.padEnd(22)} ${String(s.scenes).padStart(4)} ${String(s.beats).padStart(6)}   ` +
    `${s.maxGap.toFixed(2)}s${flag}`,
  );
}

if (failures) {
  console.error(`\n${failures} of ${slugs.length} episodes failed storyboarding.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------

function build(slug) {
  const P = paths(slug);
  const cfg = config(slug);
  const timing = readJson(P.timing);
  const FPS = timing.fps;

  const phraseOf = (id) => {
    const p = timing.phrases.find((x) => x.id === id);
    if (!p) throw new Error(`no phrase "${id}"`);
    return p;
  };
  const kwOf = (id) => {
    const k = timing.keywords[id];
    if (!k) throw new Error(`no keyword "${id}"`);
    return k;
  };

  function resolveAnchor(anchor, sceneId) {
    if (anchor.kw) return kwOf(anchor.kw).start + (anchor.offset ?? 0);
    const p = phraseOf(anchor.scene ?? sceneId);
    if (anchor.fromEnd !== undefined) return p.end - anchor.fromEnd;
    return p.start + (anchor.at ?? 0);
  }

  const planById = Object.fromEntries(cfg.scenes.map((s) => [s.id, s]));

  const scenes = timing.phrases.map((p) => {
    const plan = planById[p.id];
    if (!plan) throw new Error(`no plan for scene "${p.id}"`);

    const beats = (plan.beats ?? []).map((b) => {
      const t = resolveAnchor(b, p.id);
      return {
        t: r3(t),
        frame: Math.round(t * FPS),
        tInScene: r3(t - p.start),
        frameInScene: Math.round((t - p.start) * FPS),
        action: b.action,
        ...(b.sync ? { sync: b.sync } : {}),
      };
    });

    // A beat outside its scene means the anchor moved but the plan did not follow it.
    for (const b of beats) {
      if (b.t < p.start - 0.05 || b.t > p.end + 0.7) {
        throw new Error(`beat at ${b.t}s escapes scene "${p.id}" (${p.start}-${p.end}): ${b.action}`);
      }
    }

    return {
      scene: p.id,
      start: p.start,
      end: p.end,
      startFrame: Math.round(p.start * FPS),
      endFrame: Math.round(p.end * FPS),
      duration: r3(p.end - p.start),
      narration: p.text,
      background: plan.background,
      note: plan.note ?? '',
      cast: plan.cast ?? [],
      beats,
    };
  });

  const all = scenes.flatMap((s) => s.beats.map((b) => b.t)).sort((a, b) => a - b);
  let maxGap = 0;
  let gapAt = 0;
  for (let i = 1; i < all.length; i++) {
    if (all[i] - all[i - 1] > maxGap) { maxGap = all[i] - all[i - 1]; gapAt = all[i - 1]; }
  }

  writeFileSync(P.storyboard, JSON.stringify({
    note: 'Derived from narration-timing.json. Scene bounds are spoken-phrase bounds; beats are anchored to spoken keywords.',
    episode: slug,
    title: cfg.title,
    audio: `public/${P.staticAudio}`,
    fps: FPS,
    narrationDuration: timing.duration,
    beatCount: all.length,
    longestGap: r3(maxGap),
    scenes,
  }, null, 2));

  return {
    slug,
    scenes: scenes.length,
    beats: all.length,
    maxGap,
    gapAt,
  };
}
