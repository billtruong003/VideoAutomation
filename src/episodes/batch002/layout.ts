/**
 * layout.ts — where things go, stated once.
 *
 * Twenty episodes share one frame, one caption band and one character rig, so the positions
 * that keep a shot readable are the same in all of them. Naming them here means a spec says
 * `y: HERO_Y` rather than `y: 1010`, and a framing change is one edit rather than a hundred.
 *
 * The constraints these encode are the ones Batch 001's visual QA found the hard way:
 * captions sit at 1442 and collide with feet, camera zoom below 1.0 exposes background edges,
 * and a prop drawn in mid-air reads as pasted on rather than placed.
 */

/** Frame is 1080 x 1920. */
export const CX = 540;

/**
 * Everything must stay inside this box.
 *
 * The bottom bound is the important one: the burned-in caption band starts around 1400, and
 * "captions collided with feet" is a defect this channel has already shipped once.
 */
export const SAFE = { left: 140, right: 940, top: 280, bottom: 1380 } as const;

/** The hero object in a room scene — sitting on a surface, not floating above one. */
export const HERO = { x: 690, y: 1010 } as const;

/** The hero object in a diagram scene, where there is no floor and it can own the middle. */
export const DIAGRAM = { x: CX, y: 880 } as const;

/** Two things side by side, for the comparisons most of these episodes are built on. */
export const COMPARE_L = { x: 320, y: 900 } as const;
export const COMPARE_R = { x: 770, y: 900 } as const;

/** Bill stands left, clear of the hero object's silhouette. */
export const BILL = { x: 245, y: 1265, scale: 2.5 } as const;

/** Gus enters from the right when an episode needs an authority in the room. */
export const GUS = { x: 865, y: 1265, scale: 2.4 } as const;

/** A label in the upper third, where there is nothing to collide with. */
export const LABEL_Y = 440;

/** A second label line, under the hero and above the caption band. */
export const LABEL_LOW_Y = 1250;
