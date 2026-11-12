# Public API standard

Published APIs evolve more slowly than internals. Design the smallest coherent
contract and expose only what consumers need.

Simple component use should rely on direct props and conventional Vue models.
Configuration describes behavior rather than internal markup. Advanced needs
progress through callbacks, slots/custom rendering, and lower-level primitives.

Public APIs require:

- deliberate, readable TypeScript types and TSDoc;
- documented defaults, states, edge cases, SSR behavior, and accessibility;
- behavior and type tests appropriate to the contract;
- consumer-data freedom through properties, accessors, identities, or adapters;
- an analysis of backwards compatibility and migration impact; and
- a Changeset for changes that affect a publishable package.

Deprecate before removal when feasible. Explain the replacement and retain a
reasonable migration window. Changes in event timing, focus movement, keyboard
behavior, inferred types, semantic attributes, or required markup can be breaking
even when a prop name is unchanged.

Use one public entry point per package by default. Internal files should not be
reachable through sprawling barrels or undocumented deep imports.

## Vue component conventions

These rules implement [ADR 0003](../adr/0003-public-component-api-conventions.md)
and the `Ghost` prefix in [ADR 0010](../adr/0010-rebrand-to-ghostvue.md).
They apply to public components in `@ghostvue/vue` and themed wrappers in
`@ghostvue/themes`.

### Names

- Component exports use the `Ghost` prefix (`GhostButton`, `GhostDialog`,
  `GhostVisuallyHidden`) per [ADR 0010](../adr/0010-rebrand-to-ghostvue.md).
- Public composables use `useGhost*` (`useGhostButton`, `useGhostDialog`) so the
  library has one searchable namespace.
- CSS classes and documented hooks use the `ghost-` prefix (`ghost-button`).
  Semantic custom properties use `--ghost-<role>-<part>-<state>`
  (`--ghost-action-primary-bg`) per [ADR 0007](../adr/0007-token-pipeline.md).
  Class names still avoid Shoelace's `sl-` custom-element namespace.
- Compound parts are flattened named exports (`GhostDialogTrigger`), not
  `GhostDialog.Trigger` namespaces.

### Registration

- Named, tree-shakeable ESM imports are the primary API:
  `import { GhostButton, useGhostButton } from '@ghostvue/vue'`.
- An optional `app.use(GhostVue)` plugin may register those same `Ghost*`
  components globally and apply documented defaults. It is never required
  for a component to work.
- `GlobalComponents` types ship on an intended subpath
  `@ghostvue/vue/components` for plugin and auto-import users. The main
  entry must not augment globals.
- `unplugin-vue-components` support, when implemented, is `GhostVueResolver()`
  from `@ghostvue/vue/resolver`, resolving `GhostButton` to `@ghostvue/vue`.
  Do not add that dependency until a consumer in this repo needs auto-import.

### Props, events, and slots

- Props are camelCase. Boolean props omit `is`/`has` (`disabled`, `loading`,
  `open`).
- Native HTML and ARIA attributes fall through. Do not redeclare `aria-*` as
  camelCase props.
- Headless components expose behavioral props only. Visual `variant`,
  `tone`, and `size` belong on themed wrappers. Do not add PrimeVue-style
  `pt` / passthrough objects or per-part style-object props.
- Prefer native listeners on a native root. Component emits use
  `update:modelValue` or named `update:open` for v-models, and semantic
  verbs (`select`, `close`) otherwise.
- `default` is the primary content slot. Named slots are semantic structure.
  Styling parts use `data-part` and `data-state`, not Vue slots invented
  only to target CSS.

Documented classes, custom properties, and `data-part` / `data-state` hooks
are public styling APIs. Changing them requires the same compatibility
review as a renamed prop.
