import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('team directory is available to guests without mobile overflow', async ({ page }) => {
  await page.goto('/teams');
  await expect(page.getByRole('heading', { name: 'Teams', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Teams near you' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth);
  await mkdir('docs/screenshots/phase-10', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/phase-10/teams-${viewportWidth}.png`, fullPage: true });
});

test('team details require an authenticated profile', async ({ page }) => {
  await page.goto('/teams/private-team');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fteams%2Fprivate-team$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
