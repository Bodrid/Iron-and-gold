import { test, expect } from '@playwright/test';

test('build a farm and see it queued', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__selectCapital());
  await page.getByRole('button', { name: 'Build here' }).click();
  await page.getByRole('button', { name: /^Farm/ }).click();
  await expect(page.getByText(/Farm.*days left/)).toBeVisible();
});

test('expand into unclaimed land', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=USA');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  const before = await page.evaluate(() => (window as any).__playerTiles());
  await page.evaluate(() => (window as any).__selectStateByKey('USA-Kansas'));
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await page.evaluate(() => (window as any).__setSpeed(3));
  await expect.poll(() => page.evaluate(() => (window as any).__playerTiles()), { timeout: 15_000 }).toBeGreaterThan(before);
});

test('army, diplomacy and nation tabs show the country', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Army', exact: true }).click();
  await expect(page.getByText(/Troops/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await expect(page.getByRole('button', { name: /Austria/ })).toBeVisible();
  await page.getByRole('button', { name: 'Nation', exact: true }).click();
  await expect(page.getByText('Stockpile')).toBeVisible();
});
