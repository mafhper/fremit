/**
 * useLatestRelease.test.ts
 * Cobre a validação do payload da API de releases.
 */
import { describe, expect, it } from 'vitest';
import { parseRelease } from '@/hooks/useLatestRelease';

describe('parseRelease', () => {
  it('extrai tag e assets válidos', () => {
    const release = parseRelease({
      tag_name: 'v0.2.0',
      assets: [{ name: 'a.dmg', browser_download_url: 'https://github.com/x/a.dmg', size: 10 }],
    });
    expect(release).toEqual({ tag: 'v0.2.0', assets: [{ name: 'a.dmg', browser_download_url: 'https://github.com/x/a.dmg' }] });
  });

  it('descarta assets malformados', () => {
    const release = parseRelease({ tag_name: 'v1', assets: [null, 3, { name: 'x' }, { name: 'ok', browser_download_url: 'https://github.com/ok' }] });
    expect(release?.assets).toHaveLength(1);
    expect(release?.assets[0].name).toBe('ok');
  });

  it('rejeita payloads inválidos', () => {
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease({})).toBeNull();
    expect(parseRelease({ tag_name: 1, assets: [] })).toBeNull();
    expect(parseRelease({ tag_name: 'v1', assets: 'nope' })).toBeNull();
  });
});
