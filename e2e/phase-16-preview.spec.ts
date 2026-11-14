import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { buildHomeReferenceHtml } from '../src/components/landing/home-reference-html';
import { en } from '../src/i18n/en';

test('the supplied Home HTML keeps its mobile spacing, pitch size, and animation timing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const html = buildHomeReferenceHtml(
    {
      eyebrow: en.eyebrow,
      heroLineOne: en.heroLineOne,
      heroLineTwo: en.heroLineTwo,
      intro: en.intro,
      landingGetStarted: en.landingGetStarted,
      demoExampleGame: en.demoExampleGame,
      demoTitle: en.demoTitle,
      demoSubtitle: en.demoSubtitle,
      demoAvailability: en.demoAvailability,
      demoOnePlaceOpen: en.demoOnePlaceOpen,
      landingFooterLead: en.landingFooterLead,
      landingFooterEmphasis: en.landingFooterEmphasis,
      languageSwitchLabel: en.authSwitchToGreek,
      languageCode: 'EN',
    },
    { top: 59, bottom: 34 },
  );
  await page.setContent(html);
  await page.waitForTimeout(2_400);

  await expect(page.getByRole('heading', { name: 'Your game starts here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in or create account' })).toBeVisible();
  await expect(page.locator('#om-tilt')).toBeVisible();
  const header = await page.locator('header').boundingBox();
  const languageButton = await page.locator('.om-pill').boundingBox();
  const signInButton = await page.locator('#home-signin').boundingBox();
  const demoCard = await page.locator('#om-tilt').boundingBox();
  expect(header?.y).toBe(73);
  expect(languageButton?.y).toBe(81);
  expect(demoCard!.y - (signInButton!.y + signInButton!.height)).toBeGreaterThanOrEqual(31);
  await expect(page.locator('.om-ball0').first()).toHaveCSS('animation-name', 'om-ball');
  await expect(page.locator('.om-ball0').first()).toHaveCSS('animation-duration', '10s');
  expect(
    await page
      .locator('.om-draw.d2')
      .first()
      .evaluate((node) => getComputedStyle(node).animationDuration.split(', ')[0]),
  ).toBe('2.6s');
  expect(
    await page
      .locator('.om-display')
      .first()
      .evaluate((node) => getComputedStyle(node).fontSize),
  ).toBe('48px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  expect(await page.locator('.om-root').evaluate((node) => getComputedStyle(node).paddingTop)).toBe(
    '73px',
  );
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: join(screenshotDirectory, 'home-reference-html-393-safe.png'),
    fullPage: true,
  });
});

test('forgot-password uses the same pitch atmosphere and colors as sign-in', async ({ page }) => {
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-17');
  await mkdir(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { width: 393, height: 852 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(page.locator('#auth-bg-all')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset code' })).toBeVisible();

    const forgotColors = await page.evaluate(() => ({
      root: getComputedStyle(document.querySelector('#auth-pitch-root')!).backgroundColor,
      card: getComputedStyle(document.querySelector('#auth-card')!).backgroundColor,
    }));
    await page.goto('/sign-in');
    const signInColors = await page.evaluate(() => ({
      root: getComputedStyle(document.querySelector('#auth-pitch-root')!).backgroundColor,
      card: getComputedStyle(document.querySelector('#auth-card')!).backgroundColor,
    }));
    expect(forgotColors).toEqual(signInColors);
    await expect(page.locator('#auth-bg-all')).toBeVisible();

    if (viewport.width === 393) {
      await page.goto('/forgot-password');
      await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
      await page.waitForTimeout(1_800);
      await page.screenshot({
        path: join(screenshotDirectory, 'forgot-password-pitch-393.png'),
        fullPage: true,
      });
    }
  }
});

test('password recovery verifies a recovery code before changing the password', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const email = 'player@example.com';
  const code = '12345678';
  const user = {
    id: 'test-user-id',
    email,
    aud: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  };
  let recoveryRequest = false;
  let verifiedRecoveryCode = false;
  let savedPassword = false;

  await page.route('**/auth/v1/recover', async (route) => {
    recoveryRequest = route.request().postDataJSON().email === email;
    await route.fulfill({ status: 200, json: {} });
  });
  await page.route('**/auth/v1/verify', async (route) => {
    const request = route.request().postDataJSON();
    if (request.token === '00000000') {
      await route.fulfill({
        status: 400,
        json: { error_code: 'otp_expired', msg: 'Token has expired or is invalid' },
      });
      return;
    }
    verifiedRecoveryCode =
      request.email === email && request.token === code && request.type === 'recovery';
    await route.fulfill({
      status: 200,
      json: {
        access_token: 'mock-recovery-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-recovery-refresh-token',
        user,
      },
    });
  });
  await page.route('**/auth/v1/user', async (route) => {
    savedPassword =
      route.request().method() === 'PUT' &&
      route.request().postDataJSON().password === 'new-password-123';
    await route.fulfill({ status: 200, json: user });
  });
  await page.route('**/auth/v1/logout', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/sign-in');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByLabel('Email verification code')).toHaveCount(0);

  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  await expect(page.getByText(/If an account exists for this email/)).toBeVisible();
  await page.getByLabel('Password reset code').fill('00000000');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(
    page.getByText('That code is invalid or expired. Request another code.'),
  ).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toHaveCount(0);
  await page.getByLabel('Password reset code').fill(code);
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('new-password-123');
  await page.getByLabel('Confirm password').fill('new-password-123');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(recoveryRequest).toBe(true);
  expect(verifiedRecoveryCode).toBe(true);
  expect(savedPassword).toBe(true);
});

test('preview legal placeholders and response headers are bilingual and explicit', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the privacy route check once.');
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots', 'phase-16');
  await mkdir(screenshotDirectory, { recursive: true });

  await page.goto('/');
  await expect(page.locator('#landing-footer')).toHaveCount(0);
  await expect(page.locator('#steps')).toHaveCount(0);

  const privacyResponse = await page.goto('/privacy');
  const headers = privacyResponse?.headers();
  expect(headers?.['x-frame-options']).toBe('DENY');
  expect(headers?.['x-content-type-options']).toBe('nosniff');
  expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers?.['cache-control']).toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await expect(page.getByText('pending qualified legal review', { exact: false })).toBeVisible();
  await expect(
    page.getByText('This page is not a complete privacy policy', { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: join(screenshotDirectory, 'privacy-en.png'), fullPage: true });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 812 });
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: join(screenshotDirectory, `privacy-en-${width}.png`),
      fullPage: true,
    });
  }

  await page.goto('/');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Όροι χρήσης' })).toBeVisible();
  await expect(page.getByText('εκκρεμεί έλεγχος', { exact: false })).toBeVisible();
  await expect(page.getByText('δεν αποτελεί δεσμευτικούς όρους', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: join(screenshotDirectory, 'terms-el.png'), fullPage: true });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 812 });
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Όροι χρήσης' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({
      path: join(screenshotDirectory, `terms-el-${width}.png`),
      fullPage: true,
    });
  }
});

test('landing stays focused on one entry action without footer or extra sections', async ({
  page,
}) => {
  const expectMobileFit = async (width: number) => {
    const bounds = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      shell: document.querySelector('#page-shell')?.getBoundingClientRect(),
      ctaBottom: document.querySelector('#landing-cta')?.getBoundingClientRect().bottom ?? Infinity,
      previewTop:
        document.querySelector('#match-preview')?.getBoundingClientRect().top ?? -Infinity,
      previewBottom:
        document.querySelector('#match-preview')?.getBoundingClientRect().bottom ?? Infinity,
      ctaRight: document.querySelector('#landing-cta')?.getBoundingClientRect().right ?? Infinity,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(bounds.shell).not.toBeNull();
    expect(bounds.shell!.height).toBeGreaterThanOrEqual(bounds.viewportHeight - 2);
    expect(bounds.shell!.height).toBeLessThanOrEqual(bounds.viewportHeight);
    const sectionGap = bounds.previewTop - bounds.ctaBottom;
    expect(sectionGap).toBeGreaterThanOrEqual(24);
    expect(sectionGap).toBeLessThanOrEqual(48);
    expect(bounds.shell!.bottom - bounds.previewBottom).toBeLessThanOrEqual(48);
    expect(bounds.ctaRight).toBeLessThanOrEqual(width);
    expect(bounds.documentWidth).toBeLessThanOrEqual(width);
  };

  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await expect(page.locator('#landing-topbar img[alt="ONE MORE football logo"]')).toBeVisible();
    const languageSwitcher = page.locator('#language-switcher');
    await expect(languageSwitcher).toBeVisible();
    await expect(languageSwitcher.getByRole('button')).toHaveCount(1);
    const greekButton = page.getByRole('button', { name: 'Γλώσσα: Ελληνικά' });
    if (await greekButton.isVisible()) await greekButton.click();
    const englishButton = page.getByRole('button', { name: 'Language: English' });
    await expect(englishButton).toHaveText('EN');
    await expectMobileFit(width);
    const previewDimensions = await page.evaluate(() => {
      const pitch = document.querySelector('#demo-pitch')?.getBoundingClientRect();
      const chip = document.querySelector('#demo-pitch-chip')?.getBoundingClientRect();
      const card = document.querySelector('#match-card')?.getBoundingClientRect();
      return pitch && chip && card
        ? {
            pitchWidth: pitch.width,
            pitchHeight: pitch.height,
            cardWidth: card.width,
            chipWidth: chip.width,
            chipHeight: chip.height,
          }
        : null;
    });
    expect(previewDimensions).not.toBeNull();
    expect(previewDimensions!.pitchHeight).toBeGreaterThanOrEqual(150);
    expect(previewDimensions!.pitchHeight).toBeLessThanOrEqual(195);
    expect(previewDimensions!.pitchWidth / previewDimensions!.cardWidth).toBeLessThanOrEqual(0.91);
    expect(previewDimensions!.chipWidth).toBeLessThanOrEqual(54);
    expect(previewDimensions!.chipHeight).toBeLessThanOrEqual(29);
    await expect(page.getByText('LANGUAGE', { exact: true })).toHaveCount(0);
    await expect(page.locator('#landing-footer')).toHaveCount(0);
    await expect(page.locator('#steps')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign in or create account' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
    const topbarTop = await page
      .locator('#landing-topbar')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(topbarTop).toBeGreaterThanOrEqual(36);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const topbar = document.querySelector('#landing-topbar');
            if (!topbar) return Number.POSITIVE_INFINITY;
            const [brand, language] = [
              topbar.children[0],
              topbar.querySelector('#language-switcher'),
            ];
            if (!brand || !language) return Number.POSITIVE_INFINITY;
            const brandBox = brand.getBoundingClientRect();
            const languageBox = language.getBoundingClientRect();
            return Math.abs(
              (brandBox.top + brandBox.bottom) / 2 - (languageBox.top + languageBox.bottom) / 2,
            );
          }),
        { timeout: 2_500 },
      )
      .toBeLessThan(2);

    const headerBounds = await page.evaluate(() => {
      const topbar = document.querySelector('#landing-topbar');
      const brand = topbar?.children[0];
      const logoImage = topbar?.querySelector('img[alt="ONE MORE football logo"]');
      const language = topbar?.querySelector('#language-switcher');
      if (!topbar || !brand || !logoImage || !language) return null;
      const bounds = [brand, language].map((element) => {
        const { top, right, bottom, height } = element.getBoundingClientRect();
        return { center: (top + bottom) / 2, height, right };
      });
      return {
        bounds,
        logoHeight: Number.parseFloat(getComputedStyle(logoImage).height),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(headerBounds).not.toBeNull();
    const [brand, language] = headerBounds!.bounds;
    expect(Math.abs(brand.center - language.center)).toBeLessThan(2);
    expect(Math.abs(headerBounds!.logoHeight - language.height)).toBeLessThanOrEqual(2);
    expect(language.right).toBeLessThanOrEqual(width);
    expect(headerBounds!.scrollWidth).toBeLessThanOrEqual(width);

    await page.waitForTimeout(3_200);
    await page.screenshot({
      path: join(process.cwd(), 'docs', 'screenshots', 'phase-16', `landing-mobile-${width}.png`),
      fullPage: true,
    });
    if (width === 375) {
      await page.screenshot({
        path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'home-html-animation-375.png'),
        fullPage: true,
      });
    }
    await englishButton.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'el');
    const activeGreekButton = page.getByRole('button', { name: 'Γλώσσα: Ελληνικά' });
    await expect(activeGreekButton).toHaveText('EL');
    await expectMobileFit(width);
    if (width === 375) {
      await page.setViewportSize({ width, height: 932 });
      await expectMobileFit(width);
    }
    await activeGreekButton.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectMobileFit(width);

    await page.getByRole('button', { name: 'Sign in or create account' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.locator('img[alt="ONE MORE football logo"]').last()).toBeVisible();
    await expect(page.locator('#auth-floor').last()).toBeAttached();
    await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.png');
  const desktopLayout = await page.evaluate(() => {
    const heroCopy = document.querySelector('#hero-copy');
    const preview = document.querySelector('#match-preview');
    if (!heroCopy || !preview) return null;
    const box = (element: Element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    return {
      hero: box(heroCopy),
      preview: box(preview),
    };
  });
  expect(desktopLayout).not.toBeNull();
  expect(desktopLayout!.hero.right).toBeLessThan(desktopLayout!.preview.left);
  await page.waitForTimeout(3_200);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-17', 'home-html-animation-1440.png'),
    fullPage: true,
  });
});

test('pitch backdrop is shared by landing, sign-in, and signup and stops for reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('#pitch-backdrop')).toBeAttached();
  const motion = page.locator('#pitch-backdrop-motion');
  await expect(motion).toBeAttached();
  await expect
    .poll(() => motion.evaluate((element) => getComputedStyle(element).animationName))
    .toBe('pitch-drift');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => motion.evaluate((element) => getComputedStyle(element).animationName))
    .toBe('none');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('#auth-floor')).toBeAttached();
  await expect(page.locator('#pitch-backdrop-ball')).toBeAttached();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();

  await page.goto('/sign-up');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expect(page.locator('#auth-floor')).toBeAttached();
  await expect(page.getByRole('textbox', { name: 'Name in English' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({
    path: join(process.cwd(), 'docs', 'screenshots', 'phase-16', 'signup-pitch-mobile-375.png'),
    fullPage: true,
  });
});

test('sign-in and create-account share the animated, responsive auth design in English and Greek', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => window.localStorage.setItem('one-more.theme', 'dark'));
  const width = testInfo.project.name === 'mobile-chromium' ? 375 : 1440;
  const height = testInfo.project.name === 'mobile-chromium' ? 812 : 900;
  await page.setViewportSize({ width, height });
  await mkdir(join(process.cwd(), 'docs', 'screenshots', 'phase-17'), { recursive: true });

  for (const route of [
    { path: '/sign-in', title: 'Welcome back', greekTitle: 'Καλώς ήρθες ξανά', steps: 6 },
    {
      path: '/sign-up',
      title: 'Create your account',
      greekTitle: 'Δημιουργία λογαριασμού',
      steps: 9,
    },
  ]) {
    await page.goto(route.path);
    if ((await page.locator('html').getAttribute('lang')) !== 'en') {
      await page.locator('#auth-language-toggle').click();
      const dismiss = page.locator('[role="status"] button');
      if (await dismiss.isVisible()) await dismiss.click();
    }
    await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
    await expect(page.locator('#auth-bg-all')).toHaveCSS('animation-name', 'bg-show');
    await expect(page.locator('#auth-bg-all')).toHaveCSS('animation-duration', '1.4s');
    await expect(page.locator('#auth-card')).toHaveCSS('animation-name', 'auth-card-enter');
    await expect(page.locator('#auth-card')).toHaveCSS('background-color', 'rgba(9, 15, 12, 0.82)');
    await expect(page.locator('#auth-card')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('#auth-card')).toHaveCSS('backdrop-filter', 'blur(10px)');
    await expect(page.getByRole('heading', { name: route.title })).toHaveCSS(
      'color',
      'rgb(242, 245, 236)',
    );
    await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveCSS(
      'background-color',
      'rgba(12, 18, 16, 0.78)',
    );
    await expect(page.locator('#auth-logo-reveal')).toHaveCSS('animation-name', 'auth-logo-pop');
    await expect(page.locator('#pitch-backdrop-ball')).toHaveCSS('animation-name', 'bg-bs');
    await expect(page.locator('#pitch-backdrop-ball')).toHaveCSS('animation-duration', '9s');
    await expect(page.locator('#pitch-backdrop-ball')).toHaveCSS('animation-delay', '2s');
    await expect(page.locator('#pitch-backdrop-ball svg polygon')).toHaveCount(6);
    await expect(page.locator('#auth-ball-trail-x-0')).toHaveCSS('animation-name', 'bg-bx');
    await expect(page.locator('#auth-ball-trail-x-0')).toHaveCSS('animation-duration', '9s');
    await expect(page.locator('#auth-ball-trail-x-0')).toHaveCSS('animation-delay', '2.16s');
    await expect(page.locator('#auth-ball-trail-x-1')).toHaveCSS('animation-delay', '2.08s');
    await expect(page.locator('#auth-ball-trail-y-0')).toHaveCSS('animation-name', 'bg-by');
    await expect(page.locator('#auth-floor')).toHaveCSS('animation-duration', '7s');
    await expect(page.locator('#pitch-backdrop-beam-left')).toHaveCSS(
      'background-image',
      /linear-gradient/,
    );
    await expect(page.locator('#pitch-backdrop-beam-left')).toHaveCSS('filter', 'blur(5px)');
    await expect(page.locator('#pitch-backdrop-beam-left')).toHaveCSS('animation-duration', '8s');
    await expect(page.locator('#pitch-backdrop-beam-right')).toHaveCSS('animation-duration', '10s');
    await expect(page.locator('[id^="auth-light-dot-"]')).toHaveCount(10);
    await expect(page.locator('#auth-cta')).toBeVisible();
    await expect(page.locator('[id^="auth-step-"]')).toHaveCount(route.steps);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.waitForTimeout(2_000);
    await page.screenshot({
      path: join(
        process.cwd(),
        'docs',
        'screenshots',
        'phase-17',
        `auth-${route.path.slice(1)}-${width}-en.png`,
      ),
      fullPage: true,
    });

    await page.getByRole('button', { name: 'Switch language to Greek' }).click();
    await expect(page.getByRole('heading', { name: route.greekTitle })).toBeVisible();
    const dismiss = page.locator('[role="status"] button');
    if (await dismiss.isVisible()) await dismiss.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await expect(page.locator('#auth-cta')).toBeVisible();
    await page.waitForTimeout(2_000);
    const authCardBox = await page.locator('#auth-card').boundingBox();
    expect(authCardBox).not.toBeNull();
    expect(authCardBox!.y).toBeGreaterThanOrEqual(0);
    expect(authCardBox!.y + authCardBox!.height).toBeLessThanOrEqual(height);
    if (route.path === '/sign-in') {
      expect(Math.abs(authCardBox!.y + authCardBox!.height / 2 - height / 2)).toBeLessThan(20);
    }
    await page.screenshot({
      path: join(
        process.cwd(),
        'docs',
        'screenshots',
        'phase-17',
        `auth-${route.path.slice(1)}-${width}-el.png`,
      ),
      fullPage: true,
    });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Καλώς ήρθες ξανά' })).toBeVisible();
  await expect(page.locator('#auth-card')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#pitch-backdrop-ball')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#auth-ball-trail-x-0')).toHaveCSS('display', 'none');
  await expect(page.locator('#auth-light-dot-0')).toHaveCSS('display', 'none');
});

test('auth cards fit and center on a current iPhone-sized viewport', async ({ page }) => {
  const width = 393;
  const height = 852;
  await page.setViewportSize({ width, height });
  await mkdir(join(process.cwd(), 'docs', 'screenshots', 'phase-17'), { recursive: true });

  for (const route of [
    { path: '/sign-in', title: 'Welcome back' },
    { path: '/sign-up', title: 'Create your account' },
  ]) {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
    await page.waitForTimeout(1_200);

    const card = await page.locator('#auth-card').boundingBox();
    expect(card).not.toBeNull();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(width);
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.y + card!.height).toBeLessThanOrEqual(height);
    expect(Math.abs(card!.y + card!.height / 2 - height / 2)).toBeLessThan(20);
    await page.screenshot({
      path: join(
        process.cwd(),
        'docs',
        'screenshots',
        'phase-17',
        `auth-${route.path.slice(1)}-393-en.png`,
      ),
    });
  }
});

test('landing choreography fills a 5v5 place, passes, and celebrates a goal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('#demo-formation')).toBeAttached();
  await expect(page.locator('#demo-formation [id^="demo-starting-player-"]')).toHaveCount(8);
  await expect(page.locator('#demo-formation [id^="demo-connection-"]')).toHaveCount(14);
  await expect(page.locator('#demo-open-slot')).toBeAttached();
  await expect(page.locator('#demo-open-slot-secondary')).toBeAttached();
  await expect
    .poll(() =>
      page
        .locator('#demo-starting-player-5')
        .evaluate((element) => getComputedStyle(element.firstElementChild!).color),
    )
    .toBe('rgb(255, 255, 255)');
  await expect
    .poll(() =>
      page
        .locator('#demo-place-taken-chip')
        .evaluate((element) => getComputedStyle(element.firstElementChild!).color),
    )
    .toBe('rgb(255, 255, 255)');

  const pulse = page.locator('#demo-pass-pulse');
  await expect(pulse.locator('svg polygon')).toHaveCount(6);
  await expect(pulse.locator('svg circle').last()).toHaveAttribute('r', '8');
  await expect(page.locator('#demo-pass-trail-outer')).toBeAttached();
  await expect(page.locator('#demo-pass-trail-inner')).toBeAttached();
  const start = await pulse.boundingBox();
  expect(start).not.toBeNull();
  await expect
    .poll(async () => {
      const next = await pulse.boundingBox();
      return next ? Math.abs(next.x - start!.x) + Math.abs(next.y - start!.y) : 0;
    })
    .toBeGreaterThan(12);

  const placeTakenChip = page.locator('#demo-place-taken-chip');
  await expect
    .poll(() => placeTakenChip.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeGreaterThan(0.8);
  await expect(page.getByText('1 place open')).toBeVisible();
  const goal = page.locator('#demo-goal-callout');
  await expect
    .poll(() => goal.evaluate((element) => Number(getComputedStyle(element).opacity)), {
      timeout: 12_000,
    })
    .toBeGreaterThan(0.8);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const still = await pulse.boundingBox();
  expect(still).not.toBeNull();
  await page.waitForTimeout(350);
  const reduced = await pulse.boundingBox();
  expect(reduced?.x).toBeCloseTo(still!.x, 1);
  expect(reduced?.y).toBeCloseTo(still!.y, 1);
});
