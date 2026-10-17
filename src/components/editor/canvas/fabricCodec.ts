/**
 * Codec between the Documento JSON and its Fabric representation.
 *
 * The canvas needs four conversions per object type — create, apply (document
 * -> canvas), read and normalize (canvas -> document). They live together in
 * one entry per type, and `CANVAS_CODECS` is the single map the reconcile loop
 * dispatches through, so a new object type lands in exactly one place instead
 * of four parallel `instanceof` cascades.
 *
 * Written from scratch for Fremit over the Fabric API; no code copied from any
 * reference editor.
 */

import { Ellipse, FabricImage, Rect, Textbox, type FabricObject } from 'fabric';
import type { DocumentObject, ImageObject, ShapeObject, TextObject } from '@/lib/document';
import type { DocumentObjectPatch } from '@/lib/documentOps';
import { containSize, coverCrop, type Size } from '@/lib/imageFit';

/** Document -> Fabric origin shared by every object type. */
const TOP_LEFT_ORIGIN = { originX: 'left', originY: 'top' } as const;

function normalizeAngle(angle: number): number {
  return Math.round((angle % 360) * 100) / 100;
}

/**
 * Geometry fields every object carries. `left`/`top`/`width`/`height` are
 * required by the typings but can be absent at runtime before Fabric positions
 * an object, so they fall back to the neutral value (0) and the scale to 1.
 */
function baseGeometryPatch(object: FabricObject): DocumentObjectPatch {
  return {
    x: object.left ?? 0,
    y: object.top ?? 0,
    rotation: normalizeAngle(object.angle),
    opacity: object.opacity,
    width: Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1)),
    height: Math.max(1, (object.height ?? 0) * (object.scaleY ?? 1)),
  };
}

function applyBaseGeometry(object: FabricObject, docObject: DocumentObject): void {
  object.set({
    left: docObject.x,
    top: docObject.y,
    angle: docObject.rotation,
    opacity: docObject.opacity,
  });
}

function bakeScale(object: FabricObject): void {
  object.set({
    width: Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1)),
    height: Math.max(1, (object.height ?? 0) * (object.scaleY ?? 1)),
    scaleX: 1,
    scaleY: 1,
  });
}

function applyImageFit(object: FabricImage, docObject: ImageObject, natural: Size): void {
  if (docObject.fit === 'cover') {
    const crop = coverCrop(natural, { width: docObject.width, height: docObject.height });

    object.set({
      left: docObject.x,
      top: docObject.y,
      cropX: crop.x,
      cropY: crop.y,
      width: crop.width,
      height: crop.height,
      scaleX: docObject.width / crop.width,
      scaleY: docObject.height / crop.height,
    });

    return;
  }

  const contained = containSize(natural, { width: docObject.width, height: docObject.height });

  object.set({
    left: docObject.x + (docObject.width - contained.width) / 2,
    top: docObject.y + (docObject.height - contained.height) / 2,
    cropX: 0,
    cropY: 0,
    width: natural.width,
    height: natural.height,
    scaleX: contained.scale,
    scaleY: contained.scale,
  });
}

export interface CanvasCodec<T extends DocumentObject> {
  /** Fabric object for a fresh document object; images load async and omit it. */
  create?(object: T): FabricObject;
  /** Applies the document geometry to the Fabric object. */
  applyGeometry(object: FabricObject, docObject: T, natural: Size | null): void;
  /** Reads the live Fabric geometry back into the document contract. */
  readGeometry(object: FabricObject): DocumentObjectPatch;
  /** Bakes the interactive scale back into width/height (and font size). */
  normalizeGeometry(object: FabricObject, docObject: T, natural: Size | null): void;
}

const textCodec: CanvasCodec<TextObject> = {
  create(object) {
    return new Textbox(object.text, {
      left: object.x,
      top: object.y,
      width: object.width,
      angle: object.rotation,
      opacity: object.opacity,
      visible: object.visible,
      ...TOP_LEFT_ORIGIN,
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontWeight: object.fontWeight,
      fill: object.fill,
      textAlign: object.align,
    });
  },
  applyGeometry(object, docObject) {
    applyBaseGeometry(object, docObject);

    if (!(object instanceof Textbox)) return;

    object.set({
      text: docObject.text,
      width: docObject.width,
      fontFamily: docObject.fontFamily,
      fontSize: docObject.fontSize,
      fontWeight: docObject.fontWeight,
      fill: docObject.fill,
      textAlign: docObject.align,
      scaleX: 1,
      scaleY: 1,
    });
  },
  readGeometry(object) {
    const geometry = baseGeometryPatch(object);

    if (!(object instanceof Textbox)) return geometry;

    return {
      ...geometry,
      text: object.text,
      fontSize: Math.max(1, object.fontSize * (object.scaleY ?? 1)),
    };
  },
  normalizeGeometry(object) {
    if (!(object instanceof Textbox)) return;

    object.set({
      width: Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1)),
      fontSize: Math.max(1, object.fontSize * (object.scaleY ?? 1)),
      scaleX: 1,
      scaleY: 1,
    });
  },
};

const shapeCodec: CanvasCodec<ShapeObject> = {
  create(object) {
    const shared = {
      left: object.x,
      top: object.y,
      angle: object.rotation,
      opacity: object.opacity,
      visible: object.visible,
      ...TOP_LEFT_ORIGIN,
    };

    if (object.shape === 'ellipse') {
      return new Ellipse({
        ...shared,
        rx: object.width / 2,
        ry: object.height / 2,
        fill: object.fill,
      });
    }

    return new Rect({
      ...shared,
      width: object.width,
      height: object.height,
      fill: object.fill,
      rx: object.cornerRadius,
      ry: object.cornerRadius,
      stroke: object.stroke ?? undefined,
      strokeWidth: object.strokeWidth,
    });
  },
  applyGeometry(object, docObject) {
    applyBaseGeometry(object, docObject);

    if (object instanceof Ellipse) {
      object.set({
        rx: docObject.width / 2,
        ry: docObject.height / 2,
        fill: docObject.fill,
        scaleX: 1,
        scaleY: 1,
      });

      return;
    }

    if (object instanceof Rect) {
      object.set({
        width: docObject.width,
        height: docObject.height,
        fill: docObject.fill,
        rx: docObject.cornerRadius,
        ry: docObject.cornerRadius,
        stroke: docObject.stroke ?? undefined,
        strokeWidth: docObject.strokeWidth,
        scaleX: 1,
        scaleY: 1,
      });
    }
  },
  readGeometry(object) {
    return baseGeometryPatch(object);
  },
  normalizeGeometry(object) {
    bakeScale(object);
  },
};

const imageCodec: CanvasCodec<ImageObject> = {
  applyGeometry(object, docObject, natural) {
    // Fabric 7 defaults every object to a CENTER origin; the document contract
    // is top-left based, so the image must be pinned to the same origin as the
    // other object types (created with TOP_LEFT_ORIGIN).
    object.set(TOP_LEFT_ORIGIN);
    applyBaseGeometry(object, docObject);

    if (object instanceof FabricImage && natural) {
      applyImageFit(object, docObject, natural);
    }
  },
  readGeometry(object) {
    return baseGeometryPatch(object);
  },
  normalizeGeometry(object, docObject, natural) {
    if (object instanceof FabricImage && natural) {
      if (docObject.fit === 'cover') {
        const boxWidth = Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1));
        const boxHeight = Math.max(1, (object.height ?? 0) * (object.scaleY ?? 1));
        const crop = coverCrop(natural, { width: boxWidth, height: boxHeight });

        object.set({
          cropX: crop.x,
          cropY: crop.y,
          width: crop.width,
          height: crop.height,
          scaleX: boxWidth / crop.width,
          scaleY: boxHeight / crop.height,
        });

        return;
      }

      const width = Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1));
      const height = Math.max(1, (object.height ?? 0) * (object.scaleY ?? 1));
      const scale = Math.min(width / natural.width, height / natural.height);

      object.set({
        cropX: 0,
        cropY: 0,
        width: natural.width,
        height: natural.height,
        scaleX: scale,
        scaleY: scale,
      });

      return;
    }

    bakeScale(object);
  },
};

/** Single dispatch table for the document <-> Fabric conversion. */
export const CANVAS_CODECS: Record<DocumentObject['type'], CanvasCodec<DocumentObject>> = {
  text: textCodec,
  shape: shapeCodec,
  image: imageCodec,
};
