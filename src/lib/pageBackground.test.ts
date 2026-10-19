import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_COLOR,
  gradientLine,
  normalizeGradientAngle,
  pageBackgroundCss,
  pageBackgroundsEqual,
  parsePageBackground,
  safePageColor,
  sanitizePageBackground,
} from '@/lib/pageBackground';

describe('page background helpers', () => {
  it('wraps any angle into [0, 360)', () => {
    expect(normalizeGradientAngle(0)).toBe(0);
    expect(normalizeGradientAngle(495)).toBe(135);
    expect(normalizeGradientAngle(-90)).toBe(270);
    expect(normalizeGradientAngle(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('maps CSS angles to a line that covers the box', () => {
    // 0deg points up: the line runs from the bottom edge to the top edge.
    expect(gradientLine(400, 200, 0)).toEqual({ x1: 200, y1: 200, x2: 200, y2: 0 });
    // 90deg points right: left edge to right edge, through the middle.
    expect(gradientLine(400, 200, 90)).toEqual({ x1: 0, y1: 100, x2: 400, y2: 100 });

    // 135deg points down-right. The spec check is the projection, not the
    // raw endpoints: the two "magic corners" (0,0) and (400,200) must land on
    // the start and the end of the line, so the gradient covers the whole box.
    const diagonal = gradientLine(400, 200, 135);
    const dx = diagonal.x2 - diagonal.x1;
    const dy = diagonal.y2 - diagonal.y1;
    const length2 = dx * dx + dy * dy;
    const projection = (x: number, y: number) =>
      ((x - diagonal.x1) * dx + (y - diagonal.y1) * dy) / length2;

    expect(projection(0, 0)).toBeCloseTo(0, 5);
    expect(projection(400, 200)).toBeCloseTo(1, 5);
    // The other two corners fall inside the line.
    expect(projection(400, 0)).toBeGreaterThan(0);
    expect(projection(400, 0)).toBeLessThan(1);
  });

  it('reads every stored kind tolerantly', () => {
    expect(parsePageBackground({ kind: 'solid', color: ' #f5f0e8 ' })).toEqual({
      kind: 'solid',
      color: '#f5f0e8',
    });
    expect(parsePageBackground({ kind: 'gradient', from: '#fff', to: '#000', angle: 405 })).toEqual({
      kind: 'gradient',
      from: '#fff',
      to: '#000',
      angle: 45,
    });
    expect(parsePageBackground({ kind: 'image', src: 'data:image/png;base64,x' })).toEqual({
      kind: 'image',
      src: 'data:image/png;base64,x',
    });
  });

  it('rejects anything that is not a complete background', () => {
    expect(parsePageBackground(null)).toBeNull();
    expect(parsePageBackground('#ffffff')).toBeNull();
    expect(parsePageBackground({ kind: 'solid' })).toBeNull();
    expect(parsePageBackground({ kind: 'solid', color: '  ' })).toBeNull();
    expect(parsePageBackground({ kind: 'gradient', from: '#fff', to: '', angle: 0 })).toBeNull();
    expect(parsePageBackground({ kind: 'gradient', from: '#fff', to: '#000', angle: 'x' })).toBeNull();
    expect(parsePageBackground({ kind: 'image', src: ' ' })).toBeNull();
    expect(parsePageBackground({ kind: 'video' })).toBeNull();
  });

  it('sanitizes writes: hex colors only, angle wrapped, source trimmed', () => {
    expect(sanitizePageBackground({ kind: 'solid', color: '  #ABCDEF ' })).toEqual({
      kind: 'solid',
      color: '#abcdef',
    });
    expect(sanitizePageBackground({ kind: 'solid', color: 'red' })).toBeNull();
    expect(
      sanitizePageBackground({ kind: 'gradient', from: '#abc', to: '#123456', angle: -45 }),
    ).toEqual({ kind: 'gradient', from: '#abc', to: '#123456', angle: 315 });
    expect(sanitizePageBackground({ kind: 'gradient', from: '#abc', to: 'nope', angle: 0 })).toBeNull();
    expect(sanitizePageBackground({ kind: 'image', src: '  data:x  ' })).toEqual({
      kind: 'image',
      src: 'data:x',
    });
    expect(sanitizePageBackground({ kind: 'image', src: '   ' })).toBeNull();
  });

  it('compares backgrounds field by field', () => {
    expect(
      pageBackgroundsEqual(
        { kind: 'solid', color: '#fff' },
        { kind: 'solid', color: '#fff' },
      ),
    ).toBe(true);
    expect(
      pageBackgroundsEqual(
        { kind: 'solid', color: '#fff' },
        { kind: 'solid', color: '#000' },
      ),
    ).toBe(false);
    expect(
      pageBackgroundsEqual(
        { kind: 'solid', color: '#fff' },
        { kind: 'gradient', from: '#fff', to: '#000', angle: 0 },
      ),
    ).toBe(false);
    expect(
      pageBackgroundsEqual(
        { kind: 'gradient', from: '#fff', to: '#000', angle: 90 },
        { kind: 'gradient', from: '#fff', to: '#000', angle: 90 },
      ),
    ).toBe(true);
    expect(
      pageBackgroundsEqual(
        { kind: 'image', src: 'a' },
        { kind: 'image', src: 'b' },
      ),
    ).toBe(false);
  });

  it('reads as CSS paint for previews', () => {
    expect(pageBackgroundCss({ kind: 'solid', color: '#f5f0e8' })).toBe('#f5f0e8');
    expect(
      pageBackgroundCss({ kind: 'gradient', from: '#fff', to: '#000', angle: 135 }),
    ).toBe('linear-gradient(135deg, #fff, #000)');
    expect(pageBackgroundCss({ kind: 'image', src: 'data:image/png;base64,x' })).toBe(
      'url("data:image/png;base64,x")',
    );
  });

  it('sanitizes the paint at the render boundary, not only on write', () => {
    // A stored color that is not a complete hex value never reaches the CSS:
    // the render keeps the default page color instead.
    expect(safePageColor('red')).toBe(DEFAULT_PAGE_COLOR);
    expect(safePageColor('red; background-image: url("x")')).toBe(DEFAULT_PAGE_COLOR);
    expect(safePageColor('#ABCDEF')).toBe('#abcdef');

    expect(pageBackgroundCss({ kind: 'solid', color: 'red' })).toBe(DEFAULT_PAGE_COLOR);
    expect(
      pageBackgroundCss({ kind: 'gradient', from: 'red', to: '#000', angle: -90 }),
    ).toBe(`linear-gradient(270deg, ${DEFAULT_PAGE_COLOR}, #000)`);
  });

  it('escapes an image source so it cannot break out of the url() string', () => {
    const css = pageBackgroundCss({ kind: 'image', src: 'a(b) "q"\n' });

    // Exactly the wrapper's quotes survive: the quote, the line break and the
    // parens stay inside the string. The escaped form is the CSS string
    // grammar, not a percent-encoding, so the URL keeps its bytes.
    expect(css).toBe('url("a(b) \\"q\\"\\a ")');
    expect(css.startsWith('url("')).toBe(true);
    expect(css.endsWith('")')).toBe(true);
    expect(css).not.toContain('\n');

    // A backslash is escaped too: it cannot escape the closing quote.
    expect(pageBackgroundCss({ kind: 'image', src: 'a\\' })).toBe('url("a\\\\")');
  });
});
