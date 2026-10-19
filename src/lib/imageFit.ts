/**
 * Image fit geometry: how a source image sits inside its box without
 * distortion. `cover` crops the source to the box aspect ratio (the crop is
 * what Fabric draws); `contain` scales the image down to fit and centers it.
 *
 * Pure numbers — the Fabric layer only applies the results.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Source rectangle, centered on the image, whose aspect ratio matches the box.
 * Drawing this crop at the box size fills the box with no distortion.
 */
export function coverCrop(natural: Size, box: Size): Crop {
  const sourceAspect = natural.width / natural.height;
  const boxAspect = box.width / box.height;

  if (sourceAspect > boxAspect) {
    const width = natural.height * boxAspect;

    return { x: (natural.width - width) / 2, y: 0, width, height: natural.height };
  }

  const height = natural.width / boxAspect;

  return { x: 0, y: (natural.height - height) / 2, width: natural.width, height };
}

export interface Contained extends Size {
  /** Uniform scale applied to the natural size. */
  scale: number;
}

/** Largest centered image that fits inside the box, keeping its aspect ratio. */
export function containSize(natural: Size, box: Size): Contained {
  const scale = Math.min(box.width / natural.width, box.height / natural.height);

  return {
    width: natural.width * scale,
    height: natural.height * scale,
    scale,
  };
}
