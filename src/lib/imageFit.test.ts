import { describe, expect, it } from 'vitest';
import { containSize, coverCrop } from '@/lib/imageFit';

describe('coverCrop', () => {
  it('crops a square source to a wide box without distortion', () => {
    const crop = coverCrop({ width: 100, height: 100 }, { width: 200, height: 100 });

    expect(crop).toEqual({ x: 0, y: 25, width: 100, height: 50 });
    expect(crop.width / crop.height).toBeCloseTo(2, 6);
  });

  it('crops a wide source to a square box, centered', () => {
    const crop = coverCrop({ width: 400, height: 100 }, { width: 100, height: 100 });

    expect(crop).toEqual({ x: 150, y: 0, width: 100, height: 100 });
  });

  it('keeps the crop inside the source and matching the box aspect', () => {
    const natural = { width: 640, height: 480 };
    const crop = coverCrop(natural, { width: 1080, height: 300 });

    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(natural.width);
    expect(crop.y + crop.height).toBeLessThanOrEqual(natural.height);
    expect(crop.width / crop.height).toBeCloseTo(1080 / 300, 6);
  });
});

describe('containSize', () => {
  it('fits a wide image inside a square box', () => {
    const contained = containSize({ width: 400, height: 200 }, { width: 100, height: 100 });

    expect(contained.scale).toBeCloseTo(0.25, 6);
    expect(contained.width).toBeCloseTo(100, 6);
    expect(contained.height).toBeCloseTo(50, 6);
  });

  it('never exceeds the box and keeps the aspect ratio', () => {
    const natural = { width: 300, height: 500 };
    const box = { width: 200, height: 150 };
    const contained = containSize(natural, box);

    expect(contained.width).toBeLessThanOrEqual(box.width);
    expect(contained.height).toBeLessThanOrEqual(box.height);
    expect(contained.width / contained.height).toBeCloseTo(natural.width / natural.height, 6);
  });
});
