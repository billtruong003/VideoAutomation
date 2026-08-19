#!/usr/bin/env node
/**
 * build-storyboard.mjs — turn the locked narration timing into a shot list.
 *
 *   node tools/build-storyboard.mjs
 *
 * Scene boundaries come from `phrases` in data/narration-timing.json; individual beats
 * are anchored to spoken KEYWORDS rather than to wall-clock guesses, so if the narration
 * is ever reprocessed the whole storyboard re-times itself instead of drifting.
 *
 * A beat anchor is either:
 *   { kw: 'twist', offset: 0.1 }        -> 0.1s after the word "twist" begins
 *   { scene: 'hook', at: 0.0 }          -> relative to the scene's own start
 *   { scene: 'hook', fromEnd: 0.3 }     -> before the scene ends
 *
 * Writes data/storyboard.json.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const timing = JSON.parse(readFileSync('data/narration-timing.json', 'utf8'));
const FPS = timing.fps;
const r3 = (n) => Math.round(n * 1000) / 1000;

const phraseOf = (id) => {
  const p = timing.phrases.find((x) => x.id === id);
  if (!p) throw new Error(`no phrase ${id}`);
  return p;
};
const kwOf = (id) => {
  const k = timing.keywords[id];
  if (!k) throw new Error(`no keyword ${id}`);
  return k;
};

function resolve(anchor, sceneId) {
  if (anchor.kw) return kwOf(anchor.kw).start + (anchor.offset ?? 0);
  const p = phraseOf(anchor.scene ?? sceneId);
  if (anchor.fromEnd !== undefined) return p.end - anchor.fromEnd;
  return p.start + (anchor.at ?? 0);
}

/**
 * The shot list. `action` is the visual event; `sync` records WHY it happens then, so a
 * later reader can tell an intentional keyword hit from an arbitrary time.
 */
const PLAN = {
  hook: {
    background: 'CasinoEntrance',
    note: 'No establishing shot. Casino + clock are on screen at frame 0.',
    beats: [
      { at: 0, action: 'Nib walks in mid-stride, already inside frame; wall clock visible on the back wall', sync: 'frame 0 — casino + clock readable immediately' },
      { kw: 'casinos', action: 'generic casino sign lights up above the doorway', sync: 'keyword: casinos' },
      { scene: 'hook', at: 1.55, action: 'Nib plants, looks up at the clock (lookRight -> pointing anticipation)' },
      { scene: 'hook', at: 2.45, action: 'Nib points at the clock; attention lines burst' },
      { kw: 'clock', action: 'CLOCK? gag card slams in AND the clock is violently yanked off-screen by a rope', sync: 'keyword: clock — the word and the theft land together' },
      { kw: 'clock', offset: 0.28, action: 'Nib freezes, turns deadpan to camera, question mark pops, camera punch', sync: 'reaction beat right after the yank' },
    ],
  },

  'no-accident': {
    background: 'TraditionalFloor',
    note: 'Very short comedic beat — two poses and a look.',
    beats: [
      { at: 0, action: 'manager-ish second character slides in from the right, clock hidden behind their back' },
      { kw: 'accident', action: 'manager gives an innocent smug smile; Nib turns suspicious; sweat drop', sync: 'keyword: accident' },
    ],
  },

  'time-cues': {
    background: 'TraditionalFloor',
    note: 'Cues are removed one at a time, then the room closes in.',
    beats: [
      { at: 0, action: 'enclosed traditional interior: clock on wall, window, daylight outside' },
      { kw: 'clocks-vanish', action: 'CLOCK pops out of existence with a puff', sync: 'keyword: clocks' },
      { kw: 'windows', action: 'WINDOW pops out of existence', sync: 'keyword: windows' },
      { kw: 'windows', offset: 0.75, action: 'SUN / daylight slides away off the top' },
      { scene: 'time-cues', at: 3.7, action: 'slot machines and tables slide inward from both edges, enclosing Nib' },
      { kw: 'inside', action: 'walls arrive at their tightest; Nib small and boxed in; camera punch', sync: 'keyword: inside' },
    ],
  },

  'constant-environment': {
    background: 'SlotArea',
    note: 'Dense, rapid beats. Nib presses the button on a loop throughout.',
    beats: [
      { kw: 'lights', action: 'row of ceiling lights: identical, unblinking, dead constant', sync: 'keyword: lights' },
      { kw: 'flashing', action: 'slot machine flashes hard on a 3-frame cycle', sync: 'keyword: flashing' },
      { kw: 'outside-world-1', action: 'a porthole of outside world appears and begins shrinking', sync: 'keyword: outside world' },
      { kw: 'disappears', action: 'the porthole shrinks to a dot and vanishes', sync: 'keyword: disappears' },
    ],
  },

  'time-distortion': {
    background: 'TimeDistortionVoid',
    note: 'Main comedy scene. The environment stays IDENTICAL while Nib is destroyed — that contrast is the joke.',
    beats: [
      { kw: 'twenty-minutes', action: '20 MINUTES card; Nib sitting upright and fine', sync: 'keyword: 20 minutes' },
      { kw: 'twenty-minutes', offset: 0.45, action: 'clock hands accelerate into a blur; violet time rings ripple out' },
      { kw: 'two-hours', action: '2 HOURS?! card; hard swap to exhaustedSitting — messy, tired eyes, cups, receipts, empty wallet; camera shake', sync: 'keyword: 2 hours — the reveal' },
    ],
  },

  twist: {
    background: 'ModernCasino',
    note: 'Hard interruption. The cut itself is the gag.',
    beats: [
      { at: 0, action: 'still in the dark enclosed casino; Nib mid-slump, nothing has changed yet' },
      { kw: 'twist', action: 'BUT… slams in over a record-scratch; everything freezes for 2 frames', sync: 'keyword: twist' },
      { kw: 'twist', offset: 0.3, action: 'hard cut: dark enclosed casino -> bright modern casino, wipe from the right' },
      { scene: 'twist', at: 1.5, action: 'Nib squints in the sudden daylight, shields eyes, then relaxes' },
    ],
  },

  'modern-casino': {
    background: 'ModernCasino',
    note: 'The visual opposite of the enclosed scene. Bright, open, calm.',
    beats: [
      { at: 0, action: 'Nib steps forward into the open bright floor, still blinking at the light' },
      { scene: 'modern-casino', at: 0.9, action: 'ceiling opens up; the room reads tall and airy' },
      { kw: 'daylight', action: 'big window + sun revealed; warm light sweeps across the floor', sync: 'keyword: daylight' },
      { kw: 'open-spaces', action: 'camera pulls back to reveal open floor, plant, comfortable chair', sync: 'keyword: open spaces' },
      { kw: 'clocks-modern', action: 'a clock appears ON the wall and ticks — openly, deliberately', sync: 'keyword: clocks' },
      { kw: 'comfortable', action: 'Nib sinks into the comfy chair, content, drink in hand', sync: 'keyword: comfortable' },
    ],
  },

  'myth-correction': {
    background: 'ModernCasino',
    note: 'Myth correction — the nuance the title deliberately omits.',
    beats: [
      { at: 0, action: 'Nib staggers on holding an absurdly large wall clock (holdingHeavy)' },
      { kw: 'ban', action: 'NOT BANNED stamps across the clock face', sync: 'keyword: ban' },
      { kw: 'ban', offset: 0.55, action: 'a second character strolls past behind wearing a wristwatch; Nib double-takes' },
      { scene: 'myth-correction', fromEnd: 0.15, action: 'Nib glances at the passing wristwatch, then back to camera' },
    ],
  },

  'final-idea': {
    background: 'SlotArea',
    note: 'Camera pulls back the whole scene. The wallet gag runs underneath, unnoticed.',
    beats: [
      { kw: 'trick', action: 'back to the casino floor; Nib centre, calm' },
      { kw: 'notice', action: 'chips, cards, dice and sparkles start popping in around Nib', sync: 'keyword: notice' },
      { kw: 'notice', offset: 0.3, action: 'WALLET begins floating away behind Nib — he does not react', sync: 'the long gag starts here' },
      { kw: 'immersed', action: 'distractions swarm; Nib goes dizzy-eyed; camera pushes in', sync: 'keyword: immersed' },
      { kw: 'outside-world-2', action: 'camera pulls back hard; the outside world shrinks to a tiny distant square', sync: 'keyword: outside world' },
      { kw: 'outside-world-2', offset: 1.15, action: 'the swarm thickens; the wallet drifts past the far edge of frame, still unnoticed' },
      { kw: 'outside-world-2', offset: 2.1, action: 'outside world is now a dot; Nib lit only by machine glow' },
      { kw: 'far-away', action: 'Nib turns (turningBack); the wallet is gone; horrified; hard cut', sync: 'keyword: far away — final beat' },
    ],
  },
};

const scenes = timing.phrases.map((p) => {
  const plan = PLAN[p.id];
  if (!plan) throw new Error(`No storyboard plan for scene "${p.id}"`);

  const beats = plan.beats.map((b) => {
    const t = resolve(b, p.id);
    return {
      t: r3(t),
      frame: Math.round(t * FPS),
      tInScene: r3(t - p.start),
      frameInScene: Math.round((t - p.start) * FPS),
      action: b.action,
      ...(b.sync ? { sync: b.sync } : {}),
    };
  });

  // sanity: beats must fall inside their scene (a small tail overhang is allowed)
  for (const b of beats) {
    if (b.t < p.start - 0.05 || b.t > p.end + 0.6) {
      throw new Error(`Beat at ${b.t}s escapes scene "${p.id}" (${p.start}-${p.end}): ${b.action}`);
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
    note: plan.note,
    beats,
  };
});

const storyboard = {
  note: 'Derived from data/narration-timing.json. Scene bounds are spoken-phrase bounds; beats are anchored to spoken keywords.',
  episode: '001 — Why Casinos Have No Clocks',
  audio: 'public/audio/voiceover-processed.wav',
  fps: FPS,
  narrationDuration: timing.duration,
  scenes,
};

writeFileSync('data/storyboard.json', JSON.stringify(storyboard, null, 2));

console.log(`storyboard: ${scenes.length} scenes, ${scenes.reduce((a, s) => a + s.beats.length, 0)} beats\n`);
for (const s of scenes) {
  console.log(`${s.scene.padEnd(22)} ${s.start.toFixed(2).padStart(6)} -> ${s.end.toFixed(2).padStart(6)}  (${s.duration.toFixed(2)}s, ${s.beats.length} beats)`);
  for (const b of s.beats) {
    const gap = b.tInScene.toFixed(2).padStart(6);
    console.log(`   ${gap}  ${b.action.slice(0, 92)}`);
  }
}

// pacing check: the brief wants a visual beat roughly every 0.5-2s
const all = scenes.flatMap((s) => s.beats.map((b) => b.t)).sort((a, b) => a - b);
let maxGap = 0, gapAt = 0;
for (let i = 1; i < all.length; i++) {
  if (all[i] - all[i - 1] > maxGap) { maxGap = all[i] - all[i - 1]; gapAt = all[i - 1]; }
}
console.log(`\npacing: ${all.length} beats over ${timing.duration}s, longest gap ${maxGap.toFixed(2)}s at ${gapAt.toFixed(2)}s`);
if (maxGap > 2.2) console.log('  NOTE: gap exceeds the 0.5-2s target — that scene needs a secondary action.');
