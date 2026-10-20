/**
 * platform.test.ts
 * Cobre a detecção de SO e a escolha de instaladores com nomes reais do tauri-action.
 */
import { describe, expect, it } from 'vitest';
import { detectPlatform, pickAsset, type ReleaseAsset } from '@/lib/platform';

const gh = (name: string): ReleaseAsset => ({
  name,
  browser_download_url: `https://github.com/mafhper/fremit/releases/download/v0.2.0/${name}`,
});

const assets = [
  gh('Fremit_0.2.0_x64-setup.exe'),
  gh('Fremit_0.2.0_x64-setup.exe.sig'),
  gh('Fremit_0.2.0_x64_en-US.msi'),
  gh('Fremit_0.2.0_aarch64.dmg'),
  gh('Fremit_0.2.0_x64.dmg'),
  gh('Fremit_aarch64.app.tar.gz'),
  gh('Fremit_0.2.0_amd64.AppImage'),
  gh('Fremit_0.2.0_amd64.deb'),
  gh('latest.json'),
];

describe('detectPlatform', () => {
  it('reconhece Windows, macOS e Linux no desktop', () => {
    expect(detectPlatform({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }).os).toBe('windows');
    expect(detectPlatform({ platform: 'MacIntel', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }).os).toBe('macos');
    expect(detectPlatform({ platform: 'Linux x86_64', userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }).os).toBe('linux');
  });

  it('prefere userAgentData quando disponível', () => {
    expect(detectPlatform({ userAgentData: { platform: 'macOS' }, platform: '', userAgent: '' }).os).toBe('macos');
  });

  it('marca celulares como mobile, sem SO de desktop', () => {
    const android = detectPlatform({ platform: 'Linux armv8l', userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' });
    const iphone = detectPlatform({ platform: 'iPhone', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
    expect(android).toEqual({ os: null, mobile: true });
    expect(iphone).toEqual({ os: null, mobile: true });
  });

  it('retorna SO nulo quando não reconhece', () => {
    expect(detectPlatform({ platform: '', userAgent: '' })).toEqual({ os: null, mobile: false });
  });
});

describe('pickAsset', () => {
  it('no Windows prefere o instalador NSIS e cai para MSI', () => {
    expect(pickAsset(assets, 'windows')?.name).toBe('Fremit_0.2.0_x64-setup.exe');
    expect(pickAsset([gh('Fremit_0.2.0_x64_en-US.msi')], 'windows')?.name).toBe('Fremit_0.2.0_x64_en-US.msi');
  });

  it('no macOS escolhe por arquitetura, com Apple Silicon como padrão', () => {
    expect(pickAsset(assets, 'macos')?.name).toBe('Fremit_0.2.0_aarch64.dmg');
    expect(pickAsset(assets, 'macos', 'x64')?.name).toBe('Fremit_0.2.0_x64.dmg');
  });

  it('no macOS aceita dmg universal quando não há o da arquitetura', () => {
    expect(pickAsset([gh('Fremit_0.2.0_universal.dmg')], 'macos', 'x64')?.name).toBe('Fremit_0.2.0_universal.dmg');
  });

  it('no Linux prefere AppImage e cai para deb', () => {
    expect(pickAsset(assets, 'linux')?.name).toBe('Fremit_0.2.0_amd64.AppImage');
    expect(pickAsset([gh('Fremit_0.2.0_amd64.deb')], 'linux')?.name).toBe('Fremit_0.2.0_amd64.deb');
  });

  it('ignora assinaturas, pacotes do updater e manifestos', () => {
    const onlyAux = [gh('Fremit_0.2.0_x64-setup.exe.sig'), gh('Fremit_aarch64.app.tar.gz'), gh('latest.json')];
    expect(pickAsset(onlyAux, 'windows')).toBeNull();
    expect(pickAsset(onlyAux, 'macos')).toBeNull();
  });

  it('nunca retorna URL fora do GitHub', () => {
    const external = [{ name: 'Fremit_0.2.0_x64-setup.exe', browser_download_url: 'https://evil.example/Fremit_0.2.0_x64-setup.exe' }];
    expect(pickAsset(external, 'windows')).toBeNull();
  });

  it('retorna null quando a release não tem instalador do sistema', () => {
    expect(pickAsset([], 'linux')).toBeNull();
    expect(pickAsset([gh('Fremit_0.2.0_aarch64.dmg')], 'windows')).toBeNull();
  });
});
