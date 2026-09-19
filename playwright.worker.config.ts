import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/workers',
  use: { baseURL: 'http://127.0.0.1:5182', browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: 'npm run dev -- --port 5182 --strictPort', url: 'http://127.0.0.1:5182', reuseExistingServer: false },
});
