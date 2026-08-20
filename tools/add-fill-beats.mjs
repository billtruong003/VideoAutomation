#!/usr/bin/env node
/**
 * add-fill-beats.mjs — one-shot: close the pacing gaps the storyboard check found.
 *
 * The first storyboard pass left 9 of 10 episodes with stretches over the 2.2s target,
 * mostly in the explanation scenes where the narration is doing the work and the picture
 * was standing still. Each entry below is an authored SECONDARY ACTION for one specific
 * gap — something that continues the mechanism already on screen. None of them are motion
 * for the sake of the metric; a beat that says nothing is worse than a still frame.
 *
 * Placement is computed rather than typed: a fill lands inside the scene that owns the gap
 * (the later beat's scene when the gap straddles a boundary, since that scene has room),
 * clamped so it can never escape its scene's bounds. That keeps the anchors keyword-derived
 * — re-process the narration and these move with everything else.
 *
 * This is not part of the build. It edits episode.json once; the beats then live there.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { config, paths, readJson, selection } from './episode.mjs';

/** slug -> ordered list of fills, one per gap the checker reported, in time order. */
const FILLS = {
  'airplane-window-hole': [
    ['the middle pane flexes a few units and settles; a small equalising puff travels through the breather hole'],
    ['the cleared view opens onto a wing and slow clouds; Bill leans in to look through it'],
    ['Bill lowers the call button and looks at the window with new respect'],
    ['the outer pane gets a tiny gold STRUCTURAL badge that Bill does not notice'],
  ],
  'escalator-brushes': [
    ['Bill edges closer to look at what Dex is doing, still not understanding it'],
    ['Bill checks his own shoelaces and tucks them in, quietly'],
    ['Dex scrubs faster, enjoying himself more; Bill watches with growing dread'],
    ['the brush bristles bend and spring back once, patient about it'],
  ],
  'fuel-door-arrow': [
    ['the top-down car rotates a few degrees so both fuel doors stay readable'],
    ['the four cars shuffle order; their fuel doors still disagree'],
    ['each car flashes its door side in turn, none of them matching'],
    ['the arrow spins once and settles, still correct'],
  ],
  'highway-lane-lines': [
    ['the perspective lines pulse; the dashes near the horizon squeeze to nothing'],
    ['Bill walks the full length of the upright line and does not reach the top'],
  ],
  'jeans-watch-pocket': [
    ['Bill tugs the small pocket open wider and peers in like it is a cave'],
    ['he tries a folded receipt; it goes in and immediately will not come out'],
    ['the wristwatch ticks smugly on his wrist while the old watch outline fades further'],
    ['the plinth gets a tiny brass rail; the pocket sits there being historic'],
  ],
  'microwave-door-mesh': [
    ['the plate inside completes a slow rotation; Bill tracks it with his eyes'],
    ['the orange wave takes a second run at the mesh and bounces again, harder'],
    ['the rebounding wave rattles around the cavity, losing energy'],
    ['the glasses slip a few units further down the door and stay crooked'],
  ],
  'old-book-smell': [
    ['the scent curls thicken; a single page corner flakes away and drifts down'],
    ['the molecule marks rise past the labelled layers, gathering into a cloud'],
    ['the three dimmed scent icons drift quietly behind the vanillin one'],
    ['the readout needle settles and holds; the jar clouds slightly'],
    ['dust drifts down through the shelf light behind Bill'],
    ['Mochi sits down beside the book and stares at it, deciding'],
  ],
  'pen-cap-hole': [
    ['Bill stops turning the cap and holds it still, looking at the hole properly'],
    ['the cross-section rotates slowly so the vent channel reads end to end'],
    ['the cap settles a fraction deeper; the tube outline pulses once'],
    ['Gus squares the document edge with one finger before leaving'],
    ['the pen cap turns a half rotation more, catching the light on the vent'],
  ],
  'round-manhole-covers': [
    ['Bill shifts his weight; the cover does not move at all, which is the point'],
    ['Dex peers into the shaft and drops a pebble in; a long pause, then a distant plink'],
    ['the cover rolls a little further and leans against a kerb'],
    ['the four problem tickets shuffle into a neat stack'],
  ],
};

const r3 = (n) => Math.round(n * 1000) / 1000;
const { slugs } = selection();

for (const slug of slugs) {
  const fills = FILLS[slug];
  if (!fills || !fills.length) { console.log(`[${slug}] no fills`); continue; }

  const P = paths(slug);
  const cfg = config(slug);
  const timing = readJson(P.timing);
  const sb = readJson(P.storyboard);

  const phraseOf = (id) => timing.phrases.find((p) => p.id === id);

  // Recompute the gaps exactly as the checker does, so the Nth fill matches the Nth gap.
  const beats = sb.scenes
    .flatMap((s) => s.beats.map((b) => ({ t: b.t, scene: s.scene })))
    .sort((a, b) => a.t - b.t);

  const gaps = [];
  for (let i = 1; i < beats.length; i++) {
    const g = beats[i].t - beats[i - 1].t;
    if (g > 2.2) gaps.push({ before: beats[i - 1], after: beats[i], g });
  }

  if (gaps.length !== fills.length) {
    console.error(`[${slug}] ${gaps.length} gaps but ${fills.length} fills authored — skipping`);
    continue;
  }

  const added = [];
  gaps.forEach((gap, i) => {
    // The later beat's scene has room by definition; the earlier one may be ending.
    const sceneId = gap.before.scene === gap.after.scene ? gap.before.scene : gap.after.scene;
    const ph = phraseOf(sceneId);
    const mid = (gap.before.t + gap.after.t) / 2;
    // Never let a fill escape its scene — the storyboard treats that as a hard error.
    const t = Math.min(Math.max(mid, ph.start + 0.05), ph.end - 0.05);
    added.push({ sceneId, at: r3(t - ph.start), action: fills[i][0] });
  });

  for (const a of added) {
    const scene = cfg.scenes.find((s) => s.id === a.sceneId);
    scene.beats.push({ at: a.at, action: a.action, sync: 'secondary action — closes a pacing gap' });
    // Keep the plan readable in time order.
    scene.beats.sort((x, y) => (x.kw ? 1 : 0) - (y.kw ? 1 : 0) || (x.at ?? 0) - (y.at ?? 0));
  }

  writeFileSync(P.config, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`[${slug}] +${added.length} fill beats`);
}
