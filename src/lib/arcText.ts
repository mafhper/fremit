/**
 * Curved text geometry (schema v2): the parameters of a text arc are stored on
 * the object (`arc: { direction, amount }`) and the path is derived here from
 * the text, the font and the curvature — nothing is frozen in the document, so
 * editing the text or the font re-flows the curve.
 *
 * The arc is a circular segment whose arc length equals the measured text
 * width: the text runs along the curve from end to end. `up` is the rainbow
 * (text over the top of a circle), `down` is the valley (text under the bottom
 * of a circle); the path is laid out so that one path side keeps the glyphs
 * upright in both cases.
 *
 * The geometry is our own: the reference only proved the concept, and no code
 * was taken from it.
 */

import type { ArcDirection, TextArc } from '@/lib/document';
import { round2 } from '@/lib/math';

/** Curvature bounds in degrees of total sweep. */
export const ARC_MAX_SWEEP_DEGREES = 120;
export const ARC_MIN_SWEEP_DEGREES = 12;

/** Curvature of the presets: a clearly readable arc, far from both extremes. */
export const DEFAULT_ARC_AMOUNT = 0.6;

export interface ArcPathGeometry {
  /** SVG path data of the arc, in a box whose top-left is (0, 0). */
  d: string;
  /** Bounding box of the arc itself, in text pixels. */
  width: number;
  height: number;
}

export interface ArcPathInput {
  /** Measured width of the text at the object's font, in pixels. */
  textWidth: number;
  direction: ArcDirection;
  amount: number;
}

/** `amount` is stored 0..1; anything else (NaN included) lands in range. */
export function clampArcAmount(amount: number): number {
  if (!Number.isFinite(amount)) return DEFAULT_ARC_AMOUNT;

  return Math.min(1, Math.max(0, amount));
}

/** Total sweep of the arc in degrees, between the minimum and the maximum. */
export function arcSweepDegrees(amount: number): number {
  const clamped = clampArcAmount(amount);

  return ARC_MIN_SWEEP_DEGREES + clamped * (ARC_MAX_SWEEP_DEGREES - ARC_MIN_SWEEP_DEGREES);
}

/**
 * Circular arc whose length is `textWidth`, laid out in a box anchored at the
 * origin. A radius that yields that length keeps the glyph spacing of a
 * straight run — only the baseline bends.
 *
 * Both chords are horizontal: the endpoints sit at the same height and the
 * segment is symmetric around its apex, which is what keeps the arc length
 * equal to the text width. (A chord tilted by the sagitta would span more than
 * `2r·sin(sweep/2)` and stretch the run.) `up` puts the endpoints on the box's
 * bottom edge (the arc bulges to the top), `down` puts them on the top edge
 * (the arc dips to the bottom).
 */
export function buildArcPathData({ textWidth, direction, amount }: ArcPathInput): ArcPathGeometry {
  const width = Math.max(1, textWidth);
  const sweep = (arcSweepDegrees(amount) * Math.PI) / 180;
  const radius = width / sweep;
  const half = sweep / 2;
  const chord = 2 * radius * Math.sin(half);
  const sagitta = radius * (1 - Math.cos(half));
  const r = round2(radius);
  const c = round2(chord);
  const s = round2(sagitta);

  // Sweep flag 1 bulges over the chord (rainbow); 0 dips under it (valley).
  const d =
    direction === 'up'
      ? `M 0 ${s} A ${r} ${r} 0 0 1 ${c} ${s}`
      : `M 0 0 A ${r} ${r} 0 0 0 ${c} 0`;

  return { d, width: round2(chord), height: round2(sagitta) };
}

export interface TextMetricsInput {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
}

let measureContext: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext;

  if (typeof document === 'undefined') {
    measureContext = null;

    return measureContext;
  }

  const canvas = document.createElement('canvas');
  measureContext = canvas.getContext('2d') ?? null;

  return measureContext;
}

/**
 * Width of one line of text at the object's font. Browsers measure for real;
 * an environment without a 2D context (SSR, unit tests) falls back to a
 * deterministic estimate so the arc still gets a usable box. The canvas waits
 * for `document.fonts` before the export, so the measured width matches what
 * the renderer draws.
 */
export function measureTextWidth({ text, fontFamily, fontSize, fontWeight }: TextMetricsInput): number {
  const context = getMeasureContext();

  if (!context) {
    // Average glyph width of the system sans stacks, per em.
    return Math.max(1, text.length * fontSize * 0.55);
  }

  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  return Math.max(1, context.measureText(text).width);
}

/** Document box of an arc text: the arc's own bounding box, padded a little. */
export function arcTextBox(
  metrics: TextMetricsInput,
  arc: TextArc,
): { width: number; height: number; geometry: ArcPathGeometry } {
  const geometry = buildArcPathData({
    textWidth: measureTextWidth(metrics),
    direction: arc.direction,
    amount: arc.amount,
  });

  return { width: geometry.width, height: geometry.height, geometry };
}
