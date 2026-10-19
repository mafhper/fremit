import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LANGUAGE_COLOR,
  fetchRepoSummary,
  languageColor,
  parseRepoInput,
} from '@/lib/githubRepo';

/** Minimal `Response` stand-in: the reader only touches `ok` and `json()`. */
function fakeResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

const PAYLOAD = {
  full_name: 'mafhper/fremit',
  description: 'Link and screenshot mockups.',
  language: 'TypeScript',
  stargazers_count: 128,
  forks_count: 12,
};

describe('parseRepoInput', () => {
  it('accepts owner/repo, a GitHub URL, a trailing .git and surrounding space', () => {
    expect(parseRepoInput('mafhper/fremit')).toEqual({ owner: 'mafhper', repo: 'fremit' });
    expect(parseRepoInput('https://github.com/mafhper/fremit')).toEqual({
      owner: 'mafhper',
      repo: 'fremit',
    });
    expect(parseRepoInput('https://github.com/mafhper/fremit.git')).toEqual({
      owner: 'mafhper',
      repo: 'fremit',
    });
    expect(parseRepoInput('  mafhper/fremit/  ')).toEqual({ owner: 'mafhper', repo: 'fremit' });
  });

  it('rejects anything that is not exactly one owner and one repository', () => {
    expect(parseRepoInput('')).toBeNull();
    expect(parseRepoInput('fremit')).toBeNull();
    expect(parseRepoInput('a/b/c')).toBeNull();
    expect(parseRepoInput('mafhper fremit')).toBeNull();
    expect(parseRepoInput('https://github.com/mafhper/fremit/issues')).toBeNull();
  });
});

describe('languageColor', () => {
  it('maps known languages to the GitHub palette', () => {
    expect(languageColor('TypeScript')).toBe('#3178c6');
    expect(languageColor('Rust')).toBe('#dea584');
  });

  it('falls back to the neutral gray for unknown or missing languages', () => {
    expect(languageColor('Brainfuck')).toBe(DEFAULT_LANGUAGE_COLOR);
    expect(languageColor('')).toBe(DEFAULT_LANGUAGE_COLOR);
    expect(languageColor(null)).toBe(DEFAULT_LANGUAGE_COLOR);
  });
});

describe('fetchRepoSummary', () => {
  it('maps the API payload into the summary the template prints', async () => {
    const fetcher = vi.fn(async () => fakeResponse(PAYLOAD));

    const summary = await fetchRepoSummary('mafhper/fremit', fetcher as unknown as typeof fetch);

    expect(summary).toEqual({
      fullName: 'mafhper/fremit',
      description: 'Link and screenshot mockups.',
      language: 'TypeScript',
      languageColor: '#3178c6',
      stars: 128,
      forks: 12,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/mafhper/fremit',
      expect.objectContaining({ headers: { Accept: 'application/vnd.github+json' } }),
    );
  });

  it('keeps neutral values for fields the payload does not carry', async () => {
    const fetcher = vi.fn(async () => fakeResponse({}));

    const summary = await fetchRepoSummary('mafhper/fremit', fetcher as unknown as typeof fetch);

    expect(summary).toEqual({
      fullName: 'mafhper/fremit',
      description: '',
      language: '',
      languageColor: DEFAULT_LANGUAGE_COLOR,
      stars: 0,
      forks: 0,
    });
  });

  it('returns null instead of throwing when the request fails', async () => {
    const notFound = vi.fn(async () => fakeResponse({ message: 'Not Found' }, false));
    const offline = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const invalidJson = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('unexpected token');
      },
    }) as unknown as Response);

    expect(await fetchRepoSummary('mafhper/missing', notFound as unknown as typeof fetch)).toBeNull();
    expect(await fetchRepoSummary('mafhper/fremit', offline as unknown as typeof fetch)).toBeNull();
    expect(await fetchRepoSummary('mafhper/fremit', invalidJson as unknown as typeof fetch)).toBeNull();
  });

  it('does not call the network for an invalid input', async () => {
    const fetcher = vi.fn(async () => fakeResponse(PAYLOAD));

    expect(await fetchRepoSummary('not a repo', fetcher as unknown as typeof fetch)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
