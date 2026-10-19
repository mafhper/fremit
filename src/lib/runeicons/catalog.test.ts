import { describe, expect, it } from 'vitest';
import { messages, type Locale } from '@/i18n/messages';
import {
  RUNEICON_CATEGORY_IDS,
  RUNEICON_ENTRIES,
  RUNEICON_STYLE_IDS,
  filterRuneicons,
  runeiconAssetPath,
  type RuneiconEntry,
} from '@/lib/runeicons/catalog';

function entryById(id: string): RuneiconEntry {
  const entry = RUNEICON_ENTRIES.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`missing runeicon entry: ${id}`);

  return entry;
}

function ids(query: string, style: RuneiconEntry['styles'][number] = 'normal'): string[] {
  return filterRuneicons(RUNEICON_ENTRIES, { query, category: 'all', style }).map(
    (entry) => entry.id,
  );
}

describe('runeicon catalog', () => {
  it('ships every vendored icon with a unique id and at least one style', () => {
    expect(RUNEICON_ENTRIES).toHaveLength(359);
    expect(new Set(RUNEICON_ENTRIES.map((entry) => entry.id)).size).toBe(359);

    for (const entry of RUNEICON_ENTRIES) {
      expect(entry.styles.length).toBeGreaterThan(0);
      expect(entry.name).not.toBe('');
      expect(entry.folder).not.toBe('');
      expect(entry.file.endsWith('.svg')).toBe(true);
      for (const style of entry.styles) expect(RUNEICON_STYLE_IDS).toContain(style);
    }
  });

  it('counts each style like the vendored file set', () => {
    const count = (style: (typeof RUNEICON_STYLE_IDS)[number]) =>
      RUNEICON_ENTRIES.filter((entry) => entry.styles.includes(style)).length;

    expect(count('normal')).toBe(221);
    expect(count('duotone')).toBe(218);
    expect(count('fill')).toBe(129);
    expect(count('pixelated')).toBe(215);
    expect(count('glass')).toBe(136);
  });

  it('searches by name, id and tag, ignoring extra whitespace and case', () => {
    expect(ids('arrow down left')).toContain('arrows-arrow-down-left');
    expect(ids('  ARROW   DOWN   LEFT ')).toContain('arrows-arrow-down-left');
    expect(ids('chevron-up')).toContain('arrows-chevron-up');
    expect(ids('clipboard')).toContain('documents-clipboard');
    // Tag-only hit: the name is "Compass", the category tag is "dev".
    expect(ids('dev')).toContain('code-compass');
    expect(ids('zzzz-no-such-icon')).toEqual([]);
  });

  it('filters by category', () => {
    const results = filterRuneicons(RUNEICON_ENTRIES, {
      query: '',
      category: 'weather',
      style: 'normal',
    });

    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) expect(entry.category).toBe('weather');
    expect(results.map((entry) => entry.id)).toContain('nature-sun');
  });

  it('treats the style filter as availability', () => {
    // The two battery icons ship only as duotone and fill.
    expect(ids('battery medium 2', 'normal')).toEqual([]);
    expect(ids('battery medium 2', 'duotone')).toContain('gadgets-battery-medium-2');

    // Glass is its own set: it has no normal files.
    expect(ids('archive', 'glass')).toContain('glass-archive');
    expect(ids('archive', 'normal')).not.toContain('glass-archive');
  });

  it('builds the asset path per style, glass included', () => {
    expect(runeiconAssetPath(entryById('arrows-arrow-down-left'), 'duotone')).toBe(
      'runeicons/duotone/arrows/arrow-down-left.svg',
    );
    expect(runeiconAssetPath(entryById('glass-archive'), 'glass')).toBe(
      'runeicons/glass-icons/Archive.svg',
    );
  });

  it('has a localized label for every category and style', () => {
    const locales = Object.keys(messages) as Locale[];

    for (const locale of locales) {
      const icons = messages[locale].icons;
      for (const category of RUNEICON_CATEGORY_IDS) {
        expect(icons.categories[category], `${locale} ${category}`).toBeTruthy();
      }
      for (const style of RUNEICON_STYLE_IDS) {
        expect(icons.styles[style], `${locale} ${style}`).toBeTruthy();
      }
    }
  });
});
