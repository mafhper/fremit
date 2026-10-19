/**
 * Shape presets of the canvas shell: one pure builder per shape kind, sized
 * from the active page and centered. The shapes drawer and the layers header
 * both go through it, so their "add" affordances insert the same default
 * object and can never disagree on the geometry.
 *
 * Layer names stay English so the document reads the same in any locale.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { createShapeObject, type ShapeKind, type ShapeObject } from '@/lib/document';

/** English layer names, shared by every affordance that inserts a shape. */
export const SHAPE_PRESET_NAMES: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  line: 'Line',
  star: 'Star',
  polygon: 'Polygon',
};

/** Stroke of a fresh line: the shape has no fill, so the stroke is its paint. */
const LINE_STROKE_WIDTH = 4;

/**
 * One shape sized from the page: a square at 40% of the smallest side,
 * centered. The rect corner radius follows the size; the line is a horizontal
 * segment (a 1 px box, so Fabric's scale math stays finite) with a visible
 * stroke; the star and the polygon carry their own default parameters.
 */
export function createShapePreset(
  kind: ShapeKind,
  page: { width: number; height: number },
): ShapeObject {
  const size = Math.round(Math.min(page.width, page.height) * 0.4);
  // The line is a segment over the box diagonal; a 1 px box reads horizontal.
  const height = kind === 'line' ? 1 : size;

  const shape = createShapeObject(kind, {
    name: SHAPE_PRESET_NAMES[kind],
    x: Math.round((page.width - size) / 2),
    y: Math.round((page.height - height) / 2),
    width: size,
    height,
    cornerRadius: kind === 'rect' ? Math.round(size * 0.12) : 0,
    ...(kind === 'star' ? { sides: 5, innerRadius: 0.5 } : {}),
    ...(kind === 'polygon' ? { sides: 6 } : {}),
  });

  // A fresh line paints with its stroke — the segment has no area to fill —
  // and starts in the same color the fill would give the other kinds.
  if (kind === 'line') {
    return { ...shape, stroke: shape.fill, strokeWidth: LINE_STROKE_WIDTH };
  }

  return shape;
}
