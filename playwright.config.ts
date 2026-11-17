import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'iphone17pro', use: { viewport: { width: 874, height: 402 }, contextOptions: { screen: { width: 874, height: 402 } }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
    { name: 'ipadAir5', use: { viewport: { width: 1180, height: 820 }, contextOptions: { screen: { width: 1180, height: 820 } }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, contextOptions: { screen: { width: 1920, height: 1080 } } } },
  ],
});
