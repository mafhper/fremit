/**
 * HomePage.test.tsx
 * Cobre a home nova: título, link para o editor, formato da prancheta, clima + tema,
 * prévia local de imagem (abrir no editor, limpar) e falha de exportação.
 * O backdrop WebGL é substituído por um stub (o jsdom não tem WebGL nem matchMedia).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { I18nProvider } from '@/i18n/provider';
import { resolveFileSource, resolveSourceFromUrl } from '@/lib/sourceResolver';
import { useStore } from '@/store/useStore';
import type { ResolvedSource } from '@/types/app';
import { HomePage } from './HomePage';

vi.mock('@/components/hero/LiquidMeshBackdrop', () => ({
  LiquidMeshBackdrop: ({ mood }: { mood?: string }) => <div data-testid="backdrop" data-mood={mood ?? ''} />,
}));

vi.mock('@/lib/sourceResolver', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sourceResolver')>()),
  resolveSourceFromUrl: vi.fn(),
  resolveFileSource: vi.fn(),
}));

const resolved: ResolvedSource = {
  mode: 'image-url',
  strategy: 'direct-image',
  sourceUrl: 'https://example.com/a.png',
  resolvedImageUrl: 'data:image/png;base64,AAA',
  title: 'a.png',
  requestedViewportWidth: null,
  requestedViewportHeight: null,
  requestedCaptureDelayMs: null,
  requestedCaptureSelector: null,
  status: 'ready',
  errorCode: null,
  errorMessage: null,
};

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={<div data-testid="editor-page" />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

const png = (name = 'tela.png') => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

async function dropImage(file = png()) {
  const region = screen.getByRole('region');
  await act(async () => {
    fireEvent.drop(region, { dataTransfer: { files: [file], types: ['Files'] } });
  });
  return file;
}

beforeEach(() => {
  window.localStorage.setItem('fremit.locale', 'pt-BR');
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState((state) => ({ appShell: { ...state.appShell, themePreference: 'light' } }));
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('mostra o título, o subtítulo e o campo de link com nome acessível', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Cole. Solte. Crie.' })).toBeInTheDocument();
    expect(screen.getByTestId('home-subtitle')).toBeVisible();
    expect(screen.getByTestId('home-source')).toBeInTheDocument();
    expect(screen.getByLabelText('Insira um link')).toBeInTheDocument();
  });

  it('envia o link pelo fluxo de fonte e navega para o editor', async () => {
    vi.mocked(resolveSourceFromUrl).mockResolvedValue(resolved);
    renderHome();

    fireEvent.change(screen.getByLabelText('Insira um link'), { target: { value: 'https://example.com/a.png' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Abrir no Editor' }));
    });

    await screen.findByTestId('editor-page');
    expect(resolveSourceFromUrl).toHaveBeenCalledTimes(1);
  });

  it('só habilita o envio quando há um link digitado', () => {
    renderHome();
    expect(screen.getByRole('button', { name: 'Abrir no Editor' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Insira um link'), { target: { value: 'example.com' } });
    expect(screen.getByRole('button', { name: 'Abrir no Editor' })).toBeEnabled();
  });

  it('troca o formato da prancheta pelo dock', () => {
    renderHome();
    expect(screen.getByRole('region', { name: 'Hero' })).toHaveTextContent('1920 × 1080');
    fireEvent.click(screen.getByRole('button', { name: 'Banner' }));
    expect(screen.getByRole('region', { name: 'Banner' })).toHaveTextContent('1500 × 500');
  });

  it('o clima escolhido ajusta o shader e o tema, e expira se o tema mudar por outro caminho', () => {
    renderHome();
    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toHaveAttribute('data-mood', '');

    fireEvent.click(screen.getByRole('button', { name: 'Cromo' }));
    expect(backdrop).toHaveAttribute('data-mood', 'chrome');
    expect(useStore.getState().appShell.themePreference).toBe('dark');
    expect(screen.getByRole('button', { name: 'Cromo' })).toHaveAttribute('aria-pressed', 'true');

    act(() => useStore.getState().setThemePreference('light'));
    expect(backdrop).toHaveAttribute('data-mood', '');
    expect(screen.getByRole('button', { name: 'Manhã' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Manhã' }));
    expect(backdrop).toHaveAttribute('data-mood', 'morning');
    expect(useStore.getState().appShell.themePreference).toBe('light');
  });

  it('emoldura a imagem solta sem navegar e oferece as ações', async () => {
    renderHome();
    await dropImage();

    expect(screen.getByAltText('tela.png')).toHaveAttribute('src', 'blob:preview');
    expect(screen.getByRole('button', { name: 'Baixar PNG' })).toBeInTheDocument();
    expect(screen.queryByTestId('editor-page')).not.toBeInTheDocument();
    expect(resolveFileSource).not.toHaveBeenCalled();
  });

  it('"Abrir no editor" envia o arquivo emoldurado pelo fluxo de fonte', async () => {
    vi.mocked(resolveFileSource).mockResolvedValue({ ...resolved, mode: 'upload', sourceUrl: null });
    renderHome();
    const file = await dropImage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Abrir no editor' }));
    });

    await screen.findByTestId('editor-page');
    expect(resolveFileSource).toHaveBeenCalledWith(file, 'upload');
  });

  it('"Limpar" volta ao estado vazio e libera a URL da prévia', async () => {
    renderHome();
    await dropImage();

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(screen.queryByAltText('tela.png')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Insira um link')).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('avisa quando a exportação não é possível (sem medidas de layout no jsdom)', async () => {
    renderHome();
    await dropImage();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Baixar PNG' }));
    });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível exportar a imagem.'));
  });
});
