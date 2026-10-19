import { describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  createPage,
  createTextObject,
  type FremitDocument,
} from '@/lib/document';
import {
  ExportError,
  MAX_EXPORT_SCALE,
  exportPage,
  type ExportArtifact,
} from '@/lib/export/exporter';
import type { ExportFormatId } from '@/lib/export/formats';
import type { ExportRenderers } from '@/lib/export/renderPage';

// Worked fixture: a poster page named after the starter document, so the
// filename assertion has an independent expected value.
function fixture(): { document: FremitDocument; firstPageId: string; secondPageId: string } {
  const first = createPage({ name: 'Poster' });
  first.objects.push(createTextObject('Fremit 1.0'));

  const second = createPage({ name: 'Banner' });
  second.objects.push(createTextObject('Wide'));

  const document = createDocument([first, second]);

  return { document, firstPageId: first.id, secondPageId: second.id };
}

/**
 * Renderer stubs with distinctive output sizes: if the artifact reports the
 * renderer's numbers, the orchestrator is passing them through instead of
 * recomputing them from the page.
 */
function stubRenderers(blob: Blob): ExportRenderers {
  const rendered = async () => ({ blob, width: 21, height: 42 });

  return {
    webp: vi.fn(rendered),
    png: vi.fn(rendered),
    jpg: vi.fn(rendered),
    svg: vi.fn(rendered),
  };
}

async function exportFailureOf(promise: Promise<ExportArtifact>): Promise<ExportError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ExportError) return error;
    throw error;
  }

  throw new Error('expected the export to fail');
}

describe('export orchestrator', () => {
  it('dispatches the requested page to the format renderer', async () => {
    const { document, secondPageId } = fixture();
    const blob = new Blob(['png']);
    const renderers = stubRenderers(blob);

    const artifact = await exportPage(document, secondPageId, 'png', { renderers });

    expect(renderers.png).toHaveBeenCalledTimes(1);
    expect(renderers.png).toHaveBeenCalledWith(document.pages[1], 1, undefined);
    expect(renderers.jpg).not.toHaveBeenCalled();
    expect(renderers.svg).not.toHaveBeenCalled();
    expect(renderers.webp).not.toHaveBeenCalled();
    expect(artifact).toEqual({
      format: 'png',
      filename: 'banner.png',
      mimeType: 'image/png',
      blob,
      width: 21,
      height: 42,
    });
  });

  it('passes the requested scale to the raster renderer', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['jpg']));

    await exportPage(document, firstPageId, 'jpg', { renderers, scale: 3 });

    expect(renderers.jpg).toHaveBeenCalledWith(document.pages[0], 3, undefined);
  });

  it('dispatches WebP through the WebP renderer with the requested scale', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['webp']));

    const artifact = await exportPage(document, firstPageId, 'webp', {
      renderers,
      supportsWebp: () => true,
      scale: 2,
    });

    expect(renderers.webp).toHaveBeenCalledTimes(1);
    expect(renderers.webp).toHaveBeenCalledWith(document.pages[0], 2, undefined);
    expect(renderers.png).not.toHaveBeenCalled();
    expect(artifact.format).toBe('webp');
    expect(artifact.filename).toBe('poster.webp');
    expect(artifact.mimeType).toBe('image/webp');
  });

  it('falls back to the PNG renderer when the browser cannot encode WebP', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['png']));

    const artifact = await exportPage(document, firstPageId, 'webp', {
      renderers,
      supportsWebp: () => false,
    });

    expect(renderers.png).toHaveBeenCalledTimes(1);
    expect(renderers.webp).not.toHaveBeenCalled();
    // The swap is visible to the caller: format, filename and mime stay
    // consistent with the bytes instead of a `.webp` file holding PNG data.
    expect(artifact.format).toBe('png');
    expect(artifact.filename).toBe('poster.png');
    expect(artifact.mimeType).toBe('image/png');
  });

  it('passes the requested quality to the lossy renderer', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['webp']));

    await exportPage(document, firstPageId, 'webp', {
      renderers,
      supportsWebp: () => true,
      quality: 0.8,
    });

    expect(renderers.webp).toHaveBeenCalledWith(document.pages[0], 1, 0.8);
  });

  it.each([0, -0.5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'lets the renderer default the quality when it is invalid (%s)',
    async (quality) => {
      const { document, firstPageId } = fixture();
      const renderers = stubRenderers(new Blob(['jpg']));

      await exportPage(document, firstPageId, 'jpg', { renderers, quality });

      expect(renderers.jpg).toHaveBeenCalledWith(document.pages[0], 1, undefined);
    },
  );

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to 1x when the requested scale is invalid (%s)',
    async (scale) => {
      const { document, firstPageId } = fixture();
      const renderers = stubRenderers(new Blob(['png']));

      await exportPage(document, firstPageId, 'png', { renderers, scale });

      expect(renderers.png).toHaveBeenCalledWith(document.pages[0], 1, undefined);
    },
  );

  it.each([4, 100])(
    'clamps a raster scale above the ceiling to the documented 3x (%s)',
    async (scale) => {
      const { document, firstPageId } = fixture();
      const renderers = stubRenderers(new Blob(['png']));

      await exportPage(document, firstPageId, 'png', { renderers, scale });

      expect(MAX_EXPORT_SCALE).toBe(3);
      expect(renderers.png).toHaveBeenCalledWith(document.pages[0], 3, undefined);
    },
  );

  it('rejects a renderer override that misses the requested format', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['png']));
    delete (renderers as Partial<ExportRenderers>).jpg;

    const failure = await exportFailureOf(exportPage(document, firstPageId, 'jpg', { renderers }));

    expect(failure.code).toBe('missing-renderer');
    expect(renderers.png).not.toHaveBeenCalled();
  });

  it('names the file after the page and the format extension', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['svg']));

    const artifact = await exportPage(document, firstPageId, 'svg', { renderers });

    expect(artifact.filename).toBe('poster.svg');
    expect(artifact.mimeType).toBe('image/svg+xml');
  });

  it('rejects an unknown page before any renderer runs', async () => {
    const { document } = fixture();
    const renderers = stubRenderers(new Blob(['x']));

    const failure = await exportFailureOf(
      exportPage(document, 'missing-page', 'png', { renderers }),
    );

    expect(failure.code).toBe('unknown-page');
    expect(renderers.png).not.toHaveBeenCalled();
  });

  it('rejects an unknown format before any renderer runs', async () => {
    const { document, firstPageId } = fixture();
    const renderers = stubRenderers(new Blob(['x']));

    const failure = await exportFailureOf(
      exportPage(document, firstPageId, 'pdf' as ExportFormatId, { renderers }),
    );

    expect(failure.code).toBe('unknown-format');
    expect(renderers.png).not.toHaveBeenCalled();
  });
});
