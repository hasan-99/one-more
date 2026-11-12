import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8090',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'firefox',
      testMatch: /phase-15-crossbrowser\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'webkit',
      testMatch: /phase-15-crossbrowser\.spec\.ts/,
      use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run build:web && npx expo serve --port 8090',
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=6144']
        .filter(Boolean)
        .join(' '),
    },
    url: 'http://127.0.0.1:8090',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
