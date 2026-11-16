import { expect, test, type Page } from '@playwright/test';

const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
const iso = new Date().toISOString();

async function signedIn(page: Page, locale: 'en' | 'el' = 'en') {
  await page.addInitScript(
    ({ id, loc }) => {
      const t = Math.floor(Date.now() / 1000);
      localStorage.setItem('one-more.locale', loc);
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
}

const tables: Record<string, unknown> = {
  profiles: { id: userId, onboarding_complete: true, display_name: 'Hasan', language: 'en' },
  user_preferences: {
    user_id: userId,
    preferred_formats: [5],
    availability_slots: ['mon'],
    max_radius_km: 20,
    timezone: 'Asia/Nicosia',
    created_at: iso,
    updated_at: iso,
  },
  notification_preferences: {
    user_id: userId,
    in_app_enabled: true,
    discovery_email_enabled: false,
    chat_email_enabled: false,
    native_push_enabled: false,
    transactional_email_enabled: true,
    created_at: iso,
    updated_at: iso,
  },
};

test.describe('public legal and support pages', () => {
  for (const [path, heading] of [
    ['/privacy', 'Privacy Policy'],
    ['/terms', 'Terms of Use'],
    ['/support', 'Support'],
    ['/delete-account', 'Delete your ONE MORE account'],
    ['/licenses', 'Open-source licences'],
  ] as const) {
    test(`${path} opens without signing in and has real content`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
      await expect(page.getByText(/placeholder|pending review|not ready/i)).toHaveCount(0);
      // The long text loads lazily, so wait for it instead of reading the page once.
      await expect
        .poll(async () => (await page.locator('body').innerText()).length)
        .toBeGreaterThan(900);
    });
  }

  test('the privacy page is available in Greek', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('one-more.locale', 'el'));
    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', { name: 'Πολιτική Απορρήτου', exact: true }).first(),
    ).toBeVisible();
  });

  test('landing and sign-up link to privacy, terms and support', async ({ page }) => {
    for (const path of ['/', '/sign-up']) {
      await page.goto(path);
      const links = page.getByRole('navigation', { name: 'Legal and support' });
      await expect(links.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
      await expect(links.getByRole('link', { name: 'Terms of Use' })).toBeVisible();
      await expect(links.getByRole('link', { name: 'Support' })).toBeVisible();
    }
  });
});

test('settings links to every legal page and lists blocked players', async ({ page }) => {
  await signedIn(page);
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const body =
      t === 'get_my_blocked_users'
        ? [{ user_id: 'u2', display_name: 'Annoying Andy', blocked_at: iso }]
        : (tables[t] ?? []);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/settings');
  const links = page.getByRole('navigation', { name: 'Legal and support' });
  for (const name of [
    'Privacy Policy',
    'Terms of Use',
    'Support',
    'Delete account (web page)',
    'Open-source licences',
  ]) {
    await expect(links.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.getByText('Annoying Andy')).toBeVisible();
  let unblocked = false;
  await page.route('**/rest/v1/rpc/unblock_user', async (route) => {
    unblocked = JSON.stringify(route.request().postDataJSON()) === '{"p_user_id":"u2"}';
    await route.fulfill({ status: 204, body: '' });
  });
  await page.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText('Annoying Andy')).toHaveCount(0);
  expect(unblocked).toBe(true);
});

test('account deletion in settings deletes immediately and signs the user out', async ({
  page,
}) => {
  await signedIn(page);
  let deleted = false;
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const t = url.pathname.split('/').pop() ?? '';
    if (t === 'delete_my_account') {
      deleted = true;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tables[t] ?? []),
    });
  });
  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByText(/permanently deletes your account/i)).toBeVisible();
  await page.getByRole('button', { name: 'Yes, delete my account permanently' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(deleted).toBe(true);
  const token = await page.evaluate(() =>
    localStorage.getItem('sb-ejlyaerurkjgsylrsthl-auth-token'),
  );
  expect(token).toBeNull();
});

test('blocking a player in a game chat hides them and calls block_user', async ({ page }) => {
  await signedIn(page);
  let blocked: string | null = null;
  const messages = (hide: boolean) =>
    [
      {
        id: 'm1',
        match_id: 'g1',
        sender_id: 'u2',
        sender_name: 'Annoying Andy',
        body: 'rude message',
        status: 'visible',
        created_at: iso,
      },
      {
        id: 'm2',
        match_id: 'g1',
        sender_id: 'u3',
        sender_name: 'Friendly Fay',
        body: 'see you at 8',
        status: 'visible',
        created_at: iso,
      },
    ]
      .reverse() // the server returns newest first
      .filter((m) => !(hide && m.sender_id === 'u2'));
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    let body: unknown = tables[t] ?? [];
    if (t === 'get_match_chat_role') body = 'player';
    if (t === 'get_match_chat_messages') body = messages(blocked !== null);
    if (t === 'block_user') {
      blocked = (route.request().postDataJSON() as { p_user_id: string }).p_user_id;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  // Minimal realtime server: accept the channel join so the chat does not show a connection error.
  await page.routeWebSocket(/realtime/, (ws) => {
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw)) as {
        topic: string;
        event: string;
        ref: string;
        join_ref?: string;
        payload: {
          config?: {
            postgres_changes?: { event: string; schema: string; table: string; filter?: string }[];
          };
        };
      };
      if (msg.event === 'phx_join') {
        const changes = (msg.payload.config?.postgres_changes ?? []).map((c, i) => ({
          id: i + 1,
          ...c,
        }));
        ws.send(
          JSON.stringify({
            topic: msg.topic,
            event: 'phx_reply',
            ref: msg.ref,
            join_ref: msg.join_ref,
            payload: { status: 'ok', response: { postgres_changes: changes } },
          }),
        );
      } else if (msg.event === 'heartbeat') {
        ws.send(
          JSON.stringify({
            topic: 'phoenix',
            event: 'phx_reply',
            ref: msg.ref,
            payload: { status: 'ok', response: {} },
          }),
        );
      }
    });
  });
  await page.goto('/chat/g1');
  await expect(page.getByText('rude message')).toBeVisible();
  await page.getByRole('button', { name: 'Block player' }).first().click();
  await expect(page.getByText('rude message')).toHaveCount(0);
  await expect(page.getByText('see you at 8')).toBeVisible();
  expect(blocked).toBe('u2');
});
