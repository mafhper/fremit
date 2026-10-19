/**
 * Playback adapters of the animate preview: the only part of the player that
 * touches Fabric and the DOM.
 *
 * The module is loaded on demand (a dynamic import from the canvas stage), so
 * the `/editor` chunk never pays for it. It drives the two tracks of
 * `frames.ts`:
 *
 * - element previews mutate the live Fabric object (opacity, offsets, scale,
 *   clip reveal) and always restore the resting state when they end or are
 *   cancelled — a preview never writes the document;
 * - transition previews write inline CSS on the canvas surface and clean it up
 *   the same way.
 *
 * Written from scratch for Fremit; no code copied from any reference player.
 */

import { Rect, type Canvas, type FabricObject } from 'fabric';
import type {
  AnimationDirection,
  DocumentObject,
  DocumentPage,
  ObjectAnimation,
  PageTransition,
} from '@/lib/document';
import {
  elementFrame,
  elementProgress,
  elementRevealSteps,
  playbackDuration,
  transitionFrame,
  transitionStyle,
  type TransitionStage,
} from './frames';

export interface PlaybackHandle {
  stop: () => void;
}

export interface PlaybackOptions {
  reducedMotion: boolean;
  onDone: () => void;
}

/**
 * Reduced motion collapses every timeline (the player reads the media query
 * once, at play time — the same preference `useReducedMotion` watches in the
 * hero).
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

interface ElementBase {
  opacity: number;
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  /** Axis-aligned box in page pixels (scale baked in). */
  width: number;
  height: number;
  clipPath: FabricObject['clipPath'];
}

function elementBase(object: FabricObject): ElementBase {
  return {
    opacity: object.opacity,
    left: object.left ?? 0,
    top: object.top ?? 0,
    scaleX: object.scaleX ?? 1,
    scaleY: object.scaleY ?? 1,
    width: (object.width ?? 0) * (object.scaleX ?? 1),
    height: (object.height ?? 0) * (object.scaleY ?? 1),
    clipPath: object.clipPath,
  };
}

/**
 * Fabric treats an object with no width *and* no height as not visible
 * (`isNotVisible`), so the collapsed end of a reveal keeps a hairline instead
 * of a zero-size rect: the clip stays a well-formed rect at every step of the
 * timeline, and a sub-pixel clip renders as nothing either way.
 */
const MIN_REVEAL_PX = 0.001;

/**
 * Clip rect of a reveal, in page coordinates (`absolutePositioned`): the box
 * grows from the edge the effect comes from.
 */
function revealClip(base: ElementBase, reveal: number, from: AnimationDirection): Rect {
  const width = Math.max(MIN_REVEAL_PX, base.width * reveal);
  const height = Math.max(MIN_REVEAL_PX, base.height * reveal);

  const position =
    from === 'left'
      ? { left: base.left, top: base.top, width, height: base.height }
      : from === 'right'
        ? { left: base.left + base.width * (1 - reveal), top: base.top, width, height: base.height }
        : from === 'up'
          ? { left: base.left, top: base.top, width: base.width, height }
          : { left: base.left, top: base.top + base.height * (1 - reveal), width: base.width, height };

  return new Rect({
    ...position,
    originX: 'left',
    originY: 'top',
    absolutePositioned: true,
  });
}

/**
 * The rAF timeline both adapters share: `apply(progress)` paints one frame,
 * and `settle(completed)` runs exactly once when the timeline ends — with
 * `true` when the clock reached the end, `false` when `stop()` cancelled it.
 * A non-positive duration (reduced motion) collapses to a single frame that
 * only settles, so the caller's playing state stays observable for one tick.
 */
export function runTimeline(
  duration: number,
  apply: (progress: number) => void,
  settle: (completed: boolean) => void,
): PlaybackHandle {
  let frameHandle = 0;
  let stopped = false;
  let start = -1;

  const finish = () => {
    if (stopped) return;
    stopped = true;
    settle(true);
  };

  if (duration <= 0) {
    frameHandle = requestAnimationFrame(finish);
  } else {
    const tick = (now: number) => {
      if (stopped) return;
      if (start < 0) start = now;

      const progress = elementProgress(now - start, duration);
      apply(progress);

      if (progress >= 1) {
        finish();
        return;
      }

      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);
  }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frameHandle);
      settle(false);
    },
  };
}

/**
 * Plays one entrance animation on a live Fabric object. The resting state is
 * restored on completion *and* on cancellation, so the canvas always matches
 * the document again after a preview.
 */
export function playElementPreview(
  canvas: Canvas,
  object: FabricObject,
  docObject: DocumentObject,
  animation: ObjectAnimation,
  options: PlaybackOptions,
): PlaybackHandle {
  const base = elementBase(object);
  const steps = elementRevealSteps(animation.preset, docObject);
  const duration = playbackDuration(animation.durationMs, options.reducedMotion);

  const apply = (progress: number) => {
    const frame = elementFrame({
      preset: animation.preset,
      progress,
      easing: animation.easing,
      direction: animation.direction,
      size: { width: base.width, height: base.height },
      steps,
    });

    object.set({
      opacity: base.opacity * frame.opacity,
      left: base.left + frame.offsetX,
      top: base.top + frame.offsetY,
      scaleX: base.scaleX * frame.scale,
      scaleY: base.scaleY * frame.scale,
    });
    object.clipPath =
      frame.reveal !== null && frame.reveal < 1
        ? revealClip(base, frame.reveal, frame.revealFrom ?? 'left')
        : base.clipPath;
    object.setCoords();
    canvas.requestRenderAll();
  };

  const restore = () => {
    object.set({
      opacity: base.opacity,
      left: base.left,
      top: base.top,
      scaleX: base.scaleX,
      scaleY: base.scaleY,
    });
    object.clipPath = base.clipPath;
    object.setCoords();
    canvas.requestRenderAll();
  };

  return runTimeline(duration, apply, (completed) => {
    restore();
    if (completed) options.onDone();
  });
}

/**
 * Plays one page transition as inline CSS on the canvas surface. The surface
 * paints exactly the page, so a transform/clip on it reads as the page moving
 * inside the workspace; every property written is removed on completion and on
 * cancellation.
 */
export function playTransitionPreview(
  surface: HTMLElement,
  stage: TransitionStage,
  transition: PageTransition,
  options: PlaybackOptions,
): PlaybackHandle {
  const duration = playbackDuration(transition.durationMs, options.reducedMotion);

  const clear = () => {
    const style = surface.style;

    style.opacity = '';
    style.transform = '';
    style.transformOrigin = '';
    style.filter = '';
    style.clipPath = '';
    style.removeProperty('mask-image');
    style.removeProperty('-webkit-mask-image');
  };

  const apply = (progress: number) => {
    const frame = transitionFrame(
      transition.preset,
      progress,
      transition.easing,
      transition.direction,
    );
    const css = transitionStyle(frame, stage);
    const style = surface.style;

    style.opacity = css.opacity ?? '';
    style.transform = css.transform ?? '';
    style.transformOrigin = css.transformOrigin ?? '';
    style.filter = css.filter ?? '';
    style.clipPath = css.clipPath ?? '';

    if (css.maskImage) {
      style.setProperty('mask-image', css.maskImage);
      style.setProperty('-webkit-mask-image', css.maskImage);
    } else {
      style.removeProperty('mask-image');
      style.removeProperty('-webkit-mask-image');
    }
  };

  return runTimeline(duration, apply, (completed) => {
    clear();
    if (completed) options.onDone();
  });
}

export interface AnimationPlaybackRequest {
  canvas: Canvas;
  /** The canvas element the transition styles; it paints exactly the page. */
  surface: HTMLElement;
  stage: TransitionStage;
  page: DocumentPage;
  /** Live Fabric objects of the page, by document id. */
  fabricObjects: Map<string, FabricObject>;
  scope: 'element' | 'page';
  selectedObjectId: string | null;
  /** Called with the previewing value (preset id or 'page'), `null` when idle. */
  onPreviewing: (value: string | null) => void;
}

/**
 * One preview request, as the animate panel asks for it. An element scope
 * plays the selected object; a page scope plays the transition and every
 * animated object together. Returns `null` when there is nothing to play (no
 * selection, no animation, or no live object yet) — the caller keeps the
 * canvas idle instead of showing a playback that cannot happen.
 */
export function startAnimationPlayback(
  request: AnimationPlaybackRequest,
): PlaybackHandle | null {
  const { page, scope } = request;
  const reducedMotion = prefersReducedMotion();
  const handles: PlaybackHandle[] = [];
  let pending = 0;
  let finished = false;

  const complete = () => {
    pending -= 1;

    if (pending > 0 || finished) return;

    finished = true;
    request.onPreviewing(null);
  };

  if (scope === 'element') {
    const selected = page.objects.find((object) => object.id === request.selectedObjectId);
    const target = selected ? request.fabricObjects.get(selected.id) : undefined;

    if (!selected || !selected.animation || !target) return null;

    request.onPreviewing(selected.animation.preset);
    pending = 1;
    handles.push(
      playElementPreview(request.canvas, target, selected, selected.animation, {
        reducedMotion,
        onDone: complete,
      }),
    );
  } else {
    const entries: Array<{ doc: DocumentObject; animation: ObjectAnimation; fabric: FabricObject }> =
      [];

    for (const object of page.objects) {
      if (!object.animation) continue;

      const fabric = request.fabricObjects.get(object.id);
      if (fabric) entries.push({ doc: object, animation: object.animation, fabric });
    }

    if (!page.transition && entries.length === 0) return null;

    request.onPreviewing('page');

    if (page.transition) {
      pending += 1;
      handles.push(
        playTransitionPreview(request.surface, request.stage, page.transition, {
          reducedMotion,
          onDone: complete,
        }),
      );
    }

    for (const entry of entries) {
      pending += 1;
      handles.push(
        playElementPreview(request.canvas, entry.fabric, entry.doc, entry.animation, {
          reducedMotion,
          onDone: complete,
        }),
      );
    }
  }

  return {
    stop: () => {
      if (finished) return;

      finished = true;
      for (const handle of handles) handle.stop();
      request.onPreviewing(null);
    },
  };
}
