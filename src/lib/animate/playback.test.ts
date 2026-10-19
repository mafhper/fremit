/**
 * Wiring of the animate player adapters, pinned with mocks so the edges the
 * browser smoke exercises stay cheap to verify: the shared timeline, the
 * restore/clear of both adapters, the `null` paths of `startAnimationPlayback`
 * and its busy mark (`onPreviewing`). The frame math lives in
 * `frames.test.ts`; this file only drives the adapters.
 */

import { Rect } from 'fabric';
import type { Canvas, FabricObject } from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentObject, DocumentPage, ObjectAnimation, PageTransition } from '@/lib/document';
import { createPage, createShapeObject, createTextObject } from '@/lib/document';
import type { TransitionStage } from '@/lib/animate/frames';
import {
  playElementPreview,
  playTransitionPreview,
  runTimeline,
  startAnimationPlayback,
  type AnimationPlaybackRequest,
} from '@/lib/animate/playback';

const fade: ObjectAnimation = {
  preset: 'fade',
  durationMs: 100,
  easing: 'linear',
  direction: 'up',
};

const fadeTransition: PageTransition = {
  preset: 'fade',
  durationMs: 100,
  easing: 'linear',
  direction: 'up',
};

const stage: TransitionStage = {
  page: { x: 100, y: 50, width: 400, height: 300 },
  container: { width: 800, height: 600 },
};

interface QueuedFrame {
  id: number;
  callback: FrameRequestCallback;
}

let frames: QueuedFrame[] = [];
let frameSeq = 0;

beforeEach(() => {
  frames = [];
  frameSeq = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameSeq += 1;
    frames.push({ id: frameSeq, callback });
    return frameSeq;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames = frames.filter((frame) => frame.id !== id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'matchMedia');
});

function flushFrame(now: number): void {
  const frame = frames.shift();

  if (!frame) throw new Error('no animation frame queued');

  frame.callback(now);
}

/** A Fabric-object stand-in: the adapters only read state and call these two. */
interface FakeFabricObject {
  opacity: number;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  clipPath: FabricObject['clipPath'] | null;
  set: (patch: Record<string, unknown>) => void;
  setCoords: () => void;
}

function makeFabricObject(initial: Partial<FakeFabricObject> = {}): FakeFabricObject {
  const object: FakeFabricObject = {
    opacity: 1,
    left: 10,
    top: 20,
    scaleX: 1,
    scaleY: 1,
    width: 100,
    height: 50,
    clipPath: null,
    set: (patch) => {
      Object.assign(object, patch);
    },
    setCoords: () => {},
    ...initial,
  };

  return object;
}

function asFabricObject(object: FakeFabricObject): FabricObject {
  return object as unknown as FabricObject;
}

function makeCanvas(): { requestRenderAll: ReturnType<typeof vi.fn> } {
  return { requestRenderAll: vi.fn() };
}

function makePageWith(...objects: DocumentObject[]): DocumentPage {
  const page = createPage();
  page.objects = objects;
  return page;
}

function makeRequest(overrides: Partial<AnimationPlaybackRequest>): AnimationPlaybackRequest {
  return {
    canvas: makeCanvas() as unknown as Canvas,
    surface: document.createElement('div'),
    stage,
    page: createPage(),
    fabricObjects: new Map(),
    scope: 'element',
    selectedObjectId: null,
    onPreviewing: vi.fn(),
    ...overrides,
  };
}

function handleOrThrow(handle: ReturnType<typeof startAnimationPlayback>) {
  if (!handle) throw new Error('expected a playback handle');

  return handle;
}

describe('runTimeline', () => {
  it('paints each frame with the elapsed progress and settles once at the end', () => {
    const apply = vi.fn();
    const settle = vi.fn();

    runTimeline(1000, apply, settle);

    flushFrame(500);
    flushFrame(750);
    flushFrame(1500);

    expect(apply.mock.calls.map(([progress]) => progress)).toEqual([0, 0.25, 1]);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(true);
    expect(frames).toHaveLength(0);
  });

  it('cancels with settle(false) when stopped mid-timeline, exactly once', () => {
    const apply = vi.fn();
    const settle = vi.fn();
    const timeline = runTimeline(1000, apply, settle);

    flushFrame(0);
    timeline.stop();

    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(false);
    expect(frames).toHaveLength(0);

    timeline.stop();
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it('settles a non-positive duration on the next frame without painting', () => {
    const apply = vi.fn();
    const settle = vi.fn();

    runTimeline(0, apply, settle);
    flushFrame(0);

    expect(apply).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledWith(true);
  });

  it('cancels a non-positive duration before its frame runs', () => {
    const settle = vi.fn();
    const timeline = runTimeline(0, vi.fn(), settle);

    timeline.stop();

    expect(settle).toHaveBeenCalledWith(false);
    expect(frames).toHaveLength(0);
  });
});

describe('playElementPreview', () => {
  it('paints the object and restores the resting state on completion', () => {
    const canvas = makeCanvas();
    const object = makeFabricObject();
    const onDone = vi.fn();

    playElementPreview(canvas as unknown as Canvas, asFabricObject(object), createShapeObject(), fade, {
      reducedMotion: false,
      onDone,
    });

    flushFrame(0);
    expect(object.opacity).toBe(0);

    flushFrame(100);

    expect(object).toMatchObject({
      opacity: 1,
      left: 10,
      top: 20,
      scaleX: 1,
      scaleY: 1,
      clipPath: null,
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(canvas.requestRenderAll).toHaveBeenCalled();
  });

  it('clips a wipe frame with a rect and drops the clip at the end', () => {
    const canvas = makeCanvas();
    const object = makeFabricObject();
    const onDone = vi.fn();

    playElementPreview(
      canvas as unknown as Canvas,
      asFabricObject(object),
      createShapeObject(),
      { ...fade, preset: 'wipe', direction: 'left' },
      { reducedMotion: false, onDone },
    );

    flushFrame(0);
    flushFrame(50);

    const clip = object.clipPath;

    if (!(clip instanceof Rect)) throw new Error('expected a Fabric Rect clip');

    // Half of the base width (100px, scale baked in).
    expect(clip.width).toBeCloseTo(50, 6);

    flushFrame(100);

    expect(object.clipPath).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('restores the object when stopped mid-timeline without reporting done', () => {
    const canvas = makeCanvas();
    const object = makeFabricObject({ opacity: 0.5, left: 30 });
    const onDone = vi.fn();

    const handle = playElementPreview(
      canvas as unknown as Canvas,
      asFabricObject(object),
      createShapeObject(),
      fade,
      { reducedMotion: false, onDone },
    );

    flushFrame(0);
    expect(object.opacity).toBe(0);

    handle.stop();

    expect(object).toMatchObject({ opacity: 0.5, left: 30 });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reduced motion completes on the next frame without painting', () => {
    const canvas = makeCanvas();
    const object = makeFabricObject();
    const onDone = vi.fn();
    const setSpy = vi.spyOn(object, 'set');

    playElementPreview(canvas as unknown as Canvas, asFabricObject(object), createShapeObject(), fade, {
      reducedMotion: true,
      onDone,
    });

    flushFrame(0);

    // The only write is the restore: the timeline never painted.
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith({ opacity: 1, left: 10, top: 20, scaleX: 1, scaleY: 1 });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('playTransitionPreview', () => {
  it('writes the frame styles on the surface and clears them on completion', () => {
    const surface = document.createElement('div');
    const onDone = vi.fn();

    playTransitionPreview(surface, stage, fadeTransition, { reducedMotion: false, onDone });

    flushFrame(0);
    expect(surface.style.opacity).toBe('0');

    flushFrame(100);

    expect(surface.style.opacity).toBe('');
    expect(surface.style.transform).toBe('');
    expect(surface.style.filter).toBe('');
    expect(surface.style.clipPath).toBe('');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('removes the mask a blinds frame wrote when the playback ends', () => {
    const surface = document.createElement('div');
    const onDone = vi.fn();

    playTransitionPreview(surface, stage, { ...fadeTransition, preset: 'blinds' }, {
      reducedMotion: false,
      onDone,
    });

    flushFrame(0);
    flushFrame(50);
    expect(surface.style.getPropertyValue('mask-image')).not.toBe('');

    flushFrame(100);

    expect(surface.style.getPropertyValue('mask-image')).toBe('');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('clears the surface when stopped mid-timeline without reporting done', () => {
    const surface = document.createElement('div');
    const onDone = vi.fn();

    const handle = playTransitionPreview(surface, stage, fadeTransition, {
      reducedMotion: false,
      onDone,
    });

    flushFrame(0);
    expect(surface.style.opacity).toBe('0');

    handle.stop();

    expect(surface.style.opacity).toBe('');
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('startAnimationPlayback', () => {
  it('keeps the canvas idle when the element scope has nothing to play', () => {
    const animated = createShapeObject(undefined, { animation: fade });
    const page = makePageWith(animated);
    const onPreviewing = vi.fn();
    const request = makeRequest({ page, onPreviewing });

    // Nothing selected.
    expect(startAnimationPlayback(request)).toBeNull();

    // Selected, but the object carries no animation.
    const staticObject = createShapeObject();
    page.objects = [staticObject];
    request.selectedObjectId = staticObject.id;
    expect(startAnimationPlayback(request)).toBeNull();

    // Animated and selected, but without a live Fabric object yet.
    page.objects = [animated];
    request.selectedObjectId = animated.id;
    expect(startAnimationPlayback(request)).toBeNull();

    expect(onPreviewing).not.toHaveBeenCalled();
  });

  it('plays the selected element and reports previewing until it completes', () => {
    const animated = createShapeObject(undefined, { animation: fade });
    const page = makePageWith(animated);
    const fabric = makeFabricObject();
    const onPreviewing = vi.fn();
    const request = makeRequest({
      page,
      selectedObjectId: animated.id,
      fabricObjects: new Map([[animated.id, asFabricObject(fabric)]]),
      onPreviewing,
    });

    const handle = handleOrThrow(startAnimationPlayback(request));

    expect(onPreviewing).toHaveBeenCalledWith('fade');

    flushFrame(0);
    flushFrame(100);

    expect(onPreviewing).toHaveBeenLastCalledWith(null);
    expect(onPreviewing).toHaveBeenCalledTimes(2);
    expect(fabric.opacity).toBe(1);
    handle.stop();
  });

  it('stops a running element preview and reports idle exactly once', () => {
    const animated = createShapeObject(undefined, { animation: fade });
    const page = makePageWith(animated);
    const onPreviewing = vi.fn();
    const request = makeRequest({
      page,
      selectedObjectId: animated.id,
      fabricObjects: new Map([[animated.id, asFabricObject(makeFabricObject())]]),
      onPreviewing,
    });

    const handle = handleOrThrow(startAnimationPlayback(request));

    flushFrame(0);
    handle.stop();
    handle.stop();

    expect(onPreviewing).toHaveBeenCalledTimes(2);
    expect(onPreviewing).toHaveBeenLastCalledWith(null);
  });

  it('keeps the canvas idle when the page scope has nothing to play', () => {
    const page = makePageWith(createShapeObject());
    const onPreviewing = vi.fn();
    const request = makeRequest({ page, scope: 'page', onPreviewing });

    expect(startAnimationPlayback(request)).toBeNull();
    expect(onPreviewing).not.toHaveBeenCalled();
  });

  it('plays the page transition on the surface and clears it on completion', () => {
    const page = makePageWith();
    page.transition = fadeTransition;
    const surface = document.createElement('div');
    const onPreviewing = vi.fn();
    const request = makeRequest({ page, scope: 'page', surface, onPreviewing });

    handleOrThrow(startAnimationPlayback(request));

    expect(onPreviewing).toHaveBeenCalledWith('page');

    flushFrame(0);
    expect(surface.style.opacity).toBe('0');

    flushFrame(100);

    expect(surface.style.opacity).toBe('');
    expect(onPreviewing).toHaveBeenLastCalledWith(null);
    expect(onPreviewing).toHaveBeenCalledTimes(2);
  });

  it('waits for every track of a page preview before reporting idle', () => {
    const first = createShapeObject(undefined, { animation: fade });
    const second = createTextObject('Hello', { animation: { ...fade, preset: 'wipe' } });
    const page = makePageWith(first, second);
    page.transition = fadeTransition;

    const onPreviewing = vi.fn();
    const request = makeRequest({
      page,
      scope: 'page',
      onPreviewing,
      fabricObjects: new Map([
        [first.id, asFabricObject(makeFabricObject())],
        [second.id, asFabricObject(makeFabricObject())],
      ]),
    });

    handleOrThrow(startAnimationPlayback(request));

    expect(onPreviewing).toHaveBeenCalledTimes(1);

    // Three tracks (transition + two elements) rotate through the one frame
    // queue; the first completion must not report idle while others still run.
    for (let index = 0; index < 6; index += 1) {
      flushFrame(index * 60);

      if (index === 3) {
        expect(onPreviewing).toHaveBeenCalledTimes(1);
      }
    }

    expect(onPreviewing).toHaveBeenCalledTimes(2);
    expect(onPreviewing).toHaveBeenLastCalledWith(null);
  });

  it('stops every track of a page preview and reports idle once', () => {
    const first = createShapeObject(undefined, { animation: fade });
    const page = makePageWith(first);
    page.transition = fadeTransition;
    const surface = document.createElement('div');
    const onPreviewing = vi.fn();
    const request = makeRequest({
      page,
      scope: 'page',
      surface,
      onPreviewing,
      fabricObjects: new Map([[first.id, asFabricObject(makeFabricObject())]]),
    });

    const handle = handleOrThrow(startAnimationPlayback(request));

    flushFrame(0);
    expect(surface.style.opacity).toBe('0');

    handle.stop();

    expect(surface.style.opacity).toBe('');
    expect(onPreviewing).toHaveBeenCalledTimes(2);
    expect(onPreviewing).toHaveBeenLastCalledWith(null);

    handle.stop();
    expect(onPreviewing).toHaveBeenCalledTimes(2);
  });

  it('collapses the element preview to one settle frame under reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: true, media: query }),
    });

    const animated = createShapeObject(undefined, { animation: fade });
    const page = makePageWith(animated);
    const onPreviewing = vi.fn();
    const request = makeRequest({
      page,
      selectedObjectId: animated.id,
      fabricObjects: new Map([[animated.id, asFabricObject(makeFabricObject())]]),
      onPreviewing,
    });

    handleOrThrow(startAnimationPlayback(request));

    expect(onPreviewing).toHaveBeenCalledWith('fade');

    flushFrame(0);

    expect(onPreviewing).toHaveBeenLastCalledWith(null);
    expect(onPreviewing).toHaveBeenCalledTimes(2);
  });
});
