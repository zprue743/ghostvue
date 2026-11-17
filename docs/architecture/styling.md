# Styling architecture

Functionality is headless and must work without the default theme. `@ghostvue/vue`
must never import `@ghostvue/themes` as a requirement for behavior.

Both headless and themed use must be ordinary Vue: a composable and thin
unstyled `GhostButton` from `@ghostvue/vue`, or a themed `GhostButton` from
`@ghostvue/themes` that wraps it. Details, a hard rejection of PrimeVue
`pt` objects, and worked examples are in
[ADR 0004](../adr/0004-headless-styled-layering.md). Component names use the
`Ghost` prefix (`GhostButton`, `useGhostButton`); that convention is
[ADR 0003](../adr/0003-public-component-api-conventions.md).

## Layers

1. **Composable** in `@ghostvue/vue` (`useGhostButton`) owns behavior, a11y, and
   SSR.
2. **Thin unstyled component** in `@ghostvue/vue` (`GhostButton`) spreads those
   bindings onto a native element, forwards `class` and attrs, and exposes
   slots. It ships no visual styles.
3. **Themed wrapper** in `@ghostvue/themes` wraps the unstyled component,
   applies default classes, and exposes ordinary visual props. It may depend
   on `vue`; `vue` still must not depend on `themes`.

## Styling hooks

Components expose stable `data-*` attributes as the documented styling API,
in the style of Radix and Ark. Style against these hooks and `--ghost-*`
custom properties, not against DOM structure. Internal wrapper nesting,
element order, and tag names other than the native semantic element are not
a public contract. Do not add per-part style-object props or a `pt`
passthrough object.

Consumers must remain able to use normal CSS, utility CSS, CSS Modules, or
another theme system. Headless semantics, focus behavior, and state must not
depend on a particular visual treatment.

### Attribute contract

| Attribute                           | Carries                                                                                    | Encoding                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `data-part`                         | Which part of the component an element is. Every element a consumer may style has one.     | Kebab-case token. The outermost element of each component is `root`; other parts use nouns (`trigger`, `content`, `indicator`). |
| `data-state`                        | The component's primary state axis.                                                        | One kebab-case token at a time. Absent when the component is idle or the axis has no active value.                              |
| `data-disabled`                     | Unavailability when `data-state` already carries another axis (checked menu items, pages). | Presence attribute: empty string when true, absent when false.                                                                  |
| Other `data-*` (`data-orientation`) | Secondary axes that are not state, such as layout direction or themed visual props.        | Enumerated token, or a presence attribute for booleans.                                                                         |

Shared `data-state` vocabulary, reused instead of inventing synonyms:

- Disclosure: `open` / `closed` (dialog, popover, menu, collapsible, tooltip
  triggers and contents).
- Selection: `checked` / `unchecked` (switch, checkable menu items),
  `checked` alone where only the selected value is marked (checkbox, radio
  items), `indeterminate` (checkbox, progress).
- Activation: `active` / `inactive` (tabs), `on` / `off` (toggle and
  segmented items).
- Availability and validity: `disabled`, `loading`, `invalid`, `readonly`.

Component-specific values, such as avatar image `loaded` / `error`, are
listed in that component's manifest.

When two states can apply at once, the component documents which one wins
`data-state` and exposes the other through a native attribute or a separate
hook. `GhostButton` prefers `loading` over `disabled` and keeps the native
`disabled` attribute. Menu items keep `checked` in `data-state` and add
`data-disabled`. Pointer-reactive surfaces use `data-interactive` and, on hosts
that already own `data-state`, `data-interactive-state`.

Prefer native and ARIA attributes when they already express the state
(`:disabled`, `[aria-expanded]`, `[aria-current]`). The data hooks exist so
the same selector works across native and composite elements and so utility
CSS has one predictable attribute to target.

### Stability

- Every hook value a component emits is listed in its
  [component manifest](./component-manifest.md) under `styling`: `parts`
  (`data-part`), `states` (`data-state`), `attributes` (other `data-*` hooks
  with their values), and `cssProperties`. The generated component
  reference pages render the same lists.
- Renaming or removing a documented hook value is a breaking change, the same
  as renaming a prop. Adding a part, state, or attribute is additive.
- Undocumented `data-*` attributes (for example internal `data-ghost-*`
  markers) and class names are not part of this contract and may change.
- Hooks render the same during SSR and hydration, so attribute selectors do
  not flash.

### Examples

Plain CSS or CSS Modules:

```css
.button[data-part='root'][data-state='loading'] {
  cursor: progress;
}

.item[data-disabled] {
  opacity: 0.5;
}
```

Tailwind CSS (v3.2+ or v4) arbitrary data variants target the same hooks. The
headless component ships no classes, so utilities apply directly:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { GhostButton } from '@ghostvue/vue'

const saving = ref(false)
</script>

<template>
  <GhostButton
    :loading="saving"
    class="rounded-md bg-blue-600 px-3 py-2 text-white data-[state=disabled]:opacity-50 data-[state=loading]:cursor-progress data-[state=loading]:opacity-75"
  >
    Save
  </GhostButton>
</template>
```

Use `data-[disabled]:` for presence hooks and `data-[orientation=vertical]:`
for enumerated ones. Use `group-data-[state=open]:` with a `group` class on
the parent part to style children from a parent hook. The repository does not
depend on Tailwind; these classes are consumer-side.

## Tokens

Tokens are authored as DTCG JSON and compiled to CSS custom properties,
TypeScript types, and a JSON manifest. See
[design tokens](./tokens.md),
[ADR 0005](../adr/0005-design-token-taxonomy.md),
[ADR 0007](../adr/0007-token-pipeline.md), and
[ADR 0008](../adr/0008-define-theme.md). Public custom properties use
`--ghost-<role>-<part>-<state>`. Components consume semantic tokens only.
Brand themes are generated in Node (`@ghostvue/themes/define`) and applied
with `data-ghost-theme`.
