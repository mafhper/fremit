/**
 * Sticker pack of the canvas sidebar: ten own vector stickers drawn with the
 * Documento v1 object types only — rounded rectangles, ellipses and glyph
 * texts. No external asset, no binary, no third-party pack: a sticker is a
 * composition of normal objects, so it inserts, edits, exports and round-trips
 * like anything else on the page.
 *
 * Each builder scales with the active page (a sticker is a fraction of the
 * smallest side) and returns the whole composition; the panel inserts it in
 * one store write. Layer names stay English so the document reads the same in
 * any locale; the pack labels live in i18n.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { createShapeObject, createTextObject, type DocumentObject } from '@/lib/document';

export interface StickerPageSize {
  width: number;
  height: number;
}

export const STICKER_IDS = [
  'badge-new',
  'sale-tag',
  'speech-bubble',
  'star-rating',
  'check-badge',
  'arrow-right',
  'heart',
  'sparkles',
  'quote-mark',
  'dot-grid',
] as const;

export type StickerId = (typeof STICKER_IDS)[number];

export interface StickerDefinition {
  id: StickerId;
  /** Builds the sticker for the given page size (fresh ids per call). */
  build: (page: StickerPageSize) => DocumentObject[];
}

const SERIF = 'Georgia, "Times New Roman", serif';

/** Top-left of a box centered on the page, rounded to whole pixels. */
function centered(page: StickerPageSize, width: number, height: number): { x: number; y: number } {
  return {
    x: Math.round((page.width - width) / 2),
    y: Math.round((page.height - height) / 2),
  };
}

function smallestSide(page: StickerPageSize): number {
  return Math.min(page.width, page.height);
}

function buildBadgeNew(page: StickerPageSize): DocumentObject[] {
  const size = Math.round(smallestSide(page) * 0.24);
  const { x, y } = centered(page, size, size);

  return [
    createShapeObject('ellipse', {
      name: 'Badge circle',
      x,
      y,
      width: size,
      height: size,
      fill: '#1f6feb',
    }),
    createTextObject('NEW', {
      name: 'NEW badge',
      x,
      y: y + Math.round(size * 0.3),
      width: size,
      height: Math.round(size * 0.4),
      fontSize: Math.round(size * 0.28),
      fontWeight: 800,
      fill: '#ffffff',
      align: 'center',
    }),
  ];
}

function buildSaleTag(page: StickerPageSize): DocumentObject[] {
  const width = Math.round(smallestSide(page) * 0.44);
  const height = Math.round(smallestSide(page) * 0.22);
  const { x, y } = centered(page, width, height);

  return [
    createShapeObject('rect', {
      name: 'Sale tag',
      x,
      y,
      width,
      height,
      cornerRadius: Math.round(height / 2),
      fill: '#be123c',
      rotation: -8,
    }),
    createTextObject('50% OFF', {
      name: 'Sale label',
      x,
      y: y + Math.round(height * 0.28),
      width,
      height: Math.round(height * 0.44),
      fontSize: Math.round(height * 0.32),
      fontWeight: 800,
      fill: '#ffffff',
      align: 'center',
      rotation: -8,
    }),
  ];
}

function buildSpeechBubble(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const width = Math.round(side * 0.46);
  const height = Math.round(side * 0.26);
  const tail = Math.round(side * 0.1);
  const { x, y } = centered(page, width, height);

  return [
    createShapeObject('rect', {
      name: 'Bubble',
      x,
      y,
      width,
      height,
      cornerRadius: Math.round(side * 0.06),
      fill: '#ffffff',
      stroke: '#111827',
      strokeWidth: 4,
    }),
    createShapeObject('ellipse', {
      name: 'Bubble tail',
      x: x + Math.round(side * 0.05),
      y: y + height - Math.round(tail * 0.35),
      width: tail,
      height: tail,
      fill: '#ffffff',
    }),
    createTextObject('Hello!', {
      name: 'Bubble text',
      x,
      y: y + Math.round(height * 0.3),
      width,
      height: Math.round(height * 0.4),
      fontSize: Math.round(side * 0.07),
      fontWeight: 600,
      fill: '#111827',
      align: 'center',
    }),
  ];
}

function buildStarRating(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const width = Math.round(side * 0.6);
  const height = Math.round(side * 0.16);
  const { x, y } = centered(page, width, height);

  return [
    createTextObject('\u2605\u2605\u2605\u2605\u2605', {
      name: 'Star rating',
      x,
      y,
      width,
      height,
      fontSize: Math.round(side * 0.1),
      fontWeight: 400,
      fill: '#f59e0b',
      align: 'center',
    }),
  ];
}

function buildCheckBadge(page: StickerPageSize): DocumentObject[] {
  const size = Math.round(smallestSide(page) * 0.22);
  const { x, y } = centered(page, size, size);

  return [
    createShapeObject('ellipse', {
      name: 'Check circle',
      x,
      y,
      width: size,
      height: size,
      fill: '#16a34a',
    }),
    createTextObject('\u2713', {
      name: 'Check mark',
      x,
      y: y + Math.round(size * 0.26),
      width: size,
      height: Math.round(size * 0.5),
      fontSize: Math.round(size * 0.4),
      fontWeight: 800,
      fill: '#ffffff',
      align: 'center',
    }),
  ];
}

function buildArrowRight(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const box = Math.round(side * 0.4);
  const { x, y } = centered(page, box, box);

  return [
    createTextObject('\u2192', {
      name: 'Arrow',
      x,
      y,
      width: box,
      height: box,
      fontSize: Math.round(side * 0.28),
      fontWeight: 800,
      fill: '#1f6feb',
      align: 'center',
    }),
  ];
}

function buildHeart(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const box = Math.round(side * 0.36);
  const { x, y } = centered(page, box, box);

  return [
    createTextObject('\u2665', {
      name: 'Heart',
      x,
      y,
      width: box,
      height: box,
      fontSize: Math.round(side * 0.3),
      fontWeight: 400,
      fill: '#e11d48',
      align: 'center',
    }),
  ];
}

function buildSparkles(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const big = Math.round(side * 0.26);
  const small = Math.round(side * 0.13);
  const bigAt = centered(page, big, big);
  const smallAt = centered(page, small, small);

  return [
    createTextObject('\u2726', {
      name: 'Sparkle large',
      x: bigAt.x - Math.round(side * 0.07),
      y: bigAt.y - Math.round(side * 0.07),
      width: big,
      height: big,
      fontSize: Math.round(side * 0.24),
      fontWeight: 400,
      fill: '#a855f7',
      align: 'center',
    }),
    createTextObject('\u2726', {
      name: 'Sparkle small',
      x: smallAt.x + Math.round(side * 0.13),
      y: smallAt.y + Math.round(side * 0.11),
      width: small,
      height: small,
      fontSize: Math.round(side * 0.12),
      fontWeight: 400,
      fill: '#c084fc',
      align: 'center',
    }),
  ];
}

function buildQuoteMark(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const width = Math.round(side * 0.5);
  const height = Math.round(side * 0.42);
  const { x, y } = centered(page, width, height);

  return [
    createTextObject('\u201c', {
      name: 'Quote mark',
      x,
      y,
      width,
      height,
      fontSize: Math.round(side * 0.34),
      fontWeight: 400,
      fontFamily: SERIF,
      fill: '#f59e0b',
      align: 'center',
    }),
  ];
}

function buildDotGrid(page: StickerPageSize): DocumentObject[] {
  const side = smallestSide(page);
  const dot = Math.round(side * 0.05);
  const gap = Math.round(side * 0.1);
  const grid = gap * 2 + dot;
  const { x, y } = centered(page, grid, grid);
  const objects: DocumentObject[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      objects.push(
        createShapeObject('ellipse', {
          name: `Dot ${row * 3 + column + 1}`,
          x: x + column * gap,
          y: y + row * gap,
          width: dot,
          height: dot,
          fill: '#1f6feb',
        }),
      );
    }
  }

  return objects;
}

/** The pack, in reading order. */
export const STICKER_PACK: readonly StickerDefinition[] = [
  { id: 'badge-new', build: buildBadgeNew },
  { id: 'sale-tag', build: buildSaleTag },
  { id: 'speech-bubble', build: buildSpeechBubble },
  { id: 'star-rating', build: buildStarRating },
  { id: 'check-badge', build: buildCheckBadge },
  { id: 'arrow-right', build: buildArrowRight },
  { id: 'heart', build: buildHeart },
  { id: 'sparkles', build: buildSparkles },
  { id: 'quote-mark', build: buildQuoteMark },
  { id: 'dot-grid', build: buildDotGrid },
];

export function findSticker(stickerId: StickerId): StickerDefinition {
  const sticker = STICKER_PACK.find((candidate) => candidate.id === stickerId);

  if (!sticker) {
    throw new Error(`unknown sticker: ${stickerId}`);
  }

  return sticker;
}
