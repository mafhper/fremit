import path from "path"
import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = 'true'
process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true'

function getLastCommit() {
  try {
    const [hash, date, ...subjectParts] = execFileSync('git', ['log', '-1', '--date=short', '--format=%h|%cs|%s'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
      .split('|')

    return {
      hash,
      date,
      subject: subjectParts.join('|'),
    }
  } catch {
    return {
      hash: 'local',
      date: '',
      subject: 'Working tree',
    }
  }
}

function normalizeRepositoryUrl(remoteUrl: string) {
  if (remoteUrl.startsWith('git@github.com:')) {
    return `https://github.com/${remoteUrl.slice('git@github.com:'.length).replace(/\.git$/, '')}`;
  }

  if (remoteUrl.startsWith('https://github.com/')) {
    return remoteUrl.replace(/\.git$/, '');
  }

  return 'https://github.com/mafhper/fremit';
}

function getRepositoryUrl() {
  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    return normalizeRepositoryUrl(remoteUrl);
  } catch {
    return 'https://github.com/mafhper/fremit';
  }
}

async function getDeveloperProfile() {
  try {
    const response = await fetch('https://api.github.com/users/mafhper', {
      headers: {
        'User-Agent': 'fremit-build',
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub profile fetch failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      name?: string;
      avatar_url?: string;
      html_url?: string;
      blog?: string;
      bio?: string;
    };

    return {
      name: payload.name || 'Matheus :P Lima',
      avatarUrl: payload.avatar_url || 'https://avatars.githubusercontent.com/u/563991?v=4',
      profileUrl: payload.html_url || 'https://github.com/mafhper',
      siteUrl: payload.blog || 'https://mafhper.github.io',
      bio: (payload.bio || 'Cogito, ergo sum').trim(),
    };
  } catch {
    return {
      name: 'Matheus :P Lima',
      avatarUrl: 'https://avatars.githubusercontent.com/u/563991?v=4',
      profileUrl: 'https://github.com/mafhper',
      siteUrl: 'https://mafhper.github.io',
      bio: 'Cogito, ergo sum',
    };
  }
}

const lastCommit = getLastCommit()
const repositoryUrl = getRepositoryUrl()
const developerProfile = await getDeveloperProfile()

// https://vite.dev/config/
export default defineConfig({
  base: '/fremit/',
  define: {
    __APP_LAST_COMMIT__: JSON.stringify(lastCommit),
    __APP_REPOSITORY__: JSON.stringify({ url: repositoryUrl }),
    __APP_DEVELOPER__: JSON.stringify(developerProfile),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
