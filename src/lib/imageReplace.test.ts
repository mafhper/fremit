import { describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  createImageObject,
  createPage,
  createShapeObject,
  serializeDocument,
  type DocumentPage,
} from '@/lib/document';
import {
  ImageReplaceError,
  imageReplaceErrorMessage,
  pickClipboardImageFile,
  readImageFile,
  replaceImageFromFile,
  replaceImageSourceInPage,
} from '@/lib/imageReplace';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const otherPng = 'data:image/png;base64,cmVwbGFjZW1lbnQ=';

/** The page under test: one image with real geometry, below a shape. */
function buildPage(): DocumentPage {
  return {
    ...createPage({ id: 'page-1', name: 'Poster', width: 1080, height: 1080 }),
    objects: [
      createImageObject(onePixelPng, {
        id: 'image-1',
        name: 'Photo',
        x: 42,
        y: 24,
        width: 320,
        height: 180,
        rotation: 12,
        opacity: 0.8,
        fit: 'cover',
      }),
      createShapeObject('rect', { id: 'shape-1' }),
    ],
  };
}

/** Runs `action` and returns what it threw, so a typed failure is assertable. */
function capture(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  return null;
}

async function captureAsync(task: Promise<unknown>): Promise<unknown> {
  try {
    await task;
  } catch (error) {
    return error;
  }

  return null;
}

describe('replaceImageSourceInPage', () => {
  it('swaps only the source, preserving identity, geometry and z-order', () => {
    const page = buildPage();
    const next = replaceImageSourceInPage(page, 'image-1', otherPng);

    expect(next).not.toBe(page);
    expect(next.objects).toHaveLength(page.objects.length);
    expect(next.objects.map((object) => object.id)).toEqual(['image-1', 'shape-1']);
    expect(next.objects[0]).toMatchObject({
      type: 'image',
      id: 'image-1',
      name: 'Photo',
      x: 42,
      y: 24,
      width: 320,
      height: 180,
      rotation: 12,
      opacity: 0.8,
      fit: 'cover',
      src: otherPng,
    });
  });

  it('does not mutate the page it read', () => {
    const page = buildPage();
    replaceImageSourceInPage(page, 'image-1', otherPng);

    expect(page.objects[0]).toMatchObject({ src: onePixelPng });
  });

  it('does not create an object', () => {
    const page = buildPage();
    const next = replaceImageSourceInPage(page, 'image-1', otherPng);

    expect(next.objects.filter((object) => object.type === 'image')).toHaveLength(1);
  });

  it('is not a write when the source is the stored one', () => {
    const page = buildPage();

    expect(replaceImageSourceInPage(page, 'image-1', onePixelPng)).toBe(page);
    expect(replaceImageSourceInPage(page, 'image-1', ` ${onePixelPng} `)).toBe(page);
  });

  it('rejects an unknown object with a typed code', () => {
    const failure = capture(() => replaceImageSourceInPage(buildPage(), 'missing', otherPng));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'unknown-object' });
  });

  it('rejects a target that is not an image with a typed code', () => {
    const failure = capture(() => replaceImageSourceInPage(buildPage(), 'shape-1', otherPng));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'not-an-image' });
  });

  it('rejects an empty source with a typed code', () => {
    const failure = capture(() => replaceImageSourceInPage(buildPage(), 'image-1', '   '));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'empty-source' });
  });
});

describe('readImageFile', () => {
  it('reads an image file as a data URL', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });

    await expect(readImageFile(file)).resolves.toMatch(/^data:image\/png;base64,/);
  });

  it('rejects a video file with the typed video code', async () => {
    const video = new File([new Uint8Array([0, 0, 0, 24])], 'clip.mp4', { type: 'video/mp4' });
    const failure = await captureAsync(readImageFile(video));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'video-unsupported' });
  });

  it('rejects an image type outside the matrix with its own code', async () => {
    const gif = new File([new Uint8Array([71, 73, 70])], 'clip.gif', { type: 'image/gif' });
    const failure = await captureAsync(readImageFile(gif));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'unsupported-type' });
  });

  it('maps a reader failure to the read-failed code', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });
    // The invalid-file branch above never reaches the FileReader; this is the
    // one that proves the reader error is translated instead of escaping as a
    // generic failure.
    const readerSpy = vi
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function (this: FileReader) {
        queueMicrotask(() => {
          this.onerror?.call(this, new ProgressEvent('error') as ProgressEvent<FileReader>);
        });
      });

    try {
      const failure = await captureAsync(readImageFile(file));

      expect(failure).toBeInstanceOf(ImageReplaceError);
      expect(failure).toMatchObject({ code: 'file-read-failed' });
    } finally {
      readerSpy.mockRestore();
    }
  });
});

describe('replaceImageFromFile', () => {
  it('replaces the source of the target image', async () => {
    const page = buildPage();
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' });
    const next = await replaceImageFromFile(page, 'image-1', file);

    expect(next.objects[0]).toMatchObject({ id: 'image-1', x: 42, y: 24, width: 320, height: 180 });
    expect(next.objects[0]).toMatchObject({ src: expect.stringMatching(/^data:image\/png;base64,/) });
  });

  it('leaves the document byte for byte equal when the resolution fails', async () => {
    const document = createDocument([buildPage()]);
    const before = serializeDocument(document);
    const video = new File([new Uint8Array([0, 0, 0, 24])], 'clip.mp4', { type: 'video/mp4' });

    const failure = await captureAsync(replaceImageFromFile(document.pages[0], 'image-1', video));

    expect(failure).toBeInstanceOf(ImageReplaceError);
    expect(failure).toMatchObject({ code: 'video-unsupported' });
    expect(serializeDocument(document)).toBe(before);
  });
});

describe('pickClipboardImageFile', () => {
  it('picks the first image and ignores the other files', () => {
    const text = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const image = new File([new Uint8Array([1])], 'pasted.png', { type: 'image/png' });

    expect(pickClipboardImageFile([text, image])).toBe(image);
  });

  it('has no image when the clipboard carries none', () => {
    const text = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    expect(pickClipboardImageFile([text])).toBeNull();
    expect(pickClipboardImageFile([])).toBeNull();
  });
});

describe('imageReplaceErrorMessage', () => {
  const copy = {
    invalidFile: 'invalid',
    readFailed: 'read',
    videoUnsupported: 'video',
    unsupportedType: 'type',
    error: 'generic',
  };

  it('maps the read codes to their own message', () => {
    expect(imageReplaceErrorMessage('invalid-file', copy)).toBe('invalid');
    expect(imageReplaceErrorMessage('file-read-failed', copy)).toBe('read');
  });

  it('maps the media-type refusals to their own message', () => {
    expect(imageReplaceErrorMessage('video-unsupported', copy)).toBe('video');
    expect(imageReplaceErrorMessage('unsupported-type', copy)).toBe('type');
  });

  it('falls back to the generic message for the document codes', () => {
    expect(imageReplaceErrorMessage('unknown-object', copy)).toBe('generic');
    expect(imageReplaceErrorMessage('not-an-image', copy)).toBe('generic');
    expect(imageReplaceErrorMessage('empty-source', copy)).toBe('generic');
  });
});
