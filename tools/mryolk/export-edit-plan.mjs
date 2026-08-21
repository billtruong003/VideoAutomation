#!/usr/bin/env node
/**
 * export-edit-plan.mjs — the edit plan, as a machine-readable artifact.
 *
 *   node tools/mryolk/export-edit-plan.mjs
 *
 * DERIVED, never authored. The edit itself lives in `src/mryolk/scenes/index.ts` and the SFX
 * cue sheet in `src/mryolk/Sfx.tsx`; this reads those and emits JSON. A hand-written plan
 * document would be a second source of truth, and the moment a scene boundary moved it would
 * start describing a video that no longer exists — which is worse than having no plan at all,
 * because it looks authoritative.
 *
 * Beats are the transcript SEGMENTS, since that is the granularity the edit actually cuts at:
 * every scene is a range of them and every visual inside a scene is anchored to a word within
 * one. Reporting a different beat granularity here would be inventing a number.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, VIDEO, TAIL_HOLD_SECONDS } from './config.mjs';

const read = (p) => readFileSync(p, 'utf8');
const segments = JSON.parse(read(join(DATA_DIR, 'stt', 'segments.json')));
const audio = JSON.parse(read(join(DATA_DIR, 'audio-report.json')));
const transcript = JSON.parse(read(join(DATA_DIR, 'stt', 'transcript.json')));
const registry = JSON.parse(read(join(DATA_DIR, 'asset-registry.json')));
const provenance = JSON.parse(read(join(DATA_DIR, 'stock-provenance.json')));

/**
 * Pull the scene table out of the TypeScript source.
 *
 * Parsed rather than imported because this is a plain Node script and the table lives in a
 * `.tsx` module graph that pulls in React, Remotion and every scene component. The regex is
 * narrow and asserts its own result: if the file is reshaped and the parse yields a different
 * number of scenes than the file contains `{ id:` entries, it fails instead of exporting a
 * partial plan.
 */
function readScenes() {
  const src = read(join('src', 'mryolk', 'scenes', 'index.ts'));
  const block = /export const SCENES: SceneDef\[\] = \[([\s\S]*?)\n\];/.exec(src);
  if (!block) throw new Error('could not find SCENES in src/mryolk/scenes/index.ts');

  const out = [];
  const re = /\{\s*id:\s*'([^']+)',\s*chapter:\s*'((?:[^'\\]|\\.)*)',\s*from:\s*(\d+),\s*to:\s*(\d+),\s*component:\s*(\w+)(?:,\s*card:\s*\{\s*title:\s*'((?:[^'\\]|\\.)*)'(?:,\s*sub:\s*'((?:[^'\\]|\\.)*)')?\s*\})?\s*\}/g;
  let m;
  while ((m = re.exec(block[1])) !== null) {
    out.push({
      id: m[1],
      chapter: m[2].replace(/\\'/g, "'"),
      from: Number(m[3]),
      to: Number(m[4]),
      component: m[5],
      card: m[6] ? { title: m[6].replace(/\\'/g, "'"), sub: m[7] ?? null } : null,
    });
  }
  const declared = (block[1].match(/\{\s*id:/g) ?? []).length;
  if (out.length !== declared) {
    throw new Error(`parsed ${out.length} scenes but the table declares ${declared}`);
  }
  return out;
}

/** Cue sheet, read the same way and for the same reason. */
function readCues() {
  const src = read(join('src', 'mryolk', 'Sfx.tsx'));
  const re = /\{\s*at:\s*W\((\d+),\s*(\d+),\s*'([^']+)'(?:,\s*(\d+))?(?:,\s*(-?[\d.]+))?\),\s*sound:\s*'(\w+)'(?:,\s*gain:\s*([\d.]+))?,\s*note:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const seg = segments[Number(m[1])];
    out.push({
      segment: Number(m[1]),
      anchorWord: m[3],
      occurrence: m[4] ? Number(m[4]) : 1,
      sound: m[6],
      gain: m[7] ? Number(m[7]) : null,
      note: m[8].replace(/\\'/g, "'"),
      approxSeconds: seg ? Number(seg.start.toFixed(2)) : null,
    });
  }
  return out;
}

const scenes = readScenes();
const cues = readCues();

const duration = audio.master.processedSeconds;
const totalFrames = Math.ceil((duration + TAIL_HOLD_SECONDS) * VIDEO.fps);

/**
 * Which visual registers a scene uses.
 *
 * Detected from the components a scene file imports, so it reports what the scene actually
 * does rather than what its author intended when they wrote the table.
 */
function visualModes(componentFile) {
  const src = read(componentFile);
  const modes = [];
  if (/<Yolk|<YolkHero/.test(src)) modes.push('yolk');
  if (/<StockPlate|<StockWindow/.test(src)) modes.push('stock');
  if (/<Node|<Arrow|<BalanceSheet|<Timeline|<LineGraph|<NetworkGraph|<MoneyToken/.test(src)) modes.push('diagram');
  if (/<HeroWord|<Figure/.test(src)) modes.push('kinetic-text');
  return modes;
}

const SCENE_FILES = {
  ch01: 'ch01-disappearance', ch02: 'ch02-time-machine', ch03: 'ch03-waiting',
  ch04: 'ch04-banks', ch05: 'ch05-who-lends', ch06: 'ch06-bonds',
  ch07: 'ch07-sustainability', ch08: 'ch08-productive', ch09: 'ch09-leverage',
  ch10: 'ch10-trust', ch11: 'ch11-crisis', ch12: 'ch12-2008',
  ch13: 'ch13-no-debt', ch14: 'ch14-recession', ch15: 'ch15-war',
  ch16: 'ch16-who', ch17: 'ch17-network',
};

const resolved = scenes.map((s, i) => {
  const next = scenes[i + 1];
  const start = segments[s.from].start;
  const end = next ? segments[next.from].start : duration + TAIL_HOLD_SECONDS;
  const file = join('src', 'mryolk', 'scenes', `${SCENE_FILES[s.id]}.tsx`);
  const beats = segments.slice(s.from, s.to + 1).map((seg) => ({
    beatId: `${s.id}-s${seg.index}`,
    segment: seg.index,
    start: Number(seg.start.toFixed(3)),
    end: Number(seg.end.toFixed(3)),
    durationSeconds: Number((seg.end - seg.start).toFixed(3)),
    spokenText: seg.text,
    wordCount: seg.wordCount,
  }));
  return {
    sceneId: s.id,
    chapter: s.chapter,
    chapterCard: s.card,
    source: file,
    segments: { from: s.from, to: s.to, count: s.to - s.from + 1 },
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    durationSeconds: Number((end - start).toFixed(3)),
    frames: { from: Math.round(start * VIDEO.fps), count: Math.round((end - start) * VIDEO.fps) },
    visualModes: visualModes(file),
    sfxCues: cues.filter((c) => c.segment >= s.from && c.segment <= s.to).length,
    beats,
  };
});

const allBeats = resolved.flatMap((s) => s.beats);
const modeCounts = resolved.flatMap((s) => s.visualModes).reduce((a, m) => {
  a[m] = (a[m] ?? 0) + 1;
  return a;
}, {});

const plan = {
  version: 1,
  generatedFrom: [
    'src/mryolk/scenes/index.ts',
    'src/mryolk/Sfx.tsx',
    'data/mryolk/stt/segments.json',
    'data/mryolk/audio-report.json',
  ],
  title: 'Why The Entire World Runs On Debt',
  channel: 'Mr.Yolk',
  composition: {
    id: 'MrYolkDebt',
    width: VIDEO.width,
    height: VIDEO.height,
    fps: VIDEO.fps,
    durationInFrames: totalFrames,
    durationSeconds: Number(((duration + TAIL_HOLD_SECONDS)).toFixed(3)),
  },
  narration: {
    master: 'public/mryolk/audio/narration-master.wav',
    rawSeconds: audio.master.rawTotalSeconds,
    processedSeconds: duration,
    reductionPercent: audio.master.reductionPercent,
    integratedLufs: audio.master.integratedLufs,
    truePeakDb: audio.master.truePeakDb,
    tempo: audio.settings.tempo,
    words: transcript.wordCount,
    subtitleCues: transcript.cueCount,
  },
  summary: {
    chapters: resolved.length,
    beats: allBeats.length,
    averageBeatSeconds: Number(
      (allBeats.reduce((n, b) => n + b.durationSeconds, 0) / allBeats.length).toFixed(2),
    ),
    shortestBeatSeconds: Number(Math.min(...allBeats.map((b) => b.durationSeconds)).toFixed(2)),
    longestBeatSeconds: Number(Math.max(...allBeats.map((b) => b.durationSeconds)).toFixed(2)),
    visualModeUsage: modeCounts,
    sfxCues: cues.length,
    yolkAssetsAvailable: registry.counts.assets,
    stockAssetsAvailable: provenance.assets.length,
  },
  scenes: resolved,
  sfx: cues,
};

/**
 * No stock clip may be on screen for longer than the proxy that backs it.
 *
 * The renderer plays each clip straight through — it does not loop — so a beat that outlasts
 * its footage would freeze on its last frame under continuing narration.
 *
 * The bound is `MAX_STOCK_EXPOSURE`, not the scene length. A scene is not the right measure:
 * chapter 6 runs 77 seconds and its establishing plate is on screen for six of them, so
 * gating on scene duration would demand 77-second proxies to protect a six-second shot.
 * The real worst case in this edit is chapter 3, where four windows are mounted together for
 * about sixteen seconds, and that is what the number below records.
 */
const MAX_STOCK_EXPOSURE = 20;

function assertCoverage() {
  const proxies = JSON.parse(readFileSync(join(DATA_DIR, 'stock-proxies.json'), 'utf8'));
  const durations = Object.values(proxies.proxies).map((p) => p.durationSeconds);
  const shortest = Math.min(...durations);

  if (shortest < MAX_STOCK_EXPOSURE) {
    throw new Error(
      `the shortest stock proxy is ${shortest.toFixed(1)}s but a clip may be on screen for up `
      + `to ${MAX_STOCK_EXPOSURE}s. Raise PROXY_SECONDS in tools/mryolk/make-proxies.mjs and `
      + 're-run it, or that clip will freeze on its last frame.',
    );
  }

  const stockScenes = resolved.filter((s) => s.visualModes.includes('stock'));
  return {
    maxExposureSeconds: MAX_STOCK_EXPOSURE,
    shortestProxySeconds: shortest,
    headroomSeconds: Number((shortest - MAX_STOCK_EXPOSURE).toFixed(2)),
    scenesUsingStock: stockScenes.map((s) => s.sceneId),
  };
}

plan.summary.stockCoverage = assertCoverage();

writeFileSync(join(DATA_DIR, 'edit-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);

console.log(`chapters   ${plan.summary.chapters}`);
console.log(`beats      ${plan.summary.beats}`);
console.log(`avg beat   ${plan.summary.averageBeatSeconds}s  (${plan.summary.shortestBeatSeconds}-${plan.summary.longestBeatSeconds}s)`);
console.log(`sfx cues   ${plan.summary.sfxCues}`);
console.log(`modes      ${JSON.stringify(plan.summary.visualModeUsage)}`);
console.log(`frames     ${totalFrames} @ ${VIDEO.fps}fps  (${plan.composition.durationSeconds}s)`);
console.log(`→ ${join(DATA_DIR, 'edit-plan.json')}`);
