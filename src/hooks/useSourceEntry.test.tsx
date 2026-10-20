/**
 * useSourceEntry.test.tsx
 * Cobre o fluxo de entrada de fonte (link, arquivo e imagem colada): sucesso leva ao editor,
 * erro grava a mensagem na store e entradas vazias ou irrelevantes são ignoradas.
 */
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { I18nProvider } from '@/i18n/provider';
import { SourceResolutionError, resolveFileSource, resolveSourceFromUrl } from '@/lib/sourceResolver';
import { useStore } from '@/store/useStore';
import type { ResolvedSource } from '@/types/app';
import { useSourceEntry } from './useSourceEntry';

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

// Guarda a rota atual para as asserções; atualizado em efeito (não durante a renderização).
const probe = { pathname: '/' };
function LocationProbe() {
  const { pathname } = useLocation();
  useEffect(() => {
    probe.pathname = pathname;
  }, [pathname]);
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>
        <LocationProbe />
        {children}
      </I18nProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.setItem('fremit.locale', 'pt-BR');
  useStore.setState(useStore.getInitialState(), true);
  probe.pathname = '/';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useSourceEntry', () => {
  it('resolve uma URL de imagem, grava a fonte e navega para o editor', async () => {
    vi.mocked(resolveSourceFromUrl).mockResolvedValue(resolved);
    const { result } = renderHook(() => useSourceEntry(), { wrapper });

    act(() => result.current.setDraftUrl('https://example.com/a.png'));
    await act(() => result.current.handleUrlSubmit());

    expect(resolveSourceFromUrl).toHaveBeenCalledTimes(1);
    expect(useStore.getState().source.active).toEqual(resolved);
    expect(useStore.getState().source.status).toBe('ready');
    expect(probe.pathname).toBe('/editor');
  });

  it('mantém a captura no /mockup, que tem o próprio compositor', async () => {
    vi.mocked(resolveSourceFromUrl).mockResolvedValue(resolved);
    const mockupWrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/mockup']}>
        <I18nProvider>
          <LocationProbe />
          {children}
        </I18nProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useSourceEntry(), { wrapper: mockupWrapper });

    act(() => result.current.setDraftUrl('https://example.com/a.png'));
    await act(() => result.current.handleUrlSubmit());

    expect(useStore.getState().source.status).toBe('ready');
    expect(probe.pathname).toBe('/mockup');
  });

  it('ignora o envio quando o campo de link está vazio', async () => {
    const { result } = renderHook(() => useSourceEntry(), { wrapper });

    await act(() => result.current.handleUrlSubmit());

    expect(resolveSourceFromUrl).not.toHaveBeenCalled();
    expect(probe.pathname).toBe('/');
  });

  it('grava a mensagem de erro da resolução e permanece na home', async () => {
    vi.mocked(resolveSourceFromUrl).mockRejectedValue(new SourceResolutionError('blocked', 'Página bloqueada'));
    const { result } = renderHook(() => useSourceEntry(), { wrapper });

    act(() => result.current.setDraftUrl('https://example.com/a.png'));
    await act(() => result.current.handleUrlSubmit());

    expect(useStore.getState().source.status).toBe('error');
    expect(useStore.getState().source.errorCode).toBe('blocked');
    expect(useStore.getState().source.errorMessage).toBe('Página bloqueada');
    expect(probe.pathname).toBe('/');
  });

  it('usa a mensagem genérica para erros desconhecidos', async () => {
    vi.mocked(resolveFileSource).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSourceEntry(), { wrapper });

    await act(() => result.current.handleFile(new File(['x'], 'a.png', { type: 'image/png' })));

    expect(useStore.getState().source.errorCode).toBe('unknown');
    expect(useStore.getState().source.errorMessage).toContain('A fonte não pôde ser carregada');
  });

  it('resolve um arquivo enviado e navega para o editor', async () => {
    vi.mocked(resolveFileSource).mockResolvedValue({ ...resolved, mode: 'upload', sourceUrl: null });
    const { result } = renderHook(() => useSourceEntry(), { wrapper });
    const file = new File(['x'], 'tela.png', { type: 'image/png' });

    await act(() => result.current.handleFile(file));

    expect(resolveFileSource).toHaveBeenCalledWith(file, 'upload');
    expect(probe.pathname).toBe('/editor');
  });

  it('trata imagem colada como clipboard-image e cancela o comportamento padrão', async () => {
    vi.mocked(resolveFileSource).mockResolvedValue({ ...resolved, mode: 'clipboard-image', sourceUrl: null });
    const { result } = renderHook(() => useSourceEntry(), { wrapper });
    const file = new File(['x'], 'colada.png', { type: 'image/png' });
    const preventDefault = vi.fn();

    await act(() =>
      result.current.handlePaste({
        clipboardData: { items: [{ type: 'image/png', getAsFile: () => file }] } as unknown as DataTransfer,
        preventDefault,
      }),
    );

    expect(preventDefault).toHaveBeenCalled();
    expect(resolveFileSource).toHaveBeenCalledWith(file, 'clipboard-image');
  });

  it('ignora colagem sem imagem', async () => {
    const { result } = renderHook(() => useSourceEntry(), { wrapper });
    const preventDefault = vi.fn();

    await act(() =>
      result.current.handlePaste({
        clipboardData: { items: [{ type: 'text/plain', getAsFile: () => null }] } as unknown as DataTransfer,
        preventDefault,
      }),
    );

    expect(preventDefault).not.toHaveBeenCalled();
    expect(resolveFileSource).not.toHaveBeenCalled();
  });

  it('informa erro quando a área de transferência não está disponível', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
    const { result } = renderHook(() => useSourceEntry(), { wrapper });

    await act(() => result.current.handleClipboardRead());

    expect(useStore.getState().source.errorCode).toBe('clipboard-unavailable');
    vi.unstubAllGlobals();
  });
});
