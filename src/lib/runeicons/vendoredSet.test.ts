/**
 * The vendored set is the contract of the slot rewrite: the catalog counts
 * must match the files on disk, every colorable file of the four styles must
 * come out of `applyRuneiconColor` with zero paint leftovers, and the glass
 * files must come back untouched (their gradients are baked).
 *
 * This is the CI-side of the gate `scripts/vendor-runeicons.mjs` enforces at
 * vendoring time: a re-vendor that brings paint the rewrite cannot see fails
 * here instead of silently keeping the designed colors.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RUNEICON_ENTRIES, type RuneiconStyle } from '@/lib/runeicons/catalog';
import { applyRuneiconColor } from '@/lib/runeicons/svg';

const VENDORED = join(import.meta.dirname, '../../../public/runeicons');

/** Slot values per colorable style, as the vendored artwork writes them. */
const SLOTS: Partial<Record<RuneiconStyle, string[]>> = {
  normal: ['black'],
  pixelated: ['black'],
  duotone: ['#A4A5A6', '#DDDDDD'],
  fill: ['#DDDDDD', '#1C1F21'],
};

const STYLES: RuneiconStyle[] = ['normal', 'duotone', 'fill', 'pixelated', 'glass'];

function styleDir(style: RuneiconStyle): string {
  return join(VENDORED, style === 'glass' ? 'glass-icons' : style);
}

function filesIn(style: RuneiconStyle): string[] {
  const out: string[] = [];

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.svg')) out.push(full);
    }
  };

  walk(styleDir(style));
  return out;
}

function paintPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(
    `(stroke|fill)\\s*=\\s*["']${escaped}["']|(stroke|fill)\\s*:\\s*${escaped}\\s*(;|$)`,
    'i',
  );
}

describe('vendored runeicon set', () => {
  it('matches the catalog counts per style', () => {
    for (const style of STYLES) {
      const expected = RUNEICON_ENTRIES.filter((entry) => entry.styles.includes(style)).length;
      expect(filesIn(style).length, style).toBe(expected);
    }
  });

  it('rewrites every colorable file without paint leftovers', () => {
    for (const style of Object.keys(SLOTS) as RuneiconStyle[]) {
      for (const full of filesIn(style)) {
        const result = applyRuneiconColor(readFileSync(full, 'utf8'), style, {
          primary: '#ff0000',
          secondary: '#0000ff',
          gradient: false,
        });

        for (const value of SLOTS[style] ?? []) {
          expect(paintPattern(value).test(result), `${style} ${full} -> ${value}`).toBe(false);
        }
      }
    }
  });

  it('leaves every glass file exactly as designed', () => {
    for (const full of filesIn('glass')) {
      const source = readFileSync(full, 'utf8');

      expect(
        applyRuneiconColor(source, 'glass', {
          primary: '#ff0000',
          secondary: '#0000ff',
          gradient: false,
        }),
      ).toBe(source);
    }
  });
});
