# GhostVue

GhostVue is a headless-first UI library for Vue 3. Build with accessible
components for forms, overlays, tables, and more. Bring your own styles with
`@ghostvue/vue` or add ready-to-use themes with `@ghostvue/themes`.

[Documentation](https://ghostvue.dev/) ·
[Components](https://ghostvue.dev/components/) ·
[Live demo](https://ghostvue.dev/examples) ·
[Release notes](https://github.com/zprue743/ghostvue/releases)

## Quickstart

In a Vue 3.5+ app, install the headless package:

```bash
pnpm add @ghostvue/vue
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GhostButton } from '@ghostvue/vue'

const count = ref(0)
</script>

<template>
  <GhostButton @click="count++">Count: {{ count }}</GhostButton>
</template>
```

For styled components, follow the [themed quickstart](https://ghostvue.dev/getting-started).
GhostVue is published on npm and is in active pre-1.0 development. Minor
releases may include breaking changes.

## Tooling

GhostVue also provides [Nuxt auto-imports](https://ghostvue.dev/auto-imports),
[ESLint rules](https://ghostvue.dev/tooling/eslint-plugin) for Vue templates,
and [component manifests and an MCP server](https://ghostvue.dev/tooling/ai-agents)
for editors and coding agents.

## Contributing

Start with [CONTRIBUTING.md](./CONTRIBUTING.md) or browse the
[roadmap](https://ghostvue.dev/roadmap). To work on the library locally, use
Node.js 22+ and pnpm 11+:

```bash
pnpm install
pnpm verify
```

Run `pnpm docs:dev` for the docs or `pnpm dev` for the playground. Coding
agents should start with [AGENTS.md](./AGENTS.md).

## License

[MIT](./LICENSE)
