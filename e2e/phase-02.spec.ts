import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

async function seedCompletedSession(page: import('@playwright/test').Page) {
  const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
  const email = 'settings-player@example.invalid';
  const now = Math.floor(Date.now() / 1000);
  const encodeJwtPart = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = [
    encodeJwtPart({ alg: 'HS256', typ: 'JWT' }),
    encodeJwtPart({
      aud: 'authenticated',
      role: 'authenticated',
      sub: userId,
      email,
      exp: now + 3600,
      iat: now,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: 'Settings Player', phone: '+35799123456' },
    }),
    'mock-signature',
  ].join('.');
  const session = {
    access_token: accessToken,
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: new Date(now * 1000).toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: 'Settings Player', phone: '+35799123456' },
      identities: [],
      created_at: new Date(now * 1000).toISOString(),
      updated_at: new Date(now * 1000).toISOString(),
    },
  };
  await page.addInitScript(
    ({ storageKey, savedSession }) =>
      localStorage.setItem(storageKey, JSON.stringify(savedSession)),
    { storageKey: 'sb-ejlyaerurkjgsylrsthl-auth-token', savedSession: session },
  );
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const rows: Record<string, unknown> = {
      profiles: { onboarding_complete: true },
      notification_preferences: {
        user_id: userId,
        in_app_enabled: true,
        discovery_email_enabled: false,
        chat_email_enabled: false,
        created_at: new Date(now * 1000).toISOString(),
        updated_at: new Date(now * 1000).toISOString(),
      },
      account_deletion_requests: null,
    };
    const table = path.split('/').pop() ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows[table] ?? []),
    });
  });
}

test('main navigation opens every shell section and secondary route', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  // No backend in the test run: answer every Supabase call with an empty list.
  await page.route('**/*.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
  const languageButton = page.getByRole('button', { name: 'Language: English' });
  await expect(languageButton).toBeEnabled();
  await expect(page.locator('#language-switcher').getByRole('button')).toHaveCount(1);
  await languageButton.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page.getByRole('button', { name: 'Γλώσσα: Ελληνικά' })).toBeEnabled();
  await page.getByRole('button', { name: 'Γλώσσα: Ελληνικά' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Sign in or create account' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto('/explore');

  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  // Home is a private area: signed-out visitors are sent to sign in and returned afterwards.
  await navigation.getByRole('link', { name: 'Home' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fhome$/);
  await page.goto('/explore');
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
      await page.evaluate(
        (value) => localStorage.setItem('one-more.theme', value),
        theme.toLowerCase(),
      );
      await page.reload();
      await expect(page.locator('html')).toHaveCSS('color-scheme', theme.toLowerCase());

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

test('appearance choices live in settings and persist across navigation', async ({
  page,
}, testInfo) => {
  await seedCompletedSession(page);
  const width = testInfo.project.name === 'mobile-chromium' ? 375 : 1440;
  await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Appearance', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch theme to dark' })).toHaveCount(0);

  for (const theme of ['dark', 'light', 'system'] as const) {
    const button = page.getByRole('button', {
      name: `Appearance: ${theme[0].toUpperCase()}${theme.slice(1)}`,
    });
    await button.click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('one-more.theme')))
      .toBe(theme);
    const toast = page.getByRole('status').filter({ hasText: 'Appearance preference saved.' });
    await expect(toast.last()).toBeVisible();
    await toast.last().getByRole('button', { name: 'Dismiss notification' }).click();
    if (theme !== 'system') {
      await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-02');
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: join(screenshotDirectory, `settings-appearance-${width}.png`),
    fullPage: true,
  });
  await page.goto('/home');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('one-more.theme')))
    .toBe('system');
});

test('main screens localize in Greek', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chromium';
  // No backend in the test run: answer every Supabase call with an empty list.
  await page.route('**/*.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Language: English' })).toBeEnabled();
  await page.getByRole('button', { name: 'Language: English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Βρες τον επόμενο αγώνα σου' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Κύρια πλοήγηση' })
    .getByRole('link', { name: mobile ? 'Δημιουργία' : 'Δημιουργία αγώνα' })
    .click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
});
