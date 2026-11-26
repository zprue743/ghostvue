# @ghostvue/themes

The optional themed layer for GhostVue: wrappers around the
[`@ghostvue/vue`](https://www.npmjs.com/package/@ghostvue/vue) components with
`variant`, `tone`, and `size` props, design tokens (`tokens.css`,
`tokens.json`), and the `default`, `calm`, `vibrant`, and `mono` flagship
themes. `@ghostvue/themes/define` exports Node-only `defineTheme` for custom
themes.

## Install

```bash
pnpm add @ghostvue/vue @ghostvue/themes
```

Vue `^3.5.0` is a peer dependency.

## Usage

Import a flagship stylesheet once and name it on the `<html>` element, so
overlays that teleport to `<body>` (dialogs, menus, popovers) share the
palette:

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

```vue
<!-- App.vue -->
<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>

<template>
  <GhostButton variant="outline" tone="danger">Delete</GhostButton>
</template>
```

Importing from `@ghostvue/themes` loads every component recipe. To ship only
the recipes you use, import components from `@ghostvue/themes/components` and
add one palette, `@ghostvue/themes/base.css`, and the
`@ghostvue/themes/recipes/<family>.css` files you need. See
[opt-in theme CSS](https://ghostvue.dev/themes/default#opt-in-theme-css).

## Documentation

[ghostvue.dev](https://ghostvue.dev): see
[Getting started](https://ghostvue.dev/getting-started),
[Default theme](https://ghostvue.dev/themes/default), and
[`defineTheme`](https://ghostvue.dev/themes/define-theme).
