import { defineConfig, devices } from '@playwright/test'

/**
 * Functional specs tagged `@cross-browser` also run in Firefox and WebKit.
 * Keyboard, focus, `inert`, scroll locking, native radio Tab order, and RTL
 * layout are where engines actually differ, so only those representative flows
 * are tagged; the full functional suite stays Chromium-only to keep CI cost
 * flat. Visual baselines are Chromium-only and never run in these projects.
 * See docs/standards/testing.md#cross-browser-functional-matrix.
 */
const CROSS_BROWSER_TAG = /@cross-browser/
const VISUAL_TAG = /@visual/

/**
 * Full-page axe scans of the playground take roughly twice as long in Firefox
 * and WebKit as in Chromium, which can push the tagged overlay specs past the
 * default 30s on a loaded runner. Assertion timeouts are unchanged.
 */
const CROSS_BROWSER_TIMEOUT = 60_000

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? process.env.PLAYWRIGHT_BLOB_REPORT === '1'
      ? 'blob'
      : [['github'], ['html', { open: 'never' }]]
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
      grep: VISUAL_TAG,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-e2e',
      grepInvert: VISUAL_TAG,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-e2e',
      grep: CROSS_BROWSER_TAG,
      grepInvert: VISUAL_TAG,
      timeout: CROSS_BROWSER_TIMEOUT,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-e2e',
      grep: CROSS_BROWSER_TAG,
      grepInvert: VISUAL_TAG,
      timeout: CROSS_BROWSER_TIMEOUT,
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
