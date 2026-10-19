import { describe, expect, it } from 'vitest';
import { createPage, type DocumentPage } from '@/lib/document';
import { PAGE_FORMATS, resizePageToFormat } from '@/lib/documentOps';
import { coverCrop } from '@/lib/imageFit';
import { backgroundPreviewAspect, imageBackgroundSurface } from '@/lib/pageBackground';
import { pageToSvg } from '@/lib/templateThumbnail';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function imagePage(width: number, height: number): DocumentPage {
  return createPage({ width, height, background: { kind: 'image', src: PNG } });
}

describe('image background preview', () => {
  it('frames every offered page format at the anchor ratio', () => {
    // Literal ratios of the formats offered by the inspector: square, 3:1 wide
    // strip and 16:9. The preview height is the width over this number, so no
    // format can render squashed.
    expect(backgroundPreviewAspect({ width: 1080, height: 1080 })).toBe(1);
    expect(backgroundPreviewAspect({ width: 1500, height: 500 })).toBe(3);
    expect(backgroundPreviewAspect({ width: 1920, height: 1080 })).toBeCloseTo(16 / 9, 10);

    for (const format of PAGE_FORMATS) {
      const page = imagePage(format.width, format.height);

      expect(backgroundPreviewAspect(page)).toBeCloseTo(format.width / format.height, 10);
    }
  });

  it('follows the anchor format without recreating the image fill', () => {
    const poster = imagePage(1080, 1080);
    const banner = resizePageToFormat(poster, 'banner');
    const hero = resizePageToFormat(banner, 'hero');

    // The fill object is the one the page already had: resizing the anchor
    // never writes a new background, it only changes the frame ratio.
    expect(banner.background).toBe(poster.background);
    expect(hero.background).toBe(poster.background);

    expect(backgroundPreviewAspect(poster)).toBe(1);
    expect(backgroundPreviewAspect(banner)).toBe(3);
    expect(backgroundPreviewAspect(hero)).toBeCloseTo(16 / 9, 10);
  });

  it('is null for a fill that is not an image', () => {
    expect(imageBackgroundSurface(createPage())).toBeNull();
    expect(
      imageBackgroundSurface(
        createPage({ background: { kind: 'gradient', from: '#ffffff', to: '#000000', angle: 0 } }),
      ),
    ).toBeNull();
  });

  it('gives canvas, thumbnail and export the same page-sized cover surface', () => {
    const page = imagePage(1500, 500);
    const surface = imageBackgroundSurface(page);

    expect(surface).toEqual({
      src: PNG,
      x: 0,
      y: 0,
      width: 1500,
      height: 500,
      fit: 'cover',
    });

    // Thumbnail: the image element covers the page box.
    const svg = pageToSvg(page);
    expect(svg).toContain(
      `<image href="${PNG}" x="0" y="0" width="1500" height="500" preserveAspectRatio="xMidYMid slice"/>`,
    );

    // Canvas and export: `fitImageCover` crops the source with `coverCrop` into
    // `surface`, so a square source is cropped to the page ratio, not squashed.
    const crop = coverCrop({ width: 1000, height: 1000 }, surface!);
    expect(crop.width / crop.height).toBeCloseTo(surface!.width / surface!.height, 10);
    expect(crop.width).toBeLessThanOrEqual(1000);
    expect(crop.height).toBeLessThanOrEqual(1000);

    // Preview: the same page ratio, around the same stored source.
    expect(backgroundPreviewAspect(page)).toBeCloseTo(surface!.width / surface!.height, 10);
  });
});
