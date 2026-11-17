import { test, expect, type Page } from '@playwright/test';

const SCREENS: Record<string, [number, number]> = { iphone17pro: [874, 402], ipadAir5: [1180, 820], desktop: [1920, 1080] };

async function boot(page: Page) {
  // Real devices keep their screen size when a window is resized (split view); the emulator doesn't, so pin it.
  const [sw, sh] = SCREENS[test.info().project.name];
  await page.addInitScript(([w, h]) => {
    Object.defineProperty(Screen.prototype, 'width', { get: () => w });
    Object.defineProperty(Screen.prototype, 'height', { get: () => h });
  }, [sw, sh]);
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

test('rotating and resizing adapt the layout', async ({ page }, info) => {
  await boot(page);
  await page.setViewportSize({ width: 402, height: 874 });
  if (info.project.name === 'iphone17pro') await expect(page.getByText('Turn your phone sideways')).toBeVisible();
  else await expect(page.getByText('Turn your phone sideways')).toHaveCount(0);
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

test('iPad split view and Slide Over widths stay playable', async ({ page }, info) => {
  test.skip(info.project.name !== 'ipadAir5');
  await boot(page);
  for (const [w, h] of [[585, 820], [375, 820], [500, 1180]]) {
    await page.setViewportSize({ width: w, height: h });
    await expect(page.getByText('Turn your phone sideways')).toHaveCount(0);
    await expect(page.locator('[data-ui=tabbar]')).toBeVisible();
  }
});

test('turning the phone upright pauses the game', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone17pro');
  await boot(page);
  await page.getByRole('button', { name: 'Speed 3' }).click();
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(page.getByText('Turn your phone sideways')).toBeVisible();
  await page.setViewportSize({ width: 874, height: 402 });
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
});
