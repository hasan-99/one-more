import { expect, test, type Page } from '@playwright/test';

const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';

async function signedIn(page: Page) {
  await page.addInitScript((id) => {
    const t = Math.floor(Date.now() / 1000);
    localStorage.setItem('one-more.locale', 'en');
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
  const tables: Record<string, unknown> = {
    profiles: { id: userId, onboarding_complete: true, display_name: 'Hasan', language: 'en' },
    cities: [{ id: 'c-1', slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία' }],
    areas: [],
  };
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tables[t] ?? []),
    });
  });
}

test('back, forward, reload and deep links keep working', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByLabel('Password')).toBeVisible();
  await page.goto('/sign-up');
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.reload();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  // A deep link to a private page sends a signed-out visitor to sign in and remembers the target.
  await page.goto('/teams/00000000-0000-4000-8000-000000000001');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
});

test('keyboard users can skip the navigation and reach every main section', async ({ page }) => {
  await signedIn(page);
  await page.goto('/explore');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeAttached();
  for (const [label, path] of [
    ['Teams', /\/teams$/],
    ['Explore', /\/explore$/],
  ] as const) {
    await page.getByRole('navigation').getByRole('link', { name: label }).first().click();
    await expect(page).toHaveURL(path);
  }
  await expect(page.getByRole('navigation').first()).toBeVisible();
});
