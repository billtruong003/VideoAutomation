/**
 * Caption.tsx — burned-in subtitles, deliberately quiet.
 *
 * A Short puts one enormous word in the middle of the frame because it has forty seconds and
 * no patience. Doing that for fourteen minutes would be unreadable, exhausting, and — worse —
 * it would put the loudest thing on screen directly on top of the diagrams that are doing the
 * actual explaining.
 *
 * So these are real subtitles: phrase-length, lower third, on a soft white pill so they stay
 * legible over both the white page and the occasional full-frame photograph. They sit BELOW
 * the action band, and the accurate external `.srt` is shipped regardless of whether these
 * are burned in, because a viewer who needs captions should not depend on my styling choices.
 *
 * Cue text comes from the transcript, with one narrow correction pass. Scribe writes the
 * spoken "I.O.U.s" as "I-O-U-S", which is what it heard and the wrong thing to print.
 */

import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import transcript from '../../../data/mryolk/stt/transcript.json';
import spelling from '../../../data/mryolk/spelling.json';
import { C, FONT, T, CAPTION_Y } from '../theme';
import { FPS } from '../clock';

type Cue = { start: number; end: number; text: string; words: number };

/**
 * Spellings the transcriber got wrong as TEXT while getting right as SOUND.
 *
 * The list lives in `data/mryolk/spelling.json` and is shared with the `.srt` exporter, so the
 * burned-in captions and the sidecar file cannot drift apart — which is exactly what happened
 * when each kept its own copy and only one of them knew that "I-O-U-S" is written "I.O.U.s".
 */
type SpellingRule = { find: string; replace: string; note: string };

export const fixSpelling = (s: string): string =>
  (spelling.rules as SpellingRule[]).reduce((acc, r) => acc.split(r.find).join(r.replace), s);

export const CUES: Cue[] = (transcript.cues as Cue[]).map((c) => ({ ...c, text: fixSpelling(c.text) }));

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cue = CUES.find((c) => t >= c.start - 0.08 && t <= c.end + 0.12);
  if (!cue) return null;

  const inP = interpolate(t, [cue.start - 0.08, cue.start + 0.06], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outP = interpolate(t, [cue.end - 0.02, cue.end + 0.12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(inP, outP);

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: CAPTION_Y,
      width: 1920,
      display: 'flex',
      justifyContent: 'center',
      opacity,
      pointerEvents: 'none',
    }}
    >
      <div style={{
        maxWidth: 1400,
        padding: '12px 30px',
        borderRadius: 16,
        /*
         * Translucent white rather than the usual black bar: the film's ground is white, and a
         * black bar would be the darkest object in an otherwise bright frame for most of the
         * runtime. Over the few full-frame photographs the same pill still separates, because
         * the text on it is near-black.
         */
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 3px 16px rgba(0,0,0,0.10)',
        fontFamily: FONT.sans,
        fontWeight: 700,
        fontSize: T.caption,
        lineHeight: 1.24,
        color: C.ink,
        textAlign: 'center',
        textWrap: 'balance',
      }}
      >
        {cue.text}
      </div>
    </div>
  );
};
