import { expect, test, type Page } from '@playwright/test';

const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
const cityId = 'c-1';
const iso = new Date().toISOString();

async function setup(page: Page, locale: 'en' | 'el', mode: 'empty' | 'captain') {
  await page.addInitScript(
    ({ id, loc }) => {
      const t = Math.floor(Date.now() / 1000);
      localStorage.setItem('one-more.locale', loc);
      localStorage.setItem('one-more.theme', 'dark');
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
  const dir = ['Aglantzia Rovers Football Club', 'Larnaca Sharks', 'Paphos Waves'].map(
    (name, i) => ({
      team_id: `t${i}`,
      name,
      city_id: i ? `c-${i}` : cityId,
      city_name_en: ['Nicosia', 'Larnaca', 'Paphos'][i],
      city_name_el: ['Λευκωσία', 'Λάρνακα', 'Πάφος'][i],
      description: null,
      member_count: 8 + i,
      created_at: iso,
    }),
  );
  const mine =
    mode === 'captain'
      ? [
          {
            team_id: 'm1',
            name: 'Nicosia Falcons United',
            city_id: cityId,
            city_name_en: 'Nicosia',
            city_name_el: 'Λευκωσία',
            description: null,
            member_count: 11,
            role: 'captain',
          },
          {
            team_id: 'm2',
            name: 'Strovolos United',
            city_id: cityId,
            city_name_en: 'Nicosia',
            city_name_el: 'Λευκωσία',
            description: null,
            member_count: 1,
            role: 'member',
          },
        ]
      : [];
  const invites =
    mode === 'captain'
      ? [
          {
            invite_id: 'i1',
            team_id: 'x',
            team_name: 'Limassol Lions',
            city_name_en: 'Limassol',
            city_name_el: 'Λεμεσός',
            invited_by_name: 'Andreas',
            expires_at: new Date(Date.now() + 864e5).toISOString(),
          },
        ]
      : [];
  const challenges =
    mode === 'captain'
      ? [0, 1].map((i) => ({
          challenge_id: `c${i}`,
          home_team_id: `h${i}`,
          home_team_name: ['Aglantzia Rovers', 'Larnaca Sharks'][i],
          format: 5 + 2 * i,
          city_id: cityId,
          city_name_en: 'Nicosia',
          city_name_el: 'Λευκωσία',
          area_name_en: 'Strovolos',
          area_name_el: 'Στρόβολος',
          skill_level: 'intermediate',
          note: null,
          status: 'open',
          windows: [
            {
              starts_at: new Date(Date.now() + 864e5 * (i + 2)).toISOString(),
              ends_at: new Date(Date.now() + 864e5 * (i + 2) + 1e7).toISOString(),
            },
          ],
          request_count: 0,
          created_at: iso,
        }))
      : [];
  const details = {
    id: 'm1',
    name: 'Nicosia Falcons United',
    city_id: cityId,
    city_name_en: 'Nicosia',
    city_name_el: 'Λευκωσία',
    description: 'We play every Wednesday evening in Strovolos.',
    viewer_role: 'captain',
    members: [
      { id: 'a', user_id: userId, display_name: 'Hasan Captain', role: 'captain', joined_at: iso },
      {
        id: 'b',
        user_id: 'u2',
        display_name: 'Andreas Papadopoulos',
        role: 'member',
        joined_at: iso,
      },
    ],
    invites: [{ id: 'iv', display_name: 'Maria', expires_at: iso }],
    crest_shape: 'hex',
    crest_color: '#5cc8ff',
    crest_pattern: 'stripes',
    crest_emblem: 'bolt',
    preferred_format: 7,
    open_to_players: true,
  };
  await page.route('**/rest/v1/**', async (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    let body: unknown = [];
    if (t === 'profiles')
      body = {
        id: userId,
        onboarding_complete: true,
        display_name: 'Hasan',
        city_id: cityId,
        area_id: 'a-1',
        preferred_position: 'midfielder',
        skill_level: 'advanced',
        strong_foot: 'right',
        shirt_number: 8,
        language: 'en',
      };
    if (t === 'cities')
      body = [{ id: cityId, slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία' }];
    if (t === 'areas')
      body = [
        {
          id: 'a-1',
          city_id: cityId,
          slug: 'aglantzia',
          name_en: 'Aglantzia',
          name_el: 'Αγλαντζιά',
          created_at: iso,
        },
      ];
    if (t === 'user_preferences')
      body = {
        user_id: userId,
        preferred_formats: [5, 7],
        availability_slots: ['mon', 'wed'],
        max_radius_km: 20,
        timezone: 'Asia/Nicosia',
        created_at: iso,
        updated_at: iso,
      };
    if (t === 'notification_preferences')
      body = {
        user_id: userId,
        in_app_enabled: true,
        discovery_email_enabled: false,
        chat_email_enabled: false,
        native_push_enabled: false,
        transactional_email_enabled: true,
        created_at: iso,
        updated_at: iso,
      };
    if (t === 'list_team_directory') body = dir;
    if (t === 'get_my_teams') body = mine;
    if (t === 'get_my_team_invites') body = invites;
    if (t === 'list_team_challenges') body = challenges;
    if (t === 'get_team_details') body = details;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

async function audit(page: Page, label: string) {
  await page.waitForTimeout(1400);
  const issues = await page.evaluate(() => {
    const out: string[] = [];
    const w = window.innerWidth;
    if (document.documentElement.scrollWidth > w + 1)
      out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${w})`);
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    for (const el of Array.from(
      document.querySelectorAll(
        '[role=button],[role=link],a,button,input,textarea,[role=radio],[role=switch]',
      ),
    )) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
      if (r.right > w + 1 || r.left < -1)
        out.push(`out of screen: "${name}" ${Math.round(r.left)}..${Math.round(r.right)}`);
      if (r.height > 0 && r.height < 30 && !(el as HTMLElement).closest('[data-skip]'))
        out.push(`small target: "${name}" h=${Math.round(r.height)}`);
    }
    for (const el of Array.from(document.querySelectorAll('div,span'))) {
      const s = getComputedStyle(el);
      if (!visible(el) || (s.overflow !== 'hidden' && s.overflowX !== 'hidden')) continue;
      const h = el as HTMLElement;
      if (
        h.scrollWidth > h.clientWidth + 2 &&
        h.clientWidth > 0 &&
        (h.textContent ?? '').trim().length > 0 &&
        h.children.length === 0
      )
        out.push(
          `text cut: "${(h.textContent ?? '').trim().slice(0, 30)}" ${h.scrollWidth}>${h.clientWidth}`,
        );
    }
    return out;
  });
  return issues.map((i) => `${label}: ${i}`);
}

for (const locale of ['en', 'el'] as const) {
  for (const width of [360, 393, 430]) {
    test(`no overflow, cut text or tiny buttons: ${locale} ${width}px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile-chromium', 'Phone widths only');
      const found: string[] = [];
      await page.setViewportSize({ width, height: 800 });
      for (const mode of ['empty', 'captain'] as const) {
        await setup(page, locale, mode);
        await page.goto('/teams');
        found.push(...(await audit(page, `teams/${mode}`)));
        if (mode === 'captain') {
          await page.goto('/teams/m1');
          found.push(...(await audit(page, 'team page')));
          await page.goto('/profile');
          found.push(...(await audit(page, 'profile')));
        }
      }
      await setup(page, locale, 'captain');
      await page.goto('/teams/create');
      await page.getByRole('textbox').first().fill('Rovers');
      await page.getByRole('radio').first().click();
      found.push(...(await audit(page, 'create/1')));
      await page.getByRole('button', { name: /Next|Επόμενο|Συνέχεια/ }).click();
      found.push(...(await audit(page, 'create/2')));
      await page.getByRole('button', { name: /Next|Επόμενο|Συνέχεια/ }).click();
      found.push(...(await audit(page, 'create/3')));
      expect([...new Set(found)]).toEqual([]);
    });
  }
}
