/**
 * useLatestRelease.ts
 * Busca a última release publicada no GitHub, com cache de sessão (a API anônima limita
 * 60 requisições por hora por IP). Falhas viram status "error" e o chamador usa o link da página.
 */

import { useEffect, useState } from 'react';
import type { ReleaseAsset } from '@/lib/platform';

export interface LatestRelease {
  tag: string;
  assets: ReleaseAsset[];
}

export type LatestReleaseState =
  | { status: 'loading' }
  | { status: 'ready'; release: LatestRelease }
  | { status: 'error' };

const CACHE_TTL_MS = 10 * 60 * 1000;
const cacheKey = (repo: string) => `fremit.release.${repo}`;

/** Valida o JSON da API e descarta assets malformados. */
export function parseRelease(data: unknown): LatestRelease | null {
  if (!data || typeof data !== 'object') return null;
  const { tag_name: tag, assets } = data as { tag_name?: unknown; assets?: unknown };
  if (typeof tag !== 'string' || !Array.isArray(assets)) return null;

  const valid = assets.filter(
    (asset): asset is ReleaseAsset =>
      !!asset &&
      typeof asset === 'object' &&
      typeof (asset as ReleaseAsset).name === 'string' &&
      typeof (asset as ReleaseAsset).browser_download_url === 'string',
  );

  return { tag, assets: valid.map(({ name, browser_download_url }) => ({ name, browser_download_url })) };
}

function readCache(repo: string): LatestRelease | null {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(repo));
    if (!raw) return null;
    const { at, release } = JSON.parse(raw) as { at: number; release: unknown };
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return parseRelease({ tag_name: (release as LatestRelease).tag, assets: (release as LatestRelease).assets });
  } catch {
    return null;
  }
}

function writeCache(repo: string, release: LatestRelease) {
  try {
    window.sessionStorage.setItem(cacheKey(repo), JSON.stringify({ at: Date.now(), release }));
  } catch {
    // Armazenamento indisponível (modo privado, cota): segue sem cache.
  }
}

export function useLatestRelease(repo: string): LatestReleaseState {
  const [state, setState] = useState<LatestReleaseState>(() => {
    const cached = readCache(repo);
    return cached ? { status: 'ready', release: cached } : { status: 'loading' };
  });

  useEffect(() => {
    if (readCache(repo)) return;

    const controller = new AbortController();
    fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: unknown) => {
        const release = parseRelease(data);
        if (!release) throw new Error('invalid release payload');
        writeCache(repo, release);
        setState({ status: 'ready', release });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });

    return () => controller.abort();
  }, [repo]);

  return state;
}
