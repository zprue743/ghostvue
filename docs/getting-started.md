# Getting started

GhostVue is two packages: `@ghostvue/vue` is the headless primitive library
(behavior, accessibility, no CSS), and `@ghostvue/themes` is an optional themed
layer: wrappers with visual props plus contrast-tested OKLCH stylesheets.

> [!WARNING]
> **Pre-release.** The packages are not on npm yet; the APIs can still change.
> Try GhostVue in the repository playground today. Requires Node.js 22+ and
> pnpm 11+.

## Try it locally

```bash
git clone https://github.com/zprue743/ghostvue.git
cd ghostvue
pnpm install
pnpm dev        # playground with every component and theme
pnpm docs:dev   # this site, with live examples
```

## Install

Once published, add the headless package, and the themes package if you want the
default look. Vue 3.5 or newer is a peer dependency, and `@ghostvue/themes`
peers on `@ghostvue/vue` so both share one copy. The GhostVue packages share one
version; keep them on the same release.

```bash
pnpm add @ghostvue/vue @ghostvue/themes
```

## Choose headless or themed

| You want                        | Import from        | You get                                                                               |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Your own design system          | `@ghostvue/vue`    | Unstyled, accessible components and `useGhost*` composables. No CSS.                  |
| A polished default you can tune | `@ghostvue/themes` | The same components with `variant`, `tone`, and `size` props and token-driven styles. |

Both are ordinary Vue components with the same behavior and names, so you can
start themed and replace pieces with headless ones later.

## Add a theme

Import a flagship stylesheet once and name it on a root element. Themed components
read tokens from the nearest `data-ghost-theme` host. Importing from
`@ghostvue/themes` already loads the base stylesheet.

```ts
// main.ts
import { createApp } from 'vue'
import '@ghostvue/themes/calm.css'
import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <div data-ghost-theme="calm">
    <RouterView />
  </div>
</template>
```

Flagships: `default`, `calm`, `vibrant`, `mono`. Light and dark follow
`prefers-color-scheme`. Set `data-ghost-mode="dark"` on any element to force it.

## Your first headless component

Import primitives from `@ghostvue/vue` when you want full control over CSS.
Components wire ARIA attributes, IDs, and keyboard behavior while exposing
`ghost-*` classes and `data-part` / `data-state` hooks for your own styles:

<GhostExample id="field/basic" />

## Your first themed component

For styled defaults, import the same components from `@ghostvue/themes` after
loading a flagship stylesheet:

<GhostExample id="field/themed" />

Both layers share the same component names, props, and accessibility behavior, so
you can start themed and swap individual components to `@ghostvue/vue` later.

## SSR

Components render deterministic markup and IDs on the server and do not read
browser globals during setup. Mode follows `prefers-color-scheme` in CSS, so
there is no flash of the wrong palette.

## Tooling: Nuxt, auto-imports, and ESLint

### Auto-imports and Nuxt

Named imports stay the primary API. For Nuxt apps, `@ghostvue/nuxt` auto-imports
headless `Ghost*` components and `useGhost*` composables from `@ghostvue/vue`,
with themed wrappers and CSS as an explicit opt-in. Other Vite apps can use
`GhostVueResolver()` from `@ghostvue/vue/resolver` with
`unplugin-vue-components`. See [Nuxt and auto-imports](/auto-imports).

### ESLint template validation

`@ghostvue/eslint-plugin` validates `<Ghost*>` props, slots, and `v-model`
bindings in `.vue` templates against the library's published component
contracts:

```bash
pnpm add -D @ghostvue/eslint-plugin eslint eslint-plugin-vue
```

```js
// eslint.config.js
import ghostvue from '@ghostvue/eslint-plugin'
import vue from 'eslint-plugin-vue'

export default [
  ...vue.configs['flat/recommended'],
  ghostvue.configs.recommended,
]
```

See [ESLint plugin](/tooling/eslint-plugin) for rule details and configuration
options.

## Next steps

- [Browse components](/components/)
- [Default theme](/themes/default) and
  [flagships & `defineTheme`](/themes/define-theme)
- [Nuxt and auto-imports](/auto-imports) and
  [ESLint plugin](/tooling/eslint-plugin)
- [Using GhostVue with AI agents](/tooling/ai-agents)
- [API reference](/reference/)
- [Why GhostVue](/philosophy)
