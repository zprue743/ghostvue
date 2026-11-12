# ADR 0003: Public component API conventions

Identifiers updated for the GhostVue rebrand (ADR 0010).

- Status: accepted
- Date: 2026-11-11
- Decision owners: repository maintainers
- Superseded in part: the original `Sl` / `useSl*` prefix rule is replaced by
  [ADR 0010](./0010-rebrand-to-ghostvue.md) (`Ghost` / `useGhost*`)

## Context

The first components in [PR #20](https://github.com/zprue743/slop-ui/pull/20)
(`Button`) and [PR #21](https://github.com/zprue743/slop-ui/pull/21)
(`VisuallyHidden`) export unprefixed PascalCase names from `@ghostvue/vue`.
Master has not recorded the name prefix, whether `app.use()` is required, how
Volar `GlobalComponents` and `unplugin-vue-components` should work, or how
props, events, slots, and composables are named.

Those choices leak into every later component. For an AI-native library they
have to be predictable for codegen: one import style, one naming scheme, an
optional plugin rather than a required one. Comparable Vue libraries diverge:

| Library             | Component name                  | Registration               | Types                    |
| ------------------- | ------------------------------- | -------------------------- | ------------------------ |
| PrimeVue            | Unprefixed (`Button`)           | Optional plugin + resolver | Ships `GlobalComponents` |
| Vuetify             | Prefixed (`VBtn`)               | Required plugin            | Automatic globals        |
| Reka UI / Radix Vue | Unprefixed parts (`DialogRoot`) | Named imports              | Per import               |
| Ark UI              | Unprefixed (`Button`)           | Named imports              | Per import               |
| Shoelace            | Prefixed (`sl-button`)          | Custom elements            | Custom-element types     |

ADR 0004 (SLO-10) splits headless composables from themed wrappers. Both
layers share these naming and registration rules.

## Decision

Conventions below are the public Vue component API. They extend
[public-api.md](../standards/public-api.md).

**Component names.** Public Vue components use the `Ghost` prefix: `GhostButton`,
`GhostDialog`, `GhostVisuallyHidden`. The prefix is recorded in
[ADR 0010](./0010-rebrand-to-ghostvue.md), which supersedes the `Sl` prefix
originally accepted here. CSS classes, custom properties, and documented hooks
use the `ghost-` namespace (`ghost-button`) so they do not collide with
Shoelace's `sl-` custom-element CSS. Vue name `GhostButton` pairs with class
`ghost-button`. Semantic custom properties later moved to
`--ghost-<role>-<part>-<state>` in [ADR 0007](./0007-token-pipeline.md).

**Composables.** Public composables use `useGhost*`: `useGhostButton`,
`useGhostDialog`. The `Ghost` prefix is the same public namespace as the
components. Plain `useButton` would collide with app-level composables and
with Reka/Ark if both are installed, and agents would no longer have one
prefix to search. Headless behavior lives in these composables; see ADR 0004.

**Exports.** Named, tree-shakeable ESM exports are the **primary** API:

```ts
import { GhostButton, useGhostButton } from '@ghostvue/vue'
import { GhostButton as GhostButtonThemed } from '@ghostvue/themes'
```

An optional `app.use()` plugin is a **convenience** for global registration
and default config, not a requirement:

```ts
import { createApp } from 'vue'
import GhostVue from '@ghostvue/vue'

createApp(App).use(GhostVue)
```

The plugin registers the `Ghost*` components already exported by name. It must
not be the only way to get a component, inject a theme runtime, or enable
behavior. Headless usage never requires the plugin.

**GlobalComponents.** Ship Vue `GlobalComponents` types so `<GhostButton>`
type-checks when the plugin or the resolver is used. Intended subpath:
`@ghostvue/vue/components`. The plugin's types reference that module. Named
imports type-check without it. Do not augment `GlobalComponents` from the
main ESM entry, so apps that only use named imports do not pick up globals.

**Resolver.** When implemented, export `GhostVueResolver()` for
`unplugin-vue-components` from `@ghostvue/vue/resolver`. It resolves
`GhostButton` → `@ghostvue/vue` `GhostButton` and `useGhostButton` as a directive-free
import. Do not add the `unplugin-vue-components` dependency until docs or
the playground need auto-import; this ADR locks the contract.

**Props, events, slots.**

- Props are camelCase. Boolean props omit `is`/`has` (`disabled`, `loading`,
  `open`).
- Native HTML and ARIA attributes fall through. Do not redeclare `aria-*` as
  camelCase props.
- Headless components (`@ghostvue/vue`) expose behavioral props only. Visual
  variant, tone, and size belong on themed wrappers (`@ghostvue/themes`) as
  ordinary props, not as PrimeVue `pt` objects. See ADR 0004.
- Prefer native listeners on a native root. Component emits use
  `update:modelValue` or named `update:open` for v-models, and semantic
  verbs (`select`, `close`) otherwise.
- `default` is the primary content slot. Named slots are semantic structure
  (`icon`, `title`). Styling parts use `data-part` / `data-state`, not Vue
  slots invented only to target CSS.

**Compound components.** Flattened named exports (`GhostDialog`,
`GhostDialogTrigger`, `GhostDialogContent`), not `GhostDialog.Trigger` namespaces.
Flattened names autoresolve and type-check more reliably for agents.

## Alternatives considered

**No prefix (`Button`), matching PrimeVue/Reka/Ark and PRs #20/#21.**
Rejected by the owner. Unprefixed names collide under global registration
and auto-import, which the optional plugin and resolver will offer.

**`GhostVueButton` / `VButton`.** Rejected. `GhostVue` is long in templates; `V` is
Vuetify's namespace.

**Plain `use*` composables.** Rejected. Components are `Ghost*`; composables
that omit the prefix reintroduce collisions and split the public namespace.

**Required `app.use()` (Vuetify).** Rejected as the primary path. Named
imports stay tree-shakeable and honest for codegen. The plugin is optional
convenience.

**PrimeVue `pt` / per-part style-object props.** Rejected in ADR 0004 as a
hard requirement. Naming rules here must not grow a `pt` prop.

## Consequences

- #20 and #21 must rename `Button` → `GhostButton` and `VisuallyHidden` →
  `GhostVisuallyHidden` when they rebase, and extract `useGhostButton` /
  `useGhostVisuallyHidden` per ADR 0004.
- Resolver and `GlobalComponents` types are specified but not implemented
  here (docs only, no new dependency).
- CSS remains `ghost-*` even though Vue names are `Ghost*`.

## Compatibility implications

No package export changes in this PR. Once components ship, dropping `Ghost`,
requiring the plugin, or augmenting `GlobalComponents` from the main entry
would be breaking. No SSR or accessibility impact from the conventions
themselves; each component still owns those contracts.
