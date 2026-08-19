#!/usr/bin/env node
/**
 * render-qa-stills.mjs — render the frames that matter, for visual inspection.
 *
 *   node tools/render-qa-stills.mjs
 *
 * Frames are computed from the narration keywords rather than typed in, so the QA set
 * always lands on the actual beat even if the audio is reprocessed. This is the cheap
 * half of visual QA: composition, safe zones, clipping and readability are all decidable
 * from stills, and stills cost seconds where a preview render costs minutes.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';

const timing = JSON.parse(readFileSync('data/narration-timing.json', 'utf8'));
const FPS = timing.fps;
const kw = (id) => {
  const k = timing.keywords[id];
  if (!k) throw new Error(`no keyword ${id}`);
  return k.start;
};

/** [output name, absolute seconds, what we are checking] */
const SHOTS = [
  ['10-hook-open', 0.7, 'opening hook — casino + clock legible immediately'],
  ['11-hook-point', kw('clock') - 0.9, 'Nib points at the clock'],
  ['12-clock-removal', kw('clock') + 0.22, 'clock yanked + CLOCK? card'],
  ['13-deadpan', kw('clock') + 0.55, 'deadpan to camera + question mark'],
  ['14-no-accident', kw('accident') + 0.15, 'culprit hides the clock, Nib suspicious'],
  ['15-cues-vanish', kw('windows') + 0.2, 'window being removed'],
  ['16-enclosed', kw('inside'), 'enclosed casino, Nib boxed in'],
  ['17-flashing', kw('flashing') + 0.2, 'machines flashing, lights constant'],
  ['18-20-minutes', kw('twenty-minutes') + 0.25, '20 MINUTES'],
  ['19-2-hours', kw('two-hours') + 0.3, '2 HOURS?! reveal'],
  ['20-twist', kw('twist') + 0.15, 'BUT... hard interrupt'],
  ['21-modern-casino', kw('daylight') + 0.5, 'bright modern casino, daylight'],
  ['22-modern-clock', kw('clocks-modern') + 0.4, 'a clock, openly on the wall'],
  ['23-not-banned', kw('ban') + 0.45, 'NOT BANNED'],
  ['24-immersed', kw('immersed') + 0.5, 'distraction swarm'],
  ['25-world-tiny', kw('outside-world-2') + 1.4, 'outside world shrinking away'],
  ['26-wallet-gag', kw('far-away') + 0.45, 'final wallet gag — horrified'],
];

mkdirSync('qa', { recursive: true });

console.log('rendering QA stills\n');
for (const [name, seconds, why] of SHOTS) {
  const frame = Math.round(seconds * FPS);
  const out = `qa/${name}.png`;
  const r = spawnSync(
    'npx',
    ['remotion', 'still', 'CasinoClocks', out, `--frame=${frame}`],
    { encoding: 'utf8', shell: true, maxBuffer: 1 << 26 },
  );
  const ok = r.status === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${out.padEnd(30)} f${String(frame).padStart(4)} @ ${seconds.toFixed(2)}s  ${why}`);
  if (!ok) {
    const log = `${r.stdout || ''}${r.stderr || ''}`;
    console.error(log.split('\n').slice(-18).join('\n'));
    process.exit(1);
  }
}
console.log(`\n${SHOTS.length} stills written to qa/`);
