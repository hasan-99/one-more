import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('profile matches the animated player reference and saves editable details', async ({ page }, testInfo) => {
  const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
  const cityId = 'nicosia-city';
  const areaId = 'strovolos-area';
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ aud: 'authenticated', role: 'authenticated', sub: userId, email: 'profile@example.invalid', exp: now + 3600, iat: now }),
    'mock-signature',
  ].join('.');
  const session = {
    access_token: token,
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'profile@example.invalid', email_confirmed_at: new Date(now * 1000).toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { display_name: 'Profile Player' }, identities: [], created_at: new Date(now * 1000).toISOString(), updated_at: new Date(now * 1000).toISOString() },
  };
  await page.addInitScript((savedSession) => {
    localStorage.setItem('one-more.theme', 'dark');
    localStorage.setItem('one-more.locale', 'en');
    localStorage.setItem('sb-ejlyaerurkjgsylrsthl-auth-token', JSON.stringify(savedSession));
  }, session);

  let savedProfile: Record<string, unknown> = {};
  let savedNotifications: Record<string, unknown> = {};
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop() ?? '';
    if (table === 'profiles' && route.request().method() === 'PATCH') {
      savedProfile = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (table === 'notification_preferences' && route.request().method() === 'PATCH') {
      savedNotifications = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const records: Record<string, unknown> = {
      profiles: { id: userId, display_name: 'Profile Player', phone: '+35799123456', city_id: cityId, area_id: areaId, preferred_position: 'midfielder', skill_level: 'intermediate', strong_foot: 'right', shirt_number: 8, language: 'en', onboarding_complete: true, avatar_path: null, created_at: new Date(now * 1000).toISOString(), updated_at: new Date(now * 1000).toISOString() },
      cities: [{ id: cityId, slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία' }],
      areas: [{ id: areaId, city_id: cityId, name_en: 'Strovolos', name_el: 'Στρόβολος', created_at: new Date(now * 1000).toISOString() }],
      user_preferences: { user_id: userId, preferred_formats: [5, 7], availability_slots: ['weekday_evening', 'weekend_evening'], max_radius_km: 20, timezone: 'Asia/Nicosia', created_at: new Date(now * 1000).toISOString(), updated_at: new Date(now * 1000).toISOString() },
      notification_preferences: { user_id: userId, in_app_enabled: true, discovery_email_enabled: false, chat_email_enabled: false, native_push_enabled: false, transactional_email_enabled: true, created_at: new Date(now * 1000).toISOString(), updated_at: new Date(now * 1000).toISOString() },
      get_my_teams: [],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(records[table] ?? []) });
  });

  const width = testInfo.project.name === 'mobile-chromium' ? 393 : 1440;
  await page.setViewportSize({ width, height: width < 600 ? 852 : 900 });
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'Share my player card' })).toBeVisible();
  await expect(page.getByText('Profile Player')).toBeVisible();
  await expect(page.getByText('Strovolos, Nicosia')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where you play' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Play style' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Midfielder' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: join(screenshotDirectory, width < 600 ? 'profile-mobile.png' : 'profile-desktop.png'), fullPage: true });

  const autosave = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/rest/v1/profiles'));
  await page.getByRole('button', { name: 'Raise shirt number' }).click();
  await page.getByRole('radio', { name: 'Defender' }).click();
  await page.getByRole('radio', { name: 'Left foot' }).click();
  await page.getByRole('checkbox', { name: 'Wednesday' }).click();
  await autosave;
  await expect.poll(() => savedProfile.strong_foot).toBe('left');
  expect(savedProfile.shirt_number).toBe(9);
  expect(savedProfile.preferred_position).toBe('defender');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Your profile was saved.' }).last()).toBeVisible();

  const reminders = page.getByRole('switch', { name: 'Game reminders by email' });
  await reminders.click();
  await expect(reminders).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('status').filter({ hasText: 'Notification preferences saved.' }).last()).toBeVisible();
  expect(savedNotifications.transactional_email_enabled).toBe(false);

  await page.getByRole('button', { name: 'Share my player card' }).click();
  await expect(page.getByRole('heading', { name: 'Your player card' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Your player card: Profile Player' })).toBeVisible();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: join(screenshotDirectory, width < 600 ? 'profile-share-card-mobile.png' : 'profile-share-card-desktop.png'),
  });
  const cardDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  expect((await cardDownload).suggestedFilename()).toBe('one-more-player-card.png');
  await expect(page.getByRole('status').filter({ hasText: 'Player card downloaded.' })).toBeVisible();
  const shareDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '↥ Share', exact: true }).click();
  expect((await shareDownload).suggestedFilename()).toBe('one-more-player-card.png');
  await page.getByRole('button', { name: 'Close player card' }).click();

  await page.addInitScript(() => localStorage.setItem('one-more.locale', 'el'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page.getByRole('button', { name: 'Κοινοποίηση της κάρτας παίκτη μου' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Πού παίζεις' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByRole('button', { name: 'Κοινοποίηση της κάρτας παίκτη μου' }).click();
  await expect(page.getByRole('heading', { name: 'Η κάρτα παίκτη σου' })).toBeVisible();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({ path: join(screenshotDirectory, width < 600 ? 'profile-share-card-mobile-el.png' : 'profile-share-card-desktop-el.png') });
  await page.getByRole('button', { name: 'Κλείσιμο κάρτας παίκτη' }).click();
});
