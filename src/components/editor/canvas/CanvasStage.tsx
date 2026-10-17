/**
 * Fabric layer of the dedicated canvas: renders the active page of the
 * Documento JSON, handles selection, transform, text editing, snapping and the
 * viewport (zoom/pan). The store is the source of truth; this component
 * reconciles the Fabric scene against it and pushes interactions back.
 *
 * Written from scratch for Fremit over the Fabric API; no code copied from any
 * reference editor.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, FabricImage, FabricObject, Point, Rect, Textbox } from 'fabric';
import { backgroundStyle } from '@/lib/backgroundStyle';
import type { Size } from '@/lib/imageFit';
import { snapRect, snapTolerance, type Rect as SnapTarget, type SnapGuide } from '@/lib/editorSnap';
import { RULER_SIZE, zoomAtPoint, type Viewport } from '@/lib/editorViewport';
import type { DocumentObject, DocumentPage } from '@/lib/document';
import { useI18n } from '@/i18n/useI18n';
import { useStore } from '@/store/useStore';
import { CANVAS_CODECS } from './fabricCodec';

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
  const loadingImagesRef = useRef(new Set<string>());
  const failedImagesRef = useRef(new Set<string>());
  const pageBackgroundRef = useRef<Rect | null>(null);
  const interactingRef = useRef(false);
  const viewportRef = useRef(viewport);
  const snapEnabledRef = useRef(snapEnabled);
  const onViewportChangeRef = useRef(onViewportChange);
  const guidesRef = useRef<SnapGuide[]>([]);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  const document = useStore((state) => state.document);
  const activePageId = useStore((state) => state.activePageId);
  const selectedObjectId = useStore((state) => state.selectedObjectId);
  const background = useStore((state) => state.background);
  const { copy } = useI18n();
  const page = useMemo(
    () => document.pages.find((candidate) => candidate.id === activePageId) ?? null,
    [document, activePageId],
  );
  const workspaceBackground = useMemo(() => backgroundStyle(background), [background]);

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
    const loadingImages = loadingImagesRef.current;
    const failedImages = failedImagesRef.current;

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

      useStore.getState().updateObject(id, CANVAS_CODECS[docObject.type].readGeometry(object));
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

      useStore.getState().updateObject(id, { x: left, y: top });
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
      const id = state.selectedObjectId;
      if (!id) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      const active = canvas.getActiveObject();
      if (active instanceof Textbox && active.isEditing) return;

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
      state.updateObject(id, { x: docObject.x + delta[0], y: docObject.y + delta[1] });
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

      if (docObject.type === 'image') {
        if (loadingImagesRef.current.has(docObject.id) || failedImagesRef.current.has(docObject.id)) {
          continue;
        }

        loadingImagesRef.current.add(docObject.id);
        const objectIdForLoad = docObject.id;
        const objectForLoad = docObject;

        void FabricImage.fromURL(docObject.src, { crossOrigin: 'anonymous' })
          .then((image) => {
            loadingImagesRef.current.delete(objectIdForLoad);

            const activeCanvas = fabricRef.current;
            const documentPage = activePageFromStore();
            const stillPresent =
              documentPage?.objects.some((candidate) => candidate.id === objectIdForLoad) ?? false;

            if (
              !activeCanvas ||
              !documentPage ||
              !stillPresent ||
              objectsRef.current.has(objectIdForLoad)
            ) {
              return;
            }

            naturalSizesRef.current.set(image, { width: image.width, height: image.height });
            tagObject(image, objectIdForLoad);
            applyFlags(image, objectForLoad);
            CANVAS_CODECS[objectForLoad.type].applyGeometry(image, objectForLoad, {
              width: image.width,
              height: image.height,
            });
            objectsRef.current.set(objectIdForLoad, image);
            activeCanvas.add(image);
            applyOrder(activeCanvas, documentPage, objectsRef.current);
            activeCanvas.requestRenderAll();
          })
          .catch(() => {
            loadingImagesRef.current.delete(objectIdForLoad);
            failedImagesRef.current.add(objectIdForLoad);
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
      }
    }

    applyOrder(canvas, page, objects);
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

  return (
    <div className="absolute inset-0" style={{ paddingLeft: RULER_SIZE, paddingTop: RULER_SIZE }}>
      <div
        ref={hostRef}
        className="relative h-full w-full overflow-hidden rounded-[1.4rem] border border-border/70"
        style={workspaceBackground}
        data-testid="canvas-host"
      >
        <canvas ref={canvasRef} role="application" aria-label={copy.canvas.canvasLabel} />
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
