/**
 * platform.ts
 * Detecção de sistema operacional e escolha do instalador certo entre os assets de uma release.
 * Os padrões de nome seguem o que o tauri-action publica (ex.: Fremit_1.0.0_x64-setup.exe).
 */

export type DesktopOS = 'windows' | 'macos' | 'linux';
export type CpuArch = 'arm64' | 'x64';

export interface PlatformInfo {
  os: DesktopOS | null;
  mobile: boolean;
}

export interface NavigatorLike {
  userAgent?: string;
  platform?: string;
  userAgentData?: { platform?: string; mobile?: boolean };
}

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export function detectPlatform(nav: NavigatorLike = navigator): PlatformInfo {
  const ua = nav.userAgent ?? '';
  const platform = nav.userAgentData?.platform ?? nav.platform ?? '';

  if (nav.userAgentData?.mobile || /android|iphone|ipad|ipod/i.test(ua)) {
    return { os: null, mobile: true };
  }
  if (/^win/i.test(platform) || /windows/i.test(ua)) return { os: 'windows', mobile: false };
  if (/^mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) return { os: 'macos', mobile: false };
  if (/linux|x11/i.test(platform) || /linux|x11/i.test(ua)) return { os: 'linux', mobile: false };
  return { os: null, mobile: false };
}

// Artefatos auxiliares (assinaturas, pacotes do updater, manifestos) nunca são instaladores.
const IGNORED = /\.(sig|tar\.gz|zip|json|blockmap)$/i;
const ARM = /(aarch64|arm64)/i;
const X64 = /(x64|x86_64|amd64|intel)/i;
const UNIVERSAL = /universal/i;

function firstMatch(assets: readonly ReleaseAsset[], patterns: readonly RegExp[]): ReleaseAsset | null {
  for (const pattern of patterns) {
    const found = assets.find((asset) => pattern.test(asset.name));
    if (found) return found;
  }
  return null;
}

/**
 * Escolhe o instalador para o sistema. No macOS o navegador não informa a arquitetura de forma
 * confiável, então o padrão é Apple Silicon e quem usa Intel escolhe manualmente.
 * Só retorna URLs do GitHub, para nunca apontar o botão para outro destino.
 */
export function pickAsset(
  assets: readonly ReleaseAsset[],
  os: DesktopOS,
  arch: CpuArch = 'arm64',
): ReleaseAsset | null {
  const candidates = assets.filter(
    (asset) => !IGNORED.test(asset.name) && asset.browser_download_url.startsWith('https://github.com/'),
  );

  switch (os) {
    case 'windows':
      return firstMatch(candidates, [/-setup\.exe$/i, /\.msi$/i, /\.exe$/i]);
    case 'macos': {
      const dmgs = candidates.filter((asset) => /\.dmg$/i.test(asset.name));
      const wanted = arch === 'arm64' ? ARM : X64;
      return dmgs.find((asset) => wanted.test(asset.name)) ?? dmgs.find((asset) => UNIVERSAL.test(asset.name)) ?? null;
    }
    case 'linux': {
      const x64Only = candidates.filter((asset) => X64.test(asset.name));
      return firstMatch(x64Only, [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i]);
    }
  }
}
