import { describe, expect, it } from 'vitest';
import { STARTER_IMAGE_SRC, createStarterDocument } from '@/lib/starterDocument';
import { parseDocument, serializeDocument } from '@/lib/document';

describe('starter document', () => {
  it('has one page with three objects: image, shape and text', () => {
    const document = createStarterDocument();
    const page = document.pages[0];

    expect(document.pages).toHaveLength(1);
    expect(page.objects.map((object) => object.type)).toEqual(['image', 'shape', 'text']);
    expect(page.objects.map((object) => object.name)).toEqual([
      'Cover image',
      'Accent bar',
      'Headline',
    ]);
  });

  it('keeps every object inside the page', () => {
    const page = createStarterDocument().pages[0];

    for (const object of page.objects) {
      expect(object.x).toBeGreaterThanOrEqual(0);
      expect(object.y).toBeGreaterThanOrEqual(0);
      expect(object.x + object.width).toBeLessThanOrEqual(page.width);
      expect(object.y + object.height).toBeLessThanOrEqual(page.height);
    }
  });

  it('embeds the image as a data URL and survives the JSON round-trip', () => {
    const document = createStarterDocument();
    const reloaded = parseDocument(serializeDocument(document));

    expect(STARTER_IMAGE_SRC.startsWith('data:image/png;base64,')).toBe(true);
    expect(reloaded).toEqual(document);
  });
});
