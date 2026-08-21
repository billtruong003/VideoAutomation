/**
 * batch002/index.ts — the batch, as the renderer sees it.
 *
 * Same job as `registry.ts` does for Batch 001, with one difference: the scenes are DATA.
 * Each episode contributes a timing file, a storyboard, and a spec the DSL interprets, rather
 * than a hand-written module of React components.
 *
 * Imports are static and explicit rather than globbed for the reason the older registry gives:
 * Remotion bundles with esbuild, and a dynamic import would defeat both bundling and
 * type-checking.
 */

import type { NarrationTiming } from '../../lib/clock';
import type { EpisodeSpec } from '../../scenes/dsl';
import type { Storyboard } from '../registry';

import tapeMeasureTiming from '../../../episodes/tape-measure-hook/narration-timing.json';
import tapeMeasureStory from '../../../episodes/tape-measure-hook/storyboard.json';
import { spec as tapeMeasureSpec } from './tape-measure-hook';

/** Episode ids, in intended publication order. */
export const B2_ORDER = [
  'tape-measure-hook',
] as const;

export type Batch002Id = (typeof B2_ORDER)[number];

export const B2_TIMINGS: Record<Batch002Id, NarrationTiming> = {
  'tape-measure-hook': tapeMeasureTiming as NarrationTiming,
};

export const B2_STORYBOARDS: Record<Batch002Id, Storyboard> = {
  'tape-measure-hook': tapeMeasureStory as Storyboard,
};

export const B2_SPECS: Record<Batch002Id, EpisodeSpec> = {
  'tape-measure-hook': tapeMeasureSpec,
};
