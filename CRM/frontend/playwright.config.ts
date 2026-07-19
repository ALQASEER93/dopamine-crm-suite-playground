import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.CRM_FRONTEND_URL || 'http://127.0.0.1:5174';
const channel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: `crm-${channel}-desktop`,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: `crm-${channel}-mobile`,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
