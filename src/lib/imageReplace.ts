/**
 * Replacing the source of an image object.
 *
 * The two input routes (a local file and the clipboard) resolve to a data URL
 * first; only then does the document change. That order is the contract: a
 * failed resolution never reaches `replaceImageSourceInPage`, so the document
 * stays byte for byte what it was before the attempt.
 *
 * The read codes reuse the `sourceResolver` vocabulary (`invalid-file`,
 * `file-read-failed`), so a caller that already handles a capture failure
 * recognises a replacement failure by the same names; the document codes
 * (`unknown-object`, `not-an-image`, `empty-source`) are the ones only a
 * replacement can produce.
 */

import type { DocumentPage } from '@/lib/document';
import { ImageSourceError, resolveImageSourceFile } from '@/lib/imageSource';

export type ImageReplaceErrorCode =
  | 'invalid-file'
  | 'file-read-failed'
  | 'video-unsupported'
  | 'unsupported-type'
  | 'empty-source'
  | 'unknown-object'
  | 'not-an-image';

export class ImageReplaceError extends Error {
  readonly code: ImageReplaceErrorCode;

  constructor(code: ImageReplaceErrorCode, message: string) {
    super(message);
    this.name = 'ImageReplaceError';
    this.code = code;
  }
}

/** What a replacement did; a failure carries the machine-readable code. */
export type ImageReplaceResult = { ok: true } | { ok: false; code: ImageReplaceErrorCode };

/** First image among the clipboard files; `null` when the clipboard has none. */
export function pickClipboardImageFile(files: readonly File[]): File | null {
  return files.find((file) => file.type.startsWith('image/')) ?? null;
}

/**
 * Reads a local file (or a clipboard image already turned into a `File`) as a
 * data URL through the shared source gate, translating the source-resolution
 * failure into the replacement vocabulary. The document is not involved here:
 * a rejected file never reaches `replaceImageSourceInPage`.
 */
export async function readImageFile(file: File): Promise<string> {
  try {
    return await resolveImageSourceFile(file);
  } catch (error) {
    if (error instanceof ImageSourceError) {
      throw new ImageReplaceError(replaceCodeFor(error.code), error.message);
    }

    throw new ImageReplaceError('file-read-failed', 'The image file could not be read.');
  }
}

/** The source-gate codes a file replacement carries; everything else reads as a failure. */
function replaceCodeFor(code: ImageSourceError['code']): ImageReplaceErrorCode {
  switch (code) {
    case 'invalid-file':
    case 'file-read-failed':
    case 'video-unsupported':
    case 'unsupported-type':
      return code;
    default:
      return 'file-read-failed';
  }
}

/**
 * Swaps `src` on the image object `objectId` in place: the object keeps its
 * id, name, geometry, flags, fit and its position in z-order, and no object is
 * created or removed. A target that is missing or is not an image rejects with
 * a typed code instead of corrupting the page, and an unchanged source is not
 * a write — the page reference stays put.
 */
export function replaceImageSourceInPage(
  page: DocumentPage,
  objectId: string,
  src: string,
): DocumentPage {
  const index = page.objects.findIndex((object) => object.id === objectId);
  const current = page.objects[index];

  if (!current) {
    throw new ImageReplaceError('unknown-object', `no object with id ${objectId} on this page`);
  }

  if (current.type !== 'image') {
    throw new ImageReplaceError('not-an-image', `object ${objectId} is a ${current.type}, not an image`);
  }

  const source = src.trim();

  if (!source) {
    throw new ImageReplaceError('empty-source', 'the replacement source is empty');
  }

  if (current.src === source) return page;

  const objects = [...page.objects];
  objects[index] = { ...current, src: source };

  return { ...page, objects };
}

/**
 * Resolves a file and swaps the source of one image object. The failure of the
 * first step propagates before any document write, so a rejected file leaves
 * the document exactly as it was.
 */
export async function replaceImageFromFile(
  page: DocumentPage,
  objectId: string,
  file: File,
): Promise<DocumentPage> {
  const src = await readImageFile(file);

  return replaceImageSourceInPage(page, objectId, src);
}

/** Copy the replacement failure reads from; a subset of the messages schema. */
export interface ImageReplaceCopy {
  invalidFile: string;
  readFailed: string;
  videoUnsupported: string;
  unsupportedType: string;
  error: string;
}

/** Human-readable message of a failure code, from the localized copy. */
export function imageReplaceErrorMessage(code: ImageReplaceErrorCode, copy: ImageReplaceCopy): string {
  switch (code) {
    case 'invalid-file':
      return copy.invalidFile;
    case 'file-read-failed':
      return copy.readFailed;
    case 'video-unsupported':
      return copy.videoUnsupported;
    case 'unsupported-type':
      return copy.unsupportedType;
    default:
      return copy.error;
  }
}
