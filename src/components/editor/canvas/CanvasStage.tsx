/**
 * Fabric layer of the dedicated canvas: renders the active page of the
 * Documento JSON, handles selection, transform, text editing, snapping and the
 * viewport (zoom/pan). The store is the source of truth; this component
 * reconciles the Fabric scene against it and pushes interactions back.
 *
 * Written from scratch for Fremit over the Fabric API; no code copied from any
 * reference editor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, FabricImage, FabricObject, Point, Rect, Textbox } from 'fabric';
import type { Size } from '@/lib/imageFit';
import { snapRect, snapTolerance, type Rect as SnapTarget, type SnapGuide } from '@/lib/editorSnap';
import { RULER_SIZE, zoomAtPoint, type Viewport } from '@/lib/editorViewport';
import type { DocumentObject, DocumentPage } from '@/lib/document';
import { objectPatch } from '@/lib/documentOps';
import {
  clampMenuPosition,
  contextMenuActionsFor,
  pasteReplacementTarget,
  type ContextMenuActionId,
  type ContextMenuActions,
} from '@/lib/imageContextMenu';
import {
  ImageReplaceError,
  imageReplaceErrorMessage,
  pickClipboardImageFile,
  readImageFile,
} from '@/lib/imageReplace';
import { DEFAULT_IMAGE_MASK } from '@/lib/imageMask';
import { IMAGE_SOURCE_ACCEPT } from '@/lib/imageSource';
import { imageBackgroundSurface } from '@/lib/pageBackground';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';
import {
  CANVAS_CODECS,
  createPageBackgroundRect,
  fitImageCover,
  pageBackgroundFill,
} from '@/lib/fabricCodec';
import { ImageContextMenu } from './ImageContextMenu';

/**
 * Menu box used to keep the panel inside the canvas host: two rows (replace
 * image and the mask action) at the current text size, plus the padding.
 */
const CONTEXT_MENU_BOX = { width: 224, height: 80 };

export interface CanvasStageProps {
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  snapEnabled: boolean;
}

interface TaggedFabricObject extends FabricObject {
  fremitId?: string;
}

function objectId(object: FabricObject): string | null {
  return (object as TaggedFabricObject).fremitId ?? null;
}

function tagObject(object: FabricObject, id: string): void {
  (object as TaggedFabricObject).fremitId = id;
}

function activePageFromStore(): DocumentPage | null {
  const state = useStore.getState();

  return state.document.pages.find((candidate) => candidate.id === state.activePageId) ?? null;
}

/**
 * Fabric geometry as a snap target. `left`/`top` are required by the typings
 * but can be absent at runtime before Fabric positions the object; the neutral
 * value (0) and the unit scale keep the math finite.
 */
function objectRect(object: FabricObject): SnapTarget {
  return {
    x: object.left ?? 0,
    y: object.top ?? 0,
    width: (object.width ?? 0) * (object.scaleX ?? 1),
    height: (object.height ?? 0) * (object.scaleY ?? 1),
  };
}

/** Snap candidates: the page bounds plus every visible object but the moving one. */
function snapTargetsFor(page: DocumentPage, excludedId: string): SnapTarget[] {
  const targets: SnapTarget[] = [{ x: 0, y: 0, width: page.width, height: page.height }];

  for (const object of page.objects) {
    if (object.id === excludedId || !object.visible) continue;
    targets.push({ x: object.x, y: object.y, width: object.width, height: object.height });
  }

  return targets;
}

/** Visibility and lock state: safe to apply even during an interaction. */
function applyFlags(object: FabricObject, docObject: DocumentObject): void {
  object.set({
    visible: docObject.visible,
    lockMovementX: docObject.locked,
    lockMovementY: docObject.locked,
    lockScalingX: docObject.locked,
    lockScalingY: docObject.locked,
    lockRotation: docObject.locked,
    hasControls: !docObject.locked,
  });
}

/**
 * Applies the document z-order: index 0 is the page background, then the
 * objects in document order (the last object on top).
 */
function applyOrder(canvas: Canvas, page: DocumentPage, objects: Map<string, FabricObject>): void {
  page.objects.forEach((docObject, index) => {
    const object = objects.get(docObject.id);
    if (object) canvas.moveObjectTo(object, index + 1);
  });
}

export function CanvasStage({ viewport, onViewportChange, snapEnabled }: CanvasStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const objectsRef = useRef(new Map<string, FabricObject>());
  const naturalSizesRef = useRef(new WeakMap<FabricObject, Size>());
  /** Source currently painted per image id; a different one means a rebuild. */
  const loadedImageSrcRef = useRef(new Map<string, string>());
  /** Source each in-flight image request asked for. */
  const loadingImageSrcRef = useRef(new Map<string, string>());
  /** Source that failed to load per image id; a new source retries. */
  const failedImageSrcRef = useRef(new Map<string, string>());
  const pageBackgroundRef = useRef<Rect | null>(null);
  const backgroundImageRef = useRef<FabricImage | null>(null);
  const backgroundNaturalRef = useRef<Size | null>(null);
  const backgroundImageSrcRef = useRef<string | null>(null);
  const interactingRef = useRef(false);
  const viewportRef = useRef(viewport);
  const snapEnabledRef = useRef(snapEnabled);
  const onViewportChangeRef = useRef(onViewportChange);
  const guidesRef = useRef<SnapGuide[]>([]);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const playbackSeqRef = useRef(0);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingReplaceIdRef = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    objectId: string;
    actions: ContextMenuActions;
    position: { x: number; y: number };
  } | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const animationPreview = useStore((state) => state.animationPreview);
  const presenting = useStore((state) => state.presenting);
  const { copy } = useI18n();
  const page = useMemo(
    () => document.pages.find((candidate) => candidate.id === activePageId) ?? null,
    [document, activePageId],
  );

  const stopPlayback = useCallback(() => {
    playbackRef.current?.stop();
    playbackRef.current = null;
  }, []);

  /**
   * Plays one preview on the live scene. The player is a lazy chunk of its own
   * (`/editor` never pays for it), and everything is read from the store at
   * play time, so a request always plays the current state. A new playback
   * replaces the running one.
   */
  const startPlayback = useCallback(
    (scope: 'element' | 'page') => {
      const canvas = fabricRef.current;
      const surface = canvasRef.current;
      const state = useStore.getState();
      const currentPage = state.document.pages.find(
        (candidate) => candidate.id === state.activePageId,
      );

      // A new playback replaces the running one: stopping it clears the busy
      // mark through the playback's own callback, before the sequence bump.
      stopPlayback();
      playbackSeqRef.current += 1;
      const seq = playbackSeqRef.current;

      if (!canvas || !surface || !currentPage) return;

      const currentViewport = viewportRef.current;
      const stage = {
        page: {
          x: currentViewport.x,
          y: currentViewport.y,
          width: currentPage.width * currentViewport.zoom,
          height: currentPage.height * currentViewport.zoom,
        },
        container: { width: surface.clientWidth, height: surface.clientHeight },
      };

      void import('@/lib/animate/playback')
        .then(({ startAnimationPlayback }) => {
          // A newer request (or an unmount) already took over: this one is stale.
          if (playbackSeqRef.current !== seq) return;

          playbackRef.current = startAnimationPlayback({
            canvas,
            surface,
            stage,
            page: currentPage,
            fabricObjects: objectsRef.current,
            scope,
            selectedObjectId: state.selectedObjectId,
            onPreviewing: (value) => {
              if (playbackSeqRef.current !== seq) return;
              setPreviewing(value);
            },
          });
        })
        .catch(() => {
          // A failed chunk load leaves the canvas idle; the next request retries.
          if (playbackSeqRef.current === seq) setPreviewing(null);
        });
    },
    [stopPlayback],
  );

  /**
   * One replacement path for both inputs: the file (or the clipboard image
   * turned into one) resolves first, and only then the document is written —
   * a rejected file leaves the document byte for byte what it was.
   */
  const replaceImageWithFile = useCallback(
    async (objectId: string, file: File) => {
      try {
        const src = await readImageFile(file);
        const result = useStore.getState().replaceImageSource(objectId, src);

        setReplaceError(result.ok ? null : imageReplaceErrorMessage(result.code, copy.contextMenu));
      } catch (failure) {
        setReplaceError(
          failure instanceof ImageReplaceError
            ? imageReplaceErrorMessage(failure.code, copy.contextMenu)
            : copy.contextMenu.error,
        );
      } finally {
        // The picker took the focus away; the canvas gets it back when done.
        hostRef.current?.focus();
      }
    },
    [copy],
  );

  const closeContextMenu = useCallback((restoreFocus: boolean) => {
    setContextMenu(null);
    if (restoreFocus) hostRef.current?.focus();
  }, []);

  // A canceled file picker fires `cancel`, not `change`: without this the
  // pending target stays armed and the focus is left wherever the browser put
  // it. Escape/back on the dialog must land back on the canvas host, the same
  // place the menu's Escape returns to.
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    const onCancel = () => {
      pendingReplaceIdRef.current = null;
      setReplaceError(null);
      hostRef.current?.focus();
    };

    input.addEventListener('cancel', onCancel);

    return () => input.removeEventListener('cancel', onCancel);
  }, []);

  const handleMenuActivate = (action: ContextMenuActionId) => {
    const menu = contextMenu;
    setContextMenu(null);

    if (!menu) return;

    switch (action) {
      case 'mask-image':
      case 'clear-mask': {
        // The preset is a document field: the canvas, the thumbnail and the
        // exporter all derive their crop from it on their next render.
        useStore.getState().updateObject(menu.objectId, {
          type: 'image',
          mask: action === 'mask-image' ? DEFAULT_IMAGE_MASK : null,
        });
        hostRef.current?.focus();
        return;
      }
      case 'replace-image': {
        pendingReplaceIdRef.current = menu.objectId;
        fileInputRef.current?.click();
        return;
      }
    }
  };

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      setHostSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });

    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  // Canvas lifecycle: one Fabric canvas per mount, disposed on unmount.
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const canvas = new Canvas(element, {
      selection: false,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
      selectionColor: 'rgba(31, 111, 235, 0.12)',
      selectionBorderColor: 'rgba(31, 111, 235, 0.9)',
      selectionLineWidth: 1,
    });

    fabricRef.current = canvas;
    setReady(true);

    const objectMap = objectsRef.current;
    const loadingImages = loadingImageSrcRef.current;
    const failedImages = failedImageSrcRef.current;
    const loadedImageSrc = loadedImageSrcRef.current;

    const updateGuides = (next: SnapGuide[]) => {
      const previous = guidesRef.current;
      const same =
        previous.length === next.length &&
        previous.every(
          (guide, index) =>
            guide.axis === next[index].axis && guide.position === next[index].position,
        );

      if (same) return;

      guidesRef.current = next;
      setGuides(next);
    };

    const commit = (object: FabricObject) => {
      const id = objectId(object);
      const documentPage = activePageFromStore();
      if (!id || !documentPage) return;

      const docObject = documentPage.objects.find((candidate) => candidate.id === id);
      if (!docObject) return;

      useStore.getState().updateObject(id, CANVAS_CODECS[docObject.type].readGeometry(object, docObject));
    };

    const handleMoving = (event: { target?: FabricObject }) => {
      const object = event.target;
      const id = object ? objectId(object) : null;
      const documentPage = activePageFromStore();
      if (!object || !id || !documentPage) return;

      const docObject = documentPage.objects.find((candidate) => candidate.id === id);

      // Defense in depth: Fabric already blocks movement on locked objects, but
      // a stale lock flag must never move the stored geometry.
      if (!docObject || docObject.locked) {
        if (docObject) object.set({ left: docObject.x, top: docObject.y });
        return;
      }

      let { left, top } = object;

      if (snapEnabledRef.current) {
        const result = snapRect(
          objectRect(object),
          snapTargetsFor(documentPage, id),
          snapTolerance(viewportRef.current.zoom),
        );

        left = result.x;
        top = result.y;
        object.set({ left, top });
        updateGuides(result.guides);
      }

      useStore.getState().updateObject(id, objectPatch(docObject.type, { x: left, y: top }));
    };

    const handleModified = (event: { target?: FabricObject }) => {
      const object = event.target;
      const id = object ? objectId(object) : null;
      const documentPage = activePageFromStore();
      if (!object || !id || !documentPage) return;

      const docObject = documentPage.objects.find((candidate) => candidate.id === id);
      if (!docObject) return;

      CANVAS_CODECS[docObject.type].normalizeGeometry(
        object,
        docObject,
        naturalSizesRef.current.get(object) ?? null,
      );
      object.setCoords();
      commit(object);
      updateGuides([]);
    };

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      const id = active ? objectId(active) : null;

      if (id) useStore.getState().selectObject(id);
    };

    const handleWheel = (event: { e: WheelEvent; viewportPoint: Point }) => {
      event.e.preventDefault();

      const next = zoomAtPoint(
        viewportRef.current,
        viewportRef.current.zoom * Math.pow(0.999, event.e.deltaY),
        { x: event.viewportPoint.x, y: event.viewportPoint.y },
      );

      onViewportChangeRef.current(next);
    };

    canvas.on('mouse:down', (event) => {
      if (event.target) interactingRef.current = true;
    });
    canvas.on('mouse:up', () => {
      interactingRef.current = false;
    });
    canvas.on('object:moving', handleMoving);
    canvas.on('object:modified', handleModified);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => useStore.getState().selectObject(null));
    canvas.on('mouse:wheel', handleWheel);
    canvas.on('text:changed', (event) => {
      commit(event.target);
    });

    // Pan with Alt+drag or the middle button, captured before Fabric sees it.
    let panOrigin: { x: number; y: number } | null = null;
    const hostElement = hostRef.current;

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.altKey || event.button === 1)) return;
      event.preventDefault();
      event.stopPropagation();
      panOrigin = { x: event.clientX, y: event.clientY };
      hostElement?.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!panOrigin) return;
      event.preventDefault();
      event.stopPropagation();

      canvas.relativePan(new Point(event.clientX - panOrigin.x, event.clientY - panOrigin.y));
      panOrigin = { x: event.clientX, y: event.clientY };

      const transform = canvas.viewportTransform;
      onViewportChangeRef.current({ zoom: transform[0], x: transform[4], y: transform[5] });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!panOrigin) return;
      panOrigin = null;
      hostElement?.releasePointerCapture(event.pointerId);
    };

    hostElement?.addEventListener('pointerdown', onPointerDown, true);
    hostElement?.addEventListener('pointermove', onPointerMove, true);
    hostElement?.addEventListener('pointerup', onPointerUp, true);

    const onKeyDown = (event: KeyboardEvent) => {
      const state = useStore.getState();
      const active = canvas.getActiveObject();
      if (active instanceof Textbox && active.isEditing) return;

      // Esc clears the selection and the inspector returns to the page state.
      // A text-editing surface (Fabric's hidden textarea, contenteditable) or
      // an event another widget already consumed keeps the selection.
      if (event.key === 'Escape') {
        const target = event.target as HTMLElement | null;
        const editingSurface =
          !!target && (target.isContentEditable || target.tagName === 'TEXTAREA');

        if (!event.defaultPrevented && !editingSurface && state.selectedObjectId) {
          state.selectObject(null);
        }
        return;
      }

      const id = state.selectedObjectId;
      if (!id) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      const documentPage = activePageFromStore();
      const docObject = documentPage?.objects.find((candidate) => candidate.id === id);
      if (!documentPage || !docObject || docObject.locked) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        state.removeObject(id);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = deltas[event.key];
      if (!delta) return;

      event.preventDefault();
      state.updateObject(
        id,
        objectPatch(docObject.type, { x: docObject.x + delta[0], y: docObject.y + delta[1] }),
      );
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      hostElement?.removeEventListener('pointerdown', onPointerDown, true);
      hostElement?.removeEventListener('pointermove', onPointerMove, true);
      hostElement?.removeEventListener('pointerup', onPointerUp, true);
      canvas.off();
      objectMap.clear();
      naturalSizesRef.current = new WeakMap();
      loadingImages.clear();
      failedImages.clear();
      pageBackgroundRef.current = null;
      guidesRef.current = [];
      interactingRef.current = false;
      fabricRef.current = null;
      setReady(false);
      void canvas.dispose();
    };
  }, []);

  // Right-click over an image, the ContextMenu key over the selected image and
  // a paste with an image selected all reach the same replacement. The menu is
  // offered for an image object and for nothing else; the right-click is owned
  // by the editor, so text, shape and empty area open no browser menu either.
  useEffect(() => {
    if (!ready) return;

    const host = hostRef.current;
    const canvas = fabricRef.current;
    if (!host || !canvas) return;

    /** Opens the menu for an image id; any other target closes what was open. */
    const openMenu = (objectId: string, x: number, y: number) => {
      const actions = contextMenuActionsFor(
        activePageFromStore()?.objects.find((object) => object.id === objectId) ?? null,
      );

      if (!actions) {
        setContextMenu(null);
        return;
      }

      setReplaceError(null);
      setContextMenu({
        objectId,
        actions,
        position: clampMenuPosition({ x, y }, CONTEXT_MENU_BOX, {
          width: host.clientWidth,
          height: host.clientHeight,
        }),
      });
    };

    // A right-click is Fabric's own event: with `stopContextMenu` the canvas
    // stops the browser menu before the event leaves its wrapper, so a DOM
    // listener on the host would never see it. The event carries the target
    // Fabric just hit-tested, and the empty area arrives with no target.
    const onContextMenu = (event: { e: Event; target?: FabricObject }) => {
      if (useStore.getState().presenting) return;
      if (!(event.e instanceof MouseEvent)) return;

      const id = event.target ? objectId(event.target) : null;
      const docObject = id
        ? (activePageFromStore()?.objects.find((candidate) => candidate.id === id) ?? null)
        : null;

      if (!docObject || !contextMenuActionsFor(docObject)) {
        setContextMenu(null);
        return;
      }

      const rect = host.getBoundingClientRect();
      // Order matters: the selection is committed first, because the store
      // subscriber below closes the menu on that change. Opening before the
      // selection would be undone by the same notification.
      useStore.getState().selectObject(docObject.id);
      openMenu(docObject.id, event.e.clientX - rect.left, event.e.clientY - rect.top);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isMenuKey = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');
      if (!isMenuKey || event.defaultPrevented) return;

      const state = useStore.getState();
      const id = state.selectedObjectId;

      if (!id || state.presenting) return;

      const docObject =
        activePageFromStore()?.objects.find((candidate) => candidate.id === id) ?? null;

      if (!docObject || !contextMenuActionsFor(docObject)) return;

      event.preventDefault();

      // The menu opens over the object on screen, so its actions are next to
      // what they act on.
      const current = viewportRef.current;
      openMenu(
        docObject.id,
        current.x + (docObject.x + docObject.width / 2) * current.zoom,
        current.y + (docObject.y + docObject.height / 2) * current.zoom,
      );
    };

    const onPaste = (event: ClipboardEvent) => {
      // A paste over a form field belongs to the field; only the canvas area
      // (or the page background when nothing else holds the focus) replaces an
      // image, and only when the clipboard carries one.
      const eventTarget = event.target as Node | null;
      const withinCanvas =
        !!eventTarget && (host.contains(eventTarget) || eventTarget === globalThis.document.body);
      if (!withinCanvas) return;

      const state = useStore.getState();
      // The same predicate the right-click uses decides what a paste targets.
      const target = pasteReplacementTarget(
        activePageFromStore()?.objects ?? [],
        state.selectedObjectId,
      );
      if (!target) return;

      const file = pickClipboardImageFile(Array.from(event.clipboardData?.files ?? []));
      if (!file) return;

      event.preventDefault();
      void replaceImageWithFile(target.id, file);
    };

    canvas.on('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);

    return () => {
      canvas.off('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [ready, replaceImageWithFile]);

  // The menu follows the object it opened for: a selection change (including
  // Escape on the canvas) or a page switch closes it instead of leaving it
  // pointing at a stale target, and the error of a previous replacement goes
  // with it — a message about an object that is no longer in front must not
  // outlive the state it described.
  //
  // Ordering requirement, fixed here on purpose: this subscriber runs
  // synchronously on every store write, and every opener commits the
  // selection/page *before* opening the menu (see `onContextMenu`). Opening
  // first would be cleared by the notification that follows.
  useEffect(
    () =>
      useStore.subscribe((state, previous) => {
        if (
          state.selectedObjectId !== previous.selectedObjectId ||
          state.activePageId !== previous.activePageId
        ) {
          setContextMenu(null);
          setReplaceError(null);
        }
      }),
    [],
  );

  // Canvas size follows the measured host.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready || hostSize.width <= 0 || hostSize.height <= 0) return;

    canvas.setDimensions({ width: hostSize.width, height: hostSize.height });
    canvas.requestRenderAll();
  }, [hostSize, ready]);

  // Viewport transform (zoom + pan).
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    canvas.setViewportTransform([viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y]);
    canvas.requestRenderAll();
  }, [viewport, ready]);

  // Reconcile the Fabric scene with the active page of the document.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready || !page) return;

    const objects = objectsRef.current;

    let pageBackground = pageBackgroundRef.current;
    if (!pageBackground) {
      pageBackground = new Rect({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'default',
        excludeFromExport: true,
      });
      pageBackgroundRef.current = pageBackground;
      canvas.add(pageBackground);
    }
    pageBackground.set({
      left: 0,
      top: 0,
      width: page.width,
      height: page.height,
      fill: page.background,
      originX: 'left',
      originY: 'top',
    });

    const seen = new Set<string>();

    for (const docObject of page.objects) {
      seen.add(docObject.id);
      const existing = objects.get(docObject.id);

      if (existing) {
        // Do not fight an in-progress text editing session or a canvas drag.
        if (!(existing instanceof Textbox && existing.isEditing)) {
          applyFlags(existing, docObject);
          if (!interactingRef.current) {
            CANVAS_CODECS[docObject.type].applyGeometry(
              existing,
              docObject,
              naturalSizesRef.current.get(existing) ?? null,
            );
            existing.setCoords();
          }
        }
        continue;
      }

      if (existing) {
        canvas.remove(existing);
        objects.delete(docObject.id);
      }

      if (docObject.type === 'image') {
        loadedImageSrcRef.current.delete(docObject.id);

        // The same source already requested (or already failed) is not asked
        // again; a different source starts a fresh load — that is what makes a
        // replacement pick up the new picture.
        if (loadingImageSrcRef.current.get(docObject.id) === docObject.src) continue;
        if (failedImageSrcRef.current.get(docObject.id) === docObject.src) continue;

        loadingImageSrcRef.current.set(docObject.id, docObject.src);
        const objectIdForLoad = docObject.id;
        const objectForLoad = docObject;
        const requestedSrc = docObject.src;

        void FabricImage.fromURL(docObject.src, { crossOrigin: 'anonymous' })
          .then((image) => {
            if (loadingImageSrcRef.current.get(objectIdForLoad) === requestedSrc) {
              loadingImageSrcRef.current.delete(objectIdForLoad);
            }

            const activeCanvas = fabricRef.current;
            const documentPage = activePageFromStore();
            const current = documentPage?.objects.find(
              (candidate) => candidate.id === objectIdForLoad,
            );
            // A newer request took over (or the object is gone): this load is
            // stale, and lands nothing.
            const stillCurrent =
              current?.type === 'image' && current.src === requestedSrc;

            if (
              !activeCanvas ||
              !documentPage ||
              !stillCurrent ||
              objectsRef.current.has(objectIdForLoad)
            ) {
              return;
            }

            failedImageSrcRef.current.delete(objectIdForLoad);
            loadedImageSrcRef.current.set(objectIdForLoad, requestedSrc);
            naturalSizesRef.current.set(image, { width: image.width, height: image.height });
            tagObject(image, objectIdForLoad);
            applyFlags(image, objectForLoad);
            CANVAS_CODECS[objectForLoad.type].applyGeometry(image, objectForLoad, {
              width: image.width,
              height: image.height,
            });
            objectsRef.current.set(objectIdForLoad, image);
            activeCanvas.add(image);
            // The background layers move with the page fill: an image fill
            // keeps the loaded image right above the page rect.
            applyOrder(
              activeCanvas,
              documentPage,
              objectsRef.current,
              documentPage.background.kind === 'image' ? 2 : 1,
            );
            // A rebuilt object (a replacement) keeps the selection it had.
            if (useStore.getState().selectedObjectId === objectIdForLoad) {
              activeCanvas.setActiveObject(image);
            }
            activeCanvas.requestRenderAll();
          })
          .catch(() => {
            if (loadingImageSrcRef.current.get(objectIdForLoad) === requestedSrc) {
              loadingImageSrcRef.current.delete(objectIdForLoad);
            }

            const currentPage = activePageFromStore();
            const sameSource = currentPage?.objects.some(
              (candidate) =>
                candidate.id === objectIdForLoad &&
                candidate.type === 'image' &&
                candidate.src === requestedSrc,
            );

            if (sameSource) failedImageSrcRef.current.set(objectIdForLoad, requestedSrc);
          });

        continue;
      }

      const created = CANVAS_CODECS[docObject.type].create?.(docObject);
      if (!created) continue;

      tagObject(created, docObject.id);
      applyFlags(created, docObject);
      objects.set(docObject.id, created);
      canvas.add(created);
    }

    for (const [id, object] of [...objects]) {
      if (!seen.has(id)) {
        canvas.remove(object);
        objects.delete(id);
        loadedImageSrcRef.current.delete(id);
        loadingImageSrcRef.current.delete(id);
        failedImageSrcRef.current.delete(id);
      }
    }

    applyOrder(canvas, page, objects, objectOffset);
    canvas.requestRenderAll();
  }, [ready, page]);

  // Selection follows the store, including selections made from the layers panel.
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !ready) return;

    const active = canvas.getActiveObject();
    const activeId = active ? objectId(active) : null;
    if (activeId === selectedObjectId) return;

    if (!selectedObjectId) {
      canvas.discardActiveObject();
    } else {
      const object = objectsRef.current.get(selectedObjectId);
      if (object) {
        canvas.setActiveObject(object);
      } else {
        canvas.discardActiveObject();
      }
    }

    canvas.requestRenderAll();
  }, [ready, selectedObjectId, page]);

  // Preview requests from the animate panel: one shot per request, replacing
  // whatever was playing.
  useEffect(() => {
    if (!animationPreview) return;

    startPlayback(animationPreview.kind);
  }, [animationPreview, startPlayback]);

  // Presentation mode plays the page on entry and on every page switch; the
  // playback stops when the mode ends.
  useEffect(() => {
    if (!presenting) {
      stopPlayback();
      playbackSeqRef.current += 1;
      return;
    }

    startPlayback('page');
  }, [presenting, activePageId, startPlayback, stopPlayback]);

  // Unmount: never leave a playback running on a disposed canvas.
  useEffect(
    () => () => {
      stopPlayback();
      playbackSeqRef.current += 1;
    },
    [stopPlayback],
  );

  return (
    <div className="absolute inset-0" style={{ paddingLeft: RULER_SIZE, paddingTop: RULER_SIZE }}>
      <div
        ref={hostRef}
        tabIndex={-1}
        className="relative h-full w-full overflow-hidden rounded-[1.4rem] border border-border/70 bg-[hsl(var(--canvas-workspace))] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-testid="canvas-host"
        data-previewing={previewing ?? undefined}
      >
        <canvas ref={canvasRef} role="application" aria-label={copy.canvas.canvasLabel} />
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_SOURCE_ACCEPT}
          aria-label={copy.contextMenu.replaceImage}
          data-testid="image-replace-file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            const objectId = pendingReplaceIdRef.current;
            event.target.value = '';
            pendingReplaceIdRef.current = null;

            if (file && objectId) void replaceImageWithFile(objectId, file);
          }}
        />
        {contextMenu && (
          <ImageContextMenu
            position={contextMenu.position}
            actions={contextMenu.actions}
            onActivate={handleMenuActivate}
            onClose={closeContextMenu}
          />
        )}
        {replaceError && (
          <p
            role="alert"
            data-testid="image-replace-error"
            className="absolute bottom-3 left-3 z-30 max-w-[16rem] rounded-[0.7rem] border border-destructive/40 bg-background px-3 py-2 text-xs text-destructive shadow-lg"
          >
            {replaceError}
          </p>
        )}
        {guides.map((guide, index) => {
          const position =
            guide.axis === 'x'
              ? viewport.x + guide.position * viewport.zoom
              : viewport.y + guide.position * viewport.zoom;

          return guide.axis === 'x' ? (
            <div
              key={`x-${guide.position}-${index}`}
              data-testid="snap-guide"
              className="pointer-events-none absolute bottom-0 top-0 w-px bg-accent"
              style={{ left: position }}
            />
          ) : (
            <div
              key={`y-${guide.position}-${index}`}
              data-testid="snap-guide"
              className="pointer-events-none absolute left-0 right-0 h-px bg-accent"
              style={{ top: position }}
            />
          );
        })}
      </div>
    </div>
  );
}
