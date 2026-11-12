# ADR 0004: Headless and styled layering

Identifiers updated for the GhostVue rebrand (ADR 0010).

- Status: accepted
- Date: 2026-11-11
- Decision owners: repository maintainers

## Context

Architecture docs already say functionality is headless, `@ghostvue/vue` must
not import `@ghostvue/themes`, and new behavior stays in `vue` unless a
non-Vue consumer exists. They do not say whether the public unit is a
composable, a renderless component, a styled component, or all three, or how
a theme attaches without making either path painful.

[PR #20](https://github.com/zprue743/slop-ui/pull/20) implements one Button
as a single unstyled SFC plus optional CSS under `.ghost-theme`. That is a
useful CSS attachment idea, but it does not give a themed component that is
as easy as a headless one, and it uses `data-slot` rather than a stable
part/state vocabulary.

Comparable models:

- **Reka UI / Radix Vue / Ark UI:** composables + unstyled parts. Easy
  headless; themed use is the consumer's problem.
- **PrimeVue:** styled by default, unstyled plus `pt` passthrough objects as
  the escape hatch.
- **Vuetify:** styled components as the product; headless is not a path.

Owner requirement: **both** headless and themed use must be extremely easy.
PrimeVue-style `pt` prop objects are **rejected**. Naming follows ADR 0003
(SLO-9): `GhostButton`, `useGhostButton`. Tokens follow ADR 0005 (SLO-36).

## Decision

Headless behavior lives in **composables**, with **thin unstyled components**
where a native element plus fallthrough is the ordinary call site. **Themed
components wrap** those unstyled components. Styling uses stable attributes,
CSS variables, class/attr fallthrough, and slots — never per-part style
objects.

### Layers

1. **Composable (`@ghostvue/vue`).** `useGhostButton` owns state, a11y, keyboard,
   and SSR. It returns bindings (`rootProps`, maybe `parts`) the consumer or
   the unstyled component spreads. Vue lifecycle stays in `vue`; move logic
   to `core` only with an approved framework-neutral contract.

2. **Thin unstyled component (`@ghostvue/vue`).** `GhostButton` renders the
   native element, spreads composable bindings, forwards `class` and attrs,
   and exposes slots for structure. It ships **no visual styles**. This is
   the easy headless path.

3. **Themed component (`@ghostvue/themes`).** A wrapper around the unstyled
   `GhostButton` that applies default classes, `data-part` / `data-state` that
   the default CSS already targets, and ordinary visual props (`variant`,
   `tone`, `size`). It may import the default stylesheet so themed use is
   one import. Behavior still comes from the composable; the wrapper does
   not reimplement it.

### Styling API (all layers)

- `data-part` names structure (`root`, `icon`, `indicator`).
- `data-state` names state (`loading`, `open`, `disabled`) when a native
  attribute is not already sufficient.
- Visual values come from CSS custom properties emitted from tokens (ADR
  0005).
- `class` and native attrs fall through to the element that owns the
  part.
- Slots customize structure (`icon`, default content).
- **No `pt` / `passthrough` objects. No per-part style-object props.**
  Those encode internal structure as a public map, fight tree-shaking, and
  are hostile to codegen.

`vue` never imports `themes`. `themes` **may** depend on `vue` so themed
wrappers can import unstyled components. That is a new allowed edge;
`scripts/check-package-boundaries.mjs` should gain `@ghostvue/vue` on
`@ghostvue/themes` when the first wrapper lands. Headless packages still
must not require `themes`.

```text
shared <- core <- vue
   ^               ^
   +-------+-------+
           |
         themes (optional; may depend on vue)
```

### Worked example — headless

```vue
<script setup lang="ts">
import { GhostButton } from '@ghostvue/vue'
</script>
<template>
  <GhostButton class="my-btn" :loading="saving" @click="save">
    Save
  </GhostButton>
</template>
```

Own the markup with the composable when the thin component is not enough:

```vue
<script setup lang="ts">
import { useGhostButton } from '@ghostvue/vue'
const { rootProps } = useGhostButton({ loading: saving })
</script>
<template>
  <button v-bind="rootProps" class="my-btn" @click="save">Save</button>
</template>
```

### Worked example — themed

```vue
<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>
<template>
  <GhostButton variant="outline" tone="danger" :loading="saving">
    Delete
  </GhostButton>
</template>
```

The themed `GhostButton` wraps `@ghostvue/vue`'s `GhostButton`, sets `data-part` /
`data-state`, and uses semantic `--ghost-*` variables
([ADR 0007](./0007-token-pipeline.md)). Same behavioral props; visual props
exist only on the themed wrapper.

## Alternatives considered

**One headless SFC plus optional CSS (PR #20).** Rejected as the only
public unit. Themed use then requires a wrapper class, a stylesheet import,
and data attributes for every variant. That is not "extremely easy." Keep
#20's cascade-layer CSS idea inside the themed wrapper.

**PrimeVue `pt` passthrough objects.** Rejected as a hard requirement.
They publish internal structure, multiply API surface, and are a poor
codegen target. `class` fallthrough, slots, `data-part` / `data-state`, and
tokens replace them.

**Themed-only (Vuetify).** Rejected. Headless must be a first-class, easy
path for Tailwind/CSS-Modules consumers and for agents that style
themselves.

**Renderless-only, no unstyled `GhostButton`.** Rejected as the ordinary
headless API. Spreading `rootProps` onto a native element is the escape
hatch, not the default. A thin unstyled component is the easy call site.

**Themed wrappers inside `@ghostvue/vue` that import CSS.** Rejected. That
would make `vue` depend on `themes` and break headless installs.

## Consequences

- #20 should split Button into `useGhostButton` + unstyled `GhostButton` + themed
  wrapper, and rename `data-slot` / `data-loading` toward `data-part` /
  `data-state` where they are styling hooks.
- Compound widgets follow the same split (`useGhostDialog`, `GhostDialog`,
  themed `GhostDialog`).
- Playground/docs may import `@ghostvue/themes` for the easy themed path.

## Compatibility implications

Docs only in this PR; the themes → vue edge is allowed on paper until a
wrapper implements it. Adding `vue` → `themes` would be a boundary
violation. Introducing `pt` later would be a new public surface we have
explicitly refused. Markup must remain correct without the themed package
or its CSS.
