/**
 * Codec between the Documento JSON and its Fabric representation.
 *
 * The canvas needs four conversions per object type — create, apply (document
 * -> canvas), read and normalize (canvas -> document). They live together in
 * one entry per type, and `CANVAS_CODECS` is the single map the reconcile loop
 * dispatches through, so a new object type lands in exactly one place instead
 * of four parallel `instanceof` cascades.
 *
 * The exporter consumes the same table (`create` for text/shape, `applyGeometry`
 * for images), which is what keeps an export identical to what the canvas shows.
 *
 * Written from scratch for Fremit over the Fabric API; no code copied from any
 * reference editor.
 */

import { Ellipse, FabricImage, Gradient, Path, Polygon, Polyline, Rect, Text, Textbox, Triangle, type FabricObject } from 'fabric';
import type { DocumentObject, DocumentPage, ImageObject, PageBackground, ShapeObject, TextAlign, TextArc, TextObject } from '@/lib/document';
import type { CommonObjectFields, DocumentObjectPatch } from '@/lib/documentOps';
import { arcTextBox, arcTextWidth, buildArcPathData, measureTextWidth, type TextMetricsInput } from '@/lib/arcText';
import { gradientLine, safePageColor } from '@/lib/pageBackground';
import { containSize, coverCrop, type Size } from '@/lib/imageFit';
import { imageMaskClipGeometry } from '@/lib/imageMask';
import { round2 } from '@/lib/math';
import { SHAPE_BOX, regularPolygonPoints, starPoints, type ShapePoint } from '@/lib/shapeGeometry';

/** Document -> Fabric origin shared by every object type. */
const TOP_LEFT_ORIGIN = { originX: 'left', originY: 'top' } as const;

/**
 * Fabric angles are free floats; the document stores them rounded to two
 * decimals like the rest of the geometry. The value is not canonicalized
 * modulo 360, so a negative rotation (the worked document uses -2) survives
 * the canvas -> document read exactly as the canvas shows it.
 */
function roundAngle(angle: number): number {
  return round2(angle);
}

/**
 * Geometry fields every object carries. `left`/`top`/`width`/`height` are
 * required by the typings but can be absent at runtime before Fabric positions
 * an object, so they fall back to the neutral value (0) and the scale to 1.
 */
function baseGeometryPatch(object: FabricObject): CommonObjectFields {
  return {
    x: object.left ?? 0,
    y: object.top ?? 0,
    rotation: roundAngle(object.angle),
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
    fitImageCover(
      object,
      { x: docObject.x, y: docObject.y, width: docObject.width, height: docObject.height },
      natural,
    );

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

/**
 * Cover fit of a raw image into a page-space box: the crop keeps the aspect
 * ratio and the overflow is centered. Shared by image objects, the image page
 * background (canvas and export) — one formula, so a background never frames
 * differently from an image object.
 */
export function fitImageCover(
  object: FabricImage,
  box: { x: number; y: number; width: number; height: number },
  natural: Size,
): void {
  const crop = coverCrop(natural, { width: box.width, height: box.height });

  object.set({
    ...TOP_LEFT_ORIGIN,
    left: box.x,
    top: box.y,
    cropX: crop.x,
    cropY: crop.y,
    width: crop.width,
    height: crop.height,
    scaleX: box.width / crop.width,
    scaleY: box.height / crop.height,
  });
}

/**
 * Paint of a page background for a box of `size`: a CSS color, a Fabric
 * gradient in the box's own pixels, or `null` for the image background (the
 * image renders as its own object). Shared by the live canvas and the
 * exporter, so both always paint the same page — and both go through
 * `safePageColor`, so a hand-edited value never reaches the markup.
 */
export function pageBackgroundFill(
  background: PageBackground,
  size: Size,
): string | Gradient<'pixels', 'linear'> | null {
  if (background.kind === 'solid') return safePageColor(background.color);

  if (background.kind === 'gradient') {
    const line = gradientLine(size.width, size.height, background.angle);

    return new Gradient({
      type: 'linear',
      gradientUnits: 'pixels',
      coords: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
      colorStops: [
        { offset: 0, color: safePageColor(background.from) },
        { offset: 1, color: safePageColor(background.to) },
      ],
    });
  }

  return null;
}

export interface PageBackgroundRectOptions {
  /**
   * The live canvas keeps the page fill out of any serialized copy of itself
   * (the document is the only source of truth for it); the exporter includes
   * it, because there the rect *is* the page fill. Both callers state it.
   */
  excludeFromExport: boolean;
}

/** Page-sized background rect; the caller decides its export behavior. */
export function createPageBackgroundRect(
  page: DocumentPage,
  { excludeFromExport }: PageBackgroundRectOptions,
): Rect {
  return new Rect({
    left: 0,
    top: 0,
    width: page.width,
    height: page.height,
    ...TOP_LEFT_ORIGIN,
    fill:
      pageBackgroundFill(page.background, { width: page.width, height: page.height }) ?? undefined,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    hoverCursor: 'default',
    excludeFromExport,
  });
}

/**
 * Arc of a curved text: measured from the text and the font the canvas
 * currently holds, so editing either re-flows the curve instead of keeping a
 * frozen shape. The path is invisible — the text is the content — and the SVG
 * export keeps each glyph's rotation along it.
 *
 * `pathSide: 'left'` is what keeps the glyphs upright on both directions:
 * Fabric flips the glyph angle by π only for `'right'` (and reverses the run
 * with it, `_measureLine`/`_setGraphemeOnPath`), and both our arcs run from
 * x=0 to x=chord, so following the path direction leaves the rainbow and the
 * valley readable.
 */
function applyArcPath(object: Text, arc: TextArc): void {
  // The path must cover the width the engine lays the glyphs out at, not only
  // the one-shot string measurement. Fabric sums per glyph to center the run
  // (`_measureLine`); the two measurements differ by a fraction of a pixel
  // across rasterizers, and a path shorter than that sum makes the centering
  // offset negative — the first glyph then wraps to the end of the path.
  const textWidth = arcTextWidth(measureTextWidth(textMetrics(object)), object.calcTextWidth());
  const geometry = buildArcPathData({
    textWidth,
    direction: arc.direction,
    amount: arc.amount,
  });

  object.set({
    path: new Path(geometry.d, { visible: false, fill: 'transparent', stroke: null }),
    pathSide: 'left',
    pathAlign: 'baseline',
    pathStartOffset: 0,
  });
}

/**
 * Metrics of the text as the canvas currently holds it. The arc path and its
 * box are measured from this — the same text the renderer draws — so a resize
 * that scaled the type re-flows the curve in the same pass.
 */
function textMetrics(object: Text | Textbox): TextMetricsInput {
  return {
    text: object.text,
    fontFamily: object.fontFamily,
    fontSize: object.fontSize,
    fontWeight: typeof object.fontWeight === 'number' ? object.fontWeight : 400,
  };
}

/** Curved text is a plain `Text` on a path: no wrapping box, glyphs rotate. */
function createArcText(object: TextObject, arc: TextArc): Text {
  const text = new Text(object.text, {
    left: object.x,
    top: object.y,
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

  applyArcPath(text, arc);

  return text;
}

export interface CanvasCodec<T extends DocumentObject> {
  /** Fabric object for a fresh document object; images load async and omit it. */
  create?(object: T): FabricObject;
  /** Applies the document geometry to the Fabric object. */
  applyGeometry(object: FabricObject, docObject: T, natural: Size | null): void;
  /**
   * Reads the live Fabric object back into the document contract, with every
   * field the canvas itself can change. `docObject` is the stored value the
   * read started from — it carries what the Fabric object does not hold (the
   * arc parameters of a curved text), so a canvas edit can never drop them.
   */
  readGeometry(object: FabricObject, docObject: T): DocumentObjectPatch;
  /** Bakes the interactive scale back into width/height (and font size). */
  normalizeGeometry(object: FabricObject, docObject: T, natural: Size | null): void;
}

/** Fields of a text object the canvas holds and the document stores. */
interface TextReadFields {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  align: TextAlign;
}

/**
 * Reads the text fields off the Fabric object. Values the document types
 * constrain (weight, fill, alignment) fall back to the stored ones instead of
 * being trusted blindly — the merge writes them like any other field.
 */
function readTextFields(object: Text | Textbox, docObject: TextObject): TextReadFields {
  return {
    ...textMetrics(object),
    fontWeight:
      typeof object.fontWeight === 'number' ? object.fontWeight : docObject.fontWeight,
    fontSize: Math.max(1, object.fontSize * (object.scaleY ?? 1)),
    fill: typeof object.fill === 'string' ? object.fill : docObject.fill,
    align: object.textAlign === 'center' || object.textAlign === 'right' ? object.textAlign : 'left',
  };
}

const textCodec: CanvasCodec<TextObject> = {
  create(object) {
    if (object.arc) return createArcText(object, object.arc);

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

    if (object instanceof Textbox) {
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

      return;
    }

    // Curved text: the arc is rebuilt from the document, never kept from a
    // previous render, so a text or font edit re-flows the curve.
    if (object instanceof Text && docObject.arc) {
      object.set({
        text: docObject.text,
        fontFamily: docObject.fontFamily,
        fontSize: docObject.fontSize,
        fontWeight: docObject.fontWeight,
        fill: docObject.fill,
        textAlign: docObject.align,
        scaleX: 1,
        scaleY: 1,
      });
      applyArcPath(object, docObject.arc);
    }
  },
  readGeometry(object, docObject) {
    const geometry = baseGeometryPatch(object);

    if (object instanceof Textbox) {
      return { type: 'text', ...geometry, ...readTextFields(object, docObject), arc: docObject.arc };
    }

    // Curved text: the read carries the whole text contract, or the commit
    // that follows an in-place edit would keep only the geometry and the edit
    // would be reverted by the next reconcile.
    if (object instanceof Text && docObject.arc) {
      const fields = readTextFields(object, docObject);
      // The box is derived from the text and the font like the path itself:
      // reading Fabric's copy of the old path box would keep the box of the
      // previous render after an edit. The engine's layout width goes in too,
      // so the stored box and the path share the same slack.
      const box = arcTextBox(
        {
          text: fields.text,
          fontFamily: fields.fontFamily,
          fontSize: fields.fontSize,
          fontWeight: fields.fontWeight,
        },
        docObject.arc,
        object.calcTextWidth(),
      );

      return {
        type: 'text',
        ...geometry,
        ...fields,
        width: box.width,
        height: box.height,
        arc: docObject.arc,
      };
    }

    return { type: 'text', ...geometry };
  },
  normalizeGeometry(object, docObject) {
    if (object instanceof Textbox) {
      object.set({
        width: Math.max(1, (object.width ?? 0) * (object.scaleX ?? 1)),
        fontSize: Math.max(1, object.fontSize * (object.scaleY ?? 1)),
        scaleX: 1,
        scaleY: 1,
      });

      return;
    }

    // An arc scales its type (the box follows from the curve), like the
    // straight text scales its font with the vertical handle.
    if (object instanceof Text && docObject.arc) {
      object.set({
        fontSize: Math.max(1, object.fontSize * (object.scaleY ?? 1)),
        scaleX: 1,
        scaleY: 1,
      });
      applyArcPath(object, docObject.arc);
    }
  },
};

/**
 * Points of the polygon kinds in the normalized box: `star` measures from its
 * tip count and inner ratio, `polygon` from its side count. Same functions the
 * SVG export and the preview cards use, so every surface draws one shape.
 */
function polygonPointsFor(object: ShapeObject): ShapePoint[] {
  if (object.shape === 'star') return starPoints(object.sides, object.innerRadius);

  return regularPolygonPoints(object.sides);
}

/** The line's segment: the box diagonal, in the normalized box. */
function linePoints(): ShapePoint[] {
  return [
    { x: 0, y: 0 },
    { x: SHAPE_BOX, y: SHAPE_BOX },
  ];
}

/**
 * Shapes whose size is carried by the scale over the normalized points
 * (`star`, `polygon`, `line`) instead of by `width`/`height`. The canvas read
 * multiplies `width * scaleX` either way, so the two carriers read alike; the
 * difference is only in what `applyGeometry` writes.
 */
function keepsNormalizedScale(object: ShapeObject): boolean {
  return object.shape === 'star' || object.shape === 'polygon' || object.shape === 'line';
}

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
    const stroke = object.stroke ?? undefined;

    switch (object.shape) {
      case 'ellipse':
        return new Ellipse({
          ...shared,
          rx: object.width / 2,
          ry: object.height / 2,
          fill: object.fill,
          stroke,
          strokeWidth: object.strokeWidth,
        });
      case 'triangle':
        return new Triangle({
          ...shared,
          width: object.width,
          height: object.height,
          fill: object.fill,
          stroke,
          strokeWidth: object.strokeWidth,
        });
      case 'line':
        return new Polyline(linePoints(), {
          ...shared,
          scaleX: object.width / SHAPE_BOX,
          scaleY: object.height / SHAPE_BOX,
          // A segment has no area to fill: the paint is the stroke.
          fill: null,
          stroke,
          strokeWidth: object.strokeWidth,
          // The scale over the normalized box must not stretch the stroke.
          strokeUniform: true,
        });
      case 'star':
      case 'polygon':
        return new Polygon(polygonPointsFor(object), {
          ...shared,
          scaleX: object.width / SHAPE_BOX,
          scaleY: object.height / SHAPE_BOX,
          fill: object.fill,
          stroke,
          strokeWidth: object.strokeWidth,
          strokeUniform: true,
        });
      case 'rect':
        return new Rect({
          ...shared,
          width: object.width,
          height: object.height,
          fill: object.fill,
          rx: object.cornerRadius,
          ry: object.cornerRadius,
          stroke,
          strokeWidth: object.strokeWidth,
        });
    }
  },
  applyGeometry(object, docObject) {
    applyBaseGeometry(object, docObject);
    const stroke = docObject.stroke ?? undefined;

    switch (docObject.shape) {
      case 'ellipse':
        if (object instanceof Ellipse) {
          object.set({
            rx: docObject.width / 2,
            ry: docObject.height / 2,
            fill: docObject.fill,
            stroke,
            strokeWidth: docObject.strokeWidth,
            scaleX: 1,
            scaleY: 1,
          });
        }
        return;
      case 'triangle':
        if (object instanceof Triangle) {
          object.set({
            width: docObject.width,
            height: docObject.height,
            fill: docObject.fill,
            stroke,
            strokeWidth: docObject.strokeWidth,
            scaleX: 1,
            scaleY: 1,
          });
        }
        return;
      case 'line':
        if (object instanceof Polyline) {
          object.set({
            points: linePoints(),
            scaleX: docObject.width / SHAPE_BOX,
            scaleY: docObject.height / SHAPE_BOX,
            fill: null,
            stroke,
            strokeWidth: docObject.strokeWidth,
          });
          // The points changed identity: refresh the derived dimensions and
          // offsets so the render and the hit box follow the new points.
          object.setDimensions();
        }
        return;
      case 'star':
      case 'polygon':
        if (object instanceof Polygon) {
          object.set({
            points: polygonPointsFor(docObject),
            scaleX: docObject.width / SHAPE_BOX,
            scaleY: docObject.height / SHAPE_BOX,
            fill: docObject.fill,
            stroke,
            strokeWidth: docObject.strokeWidth,
          });
          object.setDimensions();
        }
        return;
      case 'rect':
        if (object instanceof Rect) {
          object.set({
            width: docObject.width,
            height: docObject.height,
            fill: docObject.fill,
            rx: docObject.cornerRadius,
            ry: docObject.cornerRadius,
            stroke,
            strokeWidth: docObject.strokeWidth,
            scaleX: 1,
            scaleY: 1,
          });
        }
        return;
    }
  },
  readGeometry(object) {
    return { type: 'shape', ...baseGeometryPatch(object) };
  },
  normalizeGeometry(object, docObject) {
    // The normalized-scale kinds keep their size in `scaleX/scaleY` over the
    // constant points; the canvas read multiplies the two, so there is nothing
    // to bake and a later reconcile writes the same scale back. Baking the
    // points themselves would fight the constants and drift with every drag.
    if (keepsNormalizedScale(docObject)) return;

    bakeScale(object);
  },
};

/**
 * Applies the mask of an image object as a clip centered on the object. The
 * FabricImage cache is drawn at the natural size and composited with the
 * object scale, so the page rect is converted to those local units (see
 * `imageMaskClipGeometry`): the rendered crop is the same rect the thumbnail
 * writes in the SVG, for any cover/contain fit and any rotation.
 */
function applyImageMask(object: FabricImage, docObject: ImageObject): void {
  const geometry = imageMaskClipGeometry(docObject, {
    x: object.scaleX ?? 1,
    y: object.scaleY ?? 1,
  });

  if (!geometry) {
    // Clearing must invalidate the cached bitmap, or the rounded corners stay
    // painted after the mask is gone.
    if (object.clipPath) {
      object.clipPath = undefined;
      object.set('dirty', true);
    }

    return;
  }

  const clipPath =
    object.clipPath instanceof Rect
      ? object.clipPath
      : new Rect({ originX: 'center', originY: 'center', left: 0, top: 0 });

  clipPath.set({
    width: geometry.width,
    height: geometry.height,
    rx: geometry.rx,
    ry: geometry.ry,
  });
  clipPath.setCoords();
  object.clipPath = clipPath;
  object.set('dirty', true);
}

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

    if (object instanceof FabricImage) {
      applyImageMask(object, docObject);
    }
  },
  readGeometry(object) {
    return { type: 'image', ...baseGeometryPatch(object) };
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
