import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { loadRuneiconSvg } from '@/lib/runeicons/load';
import { useStore } from '@/store/useStore';
import { IconWorkspace } from './IconWorkspace';

/**
 * Only the insert path is wrapped: the cards keep the real by-URL loader (with
 * a stubbed fetch), so the test can force the insert to fail without touching
 * the previews.
 */
vi.mock('@/lib/runeicons/load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/runeicons/load')>();

  return { ...actual, loadRuneiconSvg: vi.fn(actual.loadRuneiconSvg) };
});

const MARKUP = '<svg viewBox="0 0 24 24"><path stroke="black"/></svg>';
const INITIAL_STATE = useStore.getState();

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => MARKUP })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useStore.setState(INITIAL_STATE);
  vi.mocked(loadRuneiconSvg).mockClear();
});

function renderWorkspace() {
  render(createElement(I18nProvider, null, createElement(IconWorkspace)));
}

async function selectArrowDownLeft() {
  fireEvent.change(screen.getByTestId('icon-search'), { target: { value: 'arrow down left' } });
  fireEvent.click(await screen.findByTestId('icon-card-arrows-arrow-down-left'));
  expect(screen.getByTestId('icon-properties')).toBeInTheDocument();
  // The inspector's preview arrives from the shared cache on a microtask; the
  // insert button is disabled until then (and React ignores clicks on it).
  await waitFor(() => expect(screen.getByTestId('icon-insert')).toBeEnabled());
}

describe('icons workspace selection and insert', () => {
  it('clears the selection when the selected icon leaves the results', async () => {
    renderWorkspace();
    await selectArrowDownLeft();

    fireEvent.change(screen.getByTestId('icon-search'), { target: { value: 'zzzz' } });
    expect(screen.queryByTestId('icon-properties')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('icon-search'), { target: { value: 'arrow down left' } });
    expect(screen.queryByTestId('icon-properties')).not.toBeInTheDocument();
  });

  it('keeps the selection across a style change while the icon still ships it', async () => {
    renderWorkspace();
    await selectArrowDownLeft();

    fireEvent.change(screen.getByTestId('icon-style'), { target: { value: 'duotone' } });
    expect(screen.getByTestId('icon-properties')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('icon-style'), { target: { value: 'glass' } });
    expect(screen.queryByTestId('icon-properties')).not.toBeInTheDocument();
  });

  it('clears the insert error when the filter or the selection changes', async () => {
    renderWorkspace();
    await selectArrowDownLeft();

    vi.mocked(loadRuneiconSvg).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByTestId('icon-insert'));
    expect(await screen.findByTestId('icon-error')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('icon-search'), { target: { value: 'arrow down left ' } });
    expect(screen.queryByTestId('icon-error')).not.toBeInTheDocument();

    vi.mocked(loadRuneiconSvg).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByTestId('icon-insert'));
    expect(await screen.findByTestId('icon-error')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('icon-card-arrows-arrow-down-left'));
    expect(screen.queryByTestId('icon-error')).not.toBeInTheDocument();
  });

  it('disables insert when the active page is gone', async () => {
    renderWorkspace();
    await selectArrowDownLeft();

    expect(screen.getByTestId('icon-insert')).toBeEnabled();

    act(() => {
      useStore.setState({ document: { ...INITIAL_STATE.document, pages: [] } });
    });

    expect(screen.getByTestId('icon-insert')).toBeDisabled();
  });
});
