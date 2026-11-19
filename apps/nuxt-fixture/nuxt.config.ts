/**
 * One fixture app, two module configurations. `GHOSTVUE_NUXT_FIXTURE` picks
 * the variant so both builds share the same pages and differ only in
 * `@ghostvue/nuxt` options:
 *
 * - `headless` (default): module defaults, no `ghostvue` options at all.
 * - `themed`: explicit themed-wrapper and theme-CSS opt-in.
 *
 * Each variant writes to its own build and output directory so they can be
 * built once and served side by side by tests/nuxt/nuxt-fixture.spec.ts.
 */
import { defineNuxtConfig } from 'nuxt/config'

const variant =
  process.env.GHOSTVUE_NUXT_FIXTURE === 'themed' ? 'themed' : 'headless'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@ghostvue/nuxt'],
  ...(variant === 'themed'
    ? { ghostvue: { components: 'themed', css: ['calm'] } }
    : {}),
  appConfig: { fixtureVariant: variant },
  buildDir: `.nuxt/${variant}`,
  nitro: { output: { dir: `.output/${variant}` } },
  // Keep Vue's hydration mismatch details in the production client bundle so
  // the browser test reports the mismatching node, not only a summary line.
  debug: { hydration: true },
  devtools: { enabled: false },
  telemetry: false,
})
