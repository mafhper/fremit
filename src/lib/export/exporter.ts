/**
 * Export orchestrator: resolves a page of the Documento JSON, dispatches to
 * the format registry and returns the file plus its metadata.
 *
 * Nothing here reads the live canvas or the DOM — the JSON is the only input,
 * so a saved document exports the same way it was saved. The orchestrator owns
 * the page/format resolution and the filename; the renderers own the pixels.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import type { FremitDocument } from '@/lib/document';
import { EXPORT_FORMATS, buildExportFilename, type ExportFormatId } from '@/lib/export/formats';
import { FORMAT_RENDERERS } from '@/lib/export/registry';
import { supportsWebpEncoding, type ExportRenderers } from '@/lib/export/renderPage';

export type ExportErrorCode = 'unknown-page' | 'unknown-format' | 'missing-renderer';

/**
 * Largest raster multiplier the renderers accept. The panel offers 1x–3x and
 * the ceiling matches its top option: a 1080² page at 3x is already ~10 MP,
 * while an unbounded multiplier (scale 100 ≈ 100 MP) is a one-argument way to
 * ask for a canvas that cannot be allocated.
 */
export const MAX_EXPORT_SCALE = 3;

export class ExportError extends Error {
  readonly code: ExportErrorCode;

  constructor(code: ExportErrorCode, message: string) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
  }
}

export interface ExportArtifact {
  format: ExportFormatId;
  filename: string;
  mimeType: string;
  blob: Blob;
  /** Pixel size of raster output; page size for SVG. */
  width: number;
  height: number;
}

export interface ExportOptions {
  /**
   * Raster multiplier (1x–3x); the vector format ignores it. Values above
   * MAX_EXPORT_SCALE clamp to it — an unbounded multiplier would ask for a
   * gigapixel canvas. Anything that is not a positive finite number (0,
   * negatives, NaN, Infinity) falls back to 1.
   */
  scale?: number;
  /**
   * Encoding quality 0..1 for the lossy formats (WebP, JPEG); PNG and SVG
   * ignore it. Anything outside the range (0, negatives, NaN, Infinity, >1)
   * falls back to the renderer's default.
   */
  quality?: number;
  /**
   * Renderer override, for tests; defaults to the real registry. The override
   * must cover the requested format — a missing entry fails with a
   * `missing-renderer` ExportError instead of a TypeError.
   */
  renderers?: ExportRenderers;
  /**
   * WebP capability probe, for tests; defaults to the browser sniff. A browser
   * that cannot encode WebP gets the PNG renderer instead, and the artifact
   * reports `format: 'png'` — the caller sees the swap instead of a `.webp`
   * file holding PNG bytes (ADR-007).
   */
  supportsWebp?: () => boolean;
}

/**
 * Raster multiplier the renderers accept: positive, finite and capped at
 * MAX_EXPORT_SCALE; anything else (0, negatives, NaN, Infinity) falls back to
 * 1x.
 */
function normalizeScale(scale: number | undefined): number {
  if (typeof scale === 'number' && Number.isFinite(scale) && scale > 0) {
    return Math.min(scale, MAX_EXPORT_SCALE);
  }

  return 1;
}

/** Lossy quality in (0, 1]; anything else lets the renderer pick its default. */
function normalizeQuality(quality: number | undefined): number | undefined {
  if (typeof quality === 'number' && Number.isFinite(quality) && quality > 0 && quality <= 1) {
    return quality;
  }

  return undefined;
}

export async function exportPage(
  document: FremitDocument,
  pageId: string,
  format: ExportFormatId,
  options: ExportOptions = {},
): Promise<ExportArtifact> {
  const page = document.pages.find((candidate) => candidate.id === pageId);

  if (!page) {
    throw new ExportError('unknown-page', `page not found: ${pageId}`);
  }

  const requested = EXPORT_FORMATS.find((candidate) => candidate.id === format);

  if (!requested) {
    throw new ExportError('unknown-format', `unknown export format: ${String(format)}`);
  }

  // WebP fallback: without browser support the PNG definition answers instead,
  // so the file, the extension and the mime type all stay consistent.
  const canEncodeWebp = options.supportsWebp ?? supportsWebpEncoding;
  const definition =
    requested.id === 'webp' && !canEncodeWebp()
      ? EXPORT_FORMATS.find((candidate) => candidate.id === 'png') ?? requested
      : requested;

  const render = (options.renderers ?? FORMAT_RENDERERS)[definition.id];

  if (typeof render !== 'function') {
    throw new ExportError('missing-renderer', `no renderer for export format: ${definition.id}`);
  }

  const rendered = await render(
    page,
    normalizeScale(options.scale),
    normalizeQuality(options.quality),
  );

  return {
    format: definition.id,
    filename: buildExportFilename(page.name, definition.extension),
    mimeType: definition.mimeType,
    blob: rendered.blob,
    width: rendered.width,
    height: rendered.height,
  };
}
