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

Import a flagship stylesheet once and name it on a root element:

```ts
// main.ts
import { createApp } from 'vue'
import '@ghostvue/themes/calm.css'
import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>

<template>
  <div data-ghost-theme="calm">
    <GhostButton variant="outline" tone="danger">Delete</GhostButton>
  </div>
</template>
```

## Documentation

[ghostvue.dev](https://ghostvue.dev): see
[Getting started](https://ghostvue.dev/getting-started),
[Default theme](https://ghostvue.dev/themes/default), and
[`defineTheme`](https://ghostvue.dev/themes/define-theme).
