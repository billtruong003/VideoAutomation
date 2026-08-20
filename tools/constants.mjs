/**
 * constants.mjs — the few numbers the Node tools and the renderer must agree on.
 *
 * `TAIL_HOLD_SECONDS` is declared twice by necessity: `src/lib/clock.ts` needs it to size a
 * composition, and the delivery validator needs it to know how many frames a correct render
 * should contain. They must not drift — a mismatch would make every episode fail the frame
 * count check for a reason that has nothing to do with the render — so both cite this file.
 */

/** Extra hold after the last spoken word, so the final gag lands before the hard cut. */
export const TAIL_HOLD_SECONDS = 1.15;

/** Delivery spec for the channel's Shorts. */
export const VIDEO = { width: 1080, height: 1920, fps: 30 };
