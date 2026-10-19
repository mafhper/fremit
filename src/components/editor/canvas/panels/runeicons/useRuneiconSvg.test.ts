import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuneiconEntry, RuneiconStyle } from '@/lib/runeicons/catalog';
import { loadRuneiconSvgByUrl } from '@/lib/runeicons/load';
import { useRuneiconSvg } from './useRuneiconSvg';

/**
 * The loader is wrapped (not replaced) so the test can count requests while
 * the real cache/URL logic still runs: the seam is "one request per URL",
 * which a recreated entry object with the same request must not repeat.
 */
vi.mock('@/lib/runeicons/load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/runeicons/load')>();

  return { ...actual, loadRuneiconSvgByUrl: vi.fn(actual.loadRuneiconSvgByUrl) };
});

const MARKUP = '<svg viewBox="0 0 24 24"><path stroke="black"/></svg>';

function entry(id: string): RuneiconEntry {
  return {
    id,
    name: id,
    category: 'arrows',
    tags: [],
    styles: ['normal', 'duotone'],
    folder: 'arrows',
    file: `${id}.svg`,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => MARKUP })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(loadRuneiconSvgByUrl).mockClear();
});

describe('useRuneiconSvg', () => {
  it('loads the artwork of the request and reports it', async () => {
    const { result } = renderHook(() => useRuneiconSvg(entry('arrows-arrow-down'), 'normal'));

    expect(result.current.markup).toBeNull();
    await waitFor(() => expect(result.current.markup).toBe(MARKUP));
    expect(result.current.failed).toBe(false);
  });

  it('does not reload when the entry object is recreated with the same request', async () => {
    const first = entry('arrows-arrow-down');
    const { result, rerender } = renderHook(
      ({ current }: { current: RuneiconEntry }) => useRuneiconSvg(current, 'normal'),
      { initialProps: { current: first } },
    );

    await waitFor(() => expect(result.current.markup).toBe(MARKUP));
    expect(loadRuneiconSvgByUrl).toHaveBeenCalledTimes(1);

    rerender({ current: { ...first } });

    expect(loadRuneiconSvgByUrl).toHaveBeenCalledTimes(1);
  });

  it('loads again when the style changes the request', async () => {
    const current = entry('arrows-arrow-down');
    const { result, rerender } = renderHook(
      ({ style }: { style: RuneiconStyle }) => useRuneiconSvg(current, style),
      { initialProps: { style: 'normal' as RuneiconStyle } },
    );

    await waitFor(() => expect(result.current.markup).toBe(MARKUP));

    rerender({ style: 'duotone' });

    expect(loadRuneiconSvgByUrl).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.markup).toBe(MARKUP));
  });

  it('turns a failed load into the failed flag', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => '' })));

    const { result } = renderHook(() => useRuneiconSvg(entry('arrows-arrow-up'), 'normal'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.markup).toBeNull();
  });
});
