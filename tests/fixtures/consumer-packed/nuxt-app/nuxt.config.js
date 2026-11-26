// `GHOSTVUE_SMOKE_VARIANT=themed` checks the explicit opt-in; the default
// checks the module's headless defaults with no `ghostvue` options at all.
const themed = process.env.GHOSTVUE_SMOKE_VARIANT === 'themed'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@ghostvue/nuxt'],
  ...(themed ? { ghostvue: { components: 'themed', css: ['calm'] } } : {}),
  buildDir: themed ? '.nuxt/themed' : '.nuxt/headless',
  devtools: { enabled: false },
  telemetry: false,
})
