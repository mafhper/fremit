/**
 * Export format catalog and filename policy for the client-side exporter.
 *
 * This is the registry's vocabulary: one entry per format the exporter can
 * produce (WebP, PNG, JPG and SVG). WebP is the default the panel opens with
 * (ADR-007); PNG/JPG stay as options. Nothing here touches a rendering engine
 * or the DOM — the exporter renders the Documento JSON, so the catalog stays
 * plain data.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import type { DocumentObject, DocumentPage } from '@/lib/document';

export type ExportFormatId = 'webp' | 'png' | 'jpg' | 'svg';

export interface ExportFormatDefinition {
  id: ExportFormatId;
  /** File extension, without the dot. */
  extension: string;
  mimeType: string;
  /** Raster formats honor the export scale; the vector format ignores it. */
  raster: boolean;
  /** Lossy raster formats honor the quality control; PNG and SVG ignore it. */
  lossy: boolean;
}

export const EXPORT_FORMATS: readonly ExportFormatDefinition[] = [
  { id: 'webp', extension: 'webp', mimeType: 'image/webp', raster: true, lossy: true },
  { id: 'png', extension: 'png', mimeType: 'image/png', raster: true, lossy: false },
  { id: 'jpg', extension: 'jpg', mimeType: 'image/jpeg', raster: true, lossy: true },
  { id: 'svg', extension: 'svg', mimeType: 'image/svg+xml', raster: false, lossy: false },
];

/**
 * Format the export panel opens with (ADR-007): WebP is the default; PNG, JPG
 * and SVG are options. The exporter itself has no default — it always renders
 * what the caller asks for — but the panel's initial state and its validation
 * agree on this one constant.
 */
export const DEFAULT_EXPORT_FORMAT_ID: ExportFormatId = 'webp';

/**
 * Resolves a format id to its catalog definition. An id outside the catalog is
 * a bug (the panel only offers catalog entries) and is rejected loudly — same
 * policy as the exporter's `unknown-format` error — instead of being silently
 * coerced to some other format.
 */
export function requireExportFormat(id: string): ExportFormatDefinition {
  const definition = EXPORT_FORMATS.find((candidate) => candidate.id === id);

  if (!definition) {
    throw new Error(`unknown export format: ${id}`);
  }

  return definition;
}

/**
 * Lowercase, filesystem-safe form of a name. Same convention the mockup export
 * uses for its window title, so both export paths name files alike.
 */
export function slugifyFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Download filename for a page: `poster.png`, `my_hero.svg`, ... */
export function buildExportFilename(pageName: string, extension: string): string {
  return `${slugifyFilenamePart(pageName) || 'fremit-page'}.${extension}`;
}

/**
 * Objects the exporter draws: hidden layers stay out. The canvas keeps them in
 * the scene with `visible: false` (Fabric skips them at paint time); the export
 * omits them entirely — Fabric's SVG serializer does not check visibility, so
 * filtering here is what keeps SVG identical to the canvas. Z-order is the
 * document order: index 0 is the bottom layer.
 */
export function objectsForExport(page: DocumentPage): DocumentObject[] {
  return page.objects.filter((object) => object.visible);
}
