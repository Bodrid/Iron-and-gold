import { test, expect } from '@playwright/test';

test('loads and registers a manifest', async ({ page }) => {
  await page.goto('./?e2e=1');
  await expect(page.getByText('Iron & Gold').first()).toBeVisible();
  expect(await page.locator('link[rel="manifest"]').count()).toBe(1);
});
