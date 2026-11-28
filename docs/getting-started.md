# Getting started

Install `@ghostvue/vue` and `@ghostvue/themes`, load one theme stylesheet, and
import components from `@ghostvue/themes` to get styled, accessible components
in a few minutes. If you bring your own design system, skip to
[Bring your own styles](#bring-your-own-styles) for the unstyled layer.

> [!WARNING]
> GhostVue is published on npm and is in active pre-1.0 development. Minor
> releases may include breaking API changes. Check the
> [release notes](https://github.com/zprue743/ghostvue/releases) before upgrading.

## Install

Install both packages. `@ghostvue/vue` holds the accessible behavior and
`@ghostvue/themes` adds the styled wrappers and stylesheets used below. Vue 3.5
or newer is a peer dependency, and `@ghostvue/themes` peers on `@ghostvue/vue`
so both share one copy. The GhostVue packages share one version; keep them on
the same release.

```bash
pnpm add @ghostvue/vue @ghostvue/themes
```

## Add a theme

Import a flagship stylesheet once and name it on the `<html>` element. Themed
components read tokens from the nearest `data-ghost-theme` host, and overlays
such as dialogs and menus teleport to `<body>` by default, so a host on `<html>`
covers them too. Importing from
`@ghostvue/themes` already loads the base stylesheet, in development and in
production builds, so you do not need a separate
`@ghostvue/themes/default.css` import.

```ts
// main.ts
import { createApp } from 'vue'
import '@ghostvue/themes/calm.css'
import App from './App.vue'

createApp(App).mount('#app')
```

```html
<!-- index.html -->
<html lang="en" data-ghost-theme="calm"></html>
```

Flagships: `default`, `calm`, `vibrant`, `mono`. Light and dark follow
`prefers-color-scheme`. Set `data-ghost-mode="dark"` on any element to force it.

## Your first themed component

Copy this SFC into `App.vue`. It imports `GhostField` and `GhostInput` from
`@ghostvue/themes` and needs no CSS of its own: with the setup above it renders
in the calm palette and follows light and dark. The preview here follows the
documentation theme picker instead.

<GhostExample id="field/themed" />

The label, description, and input are wired together for assistive technology:
`GhostFieldControl` passes the input its `id` and `aria-describedby` through the
slot props. Browse [components](/components/) for the rest of the themed
catalogue; each one imports from `@ghostvue/themes` the same way.

Importing from `@ghostvue/themes` loads the recipe for every themed component.
If your app renders only a few of them and CSS size matters, see
[opt-in theme CSS](/themes/default#opt-in-theme-css): one palette, a shared
base, and only the recipes you use, with components from
`@ghostvue/themes/components`.

## Choose headless or themed

| You want                        | Import from        | You get                                                                               |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Your own design system          | `@ghostvue/vue`    | Unstyled, accessible components and `useGhost*` composables. No CSS.                  |
| A polished default you can tune | `@ghostvue/themes` | The same components with `variant`, `tone`, and `size` props and token-driven styles. |

Both are ordinary Vue components with the same behavior and names, so you can
start themed and replace pieces with headless ones later.

## Bring your own styles

This path is for teams with their own design system or CSS. Every themed
component has a headless counterpart in `@ghostvue/vue` with the same name,
props, and accessibility behavior, and no CSS.

### Your first headless component

Import primitives from `@ghostvue/vue` when you want full control over CSS.
Components wire ARIA attributes, IDs, and keyboard behavior while exposing
`ghost-*` classes and `data-part` / `data-state` hooks for your own styles. This
sample renders with browser defaults until you style it:

<GhostExample id="field/basic" />

If you use only the headless layer, you can leave out `@ghostvue/themes` and
skip [Add a theme](#add-a-theme).

## SSR

Components render deterministic markup and IDs on the server and do not read
browser globals during setup. Mode follows `prefers-color-scheme` in CSS, so
there is no flash of the wrong palette.

## Tooling: Nuxt, auto-imports, and ESLint

### Auto-imports and Nuxt

Named imports stay the primary API, and the steps above work unchanged in
any Vue 3.5 app. For Nuxt apps, `@ghostvue/nuxt` auto-imports headless
`Ghost*` components and `useGhost*` composables from `@ghostvue/vue` and adds
no CSS by default. To get the themed result from this guide through
auto-imports, opt in with `components: 'themed'` and `css: ['calm']` under the
module's `ghostvue` key and put `data-ghost-theme="calm"` on a root element.
Other Vite apps can use `GhostVueResolver()` from `@ghostvue/vue/resolver`
with `unplugin-vue-components`. See [Nuxt and auto-imports](/auto-imports).

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

## Try it from a checkout

Contributors can run the local playground and docs with Node.js 22+ and pnpm 11+.

```bash
git clone https://github.com/zprue743/ghostvue.git
cd ghostvue
pnpm install
pnpm dev        # playground with every component and theme
pnpm docs:dev   # this site, with live examples
```

## Next steps

- [Browse components](/components/)
- [Default theme](/themes/default) and
  [flagships & `defineTheme`](/themes/define-theme)
- [Nuxt and auto-imports](/auto-imports) and
  [ESLint plugin](/tooling/eslint-plugin)
- [Using GhostVue with AI agents](/tooling/ai-agents)
- [API reference](/reference/)
- [Why GhostVue](/philosophy)
