import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPORT_FORMAT_ID,
  EXPORT_FORMATS,
  buildExportFilename,
  objectsForExport,
  requireExportFormat,
  slugifyFilenamePart,
} from '@/lib/export/formats';
import {
  createImageObject,
  createPage,
  createShapeObject,
  createTextObject,
} from '@/lib/document';

// 1x1 PNG data URL (known-good, same payload the document tests use).
const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('export format catalog', () => {
  it('declares WebP, PNG, JPG and SVG with extension and mime type', () => {
    expect(EXPORT_FORMATS.map((format) => format.id)).toEqual(['webp', 'png', 'jpg', 'svg']);
    expect(
      EXPORT_FORMATS.map(({ extension, mimeType }) => ({ extension, mimeType })),
    ).toEqual([
      { extension: 'webp', mimeType: 'image/webp' },
      { extension: 'png', mimeType: 'image/png' },
      { extension: 'jpg', mimeType: 'image/jpeg' },
      { extension: 'svg', mimeType: 'image/svg+xml' },
    ]);
  });

  it('marks the raster formats as scalable and the vector format as not', () => {
    expect(EXPORT_FORMATS.filter((format) => format.raster).map((format) => format.id)).toEqual([
      'webp',
      'png',
      'jpg',
    ]);
    expect(EXPORT_FORMATS.find((format) => format.id === 'svg')?.raster).toBe(false);
  });

  it('marks WebP and JPG as lossy and PNG/SVG as not', () => {
    expect(EXPORT_FORMATS.filter((format) => format.lossy).map((format) => format.id)).toEqual([
      'webp',
      'jpg',
    ]);
  });
});

describe('export format lookup', () => {
  it('resolves a catalog id to its full definition', () => {
    expect(requireExportFormat('jpg')).toEqual({
      id: 'jpg',
      extension: 'jpg',
      mimeType: 'image/jpeg',
      raster: true,
      lossy: true,
    });
  });

  it('opens the panel in the documented default format (WebP, ADR-007)', () => {
    expect(DEFAULT_EXPORT_FORMAT_ID).toBe('webp');
    expect(requireExportFormat(DEFAULT_EXPORT_FORMAT_ID).id).toBe('webp');
  });

  it('rejects a value outside the catalog instead of coercing it', () => {
    expect(() => requireExportFormat('pdf')).toThrow('unknown export format: pdf');
  });
});

describe('export filenames', () => {
  it('lowercases and sanitizes the page name', () => {
    expect(buildExportFilename('Poster', 'png')).toBe('poster.png');
    expect(buildExportFilename('My Hero!', 'svg')).toBe('my_hero.svg');
    expect(slugifyFilenamePart('A  B')).toBe('a_b');
  });

  it('falls back when the name has no usable characters', () => {
    expect(buildExportFilename('', 'png')).toBe('fremit-page.png');
    expect(buildExportFilename('???', 'jpg')).toBe('fremit-page.jpg');
  });
});

describe('export object selection', () => {
  it('keeps only visible objects, preserving z-order', () => {
    const page = createPage({ name: 'Poster' });
    const image = createImageObject(onePixelPng, { name: 'Image' });
    const hiddenShape = createShapeObject('rect', { name: 'Hidden', visible: false });
    const text = createTextObject('Title');
    page.objects.push(image, hiddenShape, text);

    const exported = objectsForExport(page);

    expect(exported.map((object) => object.id)).toEqual([image.id, text.id]);
    expect(exported.map((object) => object.type)).toEqual(['image', 'text']);
  });

  it('keeps locked objects: lock is an editing concern, not a render one', () => {
    const page = createPage();
    const locked = createShapeObject('ellipse', { name: 'Locked', locked: true });
    page.objects.push(locked);

    expect(objectsForExport(page).map((object) => object.id)).toEqual([locked.id]);
  });
});
