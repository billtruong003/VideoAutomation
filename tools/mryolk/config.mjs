/**
 * config.mjs — the fixed facts of the Mr.Yolk long-form production.
 *
 * Sheet identity is pinned to a FILENAME here rather than discovered by globbing the source
 * directory, because the supplied names ("ChatGPT Image 10_43_57 21 thg 8, 2026.png") carry
 * no meaning and sort by capture time, so a re-run against a directory someone has since
 * added to would silently renumber every asset id in the registry and invalidate every scene
 * that referenced one. Pinning makes adding a sheet an explicit edit.
 */

import { join } from 'node:path';

export const SOURCE_DIR = 'C:\\Users\\ducnq\\Downloads\\Src';

export const ASSET_DIR = join('public', 'mryolk', 'assets');
export const STOCK_DIR = join('public', 'mryolk', 'stock');
export const AUDIO_DIR = join('public', 'mryolk', 'audio');
export const SFX_DIR = join('public', 'mryolk', 'sfx');
export const DATA_DIR = join('data', 'mryolk');
export const QA_DIR = join('qa', 'mryolk');

/** Narration sections, in the order they are spoken. */
export const NARRATION_PARTS = ['Debt-1.mp3', 'Debt-2.mp3', 'Debt-3.mp3'];

/**
 * The supplied art. Every sheet is a 6x6 grid at 1254x1254; the row/col counts are declared
 * so the extractor can report a MISMATCH against what it measures instead of trusting either
 * number on its own.
 */
export const SHEETS = [
  { id: 'emote-a', file: 'ChatGPT Image 09_39_58 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'core facial expressions' },
  { id: 'emote-b', file: 'ChatGPT Image 09_46_58 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'body-language reactions' },
  { id: 'action', file: 'ChatGPT Image 09_53_35 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'narrative actions and costumes' },
  { id: 'finance-a', file: 'ChatGPT Image 10_43_57 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'character with finance props' },
  { id: 'finance-b', file: 'ChatGPT Image 10_45_48 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'bonds, leverage, crisis' },
  { id: 'props', file: 'ChatGPT Image 10_47_23 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'standalone finance objects' },
  { id: 'props-dup', file: 'ChatGPT Image 10_49_44 21 thg 8, 2026.png', rows: 6, cols: 6, theme: 'byte-identical re-export of props' },
];

/** Delivery spec. YouTube long-form, and the frame rate the whole pipeline agrees on. */
export const VIDEO = { width: 1920, height: 1080, fps: 30 };

/** Hold after the last spoken word, so the closing gag lands before the cut. */
export const TAIL_HOLD_SECONDS = 2.2;
