/**
 * EpisodeCaption.tsx — burned-in captions, driven entirely by one episode's processed
 * narration.
 *
 * Chunks come from that episode's narration-timing.json, computed from its LOCKED WAV.
 * Nothing here invents a timestamp, so captions cannot drift out of sync with the voice.
 *
 * Readability rules, in priority order:
 *   1. must survive any background -> heavy paper outline via `paint-order: stroke`
 *   2. must stay out of the Shorts UI -> a band above the bottom bar, inside the right rail
 *   3. must not shout -> only the episode's own key nouns get colour, because if everything
 *      is highlighted nothing is
 *
 * The highlight vocabulary is per-episode and small on purpose. Episode 001 hard-coded its
 * word list in this file; here it is a prop, so one component serves the whole batch.
 */

import React from 'react';
import { PALETTE, FONTS, VIDEO } from '../lib/style';
import { wobble } from '../lib/rand';
import type { CaptionChunk } from '../lib/clock';

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

/** Strip the punctuation a spoken word carries so one entry covers "hole", "hole." and "hole,". */
const bare = (w: string): string => w.toLowerCase().replace(/[^a-z0-9']/g, '');

export type CaptionHighlights = Record<string, string>;

export const EpisodeCaption: React.FC<{
  /** ABSOLUTE composition frame — captions are timed against the whole narration. */
  frame: number;
  fps: number;
  captions: CaptionChunk[];
  /** bare word -> palette colour. Keep this to the handful of words the episode is about. */
  highlights?: CaptionHighlights;
}> = ({ frame, fps, captions, highlights = {} }) => {
  const t = frame / fps;
  const chunk = captions.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;

  const words = chunk.words ?? chunk.text.split(/\s+/);
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
   * correct and lets each word still carry its own colour.
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
        {words.map((word, i) => (
          <tspan key={i} fill={highlights[bare(word)] ?? PALETTE.ink}>
            {(i > 0 ? ' ' : '') + word.toUpperCase()}
          </tspan>
        ))}
      </text>
    </g>
  );
};
