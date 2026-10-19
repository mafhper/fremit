/**
 * Pure geometry of the parameterized shape kinds — `star` and `polygon` — in a
 * normalized box.
 *
 * These are the only two kinds whose vertices are computed from stored
 * parameters. The other kinds are primitive elements and are not built here:
 * `rect` and `ellipse` draw from the box directly, the `triangle` is a fixed
 * three-corner set (Fabric's primitive on the canvas and the export, spelled
 * out where the SVG preview draws it), and the `line` segment is the box
 * diagonal, private to the canvas codec.
 *
 * Points live in a `SHAPE_BOX`×`SHAPE_BOX` box (100×100): the canvas codec
 * scales the polygon into the object box with `scaleX/scaleY`, and the SVG
 * preview scales the same points into page units — one measurement, so a star
 * or a polygon on the canvas and the same kind in a preview card can never
 * disagree.
 *
 * The functions are total: a side count or ratio outside the supported range
 * is clamped instead of producing degenerate points, and the result is always
 * fitted tightly into the box (the shape fills its bounding box regardless of
 * the vertex count).
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { SHAPE_INNER_RADIUS_MAX, SHAPE_INNER_RADIUS_MIN, SHAPE_SIDES_MAX, SHAPE_SIDES_MIN } from '@/lib/document';

/** Side of the normalized box the shape points are computed in. */
export const SHAPE_BOX = 100;

export interface ShapePoint {
  x: number;
  y: number;
}

/**
 * Ranges the inspector offers. They are policy, not contract: the schema
 * accepts every value within its own bounds (3..16 sides, 0..1 ratio), and
 * the geometry clamps to those. A document may therefore store a 13..16-sided
 * polygon or a 0/1 inner ratio — it loads and draws unchanged; the inspector
 * just does not offer that far (a regular polygon stops at 12 sides and the
 * star ratio at 10..90%, the usable band). Widening the policy is an inspector
 * change, never a schema change.
 */
export const POLYGON_SIDES_RANGE = { min: SHAPE_SIDES_MIN, max: 12 } as const;
export const STAR_SIDES_RANGE = { min: SHAPE_SIDES_MIN, max: SHAPE_SIDES_MAX } as const;
/** Ratio of the outer radius, matching the inspector's usable band for a star. */
export const STAR_INNER_RADIUS_RANGE = { min: 0.1, max: 0.9 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Fits points tightly into `[0,size]²`. A regular polygon inscribed in a
 * circle does not fill its box (the extremes depend on the vertex count), so
 * the points are normalized: the shape always fills the object box it is
 * scaled into.
 */
function fitToBox(points: ShapePoint[], size: number): ShapePoint[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  return points.map((point) => ({
    x: round3(((point.x - minX) / width) * size),
    y: round3(((point.y - minY) / height) * size),
  }));
}

/** Vertices of a regular polygon, first vertex at the top, fitted to the box. */
export function regularPolygonPoints(sides: number, size = SHAPE_BOX): ShapePoint[] {
  const count = Math.round(clamp(sides, SHAPE_SIDES_MIN, SHAPE_SIDES_MAX));
  const radius = size / 2;
  const points: ShapePoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    points.push({ x: radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) });
  }

  return fitToBox(points, size);
}

/**
 * Star with `sides` tips; `innerRadius` is the inner radius as a ratio of the
 * outer one. The first tip points up, like the polygon's first vertex.
 */
export function starPoints(sides: number, innerRadius: number, size = SHAPE_BOX): ShapePoint[] {
  const count = Math.round(clamp(sides, SHAPE_SIDES_MIN, SHAPE_SIDES_MAX));
  const ratio = clamp(innerRadius, SHAPE_INNER_RADIUS_MIN, SHAPE_INNER_RADIUS_MAX);
  const radius = size / 2;
  const points: ShapePoint[] = [];

  for (let index = 0; index < count * 2; index += 1) {
    const pointRadius = index % 2 === 0 ? radius : radius * ratio;
    const angle = -Math.PI / 2 + (index * Math.PI) / count;
    points.push({
      x: radius + pointRadius * Math.cos(angle),
      y: radius + pointRadius * Math.sin(angle),
    });
  }

  return fitToBox(points, size);
}
