import { describe, expect, it } from 'vitest';
import {
  createDocument,
  createPage,
  parseDocument,
  serializeDocument,
  type DocumentObject,
} from '@/lib/document';
import { STICKER_PACK, findSticker, type StickerId } from '@/lib/stickers';
import { rotatedBounds } from '@/test/rotatedBounds';

const PAGE = { width: 1080, height: 1080 };

function roundTrip(objects: DocumentObject[]): DocumentObject[] {
  const page = { ...createPage(), objects };
  const parsed = parseDocument(serializeDocument(createDocument([page])));

  return parsed.pages[0].objects;
}

describe('sticker pack', () => {
  it('registers the ten stickers with unique ids', () => {
    expect(STICKER_PACK).toHaveLength(10);
    expect(new Set(STICKER_PACK.map((sticker) => sticker.id)).size).toBe(STICKER_PACK.length);
  });

  it('builds valid objects that survive the document round-trip', () => {
    for (const sticker of STICKER_PACK) {
      const objects = sticker.build(PAGE);

      expect(objects.length, sticker.id).toBeGreaterThan(0);

      for (const object of objects) {
        expect(object.width, `${sticker.id}/${object.name}`).toBeGreaterThan(0);
        expect(object.height, `${sticker.id}/${object.name}`).toBeGreaterThan(0);
      }

      expect(roundTrip(objects), sticker.id).toEqual(objects);
    }
  });

  it('scales with the page instead of hardcoding pixels', () => {
    const sticker = findSticker('star-rating');
    const small = sticker.build({ width: 540, height: 540 });
    const large = sticker.build(PAGE);

    expect(large[0].width).toBeGreaterThan(small[0].width);
    expect(large[0].fontSize).toBeGreaterThan(small[0].fontSize);
  });

  it('keeps every sticker centered and inside the page bounds', () => {
    for (const sticker of STICKER_PACK) {
      const objects = sticker.build(PAGE);

      for (const object of objects) {
        const bounds = rotatedBounds(object);
        const tolerance = 0.5;

        expect(bounds.minX, `${sticker.id}/${object.name}`).toBeGreaterThanOrEqual(-tolerance);
        expect(bounds.minY, `${sticker.id}/${object.name}`).toBeGreaterThanOrEqual(-tolerance);
        expect(bounds.maxX, `${sticker.id}/${object.name}`).toBeLessThanOrEqual(PAGE.width + tolerance);
        expect(bounds.maxY, `${sticker.id}/${object.name}`).toBeLessThanOrEqual(PAGE.height + tolerance);
      }
    }
  });

  it('gives every sticker fresh ids per insert', () => {
    for (const sticker of STICKER_PACK) {
      const first = sticker.build(PAGE);
      const second = sticker.build(PAGE);

      expect(first[0].id, sticker.id).not.toBe(second[0].id);
    }
  });

  it('finds a sticker by id and rejects an unknown one', () => {
    const id: StickerId = 'heart';

    expect(findSticker(id).id).toBe(id);
    expect(() => findSticker('missing' as StickerId)).toThrow(/unknown sticker/);
  });
});
