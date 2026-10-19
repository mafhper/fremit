import { describe, expect, it } from 'vitest';
import {
  BRAND_COLOR_LIMIT,
  BRAND_KIT_STORAGE_KEY,
  BRAND_LOGO_MAX_LENGTH,
  DEFAULT_BRAND_KIT,
  addBrandColor,
  isValidBrandLogo,
  loadBrandKit,
  parseBrandKit,
  removeBrandColor,
  saveBrandKit,
  serializeBrandKit,
  setBrandFont,
  setBrandLogo,
} from '@/lib/brandKit';
import { FONT_STACKS } from '@/lib/fonts';

describe('brand kit', () => {
  it('falls back to the defaults for unreadable or partial values', () => {
    expect(parseBrandKit(null)).toEqual(DEFAULT_BRAND_KIT);
    expect(parseBrandKit('{ not json')).toEqual(DEFAULT_BRAND_KIT);
    expect(parseBrandKit('42')).toEqual(DEFAULT_BRAND_KIT);

    // Every field falls back on its own.
    const partial = parseBrandKit(JSON.stringify({ colors: ['#abc'] }));

    expect(partial.colors).toEqual(['#abc']);
    expect(partial.headingFont).toBe(DEFAULT_BRAND_KIT.headingFont);
    expect(partial.bodyFont).toBe(DEFAULT_BRAND_KIT.bodyFont);
    expect(partial.logo).toBeNull();
  });

  it('normalizes, dedupes and caps the stored palette', () => {
    const stored = parseBrandKit(
      JSON.stringify({
        colors: ['#ABCDEF', '#abcdef', 'red', '#123', 7, ...Array(10).fill('#010203')],
        headingFont: FONT_STACKS.georgia,
        bodyFont: '',
        logo: '  data:image/png;base64,x  ',
      }),
    );

    expect(stored.colors).toEqual(['#abcdef', '#123', '#010203']);
    expect(stored.headingFont).toBe(FONT_STACKS.georgia);
    expect(stored.bodyFont).toBe(DEFAULT_BRAND_KIT.bodyFont);
    expect(stored.logo).toBe('data:image/png;base64,x');
  });

  it('adds and removes colors without writing invalid or repeated values', () => {
    const kit = { ...DEFAULT_BRAND_KIT, colors: ['#111111'] };

    expect(addBrandColor(kit, '  #ABCDEF ').colors).toEqual(['#111111', '#abcdef']);
    expect(addBrandColor(kit, '#111111')).toBe(kit);
    expect(addBrandColor(kit, 'red')).toBe(kit);

    const full = { ...kit, colors: Array(BRAND_COLOR_LIMIT).fill('#111111') };
    expect(addBrandColor(full, '#abcdef')).toBe(full);

    expect(removeBrandColor(kit, '#111111').colors).toEqual([]);
    expect(removeBrandColor(kit, '#abcdef')).toBe(kit);
  });

  it('sets fonts and the logo as plain field writes', () => {
    const kit = setBrandFont(DEFAULT_BRAND_KIT, 'heading', FONT_STACKS.impact);
    const withBody = setBrandFont(kit, 'body', FONT_STACKS.courier);

    expect(withBody.headingFont).toBe(FONT_STACKS.impact);
    expect(withBody.bodyFont).toBe(FONT_STACKS.courier);
    expect(setBrandFont(withBody, 'body', '  ')).toBe(withBody);

    expect(setBrandLogo(withBody, 'data:image/png;base64,x').logo).toBe('data:image/png;base64,x');
    expect(setBrandLogo(withBody, '  ').logo).toBeNull();
  });

  it('validates and caps the logo on write and on read', () => {
    const kit = DEFAULT_BRAND_KIT;
    const prefix = 'data:image/png;base64,';
    const atLimit = `${prefix}${'A'.repeat(BRAND_LOGO_MAX_LENGTH - prefix.length)}`;
    const overLimit = `${prefix}${'A'.repeat(BRAND_LOGO_MAX_LENGTH)}`;

    // The contract: an image data URL within the cap.
    expect(isValidBrandLogo(atLimit)).toBe(true);
    expect(isValidBrandLogo(overLimit)).toBe(false);
    expect(isValidBrandLogo('https://example.com/logo.png')).toBe(false);
    expect(isValidBrandLogo('data:text/html;base64,x')).toBe(false);

    // A refused value is not a write, so the stored kit never grows past it.
    expect(setBrandLogo(kit, 'https://example.com/logo.png')).toBe(kit);
    expect(setBrandLogo(kit, overLimit)).toBe(kit);
    expect(setBrandLogo(kit, atLimit).logo).toBe(atLimit);

    // The tolerant read drops a stored logo that does not match either.
    expect(parseBrandKit(JSON.stringify({ logo: 'not-an-image' })).logo).toBeNull();
    expect(parseBrandKit(JSON.stringify({ logo: overLimit })).logo).toBeNull();
    expect(parseBrandKit(JSON.stringify({ logo: atLimit })).logo).toBe(atLimit);

    // No path lands an invalid logo in the storage: the write gate drops it.
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    saveBrandKit({ ...kit, logo: 'not-an-image' }, storage);

    const stored = JSON.parse(store.get(BRAND_KIT_STORAGE_KEY) ?? '{}') as { logo?: unknown };
    expect(stored.logo).toBeNull();
  });

  it('round-trips through storage and survives a blocked one', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    const kit = addBrandColor(DEFAULT_BRAND_KIT, '#abcdef');
    saveBrandKit(kit, storage);

    expect(store.get(BRAND_KIT_STORAGE_KEY)).toBe(serializeBrandKit(kit));
    expect(loadBrandKit(storage)).toEqual(kit);

    // A storage that throws never breaks the panel.
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(loadBrandKit(blocked)).toEqual(DEFAULT_BRAND_KIT);
    expect(() => saveBrandKit(kit, blocked)).not.toThrow();
    expect(loadBrandKit(null)).toEqual(DEFAULT_BRAND_KIT);
  });
});
