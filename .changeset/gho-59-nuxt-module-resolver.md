---
'@ghostvue/vue': minor
'@ghostvue/nuxt': minor
---

Add auto-import integrations.

- `@ghostvue/vue/resolver` exports `GhostVueResolver()` for `unplugin-vue-components`. It resolves exactly the headless `Ghost*` components `@ghostvue/vue` exports (generated from the registry, not hand-maintained) to named imports from `@ghostvue/vue`, and leaves every other name to other resolvers. `@ghostvue/vue` takes no dependency on the plugin.
- New `@ghostvue/nuxt` module. By default it auto-imports headless components and the public `useGhost*` composables from `@ghostvue/vue` and injects no CSS. `ghostvue.components: 'themed'` resolves tags to `@ghostvue/themes` wrappers (headless-only utilities stay headless), and `ghostvue.css` injects chosen theme stylesheets; both require the optional `@ghostvue/themes` peer. Each tag registers once, and a same-named app component triggers a warning instead of a silent override. Supports Nuxt `^4.6.0`.
