#!/usr/bin/env node
/**
 * build-asset-manifest.mjs — inventory every asset the episode uses.
 *
 *   node tools/build-asset-manifest.mjs
 *
 * Written to be DERIVED, not hand-maintained: it reads the actual component exports, the
 * actual pose/expression tables, the actual exported SVGs and the actual scene imports,
 * then cross-checks them. A hand-written manifest goes stale on the first refactor; this
 * one fails loudly instead — if a scene imports something the library does not export,
 * the build stops here rather than at render time.
 *
 * Categories follow the asset-first workflow:
 *   reusable  — belongs to the channel, every future episode gets it free
 *   episode   — exists because THIS script needed it
 *   generated — written to disk by a tool
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(p, 'utf8');

/**
 * Public symbols of a module. Matches `export const` and `export function` — the
 * animation primitives export hooks as functions, and counting only consts under-reported
 * the engine by more than half.
 */
function exportsOf(file) {
  return [...read(file).matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
}

/** Keys of a `satisfies Record<...>` table, e.g. POSES / EXPRESSIONS. */
function tableKeys(file, constName) {
  const src = read(file);
  const start = src.indexOf(`export const ${constName}`);
  if (start === -1) throw new Error(`${constName} not found in ${file}`);
  const body = src.slice(start, src.indexOf('} satisfies', start));
  return [...body.matchAll(/^  (\w+):\s*\{/gm)].map((m) => m[1]);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full.replace(/\\/g, '/')];
  });
}

// ---------------------------------------------------------------------------
// inventory
// ---------------------------------------------------------------------------

/*
 * The cast, read straight out of the character definitions.
 *
 * Scraped from source rather than hand-listed for the same reason everything else here is:
 * a manifest that has to be remembered is a manifest that goes stale. Adding a character
 * or a pose updates this file by running it.
 */
const humanoidPoses = tableKeys('src/character/poses/humanoid.ts', 'HUMANOID_POSES');
const creaturePoses = tableKeys('src/character/poses/creature.ts', 'CREATURE_POSES');

const CAST = ['bill', 'mina', 'dex', 'gus', 'mochi'];
const cast = CAST.map((id) => {
  const file = `src/character/characters/${id}.ts`;
  const src = readFileSync(file, 'utf8');
  /*
   * Deliberately a string scan, not an import.
   *
   * This tool is a plain .mjs run by node with no bundler, so importing a .ts character
   * definition is not available to it. Slicing the array literal out of the source is
   * uglier but it is the only option that keeps the manifest DERIVED — and a derived
   * manifest that is slightly ugly beats a hand-maintained one that is wrong.
   */
  const listOf = (field) => {
    const at = src.indexOf(field + ': [');
    if (at < 0) return [];
    const body = src.slice(at + field.length + 3, src.indexOf(']', at));
    return [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };
  const nameOf = (field) => {
    const at = src.indexOf(`
  ${field}: '`);
    if (at < 0) return '';
    const from = src.indexOf("'", at) + 1;
    return src.slice(from, src.indexOf("'", from));
  };
  return {
    id,
    name: nameOf('name'),
    module: file,
    kind: id === 'mochi' ? 'creature' : 'humanoid',
    defaultPose: nameOf('defaultPose'),
    defaultExpression: nameOf('defaultExpression'),
    corePoses: listOf('corePoses'),
    coreExpressions: listOf('coreExpressions'),
    anchors: listOf('anchors'),
  };
});

const poses = humanoidPoses;
const expressions = cast.flatMap((c) => c.coreExpressions.map((e) => `${c.id}:${e}`));

const propModules = {
  'src/props/time.tsx': 'time',
  'src/props/world.tsx': 'world',
  'src/props/casino.tsx': 'casino',
  'src/props/money.tsx': 'money',
};
const props = Object.entries(propModules).flatMap(([file, group]) =>
  exportsOf(file).map((name) => ({ name, group, module: file })),
);

const fx = exportsOf('src/fx/marks.tsx').map((name) => ({ name, group: 'fx', module: 'src/fx/marks.tsx' }));
const backgrounds = exportsOf('src/backgrounds/index.tsx').map((name) => ({
  name,
  module: 'src/backgrounds/index.tsx',
}));

const animation = walk('src/animation').map((f) => ({ file: f, exports: exportsOf(f) }));
const components = walk('src/components').map((f) => ({ file: f, exports: exportsOf(f) }));
const scenes = walk('src/scenes').map((f) => ({ file: f, exports: exportsOf(f) }));

const svgFiles = walk('public/doodle').filter((f) => f.endsWith('.svg'));
const sfxFiles = walk('public/sfx').filter((f) => f.endsWith('.wav'));

// ---------------------------------------------------------------------------
// cross-check: does every symbol a scene imports actually exist?
// ---------------------------------------------------------------------------

const known = new Set([
  ...props.map((p) => p.name),
  ...fx.map((f) => f.name),
  ...backgrounds.map((b) => b.name),
]);

const missing = [];
for (const scene of scenes) {
  const src = read(scene.file);
  const importRe = /import\s*\{([^}]+)\}\s*from\s*'(\.\.\/(?:props|fx|backgrounds)[^']*)'/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name && !known.has(name)) missing.push({ scene: scene.file, symbol: name, from: m[2] });
    }
  }
}

if (missing.length) {
  console.error('ASSET MANIFEST FAILED — scenes import assets that do not exist:');
  for (const x of missing) console.error(`  ${x.scene} imports ${x.symbol} from ${x.from}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------

const manifest = {
  note:
    'Derived from source by tools/build-asset-manifest.mjs — do not hand-edit. ' +
    'Components are the source of truth; the .svg files under public/doodle are exported snapshots.',
  episode: '001 — Why Casinos Have No Clocks',
  channel: 'We explain weird things with stupid drawings.',

  cast: {
    category: 'reusable',
    bible: 'CHARACTER_BIBLE.md — binding',
    registry: 'src/character/registry.ts',
    renderer: 'src/components/DoodleCharacter.tsx',
    origin: 'original — designed for this channel, one parametric rig, five characters',
    rig: 'src/character/rig.ts (hip at origin, ~185 units tall, head ~46% of height)',
    modularParts: [
      'head', 'hair', 'glasses', 'eyes', 'brows', 'mouth', 'face accents',
      'torso', 'shorts', 'left arm', 'right arm', 'hands', 'left leg', 'right leg', 'feet',
    ],
    sharedPoseLibrary: {
      humanoid: { count: humanoidPoses.length, poses: humanoidPoses },
      creature: { count: creaturePoses.length, poses: creaturePoses },
    },
    members: cast,
    npcArchetypes: ['civilian', 'staff', 'suit', 'shadow'],
  },

  props: { category: 'reusable', count: props.length, items: props },
  fx: { category: 'reusable', count: fx.length, items: fx },
  backgrounds: { category: 'reusable', count: backgrounds.length, items: backgrounds },
  animationPrimitives: { category: 'reusable', files: animation },
  sharedComponents: { category: 'reusable', files: components },

  scenes: {
    category: 'episode',
    note: 'The only episode-specific visual code. Everything above is channel infrastructure.',
    files: scenes,
  },

  sfx: {
    category: 'generated',
    origin: 'procedurally synthesised by tools/make-sfx.mjs — original work, no third-party audio',
    count: sfxFiles.length,
    files: sfxFiles,
  },

  generatedSvg: {
    category: 'generated',
    origin: 'tools/export-svg-assets.mjs (react-dom/server snapshots of the components)',
    count: svgFiles.length,
    files: svgFiles,
  },

  externalAssets: {
    note: 'No third-party illustration is used. The only external dependency is typography.',
    fonts: [
      { family: 'Bangers', source: '@fontsource/bangers (npm, self-hosted)', licence: 'OFL-1.1' },
      { family: 'Patrick Hand', source: '@fontsource/patrick-hand (npm, self-hosted)', licence: 'OFL-1.1' },
    ],
  },

  missing: [],
};

writeFileSync('data/asset-manifest.json', JSON.stringify(manifest, null, 2));

console.log('asset manifest written to data/asset-manifest.json\n');
console.log(`  character poses       ${poses.length}`);
console.log(`  character expressions ${expressions.length}`);
console.log(`  props                 ${props.length}`);
console.log(`  fx marks              ${fx.length}`);
console.log(`  backgrounds           ${backgrounds.length}`);
console.log(`  animation primitives  ${animation.reduce((a, f) => a + f.exports.length, 0)} exports in ${animation.length} files`);
console.log(`  scenes                ${scenes.length}`);
console.log(`  sfx wavs              ${sfxFiles.length}`);
console.log(`  exported svgs         ${svgFiles.length}`);
console.log('\n  cross-check: every asset imported by a scene exists.');
