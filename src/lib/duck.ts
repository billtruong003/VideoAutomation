/**
 * duck.ts — how loud the music is allowed to be at any given moment.
 *
 * The first version of this file implemented conventional sidechain ducking: bed open by
 * default, pulled down under speech. Measuring the delivered narration showed that model does
 * not fit this channel at all.
 *
 * These Shorts are 89–95% voiced. `process-voiceover.mjs` deliberately strips silence and
 * compresses pauses, so across ten episodes the total of all gaps longer than 0.25 s is
 * between 1.0 and 2.9 seconds — and no episode has a gap over about half a second. There is
 * no room for a bed to breathe. A conventional duck would sit clamped at its floor for the
 * whole video, which is a complicated way of writing `volume={0}`.
 *
 * So the model is inverted. SPEECH IS THE NORMAL STATE. The bed holds one constant, quiet
 * level throughout and lifts slightly in the few genuine pauses, which is what actually
 * happens in well-mixed narration: the music does not duck out of the way, it sits under and
 * gets a moment at the punctuation.
 *
 * The level itself is not a guess. Beds are loudness-normalised to −30 LUFS at import and the
 * narration measures −14.5 LUFS, so a gain of 1.0 puts the bed about 15.5 LU down — inside
 * the 14–20 LU band where a bed is felt without competing with speech intelligibility.
 * NARRATION IS THE CONTENT; nothing here is permitted to argue with it.
 */

/** One spoken word, in seconds against the processed narration. */
export type Word = { start: number; end: number };

export type MusicMixOptions = {
  /** Gain while a word is being spoken — the normal state. */
  bed?: number;
  /** Gain during a genuine pause. */
  lift?: number;
  /** A gap must be at least this long to count as a pause rather than a breath. */
  minPause?: number;
  /** Seconds to rise into and fall out of a lift. */
  slew?: number;
  /** Fade at the start and end of the episode. */
  edgeFade?: number;
};

const DEFAULTS: Required<MusicMixOptions> = {
  /*
   * 1.0 against a −30 LUFS bed. The depth lives in the file, not in a magic multiplier here,
   * so changing it means re-normalising and re-measuring rather than nudging a number.
   */
  bed: 1,
  /*
   * +4 dB. Enough that a pause has a little air in it; small enough that a viewer never
   * notices the music moving, which is the point — audible pumping reads as a cheap edit.
   */
  lift: 1.6,
  /*
   * 0.28 s. Below this a gap is a breath or a comma. Measured across the ten episodes, this
   * catches the 3–9 real beats per Short and ignores everything else.
   */
  minPause: 0.28,
  slew: 0.14,
  edgeFade: 0.8,
};

/**
 * Build a `(t: number) => number` gain curve for one episode's bed.
 *
 * Returned as a function rather than a sampled array so Remotion can call it per frame at
 * whatever fps the composition runs at, and so the audio QA gate can probe the identical
 * curve the renderer will use.
 */
export function musicEnvelope(
  words: Word[],
  duration: number,
  options: MusicMixOptions = {},
): (t: number) => number {
  const o = { ...DEFAULTS, ...options };

  // The genuine pauses, found once so the per-frame path is a simple scan.
  const pauses: { start: number; end: number }[] = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= o.minPause) pauses.push({ start: words[i - 1].end, end: words[i].start });
  }

  return (t: number) => {
    const edge = o.edgeFade > 0
      ? Math.min(1, t / o.edgeFade, (duration - t) / o.edgeFade)
      : 1;
    if (edge <= 0) return 0;

    let gain = o.bed;
    for (const p of pauses) {
      if (t < p.start - o.slew) break; // sorted; nothing later applies
      if (t > p.end + o.slew) continue;
      // Triangular rise and fall across the pause, clipped to the lift level.
      const up = Math.min(1, (t - (p.start - o.slew)) / o.slew);
      const down = Math.min(1, ((p.end + o.slew) - t) / o.slew);
      const k = Math.max(0, Math.min(up, down));
      gain = Math.max(gain, o.bed + (o.lift - o.bed) * k);
    }
    return gain * edge;
  };
}

/**
 * What the mix actually does, for the audio QA gate to assert on.
 *
 * `liftRatio` is the fraction of the episode where the bed is above its resting level. On
 * this channel it should be small — a few percent. A large number would mean the narration
 * has more holes in it than the measurements say, and the mix decision should be revisited
 * rather than quietly accepted.
 */
export function describeMix(envelope: (t: number) => number, duration: number, bed = DEFAULTS.bed) {
  const step = 0.02;
  let lifted = 0;
  let n = 0;
  let peak = 0;
  for (let t = 0; t < duration; t += step) {
    const g = envelope(t);
    n++;
    peak = Math.max(peak, g);
    if (g > bed * 1.05) lifted++;
  }
  return { liftRatio: n ? lifted / n : 0, peakGain: peak, samples: n };
}
