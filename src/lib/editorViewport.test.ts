import { describe, expect, it } from 'vitest';
import {
  FIT_PADDING,
  MAX_ZOOM,
  MIN_ZOOM,
  centerViewport,
  chooseRulerStep,
  clampZoom,
  fitViewport,
  rulerTickMarks,
  rulerTicks,
  toScene,
  toScreen,
  zoomAtPoint,
} from '@/lib/editorViewport';

describe('zoom limits', () => {
  it('clamps zoom to the declared range', () => {
    expect(clampZoom(MIN_ZOOM / 2)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM * 3)).toBe(MAX_ZOOM);
    expect(clampZoom(1)).toBe(1);
  });

  it('keeps the scene point under the cursor fixed while zooming', () => {
    const viewport = { zoom: 1, x: 100, y: 50 };
    const cursor = { x: 300, y: 250 };
    const sceneBefore = toScene(viewport, cursor);

    const zoomed = zoomAtPoint(viewport, 2, cursor);

    expect(zoomed.zoom).toBe(2);
    expect(toScene(zoomed, cursor).x).toBeCloseTo(sceneBefore.x, 6);
    expect(toScene(zoomed, cursor).y).toBeCloseTo(sceneBefore.y, 6);
  });

  it('does not exceed the declared limits when the wheel keeps going', () => {
    const viewport = { zoom: 1, x: 0, y: 0 };

    expect(zoomAtPoint(viewport, 999, { x: 0, y: 0 }).zoom).toBe(MAX_ZOOM);
    expect(zoomAtPoint(viewport, 0.0001, { x: 0, y: 0 }).zoom).toBe(MIN_ZOOM);
  });
});

describe('fit and center', () => {
  const page = { width: 1080, height: 1080 };
  const stage = { width: 800, height: 600 };

  it('fits the whole page inside the stage with padding', () => {
    const viewport = fitViewport(page, stage);

    expect(viewport.zoom).toBeCloseTo((stage.height - FIT_PADDING) / page.height, 6);
    expect(page.width * viewport.zoom).toBeLessThanOrEqual(stage.width);
    expect(page.height * viewport.zoom).toBeLessThanOrEqual(stage.height);
  });

  it('centers the page in the stage', () => {
    const viewport = centerViewport(page, stage, 0.5);
    const center = toScreen(viewport, { x: page.width / 2, y: page.height / 2 });

    expect(center.x).toBeCloseTo(stage.width / 2, 6);
    expect(center.y).toBeCloseTo(stage.height / 2, 6);
  });

  it('falls back to a neutral viewport without measurements', () => {
    expect(fitViewport(page, { width: 0, height: 0 })).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it('round-trips scene and screen coordinates', () => {
    const viewport = { zoom: 0.75, x: -40, y: 32 };
    const scene = { x: 123.5, y: 456.25 };
    const roundTripped = toScene(viewport, toScreen(viewport, scene));

    expect(roundTripped.x).toBeCloseTo(scene.x, 6);
    expect(roundTripped.y).toBeCloseTo(scene.y, 6);
  });
});

describe('ruler ticks', () => {
  it('keeps at least a readable gap between labeled ticks', () => {
    for (const zoom of [MIN_ZOOM, 0.1, 0.25, 0.5, 1, 2, MAX_ZOOM]) {
      expect(chooseRulerStep(zoom) * zoom).toBeGreaterThanOrEqual(64);
    }
  });

  it('grows the step as the zoom shrinks', () => {
    expect(chooseRulerStep(1)).toBeLessThan(chooseRulerStep(0.25));
  });

  it('lists every multiple of the step inside the range', () => {
    expect(rulerTicks(0, 300, 100)).toEqual([0, 100, 200, 300]);
    expect(rulerTicks(-250, 0, 100)).toEqual([-200, -100, 0]);
    expect(rulerTicks(30, 170, 100)).toEqual([100]);
  });

  it('returns nothing for an invalid step', () => {
    expect(rulerTicks(0, 100, 0)).toEqual([]);
  });
});

describe('ruler tick marks', () => {
  it('covers the range with five minors per major', () => {
    const marks = rulerTickMarks(0, 20, 20);

    expect(marks.map((mark) => mark.value)).toEqual([0, 4, 8, 12, 16, 20]);
    expect(marks.filter((mark) => mark.major).map((mark) => mark.value)).toEqual([0, 20]);
  });

  it('classifies majors by grid index, never by rounding the value', () => {
    // At a 0.4 minor step the tick at 1.6 rounds to the major 2; a value-based
    // check would promote it. The grid index says it is the fourth minor.
    const marks = rulerTickMarks(0, 2, 2);
    const nearMajor = marks.find((mark) => Math.abs(mark.value - 1.6) < 1e-9);

    expect(marks).toHaveLength(6);
    marks.forEach((mark, index) => expect(mark.value).toBeCloseTo(index * 0.4, 9));
    expect(nearMajor?.major).toBe(false);
    expect(marks.filter((mark) => mark.major).map((mark) => mark.value)).toEqual([0, 2]);
  });

  it('keeps majors aligned to the step at max zoom and off-origin ranges', () => {
    const step = chooseRulerStep(MAX_ZOOM);
    expect(step).toBe(20);
    const marks = rulerTickMarks(-18.4, 63.2, step);
    const majorIndexes = marks
      .map((mark, index) => (mark.major ? index : -1))
      .filter((index) => index >= 0);

    expect(majorIndexes.length).toBeGreaterThan(1);
    for (const mark of marks.filter((candidate) => candidate.major)) {
      expect(mark.value % step).toBeCloseTo(0, 9);
    }
    for (let i = 1; i < majorIndexes.length; i += 1) {
      expect(majorIndexes[i] - majorIndexes[i - 1]).toBe(5);
    }
  });

  it('returns nothing for an invalid step', () => {
    expect(rulerTickMarks(0, 100, 0)).toEqual([]);
  });
});
