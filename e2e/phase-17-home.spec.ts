import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const userId = 'f3476a3f-21b6-4c93-9b01-b63de7a46031';
const mineId = 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b11';
const screenshots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
const json = (body: unknown, headers: Record<string, string> = {}) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'access-control-expose-headers': 'content-range', ...headers },
  body: JSON.stringify(body),
});

function game(patch: Record<string, unknown>) {
  const hours = (count: number) => new Date(Date.now() + count * 3_600_000).toISOString();
  return {
    id: mineId,
    title: 'Friday Lights',
    side_size: 8,
    city_id: 'b4c12c8a-73d1-4eba-9aab-41814988fc07',
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    area_id: '38d7a3b9-4290-4484-9ae8-9d3588f0a001',
    area_name_en: 'Aglantzia',
    area_name_el: 'Αγλαντζιά',
    venue_display_name: 'Novo',
    venue_address: 'Aglantzia, Nicosia',
    starts_at: hours(55.5),
    duration_minutes: 60,
    skill_level: null,
    price_eur: 5,
    capacity: 16,
    active_players: 15,
    free_spots: 1,
    open_positions: [],
    notes: null,
    booking_status: 'confirmed',
    event_status: 'published',
    is_organizer: false,
    created_at: hours(-24),
    ...patch,
  };
}
const others = [
  game({
    id: 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b12',
    title: 'Green Machine',
    side_size: 5,
    capacity: 10,
    active_players: 7,
    free_spots: 3,
    area_name_en: 'Engomi',
  }),
  game({
    id: 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b13',
    title: 'Old Town Sevens',
    side_size: 7,
    capacity: 14,
    active_players: 13,
    free_spots: 1,
    price_eur: 0,
  }),
];

async function signIn(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript(
    ({ id, mode }) => {
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
            user_metadata: { display_name: 'Hasan Jahouse' },
            identities: [],
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      );
      localStorage.setItem('one-more.theme', mode);
      localStorage.setItem('one-more.locale', 'en');
    },
    { id: userId, mode: theme },
  );
  await page.route('**/rest/v1/profiles**', (route) =>
    route.fulfill(json({ onboarding_complete: true })),
  );
  await page.route('**/rest/v1/inbox_notifications**', (route) =>
    route.fulfill({
      status: 200,
      headers: {
        'content-range': '*/3',
        'access-control-allow-origin': '*',
        'access-control-expose-headers': 'content-range',
      },
      body: route.request().method() === 'HEAD' ? '' : '[]',
    }),
  );
  await page.route('**/rest/v1/match_participants**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/rpc/get_my_team_invites', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/rpc/get_my_teams', (route) =>
    route.fulfill(
      json([
        {
          team_id: '7a1f0c7e-0a53-4e0e-9a52-1f3d6f1b0001',
          name: 'Strovolos United',
          city_id: 'b4c12c8a-73d1-4eba-9aab-41814988fc07',
          city_name_en: 'Nicosia',
          city_name_el: 'Λευκωσία',
          description: null,
          member_count: 14,
          role: 'captain',
          crest_shape: null,
          crest_color: null,
          crest_pattern: null,
          crest_emblem: null,
        },
      ]),
    ),
  );
}

test('no game yet: home invites to play, shows open games and localizes to Greek', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'mobile-chromium';
  const width = mobile ? 375 : 1440;
  mkdirSync(screenshots, { recursive: true });
  await signIn(page, 'light');
  await page.route('**/rest/v1/match_discovery**', (route) => route.fulfill(json(others)));
  await page.setViewportSize({ width, height: mobile ? 812 : 1000 });
  await page.goto('/home');

  await expect(page.getByRole('heading', { name: 'The pitch is waiting.' })).toBeVisible();
  await expect(page.getByText('2 open games', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore games' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where to?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Next kick-offs' })).toBeVisible();
  await expect(page.getByTestId('home-rail-card')).toHaveCount(2);
  await expect(page.getByTestId('home-next-game')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
  await page.screenshot({
    path: join(screenshots, `home-${mobile ? 'mobile-375' : 'desktop-1440'}-light.png`),
  });

  const languageToggle = page.getByRole('button', { name: 'Language: English' });
  await languageToggle.click();
  await expect(page.getByRole('heading', { name: 'Το γήπεδο περιμένει.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Αναζήτηση' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Πού πάμε;' })).toBeVisible();
});

for (const theme of ['dark', 'light'] as const) {
  test(`organiser: countdown, people waiting, tiles, rail and teams (${theme})`, async ({
    page,
  }) => {
    mkdirSync(screenshots, { recursive: true });
    await signIn(page, theme);
    await page.route('**/rest/v1/match_discovery**', (route) =>
      route.fulfill(json([game({ is_organizer: true }), ...others])),
    );
    await page.route('**/rest/v1/rpc/get_match_join_requests', (route) =>
      route.fulfill(
        json([
          { participant_id: 'p1', display_name: 'Nikos', status: 'pending', requested_at: '' },
          { participant_id: 'p2', display_name: 'Maria', status: 'pending', requested_at: '' },
          { participant_id: 'p3', display_name: 'Alex', status: 'active', requested_at: '' },
        ]),
      ),
    );
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/home');

    const hero = page.getByTestId('home-next-game');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { name: 'Friday Lights' })).toBeVisible();
    await expect(hero.getByText(/You organise/)).toBeVisible();
    const timer = hero.getByRole('timer');
    await expect(timer).toHaveAttribute('aria-label', /Time to kick-off: 2 days, 7 hours/);
    const first = await timer.innerText();
    await expect.poll(() => timer.innerText(), { timeout: 4000 }).not.toBe(first);
    await expect(hero.getByText('15 of 16 players in')).toBeVisible();
    // Every player who is in stands on the pitch; the one free place pulses.
    await expect(hero.getByRole('img', { name: '15 of 16 players on the pitch' })).toBeVisible();
    await expect(hero.getByTestId('home-pin')).toHaveCount(15);
    await expect(hero.getByTestId('home-spot')).toHaveCount(1);
    await expect(hero.getByText('YOU', { exact: true })).toBeVisible();
    await expect(hero.getByText('1 place open')).toBeVisible();
    await expect(hero.getByRole('link', { name: /Open game/ })).toHaveAttribute(
      'href',
      `/matches/${mineId}`,
    );
    await expect(hero.getByRole('link', { name: 'Squad chat' })).toHaveAttribute(
      'href',
      `/chat/${mineId}`,
    );

    const need = page.getByTestId('home-need');
    await expect(need.getByText('2 players are waiting')).toBeVisible();
    await expect(need.getByRole('link', { name: 'Review' })).toHaveAttribute(
      'href',
      `/matches/${mineId}`,
    );
    await expect(page.getByText(/, Hasan$/)).toBeVisible();

    await expect(page.locator('[data-testid^="home-tile-"]')).toHaveCount(3);
    await expect(page.getByTestId('home-tile-find')).toBeVisible();
    await expect(page.getByTestId('home-tile-challenges')).toBeVisible();
    await expect(page.getByTestId('home-tile-teams')).toBeVisible();
    // Create, Notifications and Settings are reachable from the tab bar and the top bar, not here.
    await expect(page.getByTestId('home-tile-create')).toHaveCount(0);
    await expect(page.getByTestId('home-tile-alerts')).toHaveCount(0);
    await expect(page.getByTestId('home-tile-settings')).toHaveCount(0);
    // The player's own game is the hero, so the rail only lists the other open games.
    await expect(page.getByTestId('home-rail-card')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Strovolos United/ })).toBeVisible();
    for (const tile of await page.locator('[data-testid^="home-tile-"]').all()) {
      const box = await tile.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      393,
    );
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(screenshots, `home-matchday-${theme}.png`) });
    await page.getByRole('link', { name: /Strovolos United/ }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(screenshots, `home-matchday-${theme}-lower.png`) });

    await page.getByTestId('home-tile-find').click();
    await expect(page).toHaveURL(/\/explore$/);
  });
}

test('player without a game sees the invite to play and a team invite', async ({ page }) => {
  await signIn(page, 'dark');
  await page.route('**/rest/v1/match_discovery**', (route) => route.fulfill(json(others)));
  await page.route('**/rest/v1/rpc/get_my_team_invites', (route) =>
    route.fulfill(
      json([
        {
          invite_id: 'i1',
          team_id: 't1',
          team_name: 'Nicosia Foxes',
          city_name_en: 'Nicosia',
          city_name_el: 'Λευκωσία',
          invited_by_name: 'Nikos',
          expires_at: '2030-01-01T00:00:00Z',
        },
      ]),
    ),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'The pitch is waiting.' })).toBeVisible();
  await expect(page.getByTestId('home-need').getByText('Nicosia Foxes invited you')).toBeVisible();
  await expect(page.getByTestId('home-next-game')).toHaveCount(0);
  await expect(page.getByTestId('home-empty-stadium').getByTestId('home-spot')).toHaveCount(10);
  await expect(page.getByTestId('home-pin')).toHaveCount(0);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(screenshots, 'home-matchday-empty.png') });
});

test('a failed games request shows an error with a working retry', async ({ page }) => {
  let fail = true;
  await signIn(page, 'dark');
  await page.route('**/rest/v1/match_discovery**', (route) =>
    fail ? route.fulfill({ status: 500, body: '{}' }) : route.fulfill(json(others)),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/home');
  const alert = page.getByRole('alert').filter({ hasText: 'Games could not be loaded.' });
  await expect(alert).toBeVisible();
  // The page still works without the list.
  await expect(page.getByRole('heading', { name: 'The pitch is waiting.' })).toBeVisible();
  fail = false;
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('home-rail-card')).toHaveCount(2);
});
