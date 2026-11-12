import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('main navigation opens every shell section and secondary route', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Appearance: System' })).toBeEnabled();
  await page.getByRole('button', { name: 'Find a game' }).click();
  await expect(page).toHaveURL(/\/explore$/);

  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await navigation.getByRole('link', { name: mobile ? 'Create' : 'Create a game' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
  await page.goto('/explore');
  await navigation.getByRole('link', { name: 'Teams' }).click();
  await expect(page).toHaveURL(/\/teams$/);
  await navigation.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fprofile$/);
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fsettings$/);
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fnotifications$/);
});

test('private routes require sign-in at mobile and desktop sizes in both themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Capture the full route matrix once.');
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-03');
  mkdirSync(screenshotDirectory, { recursive: true });
  const routes = [
    { path: '/create', slug: 'create', heading: 'Welcome back' },
    { path: '/profile', slug: 'profile', heading: 'Welcome back' },
    { path: '/notifications', slug: 'notifications', heading: 'Welcome back' },
    { path: '/settings', slug: 'settings', heading: 'Welcome back' },
    { path: '/chat/demo', slug: 'chat', heading: 'Welcome back' },
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
        await expect(page).toHaveURL(
          new RegExp(
            route.path === '/create' ||
              route.path === '/profile' ||
              route.path === '/settings' ||
              route.path === '/notifications' ||
              route.path.startsWith('/chat/')
              ? `/sign-in\\?returnTo=${encodeURIComponent(route.path)}$`
              : `${route.path}$`,
          ),
        );
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

test('main screens localize in Greek', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeEnabled();
  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await page.getByRole('button', { name: 'Βρες αγώνα' }).click();
  await expect(page.getByRole('heading', { name: 'Βρες τον επόμενο αγώνα σου' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Κύρια πλοήγηση' })
    .getByRole('link', { name: mobile ? 'Δημιουργία' : 'Δημιουργία αγώνα' })
    .click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
});
