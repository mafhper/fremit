import { describe, expect, it } from 'vitest';
import {
  PAGE_FORMATS,
  addObjectToPage,
  addObjectsToPage,
  addPage,
  addTemplatePage,
  duplicateObjectInPage,
  duplicatePage,
  findPage,
  getPageFormat,
  moveObjectInPage,
  movePage,
  objectPatch,
  removeObjectFromPage,
  renamePage,
  replacePage,
  resizePageToFormat,
  setPageBackgroundInPage,
  setPageTransitionInPage,
  updateObjectInPage,
  type CommonObjectFields,
  type DocumentObjectPatch,
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

/** One curved text — the object with the only nested value of the contract. */
function buildCurvedPage(): DocumentPage {
  return {
    ...buildPage(),
    objects: [createTextObject('Curved', { id: 'text-arc', arc: { direction: 'up', amount: 0.6 } })],
  };
}

/**
 * The parameterized shapes of schema v2. `sides` and `innerRadius` are content,
 * not length: the generic operations must carry them untouched.
 */
function buildParameterizedPage(): DocumentPage {
  return {
    ...buildPage(),
    objects: [
      createShapeObject('star', {
        id: 'star-1',
        x: 100,
        y: 100,
        width: 300,
        height: 300,
        sides: 9,
        innerRadius: 0.42,
      }),
      createShapeObject('polygon', {
        id: 'polygon-1',
        x: 500,
        y: 100,
        width: 200,
        height: 200,
        sides: 6,
      }),
    ],
  };
}

describe('object operations', () => {
  it('patches only the target object and keeps the rest untouched', () => {
    const page = buildPage();
    const next = updateObjectInPage(page, 'shape-1', { type: 'shape', x: 42, opacity: 0.5 });

    const shape = next.objects.find((object) => object.id === 'shape-1');
    expect(shape).toMatchObject({ x: 42, opacity: 0.5 });
    expect(next.objects.find((object) => object.id === 'text-1')).toEqual(page.objects[2]);
    expect(next.objects).toHaveLength(3);
  });

  it('patches type-specific fields (font size) without losing the type', () => {
    const next = updateObjectInPage(buildPage(), 'text-1', {
      type: 'text',
      fontSize: 72,
      text: 'Changed',
    });
    const text = next.objects.find((object): object is TextObject => object.id === 'text-1');

    expect(text?.type).toBe('text');
    expect(text?.fontSize).toBe(72);
    expect(text?.text).toBe('Changed');
    expect(text?.align).toBe('left');
  });

  it('rejects a patch built for another object type', () => {
    const page = buildPage();
    const crossed: DocumentObjectPatch = { type: 'text', text: 'nope' };

    expect(updateObjectInPage(page, 'shape-1', crossed)).toBe(page);
  });

  it('rejects a cross field smuggled through a cast instead of corrupting the shape', () => {
    const page = buildPage();
    // `fontFamily` belongs to text objects; the cast is the only way to get it
    // into a shape patch — the merge must refuse the whole patch.
    const crossed = { type: 'shape', fontFamily: 'Georgia' } as unknown as DocumentObjectPatch;
    const next = updateObjectInPage(page, 'shape-1', crossed);

    expect(next).toBe(page);
    expect(next.objects.find((object) => object.id === 'shape-1')).not.toHaveProperty('fontFamily');
  });

  it('never rewrites the id, even when a cast smuggles one in', () => {
    const page = buildPage();
    const crossed = { type: 'shape', id: 'hacked', x: 5 } as unknown as DocumentObjectPatch;
    const next = updateObjectInPage(page, 'shape-1', crossed);

    expect(next).toBe(page);
    expect(next.objects.map((object) => object.id)).not.toContain('hacked');
  });

  it('ignores an unknown object id without touching the page', () => {
    const page = buildPage();

    expect(updateObjectInPage(page, 'missing', { type: 'shape', x: 1 })).toBe(page);
  });

  it('builds a patch for shared fields with the discriminant of the target', () => {
    expect(objectPatch('text', { x: 1 })).toEqual({ type: 'text', x: 1 });
    expect(objectPatch('shape', { visible: false })).toEqual({ type: 'shape', visible: false });
    expect(objectPatch('image', { name: 'Shot' })).toEqual({ type: 'image', name: 'Shot' });
  });

  it('never lets a casted type override the discriminant of the patch', () => {
    // The only way to get a `type` into the shared fields is a cast; the
    // builder must keep the discriminant it was given.
    const smuggled = { type: 'shape', x: 1 } as unknown as CommonObjectFields;
    const patch = objectPatch('text', smuggled);

    expect(patch.type).toBe('text');

    // Built for text, the patch must not land on a shape — and still lands on
    // the type it was built for.
    const page = buildPage();
    expect(updateObjectInPage(page, 'shape-1', patch)).toBe(page);
    expect(updateObjectInPage(page, 'text-1', patch).objects[2]).toMatchObject({ x: 1 });
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

  it('adds a group in one page replacement and ignores an empty group', () => {
    const page = buildPage();
    const group = [
      createShapeObject('ellipse', { id: 'shape-2' }),
      createTextObject('Two', { id: 'text-2' }),
    ];
    const added = addObjectsToPage(page, group);

    expect(added.objects.map((object) => object.id)).toEqual([
      'image-1',
      'shape-1',
      'text-1',
      'shape-2',
      'text-2',
    ]);
    expect(added.objects.slice(0, 3)).toEqual(page.objects);

    expect(addObjectsToPage(added, [])).toBe(added);
  });

  it('duplicates an object directly above its source with a fresh identity', () => {
    const page = buildPage();
    const { page: next, objectId } = duplicateObjectInPage(page, 'shape-1');
    const copy = next.objects.find((object) => object.id === objectId);

    expect(next.objects.map((object) => object.id)).toEqual([
      'image-1',
      'shape-1',
      objectId,
      'text-1',
    ]);
    expect(objectId).not.toBe('shape-1');
    // Same content, different identity: the copy is a clone of its source.
    expect(copy).toEqual({ ...page.objects[1], id: objectId, name: 'Shape copy' });
  });

  it('ignores duplicate requests for unknown objects', () => {
    const page = buildPage();
    const result = duplicateObjectInPage(page, 'missing');

    expect(result.page).toBe(page);
  });

  it('duplicates the parameterized shapes without flattening their parameters', () => {
    const page = buildParameterizedPage();

    const star = duplicateObjectInPage(page, 'star-1');
    const starCopy = star.page.objects.find((object) => object.id === star.objectId) as ShapeObject;

    expect(starCopy).toMatchObject({
      shape: 'star',
      sides: 9,
      innerRadius: 0.42,
      width: 300,
      height: 300,
    });

    const polygon = duplicateObjectInPage(page, 'polygon-1');
    const polygonCopy = polygon.page.objects.find(
      (object) => object.id === polygon.objectId,
    ) as ShapeObject;

    expect(polygonCopy).toMatchObject({ shape: 'polygon', sides: 6, width: 200, height: 200 });
  });

  it('keeps a duplicated document a valid round-trip', () => {
    const { page } = duplicateObjectInPage(buildPage(), 'text-1');
    const document = createDocument([page]);

    expect(parseDocument(serializeDocument(document))).toEqual(document);
  });

  it('duplicates an image with its mask without altering the source', () => {
    const page: DocumentPage = {
      ...buildPage(),
      objects: [
        createImageObject(onePixelPng, {
          id: 'image-1',
          x: 10,
          y: 20,
          width: 300,
          height: 200,
          mask: 'rounded',
        }),
        createShapeObject('rect', { id: 'shape-1' }),
      ],
    };

    const { page: next, objectId } = duplicateObjectInPage(page, 'image-1');
    const copy = next.objects.find((object) => object.id === objectId);

    expect(copy).toMatchObject({
      type: 'image',
      mask: 'rounded',
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
    expect(page.objects[0]).toMatchObject({ mask: 'rounded' });

    // The mask is a document field: clearing the copy never touches the source.
    const edited = updateObjectInPage(next, objectId, { type: 'image', mask: null });
    expect(edited.objects.find((object) => object.id === objectId)).toMatchObject({ mask: null });
    expect(edited.objects[0]).toMatchObject({ mask: 'rounded' });
  });

  it('duplicates a curved text with an arc independent from the source', () => {
    const page = buildCurvedPage();
    const { page: next, objectId } = duplicateObjectInPage(page, 'text-arc');
    const source = page.objects[0] as TextObject;
    const copy = next.objects.find((object) => object.id === objectId) as TextObject;

    expect(copy.arc).toEqual({ direction: 'up', amount: 0.6 });
    expect(copy.arc).not.toBe(source.arc);

    // The copy is independently editable: an in-place edit of the copy's arc
    // must not corrupt the source.
    if (!copy.arc) throw new Error('expected the copy to keep the arc');
    copy.arc.amount = 0.1;

    expect(source.arc).toEqual({ direction: 'up', amount: 0.6 });
  });

  it('patches the entrance animation through the shared fields', () => {
    const page = buildPage();
    const animation = { preset: 'fade', durationMs: 600, easing: 'easeOut', direction: 'up' } as const;
    const next = updateObjectInPage(page, 'shape-1', objectPatch('shape', { animation }));

    expect(next.objects[1].animation).toEqual(animation);
    expect(next.objects[0]).toBe(page.objects[0]);

    // Clearing is an explicit null — the object goes back to static.
    const cleared = updateObjectInPage(next, 'shape-1', objectPatch('shape', { animation: null }));
    expect(cleared.objects[1].animation).toBeNull();
  });

  it('duplicates an object with an animation independent from the source', () => {
    const page = updateObjectInPage(
      buildPage(),
      'text-1',
      objectPatch('text', {
        animation: { preset: 'words', durationMs: 700, easing: 'easeOut', direction: 'up' },
      }),
    );
    const { page: next, objectId } = duplicateObjectInPage(page, 'text-1');
    const source = page.objects.find((object) => object.id === 'text-1');
    const copy = next.objects.find((object) => object.id === objectId);

    expect(copy?.animation).toEqual(source?.animation);
    expect(copy?.animation).not.toBe(source?.animation);

    // The copy is independently editable: an in-place edit of the copy's
    // animation must not corrupt the source.
    if (!copy?.animation) throw new Error('expected the copy to keep the animation');
    copy.animation.durationMs = 100;

    expect(source?.animation?.durationMs).toBe(700);
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
    const next = updateObjectInPage(buildPage(), 'image-1', {
      type: 'image',
      visible: false,
      locked: true,
    });
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
