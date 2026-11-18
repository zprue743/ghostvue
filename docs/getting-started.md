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
default look. Vue 3.5 or newer is a peer dependency.

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

## Your first themed component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes'

const region = ref('')
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Data region</GhostFieldLabel>
    <GhostFieldDescription>
      Stored replicas stay in this region.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostInput v-bind="field" v-model="region" name="region" />
    </GhostFieldControl>
  </GhostField>
</template>
```

<GhostExample id="field/themed" />

## Going headless

Swap the import to `@ghostvue/vue`. The markup stays the same, and you style the
`ghost-*` classes and `data-part` / `data-state` hooks yourself.

```ts
import { GhostButton } from '@ghostvue/vue'
```

## SSR

Components render deterministic markup and IDs on the server and do not read
browser globals during setup. Mode follows `prefers-color-scheme` in CSS, so
there is no flash of the wrong palette.

## Auto-imports and Nuxt

Prefer named imports. For Nuxt apps, `@ghostvue/nuxt` auto-imports the headless
components and composables, with themed wrappers and CSS as an explicit opt-in;
other Vite apps can use `GhostVueResolver()` from `@ghostvue/vue/resolver`. See
[Nuxt and auto-imports](/auto-imports).

## Next steps

- [Browse components](/components/button)
- [Default theme](/themes/default) and
  [flagships & `defineTheme`](/themes/define-theme)
- [API reference](/reference/)
- [Why GhostVue](/philosophy)
