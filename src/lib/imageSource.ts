/**
 * The one source gate of image references.
 *
 * A file, a URL or a clipboard blob becomes an image reference only after this
 * module has verified its media type. The accepted set is the image matrix —
 * `svg`/`webp`/`png`/`jpeg`, with `image/jpg` normalized to `image/jpeg` — and
 * it is the same for every entry: the image object (insert and replace) and the
 * page background. A video, an HTML page returned in place of an image, or any
 * other type is refused with a machine-readable code *before* the caller has
 * anything to write.
 *
 * The resolved value is always a self-contained data URL, so the preview, the
 * canvas, the thumbnail and the export consume one reference and cannot drift
 * from what is painted.
 */

import {
  blobToDataUrl,
  fileToDataUrl,
  preloadImage,
  SourceResolutionError,
} from '@/lib/sourceResolver';

/** Image media types of the acceptance matrix. */
export const IMAGE_SOURCE_TYPES = [
  'image/svg+xml',
  'image/webp',
  'image/png',
  'image/jpeg',
] as const;

export type ImageSourceType = (typeof IMAGE_SOURCE_TYPES)[number];

/**
 * `accept` value of the file pickers: the same matrix the resolver enforces.
 * The picker is a hint, never the gate — a file chosen through a drag or a
 * renamed extension still goes through `resolveImageSourceFile`.
 */
export const IMAGE_SOURCE_ACCEPT = IMAGE_SOURCE_TYPES.join(',');

export type ImageSourceErrorCode =
  | 'empty-source'
  | 'invalid-url'
  | 'invalid-file'
  | 'file-read-failed'
  | 'unsupported-type'
  | 'video-unsupported'
  | 'not-an-image'
  | 'image-fetch-failed'
  | 'image-load-failed';

export class ImageSourceError extends Error {
  readonly code: ImageSourceErrorCode;

  /** The media type the source declared, when it declared one. */
  readonly mediaType: string | null;

  constructor(code: ImageSourceErrorCode, message: string, mediaType: string | null = null) {
    super(message);
    this.name = 'ImageSourceError';
    this.code = code;
    this.mediaType = mediaType;
  }
}

/** Lowercase media type without parameters; `image/jpg` becomes `image/jpeg`. */
export function normalizeImageMediaType(value: string): string {
  const mediaType = value.split(';')[0]?.trim().toLowerCase() ?? '';

  return mediaType === 'image/jpg' ? 'image/jpeg' : mediaType;
}

export function isSupportedImageSourceType(value: string): value is ImageSourceType {
  return (IMAGE_SOURCE_TYPES as readonly string[]).includes(normalizeImageMediaType(value));
}

const VIDEO_EXTENSION = /\.(mp4|m4v|mov|webm|ogv|avi|mkv)(?:[?#].*)?$/i;

/** A source that declares itself a video, by name or by media type. */
export function isVideoSource(name: string, mediaType: string): boolean {
  return mediaType.startsWith('video/') || VIDEO_EXTENSION.test(name);
}

/** Media type of a `data:` URL, or `null` when it is not one. */
export function dataUrlMediaType(value: string): string | null {
  const match = /^data:([^;,]+)/i.exec(value);

  return match ? normalizeImageMediaType(match[1]) : null;
}

/**
 * Matrix verdict for a file: an accepted media type, or the refusal code the
 * caller translates into its own vocabulary. The video check comes first, so a
 * `clip.mp4` is refused as video even when the declared type is empty or wrong.
 */
export type ImageSourceVerdict =
  | { ok: true; mediaType: ImageSourceType }
  | { ok: false; code: 'invalid-file' | 'unsupported-type' | 'video-unsupported' };

export function imageSourceVerdict(name: string, declaredType: string): ImageSourceVerdict {
  const mediaType = normalizeImageMediaType(declaredType);

  if (isVideoSource(name, mediaType)) return { ok: false, code: 'video-unsupported' };
  if (!mediaType) return { ok: false, code: 'invalid-file' };
  if (!isSupportedImageSourceType(mediaType)) return { ok: false, code: 'unsupported-type' };

  return { ok: true, mediaType };
}

function refusal(mediaType: string): ImageSourceError {
  if (mediaType.startsWith('video/')) {
    return new ImageSourceError(
      'video-unsupported',
      'Video sources are not supported.',
      mediaType,
    );
  }

  if (mediaType.startsWith('text/') || mediaType === 'application/xhtml+xml') {
    return new ImageSourceError('not-an-image', 'The source did not return an image.', mediaType);
  }

  return new ImageSourceError(
    'unsupported-type',
    `Unsupported image type: ${mediaType || 'unknown'}`,
    mediaType || null,
  );
}

/** Accepts a matrix type; every other type rejects with its own code. */
function assertSupportedMediaType(value: string): ImageSourceType {
  const mediaType = normalizeImageMediaType(value);

  if (isSupportedImageSourceType(mediaType)) return mediaType as ImageSourceType;

  throw refusal(mediaType);
}

/**
 * Reads a local file as a data URL after checking its declared type. The read
 * is the last step: a refused type never starts it, so the caller has nothing
 * to put into the document. The file is re-typed to the normalized matrix type
 * (`image/jpg` reads as `image/jpeg`), so both spellings store the same
 * reference.
 */
export async function resolveImageSourceFile(file: File): Promise<string> {
  const verdict = imageSourceVerdict(file.name, file.type);

  if (!verdict.ok) {
    throw new ImageSourceError(
      verdict.code,
      verdict.code === 'video-unsupported'
        ? 'Video sources are not supported.'
        : `Unsupported image type: ${normalizeImageMediaType(file.type) || 'unknown'}`,
      normalizeImageMediaType(file.type) || null,
    );
  }

  const readable =
    file.type === verdict.mediaType
      ? file
      : new File([file], file.name, {
          type: verdict.mediaType,
          lastModified: file.lastModified,
        });

  try {
    return await fileToDataUrl(readable);
  } catch (error) {
    if (error instanceof SourceResolutionError) {
      throw new ImageSourceError(
        error.code === 'invalid-file' ? 'invalid-file' : 'file-read-failed',
        error.message,
      );
    }

    throw new ImageSourceError('file-read-failed', 'The image file could not be read.');
  }
}

/**
 * Resolves a URL to a self-contained data URL whose media type is an image of
 * the matrix. A response that is HTML (a website URL pasted by mistake) is
 * refused as `not-an-image`, never converted into an image reference; a video
 * is refused as `video-unsupported`.
 */
export async function resolveImageSourceUrl(input: string): Promise<string> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ImageSourceError('empty-source', 'Provide an image URL.');
  }

  if (trimmed.startsWith('data:')) {
    const mediaType = dataUrlMediaType(trimmed);

    if (!mediaType) {
      throw new ImageSourceError('not-an-image', 'The URL does not carry an image.');
    }

    assertSupportedMediaType(mediaType);

    try {
      await preloadImage(trimmed);
    } catch {
      throw new ImageSourceError(
        'image-load-failed',
        'The preview image could not be loaded.',
        mediaType,
      );
    }

    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ImageSourceError('invalid-url', 'This URL is not valid.');
  }

  if (VIDEO_EXTENSION.test(url.pathname)) {
    throw new ImageSourceError('video-unsupported', 'Video sources are not supported.', 'video');
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { credentials: 'omit', mode: 'cors' });
  } catch {
    throw new ImageSourceError(
      'image-fetch-failed',
      'This image URL could not be prepared for export.',
    );
  }

  if (!response.ok) {
    throw new ImageSourceError(
      'image-fetch-failed',
      'This image URL could not be prepared for export.',
    );
  }

  const declared = normalizeImageMediaType(response.headers?.get?.('content-type') ?? '');
  const blob = await response.blob();
  const mediaType = declared || normalizeImageMediaType(blob.type);

  if (!mediaType) {
    throw new ImageSourceError('not-an-image', 'The source did not return an image.');
  }

  assertSupportedMediaType(mediaType);

  try {
    // FileReader stamps the data URL with the blob type; the verified media
    // type wins, so `image/jpg` and `image/jpeg` store the same reference and
    // a response without a type still becomes a typed image.
    const typedBlob = blob.type === mediaType ? blob : new Blob([blob], { type: mediaType });

    const dataUrl = await blobToDataUrl(typedBlob);

    await preloadImage(dataUrl);

    return dataUrl;
  } catch (error) {
    if (error instanceof ImageSourceError) throw error;

    throw new ImageSourceError(
      'image-load-failed',
      'The preview image could not be loaded.',
      mediaType,
    );
  }
}

/** Copy the source gate reads; both entries supply their own localized values. */
export interface ImageSourceCopy {
  invalidUrl: string;
  invalidFile: string;
  readFailed: string;
  videoUnsupported: string;
  unsupportedType: string;
  notAnImage: string;
  fetchFailed: string;
  loadFailed: string;
  error: string;
}

/**
 * Human-readable message of a refusal code. The code is the contract; this is
 * only the rendering, and each code the user can act on gets its own sentence.
 */
export function imageSourceErrorMessage(code: ImageSourceErrorCode, copy: ImageSourceCopy): string {
  switch (code) {
    case 'invalid-url':
      return copy.invalidUrl;
    case 'invalid-file':
      return copy.invalidFile;
    case 'file-read-failed':
      return copy.readFailed;
    case 'video-unsupported':
      return copy.videoUnsupported;
    case 'unsupported-type':
      return copy.unsupportedType;
    case 'not-an-image':
      return copy.notAnImage;
    case 'image-fetch-failed':
      return copy.fetchFailed;
    case 'image-load-failed':
      return copy.loadFailed;
    default:
      return copy.error;
  }
}
