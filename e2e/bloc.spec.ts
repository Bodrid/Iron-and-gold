import { test, expect } from '@playwright/test';

test('found a trade league as Britain and invite Portugal', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=GBR');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  const dock = await page.evaluate(() => document.querySelector('[data-ui=tabbar]')!.textContent!.includes('Bloc'));
  await page.getByRole('button', { name: dock ? 'Bloc' : 'Diplomacy', exact: true }).click();
  await page.getByRole('radio', { name: 'Trade League' }).click();
  await page.getByRole('button', { name: /Mercantile Navy/ }).click();
  await page.getByRole('button', { name: /Found the Trade League/ }).click();
  await expect(page.getByText(/Trade League led by you/)).toBeVisible();
  if (dock) await page.getByRole('button', { name: 'Diplomacy', exact: true }).click();
  await page.getByRole('button', { name: /^Portugal/ }).click();
  await page.getByRole('button', { name: 'Invite to our bloc' }).click();
  await expect(page.getByText(/Portugal joined your power bloc|Portugal turned down your invitation/).first()).toBeVisible();
});
