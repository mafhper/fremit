import { describe, expect, it } from 'vitest';
import {
  PAGE_FORMATS,
  addObjectToPage,
  addPage,
  duplicatePage,
  findPage,
  getPageFormat,
  moveObjectInPage,
  movePage,
  removeObjectFromPage,
  renamePage,
  replacePage,
  resizePageToFormat,
  updateObjectInPage,
} from '@/lib/documentOps';
import {
  createDocument,
  createImageObject,
  createPage,
  createShapeObject,
  createTextObject,
  type DocumentPage,
  type FremitDocument,
  type ShapeObject,
  type TextObject,
} from '@/lib/document';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function buildPage(): DocumentPage {
  return {
    ...createPage({
      id: 'page-1',
      name: 'Poster',
      width: 1000,
      height: 1000,
      background: { kind: 'solid', color: '#ffffff' },
    }),
    objects: [
      createImageObject(onePixelPng, { id: 'image-1', x: 0, y: 0, width: 1000, height: 1000 }),
      createShapeObject('rect', { id: 'shape-1', x: 0, y: 0, width: 100, height: 100 }),
      createTextObject('Hello', { id: 'text-1', x: 100, y: 100, width: 400, height: 120, fontSize: 40 }),
    ],
  };
}

function buildDocument(): FremitDocument {
  return createDocument([buildPage()]);
}

describe('object operations', () => {
  it('patches only the target object and keeps the rest untouched', () => {
    const page = buildPage();
    const next = updateObjectInPage(page, 'shape-1', { x: 42, opacity: 0.5 });

    const shape = next.objects.find((object) => object.id === 'shape-1');
    expect(shape).toMatchObject({ x: 42, opacity: 0.5 });
    expect(next.objects.find((object) => object.id === 'text-1')).toEqual(page.objects[2]);
    expect(next.objects).toHaveLength(3);
  });

  it('patches type-specific fields (font size) without losing the type', () => {
    const next = updateObjectInPage(buildPage(), 'text-1', { fontSize: 72, text: 'Changed' });
    const text = next.objects.find((object): object is TextObject => object.id === 'text-1');

    expect(text?.type).toBe('text');
    expect(text?.fontSize).toBe(72);
    expect(text?.text).toBe('Changed');
    expect(text?.align).toBe('left');
  });

  it('adds an object on top and removes it by id', () => {
    const extra = createShapeObject('ellipse', { id: 'shape-2' });
    const added = addObjectToPage(buildPage(), extra);

    expect(added.objects.map((object) => object.id)).toEqual([
      'image-1',
      'shape-1',
      'text-1',
      'shape-2',
    ]);

    const removed = removeObjectFromPage(added, 'shape-2');
    expect(removed.objects.map((object) => object.id)).toEqual(['image-1', 'shape-1', 'text-1']);
  });

  it('moves an object up and down in z-order and stops at the edges', () => {
    const page = buildPage();
    const raised = moveObjectInPage(page, 'shape-1', 'up');

    expect(raised.objects.map((object) => object.id)).toEqual(['image-1', 'text-1', 'shape-1']);

    const lowered = moveObjectInPage(raised, 'shape-1', 'down');
    expect(lowered.objects.map((object) => object.id)).toEqual(['image-1', 'shape-1', 'text-1']);

    expect(moveObjectInPage(page, 'image-1', 'down')).toBe(page);
    expect(moveObjectInPage(page, 'text-1', 'up')).toBe(page);
    expect(moveObjectInPage(page, 'missing', 'up')).toBe(page);
  });

  it('keeps the layer flags through a patch', () => {
    const next = updateObjectInPage(buildPage(), 'image-1', { visible: false, locked: true });
    const image = next.objects[0];

    expect(image.visible).toBe(false);
    expect(image.locked).toBe(true);
  });
});

describe('page operations', () => {
  it('adds a page with a fresh id and name', () => {
    const { document, pageId } = addPage(buildDocument());

    expect(document.pages).toHaveLength(2);
    expect(document.pages[1].id).toBe(pageId);
    expect(document.pages[1].name).toBe('Page 2');
    expect(document.pages[1].objects).toEqual([]);
  });

  it('appends a template seed page, re-identifying a colliding id', () => {
    const document = buildDocument();
    const seed: DocumentPage = {
      ...createPage({
        name: 'Social post',
        width: 1080,
        height: 1080,
        background: { kind: 'solid', color: '#0b1220' },
      }),
      objects: [
        createTextObject('Hello', { id: 'seed-text-1' }),
        createShapeObject('rect', { id: 'seed-shape-1' }),
      ],
    };

    const first = addTemplatePage(document, seed);

    expect(first.document.pages).toHaveLength(2);
    expect(first.pageId).toBe(seed.id);
    // A free id lands exactly as built — nothing is re-identified.
    expect(findPage(first.document, seed.id)).toEqual(seed);

    // The same seed applied twice never overwrites the first application.
    const second = addTemplatePage(first.document, seed);

    expect(second.document.pages).toHaveLength(3);
    expect(second.pageId).not.toBe(seed.id);
    expect(findPage(second.document, second.pageId)?.name).toBe('Social post');
    expect(findPage(second.document, seed.id)).toEqual(seed);

    // The second application shares no identity with the first: the page and
    // every object get fresh ids, so both copies stay independently editable.
    const secondPage = findPage(second.document, second.pageId);
    const seedObjectIds = new Set(seed.objects.map((object) => object.id));

    expect(secondPage?.objects.map((object) => object.name)).toEqual(
      seed.objects.map((object) => object.name),
    );
    expect(secondPage?.objects.some((object) => seedObjectIds.has(object.id))).toBe(false);
  });

  it('re-identifies a colliding template seed with an arc independent from the seed', () => {
    const document = createDocument([buildCurvedPage()]);
    const seed = buildCurvedPage(); // same page id as the document: lands re-identified
    const { document: next, pageId } = addTemplatePage(document, seed);
    const seedText = seed.objects[0] as TextObject;
    const landedText = findPage(next, pageId)?.objects[0] as TextObject;

    expect(landedText.arc).toEqual({ direction: 'up', amount: 0.6 });
    expect(landedText.arc).not.toBe(seedText.arc);

    // An in-place edit of the landed copy must not corrupt the seed.
    if (!landedText.arc) throw new Error('expected the landed page to keep the arc');
    landedText.arc.amount = 0.1;

    expect(seedText.arc).toEqual({ direction: 'up', amount: 0.6 });
  });

  it('lands a re-identified template seed with the parameterized shapes intact', () => {
    // Same page id as the document, so the seed takes the re-identification
    // branch — the one that clones every object.
    const seed = buildParameterizedPage();
    const { document, pageId } = addTemplatePage(buildDocument(), seed);
    const landed = findPage(document, pageId) as DocumentPage;

    expect(pageId).not.toBe(seed.id);
    expect(landed.objects).toHaveLength(2);
    expect(landed.objects[0]).toMatchObject({ shape: 'star', sides: 9, innerRadius: 0.42 });
    expect(landed.objects[1]).toMatchObject({ shape: 'polygon', sides: 6, innerRadius: 0.5 });
    expect(landed.objects.map((object) => object.id)).not.toContain('star-1');
  });

  it('duplicates a page after the source with new ids and the same content', () => {
    const source = buildDocument();
    const { document, pageId } = duplicatePage(source, 'page-1');
    const copy = findPage(document, pageId);

    expect(document.pages).toHaveLength(2);
    expect(document.pages[0].id).toBe('page-1');
    expect(document.pages[1].id).toBe(pageId);
    expect(copy?.name).toBe('Poster copy');
    expect(copy?.objects).toHaveLength(3);
    expect(copy?.objects.map((object) => object.type)).toEqual(['image', 'shape', 'text']);
    // Same content, different identity: no id is shared with the source.
    const sourceIds = new Set(source.pages[0].objects.map((object) => object.id));
    expect(copy?.objects.some((object) => sourceIds.has(object.id))).toBe(false);
  });

  it('duplicates a page keeping the image mask', () => {
    const source = createDocument([
      {
        ...buildPage(),
        objects: [
          createImageObject(onePixelPng, {
            id: 'image-1',
            width: 300,
            height: 200,
            mask: 'rounded',
          }),
        ],
      },
    ]);
    const { document, pageId } = duplicatePage(source, 'page-1');
    const copyImage = findPage(document, pageId)?.objects[0];

    expect(copyImage).toMatchObject({ type: 'image', mask: 'rounded' });
    expect(source.pages[0].objects[0]).toMatchObject({ mask: 'rounded' });
    expect(copyImage?.id).not.toBe('image-1');
  });

  it('duplicates a page whose curved text has an arc independent from the source', () => {
    const source = createDocument([buildCurvedPage()]);
    const { document, pageId } = duplicatePage(source, 'page-1');
    const sourceText = source.pages[0].objects[0] as TextObject;
    const copyText = findPage(document, pageId)?.objects[0] as TextObject;

    expect(copyText.arc).toEqual({ direction: 'up', amount: 0.6 });
    expect(copyText.arc).not.toBe(sourceText.arc);

    // An in-place edit of the copy's arc must not corrupt the source page.
    if (!copyText.arc) throw new Error('expected the copy to keep the arc');
    copyText.arc.amount = 0.1;

    expect(sourceText.arc).toEqual({ direction: 'up', amount: 0.6 });
  });

  it('replaces the page transition, treats an equal value as a no-op and clears to None', () => {
    const page = buildPage();
    const transition = { preset: 'dip', durationMs: 600, easing: 'easeInOut', direction: 'up' } as const;
    const next = setPageTransitionInPage(page, transition);

    expect(next.transition).toEqual(transition);
    expect(next.objects).toBe(page.objects);

    // An equal value is not a write: the page reference stays put.
    expect(setPageTransitionInPage(next, { ...transition })).toBe(next);

    // `null` is "None": the page keeps no transition object.
    expect(setPageTransitionInPage(next, null).transition).toBeNull();
    expect(setPageTransitionInPage(page, null)).toBe(page);
  });

  it('duplicates a page with a transition independent from the source', () => {
    const page = setPageTransitionInPage(buildPage(), {
      preset: 'circle',
      durationMs: 650,
      easing: 'easeOut',
      direction: 'up',
    });
    const { document, pageId } = duplicatePage(createDocument([page]), 'page-1');
    const copy = findPage(document, pageId);

    expect(copy?.transition).toEqual(page.transition);
    expect(copy?.transition).not.toBe(page.transition);

    // An in-place edit of the copy's transition must not corrupt the source.
    if (!copy?.transition) throw new Error('expected the copy to keep the transition');
    copy.transition.preset = 'fade';

    expect(page.transition?.preset).toBe('circle');
  });

  it('ignores duplicate and move requests for unknown pages', () => {
    const document = buildDocument();

    expect(duplicatePage(document, 'missing').document).toBe(document);
    expect(movePage(document, 'missing', 'up')).toBe(document);
  });

  it('moves and renames pages', () => {
    const withTwo = addPage(buildDocument()).document;
    const secondId = withTwo.pages[1].id;
    const moved = movePage(withTwo, secondId, 'up');

    expect(moved.pages.map((page) => page.name)).toEqual(['Page 2', 'Poster']);
    expect(movePage(moved, secondId, 'up')).toBe(moved);

    const renamed = renamePage(moved, secondId, 'Hero');
    expect(findPage(renamed, secondId)?.name).toBe('Hero');
  });

  it('replaces a page without touching its neighbours', () => {
    const withTwo = addPage(buildDocument()).document;
    const updated = { ...buildPage(), name: 'Updated' };
    const document = replacePage(withTwo, updated);

    expect(document.pages[0].name).toBe('Updated');
    expect(document.pages[1]).toEqual(withTwo.pages[1]);
  });
});

describe('page resize', () => {
  it('declares poster, banner and hero formats', () => {
    expect(PAGE_FORMATS.map((format) => format.id)).toEqual(['poster', 'banner', 'hero']);
    expect(getPageFormat('poster')).toEqual({ id: 'poster', width: 1080, height: 1080 });
    expect(() => getPageFormat('unknown' as 'poster')).toThrow(/unknown page format/);
  });

  it('scales, centers and keeps every object inside the new format', () => {
    const page = resizePageToFormat(buildPage(), 'banner');
    const format = getPageFormat('banner');

    expect(page.width).toBe(format.width);
    expect(page.height).toBe(format.height);

    for (const object of page.objects) {
      expect(object.x).toBeGreaterThanOrEqual(0);
      expect(object.y).toBeGreaterThanOrEqual(0);
      expect(object.x + object.width).toBeLessThanOrEqual(format.width);
      expect(object.y + object.height).toBeLessThanOrEqual(format.height);
    }

    // 1000x1000 -> 1500x500: uniform 0.5 scale, centered horizontally.
    const text = page.objects.find((object): object is TextObject => object.id === 'text-1');
    expect(text?.x).toBeCloseTo(550, 6);
    expect(text?.y).toBeCloseTo(50, 6);
    expect(text?.width).toBeCloseTo(200, 6);
    expect(text?.fontSize).toBeCloseTo(20, 6);
  });

  it('scales stroke and corner radius with the page', () => {
    const page = buildPage();
    const shapePage: DocumentPage = {
      ...page,
      objects: [
        createShapeObject('rect', {
          id: 'shape-1',
          stroke: '#000000',
          strokeWidth: 8,
          cornerRadius: 40,
          width: 200,
          height: 200,
        }),
      ],
    };

    const resized = resizePageToFormat(shapePage, 'poster');
    const shape = resized.objects[0] as ShapeObject;

    // 1000 -> 1080 is a 1.08 upscale.
    expect(shape.strokeWidth).toBeCloseTo(8 * 1.08, 6);
    expect(shape.cornerRadius).toBeCloseTo(40 * 1.08, 6);
  });

  it('pulls an object that was outside the old page back inside', () => {
    const page: DocumentPage = {
      ...buildPage(),
      objects: [createShapeObject('rect', { id: 'shape-1', x: 950, y: 0, width: 100, height: 100 })],
    };

    const resized = resizePageToFormat(page, 'poster');
    const shape = resized.objects[0];

    expect(shape.x + shape.width).toBeLessThanOrEqual(1080);
  });

  it('grows a page back to hero proportions without losing the objects', () => {
    const resized = resizePageToFormat(buildPage(), 'hero');

    expect(resized.objects).toHaveLength(3);
    expect(resized.objects.map((object) => object.type)).toEqual(['image', 'shape', 'text']);
  });
});
