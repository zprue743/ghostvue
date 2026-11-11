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
packages/themes/manifests/sl-button.manifest.json  // when a themed wrapper adds visual props
```

`SlButton` today is hand-written (`"source": "handwritten"`) from ADR 0004
and the approved Button contract, with `Sl*` names from ADR 0003. SLO-13
will generate manifests from source; do not invent a second shape in the
meantime.

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
- styling hooks — `data-part`, `data-state`, `--slop-*` custom properties
- accessibility — role, APG pattern URL, keyboard map, required ARIA
  attributes
- `examples` — stable example ids, not file paths

Unknown keys are invalid. Native HTML/ARIA fallthrough is not duplicated into
`props`. Native listeners on a native root are not duplicated into `events`.

## Gate

A production component does not pass the
[component gate](../agents/COMPONENT_WORKFLOW.md) without a valid manifest.
