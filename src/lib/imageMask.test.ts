import { describe, expect, it } from 'vitest';
import { createImageObject } from '@/lib/document';
import {
  IMAGE_MASK_RADIUS_RATIO,
  imageMaskClipGeometry,
  imageMaskRect,
} from '@/lib/imageMask';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Coverage of a point by a rounded rectangle — the independent side of the
 * pixel sampling: the smoke test samples (100,120) as cut and (120,140) as
 * inside, and this is the geometry those points were chosen from.
 */
function covers(
  rect: { x: number; y: number; width: number; height: number; rx: number },
  point: { x: number; y: number },
): boolean {
  if (
    point.x < rect.x ||
    point.x > rect.x + rect.width ||
    point.y < rect.y ||
    point.y > rect.y + rect.height
  ) {
    return false;
  }

  const nearestX = Math.min(Math.max(point.x, rect.x + rect.rx), rect.x + rect.width - rect.rx);
  const nearestY = Math.min(Math.max(point.y, rect.y + rect.rx), rect.y + rect.height - rect.rx);

  return Math.hypot(point.x - nearestX, point.y - nearestY) <= rect.rx;
}

describe('imageMaskRect', () => {
  it('clips the object box with a radius taken from the shorter side', () => {
    const image = createImageObject(onePixelPng, {
      id: 'image-1',
      x: 90,
      y: 110,
      width: 900,
      height: 560,
      mask: 'rounded',
    });

    // 560 * 0.12 = 67.2, the worked example the smoke test samples.
    expect(imageMaskRect(image)).toEqual({
      x: 90,
      y: 110,
      width: 900,
      height: 560,
      rx: 67.2,
      ry: 67.2,
    });
  });

  it('uses the shorter side on a portrait box and rounds to two decimals', () => {
    const image = createImageObject(onePixelPng, {
      x: 0,
      y: 0,
      width: 400,
      height: 900,
      mask: 'rounded',
    });

    expect(imageMaskRect(image)).toMatchObject({ rx: 48, ry: 48 });
    expect(IMAGE_MASK_RADIUS_RATIO).toBe(0.12);
  });

  it('is null without a mask', () => {
    expect(imageMaskRect(createImageObject(onePixelPng))).toBeNull();
  });

  it('cuts the corner point and keeps the inset point, as the pixel sample expects', () => {
    const rect = imageMaskRect(
      createImageObject(onePixelPng, {
        x: 90,
        y: 110,
        width: 900,
        height: 560,
        mask: 'rounded',
      }),
    );

    if (!rect) throw new Error('expected a mask rect');

    expect(covers(rect, { x: 100, y: 120 })).toBe(false);
    expect(covers(rect, { x: 120, y: 140 })).toBe(true);
    expect(covers(rect, { x: 540, y: 390 })).toBe(true);
  });
});

describe('imageMaskClipGeometry', () => {
  it('maps back to the page rect when multiplied by the object scale', () => {
    const image = createImageObject(onePixelPng, {
      x: 90,
      y: 110,
      width: 900,
      height: 560,
      mask: 'rounded',
    });
    const scale = { x: 2, y: 4 };
    const clip = imageMaskClipGeometry(image, scale);

    if (!clip) throw new Error('expected a clip');

    // The FabricImage cache is the natural size; the clip lives in those
    // local units and is composited with the object scale.
    expect(clip.width * scale.x).toBeCloseTo(900, 6);
    expect(clip.height * scale.y).toBeCloseTo(560, 6);
    expect(clip.rx * scale.x).toBeCloseTo(67.2, 6);
    expect(clip.ry * scale.y).toBeCloseTo(67.2, 6);
  });

  it('keeps the page radius circular under a non-uniform scale', () => {
    const image = createImageObject(onePixelPng, {
      width: 900,
      height: 560,
      mask: 'rounded',
    });
    const clip = imageMaskClipGeometry(image, { x: 3, y: 1.5 });

    if (!clip) throw new Error('expected a clip');

    // Independent local radii; both land on the same page radius.
    expect(clip.rx).toBeCloseTo(67.2 / 3, 6);
    expect(clip.ry).toBeCloseTo(67.2 / 1.5, 6);
  });

  it('is null without a mask', () => {
    expect(imageMaskClipGeometry(createImageObject(onePixelPng), { x: 1, y: 1 })).toBeNull();
  });
});
