import { expect, test } from '@playwright/test';

test('private match chat deep links require a signed-in profile', async ({ page }) => {
  await page.goto('/chat/phase-09-test-match');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fchat%2Fphase-09-test-match$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
