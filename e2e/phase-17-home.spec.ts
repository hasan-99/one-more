import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('branded home screen fits mobile and desktop and localizes to Greek', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile-chromium';
  const width = mobile ? 375 : 1440;
  const height = mobile ? 812 : 1000;
  const screenshots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  mkdirSync(screenshots, { recursive: true });
  await page.setViewportSize({ width, height });
  await page.goto('/home');

  await expect(page.getByRole('heading', { name: 'Find your next game.' })).toBeVisible();
  await page.screenshot({
    path: join(screenshots, `home-${mobile ? 'mobile-375' : 'desktop-1440'}-light.png`),
  });
  const exploreLink = page.getByRole('link', { name: 'Explore games' }).first();
  await expect(exploreLink).toBeVisible();
  const gamesHeading = page.getByRole('heading', { name: 'Upcoming games' });
  await gamesHeading.scrollIntoViewIfNeeded();
  await expect(gamesHeading).toBeVisible();
  const challengesHeading = page.getByRole('heading', { name: 'Team challenges' });
  await challengesHeading.scrollIntoViewIfNeeded();
  await expect(challengesHeading).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.evaluate(() => localStorage.setItem('one-more.theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(screenshots, `home-${mobile ? '375' : 'desktop'}-dark.png`),
  });

  const languageToggle = page.getByRole('button', { name: 'Language: English' });
  await expect(languageToggle).toBeEnabled();
  await languageToggle.click();
  await expect(page.getByRole('heading', { name: 'Βρες τον επόμενο αγώνα σου.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Αναζήτηση αγώνων' })).toBeVisible();
});
