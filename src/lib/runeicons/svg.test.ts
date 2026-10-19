import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUNEICON_COLORS,
  applyRuneiconColor,
  buildRuneiconImageSrc,
  mixHex,
  readViewBox,
  resolveRuneiconColors,
  runeiconPreviewMarkup,
  supportsRuneiconColor,
  withIntrinsicSize,
  type RuneiconColorState,
} from '@/lib/runeicons/svg';

/**
 * The vendored files are the contract: the tests rewrite the real artwork.
 * `import.meta.dirname` instead of `new URL(..., import.meta.url)`, which Vite
 * would turn into a bundled asset import.
 */
const VENDORED = join(import.meta.dirname, '../../../public/runeicons');

function fixture(path: string): string {
  return readFileSync(join(VENDORED, path), 'utf8');
}

const normal = () => fixture('normal/arrows/arrow-down-left.svg');
const duotone = () => fixture('duotone/arrows/arrow-down-left.svg');
const fill = () => fixture('fill/arrows/skip-forward.svg');
const pixelated = () => fixture('pixelated/arrows/arrow-down-left.svg');
const glass = () => fixture('glass-icons/Archive.svg');

const solid = (primary: string, secondary: string | null = null): RuneiconColorState => ({
  primary,
  secondary,
  gradient: false,
});

describe('runeicon color slots', () => {
  it('recolors the normal stroke and the lone filled dot, keeping fill="none"', () => {
    const result = applyRuneiconColor(normal(), 'normal', solid('#ff0000'));

    expect(result).toContain('stroke="#ff0000"');
    expect(result).not.toContain('stroke="black"');
    expect(result).toContain('fill="none"');

    // money/tag carries a filled dot in `black`; it is paint, not structure.
    const tag = applyRuneiconColor(fixture('normal/money/tag.svg'), 'normal', solid('#ff0000'));
    expect(tag).toContain('fill="#ff0000"');
    expect(tag).not.toContain('fill="black"');
  });

  it('keeps the white fills of clipPath/mask definitions out of the rewrite', () => {
    const layers = applyRuneiconColor(
      fixture('normal/layouts/layers-2.svg'),
      'normal',
      solid('#ff0000'),
    );

    expect(layers).toContain('fill="white"');
  });

  it('rewrites both duotone slots', () => {
    const result = applyRuneiconColor(duotone(), 'duotone', solid('#ff0000', '#0000ff'));

    expect(result).toContain('stroke="#ff0000"');
    expect(result).toContain('stroke="#0000ff"');
    expect(result).not.toContain('#A4A5A6');
    expect(result).not.toContain('#DDDDDD');
  });

  it('rewrites the fill shape and the ink of the fill style', () => {
    const result = applyRuneiconColor(fill(), 'fill', solid('#ff0000', '#0000ff'));

    expect(result).toContain('fill="#ff0000"');
    expect(result).toContain('stroke="#0000ff"');
    expect(result).toContain('fill="none"');
    expect(result).not.toContain('#DDDDDD');
    expect(result).not.toContain('#1C1F21');
  });

  it('recolors every pixel of the pixelated style', () => {
    const result = applyRuneiconColor(pixelated(), 'pixelated', solid('#ff0000'));

    expect(result).not.toContain('fill="black"');
    expect(result).toContain('fill="#ff0000"');
  });

  it('leaves glass exactly as designed', () => {
    const source = glass();
    expect(applyRuneiconColor(source, 'glass', solid('#ff0000', '#0000ff'))).toBe(source);
    expect(supportsRuneiconColor('glass')).toBe(false);
  });

  it('falls back to the designed colors on invalid input', () => {
    const result = applyRuneiconColor(
      duotone(),
      'duotone',
      solid('javascript:alert(1)', 'url(#x)'),
    );

    expect(result).toContain('#A4A5A6');
    expect(result).toContain('#DDDDDD');
    expect(result).not.toContain('javascript');
    expect(result).not.toContain('url(#x)');
  });

  it('keeps the slots apart when a chosen color equals the other slot value', () => {
    // Primary set to the *secondary* slot's gray: the secondary pass must not
    // rewrite the primary stroke again (the value is lowercased on the way in).
    const result = applyRuneiconColor(duotone(), 'duotone', solid('#DDDDDD', '#0000ff'));

    expect(result.match(/stroke="#dddddd"/g)).toHaveLength(1);
    expect(result.match(/stroke="#0000ff"/g)).toHaveLength(1);
    expect(result).not.toContain('#A4A5A6');
  });
});

describe('runeicon color resolution', () => {
  it('starts from the designed colors', () => {
    expect(resolveRuneiconColors('normal', DEFAULT_RUNEICON_COLORS)).toEqual({
      primary: '#000000',
      secondary: '#808080',
      gradient: false,
    });
    expect(resolveRuneiconColors('duotone', DEFAULT_RUNEICON_COLORS)).toEqual({
      primary: '#A4A5A6',
      secondary: '#DDDDDD',
      gradient: false,
    });
    expect(resolveRuneiconColors('fill', DEFAULT_RUNEICON_COLORS)).toEqual({
      primary: '#DDDDDD',
      secondary: '#1C1F21',
      gradient: false,
    });
    expect(resolveRuneiconColors('glass', DEFAULT_RUNEICON_COLORS)).toBeNull();
  });

  it('expands short hex and lets a chosen color win', () => {
    expect(resolveRuneiconColors('duotone', solid('#F00', '#00f'))).toEqual({
      primary: '#ff0000',
      secondary: '#0000ff',
      gradient: false,
    });
  });

  it('blends two colors channel by channel', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mixHex('#ff0000', '#0000ff', 1)).toBe('#0000ff');
    expect(mixHex('not-a-color', '#123456', 0.5)).toBe('#123456');
  });
});

describe('runeicon gradient', () => {
  it('paints the primary slot with a two-stop gradient', () => {
    const result = applyRuneiconColor(duotone(), 'duotone', {
      primary: '#ff0000',
      secondary: '#0000ff',
      gradient: true,
    });

    expect(result).toContain('url(#runeicon-gradient)');
    expect(result).toContain('<linearGradient id="runeicon-gradient"');
    expect(result).toContain('stop-color="#ff0000"');
    expect(result).toContain('stop-color="#0000ff"');
    // The wash slot still carries its own color.
    expect(result).toContain('stroke="#0000ff"');
  });

  it('keeps the gradient off the markup when the mode is solid', () => {
    expect(applyRuneiconColor(normal(), 'normal', solid('#ff0000'))).not.toContain(
      'runeicon-gradient',
    );
  });

  it('keeps the fixed gradient id per frozen file (standalone data URL, no shared document)', () => {
    const src = buildRuneiconImageSrc(duotone(), {
      style: 'duotone',
      colors: { primary: '#ff0000', secondary: '#0000ff', gradient: true },
      size: 100,
    });

    const markup = decodeURIComponent(src.slice('data:image/svg+xml;charset=utf-8,'.length));

    // Each frozen file carries its own defs and references them exactly once;
    // inserted as an image it is its own document, so the fixed id cannot
    // collide across icons and needs no per-instance suffix.
    expect(markup.match(/runeicon-gradient/g)).toHaveLength(2);
    expect(markup).toContain('<linearGradient id="runeicon-gradient"');
    expect(markup).toContain('url(#runeicon-gradient)');
  });
});

describe('runeicon preview', () => {
  it('normalizes one-slot styles to the theme text color', () => {
    expect(runeiconPreviewMarkup(normal(), 'normal')).toContain('stroke="currentColor"');
    expect(runeiconPreviewMarkup(pixelated(), 'pixelated')).toContain('fill="currentColor"');
  });

  it('keeps the designed paint of the multi-slot styles', () => {
    expect(runeiconPreviewMarkup(duotone(), 'duotone')).toContain('#A4A5A6');
    expect(runeiconPreviewMarkup(fill(), 'fill')).toContain('#1C1F21');
    expect(runeiconPreviewMarkup(glass(), 'glass')).toBe(glass());
  });
});

describe('runeicon freeze', () => {
  it('reads the viewBox of the vendored files', () => {
    expect(readViewBox(normal())).toEqual({ x: 0, y: 0, width: 24, height: 24 });
    expect(readViewBox(pixelated())).toEqual({ x: 0, y: 0, width: 40, height: 41 });
    expect(readViewBox('<svg>')).toBeNull();
  });

  it('sizes the file by the longest side, keeping the viewBox aspect', () => {
    const sized = withIntrinsicSize(pixelated(), 600);

    expect(sized).toContain('width="585"');
    expect(sized).toContain('height="600"');
    expect(sized).toContain('viewBox="0 0 40 41"');
  });

  it('freezes the colored icon as a self-contained data URL', () => {
    const src = buildRuneiconImageSrc(normal(), {
      style: 'normal',
      colors: solid('#ff0000'),
      size: 200,
    });

    expect(src.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);

    const markup = decodeURIComponent(src.slice('data:image/svg+xml;charset=utf-8,'.length));
    expect(markup).toContain('stroke="#ff0000"');
    expect(markup).toContain('width="600"');
    expect(markup).toContain('height="600"');
    expect(markup.startsWith('<svg')).toBe(true);
  });
});

/**
 * The vendored set writes double-quoted, lower-case attributes (measured over
 * all 919 files), but the slot rewrite must survive the documented variations
 * a re-vendor could bring: single quotes, spaces around `=` and color values
 * in any case, plus the same paint inside an inline `style` attribute.
 */
describe('runeicon paint variations', () => {
  it('rewrites single quotes, spaced equals and value case', () => {
    const source =
      '<svg viewBox="0 0 24 24">' +
      "<path stroke='black'/>" +
      '<path stroke = "black"/>' +
      '<path stroke="BLACK"/>' +
      '<path fill="none"/>' +
      '</svg>';

    const result = applyRuneiconColor(source, 'normal', solid('#ff0000'));

    expect(result).toContain("stroke='#ff0000'");
    expect(result).toContain('stroke = "#ff0000"');
    expect(result).toContain('stroke="#ff0000"');
    expect(result).not.toMatch(/black/i);
    expect(result).toContain('fill="none"');
  });

  it('rewrites paint declared in an inline style attribute', () => {
    const source =
      '<svg viewBox="0 0 24 24"><path style="stroke:black;fill:none" stroke-width="2"/></svg>';

    const result = applyRuneiconColor(source, 'normal', solid('#ff0000'));

    expect(result).toContain('style="stroke:#ff0000;fill:none"');
    expect(result).toContain('stroke-width="2"');
  });

  it('matches the duotone slots whatever the hex case', () => {
    const result = applyRuneiconColor(
      '<svg><path stroke="#a4a5a6" fill="#dddddd"/></svg>',
      'duotone',
      solid('#ff0000', '#0000ff'),
    );

    expect(result).toContain('stroke="#ff0000"');
    expect(result).toContain('fill="#0000ff"');
  });

  it('leaves non-slot paints and structural attributes alone', () => {
    const source =
      '<svg><path fill="none" fill-rule="evenodd" stroke-width="2" stroke="red"/></svg>';

    const result = applyRuneiconColor(source, 'normal', solid('#ff0000'));

    expect(result).toContain('fill="none"');
    expect(result).toContain('fill-rule="evenodd"');
    expect(result).toContain('stroke-width="2"');
    expect(result).toContain('stroke="red"');
  });
});
