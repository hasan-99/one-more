import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('challenge directory renders for guests without mobile overflow', async ({ page }) => {
  await page.goto('/challenges');
  await expect(page.getByRole('heading', { name: 'Open challenges', exact: true })).toBeVisible();
  await expect(page.getByText('No open challenges yet.')).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth);
  await mkdir('docs/screenshots/phase-11', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/phase-11/challenges-${viewportWidth}.png`,
    fullPage: true,
  });
});

test('challenge details require an authenticated profile', async ({ page }) => {
  await page.goto('/challenges/private-challenge');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fchallenges%2Fprivate-challenge$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
