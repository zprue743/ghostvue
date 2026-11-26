# @ghostvue/vue

Headless, accessible Vue 3 components and `useGhost*` composables. Components
handle behavior, ARIA, IDs, and keyboard support and ship no CSS: style them
with your own classes or through their `ghost-*` classes and `data-part` /
`data-state` hooks. For a styled default, add
[`@ghostvue/themes`](https://www.npmjs.com/package/@ghostvue/themes).

## Install

```bash
pnpm add @ghostvue/vue
```

Vue `^3.5.0` is a peer dependency.

## Usage

```vue
<script setup lang="ts">
import { GhostButton } from '@ghostvue/vue'

function save(): void {
  // persist the form
}
</script>

<template>
  <GhostButton @click="save">Save changes</GhostButton>
</template>
```

`@ghostvue/vue/resolver` exports `GhostVueResolver()` for
`unplugin-vue-components`, and `@ghostvue/vue/manifest.json` is a
machine-readable collection of the component contracts.

## Documentation

[ghostvue.dev](https://ghostvue.dev): see
[Getting started](https://ghostvue.dev/getting-started) and the
[component docs](https://ghostvue.dev/components/).
