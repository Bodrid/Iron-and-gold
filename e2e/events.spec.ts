import { test, expect } from '@playwright/test';

test('an event card opens and pauses the game, shows choices with effects, and the choice applies', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=JAP');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.evaluate(() => (window as any).__setSpeed(2));
  await page.evaluate(() => (window as any).__fireEvent('jp.perry'));
  const card = page.getByRole('dialog');   // opens by itself
  await expect(card.getByText('The Black Ships')).toBeVisible();
  await expect(card.getByText(/New law: Free Trade/)).toBeVisible();
  await expect(card.getByText(/The game is paused while you decide/)).toBeVisible();
  await card.getByRole('button', { name: /Open the ports/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nation', exact: true }).click();
  await expect(page.getByText(/The Black Ships/).first()).toBeVisible();
  await expect(page.getByText(/Open the ports ·/)).toBeVisible();
});
