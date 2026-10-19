import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { StickersPanel } from './StickersPanel';

const MARKUP = '<svg viewBox="0 0 24 24"><path stroke="black"/></svg>';

beforeEach(() => {
  // The icons workspace mounts previews on demand; jsdom has no server.
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => MARKUP })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  render(createElement(I18nProvider, null, createElement(StickersPanel)));
}

/** Every tab must point at a tabpanel that actually exists in the DOM. */
function expectTabsResolveToPanel() {
  for (const workspace of ['icons', 'stickers']) {
    const controls = screen.getByTestId(`icons-tab-${workspace}`).getAttribute('aria-controls');
    expect(controls).toBeTruthy();

    const panel = document.getElementById(controls ?? '');
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'tabpanel');
  }
}

describe('content workspace switch', () => {
  it('opens on the icons workspace, with stickers as the second tab', () => {
    renderPanel();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('data-testid'))).toEqual([
      'icons-tab-icons',
      'icons-tab-stickers',
    ]);

    expect(screen.getByTestId('icons-tab-icons')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('icons-tab-stickers')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('icon-search')).toBeInTheDocument();
  });

  it('points every tab at the single tabpanel that exists, in both states', () => {
    renderPanel();
    expectTabsResolveToPanel();

    fireEvent.click(screen.getByTestId('icons-tab-stickers'));
    expectTabsResolveToPanel();
  });

  it('keeps the panel and re-labels it when the workspace flips', () => {
    renderPanel();

    const panel = document.getElementById('icons-tabpanel');
    expect(panel).not.toBeNull();

    fireEvent.click(screen.getByTestId('icons-tab-stickers'));

    expect(document.getElementById('icons-tabpanel')).toBe(panel);
    expect(panel).toHaveAttribute('aria-labelledby', 'icons-tab-stickers');
    expect(screen.getByTestId('sticker-card-star-rating')).toBeInTheDocument();
  });

  it('flips with the arrow keys and moves focus to the active tab', () => {
    renderPanel();

    fireEvent.keyDown(screen.getByTestId('icons-workspace-switch'), { key: 'ArrowRight' });

    expect(screen.getByTestId('icons-tab-stickers')).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(screen.getByTestId('icons-tab-stickers'));
  });
});
