import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:3100', headless: true, viewport: { width: 1440, height: 1000 }, launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} },
  reporter: 'list',
});
