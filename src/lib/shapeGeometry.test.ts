import { describe, expect, it } from 'vitest';
import {
  SHAPE_BOX,
  STAR_INNER_RADIUS_RANGE,
  regularPolygonPoints,
  starPoints,
} from '@/lib/shapeGeometry';

/**
 * The geometry is the single measurement every consumer shares (canvas codec,
 * SVG export and preview cards). The tests pin the properties that make a
 * shape land in its box: point count, tight fit, first vertex at the top and
 * the star's inner ratio.
 */

describe('regularPolygonPoints', () => {
  it('returns one vertex per side, fitted tightly into the box', () => {
    const points = regularPolygonPoints(6);

    expect(points).toHaveLength(6);

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(SHAPE_BOX);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(SHAPE_BOX);
  });

  it('starts at the top vertex and is deterministic', () => {
    const points = regularPolygonPoints(4);

    // A 4-gon with the first vertex at the top is a diamond.
    expect(points[0]).toEqual({ x: 50, y: 0 });
    expect(points).toContainEqual({ x: 100, y: 50 });
    expect(points).toContainEqual({ x: 50, y: 100 });
    expect(points).toContainEqual({ x: 0, y: 50 });

    expect(regularPolygonPoints(4)).toEqual(points);
  });

  it('clamps the side count into the schema range', () => {
    expect(regularPolygonPoints(1)).toHaveLength(3);
    expect(regularPolygonPoints(99)).toHaveLength(16);
    expect(regularPolygonPoints(5.4)).toHaveLength(5);
  });
});

describe('starPoints', () => {
  it('returns two points per tip, alternating outer and inner radius', () => {
    const points = starPoints(5, 0.5);

    expect(points).toHaveLength(10);

    // Outer tip at the top; the next point is the inner vertex between tips.
    expect(points[0]).toEqual({ x: 50, y: 0 });
    expect(points[1].y).toBeGreaterThan(0);

    // Every inner vertex sits closer to the center than its neighboring tips.
    const center = { x: 50, y: 50 };
    const distance = (point: { x: number; y: number }) =>
      Math.hypot(point.x - center.x, point.y - center.y);

    for (let index = 0; index < points.length; index += 2) {
      expect(distance(points[index + 1])).toBeLessThan(distance(points[index]));
    }
  });

  it('fits tightly into the box and stays deterministic', () => {
    const points = starPoints(7, 0.35);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(SHAPE_BOX);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(SHAPE_BOX);
    expect(starPoints(7, 0.35)).toEqual(points);
  });

  it('clamps tips and inner radius into the supported ranges', () => {
    expect(starPoints(2, 0.5)).toHaveLength(6);
    expect(starPoints(99, 0.5)).toHaveLength(32);

    // A ratio below the range still produces an inner vertex (no collapse).
    const spiky = starPoints(5, 0);
    expect(spiky[1]).not.toEqual(spiky[0]);

    // The UI range is inside the schema range.
    expect(STAR_INNER_RADIUS_RANGE.min).toBeGreaterThanOrEqual(0);
    expect(STAR_INNER_RADIUS_RANGE.max).toBeLessThanOrEqual(1);
  });
});
