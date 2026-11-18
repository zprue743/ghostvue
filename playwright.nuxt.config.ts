import { defineConfig, devices } from '@playwright/test'

/**
 * Browser checks for the `@ghostvue/nuxt` SSR fixture (apps/nuxt-fixture).
 *
 * Kept apart from playwright.config.ts because these specs need the Nuxt
 * fixture build (`pnpm test:nuxt` builds it), not the playground and docs
 * dist that the sharded e2e suite downloads. CI runs them in the
 * `nuxt-fixture` job.
 */
export default defineConfig({
  testDir: './tests/nuxt',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium-nuxt', use: { ...devices['Desktop Chrome'] } }],
})
