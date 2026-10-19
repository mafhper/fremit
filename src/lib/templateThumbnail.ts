/**
 * Pure SVG preview of a document page, used by the template gallery cards and
 * the sticker previews. It reads the same Documento JSON the canvas renders
 * and draws a miniature with plain SVG elements — no Fabric, no canvas, no
 * image decoding — so a card shows the real seed (background, colors, text and
 * geometry) instead of a hand-made picture that could drift from it.
 *
 * The output is a self-contained `<svg>` string with a `viewBox` in page
 * units, so the card only needs CSS width for it to scale. Text and attribute
 * values are XML-escaped; only own data feeds it, but the function never
 * trusts that.
 */

import type {
  DocumentObject,
  DocumentPage,
  GradientPageBackground,
  ImageObject,
  ShapeObject,
  TextObject,
} from '@/lib/document';
import { round2 } from '@/lib/math';
import { imageMaskRect, type ImageMaskRect } from '@/lib/imageMask';
import { gradientLine, imageBackgroundSurface, safePageColor } from '@/lib/pageBackground';
import { SHAPE_BOX, regularPolygonPoints, starPoints, type ShapePoint } from '@/lib/shapeGeometry';

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

/** Compact number for markup: at most two decimals, no trailing noise. */
function n(value: number): string {
  return String(round2(value));
}

function textElement(object: TextObject): string {
  const anchor =
    object.align === 'center' ? 'middle' : object.align === 'right' ? 'end' : 'start';
  const anchorX =
    object.align === 'center'
      ? object.x + object.width / 2
      : object.align === 'right'
        ? object.x + object.width
        : object.x;
  const lineHeight = object.fontSize * 1.2;
  const lines = object.text
    .split('\n')
    .map(
      (line, index) =>
        `<tspan x="${n(anchorX)}" y="${n(object.y + object.fontSize + index * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  return `<text font-family="${escapeXml(object.fontFamily)}" font-size="${n(object.fontSize)}" font-weight="${n(object.fontWeight)}" fill="${escapeXml(object.fill)}" text-anchor="${anchor}">${lines}</text>`;
}

/** Stroke pair of a shape preview; both the canvas and the card need it. */
function strokeAttributes(object: ShapeObject): string {
  return object.stroke && object.strokeWidth > 0
    ? ` stroke="${escapeXml(object.stroke)}" stroke-width="${n(object.strokeWidth)}"`
    : '';
}

/** Normalized points scaled into the object's box, as an SVG `points` list. */
function pointsAttribute(points: ShapePoint[], object: ShapeObject): string {
  return points
    .map(
      (point) =>
        `${n(object.x + (point.x / SHAPE_BOX) * object.width)},${n(object.y + (point.y / SHAPE_BOX) * object.height)}`,
    )
    .join(' ');
}

function shapeElement(object: ShapeObject): string {
  if (object.shape === 'ellipse') {
    return `<ellipse cx="${n(object.x + object.width / 2)}" cy="${n(object.y + object.height / 2)}" rx="${n(object.width / 2)}" ry="${n(object.height / 2)}" fill="${escapeXml(object.fill)}"${strokeAttributes(object)}/>`;
  }

  if (object.shape === 'triangle') {
    const bottom = object.y + object.height;
    const apex = object.x + object.width / 2;

    return `<polygon points="${n(object.x)},${n(bottom)} ${n(apex)},${n(object.y)} ${n(object.x + object.width)},${n(bottom)}" fill="${escapeXml(object.fill)}"${strokeAttributes(object)}/>`;
  }

  if (object.shape === 'star' || object.shape === 'polygon') {
    // The same measurement the canvas and the exporter use, so the card can
    // never drift from what the shape inserts.
    const points =
      object.shape === 'star'
        ? starPoints(object.sides, object.innerRadius)
        : regularPolygonPoints(object.sides);

    return `<polygon points="${pointsAttribute(points, object)}" fill="${escapeXml(object.fill)}"${strokeAttributes(object)}/>`;
  }

  if (object.shape === 'line') {
    // A segment has no fill: it paints with its stroke, like the canvas.
    if (!object.stroke || object.strokeWidth <= 0) return '';

    return `<line x1="${n(object.x)}" y1="${n(object.y)}" x2="${n(object.x + object.width)}" y2="${n(object.y + object.height)}"${strokeAttributes(object)}/>`;
  }

  return `<rect x="${n(object.x)}" y="${n(object.y)}" width="${n(object.width)}" height="${n(object.height)}" rx="${n(object.cornerRadius)}" fill="${escapeXml(object.fill)}"${strokeAttributes(object)}/>`;
}

/**
 * Id of the mask clip of an object, inside one page's markup. The prefix keeps
 * it a valid reference and the non-alphanumeric characters are hex-encoded, so
 * two object ids cannot sanitize into the same id.
 */
function maskClipId(object: ImageObject): string {
  const encoded = object.id.replace(/[^a-zA-Z0-9_-]/g, (character) => {
    const code = character.codePointAt(0) ?? 0;

    return `_${code.toString(16)}`;
  });

  return `fremit-mask-${encoded}`;
}

function maskClip(rect: ImageMaskRect, id: string): string {
  return (
    `<defs><clipPath id="${id}"><rect x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}" rx="${n(rect.rx)}" ry="${n(rect.ry)}"/></clipPath></defs>`
  );
}

function imageElement(object: ImageObject): string {
  const fit = object.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
  const image = `<image href="${escapeXml(object.src)}" x="${n(object.x)}" y="${n(object.y)}" width="${n(object.width)}" height="${n(object.height)}" preserveAspectRatio="${fit}"`;
  const mask = imageMaskRect(object);

  if (!mask) return `${image}/>`;

  // The clip and the image share the object's user space, so the crop is the
  // same rect the canvas and the exporter use — including under rotation,
  // because `objectSvg` wraps both in the object's transform group.
  const id = maskClipId(object);

  return `${maskClip(mask, id)}${image} clip-path="url(#${id})"/>`;
}

function objectElement(object: DocumentObject): string {
  if (object.type === 'text') return textElement(object);
  if (object.type === 'shape') return shapeElement(object);
  return imageElement(object);
}

function objectSvg(object: DocumentObject): string {
  const element = objectElement(object);
  const attributes = [
    object.opacity < 1 ? ` opacity="${n(object.opacity)}"` : '',
    object.rotation !== 0
      ? ` transform="rotate(${n(object.rotation)} ${n(object.x)} ${n(object.y)})"`
      : '',
  ].join('');

  if (!attributes) return element;

  return `<g${attributes}>${element}</g>`;
}

/**
 * Id of the gradient defs, derived from what the gradient actually paints
 * (page size, endpoint colors, angle). Two calls over the same page produce
 * identical markup — the module counter this replaced made them differ for no
 * visual change — and two different gradients cannot share the defs. Identical
 * gradients sharing one id is harmless: the defs are identical too.
 */
function gradientId(page: DocumentPage, background: GradientPageBackground): string {
  const color = (value: string) => safePageColor(value).replace(/[^0-9a-z]/gi, '');

  return `fremit-page-bg-${n(page.width)}x${n(page.height)}-${color(background.from)}-${color(background.to)}-${n(background.angle)}`;
}

/**
 * Page fill of the preview: solid rect, gradient rect with its own defs, or a
 * covering image. The gradient endpoints and the image surface come from the
 * same helpers the canvas and the exporter use, so the miniature matches the
 * page.
 */
function backgroundElement(page: DocumentPage): string {
  const background = page.background;
  const rect = `width="${n(page.width)}" height="${n(page.height)}"`;

  if (background.kind === 'solid') {
    return `<rect ${rect} fill="${escapeXml(safePageColor(background.color))}"/>`;
  }

  if (background.kind === 'gradient') {
    const line = gradientLine(page.width, page.height, background.angle);
    const id = gradientId(page, background);
    const from = safePageColor(background.from);
    const to = safePageColor(background.to);

    return (
      `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(line.x1)}" y1="${n(line.y1)}" x2="${n(line.x2)}" y2="${n(line.y2)}">` +
      `<stop offset="0" stop-color="${escapeXml(from)}"/>` +
      `<stop offset="1" stop-color="${escapeXml(to)}"/>` +
      `</linearGradient></defs>` +
      `<rect ${rect} fill="url(#${id})"/>`
    );
  }

  const surface = imageBackgroundSurface(page);

  if (!surface) return '';

  return `<image href="${escapeXml(surface.src)}" x="${n(surface.x)}" y="${n(surface.y)}" width="${n(surface.width)}" height="${n(surface.height)}" preserveAspectRatio="xMidYMid slice"/>`;
}

export function pageToSvg(page: DocumentPage): string {
  const objects = page.objects
    .filter((object) => object.visible)
    .map((object) => objectSvg(object))
    .join('');

  // The preview is decorative: the card's accessible name comes from the
  // button label around it, so the SVG stays out of the tree with
  // `aria-hidden` alone — a `role="img"` here would expose it again with no
  // name to give.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(page.width)} ${n(page.height)}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${backgroundElement(page)}${objects}</svg>`;
}
