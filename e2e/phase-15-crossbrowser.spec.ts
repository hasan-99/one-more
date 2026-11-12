import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('Phase 15 public navigation works across browser engines', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'Cross-engine smoke uses desktop Chromium.');
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.name));
  const directory = join(process.cwd(), 'docs', 'screenshots', 'phase-15');
  await mkdir(directory, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByText('ONE MORE.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find a game' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: join(directory, `${testInfo.project.name}-1440.png`), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/home');
  await expect(page.getByRole('heading').first()).toBeVisible();
  const mobileNavigation = page.locator('#app-mobile-nav');
  await expect(mobileNavigation.getByRole('link', { name: 'Explore', exact: true })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Create', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: join(directory, `${testInfo.project.name}-375.png`), fullPage: true });

  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(mobileNavigation.getByRole('link', { name: 'Αγώνες', exact: true })).toBeVisible();
  await expect(
    mobileNavigation.getByRole('link', { name: 'Δημιουργία', exact: true }),
  ).toBeVisible();
  await mobileNavigation.getByRole('link', { name: 'Δημιουργία', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
