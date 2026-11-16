import { expect, test } from '@playwright/test';

function luminance(color: string) {
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const base = {
  side_size: 5,
  city_id: '11111111-1111-4111-8111-111111111111',
  city_name_en: 'Nicosia',
  city_name_el: 'Λευκωσία',
  area_id: '22222222-2222-4222-8222-222222222222',
  area_name_en: 'Strovolos',
  area_name_el: 'Στρόβολος',
  venue_display_name: 'Novo',
  venue_address: 'Strovolos, Nicosia',
  starts_at: '2030-11-19T20:00:00Z',
  duration_minutes: 60,
  skill_level: null,
  price_eur: 5,
  capacity: 10,
  open_positions: [],
  notes: null,
  booking_status: 'confirmed',
  event_status: 'published',
  is_organizer: false,
  created_at: '2026-11-14T00:00:00Z',
};

test('light mode: the dark kick-off board keeps its text readable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('one-more.theme', 'light'));
  const rows = [
    {
      ...base,
      id: 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b11',
      title: 'Open game',
      active_players: 4,
      free_spots: 6,
    },
    {
      ...base,
      id: 'b3e7a7d6-4d3b-4f73-9d5f-1d0c9c3a7b12',
      title: 'Almost full',
      active_players: 9,
      free_spots: 1,
    },
  ];
  await page.route('**/rest/v1/match_discovery**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' },
      body: JSON.stringify(rows),
    }),
  );
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/explore');
  await expect(page.getByText('KICK-OFF').first()).toBeVisible();
  const cards = page.getByText('KICK-OFF');
  for (let index = 0; index < (await cards.count()); index += 1) {
    const label = await cards.nth(index).evaluate((node) => getComputedStyle(node).color);
    const time = await cards
      .nth(index)
      .locator('xpath=preceding-sibling::*[1]')
      .evaluate((node) => getComputedStyle(node).color);
    const day = await page
      .getByText(/^19 NOV$/)
      .nth(index)
      .evaluate((node) => getComputedStyle(node).color);
    expect(luminance(label)).toBeGreaterThan(0.5);
    expect(luminance(time)).toBeGreaterThan(0.4);
    expect(luminance(day)).toBeGreaterThan(0.5);
  }
  await page.screenshot({
    path: 'docs/screenshots/phase-17/explore-light-board.png',
    animations: 'disabled',
  });
});
