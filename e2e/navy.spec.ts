import { test, expect } from '@playwright/test';

test('trade ships sail and the Trade tab lists routes', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=GBR');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__setSpeed(3));
  await expect.poll(() => page.evaluate(() => (window as any).__shipCount()), { timeout: 40_000 }).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Trade', exact: true }).click();
  await expect(page.getByText(/routes used/)).toBeVisible();
  const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).map(b => b.textContent));
  expect(small).toEqual([]);
});
