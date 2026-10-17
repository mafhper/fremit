/**
 * Viewport math for the dedicated canvas: zoom limits, wheel zoom, fit and
 * ruler ticks. Pure functions — the Fabric canvas only applies the numbers.
 *
 * Conventions: the scene is the page in page pixels with its origin at the
 * page's top-left corner. A viewport is `{ zoom, x, y }`, where `x`/`y` are
 * the screen coordinates of the scene origin (the same shape Fabric's
 * `viewportTransform` uses).
 */

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 4;

/** Space kept between the page and the stage edge when fitting. */
export const FIT_PADDING = 48;

/** Ruler thickness in screen pixels (both axes). */
export const RULER_SIZE = 24;

export interface Viewport {
  zoom: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Zooms around a screen point: the scene point under the cursor stays put.
 */
export function zoomAtPoint(viewport: Viewport, nextZoom: number, point: Point): Viewport {
  const zoom = clampZoom(nextZoom);
  const sceneX = (point.x - viewport.x) / viewport.zoom;
  const sceneY = (point.y - viewport.y) / viewport.zoom;

  return {
    zoom,
    x: point.x - sceneX * zoom,
    y: point.y - sceneY * zoom,
  };
}

/** Centers a page in the stage at the given zoom. */
export function centerViewport(page: Size, stage: Size, zoom: number): Viewport {
  const clamped = clampZoom(zoom);

  return {
    zoom: clamped,
    x: (stage.width - page.width * clamped) / 2,
    y: (stage.height - page.height * clamped) / 2,
  };
}

/** Largest zoom that keeps the whole page visible, then centers it. */
export function fitViewport(page: Size, stage: Size): Viewport {
  if (stage.width <= 0 || stage.height <= 0 || page.width <= 0 || page.height <= 0) {
    return { zoom: 1, x: 0, y: 0 };
  }

  const zoom = Math.min(
    (stage.width - FIT_PADDING) / page.width,
    (stage.height - FIT_PADDING) / page.height,
  );

  return centerViewport(page, stage, zoom);
}

export function toScreen(viewport: Viewport, point: Point): Point {
  return {
    x: viewport.x + point.x * viewport.zoom,
    y: viewport.y + point.y * viewport.zoom,
  };
}

export function toScene(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

const RULER_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000] as const;

/** Smallest "nice" step (in page units) whose on-screen gap is at least 64 px. */
export function chooseRulerStep(zoom: number): number {
  const minScreenGap = 64;

  for (const step of RULER_STEPS) {
    if (step * zoom >= minScreenGap) return step;
  }

  return RULER_STEPS[RULER_STEPS.length - 1];
}

/** Tick positions (in page units) covering `[start, end]` at `step`. */
export function rulerTicks(start: number, end: number, step: number): number[] {
  if (step <= 0 || end < start) return [];

  const ticks: number[] = [];
  for (let value = Math.ceil(start / step) * step; value <= end; value += step) {
    ticks.push(value);
  }

  return ticks;
}

export interface RulerTickMark {
  /** Position in page units. */
  value: number;
  /** Major ticks are labeled and drawn taller. */
  major: boolean;
}

/**
 * Ruler tick marks covering `[start, end]`: one minor mark every `step / 5`
 * and one major mark every `step`, both on the same grid. The major flag is
 * derived from the grid index (`index % 5`), never from rounding the value —
 * rounding can promote a minor tick that sits close to a major value (e.g.
 * `1.6` rounding to the major `2`), and that defect grows with zoom.
 */
export function rulerTickMarks(start: number, end: number, step: number): RulerTickMark[] {
  if (step <= 0 || end < start) return [];

  const minorStep = step / 5;
  const firstIndex = Math.ceil(start / minorStep);
  const lastIndex = Math.floor(end / minorStep);
  const marks: RulerTickMark[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    marks.push({ value: index * minorStep, major: index % 5 === 0 });
  }

  return marks;
}
