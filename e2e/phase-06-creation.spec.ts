import { expect, test } from '@playwright/test';

test('match creation stays behind the verified profile gate on mobile and desktop', async ({
  page,
}) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.goto('/create');
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcreate$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  }
});
