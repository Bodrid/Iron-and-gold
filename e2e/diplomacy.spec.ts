import { test, expect } from '@playwright/test';

test('demand Schleswig-Holstein from Denmark and see the play resolve', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await page.getByRole('button', { name: /^Denmark/ }).click();
  await page.getByRole('button', { name: /Start a diplomatic play/ }).click();
  await page.getByRole('button', { name: /Take Schleswig-Holstein/ }).click();
  await page.getByRole('button', { name: /^Start the play/ }).click();
  await expect(page.getByText(/days left/).first()).toBeVisible();
  await page.evaluate(() => (window as any).__setSpeed(3));
  await expect(page.getByText(/gave in to your demands|War with Denmark has begun/).first()).toBeVisible({ timeout: 40_000 });
});
