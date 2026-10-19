import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createDocument,
  createPage,
  parseDocument,
  serializeDocument,
} from '@/lib/document';
import { RUNEICON_ENTRIES, type RuneiconEntry } from '@/lib/runeicons/catalog';
import { RUNEICON_INSERT_FRACTION, buildRuneiconImageObject } from '@/lib/runeicons/insert';

const PAGE = { width: 1080, height: 1080 };
// See svg.test.ts: `import.meta.dirname` keeps Vite from bundling the asset.
const VENDORED = join(import.meta.dirname, '../../../public/runeicons');

function entryById(id: string): RuneiconEntry {
  const entry = RUNEICON_ENTRIES.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`missing runeicon entry: ${id}`);

  return entry;
}

const svg = readFileSync(join(VENDORED, 'normal/arrows/arrow-down-left.svg'), 'utf8');

const duotoneSvg = readFileSync(join(VENDORED, 'duotone/arrows/arrow-down-left.svg'), 'utf8');

describe('runeicon insertion', () => {
  it('freezes the colored icon as a centered image object of the page', () => {
    const object = buildRuneiconImageObject(svg, entryById('arrows-arrow-down-left'), {
      page: PAGE,
      style: 'normal',
      colors: { primary: '#ff0000', secondary: null, gradient: false },
    });

    const size = Math.round(PAGE.width * RUNEICON_INSERT_FRACTION);
    expect(object.type).toBe('image');
    expect(object.name).toBe('Arrow Down Left');
    expect(object.width).toBe(size);
    expect(object.height).toBe(size);
    expect(object.x).toBe((PAGE.width - size) / 2);
    expect(object.y).toBe((PAGE.height - size) / 2);
    expect(object.fit).toBe('contain');
    expect(object.src.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(object.src)).toContain('stroke="#ff0000"');
  });

  it('round-trips through serialize -> parse with the frozen source intact', () => {
    const object = buildRuneiconImageObject(duotoneSvg, entryById('arrows-arrow-down-left'), {
      page: PAGE,
      style: 'duotone',
      colors: { primary: '#ff0000', secondary: '#0000ff', gradient: false },
    });

    const page = createPage({ name: 'Icons', ...PAGE });
    page.objects.push(object);

    const parsed = parseDocument(serializeDocument(createDocument([page])));
    expect(parsed.pages[0].objects).toHaveLength(1);
    expect(parsed.pages[0].objects[0]).toEqual(object);
  });
});
