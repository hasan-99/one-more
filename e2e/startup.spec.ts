import { expect, test } from '@playwright/test';

const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
const iso = new Date().toISOString();

test('startup shows a light spinner, then skips the wait on later launches', async ({ page }) => {
  await page.addInitScript((id) => {
    const t = Math.floor(Date.now() / 1000);
    localStorage.setItem(
      'sb-ejlyaerurkjgsylrsthl-auth-token',
      JSON.stringify({
        access_token: 'x',
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: t + 86400,
        refresh_token: 'r',
        user: {
          id,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'a@b.invalid',
          email_confirmed_at: '2026-01-01T00:00:00Z',
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: '2026-01-01T00:00:00Z',
        },
      }),
    );
  }, userId);

  let profileDelayMs = 2500;
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    if (t === 'profiles') await new Promise((resolve) => setTimeout(resolve, profileDelayMs));
    const body =
      t === 'profiles'
        ? { id: userId, onboarding_complete: true, display_name: 'Hasan', language: 'en' }
        : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  // First launch: no cached answer, so a spinner (not a card with a heading) shows while it loads.
  await page.goto('/home');
  await expect(page.getByRole('progressbar', { name: /Loading your profile/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Loading your profile/ })).toHaveCount(0);
  // A short wait shows nothing extra; after a moment the football and a changing line appear.
  await expect(page.getByText(/Warming up|Lacing up/)).toBeVisible({ timeout: 4000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/pgt2/startup-ball.png' });
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 8000 });
  expect(
    await page.evaluate((id) => localStorage.getItem(`one-more.profile-complete.${id}`), userId),
  ).toBe('1');

  // Next launch: the saved answer opens the app at once, even while the server check is slow.
  profileDelayMs = 4000;
  await page.reload();
  await expect(page.locator('#main-content')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page).toHaveURL(/\/home$/);
});

test('a saved "complete" answer does not hide a profile that turns out to be incomplete', async ({
  page,
}) => {
  await page.addInitScript(
    ({ id }) => {
      const t = Math.floor(Date.now() / 1000);
      localStorage.setItem(`one-more.profile-complete.${id}`, '1');
      localStorage.setItem(
        'sb-ejlyaerurkjgsylrsthl-auth-token',
        JSON.stringify({
          access_token: 'x',
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: t + 86400,
          refresh_token: 'r',
          user: {
            id,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'a@b.invalid',
            email_confirmed_at: '2026-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      );
    },
    { id: userId },
  );
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const body =
      t === 'profiles'
        ? {
            id: userId,
            onboarding_complete: false,
            display_name: null,
            language: 'en',
            created_at: iso,
          }
        : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/home');
  await expect(page).toHaveURL(/\/onboarding$/);
});
