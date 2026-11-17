import { test, expect } from '@playwright/test';

test('start a 1776 game as Poland-Lithuania from the menu', async ({ page }) => {
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: /New game/ }).click();
  await page.getByRole('button', { name: /^1776/ }).click();
  await page.getByRole('searchbox').fill('poland');
  await page.getByRole('button', { name: /Poland-Lithuania/ }).click();
  await page.getByRole('button', { name: /Start as Poland-Lithuania/ }).click();
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await expect(page.getByText('Poland-Lithuania').first()).toBeVisible();
  await expect(page.getByText(/1776/).first()).toBeVisible();
});
