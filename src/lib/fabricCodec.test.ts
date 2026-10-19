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

describe('canvas codec: shapes', () => {
  it('creates a rect that carries the box, the corners and the stroke', () => {
    const doc = createShapeObject('rect', {
      id: 'shape-rect',
      x: 12,
      y: 34,
      width: 200,
      height: 80,
      cornerRadius: 6,
      fill: '#112233',
      stroke: '#445566',
      strokeWidth: 5,
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Rect)) throw new Error('the rect must be a Fabric Rect');

    expect(created.width).toBe(200);
    expect(created.height).toBe(80);
    expect(created.rx).toBe(6);
    expect(created.ry).toBe(6);
    expect(created.fill).toBe('#112233');
    expect(created.stroke).toBe('#445566');
    expect(created.strokeWidth).toBe(5);
    expect(CANVAS_CODECS.shape.readGeometry(created, doc)).toMatchObject({
      type: 'shape',
      x: 12,
      y: 34,
      width: 200,
      height: 80,
    });
  });

  it('creates an ellipse with the document stroke instead of dropping it', () => {
    const doc = createShapeObject('ellipse', {
      id: 'shape-ellipse',
      x: 40,
      y: 50,
      width: 200,
      height: 100,
      fill: '#112233',
      stroke: '#ff0000',
      strokeWidth: 6,
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Ellipse)) throw new Error('the ellipse must be a Fabric Ellipse');

    expect(created.rx).toBe(100);
    expect(created.ry).toBe(50);
    expect(created.fill).toBe('#112233');
    // The inspector offers the stroke toggle for every filled kind; the canvas
    // build has to carry the pair or the toggle is a silent no-op.
    expect(created.stroke).toBe('#ff0000');
    expect(created.strokeWidth).toBe(6);

    // A document edit reaches the live object through the same branch.
    CANVAS_CODECS.shape.applyGeometry(
      created,
      { ...doc, width: 300, stroke: '#00ff00', strokeWidth: 3 },
      null,
    );

    expect(created.rx).toBe(150);
    expect(created.stroke).toBe('#00ff00');
    expect(created.strokeWidth).toBe(3);
  });

  it('keeps the ellipse stroke through a document -> canvas -> document round-trip', () => {
    const doc = createShapeObject('ellipse', {
      id: 'shape-ellipse',
      width: 200,
      height: 100,
      stroke: '#ff0000',
      strokeWidth: 6,
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Ellipse)) throw new Error('the ellipse must be a Fabric Ellipse');

    // The canvas read returns the geometry patch; applied to the page, it must
    // leave the stroke the document already owns in place.
    const page = { ...createPage(), objects: [doc] };
    const patch = CANVAS_CODECS.shape.readGeometry(created, doc);
    const edited = updateObjectInPage(page, doc.id, patch).objects[0] as ShapeObject;

    expect(edited).toMatchObject({ stroke: '#ff0000', strokeWidth: 6 });
  });

  it('creates a star as a normalized polygon scaled into the document box', () => {
    const doc = createShapeObject('star', {
      id: 'shape-star',
      x: 100,
      y: 200,
      width: 432,
      height: 216,
      sides: 7,
      innerRadius: 0.35,
      fill: '#112233',
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Polygon)) throw new Error('the star must be a Fabric Polygon');

    // The points live in the normalized box; the document box is the scale.
    expect(created.width).toBe(100);
    expect(created.height).toBe(100);
    expect(created.scaleX).toBeCloseTo(4.32, 5);
    expect(created.scaleY).toBeCloseTo(2.16, 5);
    expect(created.points).toHaveLength(14);

    // The canvas -> document read gives the box back, so the first commit
    // after any interaction cannot shrink the shape to the normalized box.
    expect(CANVAS_CODECS.shape.readGeometry(created, doc)).toMatchObject({
      type: 'shape',
      x: 100,
      y: 200,
      width: 432,
      height: 216,
    });
  });

  it('keeps a star resize through normalize + read', () => {
    const doc = createShapeObject('star', { id: 'shape-star', width: 400, height: 400 });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Polygon)) throw new Error('the star must be a Fabric Polygon');

    // What a drag does: the scale grows over the normalized box.
    created.set({ scaleX: (created.scaleX ?? 1) * 1.5, scaleY: (created.scaleY ?? 1) * 0.75 });
    CANVAS_CODECS.shape.normalizeGeometry(created, doc, null);

    const patch = CANVAS_CODECS.shape.readGeometry(created, doc);

    expect(patch.width).toBeCloseTo(600, 5);
    expect(patch.height).toBeCloseTo(300, 5);
  });

  it('recomputes the star points when the parameters change', () => {
    const doc = createShapeObject('star', { id: 'shape-star', sides: 5, innerRadius: 0.5 });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Polygon)) throw new Error('the star must be a Fabric Polygon');

    expect(created.points).toHaveLength(10);

    CANVAS_CODECS.shape.applyGeometry(created, { ...doc, sides: 8, innerRadius: 0.3 }, null);

    expect(created.points).toHaveLength(16);
    expect(created.width).toBe(100);
  });

  it('creates a polygon with one vertex per side', () => {
    const doc = createShapeObject('polygon', { id: 'shape-polygon', sides: 6 });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Polygon)) throw new Error('the polygon must be a Fabric Polygon');

    expect(created.points).toHaveLength(6);
  });

  it('creates a triangle that carries the document box directly', () => {
    const doc = createShapeObject('triangle', {
      id: 'shape-triangle',
      x: 30,
      y: 40,
      width: 120,
      height: 90,
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Triangle)) throw new Error('the triangle must be a Fabric Triangle');

    expect(created.width).toBe(120);
    expect(created.height).toBe(90);

    // A canvas resize bakes into width/height like a rect.
    created.set({ scaleX: 2, scaleY: 0.5 });
    CANVAS_CODECS.shape.normalizeGeometry(created, doc, null);
    expect(created.width).toBe(240);
    expect(created.height).toBe(45);
    expect(CANVAS_CODECS.shape.readGeometry(created, doc)).toMatchObject({
      width: 240,
      height: 45,
    });
  });

  it('creates a line as a stroked polyline over the box diagonal', () => {
    const doc = createShapeObject('line', {
      id: 'shape-line',
      x: 324,
      y: 540,
      width: 432,
      height: 1,
      stroke: '#1f6feb',
      strokeWidth: 4,
    });
    const created = CANVAS_CODECS.shape.create?.(doc);

    if (!(created instanceof Polyline)) throw new Error('the line must be a Fabric Polyline');

    // A line has no fill; its paint is the stroke.
    expect(created.fill).toBeNull();
    expect(created.stroke).toBe('#1f6feb');
    expect(created.strokeWidth).toBe(4);
    expect(created.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);

    expect(CANVAS_CODECS.shape.readGeometry(created, doc)).toMatchObject({
      type: 'shape',
      x: 324,
      y: 540,
      width: 432,
      height: 1,
    });
  });
});
