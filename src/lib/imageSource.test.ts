import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ImageSourceError,
  imageSourceErrorMessage,
  imageSourceVerdict,
  isSupportedImageSourceType,
  normalizeImageMediaType,
  resolveImageSourceFile,
  resolveImageSourceUrl,
  type ImageSourceErrorCode,
} from '@/lib/imageSource';
import { readImageFile, replaceImageFromFile, ImageReplaceError } from '@/lib/imageReplace';
import {
  createDocument,
  createPage,
  parseDocument,
  serializeDocument,
  type DocumentPage,
} from '@/lib/document';
import { setPageBackgroundInPage } from '@/lib/documentOps';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG_B = 'data:image/png;base64,cmVwbGFjZW1lbnQ=';

/**
 * The acceptance matrix, spelled once. `jpg` declares the nonstandard
 * `image/jpg` alias on purpose: it must take the same path as `image/jpeg`.
 */
const FORMATS = [
  { id: 'svg', name: 'art.svg', type: 'image/svg+xml', stored: 'image/svg+xml' },
  { id: 'webp', name: 'art.webp', type: 'image/webp', stored: 'image/webp' },
  { id: 'png', name: 'art.png', type: 'image/png', stored: 'image/png' },
  { id: 'jpg', name: 'art.jpg', type: 'image/jpg', stored: 'image/jpeg' },
  { id: 'jpeg', name: 'art.jpeg', type: 'image/jpeg', stored: 'image/jpeg' },
] as const;

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

function responseWith(contentType: string, body = 'payload'): Response {
  const blob = new Blob([body], { type: contentType });

  return {
    ok: true,
    headers: new Headers({ 'content-type': contentType }),
    blob: async () => blob,
  } as unknown as Response;
}

function matrixFile(format: (typeof FORMATS)[number]): File {
  return new File([new Uint8Array([137, 80, 78, 71])], format.name, { type: format.type });
}

function videoFile(): File {
  return new File([new Uint8Array([0, 0, 0, 24])], 'clip.mp4', { type: 'video/mp4' });
}

function dataUrlPrefix(mediaType: string): string {
  return `data:${mediaType};base64,`;
}

/** The prefix as a regex, with the `+` of `image/svg+xml` taken literally. */
function dataUrlPrefixPattern(mediaType: string): RegExp {
  return new RegExp(`^${dataUrlPrefix(mediaType).replace(/[+]/g, '\\+')}`);
}

describe('image source matrix', () => {
  const originalImage = global.Image;

  beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.Image = originalImage;
  });

  it('normalizes the jpg alias before the matrix comparison', () => {
    expect(normalizeImageMediaType('IMAGE/JPG; charset=binary')).toBe('image/jpeg');

    // The alias and the canonical type are the same verdict — one code path.
    expect(imageSourceVerdict('art.jpg', 'image/jpg')).toEqual(
      imageSourceVerdict('art.jpeg', 'image/jpeg'),
    );

    expect(isSupportedImageSourceType('image/png')).toBe(true);
    expect(isSupportedImageSourceType('image/svg+xml')).toBe(true);
    expect(isSupportedImageSourceType('image/gif')).toBe(false);
  });

  describe.each(FORMATS)('$id', (format) => {
    it('is accepted by the object-image entry', async () => {
      await expect(readImageFile(matrixFile(format))).resolves.toMatch(
        dataUrlPrefixPattern(format.stored),
      );
    });

    it('is accepted by the inserted-image entry', async () => {
      await expect(resolveImageSourceFile(matrixFile(format))).resolves.toMatch(
        dataUrlPrefixPattern(format.stored),
      );
    });

    it('is accepted by the URL entry', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseWith(format.type)));

      const src = await resolveImageSourceUrl(`https://example.com/${format.name}`);

      expect(src.startsWith(dataUrlPrefix(format.stored))).toBe(true);
    });
  });

  it('refuses a video file with the same typed code in both entries', async () => {
    const video = videoFile();

    await expect(readImageFile(video)).rejects.toMatchObject<ImageSourceError>({
      code: 'video-unsupported',
    });
    await expect(resolveImageSourceFile(video)).rejects.toMatchObject<ImageSourceError>({
      code: 'video-unsupported',
    });
  });

  it('refuses a video URL with a typed code without fetching it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveImageSourceUrl('https://example.com/clip.mp4')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'video-unsupported' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a video response by its content type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseWith('video/mp4')));

    await expect(resolveImageSourceUrl('https://example.com/media')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'video-unsupported' });
  });

  it('refuses a type outside the matrix with its own code in both entries', async () => {
    const gif = new File([new Uint8Array([71, 73, 70])], 'clip.gif', { type: 'image/gif' });

    await expect(readImageFile(gif)).rejects.toMatchObject<ImageSourceError>({
      code: 'unsupported-type',
    });
    await expect(resolveImageSourceFile(gif)).rejects.toMatchObject<ImageSourceError>({
      code: 'unsupported-type',
    });
    await expect(resolveImageSourceUrl('data:image/gif;base64,R0lGOD')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'unsupported-type' });
  });

  it('never turns an HTML response into an image reference', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseWith('text/html', '<html></html>')));

    await expect(resolveImageSourceUrl('https://example.com/page')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'not-an-image' });
  });

  it('refuses a data URL that is not an image of the matrix', async () => {
    await expect(resolveImageSourceUrl('data:text/html,<html></html>')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'not-an-image' });

    await expect(resolveImageSourceUrl('data:image/gif;base64,R0lGOD')).rejects.toMatchObject<
      ImageSourceError
    >({ code: 'unsupported-type' });
  });

  it('refuses an invalid URL with a typed code', async () => {
    await expect(resolveImageSourceUrl('not-a-url')).rejects.toMatchObject<ImageSourceError>({
      code: 'invalid-url',
    });
  });

  it('refuses a file with no media type with its own code', async () => {
    const nameless = new File([new Uint8Array([1, 2, 3])], 'photo', { type: '' });

    await expect(resolveImageSourceFile(nameless)).rejects.toMatchObject<ImageSourceError>({
      code: 'invalid-file',
    });
  });

  it('leaves the document byte for byte equal when a video replacement is refused', async () => {
    const page: DocumentPage = {
      ...createPage({ id: 'page-1' }),
      objects: [],
    };
    const document = createDocument([page]);
    const before = serializeDocument(document);

    await expect(
      replaceImageFromFile(document.pages[0], 'image-1', videoFile()),
    ).rejects.toMatchObject<ImageReplaceError>({ code: 'video-unsupported' });
    expect(serializeDocument(document)).toBe(before);
  });
});

describe('refusal copy', () => {
  const copy = {
    invalidUrl: 'invalid-url',
    invalidFile: 'invalid-file',
    readFailed: 'read-failed',
    videoUnsupported: 'video',
    unsupportedType: 'unsupported-type',
    notAnImage: 'not-an-image',
    fetchFailed: 'fetch-failed',
    loadFailed: 'load-failed',
    error: 'error',
  };

  it('gives every reachable refusal code its own message', () => {
    const codes: ImageSourceErrorCode[] = [
      'invalid-url',
      'invalid-file',
      'file-read-failed',
      'video-unsupported',
      'unsupported-type',
      'not-an-image',
      'image-fetch-failed',
      'image-load-failed',
    ];
    const messages = codes.map((code) => imageSourceErrorMessage(code, copy));

    expect(new Set(messages).size).toBe(codes.length);
  });

  it('falls back to the generic message for the empty source', () => {
    expect(imageSourceErrorMessage('empty-source', copy)).toBe('error');
  });
});

describe('image background CRUD', () => {
  const previous: DocumentPage['background'] = { kind: 'solid', color: '#f5f0e8' };
  const base = createPage({ background: previous });

  it('creates, reads, updates and removes the image fill', () => {
    // Create: the document gains the image reference.
    const created = setPageBackgroundInPage(base, { kind: 'image', src: PNG });
    expect(created.background).toEqual({ kind: 'image', src: PNG });

    // Read: the serialized round-trip carries exactly the same reference.
    const reread = parseDocument(serializeDocument(createDocument([created])));
    expect(reread.pages[0].background).toEqual({ kind: 'image', src: PNG });

    // Update: only the source changes; the rest of the page is untouched.
    const updated = setPageBackgroundInPage(created, { kind: 'image', src: PNG_B });
    expect(updated.background).toEqual({ kind: 'image', src: PNG_B });
    expect(updated.objects).toBe(created.objects);
    expect(updated.width).toBe(created.width);
    expect(updated.height).toBe(created.height);

    // Remove: back to the exact fill from before the image, with no source
    // residue left on the background.
    const removed = setPageBackgroundInPage(updated, previous);
    expect(removed.background).toEqual(previous);
    expect(JSON.stringify(removed.background)).not.toContain('image');
    expect(setPageBackgroundInPage(removed, previous)).toBe(removed);
  });

  it('does not mutate the page when the source type is refused', async () => {
    const before = serializeDocument(createDocument([base]));

    let page = base;
    try {
      const src = await resolveImageSourceFile(videoFile());
      page = setPageBackgroundInPage(page, { kind: 'image', src });
    } catch {
      // Refused sources never reach the write, by construction.
    }

    expect(page).toBe(base);
    expect(serializeDocument(createDocument([page]))).toBe(before);
  });
});
