import { describe, expect, it } from 'vitest';
import { SNAP_TOLERANCE_PX, snapRect, snapTolerance, type Rect } from '@/lib/editorSnap';

const page: Rect = { x: 0, y: 0, width: 1000, height: 800 };

describe('snapRect', () => {
  it('snaps an edge to the page edge within tolerance', () => {
    const result = snapRect({ x: 5, y: 400, width: 200, height: 100 }, [page], 8);

    expect(result.x).toBe(0);
    expect(result.guides).toContainEqual({ axis: 'x', position: 0 });
  });

  it('snaps centers together', () => {
    const neighbor: Rect = { x: 300, y: 100, width: 400, height: 200 };
    const result = snapRect({ x: 405, y: 100, width: 190, height: 200 }, [page, neighbor], 8);

    // The moving center (500) meets the neighbor center (500) with a 5 px delta.
    expect(result.x).toBe(405);
    expect(result.guides).toContainEqual({ axis: 'x', position: 500 });
  });

  it('snaps a trailing edge to a leading edge', () => {
    const neighbor: Rect = { x: 500, y: 0, width: 100, height: 100 };
    const result = snapRect({ x: 296, y: 400, width: 200, height: 100 }, [neighbor], 8);

    expect(result.x).toBe(300);
  });

  it('leaves the rect alone when nothing is within tolerance', () => {
    const result = snapRect({ x: 123, y: 456, width: 200, height: 100 }, [page], 8);

    expect(result).toEqual({ x: 123, y: 456, guides: [] });
  });

  it('picks the smallest delta when several targets are in range', () => {
    const near: Rect = { x: 100, y: 0, width: 40, height: 10 };
    const result = snapRect({ x: 96, y: 123, width: 200, height: 20 }, [near, page], 8);

    // Left edge snaps to 100 (delta +4); the page edge is 96 px away.
    expect(result.x).toBe(100);
    expect(result.guides).toEqual([{ axis: 'x', position: 100 }]);
  });

  it('converts the screen tolerance to page units by zoom', () => {
    expect(snapTolerance(1)).toBe(SNAP_TOLERANCE_PX);
    expect(snapTolerance(2)).toBe(SNAP_TOLERANCE_PX / 2);

    // At 2x zoom the same 8 screen px cover half the page distance.
    const rect = { x: 5, y: 0, width: 10, height: 10 };
    expect(snapRect(rect, [page], snapTolerance(2)).x).toBe(5);
    expect(snapRect(rect, [page], snapTolerance(1)).x).toBe(0);
  });

  it('snaps both axes independently', () => {
    const result = snapRect({ x: 3, y: 797, width: 100, height: 100 }, [page], 8);

    expect(result.x).toBe(0);
    expect(result.y).toBe(800);
    expect(result.guides).toEqual([
      { axis: 'x', position: 0 },
      { axis: 'y', position: 800 },
    ]);
  });
});
