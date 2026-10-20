/**
 * saveBlob.test.ts
 * Cobre o download por link temporário e a liberação da URL do Blob.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from '@/lib/saveBlob';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveBlob', () => {
  it('cria um link com o nome do arquivo, clica nele e remove do DOM', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:fremit');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const blob = new Blob(['x'], { type: 'image/png' });
    saveBlob(blob, 'fremit-hero.png');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('fremit-hero.png');
    expect(link.getAttribute('href')).toBe('blob:fremit');
    expect(document.body.contains(link)).toBe(false);
    vi.unstubAllGlobals();
  });

  it('libera a URL do Blob depois de um intervalo', () => {
    vi.useFakeTimers();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    saveBlob(new Blob(['x']), 'a.png');
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
    vi.unstubAllGlobals();
  });
});
