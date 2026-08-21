/**
 * Yolk.tsx — placing the drawn artwork on the canvas.
 *
 * Every asset is a transparent PNG of a known pixel size, so placement is expressed as a
 * HEIGHT and a position, and the width follows from the source aspect. Sizing by width
 * instead would make a wide drawing (the network diagram, the flying papers) tower over a
 * tall one at the same nominal "size", and the character's scale would visibly change from
 * scene to scene for no reason the viewer could name.
 *
 * `anchor` decides which point of the drawing the coordinates refer to. `bottom` is the
 * default for the character specifically, because Mr.Yolk has feet: anchoring him centrally
 * makes him hover a different amount above the ground in every pose, and "the character
 * floats" is a defect that is very hard to see in a still and impossible to unsee in motion.
 */

import React from 'react';
import { Img } from 'remotion';
import { yolk, yolkSrc, type YolkSlug } from '../assets';

export type Anchor = 'center' | 'bottom' | 'top';

export type YolkProps = {
  slug: YolkSlug;
  /** Rendered height in px. Width follows the source aspect ratio. */
  height: number;
  x: number;
  y: number;
  anchor?: Anchor;
  rotate?: number;
  flip?: boolean;
  opacity?: number;
  style?: React.CSSProperties;
  /** Extra transform applied INSIDE the anchor offset, so it composes with placement. */
  transform?: string;
};

export const Yolk: React.FC<YolkProps> = ({
  slug, height, x, y, anchor = 'bottom', rotate = 0, flip = false, opacity = 1, style, transform = '',
}) => {
  const a = yolk(slug);
  const width = (a.width / a.height) * height;
  const dy = anchor === 'bottom' ? -height : anchor === 'center' ? -height / 2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y + dy,
        width,
        height,
        transformOrigin: anchor === 'bottom' ? 'center bottom' : 'center center',
        transform: `${transform} rotate(${rotate}deg)${flip ? ' scaleX(-1)' : ''}`,
        opacity,
        ...style,
      }}
    >
      <Img
        src={yolkSrc(slug)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
};

/**
 * A drawing with a drop shadow onto the white ground.
 *
 * Used sparingly — for the one object a frame is actually about. On flat white, a soft
 * contact shadow is the only cue that separates "the hero prop" from "another sticker", and
 * applying it to everything removes the distinction it exists to create.
 */
export const YolkHero: React.FC<YolkProps> = ({ style, ...rest }) => (
  <Yolk
    {...rest}
    style={{ filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.16))', ...style }}
  />
);

/** Natural size of a drawing at a given height, for laying out around it. */
export const yolkWidthAt = (slug: YolkSlug, height: number): number => {
  const a = yolk(slug);
  return (a.width / a.height) * height;
};
