---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
'@ghostvue/nuxt': patch
'@ghostvue/eslint-plugin': patch
'@ghostvue/mcp': patch
---

Clean up published package contents. `@ghostvue/themes` no longer ships
compiled test files. `@ghostvue/themes`, `@ghostvue/nuxt`,
`@ghostvue/eslint-plugin`, and `@ghostvue/mcp` no longer ship `.js.map` or
`.d.ts.map` files, which pointed at `src/` files the packages do not include.
`@ghostvue/vue`, `@ghostvue/themes`, `@ghostvue/nuxt`, and
`@ghostvue/eslint-plugin` now include a README.
