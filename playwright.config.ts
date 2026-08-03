import { defineConfig, devices } from '@playwright/test';

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true';

export default defineConfig({
  testDir: './tests',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4275',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4275',
    url: 'http://127.0.0.1:4275/fremit/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
