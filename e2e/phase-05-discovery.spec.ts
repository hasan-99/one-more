import { expect, test } from '@playwright/test';

test('live match discovery filters are accessible, localized and responsive', async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/explore');
    await expect(page.getByRole('heading', { name: 'Find your next game' })).toBeVisible();
    await expect(page.getByRole('radiogroup').first()).toBeVisible();
    const sevenAside = page.getByRole('radio', { name: '7v7' });
    await sevenAside.click();
    await expect(sevenAside).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('progressbar', { name: 'Finding matches…' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Finding matches…' })).toBeHidden();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('progressbar', { name: 'Finding matches…' })).toBeHidden();
    await page.screenshot({
      path: `docs/screenshots/phase-05/discovery-${width}.png`,
      fullPage: true,
    });
  }
});

test('date and price filters report invalid values without sending a query', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('progressbar', { name: 'Finding matches…' })).toHaveCount(0);
  await page.getByRole('button', { name: /More filters/ }).click();
  const width = page.viewportSize()?.width ?? 390;
  await page.screenshot({
    path: `docs/screenshots/phase-17/explore-more-filters-${width}.png`,
    animations: 'disabled',
  });
  await page.getByRole('textbox', { name: 'Maximum price (€)' }).fill('-2');
  await expect(page.getByText('Enter a price from €0 to €9,999.99.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Maximum price (€)' }).fill('');
  await page.getByRole('textbox', { name: 'From (Cyprus date)' }).fill('2026-04-02');
  await page.getByRole('textbox', { name: 'Through (Cyprus date)' }).fill('2026-04-01');
  await expect(page.getByText('Enter valid dates in year-month-day format.')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('area selector opens an accessible area sheet', async ({ page }) => {
  await page.goto('/explore');
  await expect(page.getByRole('progressbar', { name: 'Finding matches…' })).toHaveCount(0);
  await page.getByRole('button', { name: /Area:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Choose an area' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'All areas' })).toBeVisible();
  const width = page.viewportSize()?.width ?? 390;
  await page.screenshot({
    path: `docs/screenshots/phase-17/explore-area-picker-${width}.png`,
    animations: 'disabled',
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Close filters' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('match deep links show unavailable and a working return path', async ({ page }) => {
  await page.goto('/matches/not-a-real-match');
  await expect(page.getByText('This game is unavailable or has already started.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to games' }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { name: 'Find your next game' })).toBeVisible();
});
