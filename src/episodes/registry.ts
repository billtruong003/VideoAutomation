/**
 * registry.ts — the batch, as the renderer sees it.
 *
 * Ten episodes compile into one Remotion bundle. Everything that differs between them is
 * DATA imported here — the locked narration timing and the storyboard — plus one scene
 * module per episode. Nothing else in `src/` knows an episode exists.
 *
 * The imports are static and explicit rather than globbed, because Remotion bundles with
 * esbuild and a dynamic import would defeat both bundling and type-checking. Adding an
 * episode is three lines in this file and one scene module; that is the whole cost.
 */

import { makeClock, type Clock, type NarrationTiming } from '../lib/clock';

import airplaneTiming from '../../episodes/airplane-window-hole/narration-timing.json';
import escalatorTiming from '../../episodes/escalator-brushes/narration-timing.json';
import gasPumpTiming from '../../episodes/gas-pump-shutoff/narration-timing.json';
import microwaveTiming from '../../episodes/microwave-door-mesh/narration-timing.json';
import jeansTiming from '../../episodes/jeans-watch-pocket/narration-timing.json';
import highwayTiming from '../../episodes/highway-lane-lines/narration-timing.json';
import fuelTiming from '../../episodes/fuel-door-arrow/narration-timing.json';
import manholeTiming from '../../episodes/round-manhole-covers/narration-timing.json';
import penCapTiming from '../../episodes/pen-cap-hole/narration-timing.json';
import bookTiming from '../../episodes/old-book-smell/narration-timing.json';

import airplaneStory from '../../episodes/airplane-window-hole/storyboard.json';
import escalatorStory from '../../episodes/escalator-brushes/storyboard.json';
import gasPumpStory from '../../episodes/gas-pump-shutoff/storyboard.json';
import microwaveStory from '../../episodes/microwave-door-mesh/storyboard.json';
import jeansStory from '../../episodes/jeans-watch-pocket/storyboard.json';
import highwayStory from '../../episodes/highway-lane-lines/storyboard.json';
import fuelStory from '../../episodes/fuel-door-arrow/storyboard.json';
import manholeStory from '../../episodes/round-manhole-covers/storyboard.json';
import penCapStory from '../../episodes/pen-cap-hole/storyboard.json';
import bookStory from '../../episodes/old-book-smell/storyboard.json';

export type Storyboard = {
  episode: string;
  title: string;
  fps: number;
  scenes: {
    scene: string;
    start: number;
    end: number;
    background: string;
    note: string;
    beats: { t: number; frame: number; tInScene: number; action: string; sync?: string }[];
  }[];
};

/** Episode ids, in channel publication order. */
export const EPISODE_ORDER = [
  'airplane-window-hole',
  'escalator-brushes',
  'gas-pump-shutoff',
  'microwave-door-mesh',
  'jeans-watch-pocket',
  'highway-lane-lines',
  'fuel-door-arrow',
  'round-manhole-covers',
  'pen-cap-hole',
  'old-book-smell',
] as const;

export type EpisodeId = (typeof EPISODE_ORDER)[number];

const TIMINGS: Record<EpisodeId, NarrationTiming> = {
  'airplane-window-hole': airplaneTiming as NarrationTiming,
  'escalator-brushes': escalatorTiming as NarrationTiming,
  'gas-pump-shutoff': gasPumpTiming as NarrationTiming,
  'microwave-door-mesh': microwaveTiming as NarrationTiming,
  'jeans-watch-pocket': jeansTiming as NarrationTiming,
  'highway-lane-lines': highwayTiming as NarrationTiming,
  'fuel-door-arrow': fuelTiming as NarrationTiming,
  'round-manhole-covers': manholeTiming as NarrationTiming,
  'pen-cap-hole': penCapTiming as NarrationTiming,
  'old-book-smell': bookTiming as NarrationTiming,
};

export const STORYBOARDS: Record<EpisodeId, Storyboard> = {
  'airplane-window-hole': airplaneStory as Storyboard,
  'escalator-brushes': escalatorStory as Storyboard,
  'gas-pump-shutoff': gasPumpStory as Storyboard,
  'microwave-door-mesh': microwaveStory as Storyboard,
  'jeans-watch-pocket': jeansStory as Storyboard,
  'highway-lane-lines': highwayStory as Storyboard,
  'fuel-door-arrow': fuelStory as Storyboard,
  'round-manhole-covers': manholeStory as Storyboard,
  'pen-cap-hole': penCapStory as Storyboard,
  'old-book-smell': bookStory as Storyboard,
};

/**
 * Clocks are built once at module load and shared.
 *
 * Not per-render: `makeClock` walks the phrase table to build scene spans, and a scene
 * component asking for `kwIn` on every frame would redo that 30 times a second for no
 * reason. The clock is derived from a locked file and cannot change mid-render.
 */
const CLOCKS: Record<string, Clock> = Object.fromEntries(
  EPISODE_ORDER.map((id) => [id, makeClock(TIMINGS[id])]),
);

export function clockFor(id: EpisodeId): Clock {
  const c = CLOCKS[id];
  if (!c) throw new Error(`no clock for episode "${id}"`);
  return c;
}

/** The composition id Remotion registers for an episode. */
export const compositionId = (id: EpisodeId): string =>
  id.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
