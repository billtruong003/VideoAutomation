/**
 * motion.ts — personality as parameters over the existing animation primitives.
 *
 * There is no per-character animation engine and there must not be one. Bill hesitating,
 * Gus barely moving and Dex overshooting are all the same `wobble`, the same
 * `usePoseSwap` and the same `useIdleLook` fed different numbers from that character's
 * `MotionPersonality`. Five engines would be five things to keep in sync; one engine with
 * five parameter sets is one thing.
 *
 * The numbers themselves live on the character definition, next to their palette and
 * their anchors, because how someone moves is part of who they are.
 */

import { hashString, rand01 } from '../lib/rand';
import type { CharacterDef, GazeName, MotionPersonality } from './types';

// ---------------------------------------------------------------------------
// blink
// ---------------------------------------------------------------------------

/** How long a blink lasts, in frames. Three at 30fps: fast enough to read as involuntary. */
const BLINK_FRAMES = 3;

/**
 * Whether this character's eyes are shut on this frame, as 0..1.
 *
 * Blinks are scheduled from a hash of the slot index rather than a timer, so they are
 * deterministic across out-of-order parallel frame renders — the same requirement that
 * governs everything else in this codebase. The jitter is what stops two characters in
 * one shot from blinking in unison, which reads as a glitch rather than as life.
 */
export function blinkAt(frame: number, motion: MotionPersonality, seed: string): number {
  const period = motion.blinkEvery;
  const slot = Math.floor(frame / period);
  const jitter = Math.floor(rand01(hashString(`${seed}:blink:${slot}`)) * (period - BLINK_FRAMES));
  const start = slot * period + jitter;
  const since = frame - start;
  if (since < 0 || since >= BLINK_FRAMES) return 0;
  // ease in and out so the lid does not pop
  return Math.sin((since / BLINK_FRAMES) * Math.PI);
}

// ---------------------------------------------------------------------------
// gaze
// ---------------------------------------------------------------------------

const GAZE_TARGETS: Record<GazeName, [number, number]> = {
  center: [0, 0],
  camera: [0, 0],
  left: [-0.7, 0],
  right: [0.7, 0],
  up: [0, -0.6],
  down: [0, 0.55],
  away: [-0.55, -0.3],
};

export const gazeVector = (g: GazeName | [number, number]): [number, number] =>
  Array.isArray(g) ? g : GAZE_TARGETS[g];

/**
 * Idle glancing.
 *
 * Eyes driven by smooth noise look drugged; real eyes hold a target and then flick. This
 * holds for `gazeHold` frames and snaps, and `gazeHold` is a personality number — Gus
 * stares for a second and a half, Dex re-aims three times in the same span.
 */
export function idleGaze(frame: number, motion: MotionPersonality, seed: string): [number, number] {
  const slot = Math.floor(frame / motion.gazeHold);
  const h = hashString(`${seed}:gaze:${slot}`);
  const range = 0.45 * motion.gestureScale;
  return [(rand01(h) * 2 - 1) * range, (rand01(h + 991) * 2 - 1) * range * 0.5];
}

// ---------------------------------------------------------------------------
// timing
// ---------------------------------------------------------------------------

/**
 * Shift a beat by this character's hesitation.
 *
 * Bill reacts three frames after the thing happens; Dex reacts on the frame; Gus reacts
 * six frames later and smaller. Scene code writes the beat once, at the moment the EVENT
 * happens, and lets each character arrive in their own time.
 */
export const reactAt = (beat: number, c: CharacterDef): number => beat + c.motion.reactionDelay;

/** This character's preferred pose quantisation, for `usePoseSwap`'s `step`. */
export const holdStepOf = (c: CharacterDef): number => c.motion.holdStep;

// ---------------------------------------------------------------------------
// talking
// ---------------------------------------------------------------------------

const TALK_CYCLE = ['talkSmall', 'talkMedium', 'talkClosed', 'talkWide', 'talkMedium', 'talkSmall'] as const;

/**
 * A talking mouth for this frame, or undefined when the character is not speaking.
 *
 * Deliberately not lip sync. The cycle is walked on twos with a per-character phase, which
 * at Shorts length is indistinguishable from real mouth articulation and costs nothing —
 * and unlike phoneme mapping it cannot desync when the audio is reprocessed.
 */
export function talkFrame(frame: number, seed: string, stepFrames = 2) {
  const i = Math.floor(frame / stepFrames) + (hashString(seed) % TALK_CYCLE.length);
  return TALK_CYCLE[i % TALK_CYCLE.length];
}
