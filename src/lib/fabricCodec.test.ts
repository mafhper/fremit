import { describe, expect, it } from 'vitest';
import { Ellipse, FabricImage, Gradient, Polygon, Polyline, Rect, Text, Textbox, Triangle } from 'fabric';
import { arcTextBox } from '@/lib/arcText';
import {
  createImageObject,
  createPage,
  createShapeObject,
  createTextObject,
  type ImageObject,
  type ShapeObject,
  type TextArc,
  type TextObject,
} from '@/lib/document';
import { updateObjectInPage } from '@/lib/documentOps';
import { CANVAS_CODECS, createPageBackgroundRect, pageBackgroundFill } from '@/lib/fabricCodec';
import { DEFAULT_PAGE_COLOR } from '@/lib/pageBackground';

/**
 * The codec round-trips through real Fabric objects (they construct without a
 * canvas; measurement falls back to the deterministic estimate in jsdom).
 * These tests pin the canvas -> document read: whatever Fabric reports after
 * an edit must reach the document as the full contract, or the next reconcile
 * reverts the edit.
 */

function arcTextFixture(): TextObject {
  const arc: TextArc = { direction: 'down', amount: 0.6 };
  const object = createTextObject('Curved text', {
    id: 'text-1',
    name: 'Arc down',
    x: 120,
    y: 200,
    fontSize: 60,
    fontWeight: 600,
    fill: '#112233',
    align: 'center',
    arc,
  });
  const box = arcTextBox(
    {
      text: object.text,
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontWeight: object.fontWeight,
    },
    arc,
  );

  return { ...object, width: box.width, height: box.height };
}

function createFrom(object: TextObject): Text | Textbox {
  const created = CANVAS_CODECS.text.create?.(object);

  if (!(created instanceof Text)) throw new Error('the text codec must create a Fabric text');

  return created;
}

describe('canvas codec: text', () => {
  it('reads a curved text edit back as the full contract', () => {
    const doc = arcTextFixture();
    const canvasText = createFrom(doc);

    // What Fabric hands to the commit after an in-place edit plus a resize:
    // the text changed and the scale was baked into the font.
    canvasText.set({ text: 'Edited on canvas' });
    canvasText.set({ fontSize: canvasText.fontSize * 1.5, scaleX: 1, scaleY: 1 });

    const patch = CANVAS_CODECS.text.readGeometry(canvasText, doc);

    expect(patch).toMatchObject({
      type: 'text',
      text: 'Edited on canvas',
      fontFamily: doc.fontFamily,
      fontWeight: 600,
      fill: '#112233',
      align: 'center',
      arc: doc.arc,
    });
    expect(patch.fontSize).toBe(90);

    // The patch is a document write: the edit survives instead of being
    // reverted by the reconcile that follows (the bug: geometry only).
    const page = { ...createPage(), objects: [doc] };
    const edited = updateObjectInPage(page, doc.id, patch).objects[0] as TextObject;

    expect(edited.text).toBe('Edited on canvas');
    expect(edited.fontSize).toBe(90);
    expect(edited.arc).toEqual(doc.arc);
    expect(edited.fill).toBe('#112233');

    // The box follows the arc of the edited text, not the previous render.
    expect(patch.width).toBeGreaterThan(doc.width);
  });

  it('re-flows the arc when a resize bakes the scale into the font', () => {
    const doc = arcTextFixture();
    const canvasText = createFrom(doc);

    canvasText.set({ scaleX: 1.5, scaleY: 1.5 });
    CANVAS_CODECS.text.normalizeGeometry(canvasText, doc, null);

    expect(canvasText.fontSize).toBeCloseTo(90, 5);
    expect(canvasText.scaleY).toBe(1);
    expect(canvasText.path).toBeTruthy();

    // The commit that follows reads the scaled font, so the document gets the
    // resize instead of dropping it.
    expect(CANVAS_CODECS.text.readGeometry(canvasText, doc).fontSize).toBe(90);
  });

  it('reads the straight branch with the full contract too', () => {
    const doc = createTextObject('Hello', {
      id: 'text-2',
      fontSize: 40,
      align: 'right',
      fill: '#445566',
    });
    const box = createFrom(doc);

    expect(box).toBeInstanceOf(Textbox);

    box.set({ text: 'Hello world' });
    const patch = CANVAS_CODECS.text.readGeometry(box, doc);

    expect(patch).toMatchObject({
      type: 'text',
      text: 'Hello world',
      fontFamily: doc.fontFamily,
      fontWeight: doc.fontWeight,
      fill: '#445566',
      align: 'right',
      arc: null,
    });
  });

  it('keeps a negative canvas rotation, rounded to two decimals', () => {
    const doc = arcTextFixture();
    const canvasText = createFrom(doc);

    canvasText.set({ angle: -2.3456 });

    expect(CANVAS_CODECS.text.readGeometry(canvasText, doc).rotation).toBe(-2.35);
  });
});
