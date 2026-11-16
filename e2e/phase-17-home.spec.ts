import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const userId = 'f3476a3f-21b6-4c93-9b01-b63de7a46031';
const json = (body: unknown, headers: Record<string, string> = {}) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'access-control-expose-headers': 'content-range', ...headers },
  body: JSON.stringify(body),
});

test('branded home screen fits mobile and desktop and localizes to Greek', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'mobile-chromium';
  const width = mobile ? 375 : 1440;
  const height = mobile ? 812 : 1000;
  const screenshots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  mkdirSync(screenshots, { recursive: true });

  // /home is a private page, so sign in with a mocked session.
  await page.addInitScript(
    ({ id }) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        'sb-ejlyaerurkjgsylrsthl-auth-token',
        JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: now + 86400,
          refresh_token: 'mock-refresh-token',
          user: {
            id,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'player@example.invalid',
            email_confirmed_at: '2026-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      );
      // Only defaults: the test switches theme and language itself and the script runs on every load.
      if (!localStorage.getItem('one-more.theme')) localStorage.setItem('one-more.theme', 'light');
      if (!localStorage.getItem('one-more.locale')) localStorage.setItem('one-more.locale', 'en');
    },
    { id: userId },
  );
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill(json({ onboarding_complete: true })),
  );
  await page.route('**/rest/v1/inbox_notifications**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-range': '*/0',
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'content-range',
      },
      body: route.request().method() === 'HEAD' ? '' : '[]',
    }),
  );
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
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
  await expect(page.getByRole('link', { name: 'Ανακάλυψε αγώνες' }).first()).toBeVisible();
});
