/**
 * Page background of the Documento v2: one solid color, one linear gradient or
 * one image per page. The document contract lives in `src/lib/document.ts`;
 * this module holds the pure helpers both the parser and the UI use, so the
 * rules (what a valid background is, how an angle maps to a gradient line, how
 * the paint reads as CSS) exist once.
 *
 * Angles follow the CSS convention: 0deg points up (bottom → top), 90deg
 * points right, 180deg points down. `gradientLine` converts that to the two
 * endpoints a linear gradient needs in page pixels, sized so the line covers
 * the whole box.
 */

import { normalizeHexColor } from '@/lib/colorHex';
import type { PageBackground } from '@/lib/document';
import { isRecord } from '@/lib/guards';
import { round2 } from '@/lib/math';

/**
 * Paint of a page whose stored color is not a complete hex value. The editor
 * only writes `#rgb`/`#rrggbb` (the write path sanitizes), so anything else
 * came from a hand-edited document; the render boundary keeps the default
 * instead of letting the value through.
 */
export const DEFAULT_PAGE_COLOR = '#ffffff';

/** The image fill is always drawn with cover semantics. */
export const IMAGE_BACKGROUND_FIT = 'cover' as const;

/**
 * One page-sized image fill, from one source, for every render surface. The
 * canvas, the thumbnail and the exporter all consume this value, which is what
 * keeps the applied background identical in the three of them — and the preview
 * reads the same source when it frames the anchor format.
 */
export interface ImageBackgroundSurface {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: typeof IMAGE_BACKGROUND_FIT;
}

/** Box of the image fill in page pixels, or `null` for another fill kind. */
export function imageBackgroundSurface(page: {
  width: number;
  height: number;
  background: PageBackground;
}): ImageBackgroundSurface | null {
  if (page.background.kind !== 'image') return null;

  return {
    src: page.background.src,
    x: 0,
    y: 0,
    width: page.width,
    height: page.height,
    fit: IMAGE_BACKGROUND_FIT,
  };
}

/**
 * Anchor aspect of the background preview: the page format the document is in.
 * The preview is a frame around the stored source, so changing the anchor only
 * changes this ratio — the image background itself is not recreated.
 */
export function backgroundPreviewAspect(anchor: { width: number; height: number }): number {
  return anchor.width / anchor.height;
}

/**
 * A color that is safe to interpolate into CSS or SVG markup: a complete hex
 * value, or the default page color. Stored values are kept as written by the
 * tolerant parse, so this is the boundary that decides what actually paints.
 */
export function safePageColor(color: string): string {
  return normalizeHexColor(color) ?? DEFAULT_PAGE_COLOR;
}

function readTrimmedString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  if (typeof value !== 'string' || value.trim() === '') return null;

  return value.trim();
}

/** Any finite angle, wrapped into [0, 360). */
export function normalizeGradientAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0;

  return ((angle % 360) + 360) % 360;
}

/**
 * Tolerant read used by `parseDocument`: anything shaped like a background
 * becomes one; anything else returns `null` and the parser rejects the page.
 * Colors are kept as written — the document stores what it was given, and the
 * editor normalizes on write.
 */
export function parsePageBackground(value: unknown): PageBackground | null {
  if (!isRecord(value)) return null;

  if (value.kind === 'solid') {
    const color = readTrimmedString(value, 'color');

    return color ? { kind: 'solid', color } : null;
  }

  if (value.kind === 'gradient') {
    const from = readTrimmedString(value, 'from');
    const to = readTrimmedString(value, 'to');
    const angle = value.angle;

    if (!from || !to || typeof angle !== 'number' || !Number.isFinite(angle)) return null;

    return { kind: 'gradient', from, to, angle: normalizeGradientAngle(angle) };
  }

  if (value.kind === 'image') {
    const src = readTrimmedString(value, 'src');

    return src ? { kind: 'image', src } : null;
  }

  return null;
}

/**
 * Strict form written by the editor: colors must be complete `#rgb`/`#rrggbb`
 * values and are normalized; the angle is wrapped. `null` means "not a
 * background worth writing" — the caller keeps the stored value.
 */
export function sanitizePageBackground(background: PageBackground): PageBackground | null {
  if (background.kind === 'solid') {
    const color = normalizeHexColor(background.color);

    return color ? { kind: 'solid', color } : null;
  }

  if (background.kind === 'gradient') {
    const from = normalizeHexColor(background.from);
    const to = normalizeHexColor(background.to);

    if (!from || !to) return null;

    return { kind: 'gradient', from, to, angle: normalizeGradientAngle(background.angle) };
  }

  const src = background.src.trim();

  return src ? { kind: 'image', src } : null;
}

export function pageBackgroundsEqual(a: PageBackground, b: PageBackground): boolean {
  if (a.kind !== b.kind) return false;

  if (a.kind === 'solid' && b.kind === 'solid') return a.color === b.color;
  if (a.kind === 'gradient' && b.kind === 'gradient') {
    return a.from === b.from && a.to === b.to && a.angle === b.angle;
  }
  if (a.kind === 'image' && b.kind === 'image') return a.src === b.src;

  return false;
}

/**
 * Two endpoints of the gradient line for a box, in the box's own pixels. The
 * line passes through the center along the CSS angle and is long enough to
 * cover the box on both axes (the standard `linear-gradient` length rule).
 * Coordinates are rounded to two decimals: the trig of the cardinal angles
 * lands on floats like 100.00000000000001, and the SVG/markup should read
 * clean.
 */
export function gradientLine(
  width: number,
  height: number,
  angle: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const radians = (normalizeGradientAngle(angle) * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  const cx = width / 2;
  const cy = height / 2;

  return {
    x1: round2(cx - (dx * length) / 2),
    y1: round2(cy - (dy * length) / 2),
    x2: round2(cx + (dx * length) / 2),
    y2: round2(cy + (dy * length) / 2),
  };
}

/**
 * Escapes a value for a double-quoted CSS string (the one `url("…")` uses):
 * backslashes, quotes and control characters. A raw quote or line break in a
 * stored source would otherwise close the string and let the rest of the value
 * inject declarations.
 */
function escapeCssString(value: string): string {
  let escaped = '';

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;

    if (char === '\\') {
      escaped += '\\\\';
    } else if (char === '"') {
      escaped += '\\"';
    } else if (code < 0x20 || code === 0x7f) {
      escaped += `\\${code.toString(16)} `;
    } else {
      escaped += char;
    }
  }

  return escaped;
}

/**
 * CSS paint of a background: a color, a `linear-gradient(...)` or a `url(...)`.
 * This is a render boundary like `safePageColor`: only a complete hex value or
 * an escaped, quoted URL reaches the markup, never the stored string as-is.
 */
export function pageBackgroundCss(background: PageBackground): string {
  if (background.kind === 'solid') return safePageColor(background.color);

  if (background.kind === 'gradient') {
    const angle = normalizeGradientAngle(background.angle);

    return `linear-gradient(${angle}deg, ${safePageColor(background.from)}, ${safePageColor(background.to)})`;
  }

  return `url("${escapeCssString(background.src)}")`;
}
