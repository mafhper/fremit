import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/provider';
import { createStarterDocument } from '@/lib/starterDocument';
import { TEMPLATE_SECTIONS } from '@/lib/templates';
import { useStore } from '@/store/useStore';
import { TemplatesPanel } from './TemplatesPanel';

/** The family the gallery opens on: the ten own starters. */
const OPEN_SECTION = TEMPLATE_SECTIONS[0];

beforeEach(() => {
  const starter = createStarterDocument();

  useStore.setState({
    document: starter,
    activePageId: starter.pages[0].id,
    selectedObjectId: null,
    githubRepo: null,
  });
});

afterEach(cleanup);

function renderPanel() {
  render(createElement(I18nProvider, null, createElement(TemplatesPanel)));
}

describe('template gallery sections', () => {
  it('renders one collapsible section per family, the first open by default', () => {
    renderPanel();

    expect(screen.getAllByTestId(/^template-section-toggle-/)).toHaveLength(TEMPLATE_SECTIONS.length);

    for (const section of TEMPLATE_SECTIONS) {
      const toggle = screen.getByTestId(`template-section-toggle-${section.id}`);

      // Every header carries the chevron of the accordion.
      expect(toggle.querySelector('svg'), section.id).not.toBeNull();
    }

    expect(screen.getByTestId(`template-section-toggle-${OPEN_SECTION.id}`)).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    for (const section of TEMPLATE_SECTIONS.slice(1)) {
      expect(screen.getByTestId(`template-section-toggle-${section.id}`)).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByTestId(`template-card-${section.templates[0].id}`)).not.toBeInTheDocument();
    }
  });

  it('shows every card of the open family and none of the collapsed ones', () => {
    renderPanel();

    for (const template of OPEN_SECTION.templates) {
      expect(screen.getByTestId(`template-card-${template.id}`)).toBeInTheDocument();
    }

    expect(screen.queryByTestId('template-card-readme-hero-369')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-card-github-project')).not.toBeInTheDocument();
  });

  it('expands a family on click, collapsing the one that was open', () => {
    renderPanel();

    const toggle = screen.getByTestId('template-section-toggle-readme-hero');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('template-card-readme-hero-369')).toBeInTheDocument();
    // One family open at a time: the default family closes.
    expect(screen.getByTestId(`template-section-toggle-${OPEN_SECTION.id}`)).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByTestId('template-card-social-post')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('template-card-readme-hero-369')).not.toBeInTheDocument();
  });

  it('toggles with the keyboard through the native button', async () => {
    const user = userEvent.setup();

    renderPanel();

    const toggle = screen.getByTestId('template-section-toggle-readme-hero');

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('template-card-readme-hero-369')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('template-card-readme-hero-369')).not.toBeInTheDocument();
  });

  it('wires every open header to its labelled region', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('template-section-toggle-animated'));

    const toggle = screen.getByTestId('template-section-toggle-animated');
    const contentId = toggle.getAttribute('aria-controls');

    expect(toggle.id).toBeTruthy();
    expect(contentId).toBeTruthy();

    const region = document.getElementById(contentId ?? '');

    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('aria-labelledby', toggle.id);
  });

  it('applies a card of an expanded family as a new active page', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('template-section-toggle-animated'));
    fireEvent.click(screen.getByTestId('template-card-readme-hero-anim-760'));

    const state = useStore.getState();

    expect(state.document.pages).toHaveLength(2);
    expect(state.document.pages[1].name).toBe('README hero anim 760');
    expect(state.activePageId).toBe(state.document.pages[1].id);
  });

  it('keeps the GitHub fill controls in their own collapsed family', () => {
    renderPanel();

    expect(screen.queryByTestId('template-github-repo')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('template-section-toggle-github'));

    expect(screen.getByTestId('template-github-repo')).toBeInTheDocument();
    expect(screen.getByTestId('template-card-github-project')).toBeInTheDocument();
  });
});

/**
 * The real `GET /repos/mafhper/aurawall` payload (fetched 2026-10-18): the
 * non-zero star count catches a mapping that swaps the real value for the
 * placeholder.
 */
const AURAWALL_PAYLOAD = {
  full_name: 'mafhper/aurawall',
  description: 'Procedural Vector Wallpaper Generator',
  language: 'TypeScript',
  stargazers_count: 2,
  forks_count: 0,
};

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

/** Opens the GitHub family and fills the repo input, waiting for the status. */
async function fillRepo(repo: string) {
  fireEvent.click(screen.getByTestId('template-section-toggle-github'));

  const input = screen.getByTestId('template-github-repo');
  fireEvent.change(input, { target: { value: repo } });
  fireEvent.click(screen.getByTestId('template-github-fill'));

  return input;
}

describe('github repo fill', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reflects the loaded repo in the card and applies it to the page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(AURAWALL_PAYLOAD)));

    renderPanel();
    await fillRepo('mafhper/aurawall');

    await waitFor(() => {
      expect(screen.getByTestId('template-github-status')).toHaveTextContent(
        /loaded|carregado|cargado/i,
      );
    });

    // The card updates with the loaded data — thumbnail and label alike.
    const card = screen.getByTestId('template-card-github-project');

    expect(card.textContent).toContain('mafhper/aurawall');
    expect(card.textContent).toContain('Procedural Vector Wallpaper Generator');
    expect(card.textContent).toContain('TypeScript');
    expect(card.textContent).toContain('\u2605 2 \u00b7 0 forks');

    // Applying the card carries the loaded data into the new page — the
    // persistent state, not the seed's placeholders.
    fireEvent.click(card);

    const pages = useStore.getState().document.pages;
    const applied = pages[pages.length - 1];
    const texts = applied.objects
      .filter((object) => object.type === 'text')
      .map((object) => object.text);

    expect(texts).toContain('mafhper/aurawall');
    expect(texts).toContain('Procedural Vector Wallpaper Generator');
    expect(texts).toContain('\u2605 2 \u00b7 0 forks');
  });

  it('returns the card to the placeholders when the repo input changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(AURAWALL_PAYLOAD)));

    renderPanel();
    const input = await fillRepo('mafhper/aurawall');

    await waitFor(() => {
      expect(screen.getByTestId('template-github-status')).toHaveTextContent(
        /loaded|carregado|cargado/i,
      );
    });

    fireEvent.change(input, { target: { value: '' } });

    const card = screen.getByTestId('template-card-github-project');

    expect(card.textContent).toContain('owner/repo');
    expect(card.textContent).toContain('\u2605 128 \u00b7 12 forks');
  });

  it('keeps the placeholders and the fallback status when the load fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    renderPanel();
    await fillRepo('mafhper/aurawall');

    await waitFor(() => {
      expect(screen.getByTestId('template-github-status')).toHaveTextContent(
        /unreachable|inacessível|no disponible/i,
      );
    });

    const card = screen.getByTestId('template-card-github-project');

    expect(card.textContent).toContain('owner/repo');

    // The card still applies the placeholder seed — the gallery never depends
    // on the network.
    fireEvent.click(card);

    const pages = useStore.getState().document.pages;
    const applied = pages[pages.length - 1];
    const texts = applied.objects
      .filter((object) => object.type === 'text')
      .map((object) => object.text);

    expect(texts).toContain('owner/repo');
  });
});
