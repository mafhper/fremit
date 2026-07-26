import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectSourceMode,
  getUrlTitle,
  resolveImageUrl,
  resolveWebsiteUrl,
  SourceResolutionError,
} from '@/lib/sourceResolver';

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 1280;
  naturalHeight = 720;

  set src(value: string) {
    if (value.includes('broken')) {
      this.onerror?.();
      return;
    }

    this.onload?.();
  }
}

describe('sourceResolver', () => {
  const originalImage = global.Image;
  const pngBlob = new Blob(['mock-image'], { type: 'image/png' });

  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.Image = originalImage;
  });

  it('detects direct image URLs', () => {
    expect(detectSourceMode('https://example.com/frame.png')).toBe('image-url');
  });

  it('detects website URLs', () => {
    expect(detectSourceMode('https://example.com/docs')).toBe('website-url');
  });

  it('keeps hash routes visible in fallback titles', () => {
    expect(getUrlTitle('https://mafhper.github.io/dinopad/#/atlas')).toBe(
      'mafhper.github.io/dinopad/atlas',
    );
  });

  it('resolves image URLs directly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => pngBlob,
      }),
    );

    const resolved = await resolveImageUrl('https://example.com/frame.png');

    expect(resolved.mode).toBe('image-url');
    expect(resolved.strategy).toBe('direct-image');
    expect(resolved.resolvedImageUrl).toContain('data:image/png');
    expect(resolved.requestedViewportWidth).toBeNull();
  });

  it('prefers microlink screenshot when available', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string | URL) => {
      const url = String(input);

      if (url.startsWith('https://api.microlink.io/')) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              title: 'Spread',
              screenshot: { url: 'https://preview.example.com/screenshot.png' },
            },
          }),
        };
      }

      return {
        ok: true,
        blob: async () => pngBlob,
      };
    });

    vi.stubGlobal(
      'fetch',
      fetchMock,
    );

    const resolved = await resolveWebsiteUrl('https://mafhper.github.io/spread/', {
      viewportWidth: 390,
      viewportHeight: 844,
      captureDelayMs: 3000,
      captureSelector: '#hero',
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(resolved.mode).toBe('website-url');
    expect(resolved.strategy).toBe('microlink-screenshot');
    expect(resolved.title).toBe('Spread');
    expect(resolved.requestedViewportWidth).toBe(390);
    expect(resolved.requestedViewportHeight).toBe(844);
    expect(resolved.requestedCaptureDelayMs).toBe(3000);
    expect(resolved.requestedCaptureSelector).toBe('#hero');
    expect(requestUrl.searchParams.get('waitForTimeout')).toBe('3000');
    expect(requestUrl.searchParams.get('waitForSelector')).toBe('#hero');
    expect(requestUrl.searchParams.get('element')).toBe('#hero');
  });

  it('fails direct image urls that cannot be exported', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors blocked')));

    await expect(resolveImageUrl('https://example.com/frame.png')).rejects.toMatchObject<SourceResolutionError>({
      code: 'image-fetch-failed',
    });
  });

  it('surfaces a no-preview error when microlink returns no media', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {},
        }),
      }),
    );

    await expect(resolveWebsiteUrl('https://example.com')).rejects.toMatchObject<SourceResolutionError>({
      code: 'no-preview',
    });
  });
});
