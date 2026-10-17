/**
 * Snapping for the dedicated canvas. Pure geometry: the caller passes the
 * moving rect, the candidate targets (page bounds plus the other objects) and
 * a tolerance in page units, and gets back the adjusted position plus the
 * guide lines to draw.
 *
 * Snap tolerance is declared in screen pixels and converted by zoom, so the
 * magnetic distance feels the same at every zoom level.
 */

export const SNAP_TOLERANCE_PX = 8;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  axis: 'x' | 'y';
  /** Position in page units. */
  position: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export function snapTolerance(zoom: number): number {
  if (zoom <= 0) return SNAP_TOLERANCE_PX;

  return SNAP_TOLERANCE_PX / zoom;
}

function anchors(start: number, size: number): number[] {
  return [start, start + size / 2, start + size];
}

interface AxisSnap {
  delta: number;
  guide: number;
}

function bestAxisSnap(
  start: number,
  size: number,
  targets: Rect[],
  tolerance: number,
  axis: 'x' | 'y',
): AxisSnap | null {
  const moving = anchors(start, size);
  let best: AxisSnap | null = null;

  for (const target of targets) {
    const targetStart = axis === 'x' ? target.x : target.y;
    const targetSize = axis === 'x' ? target.width : target.height;

    for (const guide of anchors(targetStart, targetSize)) {
      for (const anchor of moving) {
        const delta = guide - anchor;
        if (Math.abs(delta) > tolerance) continue;
        if (best === null || Math.abs(delta) < Math.abs(best.delta)) {
          best = { delta, guide };
        }
      }
    }
  }

  return best;
}

/**
 * Snaps a rect to the closest target edge or center per axis. Each axis is
 * independent: the smallest delta within tolerance wins, and the guide line
 * marks the target it snapped to.
 */
export function snapRect(rect: Rect, targets: Rect[], tolerance: number): SnapResult {
  const xSnap = bestAxisSnap(rect.x, rect.width, targets, tolerance, 'x');
  const ySnap = bestAxisSnap(rect.y, rect.height, targets, tolerance, 'y');
  const guides: SnapGuide[] = [];

  if (xSnap) guides.push({ axis: 'x', position: xSnap.guide });
  if (ySnap) guides.push({ axis: 'y', position: ySnap.guide });

  return {
    x: rect.x + (xSnap?.delta ?? 0),
    y: rect.y + (ySnap?.delta ?? 0),
    guides,
  };
}
