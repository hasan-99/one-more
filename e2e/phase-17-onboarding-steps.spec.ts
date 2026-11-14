import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const userId = 'b0a9f6f4-2f2b-4bd5-9e53-6a4f1d7c91aa';
const nicosiaId = 'nicosia-city';
const limassolId = 'limassol-city';
const strovolosId = 'strovolos-area';
const now = Math.floor(Date.now() / 1000);
const iso = new Date(now * 1000).toISOString();

async function signInWithIncompleteProfile(page: Page) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ aud: 'authenticated', role: 'authenticated', sub: userId, email: 'steps@example.invalid', exp: now + 3600, iat: now }),
    'mock-signature',
  ].join('.');
  const session = {
    access_token: token,
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'steps@example.invalid', email_confirmed_at: iso, app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: iso, updated_at: iso },
  };
  await page.addInitScript((savedSession) => {
    localStorage.setItem('one-more.theme', 'dark');
    localStorage.setItem('one-more.locale', 'en');
    localStorage.setItem('sb-ejlyaerurkjgsylrsthl-auth-token', JSON.stringify(savedSession));
  }, session);

  const saved: { profile: Record<string, unknown> | null; preferences: Record<string, unknown> | null } = { profile: null, preferences: null };
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop() ?? '';
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (table === 'profiles') saved.profile = body;
      if (table === 'user_preferences') saved.preferences = body;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    const complete = saved.profile?.onboarding_complete === true;
    const records: Record<string, unknown> = {
      profiles: { id: userId, display_name: '', phone: '+35799123456', city_id: null, area_id: null, preferred_position: null, skill_level: null, strong_foot: 'right', shirt_number: 8, language: 'en', onboarding_complete: complete, avatar_path: null, created_at: iso, updated_at: iso },
      cities: [
        { id: nicosiaId, slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία', country_code: 'CY', created_at: iso },
        { id: limassolId, slug: 'limassol', name_en: 'Limassol', name_el: 'Λεμεσός', country_code: 'CY', created_at: iso },
      ],
      areas: [
        { id: strovolosId, city_id: nicosiaId, slug: 'strovolos', name_en: 'Strovolos', name_el: 'Στρόβολος', created_at: iso },
        { id: 'engomi-area', city_id: nicosiaId, slug: 'engomi', name_en: 'Engomi', name_el: 'Έγκωμη', created_at: iso },
        { id: 'germasogeia-area', city_id: limassolId, slug: 'germasogeia', name_en: 'Germasogeia', name_el: 'Γερμασόγεια', created_at: iso },
      ],
      user_preferences: { user_id: userId, preferred_formats: [], availability_slots: [], max_radius_km: null, timezone: 'Asia/Nicosia', created_at: iso, updated_at: iso },
      notification_preferences: { user_id: userId, in_app_enabled: true, discovery_email_enabled: false, chat_email_enabled: false, native_push_enabled: false, transactional_email_enabled: true, created_at: iso, updated_at: iso },
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(records[table] ?? []) });
  });
  return saved;
}

/** The whole step must fit the screen: nothing scrolls vertically or sideways. */
async function expectNoScroll(page: Page) {
  const size = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(size.scrollHeight).toBeLessThanOrEqual(size.innerHeight);
  expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth);
}

test('the first-run profile is a step-by-step flow that fills in the player card', async ({ page }, testInfo) => {
  const saved = await signInWithIncompleteProfile(page);
  const width = testInfo.project.name === 'mobile-chromium' ? 393 : 1440;
  await page.setViewportSize({ width, height: width < 600 ? 852 : 900 });
  const shots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  mkdirSync(shots, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: join(shots, `onboarding-${name}-${width < 600 ? 'mobile' : 'desktop'}.png`) });

  await page.goto('/create');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('progressbar', { name: 'Step 1 of 4' })).toBeVisible();

  // Step 1: name, shirt number, city and area. Continue stays off until all three are set.
  const cta = page.getByRole('button', { name: 'Add name, city and area' });
  await expect(cta).toBeDisabled();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Alex Demo');
  await expect(page.getByRole('img', { name: 'Your player card: Alex Demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Raise shirt number' }).click();
  await page.getByRole('button', { name: 'Shirt number 10' }).click();
  await expect(page.getByLabel('Shirt number 10', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Strovolos' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Nicosia' }).click();
  await expect(page.getByRole('radio', { name: 'Germasogeia' })).toHaveCount(0);
  await expect(cta).toBeDisabled();
  await page.getByRole('radio', { name: 'Strovolos' }).click();
  await expectNoScroll(page);
  await shot('step-1');
  await page.getByRole('button', { name: /^Continue/ }).click();

  // Step 2: position. The first step is not skippable, this one is; the pill needs a pick.
  await expect(page.getByRole('heading', { name: 'Where on the pitch?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pick a position' })).toBeDisabled();
  await page.getByRole('radio', { name: /Midfielder/ }).click();
  await expectNoScroll(page);
  await shot('step-2');
  await page.getByRole('button', { name: /^Continue/ }).click();

  // Step 3: strong foot and level; the level changes the card colour.
  await expect(page.getByRole('heading', { name: 'How do you play?' })).toBeVisible();
  await page.getByRole('radio', { name: 'Left Foot' }).click();
  await page.getByRole('radio', { name: 'Competitive' }).click();
  await expectNoScroll(page);
  await shot('step-3');
  await page.getByRole('button', { name: /^Continue/ }).click();

  // Step 4: days and formats, each with an "all" option shown as one clear label on the card.
  await expect(page.getByRole('heading', { name: 'When can you play?' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Tuesday' }).click();
  await page.getByRole('checkbox', { name: 'Thursday' }).click();
  await page.getByRole('checkbox', { name: '7v7' }).click();
  await expectNoScroll(page);
  await shot('step-4');
  await page.getByRole('checkbox', { name: 'Any day' }).click();
  await expect(page.getByRole('checkbox', { name: 'Monday' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Sunday' })).toBeChecked();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'How do you play?' })).toBeVisible();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: 'Create my card' }).click();

  // Card ready: saved with everything chosen, then the next move.
  await expect(page.getByRole('heading', { name: 'Your card is ready' })).toBeVisible();
  await expectNoScroll(page);
  await page.waitForTimeout(900);
  await shot('done');
  expect(saved.profile).toMatchObject({
    display_name: 'Alex Demo',
    city_id: nicosiaId,
    area_id: strovolosId,
    preferred_position: 'midfielder',
    skill_level: 'advanced',
    strong_foot: 'left',
    shirt_number: 10,
    onboarding_complete: true,
  });
  expect(saved.preferences).toMatchObject({
    preferred_formats: [7],
    availability_slots: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  });
  await page.getByRole('button', { name: /Create my team/ }).click();
  await expect(page).toHaveURL(/\/teams\/create$/);
});

test('optional steps can be skipped and the profile still saves', async ({ page }) => {
  const saved = await signInWithIncompleteProfile(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/onboarding');
  await page.getByRole('textbox', { name: 'Your name' }).fill('Sam Skip');
  await page.getByRole('radio', { name: 'Limassol' }).click();
  await page.getByRole('radio', { name: 'Germasogeia' }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('heading', { name: 'Your card is ready' })).toBeVisible();
  expect(saved.profile).toMatchObject({
    display_name: 'Sam Skip',
    city_id: limassolId,
    area_id: 'germasogeia-area',
    preferred_position: null,
    skill_level: null,
    onboarding_complete: true,
  });
  expect(saved.preferences).toMatchObject({ preferred_formats: [], availability_slots: [] });
  await page.getByRole('button', { name: 'See my profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});
