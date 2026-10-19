import type { DocumentObject } from '@/lib/document';

/**
 * Rotated bounding box of an object in page units. Fabric rotates around the
 * object's top-left origin (the document contract), so the corners rotate
 * around (x, y) — the same math a seed or sticker must respect to stay on the
 * page. Shared by the template and sticker suites (test-side math, independent
 * from the builders under test).
 */
export function rotatedBounds(object: DocumentObject) {
  const angle = (object.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    [0, 0],
    [object.width, 0],
    [0, object.height],
    [object.width, object.height],
  ].map(([dx, dy]) => ({ x: object.x + dx * cos - dy * sin, y: object.y + dx * sin + dy * cos }));

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y)),
  };
}
