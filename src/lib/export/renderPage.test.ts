import { describe, expect, it } from 'vitest';
import { createPage, createShapeObject, type DocumentPage } from '@/lib/document';
import { renderPageSvg } from '@/lib/export/renderPage';

/**
 * The document -> SVG export is a render boundary of its own: it builds a
 * throwaway StaticCanvas from the JSON through the same codec the editor uses,
 * then serializes it. The orchestrator tests stub this renderer and the codec
 * tests stop at the Fabric object, so this is the only seam that proves a
 * shape reaches the exported file.
 */
describe('renderPageSvg shapes', () => {
  it('writes every shape kind, and the ellipse stroke, into the exported SVG', async () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createShapeObject('rect', {
          id: 'shape-rect',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          cornerRadius: 6,
        }),
        createShapeObject('ellipse', {
          id: 'shape-ellipse',
          x: 130,
          y: 20,
          width: 100,
          height: 60,
          stroke: '#ff0000',
          strokeWidth: 6,
        }),
        createShapeObject('triangle', { id: 'shape-triangle', x: 250, y: 20, width: 100, height: 60 }),
        createShapeObject('star', {
          id: 'shape-star',
          x: 10,
          y: 150,
          width: 100,
          height: 100,
          sides: 5,
          innerRadius: 0.5,
        }),
        createShapeObject('polygon', {
          id: 'shape-polygon',
          x: 130,
          y: 150,
          width: 100,
          height: 100,
          sides: 6,
        }),
        createShapeObject('line', {
          id: 'shape-line',
          x: 250,
          y: 150,
          width: 100,
          height: 1,
          stroke: '#0000ff',
          strokeWidth: 3,
        }),
      ],
    };

    const svg = await renderPageSvg(page);

    // One element per kind: the primitives keep their own tags, and the three
    // polygon-based kinds (triangle, star, polygon) each produce one `<polygon>`.
    expect(svg).toContain('<rect');
    expect(svg).toContain('rx="6"');
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('<polyline');
    expect((svg.match(/<polygon /g) ?? []).length).toBe(3);

    // The worked star and the six-sided polygon, in Fabric's local points.
    expect(svg).toContain('15.451,-17.082');
    expect(svg).toContain('points="0,-50 50,-25 50,25 0,50 -50,25 -50,-25"');
    // The triangle is the box corners with the apex on top.
    expect(svg).toContain('points="-50 30,0 -30,50 30"');

    // The stroke the inspector toggles survives the whole export path.
    expect(svg).toContain('stroke: rgb(255,0,0); stroke-width: 6;');
    // A line has no fill: its paint is the stroke.
    expect(svg).toContain('stroke: rgb(0,0,255); stroke-width: 3;');
    expect(svg).toContain('fill: none');
  });
});
