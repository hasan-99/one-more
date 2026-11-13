import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('preview legal placeholders and response headers are bilingual and explicit', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the privacy route check once.');
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-16');
  await mkdir(screenshotDirectory, { recursive: true });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Privacy', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Terms', exact: true })).toBeVisible();

  const privacyResponse = await page.goto('/privacy');
  const headers = privacyResponse?.headers();
  expect(headers?.['x-frame-options']).toBe('DENY');
  expect(headers?.['x-content-type-options']).toBe('nosniff');
  expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers?.['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await expect(page.getByText('pending qualified legal review', { exact: false })).toBeVisible();
  await expect(
    page.getByText('This page is not a complete privacy policy', { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: join(screenshotDirectory, 'privacy-en.png'), fullPage: true });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 812 });
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: join(screenshotDirectory, `privacy-en-${width}.png`),
      fullPage: true,
    });
  }

  await page.goto('/');
  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await page.getByRole('link', { name: 'Όροι', exact: true }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: 'Όροι χρήσης' })).toBeVisible();
  await expect(page.getByText('εκκρεμεί έλεγχος', { exact: false })).toBeVisible();
  await expect(page.getByText('δεν αποτελεί δεσμευτικούς όρους', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: join(screenshotDirectory, 'terms-el.png'), fullPage: true });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 812 });
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Όροι χρήσης' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: join(screenshotDirectory, `terms-el-${width}.png`),
      fullPage: true,
    });
  }
});

test('landing language switcher stays visible at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const languageSwitcher = page.locator('#language-switcher');
  await expect(languageSwitcher).toBeVisible();
  const box = await languageSwitcher.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Language: Ελληνικά' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
