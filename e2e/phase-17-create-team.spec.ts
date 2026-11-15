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

async function finishWizard(page: Page) {
  await expect(page.getByRole('heading', { name: 'Name your team' })).toBeVisible();
  await page.getByLabel('Team name').fill('Nicosia Rovers');
  await page.getByRole('radio', { name: 'Aglantzia' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Design your crest' })).toBeVisible();
  await page.getByRole('radio', { name: 'Hex', exact: true }).click();
  await page.getByRole('radio', { name: 'Sky blue' }).click();
  await page.getByRole('radio', { name: 'Stripes' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'How you play' })).toBeVisible();
  await page.getByRole('radio', { name: '7v7' }).click();
  await page.getByRole('switch', { name: 'Open to new players' }).click();
}

test('Create navigation opens the team wizard, and the 3 steps save their design', async ({
  page,
}) => {
  await seedSession(page);
  let savedDesign: Record<string, unknown> | undefined;
  await page.route('**/rest/v1/rpc/create_team_with_design', async (route) => {
    savedDesign = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(teamId),
    });
  });

  const screenshots = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  await mkdir(screenshots, { recursive: true });
  for (const viewport of [
    { width: 393, height: 852, name: 'mobile' },
    { width: 1440, height: 900, name: 'desktop' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/teams/create');
    await expect(page.getByRole('heading', { name: 'Name your team' })).toBeVisible();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: join(screenshots, `create-team-step1-${viewport.name}.png`),
      fullPage: true,
    });
    await finishWizard(page);
    await page.screenshot({
      path: join(screenshots, `create-team-${viewport.name}.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Create team' }).click();
    await expect(page.getByRole('heading', { name: 'Nicosia Rovers' })).toBeVisible();
    await expect(
      page.getByText('Your team is ready. Invite your players and post your first challenge.'),
    ).toBeVisible();
    expect(savedDesign).toMatchObject({
      p_name: 'Nicosia Rovers',
      p_city_id: cityId,
      p_area_id: areaId,
      p_crest_shape: 'hex',
      p_crest_color: '#5cc8ff',
      p_crest_pattern: 'stripes',
      p_format: 7,
      p_open_to_players: false,
    });
    await page.goto('/teams/create');
  }
});

test('Create a team reports a retryable save failure', async ({ page }) => {
  await seedSession(page);
  await page.route('**/rest/v1/rpc/create_team_with_design', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'temporary backend failure' }),
    }),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/teams/create');
  await finishWizard(page);
  await page.getByRole('button', { name: 'Create team' }).click();
  await expect(
    page.getByRole('alert').getByText('Your team could not be created. Please try again.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create team' })).toBeEnabled();
});

test('the center Create button opens the create-a-game page (guests go to sign in first)', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/teams');
  await page.getByRole('link', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
});

test('choosing an option does not replay the step animation', async ({ page }) => {
  await seedSession(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/teams/create');
  await page.getByLabel('Team name').fill('Nicosia Rovers');
  await page.getByRole('radio', { name: 'Aglantzia' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  const heading = page.getByRole('heading', { name: 'Design your crest' });
  await expect(heading).toBeVisible();
  await page.waitForTimeout(900);
  const fadeOf = () =>
    heading.evaluate((element) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const opacity = Number(getComputedStyle(node).opacity);
        if (opacity < 1) return opacity;
      }
      return 1;
    });
  for (const name of ['Hex', 'Sky blue', 'Stripes']) {
    await page.getByRole('radio', { name, exact: true }).click();
    // A replayed slide-in would reset the step to transparent right after the tap.
    expect(await fadeOf()).toBe(1);
  }
});

test('the crest step shows a style score, undo and emblems, and saves the emblem', async ({
  page,
}) => {
  await seedSession(page);
  let saved: Record<string, unknown> | undefined;
  await page.route('**/rest/v1/rpc/create_team_with_design', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(teamId),
    });
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/teams/create');
  await page.getByLabel('Team name').fill('Nicosia Rovers');
  await page.getByRole('radio', { name: 'Aglantzia' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Design your crest' })).toBeVisible();
  await page.waitForTimeout(700);
  // No random roll and no ready-made looks any more.
  await expect(page.getByRole('button', { name: 'Surprise me' })).toHaveCount(0);
  await expect(page.getByText('Quick looks')).toHaveCount(0);
  const score = page.getByLabel(/^Style score: /);
  await expect(score).toHaveAttribute('aria-label', 'Style score: 40, Rookie');
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'create-team-crest-mobile.png'),
  });

  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeDisabled();
  await page.getByRole('radio', { name: 'Hex', exact: true }).click();
  await page.getByRole('radio', { name: 'Stripes' }).click();
  await expect(score).toHaveAttribute('aria-label', 'Style score: 70, Club');
  await page.getByRole('radio', { name: 'Crown' }).click();
  await expect(score).toHaveAttribute('aria-label', 'Style score: 90, Pro');
  await undo.click();
  await expect(score).toHaveAttribute('aria-label', 'Style score: 70, Club');
  await page.getByRole('radio', { name: 'Crown' }).click();
  // Everything fits without scrolling and the footer stays reachable.
  const body = page.locator('#team-create-step');
  expect(
    await body.evaluate((element) => element.scrollHeight - element.clientHeight),
  ).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create team' }).click();
  await expect.poll(() => saved?.p_crest_emblem).toBe('crown');
});

test('the team page shows the crest, quick actions and a collapsed edit section', async ({
  page,
}) => {
  await seedSession(page);
  const details = {
    id: teamId,
    name: 'Tigers',
    city_id: cityId,
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    description: null,
    viewer_role: 'captain',
    members: [
      {
        id: 'm1',
        user_id: userId,
        display_name: 'Hasan',
        role: 'captain',
        joined_at: '2026-11-14T10:00:00Z',
      },
    ],
    invites: [],
    crest_shape: 'hex',
    crest_color: '#ffa94d',
    crest_pattern: 'half',
    crest_emblem: 'star',
    preferred_format: 5,
    open_to_players: true,
  };
  await page.route('**/rest/v1/rpc/get_team_details', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(details) }),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(`/teams/${teamId}`);
  await expect(page.getByRole('heading', { name: 'Tigers' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Team crest: Tigers' })).toBeVisible();
  await expect(page.getByText('Nicosia · 5v5 · open to players')).toBeVisible();
  await expect(page.getByText('You are the captain')).toBeVisible();
  await expect(page.getByText('1 player', { exact: true })).toBeVisible();
  await expect(page.getByText('Legend · 100')).toBeVisible();
  await expect(page.getByRole('button', { name: /Invite/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Challenge/ })).toBeVisible();
  await expect(
    page.getByText('Your team is just you for now. Invite players to fill the squad.'),
  ).toBeVisible();
  // The edit form stays folded until asked for.
  await expect(page.getByLabel('Team name')).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'team-page-mobile.png'),
  });
  await page.getByRole('button', { name: /Edit team details/ }).click();
  await expect(page.getByLabel('Team name')).toHaveValue('Tigers');
});
