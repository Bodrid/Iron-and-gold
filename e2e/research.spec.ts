import { test, expect } from '@playwright/test';

test('research a tech and start passing a law as Britain', async ({ page }) => {
  await page.goto('./?e2e=1&quickstart=GBR');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.getByText(/Nothing is being researched/)).toBeVisible();
  await page.locator('[data-tech="powerLooms"] button', { hasText: 'Research' }).click();
  await expect(page.getByText(/of \d[\d,.]* points/)).toBeVisible();
  await expect(page.locator('[data-tech="powerLooms"]')).toHaveClass(/researching/);

  await page.getByRole('button', { name: 'Nation', exact: true }).click();
  await page.locator('details.law-area', { hasText: 'Education' }).locator('summary').click();
  const enact = page.locator('details.law-area', { hasText: 'Education' }).getByRole('button', { name: 'Enact' }).first();
  if (await enact.isEnabled()) {
    await enact.click();
    await expect(page.getByText(/^Passing:/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText(/^Passing:/)).toHaveCount(0);
  } else {
    await expect(page.locator('details.law-area', { hasText: 'Education' }).getByText(/Not enough support|Already passing/).first()).toBeVisible();
  }
  await expect(page.getByText('Interest groups')).toBeVisible();
});
