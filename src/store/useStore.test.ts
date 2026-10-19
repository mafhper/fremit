import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/store/useStore';
import { createPage, createShapeObject } from '@/lib/document';
import { createStarterDocument } from '@/lib/starterDocument';
import { createFontPairingTexts } from '@/lib/textPresets';
import type { ResolvedSource } from '@/types/app';

const workingSource: ResolvedSource = {
  mode: 'upload',
  strategy: 'direct-image',
  sourceUrl: null,
  resolvedImageUrl: 'data:image/png;base64,working',
  title: 'Working preview',
  requestedViewportWidth: null,
  requestedViewportHeight: null,
  requestedCaptureDelayMs: null,
  requestedCaptureSelector: null,
  status: 'ready',
  errorCode: null,
  errorMessage: null,
};

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState((state) => ({
      ...state,
      source: {
        draftUrl: '',
        status: 'idle',
        active: null,
        pendingMode: null,
        pendingUrl: null,
        captureDelayMs: 3000,
        captureSelector: '',
        errorCode: null,
        errorMessage: null,
      },
    }));
  });

  it('keeps the last successful preview when a later load fails', () => {
    useStore.getState().commitResolvedSource(workingSource);
    useStore.getState().startSourceLoading('website-url', 'https://broken.example');
    useStore.getState().failSourceLoading('no-preview', 'Use a screenshot instead.');

    const state = useStore.getState();

    expect(state.source.active?.resolvedImageUrl).toBe('data:image/png;base64,working');
    expect(state.source.status).toBe('error');
    expect(state.source.errorCode).toBe('no-preview');
  });

  it('preserves framing on a recapture and resets it for a different page', () => {
    const firstPage: ResolvedSource = {
      ...workingSource,
      mode: 'website-url',
      strategy: 'microlink-screenshot',
      sourceUrl: 'https://example.com/page-a',
    };

    useStore.getState().commitResolvedSource(firstPage);
    useStore.getState().updateFrame({
      imageZoom: 160,
      imagePositionX: 72,
      imagePositionY: 28,
    });
    useStore.getState().commitResolvedSource({
      ...firstPage,
      requestedViewportWidth: 390,
      requestedViewportHeight: 844,
    });

    expect(useStore.getState().frame).toMatchObject({
      imageZoom: 160,
      imagePositionX: 72,
      imagePositionY: 28,
    });

    useStore.getState().commitResolvedSource({
      ...firstPage,
      sourceUrl: 'https://example.com/page-b',
    });

    expect(useStore.getState().frame).toMatchObject({
      imageZoom: 100,
      imagePositionX: 50,
      imagePositionY: 50,
    });
  });
});

describe('useStore document slice', () => {
  beforeEach(() => {
    const document = createStarterDocument();
    useStore.setState({
      document,
      activePageId: document.pages[0].id,
      selectedObjectId: null,
    });
  });

  it('starts from the starter document: one page, three objects', () => {
    const state = useStore.getState();

    expect(state.document.pages).toHaveLength(1);
    expect(state.document.pages[0].objects.map((object) => object.type)).toEqual([
      'image',
      'shape',
      'text',
    ]);
    expect(state.activePageId).toBe(state.document.pages[0].id);
    expect(state.selectedObjectId).toBeNull();
  });

  it('adds, updates and removes objects on the active page', () => {
    const store = useStore.getState();
    const extra = createShapeObject('ellipse', { name: 'Badge' });

    store.addObject(extra);
    expect(useStore.getState().document.pages[0].objects).toHaveLength(4);
    expect(useStore.getState().selectedObjectId).toBe(extra.id);

    useStore.getState().updateObject(extra.id, { x: 200, y: 300, visible: false });
    const updated = useStore.getState().document.pages[0].objects.find((o) => o.id === extra.id);
    expect(updated).toMatchObject({ x: 200, y: 300, visible: false });

    useStore.getState().removeObject(extra.id);
    expect(useStore.getState().document.pages[0].objects).toHaveLength(3);
    expect(useStore.getState().selectedObjectId).toBeNull();
  });

  it('keeps a different selection when another object is removed', () => {
    const store = useStore.getState();
    const text = store.document.pages[0].objects[2];

    store.selectObject(text.id);
    store.removeObject(store.document.pages[0].objects[0].id);

    expect(useStore.getState().selectedObjectId).toBe(text.id);
  });

  it('reorders layers in z-order', () => {
    const store = useStore.getState();
    const [image, , text] = store.document.pages[0].objects;

    store.moveObjectZ(text.id, 'down');
    expect(useStore.getState().document.pages[0].objects.map((object) => object.id)).toEqual([
      image.id,
      text.id,
      store.document.pages[0].objects[1].id,
    ]);
  });

  it('manages pages: add, duplicate, move, rename and resize', () => {
    const store = useStore.getState();

    store.addPage();
    expect(useStore.getState().document.pages).toHaveLength(2);
    expect(useStore.getState().document.pages[1].objects).toEqual([]);

    const firstPageId = useStore.getState().document.pages[0].id;
    store.duplicatePage(firstPageId);
    expect(useStore.getState().document.pages).toHaveLength(3);
    expect(useStore.getState().activePageId).toBe(useStore.getState().document.pages[1].id);

    const duplicateId = useStore.getState().activePageId;
    useStore.getState().renamePage(duplicateId, 'Banner');
    expect(useStore.getState().document.pages[1].name).toBe('Banner');

    useStore.getState().movePage(duplicateId, 'up');
    expect(useStore.getState().document.pages[0].id).toBe(duplicateId);
    expect(useStore.getState().document.pages[1].id).toBe(firstPageId);

    useStore.getState().resizePage(duplicateId, 'banner');
    const resized = useStore.getState().document.pages[0];
    expect(resized.width).toBe(1500);
    expect(resized.height).toBe(500);
  });

  it('appends a template seed page, activates it and clears the selection', () => {
    const seed = createPage({
      name: 'Social post',
      width: 1080,
      height: 1080,
      background: { kind: 'solid', color: '#0b1220' },
    });

    useStore.getState().selectObject(useStore.getState().document.pages[0].objects[0].id);
    useStore.getState().addTemplatePage(seed);

    const state = useStore.getState();

    expect(state.document.pages).toHaveLength(2);
    expect(state.document.pages[1]).toEqual(seed);
    expect(state.activePageId).toBe(seed.id);
    expect(state.selectedObjectId).toBeNull();
  });

  it('stores and clears the loaded GitHub repo of the template gallery', () => {
    const summary = {
      fullName: 'mafhper/fremit',
      description: 'Browser mockup generator',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 0,
      forks: 0,
    };

    useStore.getState().setGithubRepo({ input: 'mafhper/fremit', summary });

    expect(useStore.getState().githubRepo).toEqual({ input: 'mafhper/fremit', summary });

    useStore.getState().setGithubRepo(null);

    expect(useStore.getState().githubRepo).toBeNull();
  });

  it('sets the page background and ignores unknown pages', () => {
    const store = useStore.getState();
    store.addPage();

    const [firstPage, secondPage] = useStore.getState().document.pages;
    useStore.getState().setPageBackground(firstPage.id, { kind: 'solid', color: '#123456' });

    const pages = useStore.getState().document.pages;
    expect(pages[0].background).toEqual({ kind: 'solid', color: '#123456' });
    expect(pages[1]).toEqual(secondPage);
    expect(pages[1].background).toEqual({ kind: 'solid', color: '#ffffff' });

    const before = useStore.getState().document;
    useStore.getState().setPageBackground('missing', { kind: 'solid', color: '#000000' });
    expect(useStore.getState().document).toBe(before);

    // A value that is not a complete hex never reaches the document.
    useStore.getState().setPageBackground(firstPage.id, { kind: 'solid', color: 'not-a-color' });
    expect(useStore.getState().document).toBe(before);

    // A complete hex is stored normalized (trimmed, lowercased).
    useStore.getState().setPageBackground(firstPage.id, { kind: 'solid', color: '  #ABCDEF  ' });
    expect(useStore.getState().document.pages[0].background).toEqual({
      kind: 'solid',
      color: '#abcdef',
    });

    // The gradient and image kinds write through the same action.
    useStore
      .getState()
      .setPageBackground(firstPage.id, { kind: 'gradient', from: '#ffffff', to: '#000000', angle: 90 });
    expect(useStore.getState().document.pages[0].background).toEqual({
      kind: 'gradient',
      from: '#ffffff',
      to: '#000000',
      angle: 90,
    });

    useStore.getState().setPageBackground(firstPage.id, { kind: 'image', src: 'data:image/png;base64,x' });
    expect(useStore.getState().document.pages[0].background).toEqual({
      kind: 'image',
      src: 'data:image/png;base64,x',
    });
  });

  it('switches pages and clears the selection', () => {
    const store = useStore.getState();
    const firstPageId = store.document.pages[0].id;
    const firstObjectId = store.document.pages[0].objects[0].id;
    store.selectObject(firstObjectId);

    store.addPage();
    const secondPageId = useStore.getState().activePageId;
    expect(secondPageId).not.toBe(firstPageId);
    expect(useStore.getState().document.pages[1].objects).toEqual([]);
    expect(useStore.getState().selectedObjectId).toBeNull();

    useStore.getState().setActivePage(firstPageId);
    expect(useStore.getState().activePageId).toBe(firstPageId);
    expect(useStore.getState().selectedObjectId).toBeNull();

    // Unknown pages are ignored.
    useStore.getState().setActivePage('missing');
    expect(useStore.getState().activePageId).toBe(firstPageId);
  });

  it('ignores duplicate requests for unknown pages', () => {
    const before = useStore.getState();
    const documentBefore = before.document;
    const activePageIdBefore = before.activePageId;
    before.selectObject(documentBefore.pages[0].objects[0].id);

    useStore.getState().duplicatePage('missing');

    const after = useStore.getState();
    expect(after.document).toBe(documentBefore);
    expect(after.document.pages).toHaveLength(1);
    expect(after.activePageId).toBe(activePageIdBefore);
    expect(after.selectedObjectId).toBe(documentBefore.pages[0].objects[0].id);
  });

  it('adds a captured source as an image object once per source', () => {
    const store = useStore.getState();
    const src = 'data:image/png;base64,capture';

    store.upsertSourceImage(src, 'Example page');
    const objects = useStore.getState().document.pages[0].objects;
    const added = objects[objects.length - 1];

    expect(objects).toHaveLength(4);
    expect(added).toMatchObject({ type: 'image', name: 'Example page', src });
    expect(useStore.getState().selectedObjectId).toBe(added.id);

    // The same capture is selected again, never duplicated.
    useStore.getState().upsertSourceImage(src, 'Example page');
    expect(useStore.getState().document.pages[0].objects).toHaveLength(4);
  });
});

describe('useStore animate slice', () => {
  beforeEach(() => {
    const document = createStarterDocument();
    useStore.setState({
      document,
      activePageId: document.pages[0].id,
      selectedObjectId: null,
      animationPreview: null,
      presenting: false,
    });
  });

  it('sets, keeps and clears the page transition', () => {
    const pageId = useStore.getState().activePageId;
    const transition = { preset: 'fade', durationMs: 500, easing: 'easeOut', direction: 'up' } as const;

    useStore.getState().setPageTransition(pageId, transition);
    expect(useStore.getState().document.pages[0].transition).toEqual(transition);

    // The same transition again is not a write: the document reference stays.
    const written = useStore.getState().document;
    useStore.getState().setPageTransition(pageId, { ...transition });
    expect(useStore.getState().document).toBe(written);

    // "None" clears the transition object, and unknown pages are ignored.
    useStore.getState().setPageTransition(pageId, null);
    expect(useStore.getState().document.pages[0].transition).toBeNull();

    const cleared = useStore.getState().document;
    useStore.getState().setPageTransition('missing', transition);
    expect(useStore.getState().document).toBe(cleared);
  });

  it('writes an entrance animation on the selected object', () => {
    const objectId = useStore.getState().document.pages[0].objects[2].id;

    useStore.getState().updateObject(objectId, {
      type: 'text',
      animation: { preset: 'typewriter', durationMs: 900, easing: 'linear', direction: 'left' },
    });

    const text = useStore.getState().document.pages[0].objects[2];
    expect(text.animation).toEqual({
      preset: 'typewriter',
      durationMs: 900,
      easing: 'linear',
      direction: 'left',
    });
  });

  it('bumps the preview token on every request', () => {
    useStore.getState().requestAnimationPreview('element');
    const first = useStore.getState().animationPreview;

    useStore.getState().requestAnimationPreview('page');
    const second = useStore.getState().animationPreview;

    expect(first).toEqual({ kind: 'element', token: 1 });
    expect(second).toEqual({ kind: 'page', token: 2 });
  });

  it('toggles presentation mode', () => {
    expect(useStore.getState().presenting).toBe(false);

    useStore.getState().startPresenting();
    expect(useStore.getState().presenting).toBe(true);

    useStore.getState().stopPresenting();
    expect(useStore.getState().presenting).toBe(false);
  });
});

describe('useStore image mask slice', () => {
  beforeEach(() => {
    const document = createStarterDocument();
    useStore.setState({
      document,
      activePageId: document.pages[0].id,
      selectedObjectId: null,
    });
  });

  function activeImage() {
    const image = useStore
      .getState()
      .document.pages[0].objects.find((object) => object.type === 'image');

    if (!image) throw new Error('the starter page must have an image');

    return image;
  }

  it('persists the mask across a page round-trip without leaking it', () => {
    const image = activeImage();
    const firstPageId = useStore.getState().document.pages[0].id;

    useStore.getState().updateObject(image.id, { type: 'image', mask: 'rounded' });
    expect(activeImage()).toMatchObject({ mask: 'rounded' });

    useStore.getState().addPage();
    const secondPageId = useStore.getState().activePageId;
    expect(secondPageId).not.toBe(firstPageId);
    expect(useStore.getState().document.pages[1].objects).toEqual([]);

    useStore.getState().setActivePage(firstPageId);
    expect(activeImage()).toMatchObject({ mask: 'rounded' });

    // Clearing writes the untouched box back.
    useStore.getState().updateObject(image.id, { type: 'image', mask: null });
    expect(activeImage()).toMatchObject({ mask: null });
  });

  it('duplicates the mask onto the copy without touching the source', () => {
    const image = activeImage();
    useStore.getState().updateObject(image.id, { type: 'image', mask: 'rounded' });

    useStore.getState().duplicateObject(image.id);

    const state = useStore.getState();
    const objects = state.document.pages[0].objects;
    const source = objects.find((object) => object.id === image.id);
    const copy = objects.find((object) => object.id === state.selectedObjectId);

    expect(copy).toMatchObject({ type: 'image', mask: 'rounded' });
    expect(source).toMatchObject({ mask: 'rounded' });
    expect(copy?.id).not.toBe(source?.id);
  });

  it('keeps the mask when the page is resized', () => {
    const image = activeImage();
    useStore.getState().updateObject(image.id, { type: 'image', mask: 'rounded' });

    useStore.getState().resizePage(useStore.getState().document.pages[0].id, 'banner');

    expect(activeImage()).toMatchObject({ mask: 'rounded' });
  });
});

