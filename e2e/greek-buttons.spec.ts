import { expect, test, type Page } from '@playwright/test';

const userId = 'f3476a3f-21b6-4c93-9b01-b63de7a46031';
const mineId = 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b11';
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

async function setup(page: Page, mine: boolean) {
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
            user_metadata: { display_name: 'Χασάν' },
            identities: [],
            created_at: '2026-01-01T00:00:00Z',
          },
        }),
      );
      localStorage.setItem('one-more.theme', 'dark');
      localStorage.setItem('one-more.locale', 'el');
    },
    { id: userId },
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
  await page.route('**/rest/v1/rpc/get_my_teams', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/rpc/get_match_join_requests', (route) =>
    route.fulfill(
      json([{ participant_id: 'p1', display_name: 'Nikos', status: 'pending', requested_at: '' }]),
    ),
  );
  await page.route('**/rest/v1/match_discovery**', (route) =>
    route.fulfill(
      json([
        game({ is_organizer: mine }),
        game({ id: 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b12', title: 'Green Machine', free_spots: 3 }),
      ]),
    ),
  );
}

/** Buttons and links whose label breaks onto a second line or is cut off. */
async function wrappedLabels(page: Page, label: string) {
  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('a[href],[role=button],button'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 60 || rect.height === 0) continue;
      // Only buttons that draw their own box (border or fill); plain text links may wrap.
      const style = getComputedStyle(el);
      const boxed =
        parseFloat(style.borderTopWidth) > 0 || style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      if (!boxed) continue;
      for (const textEl of Array.from(el.querySelectorAll('div'))) {
        if (textEl.children.length > 0) continue;
        const text = (textEl.textContent ?? '').trim();
        if (text.length < 3) continue;
        const text_style = getComputedStyle(textEl);
        const lineHeight =
          parseFloat(text_style.lineHeight) || parseFloat(text_style.fontSize) * 1.3;
        const box = textEl.getBoundingClientRect();
        if (box.height > lineHeight * 1.6)
          out.push(`wraps: "${text.slice(0, 40)}" ${Math.round(box.height)}px`);
        if (textEl.scrollWidth > textEl.clientWidth + 2) out.push(`cut: "${text.slice(0, 40)}"`);
      }
    }
    return out;
  });
  return found.map((item) => `${label}: ${item}`);
}

for (const width of [360, 393, 430]) {
  test(`Greek: no button label wraps or is cut (${width}px)`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Phone widths only');
    await page.setViewportSize({ width, height: 850 });
    const found: string[] = [];
    for (const mine of [true, false]) {
      await setup(page, mine);
      for (const route of [
        '/home',
        '/explore',
        '/teams',
        '/challenges',
        '/notifications',
        '/settings',
        `/matches/${mineId}`,
      ]) {
        await page.goto(route);
        found.push(...(await wrappedLabels(page, `${route}${mine ? ' (mine)' : ''}`)));
      }
    }
    expect([...new Set(found)]).toEqual([]);
  });
}
