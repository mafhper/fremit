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

import { pageBackgroundsEqual, sanitizePageBackground } from '@/lib/pageBackground';
import { createPage, type DocumentObject, type DocumentObjectBase, type DocumentPage, type FremitDocument, type ImageObject, type PageBackground, type PageTransition, type ShapeObject, type TextObject } from '@/lib/document';

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

/**
 * One patch, discriminated by the object type it may touch. The union is what
 * keeps a cross patch out: `fontFamily` never type-checks against a shape, and
 * `id`/`type` are omitted from every branch, so a patch cannot rewrite the
 * identity of the object it targets. Fields shared by every type build through
 * `objectPatch`, which takes the discriminant from the target.
 */
export type DocumentObjectPatch =
  | ({ type: 'text' } & Partial<Omit<TextObject, 'id' | 'type'>>)
  | ({ type: 'shape' } & Partial<Omit<ShapeObject, 'id' | 'type'>>)
  | ({ type: 'image' } & Partial<Omit<ImageObject, 'id' | 'type'>>);

/** Fields every object type shares — safe to build before the target is known. */
export type CommonObjectFields = Partial<Omit<DocumentObjectBase, 'id'>>;

/**
 * Wraps shared fields into a patch for `type`; the discriminant comes from the
 * target. The `type` is written after the spread on purpose: a cast could
 * smuggle a `type` into the shared fields, and the spread order is what stops
 * it from retargeting the patch — `mergeObject` repeats the refusal at write
 * time.
 */
export function objectPatch(
  type: DocumentObject['type'],
  fields: CommonObjectFields,
): DocumentObjectPatch {
  switch (type) {
    case 'text':
      return { ...fields, type: 'text' };
    case 'shape':
      return { ...fields, type: 'shape' };
    case 'image':
      return { ...fields, type: 'image' };
  }
}

/**
 * Merges a patch into one object. The discriminant must match the target and
 * only fields the object already carries are written: a cross patch
 * (`fontFamily` on a shape) or an identity rewrite (`id`) rejects the whole
 * patch instead of corrupting the object. Both are only reachable through a
 * cast — the types already forbid them — but the merge never trusts the cast.
 */
function mergeObject(object: DocumentObject, patch: DocumentObjectPatch): DocumentObject {
  const { type, ...fields } = patch;

  if (type !== object.type) return object;

  for (const key of Object.keys(fields)) {
    if (key === 'id' || !(key in object)) return object;
  }

  return { ...object, ...fields };
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
  const index = page.objects.findIndex((object) => object.id === objectId);
  const current = page.objects[index];

  // An unknown id is not a write: the page reference stays put.
  if (!current) return page;

  const next = mergeObject(current, patch);

  // A rejected patch (wrong type, cross field, identity rewrite) is not a write either.
  if (next === current) return page;

  const objects = [...page.objects];
  objects[index] = next;

  return { ...page, objects };
}

/** Appends every object on top of the stack in one page replacement. */
export function addObjectsToPage(page: DocumentPage, objects: DocumentObject[]): DocumentPage {
  if (objects.length === 0) return page;

  return { ...page, objects: [...page.objects, ...objects] };
}

export function addObjectToPage(page: DocumentPage, object: DocumentObject): DocumentPage {
  return addObjectsToPage(page, [object]);
}

export function removeObjectFromPage(page: DocumentPage, objectId: string): DocumentPage {
  return { ...page, objects: page.objects.filter((object) => object.id !== objectId) };
}

/**
 * Copy of one object with fresh nested values. `arc` and `animation` are the
 * nested values an object carries, and a plain spread would keep sharing them:
 * the copies are meant to be independently editable, so an in-place edit of
 * one must never leak into the other. Fresh identity stays the caller's job.
 */
function cloneObject(object: DocumentObject): DocumentObject {
  const base: DocumentObject = {
    ...object,
    animation: object.animation ? { ...object.animation } : null,
  };

  if (base.type === 'text') {
    return { ...base, arc: base.arc ? { ...base.arc } : null };
  }

  return base;
}

/**
 * Duplicates one object directly above its source — the object-level
 * counterpart of `duplicatePage`: fresh id, ` copy` name, same content, same
 * neighbourhood in z-order. The copy shares no nested value with its source,
 * so editing one never corrupts the other. The copy's id comes back so the
 * caller can select it. An unknown id is not a write: the page reference stays
 * put.
 */
export function duplicateObjectInPage(
  page: DocumentPage,
  objectId: string,
): { page: DocumentPage; objectId: string } {
  const index = page.objects.findIndex((object) => object.id === objectId);
  const source = page.objects[index];

  if (!source) {
    return { page, objectId };
  }

  const copy: DocumentObject = {
    ...cloneObject(source),
    id: crypto.randomUUID(),
    name: `${source.name} copy`,
  };

  const objects = [...page.objects];
  objects.splice(index + 1, 0, copy);

  return { page: { ...page, objects }, objectId: copy.id };
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

/**
 * Replaces the page background (Documento v2: solid color, linear gradient or
 * image). Only a complete value is written — a color that is not `#rgb`/
 * `#rrggbb` or an empty image source leaves the page untouched — and stored
 * colors are normalized (trimmed, lowercased). The objects, geometry and
 * everything else stay untouched — changing the page fill never moves content.
 */
export function setPageBackgroundInPage(page: DocumentPage, background: PageBackground): DocumentPage {
  const sanitized = sanitizePageBackground(background);

  if (!sanitized || pageBackgroundsEqual(sanitized, page.background)) {
    return page;
  }

  return { ...page, background: sanitized };
}

function transitionsEqual(a: PageTransition | null, b: PageTransition | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.preset === b.preset &&
    a.durationMs === b.durationMs &&
    a.easing === b.easing &&
    a.direction === b.direction
  );
}

/**
 * Replaces the page transition (Documento v2); `null` is "None". A transition
 * equal to the stored one is not a write — the page reference stays put, like
 * every other no-op in this module.
 */
export function setPageTransitionInPage(
  page: DocumentPage,
  transition: PageTransition | null,
): DocumentPage {
  if (transitionsEqual(page.transition, transition)) return page;

  return { ...page, transition };
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
