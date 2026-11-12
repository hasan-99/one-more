import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('renders the ONE MORE landing at mobile and desktop widths', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByText('ONE MORE.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find a game' })).toBeVisible();
  await expect(page.getByText('DEMO PREVIEW').first()).toBeVisible();
  await expect(page.getByText('Your game starts here.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    testInfo.project.use.viewport?.width ?? 0,
  );
  const copyBounds = await page.locator('#hero-copy').boundingBox();
  const previewBounds = await page.locator('#match-preview').boundingBox();
  expect(copyBounds).not.toBeNull();
  expect(previewBounds).not.toBeNull();
  if (testInfo.project.name === 'desktop-chromium') {
    expect(previewBounds!.x).toBeGreaterThan(copyBounds!.x);
    expect(Math.abs(previewBounds!.y - copyBounds!.y)).toBeLessThan(180);
  } else {
    expect(previewBounds!.y).toBeGreaterThan(copyBounds!.y + copyBounds!.height);
  }

  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-00');
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: join(screenshotDirectory, `${testInfo.project.name}.png`),
    fullPage: true,
  });
});
