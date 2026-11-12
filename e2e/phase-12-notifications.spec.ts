import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('private notification inbox redirects guests to sign-in in both locales', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fnotifications$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch language to Greek' }).click();
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth);
  await mkdir('docs/screenshots/phase-12', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/phase-12/notifications-${viewportWidth}-el.png`,
    fullPage: true,
  });
});
