import { describe, expect, it } from 'vitest';
import {
  createDocument,
  createPage,
  parseDocument,
  serializeDocument,
  type DocumentPage,
} from '@/lib/document';
import { SHAPE_PRESET_NAMES, createShapePreset } from '@/lib/shapePresets';

describe('shape presets', () => {
  it('centers the default rectangle at 40% of the page with the size radius', () => {
    const shape = createShapePreset('rect', { width: 1080, height: 1080 });

    expect(shape).toMatchObject({
      type: 'shape',
      name: 'Rectangle',
      shape: 'rect',
      x: 324,
      y: 324,
      width: 432,
      height: 432,
      cornerRadius: 52,
    });
  });

  it('scales with the smallest side and centers on both axes', () => {
    const shape = createShapePreset('rect', { width: 1920, height: 1080 });

    // 1080 * 0.4 = 432; (1920 - 432) / 2 = 744, (1080 - 432) / 2 = 324.
    expect(shape.width).toBe(432);
    expect(shape.height).toBe(432);
    expect(shape.x).toBe(744);
    expect(shape.y).toBe(324);
  });

  it('keeps the ellipse round without a corner radius', () => {
    const shape = createShapePreset('ellipse', { width: 1080, height: 1080 });

    expect(shape.shape).toBe('ellipse');
    expect(shape.name).toBe(SHAPE_PRESET_NAMES.ellipse);
    expect(shape.cornerRadius).toBe(0);
  });

  it('builds a line as a horizontal stroke: box height 1 and a visible stroke', () => {
    const shape = createShapePreset('line', { width: 1080, height: 1080 });

    expect(shape.shape).toBe('line');
    expect(shape.name).toBe(SHAPE_PRESET_NAMES.line);
    expect(shape.width).toBe(432);
    expect(shape.height).toBe(1);
    expect(shape.x).toBe(324);
    expect(shape.y).toBe(540);
    expect(shape.stroke).toBe(shape.fill);
    expect(shape.strokeWidth).toBeGreaterThan(0);
  });

  it('gives the star five tips and the polygon six sides', () => {
    const star = createShapePreset('star', { width: 1080, height: 1080 });
    const polygon = createShapePreset('polygon', { width: 1080, height: 1080 });

    expect(star.shape).toBe('star');
    expect(star.name).toBe(SHAPE_PRESET_NAMES.star);
    expect(star.sides).toBe(5);
    expect(star.innerRadius).toBe(0.5);

    expect(polygon.shape).toBe('polygon');
    expect(polygon.name).toBe(SHAPE_PRESET_NAMES.polygon);
    expect(polygon.sides).toBe(6);
  });

  it('names every kind the schema accepts', () => {
    for (const kind of Object.keys(SHAPE_PRESET_NAMES) as (keyof typeof SHAPE_PRESET_NAMES)[]) {
      expect(SHAPE_PRESET_NAMES[kind]).toBeTruthy();
      expect(createShapePreset(kind, { width: 1080, height: 1080 }).shape).toBe(kind);
    }
  });

  it('builds a shape the document schema accepts', () => {
    const page: DocumentPage = {
      ...createPage({ width: 1080, height: 1080 }),
      objects: [
        createShapePreset('rect', { width: 1080, height: 1080 }),
        createShapePreset('ellipse', { width: 1080, height: 1080 }),
        createShapePreset('triangle', { width: 1080, height: 1080 }),
        createShapePreset('line', { width: 1080, height: 1080 }),
        createShapePreset('star', { width: 1080, height: 1080 }),
        createShapePreset('polygon', { width: 1080, height: 1080 }),
      ],
    };
    const document = createDocument([page]);

    expect(parseDocument(serializeDocument(document))).toEqual(document);
  });
});
