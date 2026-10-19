import { describe, expect, it, vi } from 'vitest';
import { lazyPanel } from '@/components/editor/canvas/panels/lazyPanel';

describe('lazyPanel', () => {
  it('preloads the chunk once, even across repeated hover/focus calls', () => {
    const loader = vi.fn(async () => ({ default: () => null }));
    const panel = lazyPanel(loader);

    panel.preload();
    panel.preload();
    panel.preload();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('starts the download on preload, before any render', async () => {
    const module = { default: () => null };
    const loader = vi.fn(async () => module);
    const panel = lazyPanel(loader);

    panel.preload();

    await expect(loader.mock.results[0]?.value).resolves.toBe(module);
  });
});
