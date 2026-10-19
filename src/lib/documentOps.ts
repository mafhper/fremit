/**
 * Pure operations on the Documento JSON: objects, layers and pages.
 *
 * Every function returns a new document/page — nothing is mutated in place, so
 * the store can call them inside `set` and React can compare references. The
 * Fabric canvas and the panels both go through here, which keeps one source of
 * truth for layer order, visibility, lock and page geometry.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { createPage, type DocumentObject, type DocumentPage, type FremitDocument, type ImageObject, type ShapeObject, type TextObject } from '@/lib/document';

/**
 * Page formats for the minimal resize (F1.6). Dimensions fixed at execution
 * time: poster is the square social format, banner is a wide strip and hero is
 * the 16:9 presentation format.
 */
export const PAGE_FORMATS = [
  { id: 'poster', width: 1080, height: 1080 },
  { id: 'banner', width: 1500, height: 500 },
  { id: 'hero', width: 1920, height: 1080 },
] as const;

export type PageFormatId = (typeof PAGE_FORMATS)[number]['id'];

export interface PageFormat {
  id: PageFormatId;
  width: number;
  height: number;
}

export function getPageFormat(id: PageFormatId): PageFormat {
  const format = PAGE_FORMATS.find((candidate) => candidate.id === id);

  if (!format) {
    throw new Error(`unknown page format: ${id}`);
  }

  return format;
}

/** Geometry patch for one object; the discriminant `type` never changes. */
export type DocumentObjectPatch = Partial<
  Omit<TextObject, 'type'> & Omit<ShapeObject, 'type'> & Omit<ImageObject, 'type'>
>;

function mergeObject(object: DocumentObject, patch: DocumentObjectPatch): DocumentObject {
  return { ...object, ...patch };
}

export function findPage(document: FremitDocument, pageId: string): DocumentPage | undefined {
  return document.pages.find((page) => page.id === pageId);
}

export function replacePage(document: FremitDocument, page: DocumentPage): FremitDocument {
  return {
    ...document,
    pages: document.pages.map((candidate) => (candidate.id === page.id ? page : candidate)),
  };
}

export function updateObjectInPage(
  page: DocumentPage,
  objectId: string,
  patch: DocumentObjectPatch,
): DocumentPage {
  return {
    ...page,
    objects: page.objects.map((object) =>
      object.id === objectId ? mergeObject(object, patch) : object,
    ),
  };
}

export function addObjectToPage(page: DocumentPage, object: DocumentObject): DocumentPage {
  return { ...page, objects: [...page.objects, object] };
}

export function removeObjectFromPage(page: DocumentPage, objectId: string): DocumentPage {
  return { ...page, objects: page.objects.filter((object) => object.id !== objectId) };
}

/**
 * Moves an object in z-order. `up` brings it closer to the front (the end of
 * the array); `down` sends it back.
 */
export function moveObjectInPage(
  page: DocumentPage,
  objectId: string,
  direction: 'up' | 'down',
): DocumentPage {
  const index = page.objects.findIndex((object) => object.id === objectId);
  const target = direction === 'up' ? index + 1 : index - 1;

  if (index < 0 || target < 0 || target >= page.objects.length) {
    return page;
  }

  const objects = [...page.objects];
  [objects[index], objects[target]] = [objects[target], objects[index]];

  return { ...page, objects };
}

export function addPage(document: FremitDocument): { document: FremitDocument; pageId: string } {
  const page = createPage({ name: `Page ${document.pages.length + 1}` });

  return {
    document: { ...document, pages: [...document.pages, page] },
    pageId: page.id,
  };
}

/**
 * Appends a page built from a template seed. A seed whose id is already in the
 * document (the same seed applied twice) is re-identified — fresh page id and
 * fresh object ids — so the two applications never share identity and stay
 * independently editable; a free id lands exactly as built. The returned id
 * lets the caller activate the page that landed.
 */
export function addTemplatePage(
  document: FremitDocument,
  page: DocumentPage,
): { document: FremitDocument; pageId: string } {
  const unique = findPage(document, page.id)
    ? {
        ...page,
        id: crypto.randomUUID(),
        objects: page.objects.map((object) => ({ ...cloneObject(object), id: crypto.randomUUID() })),
      }
    : page;

  return {
    document: { ...document, pages: [...document.pages, unique] },
    pageId: unique.id,
  };
}

export function duplicatePage(
  document: FremitDocument,
  pageId: string,
): { document: FremitDocument; pageId: string } {
  const index = document.pages.findIndex((page) => page.id === pageId);
  const source = document.pages[index];

  if (!source) {
    return { document, pageId };
  }

  const copy: DocumentPage = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} copy`,
    // The transition is a nested value like the object animation: the copy
    // owns its own, never a shared reference.
    transition: source.transition ? { ...source.transition } : null,
    objects: source.objects.map((object) => ({ ...cloneObject(object), id: crypto.randomUUID() })),
  };

  const pages = [...document.pages];
  pages.splice(index + 1, 0, copy);

  return { document: { ...document, pages }, pageId: copy.id };
}

export function movePage(
  document: FremitDocument,
  pageId: string,
  direction: 'up' | 'down',
): FremitDocument {
  const index = document.pages.findIndex((page) => page.id === pageId);
  const target = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= document.pages.length) {
    return document;
  }

  const pages = [...document.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];

  return { ...document, pages };
}

export function renamePage(document: FremitDocument, pageId: string, name: string): FremitDocument {
  return {
    ...document,
    pages: document.pages.map((page) => (page.id === pageId ? { ...page, name } : page)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleObject(
  object: DocumentObject,
  scale: number,
  offsetX: number,
  offsetY: number,
  target: { width: number; height: number },
): DocumentObject {
  const width = Math.min(object.width * scale, target.width);
  const height = Math.min(object.height * scale, target.height);
  const base = {
    ...object,
    x: clamp(object.x * scale + offsetX, 0, Math.max(target.width - width, 0)),
    y: clamp(object.y * scale + offsetY, 0, Math.max(target.height - height, 0)),
    width,
    height,
  };

  if (base.type === 'text') {
    return { ...base, fontSize: base.fontSize * scale };
  }

  if (base.type === 'shape') {
    return {
      ...base,
      strokeWidth: base.strokeWidth * scale,
      cornerRadius: base.cornerRadius * scale,
    };
  }

  return base;
}

/**
 * Resizes the page to a format without losing content: every object is scaled
 * by the same factor, centered and clamped inside the new bounds, and
 * measurements that do not follow width/height (font size, stroke, corner
 * radius) scale with the page.
 */
export function resizePageToFormat(page: DocumentPage, formatId: PageFormatId): DocumentPage {
  const target = getPageFormat(formatId);
  const scale = Math.min(target.width / page.width, target.height / page.height);
  const offsetX = (target.width - page.width * scale) / 2;
  const offsetY = (target.height - page.height * scale) / 2;

  return {
    ...page,
    width: target.width,
    height: target.height,
    objects: page.objects.map((object) => scaleObject(object, scale, offsetX, offsetY, target)),
  };
}
