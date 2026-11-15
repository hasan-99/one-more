import { expect, test } from '@playwright/test';

// The web app must ship hardened response headers and still run under its own Content-Security-Policy.
test('pages send security headers and load without CSP violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/content security policy|refused to (load|execute|connect|apply)/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (/content security policy/i.test(error.message)) violations.push(error.message);
  });

  for (const path of ['/', '/sign-in', '/sign-up', '/privacy']) {
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    const headers = response!.headers();
    expect(headers['strict-transport-security'], path).toContain('max-age=');
    expect(headers['x-content-type-options'], path).toBe('nosniff');
    expect(headers['x-frame-options'], path).toBe('DENY');
    expect(headers['cross-origin-opener-policy'], path).toBe('same-origin');
    expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
    const csp = headers['content-security-policy'];
    expect(csp, path).toContain("default-src 'self'");
    expect(csp, path).toContain("frame-ancestors 'none'");
    expect(csp, path).toContain("object-src 'none'");
    await page.waitForLoadState('networkidle');
  }

  await page.goto('/sign-in');
  await expect(page.getByLabel('Password')).toBeVisible();
  expect(violations).toEqual([]);
});
