# @ghostvue/nuxt

Nuxt module for GhostVue. By default it auto-imports every headless `Ghost*`
component and public `useGhost*` composable from
[`@ghostvue/vue`](https://www.npmjs.com/package/@ghostvue/vue) and adds no CSS.
Themed wrappers and theme stylesheets from
[`@ghostvue/themes`](https://www.npmjs.com/package/@ghostvue/themes) are an
explicit opt-in.

## Install

```bash
pnpm add @ghostvue/vue @ghostvue/nuxt
```

Nuxt `^4.6.0` is a peer dependency. Add `@ghostvue/themes` only if you opt in
to themed components or CSS.

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ghostvue/nuxt'],
})
```

To use themed wrappers and a flagship stylesheet:

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

## Documentation

[ghostvue.dev](https://ghostvue.dev): see
[Nuxt and auto-imports](https://ghostvue.dev/auto-imports) for every option.
