# Nuxt and auto-imports

Named imports from `@ghostvue/vue` and `@ghostvue/themes` stay the primary API.
Auto-imports are an optional convenience on top of them, and they default to
the headless layer: nothing themed and no CSS reaches your app until you opt in.

> [!WARNING]
> **Pre-release.** `@ghostvue/nuxt` is not on npm yet, like the other
> packages.

## Nuxt

`@ghostvue/nuxt` is a Nuxt module. Install it next to the headless package:

```bash
pnpm add @ghostvue/vue @ghostvue/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ghostvue/nuxt'],
})
```

With no options, every headless `Ghost*` component and every public
`useGhost*` composable is auto-imported from `@ghostvue/vue`, and no GhostVue
stylesheet is added. Templates can use `<GhostButton>` or `useGhostId()`
without an import. Lower-level helpers such as `useFocusScope` stay named
imports, so they cannot shadow composables of your own.

### Options

Configure the module under the `ghostvue` key.

| Option        | Default      | Effect                                                                                                                   |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `components`  | `'headless'` | `'headless'`: tags resolve to `@ghostvue/vue`. `'themed'`: tags resolve to `@ghostvue/themes`. `false`: none.            |
| `composables` | `true`       | Auto-import the `useGhost*` composables from `@ghostvue/vue`.                                                            |
| `css`         | `[]`         | Theme stylesheets to inject: any of `'default'`, `'calm'`, `'vibrant'`, `'mono'`, `'tokens'` (`@ghostvue/themes/*.css`). |

### Themed components and CSS (opt-in)

Themed wrappers and theme CSS need `@ghostvue/themes`, an optional peer of the
module. Opt in explicitly:

```bash
pnpm add @ghostvue/themes
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ghostvue/nuxt'],
  ghostvue: {
    components: 'themed',
    css: ['calm'],
  },
})
```

```vue
<!-- app.vue -->
<template>
  <main data-ghost-theme="calm">
    <NuxtPage />
  </main>
</template>
```

Resolution is explicit and one layer per tag:

- Each `Ghost*` name registers exactly once. With `components: 'themed'`, a
  name resolves to the themed wrapper when `@ghostvue/themes` exports one.
  Headless-only utilities (for example `GhostPortal`, `GhostVisuallyHidden`,
  `GhostTooltipProvider`, and the `GhostTable*` parts the themed `GhostTable`
  styles) keep resolving to `@ghostvue/vue`.
- To mix layers, keep the mode you use most and import the other component
  with a named import, for example
  `import { GhostButton as GhostUnstyledButton } from '@ghostvue/vue'`.
- If your app or a layer also defines a component with the same name (for
  example `components/GhostButton.vue`), Nuxt keeps yours and the module logs a
  warning naming both sources instead of switching silently.
- Importing a themed wrapper loads the base theme stylesheet, as it does
  outside Nuxt. `css` adds a flagship or token stylesheet on top. The module
  adds `@ghostvue/themes` to `build.transpile` so those CSS imports also work
  during SSR.
- Opting in without `@ghostvue/themes` installed fails the build with an
  install hint, and unknown modes or stylesheet names fail with the accepted
  values.

### SSR

Components render deterministic markup and IDs on the server and hydrate
without mismatches. The repository builds a Nuxt fixture in both modes and
checks the server HTML, hydration console output, interactivity, and injected
CSS in a browser (`pnpm test:nuxt`).

## Vite and other bundlers: `unplugin-vue-components`

For non-Nuxt apps, `@ghostvue/vue/resolver` exports `GhostVueResolver()` for
[`unplugin-vue-components`](https://github.com/unplugin/unplugin-vue-components):

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { GhostVueResolver } from '@ghostvue/vue/resolver'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [GhostVueResolver()] })],
})
```

- It resolves only names that `@ghostvue/vue` exports as components, always to
  `@ghostvue/vue` (headless). Other names, including your own `Ghost*`
  components, fall through to the next resolver.
- It does not auto-import composables or themed wrappers. Import themed
  components from `@ghostvue/themes` by name.
- `@ghostvue/vue` declares `unplugin-vue-components` `^32.0.0` as an optional
  peer, so it is never installed for you; install the plugin yourself. The
  resolver matches its resolver contract structurally and does not import it.

## Supported versions

| Integration               | Supported      | Tested with |
| ------------------------- | -------------- | ----------- |
| Nuxt                      | `^4.6.0`       | 4.6.4       |
| `unplugin-vue-components` | 32.x resolvers | 32.1.0      |
| Vue                       | `^3.5.0`       | 3.5.45      |
