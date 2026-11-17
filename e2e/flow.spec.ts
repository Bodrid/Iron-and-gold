import { test, expect } from '@playwright/test';

test('new game from the menu to the map', async ({ page }) => {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: /^Normal/ }).click();
  await page.getByRole('searchbox').fill('Prussia');
  await page.getByRole('button', { name: /Prussia/ }).click();
  await page.getByRole('button', { name: /^Start as Prussia/ }).click();
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-ui=topbar]')).toContainText('Prussia');
});

test('player elimination shows the defeat screen', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__debugEliminatePlayer());
  await expect(page.getByText(/Prussia has fallen/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Main menu' }).click();
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible();
});
