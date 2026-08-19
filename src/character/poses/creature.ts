/**
 * creature.ts — Mochi's pose library.
 *
 * A cat loaf has no shoulders, so forcing it onto the humanoid rig would mean a pose
 * record full of joints that mean nothing. It gets its own small vocabulary instead:
 * a body tilt, an ear pair, a tail and a named leg configuration.
 *
 * The tail is doing most of the work. Mochi never speaks, so the tail is her line
 * delivery — `curl` is how tightly it wraps (tucked = scared, wrapped = content),
 * `lift` is how high it rides (up = confident), `swing` is how far it swings when the
 * renderer animates it.
 */

import type { CreaturePose } from '../types';

export const CREATURE_POSES = {
  /** The default: a bread loaf with a face. Paws tucked, tail wrapped. */
  loaf: {
    bodyScale: [1.08, 0.9],
    ears: [-4, 4],
    tail: { curl: 0.95, lift: -0.1 },
    legs: 'loaf',
  },

  stand: {
    ears: [-6, 6],
    tail: { curl: 0.25, lift: 0.6, swing: 0.15 },
    legs: 'stand',
  },

  sit: {
    bodyScale: [1.02, 0.98],
    ears: [-5, 5],
    tail: { curl: 0.7, lift: 0.1 },
    legs: 'sit',
  },

  walkA: {
    rootOffset: [0, -1],
    ears: [-8, 4],
    tail: { curl: 0.2, lift: 0.7, swing: 0.35 },
    legs: 'walkA',
  },

  walkB: {
    rootOffset: [0, 1],
    ears: [-4, 8],
    tail: { curl: 0.2, lift: 0.7, swing: -0.35 },
    legs: 'walkB',
  },

  runA: {
    bodyTilt: -8,
    bodyScale: [1.12, 0.9],
    ears: [-16, -6],
    tail: { curl: 0.05, lift: 0.9, swing: 0.5 },
    legs: 'runA',
  },

  runB: {
    bodyTilt: -8,
    bodyScale: [1.12, 0.9],
    ears: [-16, -6],
    tail: { curl: 0.05, lift: 0.85, swing: -0.5 },
    legs: 'runB',
  },

  jump: {
    rootOffset: [0, -18],
    bodyTilt: -14,
    bodyScale: [0.92, 1.14],
    ears: [-14, -4],
    tail: { curl: 0.1, lift: 1, swing: 0.2 },
    legs: 'jump',
  },

  /** Front end down, back end up. The full stretch. */
  stretch: {
    bodyTilt: 12,
    bodyScale: [1.24, 0.82],
    headOffset: [-6, 6],
    ears: [-10, 10],
    tail: { curl: 0.1, lift: 0.95 },
    legs: 'stretch',
  },

  /** Coiled, weight back, about to ruin something. */
  pounce: {
    rootOffset: [0, 4],
    bodyTilt: -4,
    bodyScale: [1.06, 0.9],
    headOffset: [4, 2],
    ears: [-18, -8],
    tail: { curl: 0.35, lift: 0.5, swing: 0.6 },
    legs: 'pounce',
  },

  /** Up on the back legs, both front paws out. Stealing. */
  stealObject: {
    rootOffset: [0, -6],
    bodyTilt: -10,
    bodyScale: [0.92, 1.12],
    headOffset: [5, -2],
    ears: [-12, -2],
    tail: { curl: 0.2, lift: 0.8, swing: 0.25 },
    legs: 'stand',
    paws: [-13, -13],
  },

  /** Head lifted, something in the mouth. The prop attaches at the face point. */
  carrying: {
    headOffset: [3, -3],
    headTilt: -5,
    ears: [-6, 6],
    tail: { curl: 0.3, lift: 0.65, swing: 0.2 },
    legs: 'stand',
  },

  /** Fully collapsed, ears down, tail wrapped tight. */
  sleep: {
    rootOffset: [0, 5],
    bodyScale: [1.2, 0.78],
    headOffset: [-8, 5],
    headTilt: 16,
    ears: [10, -10],
    tail: { curl: 1, lift: -0.3 },
    legs: 'loaf',
  },

  /** Flattened. Not visible, and knows it. */
  hide: {
    rootOffset: [0, 8],
    bodyScale: [1.22, 0.7],
    headOffset: [0, 6],
    ears: [14, -14],
    tail: { curl: 1, lift: -0.5 },
    legs: 'tuck',
  },

  /** Only the head and one paw showing, leaning in from the side. */
  peek: {
    rootOffset: [0, 4],
    bodyScale: [0.94, 1],
    headOffset: [9, -2],
    headTilt: -6,
    ears: [-8, 2],
    tail: { curl: 0.8, lift: 0 },
    legs: 'tuck',
    paws: [-6, 0],
  },

  /** Everything up: ears, tail, spine. The cartoon fright. */
  shocked: {
    rootOffset: [0, -5],
    bodyScale: [0.86, 1.2],
    headOffset: [0, -3],
    ears: [-24, 24],
    tail: { curl: 0, lift: 1.15 },
    legs: 'stand',
  },

  /** Reared, one paw swiping. */
  attack: {
    rootOffset: [0, -4],
    bodyTilt: -16,
    bodyScale: [0.9, 1.14],
    headOffset: [7, -1],
    ears: [-22, -10],
    tail: { curl: 0.15, lift: 0.95, swing: 0.7 },
    legs: 'stand',
    paws: [-18, -4],
  },

  /** Airborne and not enjoying it. */
  fall: {
    bodyTilt: 24,
    bodyScale: [1.06, 0.94],
    headOffset: [-5, -3],
    headTilt: 18,
    ears: [-20, 16],
    tail: { curl: 0.05, lift: 1.1, swing: -0.4 },
    legs: 'jump',
    paws: [-10, -10],
  },
} satisfies Record<string, CreaturePose>;

export type CreaturePoseName = keyof typeof CREATURE_POSES;
