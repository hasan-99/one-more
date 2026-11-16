import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light'] as const) {
  test(`explore shows skeleton cards while games load (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('one-more.theme', value), theme);
    await page.route('**/rest/v1/match_discovery**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '*/0', 'access-control-expose-headers': 'content-range' },
        body: '[]',
      });
    });
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto('/explore');
    const skeleton = page.getByTestId('skeleton');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('aria-label', 'Finding matches…');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `docs/screenshots/phase-17/skeleton-explore-${theme}.png`,
      animations: 'disabled',
    });
    await expect(skeleton).toBeHidden({ timeout: 8000 });
  });
}
