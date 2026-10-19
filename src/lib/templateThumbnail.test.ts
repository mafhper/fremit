import { describe, expect, it } from 'vitest';
import {
  createImageObject,
  createPage,
  createShapeObject,
  createTextObject,
  type DocumentPage,
} from '@/lib/document';
import { escapeXml, pageToSvg } from '@/lib/templateThumbnail';
import { TEMPLATES } from '@/lib/templates';

describe('pageToSvg', () => {
  it('draws the page background and one element per object type', () => {
    const page: DocumentPage = {
      ...createPage({
        width: 800,
        height: 600,
        background: { kind: 'solid', color: '#0b1220' },
      }),
      objects: [
        createShapeObject('rect', { name: 'Bar', x: 10, y: 20, width: 100, height: 30, cornerRadius: 6, fill: '#38bdf8' }),
        createShapeObject('ellipse', { name: 'Dot', x: 200, y: 200, width: 40, height: 40, fill: '#f59e0b' }),
        createTextObject('Big idea', { name: 'Title', x: 10, y: 100, width: 400, height: 80, fontSize: 48 }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain('fill="#0b1220"');
    expect(svg).toContain('<rect x="10" y="20" width="100" height="30" rx="6"');
    expect(svg).toContain('<ellipse cx="220" cy="220" rx="20" ry="20"');
    expect(svg).toContain('<text');
    expect(svg).toContain('Big idea');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('escapes text and attribute values', () => {
    const page: DocumentPage = {
      ...createPage({ width: 200, height: 200 }),
      objects: [
        createTextObject('<script>alert("x")</script>', {
          name: 'Evil',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
          fontSize: 20,
          fontFamily: 'Inter & "friends"',
        }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('Inter &amp; &quot;friends&quot;');
  });

  it('skips hidden objects and marks rotation and opacity', () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createShapeObject('rect', { name: 'Hidden', visible: false, fill: '#ff0000' }),
        createShapeObject('rect', { name: 'Rotated', x: 40, y: 40, width: 100, height: 50, rotation: -8, opacity: 0.85, fill: '#00ff00' }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).not.toContain('#ff0000');
    expect(svg).toContain('#00ff00');
    expect(svg).toContain('transform="rotate(-8 40 40)"');
    expect(svg).toContain('opacity="0.85"');
  });

  it('paints stored colors through the same sanitizer as the canvas and the export', () => {
    // The values are the same literals `pageBackgroundFill` and the exporter
    // assert: an incomplete color falls back to the default page color and a
    // complete one is written in lowercase. The miniature is a render surface
    // too — it must not let a hand-edited value through.
    const solid = createPage({ background: { kind: 'solid', color: 'red' } });
    expect(pageToSvg(solid)).toContain('fill="#ffffff"');
    expect(pageToSvg(solid)).not.toContain('fill="red"');

    const upper = createPage({ background: { kind: 'solid', color: '#ABCDEF' } });
    expect(pageToSvg(upper)).toContain('fill="#abcdef"');

    const gradient = createPage({
      width: 800,
      height: 600,
      background: { kind: 'gradient', from: '#FF0000', to: 'red', angle: 0 },
    });
    const svg = pageToSvg(gradient);

    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#ffffff"');
    expect(svg).not.toContain('stop-color="red"');
    // The defs id is derived from what the gradient actually paints.
    expect(svg).toContain('fremit-page-bg-800x600-ff0000-ffffff-0');
  });

  it('renders every template seed without leftover numbers', () => {
    for (const template of TEMPLATES) {
      const svg = pageToSvg(template.build().pages[0]);

      expect(svg, template.id).toContain('</svg>');
      expect(svg, template.id).not.toContain('NaN');
      expect(svg, template.id).not.toContain('undefined');
    }
  });
