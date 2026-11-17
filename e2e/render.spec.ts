import { test, expect } from '@playwright/test';

test('map renders the 1836 world with many colours', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./?e2e=1&debugMap=1');
  await page.waitForFunction(() => (window as any).__mapReady === true, null, { timeout: 60_000 });
  const colours = await page.evaluate(() => (window as any).__sampleColours(40));
  expect(colours).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});
