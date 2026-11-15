import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const userId = 'f3476a3f-21b6-4c93-9b01-b63de7a46031';
const matchId = 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b11';
const cityId = 'b4c12c8a-73d1-4eba-9aab-41814988fc07';
const strovolosId = '38d7a3b9-4290-4484-9ae8-9d3588f0a001';

async function seed(page: Page) {
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
            email: 'organizer@example.invalid',
            email_confirmed_at: '2026-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      );
      localStorage.setItem('one-more.theme', 'dark');
      localStorage.setItem('one-more.locale', 'en');
    },
    { id: userId },
  );
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ onboarding_complete: true }),
    }),
  );
  await page.route('**/rest/v1/cities**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: cityId, slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία' },
      ]),
    }),
  );
  await page.route('**/rest/v1/areas**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        [
          ['strovolos', 'Strovolos', 'Στρόβολος'],
          ['aglantzia', 'Aglantzia', 'Αγλαντζιά'],
        ].map(([slug, name_en, name_el], index) => ({
          id: index === 0 ? strovolosId : '38d7a3b9-4290-4484-9ae8-9d3588f0a002',
          city_id: cityId,
          slug,
          name_en,
          name_el,
          created_at: '2026-01-01T00:00:00Z',
        })),
      ),
    }),
  );
}

test('creating a game takes five steps and saves what was chosen', async ({ page }) => {
  await seed(page);
  let saved: { p_match: Record<string, unknown>; p_positions: unknown[] } | undefined;
  await page.route('**/rest/v1/rpc/count_match_published_notifications', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '12' }),
  );
  await page.route('**/rest/v1/rpc/create_match_with_positions', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(matchId),
    });
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/create');
  await expect(page.getByRole('heading', { name: 'Create a game' })).toBeVisible();
  await expect(page.getByRole('img', { name: /5v5 · / })).toBeVisible();

  const body = page.locator('#game-create-step');
  const noScroll = async () =>
    expect(
      await body.evaluate((element) => element.scrollHeight - element.clientHeight),
    ).toBeLessThanOrEqual(1);
  const shots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  await mkdir(shots, { recursive: true });

  // 1. The game: a random name is suggested and can be changed.
  const name = page.getByLabel('Game name');
  await expect(name).not.toHaveValue('');
  await name.fill('Wednesday night 5s');
  await expect(page.getByRole('radio', { name: '7v7' })).toHaveCount(0);
  await noScroll();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(shots, 'create-game-1-mobile.png') });
  const nextButton = page.getByRole('button', { name: /^Next →/ });
  const nextBox = await nextButton.boundingBox();
  await nextButton.click();

  // 2. When: calendar plus two time cards that open a list.
  await page.getByRole('button', { name: /^Hour: / }).click();
  await page.getByRole('radio', { name: /^20 · 8 PM/ }).click();
  await page.getByRole('radio', { name: /^:45/ }).click();
  await expect(page.getByRole('button', { name: /^Hour: 20/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Minutes: 45/ })).toBeVisible();
  await page.getByRole('radio', { name: '120 min' }).click();
  await noScroll();
  await page.screenshot({ path: join(shots, 'create-game-2-mobile.png') });
  await nextButton.click();

  // 3. Where: no area is preselected, so Next asks for one.
  await expect(page.getByRole('button', { name: /Choose an area/ })).toBeDisabled();
  await page.getByRole('radio', { name: 'Nicosia' }).click();
  await page.getByRole('radio', { name: 'Strovolos' }).click();
  await noScroll();
  await nextButton.click();

  // 4. Players: how many are missing and the price (10 euro by default).
  await expect(page.getByRole('radio', { name: '€10' })).toBeChecked();
  await page.getByRole('button', { name: 'One player more' }).click();
  await page.getByRole('radio', { name: '€15' }).click();
  await noScroll();
  await page.screenshot({ path: join(shots, 'create-game-4-mobile.png') });
  await nextButton.click();

  // 5. Publish sits where Next was.
  const publish = page.getByRole('button', { name: 'Publish game' });
  await expect(publish).toBeVisible();
  const publishBox = await publish.boundingBox();
  expect(Math.abs((publishBox?.y ?? 0) - (nextBox?.y ?? 0))).toBeLessThanOrEqual(2);
  await page.screenshot({ path: join(shots, 'create-game-5-mobile.png') });
  await publish.click();
  await expect.poll(() => saved?.p_match.title).toBe('Wednesday night 5s');
  expect(saved?.p_match).toMatchObject({
    side_size: 5,
    duration_minutes: 120,
    price_eur: 15,
    area_id: strovolosId,
    city_id: cityId,
    event_status: 'published',
    reserved_guest_slots: 5,
    skill_level: null,
  });
  expect(String(saved?.p_match.starts_at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:45:00/);
  expect(saved?.p_positions).toHaveLength(5);
  // The celebration shows how many players were told, then View game opens the match.
  await expect(page.getByRole('heading', { name: 'Game published!' })).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible();
  await expect(page.getByText('players notified')).toBeVisible();
  await expect(page.getByText('PUBLISHED', { exact: true })).toBeVisible();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(shots, 'create-game-6-celebration-mobile.png') });
  await page.getByRole('button', { name: 'View game' }).click();
  await expect(page).toHaveURL(new RegExp(`/matches/${matchId}$`));
});

test('a published-game notification shows clear badges', async ({ page }) => {
  await seed(page);
  await page.route('**/rest/v1/inbox_notifications**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'n1',
          recipient_id: userId,
          outbox_id: null,
          event_type: 'match_published',
          title_key: 'notificationMatchPublishedTitle',
          body_key: 'notificationMatchPublishedBody',
          href: `/matches/${matchId}`,
          created_at: new Date().toISOString(),
          read_at: null,
          details: {
            match_id: matchId,
            title: 'Sunday night 5s',
            side_size: 5,
            starts_at: '2026-11-22T19:30:00Z',
            area_name_en: 'Strovolos',
            area_name_el: 'Στρόβολος',
            price_eur: 10,
            open: 4,
          },
        },
      ]),
    }),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/notifications');
  await expect(page.getByText('New game near you')).toBeVisible();
  for (const badge of ['NEW GAME', '5v5', 'Strovolos', '4 needed', '€10']) {
    await expect(page.getByText(badge, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Sunday night 5s')).toBeVisible();
  await page.screenshot({
    path: join(
      process.cwd(),
      'docs',
      'screenshots',
      'phase-17',
      'notification-new-game-mobile.png',
    ),
  });
});

test('saving changes to a published game keeps it published', async ({ page }) => {
  await seed(page);
  const ok = (body: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
  await page.route('**/rest/v1/matches**', (route) =>
    route.fulfill(
      ok({
        id: matchId,
        title: 'Last Whistle',
        side_size: 5,
        city_id: cityId,
        area_id: strovolosId,
        venue_display_name: 'Novo',
        venue_address: 'Strovolos, Nicosia',
        starts_at: '2030-11-18T20:00:00Z',
        duration_minutes: 60,
        skill_level: null,
        price_eur: 10,
        reserved_guest_slots: 9,
        event_status: 'published',
        notes: null,
        booking_status: 'not_booked',
        waitlist_offer_minutes: 15,
      }),
    ),
  );
  await page.route('**/rest/v1/match_position_slots**', (route) => route.fulfill(ok([])));
  await page.route('**/rest/v1/match_booking_private_details**', (route) =>
    route.fulfill(ok(null)),
  );
  await page.route('**/rest/v1/match_discovery**', (route) =>
    route.fulfill(ok({ active_players: 0 })),
  );
  let sent: { p_match: Record<string, unknown> } | undefined;
  await page.route('**/rest/v1/rpc/update_match_with_positions', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill(ok(matchId));
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(`/create?matchId=${matchId}`);
  await expect(page.getByRole('heading', { name: 'Edit game' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '7v7' })).toHaveCount(0);
  await expect(page.getByLabel('Game name')).toHaveValue('Last Whistle');
  // The step bars jump straight to the last step while editing.
  await page.getByRole('button', { name: 'Step 5 of 5' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect.poll(() => sent?.p_match.event_status).toBe('published');
  expect(sent?.p_match).toMatchObject({
    title: 'Last Whistle',
    price_eur: 10,
    duration_minutes: 60,
    side_size: 5,
  });
});

test('the game page shows the ticket, facts and the players number with its bar', async ({
  page,
}) => {
  await seed(page);
  const row = {
    id: matchId,
    title: 'Last Whistle',
    side_size: 5,
    city_id: cityId,
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    area_id: strovolosId,
    area_name_en: 'Strovolos',
    area_name_el: 'Στρόβολος',
    venue_display_name: 'Novo',
    venue_address: 'Strovolos, Nicosia',
    starts_at: '2030-11-18T20:00:00Z',
    duration_minutes: 60,
    skill_level: null,
    price_eur: 10,
    capacity: 10,
    active_players: 0,
    free_spots: 1,
    open_positions: [],
    notes: null,
    booking_status: 'confirmed',
    event_status: 'published',
    is_organizer: false,
    created_at: '2026-11-14T00:00:00Z',
  };
  await page.route('**/rest/v1/match_discovery**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) }),
  );
  await page.route('**/rest/v1/match_participants**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(`/matches/${matchId}`);
  await expect(page.getByRole('img', { name: /5v5 · Last Whistle/ })).toBeVisible();
  await expect(page.getByText('✓ Pitch confirmed')).toBeVisible();
  await expect(page.getByText('1 spot left')).toBeVisible();
  await expect(page.getByText('/ 10 players')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'game-page-mobile.png'),
  });
});
