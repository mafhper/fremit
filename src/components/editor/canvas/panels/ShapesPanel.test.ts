import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { SHAPE_KINDS } from '@/lib/document';
import { useStore } from '@/store/useStore';
import { ShapesPanel } from './ShapesPanel';

const initialDocument = useStore.getState().document;

afterEach(() => {
  cleanup();
  useStore.setState({ document: initialDocument, selectedObjectId: null });
});

function renderPanel() {
  render(createElement(I18nProvider, null, createElement(ShapesPanel)));
}

describe('shapes drawer', () => {
  it('offers one card per shape kind, previewed from the preset itself', () => {
    renderPanel();

    for (const kind of SHAPE_KINDS) {
      const card = screen.getByTestId(`shape-preset-${kind}`);
      const preview = card.querySelector('svg');

      expect(card, kind).toBeInTheDocument();
      expect(preview, `${kind} preview`).not.toBeNull();
      expect(preview?.innerHTML, `${kind} preview`).not.toContain('NaN');
    }
  });

  it('inserts the clicked kind on the active page and selects it', () => {
    renderPanel();

    const before = useStore.getState().document.pages[0].objects.length;

    fireEvent.click(screen.getByTestId('shape-preset-star'));

    const state = useStore.getState();
    const objects = state.document.pages[0].objects;
    const inserted = objects[objects.length - 1];

    expect(objects).toHaveLength(before + 1);
    expect(inserted.type === 'shape' && inserted.shape).toBe('star');
    expect(inserted.type === 'shape' && inserted.sides).toBe(5);
    expect(state.selectedObjectId).toBe(inserted.id);
  });

  it('previews the parameterised kinds with the shared geometry', () => {
    renderPanel();

    // The star card draws a ten-point polygon and the polygon card a
    // six-vertex one: the shared geometry, not a hand-drawn icon.
    const star = screen.getByTestId('shape-preset-star').querySelector('polygon');
    const polygon = screen.getByTestId('shape-preset-polygon').querySelector('polygon');

    expect((star?.getAttribute('points') ?? '').split(' ')).toHaveLength(10);
    expect((polygon?.getAttribute('points') ?? '').split(' ')).toHaveLength(6);
  });
});
