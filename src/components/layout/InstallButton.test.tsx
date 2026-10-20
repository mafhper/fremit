/**
 * InstallButton.test.tsx
 * Cobre o botão de instalação: SO detectado, instalador da release, fallback e mobile.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n/provider';
import { InstallButton } from './InstallButton';

const RELEASES = 'https://github.com/mafhper/fremit/releases/latest';
const SETUP = 'https://github.com/mafhper/fremit/releases/download/v0.2.0/Fremit_0.2.0_x64-setup.exe';

function mockNavigator(userAgent: string, platform: string) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform);
}

function mockRelease(ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => ({
      tag_name: 'v0.2.0',
      assets: [{ name: 'Fremit_0.2.0_x64-setup.exe', browser_download_url: SETUP }],
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderButton() {
  return render(
    <I18nProvider>
      <InstallButton />
    </I18nProvider>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.setItem('fremit.locale', 'pt-BR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InstallButton', () => {
  it('no Windows aponta para o instalador da última release', async () => {
    mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
    mockRelease();
    renderButton();

    const primary = screen.getByTestId('install-primary');
    expect(primary).toHaveTextContent('Baixar para Windows');
    expect(primary).toHaveAttribute('href', RELEASES);

    await waitFor(() => expect(primary).toHaveAttribute('href', SETUP));
  });

  it('mantém o link da página de releases quando a API falha', async () => {
    mockNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32');
    const fetchMock = mockRelease(false);
    renderButton();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByTestId('install-primary')).toHaveAttribute('href', RELEASES);
  });

  it('em celular usa o texto genérico e explica que o instalador é de desktop', () => {
    mockNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone');
    mockRelease();
    renderButton();

    const primary = screen.getByTestId('install-primary');
    expect(primary).toHaveTextContent('Instalar');
    expect(primary).toHaveAttribute('title', expect.stringContaining('versão web'));
  });

  it('lista as outras plataformas e o link para todas as versões', () => {
    mockNavigator('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64');
    mockRelease();
    renderButton();

    expect(screen.getByLabelText('Outras plataformas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Todas as versões', hidden: true })).toHaveAttribute('href', RELEASES);
  });
});
