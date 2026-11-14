import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    },
  },
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Preserve the existing chromium snapshot names for visual baselines.
      name: 'chromium',
      grep: /@visual/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-e2e',
      grepInvert: /@visual/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
