/**
 * Runtime GitHub reader of the template gallery: turns an `owner/repo` input
 * into the small summary the GitHub template prints (name, description,
 * language, stars, forks).
 *
 * Everything here is best-effort by contract: the function returns `null` for
 * an invalid input, a failed request or an unexpected payload, and never
 * throws. The panel falls back to the seed's placeholders, so the template
 * works offline exactly like it works online.
 *
 * Unauthenticated `api.github.com` on purpose: no backend, no token, no auth —
 * the same public endpoint the build uses for the developer profile, but at
 * runtime and optional.
 */

export interface RepoSummary {
  fullName: string;
  description: string;
  language: string;
  /** Dot color of the language, in the GitHub language palette. */
  languageColor: string;
  stars: number;
  forks: number;
}

const REPO_PATH = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** Neutral dot color for a missing or unknown language. */
export const DEFAULT_LANGUAGE_COLOR = '#8b949e';

/**
 * Language palette of the dot (a subset of the GitHub linguist colors, the
 * ones a Fremit user is likely to see). Unknown languages fall back to the
 * neutral gray instead of guessing a color.
 */
export const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Shell: '#89e051',
  Ruby: '#701516',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  PHP: '#4f5d95',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Dart: '#00b4ab',
  Lua: '#000080',
  Zig: '#ec915c',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Scala: '#c22d40',
  R: '#198ce7',
  Julia: '#a270ba',
  'Objective-C': '#438eff',
  PowerShell: '#012456',
  Markdown: '#083fa1',
};

export function languageColor(language: string | null | undefined): string {
  if (!language) return DEFAULT_LANGUAGE_COLOR;

  return LANGUAGE_COLORS[language] ?? DEFAULT_LANGUAGE_COLOR;
}

/**
 * Accepts `owner/repo`, a full GitHub URL and a trailing `.git`, and rejects
 * anything that is not exactly one owner and one repository.
 */
export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  if (!REPO_PATH.test(trimmed)) return null;

  const [owner, repo] = trimmed.split('/');

  return { owner, repo };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/**
 * Reads one repository through the public API. `fetcher` is injectable so the
 * tests never touch the network; the panel uses the global `fetch`.
 */
export async function fetchRepoSummary(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<RepoSummary | null> {
  const parsed = parseRepoInput(input);
  if (!parsed) return null;

  try {
    const response = await fetcher(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as Record<string, unknown>;
    const language = readString(payload.language);

    return {
      fullName: readString(payload.full_name) || `${parsed.owner}/${parsed.repo}`,
      description: readString(payload.description),
      language,
      languageColor: languageColor(language),
      stars: readCount(payload.stargazers_count),
      forks: readCount(payload.forks_count),
    };
  } catch {
    return null;
  }
}
