/**
 * Format registry of the client-side exporter: the single map the orchestrator
 * dispatches through. Each entry renders one page of the Documento JSON into a
 * file — WebP, PNG and JPG through the raster renderer, SVG through Fabric's
 * SVG serializer (which emits `<image>` and `<text>` for image and text
 * objects).
 *
 * A new export format lands in exactly one place: one entry here plus its
 * catalog line in `formats.ts`.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import {
  renderPageRaster,
  renderPageSvg,
  type ExportRenderers,
} from '@/lib/export/renderPage';

export const FORMAT_RENDERERS: ExportRenderers = {
  webp: (page, scale, quality) => renderPageRaster(page, scale, 'webp', quality),
  png: (page, scale) => renderPageRaster(page, scale, 'png'),
  jpg: (page, scale, quality) => renderPageRaster(page, scale, 'jpeg', quality),
  svg: async (page) => {
    const svg = await renderPageSvg(page);

    return {
      blob: new Blob([svg], { type: 'image/svg+xml' }),
      width: page.width,
      height: page.height,
    };
  },
};
