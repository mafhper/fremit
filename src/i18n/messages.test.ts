import { describe, expect, it } from 'vitest';
import { messages, type Locale } from '@/i18n/messages';

function keysDeep(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [prefix];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...keysDeep(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function arraysDeep(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      keys.push(path);
    } else if (v && typeof v === 'object') {
      keys.push(...arraysDeep(v, path));
    }
  }
  return keys;
}

const locales = Object.keys(messages) as Locale[];

describe('i18n key coverage', () => {
  for (const locale of locales) {
    it(`${locale} has all leaf keys`, () => {
      const enKeys = new Set(keysDeep(messages['en-US']));
      const localeKeys = new Set(keysDeep(messages[locale]));
      const missing = [...enKeys].filter((k) => !localeKeys.has(k));
      expect(missing, `Missing keys in ${locale}`).toEqual([]);
    });
  }

  it('all locales have the same array paths', () => {
    const enArrays = new Set(arraysDeep(messages['en-US']));
    for (const locale of locales) {
      const localeArrays = new Set(arraysDeep(messages[locale]));
      const missing = [...enArrays].filter((a) => !localeArrays.has(a));
      const extra = [...localeArrays].filter((a) => !enArrays.has(a));
      expect(missing, `Missing array paths in ${locale}`).toEqual([]);
      expect(extra, `Extra array paths in ${locale}`).toEqual([]);
    }
  });

  it('all array items have the same keys across locales', () => {
    const enKeys = keysDeep(messages['en-US']);
    const arrayPaths = enKeys.filter((k) => /\d/.test(k));

    for (const locale of locales) {
      const localeKeysList = keysDeep(messages[locale]);
      for (const path of arrayPaths) {
        expect(localeKeysList, `${locale} missing ${path}`).toContain(path);
      }
    }
  });
});
