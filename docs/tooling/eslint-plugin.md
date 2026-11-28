# ESLint plugin

`@ghostvue/eslint-plugin` checks how Vue templates use GhostVue components. It
compares each usage against the component manifests that also drive the
[API reference](/reference/) and the
[component docs](../components/index.md), so people and coding agents get the
same contract in the editor that the docs describe.

The first release has three rules. They report only what the manifest proves
wrong, and they skip anything they cannot resolve statically.

| Rule                                                       | Reports                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`ghostvue/no-unknown-props`](#no-unknown-props)           | An attribute that is not a declared prop or a native, ARIA, or data one |
| [`ghostvue/no-unknown-slots`](#no-unknown-slots)           | Slot content for a slot the component does not declare                  |
| [`ghostvue/no-undeclared-v-model`](#no-undeclared-v-model) | `v-model` or `v-model:name` that the component does not declare         |

## Setup

Install the plugin next to ESLint and
[eslint-plugin-vue](https://eslint.vuejs.org/), whose flat configs set
`vue-eslint-parser` for `.vue` files. The GhostVue rules need that parser.

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

`configs.recommended` registers the plugin under the `ghostvue` namespace and
enables all three rules as errors for `**/*.vue`. To pick rules yourself,
register the plugin and set rules directly:

```js
export default [
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    plugins: { ghostvue },
    rules: { 'ghostvue/no-unknown-props': 'warn' },
  },
]
```

For `<script setup lang="ts">`, set `languageOptions.parserOptions.parser` to
the TypeScript parser as eslint-plugin-vue documents. The rules have no
options. A `.vue` file that is not parsed by `vue-eslint-parser` gets one error
that names the missing parser instead of passing silently.

## How components are resolved

A tag is checked only when it resolves to a component export that has a
manifest:

- Imports in a `<script setup>` SFC from `@ghostvue/vue` or `@ghostvue/themes`,
  including aliases (`import { GhostButton as Btn }`) and namespace imports
  (`<Ghost.GhostButton>`). Imports from `@ghostvue/themes/components` (the
  [opt-in theme CSS](../themes/default.md#opt-in-theme-css) entry) use the
  themed contracts and are reported as `@ghostvue/themes`.
- Tags written as the import name, in kebab case (`<ghost-button>`), or in
  PascalCase, matching how Vue's `<script setup>` compiler resolves them.
- The package you import from decides the contract. Themed components accept
  their own visual props (such as `variant` on `GhostButton`) plus the
  headless props, slots, and models they forward. The headless component from
  `@ghostvue/vue` does not accept themed-only props.

These usages are never checked, because they carry no static evidence:

- Components from other packages or local files, and globally registered or
  Options API (`components: {}`) registrations.
- `<component :is>`, lowercase tags without a hyphen (Vue treats them as
  native elements), and type-only imports.
- Exports without their own manifest, such as themed compound parts like
  `GhostAccordionItem` from `@ghostvue/themes`. The headless parts from
  `@ghostvue/vue` do have manifests and are checked.

## no-unknown-props

Reports a static attribute or `v-bind:name` on a resolved component when the
name is not a declared prop and is not an attribute the component lets fall
through to its root element.

```vue
<script setup lang="ts">
import { GhostButton } from '@ghostvue/vue'
</script>

<template>
  <!-- Error: 'variant' is a themed prop; import GhostButton from @ghostvue/themes. -->
  <GhostButton variant="soft">Save</GhostButton>

  <!-- OK: declared prop, native, ARIA, data, and listener attributes. -->
  <GhostButton
    type="submit"
    id="save"
    aria-describedby="hint"
    data-test="save"
    @click="save"
  >
    Save
  </GhostButton>
</template>
```

Allowed without a matching prop:

- Native HTML and common SVG attribute names (`id`, `name`, `placeholder`,
  `tabindex`, `title`, `fill`, and so on), in kebab or camel case. The rule
  does not know which element a component renders, so a name that is valid on
  any element is accepted.
- `aria-*` (and `ariaLabel` style) and `data-*` attributes.
- `class`, `style`, `key`, `ref`, and listener bindings such as `:onClick`.

Skipped: `v-bind="object"` spreads, dynamic arguments (`:[name]`),
`.prop`/`.attr` bindings, and every attribute on an element that binds a
polymorphic `:as`, because the rendered component may accept those props.
The rule does not check value types; use `vue-tsc` for that.

## no-unknown-slots

Reports slot content for a slot the component does not declare: `#name` or
`v-slot:name` on a child `<template>` or on the component itself, and implicit
default content (text, interpolations, or elements) when the component has no
default slot.

```vue
<script setup lang="ts">
import { GhostCard, GhostInput } from '@ghostvue/vue'
</script>

<template>
  <GhostCard>
    <!-- Error: GhostCard declares default, footer, and header. -->
    <template #heading>Title</template>
  </GhostCard>

  <!-- Error: GhostInput has no default slot. -->
  <GhostInput>Email</GhostInput>
</template>
```

Whitespace and comments are not content. Dynamic slot names (`#[name]`) are
skipped, and slot props are not checked. `GhostDataTableTable` and
`GhostDataTablePreset` are skipped too: their slot names are your column ids,
so vue-tsc checks them instead.

## no-undeclared-v-model

Reports `v-model` (the `modelValue` prop) or `v-model:name` when the component
does not declare that model.

```vue
<script setup lang="ts">
import { GhostDialog } from '@ghostvue/themes'
</script>

<template>
  <!-- Error: GhostDialog declares v-model:open, not v-model. -->
  <GhostDialog v-model="isOpen" />

  <!-- OK -->
  <GhostDialog v-model:open="isOpen" />
</template>
```

Dynamic arguments (`v-model:[name]`) are skipped. Modifiers and value types
are not checked.

## Limitations

- **Static evidence only.** The rules never report a name they cannot
  resolve. A missing report is not proof that a usage is correct.
- **No type checking.** Prop value types, slot props, and model types belong to
  `vue-tsc`.
- **No accessible-name checks.** Rules do not infer whether, for example, an
  icon-only button has an accessible name. Follow each component's
  accessibility section in the [component docs](../components/index.md).
- **No deprecation or event checks.** Deprecated APIs, emitted events, and
  broader dynamic analysis are out of scope for this release.
- **Contract source.** Contracts are compiled from the manifests at build time,
  so a plugin version describes the components released with it. Keep
  `@ghostvue/eslint-plugin` on the same version as `@ghostvue/vue` and
  `@ghostvue/themes`.

Each diagnostic names the component, the package it was imported from, the
declared props, slots, or models, and links to that component's docs page.
