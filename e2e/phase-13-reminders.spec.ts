import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('match reminder links render the public match page in both locales without mobile overflow', async ({
  page,
}) => {
  await page.goto('/matches/private-reminder');
  await expect(page.getByRole('heading', { name: 'Match details', exact: true })).toBeVisible();
  await expect(page.getByText('This game is unavailable or has already started.')).toBeVisible();
  await page.getByRole('button', { name: 'Language: Ελληνικά' }).click();
  await expect(
    page.getByRole('heading', { name: 'Λεπτομέρειες αγώνα', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Ο αγώνας δεν είναι διαθέσιμος ή έχει ήδη ξεκινήσει.')).toBeVisible();

  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth);
  await mkdir('docs/screenshots/phase-13', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/phase-13/reminder-match-link-${viewportWidth}-el.png`,
    fullPage: true,
  });
});
