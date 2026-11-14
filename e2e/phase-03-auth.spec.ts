import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

test('signup shows validation and localized account creation form', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page.getByRole('button', { name: /^Switch theme to/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByText('Enter a name in English between 2 and 40 characters.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Name in English')).toBeVisible();
  await expect(page.getByLabel('Phone number')).toBeVisible();
  await page.goto('/sign-in');
  const languageToggle = page.getByRole('button', { name: 'Switch language to Greek' });
  await expect(languageToggle).toContainText('EN');
  await languageToggle.click();
  await expect(page.getByRole('status')).toContainText('Η προτίμηση γλώσσας αποθηκεύτηκε.');
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Αλλαγή γλώσσας σε English' })).toContainText('EL');
});

test('auth fields accept tap and keyboard input on every credential screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('/sign-in');
  const signInEmail = page.getByLabel('Email address');
  await signInEmail.click();
  await page.keyboard.type('player@example.invalid');
  await expect(signInEmail).toHaveValue('player@example.invalid');
  const signInPassword = page.getByLabel('Password');
  await signInPassword.click();
  await page.keyboard.type('safe-password-123');
  await expect(signInPassword).toHaveValue('safe-password-123');

  await page.goto('/sign-up');
  const signUpName = page.getByLabel('Name in English');
  await signUpName.click();
  await page.keyboard.type('Player Example');
  await expect(signUpName).toHaveValue('Player Example');
  const signUpPhone = page.getByLabel('Phone number');
  await signUpPhone.click();
  await page.keyboard.type('+35799123456');
  await expect(signUpPhone).toHaveValue('+35799123456');

  await page.goto('/forgot-password');
  const recoveryEmail = page.getByLabel('Email address');
  await recoveryEmail.click();
  await page.keyboard.type('player@example.invalid');
  await expect(recoveryEmail).toHaveValue('player@example.invalid');

  await page.goto('/verify-email?email=player%40example.invalid');
  const verificationCode = page.getByLabel('Email verification code');
  await verificationCode.click();
  await page.keyboard.type('12345678');
  await expect(verificationCode).toHaveValue('12345678');
});

test('successful signup opens code verification with the resend cooldown', async ({ page }) => {
  let submittedMetadata: Record<string, unknown> | undefined;
  await page.route('**/auth/v1/signup**', async (route) => {
    submittedMetadata = route.request().postDataJSON().data;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({
        id: 'cf48b0df-2dd8-43aa-9091-e21f0c0bd3fe',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'player@example.invalid',
        email_confirmed_at: null,
        phone: '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [{ identity_id: 'player@example.invalid', provider: 'email', id: 'player-id' }],
        created_at: '2026-11-12T00:00:00Z',
        updated_at: '2026-11-12T00:00:00Z',
      }),
    });
  });
  await page.goto('/sign-up');
  await page.getByLabel('Name in English').fill('Player Example');
  await page.getByLabel('Phone number').fill('+357 99 123456');
  await page.getByLabel('Email address').fill('player@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('safe-password-123');
  await page.getByLabel('Confirm password').fill('safe-password-123');
  await page.getByRole('checkbox', { name: 'I agree to the terms and privacy notice.' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
  expect(submittedMetadata).toMatchObject({
    display_name: 'Player Example',
    phone: '+357 99 123456',
  });
  const verificationUrl = new URL(page.url());
  expect(verificationUrl.searchParams.get('email')).toBe('player@example.invalid');
  const resendAfter = Number(verificationUrl.searchParams.get('resendAfter'));
  expect(resendAfter).toBeGreaterThan(Date.now());
  expect(resendAfter).toBeLessThanOrEqual(Date.now() + 60_000);
  await expect(page.getByRole('button', { name: /Resend code in (59|60)s/ })).toBeDisabled();
});

test('an expired signup code is rejected without creating a session', async ({ page }) => {
  let verifyRequests = 0;
  await page.route('**/auth/v1/verify**', async (route) => {
    verifyRequests += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({
        error_code: 'otp_expired',
        msg: 'Email link is invalid or has expired',
      }),
    });
  });
  await page.goto('/verify-email?email=player%40example.invalid');
  const codeField = page.getByLabel('Email verification code');
  await codeField.fill('1234567');
  await expect(page.getByRole('button', { name: 'Verify email' })).toBeDisabled();
  await codeField.fill('12345678');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'That code is invalid or expired. Request another code.',
  );
  await expect(page).toHaveURL(/\/verify-email\?/);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  expect(verifyRequests).toBe(1);
});

test('a verified signup session saves profile onboarding with the signup name', async ({
  page,
}) => {
  const userId = 'cf48b0df-2dd8-43aa-9091-e21f0c0bd3fe';
  const email = 'player@example.invalid';
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
      user_metadata: {},
    }),
    'mock-signature',
  ].join('.');
  const cityId = 'nicosia-city-id';
  const areaId = 'strovolos-area-id';
  let savedProfile: Record<string, unknown> | null = null;
  let savedPreferences: Record<string, unknown> | null = null;
  await page.route('**/auth/v1/verify**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({
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
          phone: '',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: new Date(now * 1000).toISOString(),
          updated_at: new Date(now * 1000).toISOString(),
        },
      }),
    }),
  );
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    if (table === 'profiles') {
      if (route.request().method() === 'PATCH') {
        savedProfile = route.request().postDataJSON();
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          url.searchParams.get('select') === 'onboarding_complete'
            ? { onboarding_complete: savedProfile?.onboarding_complete === true }
            : {
                id: userId,
                display_name: savedProfile?.display_name ?? 'Player Example',
                phone: '+357 99 123456',
                avatar_path: null,
                city_id: savedProfile?.city_id ?? null,
                area_id: savedProfile?.area_id ?? null,
                preferred_position: savedProfile?.preferred_position ?? null,
                skill_level: savedProfile?.skill_level ?? null,
                language: 'en',
                onboarding_complete: savedProfile?.onboarding_complete === true,
                created_at: new Date(now * 1000).toISOString(),
                updated_at: new Date(now * 1000).toISOString(),
              },
        ),
      });
    } else if (table === 'cities') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: cityId,
            slug: 'nicosia',
            name_en: 'Nicosia',
            name_el: 'Λευκωσία',
            country_code: 'CY',
            created_at: new Date(now * 1000).toISOString(),
          },
        ]),
      });
    } else if (table === 'areas') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: areaId,
            city_id: cityId,
            slug: 'strovolos',
            name_en: 'Strovolos',
            name_el: 'Στρόβολος',
            created_at: new Date(now * 1000).toISOString(),
          },
        ]),
      });
    } else if (table === 'user_preferences') {
      if (route.request().method() === 'PATCH') {
        savedPreferences = route.request().postDataJSON();
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: userId,
          preferred_formats: savedPreferences?.preferred_formats ?? [5, 7],
          availability_slots: [],
          max_radius_km: 25,
          created_at: new Date(now * 1000).toISOString(),
          updated_at: new Date(now * 1000).toISOString(),
        }),
      });
    } else if (table === 'notification_preferences') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: userId,
          in_app_enabled: true,
          discovery_email_enabled: false,
          chat_email_enabled: true,
          created_at: new Date(now * 1000).toISOString(),
          updated_at: new Date(now * 1000).toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
  await page.getByLabel('Email verification code').fill('12345678');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  // Step 1 holds name, city and area; the signup name is prefilled and the card cannot continue
  // until a city and home area are chosen.
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Player Example');
  await expect(page.getByRole('button', { name: 'Add name, city and area' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Nicosia' }).click();
  await page.getByRole('radio', { name: 'Strovolos' }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('radio', { name: /Midfielder/ }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Create my card' }).click();
  await expect(page.getByRole('heading', { name: /Your card is ready/ })).toBeVisible();
  expect(savedProfile).toMatchObject({
    display_name: 'Player Example',
    city_id: cityId,
    area_id: areaId,
    preferred_position: 'midfielder',
    onboarding_complete: true,
  });
  expect(savedPreferences).toMatchObject({ preferred_formats: [5, 7], max_radius_km: 25 });
});

test('OTP resend observes a 60-second cooldown and resets it after a successful send', async ({
  page,
}) => {
  let resendRequests = 0;
  await page.route('**/auth/v1/resend**', async (route) => {
    resendRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({}),
    });
  });
  const resendAfter = Date.now() + 2_000;
  await page.goto(`/verify-email?email=player%40example.invalid&resendAfter=${resendAfter}`);
  const resendButton = page.getByRole('button', { name: /Resend code/ });
  await expect(resendButton).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Resend code' })).toBeEnabled({ timeout: 5_000 });
  await resendButton.click();
  await expect(page.getByRole('status')).toContainText('Check your inbox for the next step.');
  await expect(page.getByRole('button', { name: /Resend code in 60s/ })).toBeDisabled();
  expect(resendRequests).toBe(1);
});

test('OTP resend rate limits show a toast and restart the cooldown', async ({ page }) => {
  await page.route('**/auth/v1/resend**', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({
        error_code: 'over_email_send_rate_limit',
        msg: 'Too many emails sent',
      }),
    }),
  );
  await page.goto('/verify-email?email=player%40example.invalid');
  await page.getByRole('button', { name: 'Resend code' }).click();
  await expect(page.getByRole('alert')).toContainText('Wait before requesting another code.');
  await expect(page.getByRole('button', { name: /Resend code in 60s/ })).toBeDisabled();
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
  await page.getByLabel('Name in English').fill('Player Example');
  await page.getByLabel('Phone number').fill('+357 99 123456');
  await page.getByLabel('Email address').fill('player@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('safe-password-123');
  await page.getByLabel('Confirm password').fill('safe-password-123');
  await page.getByRole('checkbox', { name: 'I agree to the terms and privacy notice.' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'This email is already registered. Sign in instead.',
  );
});

test('an obfuscated duplicate signup response offers sign in without opening code verification', async ({
  page,
}) => {
  await page.route('**/auth/v1/signup**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'X-Supabase-Api-Version': '2024-01-01' },
      body: JSON.stringify({
        id: 'obfuscated-user-id',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'player@example.invalid',
        email_confirmed_at: null,
        phone: '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-11-12T00:00:00Z',
        updated_at: '2026-11-12T00:00:00Z',
      }),
    }),
  );
  await page.goto('/sign-up');
  await page.getByLabel('Name in English').fill('Player Example');
  await page.getByLabel('Phone number').fill('+357 99 123456');
  await page.getByLabel('Email address').fill('player@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('safe-password-123');
  await page.getByLabel('Confirm password').fill('safe-password-123');
  await page.getByRole('checkbox', { name: 'I agree to the terms and privacy notice.' }).click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'This email is already registered. Sign in instead.',
  );
  await expect(page).not.toHaveURL(/\/verify-email/);
});

test('a failed preference save shows a dismissible error toast', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'one-more.locale') throw new Error('storage unavailable');
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto('/sign-up');
  await page.getByRole('button', { name: 'Switch language to Greek' }).click();
  const errorToast = page.getByRole('alert');
  await expect(errorToast).toContainText(
    'Δεν ήταν δυνατή η αποθήκευση της προτίμησης. Δοκίμασε ξανά.',
  );
  await errorToast.getByRole('button', { name: 'Κλείσιμο ειδοποίησης' }).click();
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
    await page.goto('/');
    await page.evaluate(
      (value) => localStorage.setItem('one-more.theme', value),
      theme.toLowerCase(),
    );
    await page.reload();
    await page.goto('/sign-up');
    await expect(page.locator('html')).toHaveCSS('color-scheme', theme.toLowerCase());
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
