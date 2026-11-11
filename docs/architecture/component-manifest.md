# Component manifests

The machine-readable public contract for each component. Docs, the future
`@slop-ui/mcp` server, codegen, and evals read the same JSON. The schema and
versioning rules are [ADR 0006](../adr/0006-component-manifest-schema.md).

## Schema

Canonical file:

```text
schemas/component-manifest.schema.json
```

Published export (byte-identical copy):

```ts
import schema from '@slop-ui/core/manifest.schema.json'
```

JSON Schema draft 2020-12. `$id` includes major version `@1`. Each manifest
sets `schemaVersion` (`1.0.0` today). Validate with Ajv's 2020 build
(`ajv/dist/2020`); CI does this in `pnpm test`.

This is not the [token JSON catalog](./tokens.md) from ADR 0005.

## Manifest files

One file per component, next to the package that exports it:

```text
packages/vue/manifests/sl-button.manifest.json
packages/vue/manifests/sl-visually-hidden.manifest.json
packages/themes/manifests/sl-button.manifest.json  // when a themed wrapper adds visual props
```

`pnpm manifests:write` generates `"source": "generated"` files from every
`packages/vue/src/**/Sl*.vue` and `packages/themes/src/**/Sl*.vue` using
`vue-component-meta`. New `Sl*` SFCs are picked up automatically; do not
register them in a list. `pnpm manifests` (part of `pnpm verify`) fails when
a generated file is stale versus the SFC.

Machine-derived fields are names and TypeScript types for `props`, `models`
(`update:*` emits paired with a prop), `events`, `slots`, and `exposed`. Native
HTML/ARIA fallthrough (`global` props such as `class` and `key`) is omitted.
Humans maintain prose in the same JSON file: component `description`, `status`,
member descriptions, `styling`, `accessibility`, and `examples`. Regeneration
overwrites types and membership from source and keeps that prose. JSDoc on the
SFC fills a description only when the manifest does not already have one.

Handwritten manifests (`"source": "handwritten"`) remain valid only when no
matching SFC exists yet. The themed wrapper lives in `sl-button.ts`, so its
manifest stays handwritten until it is an `Sl*.vue` file.

## Required contents

Every manifest lists:

- `name` (`SlButton`), `package`, `status`, `description`
- `props` — name, TypeScript type string, default, required, description,
  deprecated
- `models` — v-model prop plus `update:*` event
  ([component-state.md](./component-state.md))
- `events` and payload types (component emits only)
- `slots` and slot props
- `exposed` methods and properties
- styling hooks — `data-part`, `data-state`, `--sl-*` custom properties
- accessibility — role, APG pattern URL, keyboard map, required ARIA
  attributes
- `examples` — stable example ids, not file paths

Unknown keys are invalid. Native HTML/ARIA fallthrough is not duplicated into
`props`. Native listeners on a native root are not duplicated into `events`.

## Gate

A production component does not pass the
[component gate](../agents/COMPONENT_WORKFLOW.md) without a valid manifest.
