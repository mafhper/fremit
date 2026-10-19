/**
 * Fabric adapter of the exporter: builds a throwaway `StaticCanvas` from one
 * page of the Documento JSON and turns it into a raster blob or SVG markup.
 *
 * The live canvas is never read. Objects come from the JSON through the same
 * codec the editor uses, which is what keeps an export identical to what the
 * canvas shows. The canvas is disposed after each export — it exists only for
 * the length of the render.
 *
 * Written from scratch for Fremit over the Fabric API; no code copied from any
 * reference editor.
 */

import { FabricImage, StaticCanvas } from 'fabric';
import type { DocumentPage, ImageObject } from '@/lib/document';
import { objectsForExport, type ExportFormatId } from '@/lib/export/formats';
import { repairFabricSvgAttributes } from '@/lib/export/svgMarkup';
import { CANVAS_CODECS, createPageBackgroundRect, fitImageCover } from '@/lib/fabricCodec';
import { safePageColor, imageBackgroundSurface } from '@/lib/pageBackground';

export type RasterFormat = 'png' | 'jpeg' | 'webp';

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Render handler: one page of the JSON in, one file out. `quality` is the
 * 0..1 encoding quality for the lossy formats; PNG and SVG ignore it.
 */
export type PageRenderHandler = (
  page: DocumentPage,
  scale: number,
  quality?: number,
) => Promise<RenderedPage>;

export type ExportRenderers = Record<ExportFormatId, PageRenderHandler>;

/** Default encoding quality of the lossy raster exports (PNG ignores it). */
export const JPEG_QUALITY = 0.92;
export const WEBP_QUALITY = 0.92;

let webpEncodeSupport: boolean | null = null;

/**
 * Whether this browser can encode WebP through the canvas (`toBlob` and
 * `toDataURL` share the encoder). The probe is a 1x1 canvas answered once and
 * cached — the capability does not change over a session. The exporter falls
 * back to PNG when this is false (ADR-007), so a `.webp` file never ships
 * substituted PNG bytes; jsdom and other canvas-less DOMs answer false.
 */
export function supportsWebpEncoding(): boolean {
  if (webpEncodeSupport !== null) return webpEncodeSupport;

  if (typeof document === 'undefined') {
    webpEncodeSupport = false;
    return webpEncodeSupport;
  }

  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const dataUrl = probe.toDataURL('image/webp');
    webpEncodeSupport = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/webp');
  } catch {
    webpEncodeSupport = false;
  }

  return webpEncodeSupport;
}

/** Webfont metrics only settle once the fonts are loaded; export waits for them. */
async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  await document.fonts.ready;
}

/**
 * Same behavior as the canvas: a source that fails to load is skipped instead
 * of failing the whole export (the canvas keeps the page without it too).
 */
async function loadImage(object: ImageObject): Promise<FabricImage | null> {
  try {
    const image = await FabricImage.fromURL(object.src, { crossOrigin: 'anonymous' });
    CANVAS_CODECS.image.applyGeometry(image, object, {
      width: image.width,
      height: image.height,
    });

    return image;
  } catch (error) {
    console.warn('Export: image source could not be loaded', error);

    return null;
  }
}

/** Image page fill: cover-fitted to the page, same as the live canvas. */
async function loadBackgroundImage(page: DocumentPage): Promise<FabricImage | null> {
  const surface = imageBackgroundSurface(page);

  if (!surface) return null;

  try {
    const image = await FabricImage.fromURL(surface.src, { crossOrigin: 'anonymous' });
    fitImageCover(image, surface, { width: image.width, height: image.height });

    return image;
  } catch (error) {
    console.warn('Export: background image could not be loaded', error);

    return null;
  }
}

async function buildPageCanvas(page: DocumentPage): Promise<StaticCanvas> {
  const canvas = new StaticCanvas(undefined, {
    width: page.width,
    height: page.height,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
  });

  const background = page.background;

  if (background.kind === 'solid') {
    // The export is a render boundary too: a hand-edited color never reaches
    // the canvas background (and, through it, the SVG markup).
    canvas.backgroundColor = safePageColor(background.color);
  } else if (background.kind === 'gradient') {
    // The rect *is* the page fill here, so it belongs in the export.
    canvas.add(createPageBackgroundRect(page, { excludeFromExport: false }));
  } else {
    const backgroundImage = await loadBackgroundImage(page);
    if (backgroundImage) canvas.add(backgroundImage);
  }

  // Objects resolve in parallel — the image sources are independent — and are
  // added once resolved, in document order, so z-order is untouched (bottom
  // layer first) and one slow image no longer serializes the others.
  const resolved = await Promise.all(
    objectsForExport(page).map(async (docObject) => {
      if (docObject.type === 'image') {
        return loadImage(docObject);
      }

      return CANVAS_CODECS[docObject.type].create?.(docObject) ?? null;
    }),
  );

  for (const object of resolved) {
    if (object) canvas.add(object);
  }

  return canvas;
}

/**
 * PNG/JPG/WebP at `page size × scale` pixels. `quality` (0..1) overrides the
 * lossy default for WebP/JPG; PNG always encodes losslessly.
 */
export async function renderPageRaster(
  page: DocumentPage,
  scale: number,
  format: RasterFormat,
  quality?: number,
): Promise<RenderedPage> {
  await waitForFonts();
  const canvas = await buildPageCanvas(page);

  try {
    const blob = await canvas.toBlob({
      multiplier: scale,
      format,
      quality:
        format === 'png'
          ? 1
          : quality ?? (format === 'jpeg' ? JPEG_QUALITY : WEBP_QUALITY),
    });

    if (!blob) {
      throw new Error(`the browser could not encode the ${format} export`);
    }

    // A browser without WebP encoding answers `toBlob` with PNG (the canvas
    // spec falls back to PNG for an unsupported type): refuse the substituted
    // bytes instead of writing them into a `.webp` file. The exporter's
    // capability probe (ADR-007) keeps this path unreachable in practice.
    if (format === 'webp' && blob.type !== 'image/webp') {
      throw new Error(`the browser encoded the webp export as ${blob.type}`);
    }

    return {
      blob,
      width: Math.round(page.width * scale),
      height: Math.round(page.height * scale),
    };
  } finally {
    void canvas.dispose();
  }
}

/** SVG markup of the page, at page size (vector output ignores the scale). */
export async function renderPageSvg(page: DocumentPage): Promise<string> {
  await waitForFonts();
  const canvas = await buildPageCanvas(page);

  try {
    return repairFabricSvgAttributes(canvas.toSVG());
  } finally {
    void canvas.dispose();
  }
}
