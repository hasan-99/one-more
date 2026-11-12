import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('signup shows validation and localized account creation form', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
});

test('private account routes send signed-out users to sign in', async ({ page }) => {
  await page.goto('/create');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('auth screens fit mobile and desktop in dark and light themes', async ({ page }, testInfo) => {
  const width = testInfo.project.name === 'mobile-chromium' ? 375 : 1440;
  const height = width === 375 ? 812 : 900;
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-03');
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width, height });
  for (const theme of ['Dark', 'Light'] as const) {
    await page.goto('/sign-up');
    await page.getByRole('button', { name: `Appearance: ${theme}` }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: join(screenshotDirectory, `signup-${theme.toLowerCase()}-${width}.png`),
      fullPage: true,
    });
  }
});
