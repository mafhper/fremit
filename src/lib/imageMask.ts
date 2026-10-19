/**
 * Geometry of the image-object mask.
 *
 * One rounded rectangle describes the crop in page coordinates, and the three
 * consumers derive from it instead of measuring the mask again:
 *
 * - the live canvas converts it to the FabricImage local space (the codec),
 * - the SVG thumbnail writes it as a `<clipPath>` rect,
 * - the exporter goes through the same codec as the live canvas.
 *
 * The radius is a ratio of the shorter side, so the mask is invariant under a
 * scale: the stored preset is never rewritten and the corner grows with the
 * object in every consumer.
 */

import type { ImageMaskPreset, ImageObject } from '@/lib/document';
import { round2 } from '@/lib/math';

/** Corner radius of the `rounded` preset, as a ratio of the shorter side. */
export const IMAGE_MASK_RADIUS_RATIO = 0.12;

/** Preset the menu applies first; clearing writes `null` back. */
export const DEFAULT_IMAGE_MASK: ImageMaskPreset = 'rounded';

/** Box and corner radius of a mask in page pixels. */
export interface ImageMaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
}

/**
 * Page-space clip of an image object; `null` when it carries no mask. The box
 * is the object box — the same box the thumbnail draws the image into and the
 * canvas gives the FabricImage — so no consumer can frame the mask differently.
 */
export function imageMaskRect(
  object: Pick<ImageObject, 'x' | 'y' | 'width' | 'height' | 'mask'>,
): ImageMaskRect | null {
  if (!object.mask) return null;

  const radius = round2(Math.max(0, Math.min(object.width, object.height)) * IMAGE_MASK_RADIUS_RATIO);

  return {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rx: radius,
    ry: radius,
  };
}

/** Clip of an image object in the local units of the FabricImage. */
export interface ImageMaskClip {
  width: number;
  height: number;
  rx: number;
  ry: number;
}

/**
 * The page rect converted to the local space of a FabricImage, whose cache is
 * drawn at the natural size and composited with `scaleX`/`scaleY`. The clip is
 * centered on the object, so `rx`/`ry` are compensated separately: after the
 * non-uniform scale the corner is still the circular radius of the page rect.
 */
export function imageMaskClipGeometry(
  object: Pick<ImageObject, 'x' | 'y' | 'width' | 'height' | 'mask'>,
  scale: { x: number; y: number },
): ImageMaskClip | null {
  const rect = imageMaskRect(object);

  if (!rect) return null;

  const scaleX = Math.abs(scale.x) || 1;
  const scaleY = Math.abs(scale.y) || 1;

  return {
    width: rect.width / scaleX,
    height: rect.height / scaleY,
    rx: rect.rx / scaleX,
    ry: rect.ry / scaleY,
  };
}
