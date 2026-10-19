import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_SCHEMA_VERSION,
  DocumentParseError,
  SUPPORTED_SCHEMA_VERSIONS,
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
// round-trip also pins those flags. The page carries a gradient, a transition
// and the text an arc and an entrance animation: the v2 features survive the
// round-trip too. The shape carries the star/polygon parameters of v2 (inert
// on a rect, but present on every shape the current writer produces).
const workedDocument: FremitDocument = {
  schemaVersion: DOCUMENT_SCHEMA_VERSION,
  pages: [
    {
      id: 'page-1',
      name: 'Poster',
      width: 1080,
      height: 1080,
      background: { kind: 'gradient', from: '#f5f0e8', to: '#1f6feb', angle: 135 },
      transition: { preset: 'dip', durationMs: 600, easing: 'easeInOut', direction: 'up' },
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
          arc: { direction: 'up', amount: 0.6 },
          animation: { preset: 'typewriter', durationMs: 900, easing: 'linear', direction: 'left' },
        },
      ],
    },
  ],
};

// v1 document (the schema before curved text and background kinds): one page
// with a solid color and a straight text — the shape the migration must read.
const v1Document = {
  schemaVersion: 1,
  pages: [
    {
      id: 'page-1',
      name: 'Poster',
      width: 1080,
      height: 1080,
      background: '#f5f0e8',
      objects: [
        {
          type: 'text',
          id: 'object-text',
          name: 'Headline',
          x: 80,
          y: 840,
          width: 920,
          height: 140,
          rotation: 0,
          opacity: 1,
          visible: true,
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

  it('keeps the v2 page fill and the text arc exact', () => {
    const reloaded = parseDocument(serializeDocument(workedDocument));
    const text = reloaded.pages[0].objects[2];

    expect(reloaded.pages[0].background).toEqual({
      kind: 'gradient',
      from: '#f5f0e8',
      to: '#1f6feb',
      angle: 135,
    });
    expect(text.type === 'text' && text.arc).toEqual({ direction: 'up', amount: 0.6 });
  });

  it('keeps the v2 animation and the page transition exact', () => {
    const reloaded = parseDocument(serializeDocument(workedDocument));
    const [image, shape, text] = reloaded.pages[0].objects;

    expect(reloaded.pages[0].transition).toEqual({
      preset: 'dip',
      durationMs: 600,
      easing: 'easeInOut',
      direction: 'up',
    });
    expect(image.animation).toBeNull();
    expect(shape.animation).toEqual({
      preset: 'rise',
      durationMs: 500,
      easing: 'easeOut',
      direction: 'up',
    });
    expect(text.animation).toEqual({
      preset: 'typewriter',
      durationMs: 900,
      easing: 'linear',
      direction: 'left',
    });
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

  function mutateDocument(mutate: (document: Record<string, unknown>) => void): string {
    const copy = JSON.parse(serializeDocument(workedDocument)) as Record<string, unknown>;
    mutate(copy);

    return JSON.stringify(copy);
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

  it('reads a v2 text without the arc field as straight instead of rejecting it', () => {
    const withoutArc = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      delete objects[2].arc;
    });

    expect(parseErrorCode(withoutArc)).toBe('no-error');

    const text = parseDocument(withoutArc).pages[0].objects[2];
    expect(text.type === 'text' && text.arc).toBeNull();
  });

  it('rejects an arc of an unknown direction or out of range', () => {
    const badDirection = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      objects[2].arc = { direction: 'sideways', amount: 0.5 };
    });
    const badAmount = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      objects[2].arc = { direction: 'up', amount: 2 };
    });

    expect(parseErrorCode(badDirection)).toBe('invalid-structure');
    expect(parseErrorCode(badAmount)).toBe('invalid-structure');
  });

  it('rejects an object animation with an unknown preset, easing, direction or duration', () => {
    const withAnimation = (animation: unknown) =>
      mutateDocument((document) => {
        const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
        objects[1].animation = animation;
      });
    const valid = { preset: 'fade', durationMs: 600, easing: 'easeOut', direction: 'up' };

    expect(parseErrorCode(withAnimation(valid))).toBe('no-error');
    expect(parseErrorCode(withAnimation({ ...valid, preset: 'explode' }))).toBe('invalid-structure');
    expect(parseErrorCode(withAnimation({ ...valid, easing: 'bouncy' }))).toBe('invalid-structure');
    expect(parseErrorCode(withAnimation({ ...valid, direction: 'diagonal' }))).toBe('invalid-structure');
    expect(parseErrorCode(withAnimation({ ...valid, durationMs: 5 }))).toBe('invalid-structure');
    expect(parseErrorCode(withAnimation({ ...valid, durationMs: 60_000 }))).toBe('invalid-structure');
  });

  it('reads a v2 object without the animation field as static instead of rejecting it', () => {
    const withoutAnimation = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      delete objects[1].animation;
      delete objects[2].animation;
    });

    expect(parseErrorCode(withoutAnimation)).toBe('no-error');

    const [image, shape, text] = parseDocument(withoutAnimation).pages[0].objects;
    expect(shape.animation).toBeNull();
    expect(text.animation).toBeNull();
    expect(image.animation).toBeNull();
  });

  it('rejects a page transition of an unknown preset and reads a missing one as None', () => {
    const badPreset = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].transition = {
        preset: 'teleport',
        durationMs: 500,
        easing: 'linear',
        direction: 'left',
      };
    });
    const missing = mutateDocument((document) => {
      delete (document.pages as Record<string, unknown>[])[0].transition;
    });

    expect(parseErrorCode(badPreset)).toBe('invalid-structure');
    expect(parseErrorCode(missing)).toBe('no-error');
    expect(parseDocument(missing).pages[0].transition).toBeNull();
  });

  it('rejects a shape kind outside the contract and accepts every known kind', () => {
    const unknownShape = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      objects[1].shape = 'hexagon';
    });
    const validKinds = mutateDocument((document) => {
      const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
      objects[1].shape = 'star';
    });

    expect(parseErrorCode(unknownShape)).toBe('invalid-structure');
    expect(parseErrorCode(validKinds)).toBe('no-error');
  });

  it('rejects star/polygon parameters outside their ranges', () => {
    const withShapeField = (field: 'sides' | 'innerRadius', value: unknown) =>
      mutateDocument((document) => {
        const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
        objects[1].shape = 'star';
        objects[1][field] = value;
      });

    expect(parseErrorCode(withShapeField('sides', 2))).toBe('invalid-structure');
    expect(parseErrorCode(withShapeField('sides', 17))).toBe('invalid-structure');
    expect(parseErrorCode(withShapeField('sides', 'five'))).toBe('invalid-structure');
    expect(parseErrorCode(withShapeField('innerRadius', -0.1))).toBe('invalid-structure');
    expect(parseErrorCode(withShapeField('innerRadius', 1.5))).toBe('invalid-structure');
    expect(parseErrorCode(withShapeField('sides', 16))).toBe('no-error');
    expect(parseErrorCode(withShapeField('innerRadius', 0))).toBe('no-error');
  });

  it('rounds the side count at the boundary, so stored equals rendered', () => {
    const withSides = (sides: number) =>
      mutateDocument((document) => {
        const objects = (document.pages as { objects: Record<string, unknown>[] }[])[0].objects;
        objects[1].shape = 'star';
        objects[1].sides = sides;
      });

    const rounded = parseDocument(withSides(6.4)).pages[0].objects[1];
    expect(rounded.type === 'shape' && rounded.sides).toBe(6);

    // The schema ceiling still applies to the stored number; the boundary only
    // canonicalizes what every renderer would round anyway.
    const nearCeiling = parseDocument(withSides(15.6)).pages[0].objects[1];
    expect(nearCeiling.type === 'shape' && nearCeiling.sides).toBe(16);

    // A loaded document is already canonical: writing it back changes nothing.
    const once = parseDocument(withSides(6.4));
    expect(parseDocument(serializeDocument(once))).toEqual(once);
  });

  it('rejects a page background of an unknown kind or shape', () => {
    const unknownKind = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].background = { kind: 'video' };
    });
    const missingColor = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].background = { kind: 'solid' };
    });
    const badGradient = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].background = {
        kind: 'gradient',
        from: '#ffffff',
        to: '#000000',
        angle: 'wide',
      };
    });

    expect(parseErrorCode(unknownKind)).toBe('invalid-structure');
    expect(parseErrorCode(missingColor)).toBe('invalid-structure');
    expect(parseErrorCode(badGradient)).toBe('invalid-structure');
  });

  it('accepts every background kind and wraps a gradient angle into range', () => {
    const image = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].background = {
        kind: 'image',
        src: onePixelPng,
      };
    });
    const wrapped = mutateDocument((document) => {
      (document.pages as Record<string, unknown>[])[0].background = {
        kind: 'gradient',
        from: '#ffffff',
        to: '#000000',
        angle: 495,
      };
    });

    expect(parseErrorCode(image)).toBe('no-error');
    expect(parseDocument(wrapped).pages[0].background).toEqual({
      kind: 'gradient',
      from: '#ffffff',
      to: '#000000',
      angle: 135,
    });
  });
});
