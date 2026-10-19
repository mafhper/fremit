import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUNEICON_ENTRIES, type RuneiconEntry } from '@/lib/runeicons/catalog';
import {
  isSafeRuneiconSvg,
  loadRuneiconSvg,
  loadRuneiconSvgByUrl,
  runeiconAssetUrl,
} from '@/lib/runeicons/load';

const MARKUP = '<svg width="24" height="24" viewBox="0 0 24 24"><path stroke="black"/></svg>';

interface FetchResponseStub {
  ok: boolean;
  status?: number;
  text: () => Promise<string>;
}

function entryById(id: string): RuneiconEntry {
  const entry = RUNEICON_ENTRIES.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`missing runeicon entry: ${id}`);

  return entry;
}

function stubFetch(implementation: (url: string) => Promise<FetchResponseStub>) {
  const mock = vi.fn(implementation);
  vi.stubGlobal('fetch', mock);

  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runeicon loader', () => {
  it('builds the URL under the app base', () => {
    const normal = runeiconAssetUrl(entryById('arrows-arrow-down-left'), 'normal');
    expect(normal.startsWith('/')).toBe(true);
    expect(normal.endsWith('/runeicons/normal/arrows/arrow-down-left.svg')).toBe(true);

    const glass = runeiconAssetUrl(entryById('glass-archive'), 'glass');
    expect(glass.endsWith('/runeicons/glass-icons/Archive.svg')).toBe(true);
  });

  it('fetches once per file and serves the cached markup afterwards', async () => {
    const mock = stubFetch(async () => ({ ok: true, text: async () => MARKUP }));
    const entry = entryById('arrows-chevron-up');

    const first = await loadRuneiconSvg(entry, 'normal');
    const second = await loadRuneiconSvg(entry, 'normal');

    expect(first).toBe(MARKUP);
    expect(second).toBe(MARKUP);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(String(mock.mock.calls[0][0]).endsWith('/runeicons/normal/arrows/chevron-up.svg')).toBe(
      true,
    );
  });

  it('loads by URL and shares the cache with the entry-based loader', async () => {
    const mock = stubFetch(async () => ({ ok: true, text: async () => MARKUP }));
    const entry = entryById('arrows-arrow-down');

    const byUrl = await loadRuneiconSvgByUrl(runeiconAssetUrl(entry, 'normal'));
    const byEntry = await loadRuneiconSvg(entry, 'normal');

    expect(byUrl).toBe(MARKUP);
    expect(byEntry).toBe(MARKUP);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing file', async () => {
    stubFetch(async () => ({ ok: false, status: 404, text: async () => '' }));

    await expect(loadRuneiconSvg(entryById('arrows-chevron-down'), 'normal')).rejects.toThrow(
      '404',
    );
  });

  it('does not cache a failed load, so a retry can succeed', async () => {
    const mock = stubFetch(async () => ({ ok: false, status: 500, text: async () => '' }));
    const entry = entryById('arrows-chevron-left');

    await expect(loadRuneiconSvg(entry, 'normal')).rejects.toThrow();
    mock.mockImplementation(async () => ({ ok: true, text: async () => MARKUP }));

    await expect(loadRuneiconSvg(entry, 'normal')).resolves.toBe(MARKUP);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('rejects markup that is not a plain svg document', async () => {
    stubFetch(async () => ({
      ok: true,
      text: async () => '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    }));

    await expect(loadRuneiconSvg(entryById('arrows-chevron-right'), 'normal')).rejects.toThrow(
      'rejected',
    );
  });
});

describe('runeicon markup guard', () => {
  it('accepts a vendored document and rejects executable content', () => {
    expect(isSafeRuneiconSvg(MARKUP)).toBe(true);
    expect(isSafeRuneiconSvg('<div>not an svg</div>')).toBe(false);
    expect(isSafeRuneiconSvg('<svg><script/></svg>')).toBe(false);
    expect(isSafeRuneiconSvg('<svg onload="alert(1)"></svg>')).toBe(false);
    expect(isSafeRuneiconSvg('<svg><a href="javascript:alert(1)"></a></svg>')).toBe(false);
    expect(isSafeRuneiconSvg('<svg><path stroke="black"/></svg> trailing')).toBe(false);
  });
});
