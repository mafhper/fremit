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

  it('draws the new shape kinds with their own elements', () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createShapeObject('triangle', { x: 10, y: 20, width: 100, height: 80, fill: '#111111' }),
        createShapeObject('star', {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          sides: 5,
          innerRadius: 0.5,
          fill: '#222222',
        }),
        createShapeObject('line', {
          x: 10,
          y: 10,
          width: 200,
          height: 1,
          stroke: '#444444',
          strokeWidth: 4,
        }),
      ],
    };

    const svg = pageToSvg(page);

    // Triangle: the box corners with the apex at the top center.
    expect(svg).toContain('<polygon points="10,100 60,20 110,100" fill="#111111"');
    // Star: the shared geometry, worked example for five tips at ratio 0.5.
    expect(svg).toContain(
      'points="50,0 65.45,32.92 100,38.2 75,63.82 80.9,100 50,82.92 19.1,100 25,63.82 0,38.2 34.55,32.92"',
    );
    // Line: a stroked segment over the box diagonal.
    expect(svg).toContain('<line x1="10" y1="10" x2="210" y2="11" stroke="#444444" stroke-width="4"');
    expect(svg).not.toContain('NaN');
  });

  it('draws the ellipse stroke, the same pair the canvas and the export use', () => {
    const page: DocumentPage = {
      ...createPage({ width: 200, height: 200 }),
      objects: [
        createShapeObject('ellipse', {
          name: 'Outlined dot',
          x: 20,
          y: 30,
          width: 100,
          height: 60,
          fill: '#112233',
          stroke: '#ff0000',
          strokeWidth: 6,
        }),
        createShapeObject('ellipse', {
          name: 'Plain dot',
          x: 130,
          y: 30,
          width: 40,
          height: 40,
          fill: '#334455',
        }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).toContain('rx="50" ry="30" fill="#112233" stroke="#ff0000" stroke-width="6"');
    // A null stroke stays absent instead of painting a default outline.
    expect(svg).toContain('rx="20" ry="20" fill="#334455"/>');
  });

  it('scales the star and polygon geometry into a non-square box', () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createShapeObject('polygon', {
          x: 100,
          y: 50,
          width: 200,
          height: 100,
          sides: 4,
          fill: '#333333',
        }),
      ],
    };

    const svg = pageToSvg(page);

    // A diamond in a 200x100 box: the top vertex sits at the horizontal
    // center, the side vertices at the box edges and mid-height.
    expect(svg).toContain('<polygon points="200,50 300,100 200,150 100,100" fill="#333333"');
  });

  it('clips a masked image to the object box the canvas and the exporter use', () => {
    const page: DocumentPage = {
      ...createPage({ width: 1080, height: 1080 }),
      objects: [
        createImageObject('data:image/png;base64,x', {
          id: 'image-1',
          x: 90,
          y: 110,
          width: 900,
          height: 560,
          mask: 'rounded',
        }),
      ],
    };

    const svg = pageToSvg(page);

    // The worked rect: shorter side 560 * 0.12 = 67.2, in page units.
    expect(svg).toContain('<clipPath id="fremit-mask-image-1">');
    expect(svg).toContain(
      '<rect x="90" y="110" width="900" height="560" rx="67.2" ry="67.2"/>',
    );
    expect(svg).toContain('clip-path="url(#fremit-mask-image-1)"');
  });

  it('leaves an unmasked image unclipped', () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createImageObject('data:image/png;base64,x', {
          id: 'image-1',
          x: 10,
          y: 20,
          width: 300,
          height: 200,
        }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).toContain('<image href="data:image/png;base64,x"');
    expect(svg).not.toContain('<clipPath');
    expect(svg).not.toContain('clip-path=');
  });

  it('draws no line mark when the line has no stroke', () => {
    const page: DocumentPage = {
      ...createPage({ width: 400, height: 400 }),
      objects: [
        createShapeObject('line', { x: 10, y: 10, width: 200, height: 1, stroke: null }),
      ],
    };

    const svg = pageToSvg(page);

    expect(svg).not.toContain('<line');
    expect(svg).toContain('</svg>');
  });

  it('draws gradient and image page fills', () => {
    const gradient: DocumentPage = {
      ...createPage({
        width: 400,
        height: 200,
        background: { kind: 'gradient', from: '#ff0000', to: '#0000ff', angle: 90 },
      }),
    };

    const svg = pageToSvg(gradient);

    // 90deg points right: the line runs edge to edge through the middle.
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('gradientUnits="userSpaceOnUse"');
    expect(svg).toContain('x1="0" y1="100" x2="400" y2="100"');
    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#0000ff"');

    // The page rect references the id of the defs block, not some other id.
    const gradientId = /<linearGradient id="([^"]+)"/.exec(svg)?.[1];

    expect(gradientId).toBeTruthy();
    expect(svg).toContain(`fill="url(#${gradientId})"`);

    const image: DocumentPage = {
      ...createPage({
        width: 400,
        height: 200,
        background: { kind: 'image', src: 'data:image/png;base64,x' },
      }),
    };

    const imageSvg = pageToSvg(image);

    expect(imageSvg).toContain('<image href="data:image/png;base64,x"');
    expect(imageSvg).toContain('preserveAspectRatio="xMidYMid slice"');
  });

  it('derives the gradient id from the page, so two calls over it match', () => {
    const page: DocumentPage = {
      ...createPage({
        width: 400,
        height: 200,
        background: { kind: 'gradient', from: '#ff0000', to: '#0000ff', angle: 90 },
      }),
    };

    const first = pageToSvg(page);
    const id = /<linearGradient id="([^"]+)"/.exec(first)?.[1];

    expect(id).toBeTruthy();
    // Same page, same markup: the id no longer depends on call order.
    expect(pageToSvg(page)).toBe(first);

    // A different gradient cannot borrow the defs of the first one.
    const other: DocumentPage = {
      ...createPage({
        width: 400,
        height: 200,
        background: { kind: 'gradient', from: '#00ff00', to: '#0000ff', angle: 90 },
      }),
    };
    const otherId = /<linearGradient id="([^"]+)"/.exec(pageToSvg(other))?.[1];

    expect(otherId).toBeTruthy();
    expect(otherId).not.toBe(id);
  });

  it('stays decorative: aria-hidden without a role exposing it again', () => {
    const svg = pageToSvg(createPage({ width: 10, height: 10 }));

    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
  });

  it('keeps the escape helper total for every XML special character', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });
});
