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

const lastCommit = getLastCommit()

// https://vite.dev/config/
export default defineConfig({
  base: '/fremit/',
  define: {
    __APP_LAST_COMMIT__: JSON.stringify(lastCommit),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
