import { test, expect } from '@playwright/test';

test('hiding the app saves, and Continue resumes there', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__setSpeed(3));
  await page.waitForTimeout(2500);
  await page.evaluate(() => (window as any).__setSpeed(0));
  await page.waitForTimeout(300);
  const date = await page.locator('[data-ui=date]').textContent();
  expect(date).not.toBe('1 Jan 1836');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => (window as any).__lastSaved === 'background', null, { timeout: 15_000 });
  await page.goto('./?e2e=1');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-ui=date]')).toHaveText(date!);
});

test('manual save appears in the load list', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Nation', exact: true }).click();
  await page.getByRole('button', { name: 'Save 2' }).click();
  await expect(page.getByText('Saved to slot 2.')).toBeVisible();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByRole('button', { name: /Slot 2/ })).toBeVisible();
});

test('going to the main menu keeps your progress for Continue', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__setSpeed(3));
  await page.waitForTimeout(2000);
  await page.evaluate(() => (window as any).__setSpeed(0));
  await page.waitForTimeout(300);
  const date = await page.locator('[data-ui=date]').textContent();
  await page.getByRole('button', { name: 'Nation', exact: true }).click();
  await page.getByRole('button', { name: 'Main menu' }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await expect(page.locator('[data-ui=date]')).toHaveText(date!);
});
