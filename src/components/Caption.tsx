/**
 * Caption.tsx — burned-in captions, driven entirely by the processed narration.
 *
 * Chunks come from `data/narration-timing.json`, which is computed from the LOCKED
 * `voiceover-processed.wav`. Nothing here invents a timestamp, so captions cannot drift
 * out of sync with the voice.
 *
 * Readability rules, in priority order:
 *   1. must survive any background -> heavy paper outline via `paint-order: stroke`
 *   2. must stay out of the Shorts UI -> lives in a band above the bottom bar and
 *      inside the right rail
 *   3. must not shout -> only a curated handful of words get a colour, because if
 *      everything is highlighted nothing is
 */

import React from 'react';
import { PALETTE, FONTS, VIDEO } from '../lib/style';
import { TIMING } from '../lib/timing';
import { wobble } from '../lib/rand';

/**
 * The only words that get colour. Deliberately short: these are the beats the video is
 * actually about. Everything else is plain ink.
 */
const HIGHLIGHT: Record<string, string> = {
  clock: PALETTE.coral,
  'clock?': PALETTE.coral,
  clocks: PALETTE.coral,
  'clocks,': PALETTE.coral,
  'clocks.': PALETTE.coral,
  windows: PALETTE.teal,
  '20': PALETTE.gold,
  minutes: PALETTE.gold,
  '2': PALETTE.violet,
  hours: PALETTE.violet,
  'hours.': PALETTE.violet,
  twist: PALETTE.coral,
  'twist.': PALETTE.coral,
  ban: PALETTE.coral,
  daylight: PALETTE.teal,
  immersed: PALETTE.violet,
  'immersed,': PALETTE.violet,
};

/**
 * Sits below the action and above the Shorts bottom bar (which starts around y=1500).
 * An earlier revision put this at 1330 and it collided with the character's feet.
 */
const CAPTION_Y = 1442;
const MAX_WIDTH = 780;
const CENTER_X = VIDEO.width / 2 - 20;

/** Bangers is condensed; ~0.47em average advance is a safe width estimate. */
function fitSize(text: string): number {
  const estimate = MAX_WIDTH / (Math.max(1, text.length) * 0.47);
  return Math.max(46, Math.min(74, estimate));
}

const colorFor = (word: string): string =>
  HIGHLIGHT[word.toLowerCase()] ?? PALETTE.ink;

export const Caption: React.FC<{
  /** ABSOLUTE composition frame — captions are timed against the whole narration. */
  frame: number;
  fps: number;
}> = ({ frame, fps }) => {
  const t = frame / fps;
  const chunk = TIMING.captions.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;

  const size = fitSize(chunk.text);
  const enter = Math.min(1, (t - chunk.start) / 0.09);
  // a small overshoot on entry so each chunk lands rather than appears
  const pop = 1 + (1 - enter) * 0.13;
  const drift = wobble(`cap:${chunk.start}`, frame, 0.09, 1.6);
  const tilt = wobble(`capr:${chunk.start}`, frame, 0.07, 0.5);

  /**
   * One <text> with a <tspan> per word, rather than one <text> per word at a computed x.
   * Estimating each word's width from its character count packed some pairs together
   * ("HOW MANY" rendered as "HOWMANY"); letting the text engine do the layout is both
   * correct and lets each word still carry its own colour. `xmlSpace="preserve"` keeps
   * the separating spaces from being collapsed.
   */
  return (
    <g
      transform={`translate(${CENTER_X + drift} ${CAPTION_Y}) rotate(${tilt}) scale(${pop})`}
      opacity={enter}
    >
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={FONTS.display}
        fontSize={size}
        stroke={PALETTE.paper}
        strokeWidth={size * 0.2}
        strokeLinejoin="round"
        paintOrder="stroke"
        xmlSpace="preserve"
        style={{ letterSpacing: '0.012em' }}
      >
        {chunk.words.map((word, i) => (
          <tspan key={i} fill={colorFor(word)}>
            {(i > 0 ? ' ' : '') + word.toUpperCase()}
          </tspan>
        ))}
      </text>
    </g>
  );
};
