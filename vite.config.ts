import path from "path"
import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { findSafePort, formatPortFallback } from './scripts/sonda-porta.ts'

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

// O Tauri define TAURI_ENV_PLATFORM ao rodar beforeDevCommand/beforeBuildCommand. No app desktop os
// assets são servidos da raiz; no GitHub Pages o site vive em /fremit/.
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM)

// `fremit` ja tem portas autorais (preview 4273, e2e 4275) e por isso nao disputa
// 5173 com o resto da frota — mas o `dev` nao declara NENHUMA e herda o default
// do Vite, que e exatamente a classe de colisao que a frota esta corrigindo.
// A porta nomeada aqui e 5220 (fora das faixas de incremento 5173-5175).
const DEV_PORT = Number(process.env.PORT) || 5220

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  const devPort = command === 'serve' ? await findSafePort(DEV_PORT, { rotulo: 'fremit' }) : DEV_PORT
  if (devPort !== DEV_PORT) console.warn(formatPortFallback(DEV_PORT, devPort, 'fremit'))

  return {
  base: isTauri ? '/' : '/fremit/',
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
  },
  define: {
    __APP_LAST_COMMIT__: JSON.stringify(lastCommit),
    __APP_REPOSITORY__: JSON.stringify({ url: repositoryUrl }),
    __APP_DEVELOPER__: JSON.stringify(developerProfile),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  }
})
