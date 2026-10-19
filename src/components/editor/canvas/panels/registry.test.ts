import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PANEL_ID,
  SIDEBAR_PANELS,
  findPanel,
  togglePanel,
  type PanelId,
} from '@/components/editor/canvas/panels/registry';

/** Rail order of the shell: most used first, structure (pages/layers) last. */
const EXPECTED_ORDER: PanelId[] = [
  'templates',
  'text',
  'shapes',
  'icons',
  'images',
  'background',
  'brand',
  'animate',
  'pages',
  'layers',
];

describe('panel registry', () => {
  it('registers the ten rail panels in order', () => {
    expect(SIDEBAR_PANELS.map((panel) => panel.id)).toEqual(EXPECTED_ORDER);
  });

  it('keeps ids unique and orders ascending', () => {
    const ids = new Set(SIDEBAR_PANELS.map((panel) => panel.id));
    expect(ids.size).toBe(SIDEBAR_PANELS.length);

    const orders = SIDEBAR_PANELS.map((panel) => panel.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('splits the rail into the four drawers and the six sidebars', () => {
    const drawers = SIDEBAR_PANELS.filter((panel) => panel.placement === 'drawer').map(
      (panel) => panel.id,
    );

    expect(drawers).toEqual(['text', 'shapes', 'images', 'background']);
  });

  it('ships every rail panel ready (no placeholder left)', () => {
    const ready = SIDEBAR_PANELS.filter((panel) => panel.status === 'ready').map(
      (panel) => panel.id,
    );
    const planned = SIDEBAR_PANELS.filter((panel) => panel.status === 'planned').map(
      (panel) => panel.id,
    );

    expect(ready).toEqual([
      'templates',
      'text',
      'shapes',
      'icons',
      'images',
      'background',
      'brand',
      'animate',
      'pages',
      'layers',
    ]);
    expect(planned).toEqual([]);
  });

  it('preloads every lazy panel and leaves the inline ones alone', () => {
    // Templates, icons, brand and animate each own a chunk; the inline
    // panels must not carry a preload.
    const lazyPanels: PanelId[] = ['templates', 'icons', 'brand', 'animate'];

    for (const panel of SIDEBAR_PANELS) {
      if (lazyPanels.includes(panel.id)) {
        expect(typeof panel.preload, `${panel.id} must preload its chunk`).toBe('function');
      } else {
        expect(panel.preload, `${panel.id} is inline`).toBeUndefined();
      }
    }
  });

  it('opens layers on the first load', () => {
    expect(DEFAULT_PANEL_ID).toBe('layers');
    expect(findPanel(DEFAULT_PANEL_ID)?.status).toBe('ready');
  });

  it('toggles the dock: the same tool closes, another replaces', () => {
    expect(togglePanel(null, 'layers')).toBe('layers');
    expect(togglePanel('layers', 'pages')).toBe('pages');
    expect(togglePanel('layers', 'layers')).toBeNull();
    expect(findPanel(null)).toBeNull();
  });
});
