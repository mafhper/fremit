/**
 * Text presets of the canvas sidebar: the straight presets (subheading, body,
 * lists), the six named system-font pairings and the curved arc up/down
 * (schema v2). Pure data plus pure builders: the panel calls a builder with the
 * active page size and inserts the returned objects through the store, so a
 * preset scales with the page instead of hardcoding pixels.
 *
 * Lists are literal text (one prefix per line), not a document field: the
 * content stays editable in place and round-trips as plain text.
 *
 * The font stacks come from `@/lib/fonts` — the shared catalog of the presets,
 * the inspector and the brand kit — so a preset font always has a matching
 * entry in the font-family control.
 *
 * Written from scratch for Fremit; no code copied from any reference editor.
 */

import { DEFAULT_ARC_AMOUNT, arcTextBox } from '@/lib/arcText';
import { createTextObject, type ArcDirection, type TextArc, type TextObject } from '@/lib/document';
import { FONT_STACKS } from '@/lib/fonts';

export interface PageSize {
  width: number;
  height: number;
}

export const TEXT_PRESET_IDS = ['subheading', 'body', 'bullet-list', 'numbered-list'] as const;
export type TextPresetId = (typeof TEXT_PRESET_IDS)[number];

/** Copy of the body preset; every pairing body uses the same sample. */
export const BODY_SAMPLE = 'Body text. Click to edit.';

const MARGIN_RATIO = 0.1;
const TOP_RATIO = 0.15;

/** Page-relative box shared by the presets: margins and a line-based height. */
function presetLayout(page: PageSize, fontSize: number, lines: number) {
  return {
    x: Math.round(page.width * MARGIN_RATIO),
    y: Math.round(page.height * TOP_RATIO),
    width: Math.round(page.width * (1 - MARGIN_RATIO * 2)),
    height: Math.round(fontSize * 1.5 * lines),
  };
}

function bulletedListText(): string {
  return ['First item', 'Second item', 'Third item'].map((item) => `• ${item}`).join('\n');
}

function numberedListText(): string {
  return ['First item', 'Second item', 'Third item']
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');
}

/** Straight preset as a valid TextObject sized for the given page. */
export function createTextPreset(presetId: TextPresetId, page: PageSize): TextObject {
  const bodySize = Math.max(12, Math.round(page.width * 0.026));
  const headingSize = Math.max(18, Math.round(page.width * 0.05));

  if (presetId === 'subheading') {
    return createTextObject('Subheading', {
      name: 'Subheading',
      fontSize: headingSize,
      fontWeight: 600,
      ...presetLayout(page, headingSize, 1),
    });
  }

  if (presetId === 'body') {
    return createTextObject(BODY_SAMPLE, {
      name: 'Body',
      fontSize: bodySize,
      fontWeight: 400,
      ...presetLayout(page, bodySize, 3),
    });
  }

  if (presetId === 'bullet-list') {
    return createTextObject(bulletedListText(), {
      name: 'Bulleted list',
      fontSize: bodySize,
      fontWeight: 400,
      ...presetLayout(page, bodySize, 3),
    });
  }

  return createTextObject(numberedListText(), {
    name: 'Numbered list',
    fontSize: bodySize,
    fontWeight: 400,
    ...presetLayout(page, bodySize, 3),
  });
}

export const ARC_PRESET_DIRECTIONS = ['up', 'down'] as const;

/**
 * Curved preset (schema v2): the arc is a document field and the box is the
 * arc's own bounding box, measured from the sample at the page's type scale.
 * The object lands centered horizontally, so the curve reads as a deliberate
 * composition instead of a corner.
 */
export function createArcTextPreset(direction: ArcDirection, page: PageSize): TextObject {
  const fontSize = Math.max(18, Math.round(page.width * 0.055));
  const text = 'Curved text';
  const arc = { direction, amount: DEFAULT_ARC_AMOUNT } satisfies TextArc;
  const box = arcTextBox(
    { text, fontFamily: FONT_STACKS.inter, fontSize, fontWeight: 600 },
    arc,
  );

  return createTextObject(text, {
    name: direction === 'up' ? 'Arc up' : 'Arc down',
    x: Math.round((page.width - box.width) / 2),
    y: Math.round(page.height * 0.3),
    width: box.width,
    height: box.height,
    fontSize,
    fontWeight: 600,
    align: 'center',
    arc,
  });
}

export const FONT_PAIRING_IDS = [
  'classic',
  'modern',
  'editorial',
  'playful',
  'poster',
  'elegant',
] as const;
export type FontPairingId = (typeof FONT_PAIRING_IDS)[number];

export interface FontPairing {
  id: FontPairingId;
  /** English name used for the layer names of the inserted texts. */
  label: string;
  heading: { stack: string; weight: number };
  body: { stack: string; weight: number };
}

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'classic',
    label: 'Classic',
    heading: { stack: FONT_STACKS.georgia, weight: 700 },
    body: { stack: FONT_STACKS.georgia, weight: 400 },
  },
  {
    id: 'modern',
    label: 'Modern',
    heading: { stack: FONT_STACKS.inter, weight: 700 },
    body: { stack: FONT_STACKS.inter, weight: 400 },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    heading: { stack: FONT_STACKS.georgia, weight: 700 },
    body: { stack: FONT_STACKS.inter, weight: 400 },
  },
  {
    id: 'playful',
    label: 'Playful',
    heading: { stack: FONT_STACKS.comic, weight: 700 },
    body: { stack: FONT_STACKS.trebuchet, weight: 400 },
  },
  {
    id: 'poster',
    label: 'Poster',
    heading: { stack: FONT_STACKS.impact, weight: 900 },
    body: { stack: FONT_STACKS.inter, weight: 400 },
  },
  {
    id: 'elegant',
    label: 'Elegant',
    heading: { stack: FONT_STACKS.palatino, weight: 400 },
    body: { stack: FONT_STACKS.trebuchet, weight: 300 },
  },
];

export function findFontPairing(pairingId: FontPairingId): FontPairing {
  const pairing = FONT_PAIRINGS.find((candidate) => candidate.id === pairingId);

  if (!pairing) {
    throw new Error(`unknown font pairing: ${pairingId}`);
  }

  return pairing;
}

/**
 * Heading + body as one insertion: the pair is the point of the preset. The
 * body sits below the heading box so the two never overlap on insertion.
 */
export function createFontPairingTexts(
  pairingId: FontPairingId,
  page: PageSize,
): [TextObject, TextObject] {
  const pairing = findFontPairing(pairingId);
  const headingSize = Math.max(18, Math.round(page.width * 0.055));
  const bodySize = Math.max(12, Math.round(page.width * 0.026));
  const x = Math.round(page.width * MARGIN_RATIO);
  const width = Math.round(page.width * (1 - MARGIN_RATIO * 2));
  const headingY = Math.round(page.height * TOP_RATIO);
  const headingHeight = Math.round(headingSize * 1.5);

  const heading = createTextObject('Heading', {
    name: `${pairing.label} heading`,
    x,
    y: headingY,
    width,
    height: headingHeight,
    fontSize: headingSize,
    fontFamily: pairing.heading.stack,
    fontWeight: pairing.heading.weight,
  });

  const body = createTextObject(BODY_SAMPLE, {
    name: `${pairing.label} body`,
    x,
    y: headingY + headingHeight + Math.round(page.height * 0.04),
    width,
    height: Math.round(bodySize * 1.5 * 3),
    fontSize: bodySize,
    fontFamily: pairing.body.stack,
    fontWeight: pairing.body.weight,
  });

  return [heading, body];
}
