import { test, expect, type Page } from '@playwright/test';

async function boot(page: Page) {
  await page.goto('./?e2e=1&quickstart=PRU');
  await page.waitForFunction(() => (window as any).__gameReady === true, null, { timeout: 60_000 });
}

test('controls clear simulated safe areas', async ({ page }) => {
  await boot(page);
  await page.addStyleTag({ content: ':root{--safe-l:62px;--safe-r:62px;--safe-b:21px}' });
  const vw = page.viewportSize()!.width;
  for (const sel of ['[data-ui=topbar]', '[data-ui=tabbar]', '[data-ui=attack-slider]']) {
    const b = (await page.locator(sel).boundingBox())!;
    expect(b.x, sel).toBeGreaterThanOrEqual(62);
    expect(b.x + b.width, sel).toBeLessThanOrEqual(vw - 62);
  }
});

test('every visible button is at least 44px', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Build' }).click();
  const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
  }).map(b => b.textContent || b.getAttribute('aria-label')));
  expect(small).toEqual([]);
});

test('rotating and resizing adapt the layout', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(page.getByText('Turn your phone sideways')).toBeVisible();
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.getByRole('button', { name: 'Build' }).click();
  await expect(page.locator('[data-ui=dock]')).toBeVisible();
  await page.setViewportSize({ width: 700, height: 820 });
  await expect(page.locator('[data-ui=sheet]')).toBeVisible();
  const c = await page.locator('canvas').first().boundingBox();
  expect(Math.round(c!.width)).toBe(700);
});

test('top bar shows the country, date and speed controls', async ({ page }) => {
  await boot(page);
  await expect(page.locator('[data-ui=topbar]')).toContainText('Prussia');
  await expect(page.locator('[data-ui=date]')).toContainText('1836');
  await page.getByRole('button', { name: 'Speed 3' }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-ui=date]')).not.toHaveText('1 Jan 1836');
});
