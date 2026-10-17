import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_SCHEMA_VERSION,
  DocumentParseError,
  createDocument,
  createImageObject,
  createShapeObject,
  createTextObject,
  parseDocument,
  serializeDocument,
  type DocumentParseErrorCode,
  type FremitDocument,
  type ImageObject,
} from '@/lib/document';

// 1x1 PNG data URL, decoded and verified (PNG signature + IHDR 1x1) — a
// known-good payload in the same shape `src/lib/sourceResolver` produces.
const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Worked example: 1 page, 3 objects — image at the bottom layer, shape in the
// middle, text on top — including a locked layer and a hidden layer, so the
// round-trip also pins those flags.
const workedDocument: FremitDocument = {
  schemaVersion: DOCUMENT_SCHEMA_VERSION,
  pages: [
    {
      id: 'page-1',
      name: 'Poster',
      width: 1080,
      height: 1080,
      background: '#f5f0e8',
      objects: [
        {
          type: 'image',
          id: 'object-image',
          name: 'Screenshot',
          x: 80,
          y: 120,
          width: 920,
          height: 620,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          src: onePixelPng,
          fit: 'cover',
        },
        {
          type: 'shape',
          id: 'object-shape',
          name: 'Accent bar',
          x: 80,
          y: 780,
          width: 480,
          height: 24,
          rotation: 0,
          opacity: 0.9,
          visible: true,
          locked: true,
          shape: 'rect',
          fill: '#1f6feb',
          stroke: null,
          strokeWidth: 0,
          cornerRadius: 12,
        },
        {
          type: 'text',
          id: 'object-text',
          name: 'Headline',
          x: 80,
          y: 840,
          width: 920,
          height: 140,
          rotation: -2,
          opacity: 1,
          visible: false,
          locked: false,
          text: 'Fremit 1.0',
          fontFamily: 'Inter, sans-serif',
          fontSize: 96,
          fontWeight: 700,
          fill: '#111111',
          align: 'center',
        },
      ],
    },
  ],
};

describe('Documento JSON round-trip', () => {
  it('reloads 1 page with 3 objects (text, shape, image) with zero difference', () => {
    const reloaded = parseDocument(serializeDocument(workedDocument));

    // Nothing dropped, nothing altered: the whole document survives.
    expect(reloaded).toEqual(workedDocument);

    // Layer order is the z-order: image (bottom) → shape → text (top).
    expect(reloaded.pages[0].objects.map((object) => object.type)).toEqual([
      'image',
      'shape',
      'text',
    ]);

    // Geometry and flags are exact, not approximate — the data-layer
    // precondition for the engine-level 0 px round-trip acceptance.
    const [image, shape, text] = reloaded.pages[0].objects;
    expect(image.x).toBe(80);
    expect(image.y).toBe(120);
    expect(shape.opacity).toBe(0.9);
    expect(shape.locked).toBe(true);
    expect(text.rotation).toBe(-2);
    expect(text.visible).toBe(false);
    expect(text.fontSize).toBe(96);
  });

  it('keeps the image data URL byte-for-byte', () => {
    const reloaded = parseDocument(serializeDocument(workedDocument));
    const image = reloaded.pages[0].objects.find(
      (object): object is ImageObject => object.type === 'image',
    );

    expect(image?.src).toBe(onePixelPng);
  });

  it('converges to a stable serialized form after the first parse', () => {
    const first = serializeDocument(workedDocument);
    const second = serializeDocument(parseDocument(first));

    expect(serializeDocument(parseDocument(second))).toBe(second);
    expect(parseDocument(second)).toEqual(workedDocument);
  });

  it('builds a valid document from the factories', () => {
    const document = createDocument();
    document.pages[0].objects.push(
      createTextObject('Hello'),
      createShapeObject('ellipse'),
      createImageObject(onePixelPng),
    );

    const reloaded = parseDocument(serializeDocument(document));

    expect(reloaded).toEqual(document);
    expect(reloaded.pages[0].objects.map((object) => object.type)).toEqual([
      'text',
      'shape',
      'image',
    ]);
  });
});

describe('Documento JSON validation', () => {
  function parseErrorCode(
    input: string,
  ): DocumentParseErrorCode | 'no-error' | `unexpected: ${string}` {
    try {
      parseDocument(input);
    } catch (error) {
      return error instanceof DocumentParseError ? error.code : `unexpected: ${String(error)}`;
    }
    return 'no-error';
  }

  it('rejects text that is not JSON', () => {
    expect(parseErrorCode('{ not json')).toBe('invalid-json');
  });

  it('rejects a document from an unknown schema version', () => {
    const future = JSON.stringify({
      ...workedDocument,
      schemaVersion: DOCUMENT_SCHEMA_VERSION + 1,
    });

    expect(parseErrorCode(future)).toBe('unsupported-version');
  });

  it('rejects a document without pages', () => {
    const empty = JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, pages: [] });

    expect(parseErrorCode(empty)).toBe('invalid-structure');
  });

  it('rejects an object of an unknown type', () => {
    const withVideo = JSON.parse(serializeDocument(workedDocument)) as {
      pages: { objects: { type: string }[] }[];
    };
    withVideo.pages[0].objects[0].type = 'video';

    expect(parseErrorCode(JSON.stringify(withVideo))).toBe('unknown-object-type');
  });

  it('rejects an object missing required geometry', () => {
    const missingWidth = JSON.parse(serializeDocument(workedDocument)) as {
      pages: { objects: Record<string, unknown>[] }[];
    };
    delete missingWidth.pages[0].objects[1].width;

    expect(parseErrorCode(JSON.stringify(missingWidth))).toBe('invalid-structure');
  });

  it('rejects opacity outside the 0..1 range', () => {
    const outOfRange = JSON.parse(serializeDocument(workedDocument)) as {
      pages: { objects: { opacity: number }[] }[];
    };
    outOfRange.pages[0].objects[0].opacity = 2;

    expect(parseErrorCode(JSON.stringify(outOfRange))).toBe('invalid-structure');
  });

  it('rejects a text object with fontSize 0', () => {
    const zeroFontSize = JSON.parse(serializeDocument(workedDocument)) as {
      pages: { objects: { fontSize?: number }[] }[];
    };
    zeroFontSize.pages[0].objects[2].fontSize = 0;

    expect(parseErrorCode(JSON.stringify(zeroFontSize))).toBe('invalid-structure');
  });
});
