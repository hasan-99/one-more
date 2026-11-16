import { expect, test, type Page } from '@playwright/test';

const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
const iso = new Date().toISOString();

async function setup(page: Page, locale: 'en' | 'el', unread: () => number) {
  await page.addInitScript(
    ({ id, loc }) => {
      const t = Math.floor(Date.now() / 1000);
      localStorage.setItem('one-more.locale', loc);
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
    { id: userId, loc: locale },
  );
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const t = new URL(request.url()).pathname.split('/').pop() ?? '';
    if (t === 'inbox_notifications') {
      const n = unread();
      if (request.method() === 'HEAD') {
        await route.fulfill({
          status: 200,
          headers: {
            'content-range': `*/${n}`,
            'access-control-allow-origin': '*',
            'access-control-expose-headers': 'content-range',
          },
          body: '',
        });
        return;
      }
      const rows = Array.from({ length: Math.min(n, 3) }, (_, i) => ({
        id: `n${i}`,
        recipient_id: userId,
        outbox_id: `o${i}`,
        event_type: 'match_join_approved',
        title_key: 'match_join_approved',
        body_key: 'match_join_approved',
        href: '/home',
        created_at: iso,
        read_at: null,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': `0-${rows.length}/${n}`,
          'access-control-allow-origin': '*',
          'access-control-expose-headers': 'content-range',
        },
        body: JSON.stringify(rows),
      });
      return;
    }
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
}

test('the bell sits beside the language switch and shows the unread count', async ({ page }) => {
  let unread = 3;
  await setup(page, 'en', () => unread);
  await page.goto('/home');
  const bell = page.getByRole('button', { name: 'Notifications, 3 unread' });
  await expect(bell).toBeVisible();
  await expect(bell.getByText('3', { exact: true })).toBeVisible();
  const language = page.getByRole('button', { name: /^Language:/ });
  const a = (await bell.boundingBox())!;
  const b = (await language.boundingBox())!;
  expect(Math.abs(a.y + a.height / 2 - (b.y + b.height / 2))).toBeLessThan(2);
  expect(a.x + a.width).toBeLessThanOrEqual(b.x);
  expect(b.x - (a.x + a.width)).toBeLessThan(16);
  await page.locator('#main-content').waitFor();
  await page.screenshot({
    path: '/tmp/pgt2/bell-3.png',
    clip: { x: 0, y: 0, width: 393, height: 130 },
  });

  // More than 99 shows 99+.
  unread = 120;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Notifications, 120 unread' })).toBeVisible();
  await expect(page.getByText('99+', { exact: true })).toBeVisible();

  // Nothing unread: no number.
  unread = 0;
  await page.reload();
  const none = page.getByRole('button', { name: 'Notifications, none unread' });
  await expect(none).toBeVisible();
  await expect(none.getByText(/^\d+\+?$/)).toHaveCount(0);

  // Tapping opens the Notifications page, with a way back.
  await none.click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { name: 'Notifications' }).first()).toBeVisible();
  await page.getByRole('button', { name: /Back/ }).first().click();
  await expect(page).not.toHaveURL(/\/notifications$/);
});

test('the bell label is in Greek, and signed-out visitors do not see a bell', async ({ page }) => {
  await setup(page, 'el', () => 2);
  await page.goto('/home');
  await expect(page.getByRole('button', { name: 'Ειδοποιήσεις, 2 μη αναγνωσμένες' })).toBeVisible();
});

test('a signed-out visitor sees no bell', async ({ page }) => {
  await page.route('**/*.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: /^Language:/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Notifications/ })).toHaveCount(0);
});
