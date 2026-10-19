import { describe, expect, it } from 'vitest';
import {
  createDocument,
  createPage,
  parseDocument,
  serializeDocument,
  type ArcDirection,
  type TextObject,
} from '@/lib/document';
import { FONT_OPTIONS } from '@/lib/fonts';
import {
  FONT_PAIRINGS,
  TEXT_PRESET_IDS,
  createArcTextPreset,
  createFontPairingTexts,
  createTextPreset,
} from '@/lib/textPresets';
import { DEFAULT_ARC_AMOUNT } from '@/lib/arcText';

const PAGE = { width: 1080, height: 1080 };

/**
 * Independent check of the contract: every preset must survive the document
 * round-trip (serialize -> parse) as an equal object, not just exist in memory.
 */
function roundTrip(objects: TextObject[]): TextObject[] {
  const page = { ...createPage(), objects };
  const parsed = parseDocument(serializeDocument(createDocument([page])));

  return parsed.pages[0].objects as TextObject[];
}

describe('text presets', () => {
  it('builds a valid, serializable object for every preset', () => {
    for (const presetId of TEXT_PRESET_IDS) {
      const object = createTextPreset(presetId, PAGE);

      expect(object.type).toBe('text');
      expect(object.text.length).toBeGreaterThan(0);
      expect(object.fontSize).toBeGreaterThan(0);
      expect(object.width).toBeGreaterThan(0);
      expect(object.height).toBeGreaterThan(0);
      expect(roundTrip([object])[0]).toEqual(object);
    }
  });

  it('writes bulleted and numbered lists as one prefix per line', () => {
    const bulleted = createTextPreset('bullet-list', PAGE);
    const bulletLines = bulleted.text.split('\n');

    expect(bulletLines).toHaveLength(3);
    expect(bulletLines.every((line) => line.startsWith('• '))).toBe(true);

    const numbered = createTextPreset('numbered-list', PAGE);

    expect(numbered.text.split('\n')).toEqual([
      '1. First item',
      '2. Second item',
      '3. Third item',
    ]);
  });

  it('builds a curved preset for both directions with a valid arc', () => {
    for (const direction of ['up', 'down'] as ArcDirection[]) {
      const object = createArcTextPreset(direction, PAGE);

      expect(object.type).toBe('text');
      expect(object.arc).toEqual({ direction, amount: DEFAULT_ARC_AMOUNT });
      expect(object.align).toBe('center');
      expect(object.fontSize).toBeGreaterThan(0);
      // The box is the arc's own bounding box: a curve is shorter than the
      // straight run it replaces.
      expect(object.width).toBeGreaterThan(0);
      expect(object.height).toBeGreaterThan(0);
      expect(object.width).toBeLessThan(PAGE.width);
      expect(roundTrip([object])[0]).toEqual(object);
    }
  });

  it('centers the curved preset and keeps it inside the page', () => {
    for (const direction of ['up', 'down'] as ArcDirection[]) {
      const object = createArcTextPreset(direction, PAGE);

      expect(object.x).toBeGreaterThanOrEqual(0);
      expect(object.x + object.width).toBeLessThanOrEqual(PAGE.width);
      expect(object.y + object.height).toBeLessThanOrEqual(PAGE.height);
    }
  });

  it('scales the type with the page instead of hardcoding pixels', () => {
    const small = createTextPreset('subheading', { width: 540, height: 540 });
    const large = createTextPreset('subheading', PAGE);

    expect(large.fontSize).toBeGreaterThan(small.fontSize);
    expect(large.width).toBeGreaterThan(small.width);
    expect(large.x).toBeGreaterThan(small.x);
  });

  it('registers the six named pairings, each with a heading and a body font', () => {
    expect(FONT_PAIRINGS.map((pairing) => pairing.id)).toEqual([
      'classic',
      'modern',
      'editorial',
      'playful',
      'poster',
      'elegant',
    ]);

    for (const pairing of FONT_PAIRINGS) {
      expect(pairing.heading.stack.length).toBeGreaterThan(0);
      expect(pairing.body.stack.length).toBeGreaterThan(0);
      expect(pairing.heading.weight).toBeGreaterThanOrEqual(pairing.body.weight);
    }
  });

  it('inserts a heading and a body per pairing, both valid and non-overlapping', () => {
    for (const pairing of FONT_PAIRINGS) {
      const [heading, body] = createFontPairingTexts(pairing.id, PAGE);

      expect(heading.fontFamily).toBe(pairing.heading.stack);
      expect(heading.fontWeight).toBe(pairing.heading.weight);
      expect(body.fontFamily).toBe(pairing.body.stack);
      expect(body.fontWeight).toBe(pairing.body.weight);
      expect(heading.fontSize).toBeGreaterThan(body.fontSize);
      expect(heading.y + heading.height).toBeLessThanOrEqual(body.y);
      expect(roundTrip([heading, body])).toEqual([heading, body]);
    }
  });

  it('keeps every pairing font in the shared option list', () => {
    const stacks = new Set(FONT_OPTIONS.map((option) => option.stack));

    for (const pairing of FONT_PAIRINGS) {
      expect(stacks.has(pairing.heading.stack)).toBe(true);
      expect(stacks.has(pairing.body.stack)).toBe(true);
    }
  });
});
