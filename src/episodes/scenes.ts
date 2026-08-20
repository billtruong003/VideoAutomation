/**
 * scenes.ts — which drawing code belongs to which episode.
 *
 * One entry per episode, and the entry is the ONLY episode-specific code in the renderer:
 * a table of scene components plus that episode's caption highlight vocabulary. Everything
 * else — audio, timing, captions, SFX, assembly — is shared.
 *
 * Imports are static and explicit rather than globbed, because Remotion bundles with esbuild
 * and a dynamic import would defeat both bundling and type-checking.
 */

import type React from 'react';

import * as airplaneWindowHole from './airplane-window-hole/scenes';
import * as escalatorBrushes from './escalator-brushes/scenes';
import * as gasPumpShutoff from './gas-pump-shutoff/scenes';
import * as microwaveDoorMesh from './microwave-door-mesh/scenes';
import * as jeansWatchPocket from './jeans-watch-pocket/scenes';
import * as highwayLaneLines from './highway-lane-lines/scenes';
import * as fuelDoorArrow from './fuel-door-arrow/scenes';
import * as roundManholeCovers from './round-manhole-covers/scenes';
import * as penCapHole from './pen-cap-hole/scenes';
import * as oldBookSmell from './old-book-smell/scenes';

export type SceneModule = {
  /** Scene id (as in the episode's narration timing) -> the component that draws it. */
  SCENES: Record<string, React.FC>;
  /** Bare word -> palette colour, for burned-in captions. */
  HIGHLIGHTS: Record<string, string>;
};

export const SCENE_MODULES: Record<string, SceneModule> = {
  'airplane-window-hole': airplaneWindowHole,
  'escalator-brushes': escalatorBrushes,
  'gas-pump-shutoff': gasPumpShutoff,
  'microwave-door-mesh': microwaveDoorMesh,
  'jeans-watch-pocket': jeansWatchPocket,
  'highway-lane-lines': highwayLaneLines,
  'fuel-door-arrow': fuelDoorArrow,
  'round-manhole-covers': roundManholeCovers,
  'pen-cap-hole': penCapHole,
  'old-book-smell': oldBookSmell,
};
