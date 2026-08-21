/**
 * index.ts — the edit, as a table.
 *
 * This IS the edit plan. It is not a document describing one; there is no second artifact to
 * drift out of sync, because `tools/mryolk/export-edit-plan.mjs` reads exactly this and emits
 * the JSON deliverable from it.
 *
 * Scenes are addressed by SEGMENT INDEX rather than by timestamp. A segment index means "the
 * sentence beginning 'Leverage sounds complicated'" and stays true if the narration is
 * re-conditioned; a timestamp means 6:50.4 and stops being true the moment anything upstream
 * changes by a frame. The `end` of each scene is taken from the START of the next scene's
 * first segment, so the timeline is gapless by construction rather than by arithmetic anyone
 * has to keep correct by hand.
 */

import type React from 'react';
import { SEGMENTS, AUDIO_DURATION, TAIL_HOLD } from '../clock';

import { Ch01Disappearance } from './ch01-disappearance';
import { Ch02TimeMachine } from './ch02-time-machine';
import { Ch03WaitingIsExpensive } from './ch03-waiting';
import { Ch04BanksCreateMoney } from './ch04-banks';
import { Ch05WhoLends } from './ch05-who-lends';
import { Ch06GovernmentBonds } from './ch06-bonds';
import { Ch07CanItHandleIt } from './ch07-sustainability';
import { Ch08ProductiveOrStupid } from './ch08-productive';
import { Ch09Leverage } from './ch09-leverage';
import { Ch10Trust } from './ch10-trust';
import { Ch11CreditCrisis } from './ch11-crisis';
import { Ch12Crisis2008 } from './ch12-2008';
import { Ch13WhyNotRemoveIt } from './ch13-no-debt';
import { Ch14Recession } from './ch14-recession';
import { Ch15WarAndPower } from './ch15-war';
import { Ch16WhoDoWeOwe } from './ch16-who';
import { Ch17NetworkOfPromises } from './ch17-network';

export type SceneDef = {
  id: string;
  chapter: string;
  /** Inclusive transcript segment range this scene covers. */
  from: number;
  to: number;
  component: React.FC;
  /** Show a chapter card at the top of this scene. Used at a handful of real turning points. */
  card?: { title: string; sub?: string };
};

export const SCENES: SceneDef[] = [
  { id: 'ch01', chapter: 'What if all debt disappeared?', from: 0, to: 22, component: Ch01Disappearance },
  { id: 'ch02', chapter: 'Debt is a time machine', from: 23, to: 39, component: Ch02TimeMachine, card: { title: 'A time machine for money' } },
  { id: 'ch03', chapter: 'Waiting is expensive', from: 40, to: 60, component: Ch03WaitingIsExpensive },
  { id: 'ch04', chapter: 'Banks create money', from: 61, to: 79, component: Ch04BanksCreateMoney, card: { title: 'Where the money comes from' } },
  { id: 'ch05', chapter: 'Who lends to whom?', from: 80, to: 90, component: Ch05WhoLends },
  { id: 'ch06', chapter: 'Government debt', from: 91, to: 123, component: Ch06GovernmentBonds, card: { title: 'Government debt', sub: 'the very official I.O.U.' } },
  { id: 'ch07', chapter: 'Can it handle it?', from: 124, to: 139, component: Ch07CanItHandleIt },
  { id: 'ch08', chapter: 'Productive or stupid', from: 140, to: 143, component: Ch08ProductiveOrStupid },
  { id: 'ch09', chapter: 'Leverage', from: 144, to: 167, component: Ch09Leverage, card: { title: 'Leverage' } },
  { id: 'ch10', chapter: 'Trust', from: 168, to: 181, component: Ch10Trust, card: { title: 'Trust' } },
  { id: 'ch11', chapter: 'When credit breaks', from: 182, to: 193, component: Ch11CreditCrisis },
  { id: 'ch12', chapter: '2008', from: 194, to: 209, component: Ch12Crisis2008, card: { title: '2008' } },
  { id: 'ch13', chapter: 'Why not remove debt?', from: 210, to: 222, component: Ch13WhyNotRemoveIt, card: { title: 'So why not get rid of it?' } },
  { id: 'ch14', chapter: 'Recessions', from: 223, to: 235, component: Ch14Recession },
  { id: 'ch15', chapter: 'War and state power', from: 236, to: 243, component: Ch15WarAndPower },
  { id: 'ch16', chapter: 'Who do we actually owe?', from: 244, to: 259, component: Ch16WhoDoWeOwe, card: { title: 'So who do we owe?' } },
  { id: 'ch17', chapter: 'A network of promises', from: 260, to: 272, component: Ch17NetworkOfPromises },
];

/**
 * Resolved timing for every scene.
 *
 * Validated rather than assumed: a scene whose range overlaps its neighbour, or leaves a hole
 * between them, is a bug that shows up as a frame of blank white in the middle of a render —
 * cheap to catch here, expensive to notice at minute nine.
 */
export function resolveScenes(): (SceneDef & { start: number; end: number })[] {
  const out = SCENES.map((s, i) => {
    const next = SCENES[i + 1];
    return {
      ...s,
      start: SEGMENTS[s.from].start,
      end: next ? SEGMENTS[next.from].start : AUDIO_DURATION + TAIL_HOLD,
    };
  });

  for (let i = 0; i < out.length; i++) {
    if (out[i].to < out[i].from) throw new Error(`${out[i].id}: segment range is inverted`);
    const next = SCENES[i + 1];
    if (next && next.from !== out[i].to + 1) {
      throw new Error(
        `${out[i].id} covers segments ${out[i].from}..${out[i].to} but ${next.id} starts at ${next.from} — `
        + 'every transcript segment must belong to exactly one scene',
      );
    }
  }
  if (SCENES[0].from !== 0) throw new Error('the edit must start at segment 0');
  if (SCENES[SCENES.length - 1].to !== SEGMENTS.length - 1) {
    throw new Error(`the edit must cover the last segment (${SEGMENTS.length - 1})`);
  }
  return out;
}
