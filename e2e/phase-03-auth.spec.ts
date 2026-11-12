import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('signup shows validation and localized account creation form', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.goto('/sign-in');
  const languageToggle = page.getByRole('button', { name: 'Switch language to Greek' });
  await expect(languageToggle).toContainText('EN');
  await languageToggle.click();
  await expect(page.getByRole('status')).toContainText('Η προτίμηση γλώσσας αποθηκεύτηκε.');
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Αλλαγή γλώσσας σε English' })).toContainText('EL');
});

test('wrong password is announced in a dismissible error toast', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({ code: 'invalid_credentials', msg: 'Invalid login credentials' }),
    }),
  );
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill('player@example.invalid');
  await page.getByLabel('Password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const errorToast = page.getByRole('alert');
  await expect(errorToast).toContainText('Email or password is incorrect.');
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-03');
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: join(screenshotDirectory, `toast-invalid-credentials-${test.info().project.name}.png`),
  });
  await errorToast.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(errorToast).toHaveCount(0);
});

test('an existing account receives a sign-in hint instead of a generic error', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({ code: 'user_already_exists', msg: 'User already registered' }),
    }),
  );
  await page.goto('/sign-up');
  await page.getByLabel('Email address').fill('player@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('safe-password-123');
  await page.getByLabel('Confirm password').fill('safe-password-123');
  await page.getByRole('checkbox', { name: 'I agree to the terms and privacy notice.' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'An account already uses this email. Sign in instead.',
  );
});

test('a failed preference save shows a dismissible error toast', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'one-more.theme') throw new Error('storage unavailable');
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto('/sign-up');
  await page.getByRole('button', { name: /^Switch theme to (dark|light)$/ }).click();
  const errorToast = page.getByRole('alert');
  await expect(errorToast).toContainText('Your preference could not be saved. Please try again.');
  await errorToast.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(errorToast).toHaveCount(0);
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
    const themeToggle = page.getByRole('button', {
      name: `Switch theme to ${theme.toLowerCase()}`,
    });
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      const toast = page.getByRole('status').filter({ hasText: 'preference saved' });
      await expect(toast.last()).toBeVisible();
      await toast.last().getByRole('button', { name: 'Dismiss notification' }).click();
    }
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
