import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('main navigation opens every shell section and secondary route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Appearance: System' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find a game' }).click();
  await expect(page).toHaveURL(/\/explore$/);

  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await navigation.getByRole('link', { name: 'Create a game' }).click();
  await expect(page).toHaveURL(/\/create$/);
  await navigation.getByRole('link', { name: 'Teams' }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await navigation.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole('link', { name: 'Open settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await navigation.getByRole('link', { name: 'Profile' }).click();
  await page.getByRole('link', { name: 'Notifications' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
});

test('all phase 02 routes load as honest placeholders in both themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Capture the full route matrix once.');
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-02');
  mkdirSync(screenshotDirectory, { recursive: true });
  const routes = [
    { path: '/home', slug: 'home', heading: 'Your next game starts here.' },
    { path: '/explore', slug: 'explore', heading: 'Explore games' },
    { path: '/create', slug: 'create', heading: 'Create a game' },
    { path: '/teams', slug: 'teams', heading: 'Teams' },
    { path: '/profile', slug: 'profile', heading: 'Profile' },
    { path: '/notifications', slug: 'notifications', heading: 'Notifications' },
    { path: '/settings', slug: 'settings', heading: 'Settings' },
    { path: '/matches/demo', slug: 'match-detail', heading: 'Match details' },
    { path: '/teams/demo', slug: 'team-detail', heading: 'Team details' },
    { path: '/challenges/demo', slug: 'challenge-detail', heading: 'Challenge details' },
    { path: '/chat/demo', slug: 'chat', heading: 'Match chat' },
  ];

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const theme of ['Dark', 'Light'] as const) {
      await page.goto('/');
      await expect(page.getByRole('button', { name: `Appearance: ${theme}` })).toBeEnabled();
      await page.getByRole('button', { name: `Appearance: ${theme}` }).click();
      await page.waitForFunction(
        (value) => localStorage.getItem('one-more.theme') === value,
        theme.toLowerCase(),
      );

      for (const route of routes) {
        await page.goto(route.path);
        await expect(page.getByRole('heading', { name: route.heading }).last()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
        await page.screenshot({
          path: join(screenshotDirectory, `${route.slug}-${theme.toLowerCase()}-${width}.png`),
          fullPage: true,
        });
      }
    }
  }
});

test('main screens localize in Greek', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeEnabled();
  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await page.getByRole('button', { name: 'Βρες αγώνα' }).click();
  await expect(page.getByText('Δεν υπάρχουν ακόμη αγώνες για προβολή')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Κύρια πλοήγηση' })
    .getByRole('link', { name: 'Δημιουργία αγώνα' })
    .click();
  await expect(page.getByText('Η δημιουργία αγώνα θα είναι σύντομα διαθέσιμη εδώ.')).toBeVisible();
});
