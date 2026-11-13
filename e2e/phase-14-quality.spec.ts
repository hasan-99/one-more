import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const screens = [
  { path: '/', name: 'landing' },
  { path: '/home', name: 'home' },
  { path: '/explore', name: 'explore' },
  { path: '/matches/phase-14-preview', name: 'match-detail' },
  { path: '/teams', name: 'teams' },
  { path: '/challenges', name: 'challenges' },
  { path: '/sign-in', name: 'sign-in' },
  { path: '/sign-up', name: 'sign-up' },
];

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const theme of ['Dark', 'Light'] as const) {
  for (const locale of ['en', 'el'] as const) {
    test(`phase 14 ${theme}/${locale} screen and accessibility review`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(480_000);
      test.skip(
        testInfo.project.name !== 'desktop-chromium',
        'The complete viewport matrix runs once.',
      );
      const directory = join(
        process.cwd(),
        'docs',
        'screenshots',
        'phase-14',
        `${theme.toLowerCase()}-${locale}`,
      );
      await mkdir(directory, { recursive: true });

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem('one-more.theme', value),
        theme.toLowerCase(),
      );
      await page.goto('/');
      await expect(page.locator('html')).toHaveCSS('color-scheme', theme.toLowerCase());
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Language: English' : 'Language: Ελληνικά',
        })
        .click();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const screen of screens) {
          await page.goto(screen.path);
          await expect(page.getByRole('heading').first()).toBeVisible();
          if (screen.path === '/explore') {
            await expect(
              page.getByText(locale === 'en' ? 'Finding matches…' : 'Αναζήτηση αγώνων…'),
            ).toBeHidden();
          }
          await expect(page).toHaveTitle(/ONE MORE\./);
          await expect(page.locator('html')).toHaveAttribute('lang', locale);
          if (screen.path === '/home' && viewport.width <= 375) {
            const mobileNavigation = page.locator('#app-mobile-nav');
            await expect(
              mobileNavigation.getByRole('link', {
                name: locale === 'en' ? 'Explore' : 'Αγώνες',
                exact: true,
              }),
            ).toBeVisible();
            await expect(
              mobileNavigation.getByRole('link', {
                name: locale === 'en' ? 'Create' : 'Δημιουργία',
                exact: true,
              }),
            ).toBeVisible();
          }
          const dimensions = await page.evaluate(() => ({
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            offenders: [...document.querySelectorAll('body *')]
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  tag: element.tagName,
                  id: (element as HTMLElement).id,
                  text: (element as HTMLElement).innerText?.slice(0, 32),
                  left: Math.round(rect.left),
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                };
              })
              .filter((element) => element.left < 0 || element.right > window.innerWidth)
              .slice(0, 8),
          }));
          expect(
            dimensions.document,
            `${screen.name} overflows at ${viewport.width}px: ${JSON.stringify(dimensions.offenders)}`,
          ).toBeLessThanOrEqual(dimensions.viewport);

          const unlabeledControls = await page
            .locator('button,[role="button"],a[href],input,textarea,select')
            .evaluateAll((elements) =>
              elements
                .filter((element) => {
                  const node = element as HTMLElement;
                  const text = node.innerText?.trim() ?? '';
                  const aria =
                    node.getAttribute('aria-label') ?? node.getAttribute('aria-labelledby');
                  const isField = node.matches('input,textarea,select');
                  const hasLabel =
                    isField &&
                    (node.getAttribute('aria-label') || (node as HTMLInputElement).labels?.length);
                  return !aria && !hasLabel && !text;
                })
                .map((element) => element.outerHTML.slice(0, 120)),
            );
          expect(unlabeledControls, `${screen.name} has unlabeled controls`).toEqual([]);

          if (screen.path === '/' && viewport.width === 1440) {
            await page.keyboard.press('Tab');
            const focus = await page.evaluate(() => {
              const active = document.activeElement;
              if (!(active instanceof HTMLElement)) return null;
              const style = getComputedStyle(active);
              return {
                tag: active.tagName,
                outlineStyle: style.outlineStyle,
                outlineWidth: style.outlineWidth,
              };
            });
            expect(focus).not.toBeNull();
            expect(focus?.outlineStyle).not.toBe('none');
            expect(parseFloat(focus?.outlineWidth ?? '0')).toBeGreaterThanOrEqual(2);
            await page.keyboard.press('Tab');
          }

          if (screen.path === '/explore') {
            const preferences = page
              .getByRole('button', {
                name: locale === 'en' ? 'Language: English' : 'Γλώσσα: English',
              })
              .first();
            const box = await preferences.boundingBox();
            expect(
              box?.height ?? 0,
              'language controls must meet the 44px target',
            ).toBeGreaterThanOrEqual(44);
            expect(
              box?.width ?? 0,
              'language controls must meet the 44px target',
            ).toBeGreaterThanOrEqual(44);
          }

          await page.screenshot({
            path: join(directory, `${screen.name}-${viewport.width}.png`),
            fullPage: true,
          });
        }
      }
    });
  }
}

test('phase 14 320px narrow-screen layout stays usable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The narrow viewport check runs once.');
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ['/', '/home', '/explore', '/teams', '/challenges', '/sign-in', '/sign-up']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            id: (element as HTMLElement).id,
            text: (element as HTMLElement).innerText?.slice(0, 32),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((element) => element.left < 0 || element.right > window.innerWidth)
        .slice(0, 8),
    }));
    expect(
      layout.width,
      `${path} overflows at 320px: ${JSON.stringify(layout.offenders)}`,
    ).toBeLessThanOrEqual(320);
  }
});

test('phase 14 landing page keeps cumulative layout shift below 0.1', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The CLS measurement runs once.');
  await page.addInitScript(() => {
    const target = window as Window & {
      __phase14LayoutShifts?: { value: number; hadRecentInput: boolean; sources: string[] }[];
    };
    target.__phase14LayoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: { node?: Node | null }[];
        };
        target.__phase14LayoutShifts?.push({
          value: shift.value,
          hadRecentInput: shift.hadRecentInput,
          sources:
            shift.sources?.map((source) =>
              source.node instanceof HTMLElement
                ? source.node.id || source.node.tagName.toLowerCase()
                : 'unknown',
            ) ?? [],
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2_000);
    const layout = await page.evaluate(() => {
      const shifts =
        (
          window as Window & {
            __phase14LayoutShifts?: {
              value: number;
              hadRecentInput: boolean;
              sources: string[];
            }[];
          }
        ).__phase14LayoutShifts ?? [];
      return {
        cls: shifts
          .filter((shift) => !shift.hadRecentInput)
          .reduce((total, shift) => total + shift.value, 0),
        shifts: shifts.map(({ value, sources }) => ({ value, sources })),
      };
    });
    expect(
      layout.cls,
      `Landing page CLS at ${viewport.width}px was ${layout.cls}; shifts: ${JSON.stringify(layout.shifts)}`,
    ).toBeLessThan(0.1);
  }
});
