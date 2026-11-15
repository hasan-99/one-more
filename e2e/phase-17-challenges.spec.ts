import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

const userId = 'f3476a3f-21b6-4c93-9b01-b63de7a46031';
const teamId = 'c7d3304d-7f28-4eaa-9b95-0cd871741b56';
const cityId = 'b4c12c8a-73d1-4eba-9aab-41814988fc07';
const areaId = '45763f2e-1c19-477f-9d8f-2a66ec32f326';
const fixtureAreas = [
  ['nicosia', 'Nicosia', 'Λευκωσία'],
  ['strovolos', 'Strovolos', 'Στρόβολος'],
  ['lakatamia', 'Lakatamia', 'Λακατάμια'],
  ['latsia-geri', 'Latsia–Geri', 'Λατσιά–Γέρι'],
  ['aglantzia', 'Aglantzia', 'Αγλαντζιά'],
  ['engomi', 'Engomi', 'Έγκωμη'],
  ['agios-dometios', 'Agios Dometios', 'Άγιος Δομέτιος'],
  ['tseri', 'Tseri', 'Τσέρι'],
].map(([slug, name_en, name_el], index) => ({
  id: index === 4 ? areaId : `38d7a3b9-4290-4484-9ae8-9d3588f0a00${index}`,
  city_id: cityId,
  slug,
  name_en,
  name_el,
  created_at: '2026-01-01T00:00:00Z',
}));

async function seedSession(page: Page) {
  await page.addInitScript(
    ({ id }) => {
      const now = Math.floor(Date.now() / 1000);
      const user = {
        id,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'captain@example.invalid',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        phone: '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      localStorage.setItem(
        'sb-ejlyaerurkjgsylrsthl-auth-token',
        JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: now + 86400,
          refresh_token: 'mock-refresh-token',
          user,
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
        {
          id: cityId,
          slug: 'nicosia',
          name_en: 'Nicosia',
          name_el: 'Λευκωσία',
          country_code: 'CY',
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
    }),
  );
  await page.route('**/rest/v1/areas**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtureAreas),
    }),
  );
}

const myTeam = {
  team_id: teamId,
  name: 'Tigers FC',
  city_id: cityId,
  city_name_en: 'Nicosia',
  city_name_el: 'Λευκωσία',
  description: null,
  member_count: 8,
  role: 'captain',
  crest_shape: 'shield',
  crest_color: '#ffa94d',
  crest_pattern: 'stripes',
  crest_emblem: 'initials',
};

function challengeRow(overrides: Record<string, unknown>) {
  const start = new Date(Date.now() + 3 * 86_400_000);
  start.setUTCHours(17, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3_600_000);
  return {
    challenge_id: 'a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11',
    home_team_id: teamId,
    home_team_name: 'Tigers FC',
    format: 5,
    city_id: cityId,
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    area_name_en: 'Aglantzia',
    area_name_el: 'Αγλαντζιά',
    skill_level: null,
    note: 'Friendly, bring two shirts.',
    status: 'open',
    windows: [{ starts_at: start.toISOString(), ends_at: end.toISOString() }],
    request_count: 2,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

async function mockRpc(page: Page, name: string, body: unknown) {
  await page.route(`**/rest/v1/rpc/${name}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
  );
}

test('challenges list shows face-off cards, stickers and a format filter', async ({ page }) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [myTeam]);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(page, 'list_team_challenges', [
    challengeRow({}),
    challengeRow({
      challenge_id: 'a2222222-4d3b-4f73-9d5f-1d0c9c3a7b11',
      home_team_id: 'c0000000-7f28-4eaa-9b95-0cd871741b56',
      home_team_name: 'Blue Hawks',
      format: 8,
      note: null,
      request_count: 0,
      created_at: '2026-01-01T00:00:00Z',
    }),
  ]);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/challenges');
  await expect(page.getByText('YOUR CHALLENGE')).toBeVisible();
  await expect(page.getByText('2 teams asked')).toBeVisible();
  await expect(page.getByText('Challenge them')).toBeVisible();
  await expect(page.getByText('2 open challenges')).toBeVisible();
  await page.getByRole('radio', { name: '8v8' }).click();
  await expect(page.getByText('1 open challenge')).toBeVisible();
  await expect(page.getByText('YOUR CHALLENGE')).toHaveCount(0);
  await page.getByRole('radio', { name: 'All' }).click();
  await page.waitForTimeout(600);
  await mkdir(join(process.cwd(), 'docs', 'screenshots', 'phase-17'), { recursive: true });
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'challenges-list-mobile.png'),
  });
});

test('challenges empty state offers to post one', async ({ page }) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [myTeam]);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(page, 'list_team_challenges', []);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/challenges');
  await expect(page.getByText('No open challenges yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post a challenge' })).toBeVisible();
});

test('a captain posts a challenge in four steps without a skill level', async ({ page }) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [myTeam]);
  let posted: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/create_team_challenge', async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify('a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11'),
    });
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/challenges/create');
  await expect(page.getByRole('heading', { name: 'Your team' })).toBeVisible();
  await expect(page.getByText('Tigers FC')).toBeVisible();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Where and what' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '7v7' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Aglantzia' }).click();
  await page.getByRole('radio', { name: '8v8' }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { name: 'When can you play?' })).toBeVisible();
  await page.getByRole('button', { name: 'FROM Later' }).click();
  await page.getByRole('button', { name: 'Add this slot' }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('heading', { name: 'Review and publish' })).toBeVisible();
  await expect(page.getByText('PREVIEW')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'challenge-review-mobile.png'),
  });
  await page.getByRole('button', { name: 'Publish challenge' }).click();
  await expect(page.getByRole('heading', { name: 'Challenge is live' })).toBeVisible();
  expect(posted).toMatchObject({
    p_home_team_id: teamId,
    p_format: 8,
    p_skill_level: null,
  });
  expect((posted as unknown as { p_windows: unknown[] }).p_windows).toHaveLength(2);
});

test('challenge screens fit a 360px phone in Greek', async ({ page }) => {
  await seedSession(page);
  await page.addInitScript(() => localStorage.setItem('one-more.locale', 'el'));
  await mockRpc(page, 'get_my_teams', [myTeam]);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(page, 'list_team_challenges', [challengeRow({})]);
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of ['/challenges', '/challenges/create']) {
    await page.goto(path);
    await expect(page.getByText('Tigers FC').first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
  await page.goto('/challenges');
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'challenges-list-el-360.png'),
  });
});

test('teams page shows one challenge and a create button, and the list has a back button', async ({
  page,
}) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [myTeam]);
  await mockRpc(page, 'get_my_team_invites', []);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(page, 'list_team_challenges', [
    challengeRow({
      challenge_id: 'a2222222-4d3b-4f73-9d5f-1d0c9c3a7b11',
      home_team_id: 'c0000000-7f28-4eaa-9b95-0cd871741b56',
      home_team_name: 'Blue Hawks',
    }),
    challengeRow({
      challenge_id: 'a3333333-4d3b-4f73-9d5f-1d0c9c3a7b11',
      home_team_id: 'c0000000-7f28-4eaa-9b95-0cd871741b57',
      home_team_name: 'Red Lions',
    }),
  ]);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/teams');
  await expect(page.getByText('Blue Hawks').first()).toBeVisible();
  await expect(page.getByText('Red Lions')).toHaveCount(0);
  await page.getByRole('button', { name: /Post a challenge/ }).click();
  await expect(page.getByRole('heading', { name: 'Your team' })).toBeVisible();
  await page.goBack();
  await page.getByRole('link', { name: /See all/ }).click();
  await expect(page.getByText('2 open challenges')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/teams$/);
});

function detailsPayload(overrides: Record<string, unknown>) {
  const start = new Date(Date.now() + 3 * 86_400_000);
  start.setUTCHours(17, 0, 0, 0);
  const end = new Date(start.getTime() + 3 * 3_600_000);
  return {
    id: 'a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11',
    home_team_id: teamId,
    home_team_name: 'Tigers FC',
    format: 5,
    city_id: cityId,
    area_id: areaId,
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    area_name_en: 'Aglantzia',
    area_name_el: 'Αγλαντζιά',
    skill_level: null,
    note: 'Friendly, bring two shirts.',
    status: 'open',
    windows: [{ starts_at: start.toISOString(), ends_at: end.toISOString() }],
    requests: [],
    viewer_home_role: null,
    ...overrides,
  };
}

test('challenge details: the home captain answers a request', async ({ page }) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [myTeam]);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(
    page,
    'get_team_challenge_details',
    detailsPayload({
      viewer_home_role: 'captain',
      requests: [{ id: 'r1', team_name: 'Blue Hawks', status: 'pending' }],
    }),
  );
  let answered: Record<string, unknown> | null = null;
  await page.route('**/rest/v1/rpc/respond_to_challenge_request', async (route) => {
    answered = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/challenges/a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11');
  await expect(page.getByText('YOUR CHALLENGE')).toBeVisible();
  await expect(page.getByText('REQUESTS · 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  await page.getByRole('button', { name: /Accept opponent: Blue Hawks/ }).click();
  await expect.poll(() => answered !== null).toBe(true);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'challenge-details-mobile.png'),
  });
});

test('challenge details: another captain asks to play, then confirms a proposal', async ({
  page,
}) => {
  await seedSession(page);
  await mockRpc(page, 'get_my_teams', [
    { ...myTeam, team_id: 'c0000000-7f28-4eaa-9b95-0cd871741b56', name: 'Blue Hawks' },
  ]);
  await mockRpc(page, 'list_team_directory', []);
  await mockRpc(page, 'get_team_challenge_details', detailsPayload({}));
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/challenges/a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11');
  await expect(page.getByText('PLAY AS')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request this game' })).toBeVisible();

  await page.unroute('**/rest/v1/rpc/get_team_challenge_details');
  const proposed = new Date(Date.now() + 3 * 86_400_000).toISOString();
  await mockRpc(
    page,
    'get_team_challenge_details',
    detailsPayload({
      status: 'negotiating',
      my_team_name: 'Blue Hawks',
      my_request_id: 'r1',
      my_request_status: 'accepted',
      proposed_starts_at: proposed,
      proposed_area_id: areaId,
      proposed_venue_name: 'Novo Arena',
      proposed_venue_address: 'Strovolos, Nicosia',
    }),
  );
  await page.goto('/challenges/a1111111-4d3b-4f73-9d5f-1d0c9c3a7b11');
  await expect(page.getByText('PROPOSAL')).toBeVisible();
  await expect(page.getByText(/Novo Arena/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm exact time and field' })).toBeVisible();
});
