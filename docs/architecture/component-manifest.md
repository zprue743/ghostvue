# Component manifests

The machine-readable public contract for each component. Docs, the future
`@ghostvue/mcp` server, codegen, and evals read the same JSON. The schema and
versioning rules are [ADR 0006](../adr/0006-component-manifest-schema.md).

## Schema

Canonical file:

```text
schemas/component-manifest.schema.json
```

Published export (byte-identical copy):

```ts
import schema from '@ghostvue/core/manifest.schema.json'
```

JSON Schema draft 2020-12. `$id` includes major version `@1`. Each manifest
sets `schemaVersion` (`1.0.0` today). Validate with Ajv's 2020 build
(`ajv/dist/2020`); CI does this in `pnpm test`.

This is not the [token JSON catalog](./tokens.md) from ADR 0005.

## Manifest files

One file per component, next to the package that exports it:

```text
packages/vue/manifests/ghost-button.manifest.json
packages/vue/manifests/ghost-visually-hidden.manifest.json
packages/themes/manifests/ghost-button.manifest.json  // when a themed wrapper adds visual props
```

`pnpm manifests:write` generates `"source": "generated"` files from every
`packages/vue/src/**/Ghost*.vue` and `packages/themes/src/**/Ghost*.vue` using
`vue-component-meta`. New `Ghost*` SFCs are picked up automatically; do not
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
matching SFC exists yet. The themed wrapper lives in `ghost-button.ts`, so its
manifest stays handwritten until it is a `Ghost*.vue` file.

## Required contents

Every manifest lists:

- `name` (`GhostButton`), `package`, `status`, `description`
- `props` — name, TypeScript type string, default, required, description,
  deprecated
- `models` — v-model prop plus `update:*` event
  ([component-state.md](./component-state.md))
- `events` and payload types (component emits only)
- `slots` and slot props
- `exposed` methods and properties
- styling hooks — `data-part` values (`styling.parts`), `data-state` values
  (`styling.states`), `--ghost-*` custom properties (`styling.cssProperties`),
  and optional `styling.attributes` for other stable `data-*` hooks such as
  `data-disabled` or `data-orientation` (name, values, description; an empty
  value list means a presence attribute). The contract is in
  [styling](./styling.md#styling-hooks).
- accessibility — role, APG pattern URL, keyboard map, required ARIA
  attributes
- `examples` — stable example ids matching `examples/<id>.vue`
  (`button/icon-only`). Not repository-root file paths. See
  [executable examples](../contributing/examples.md).
- `spec` (optional, generated when approved) — `{ path, status: 'approved', evidence? }`
  populated by `pnpm manifests:write` only from component specifications whose
  YAML frontmatter has `specStatus: approved` and `approval.evidence`. Spec
  approval status is distinct from component `status` (`experimental`, `beta`,
  `stable`, `deprecated`).

Unknown keys are invalid. Native HTML/ARIA fallthrough is not duplicated into
`props`. Native listeners on a native root are not duplicated into `events`.

## Manifest collections

`pnpm build` also bundles manifests into collections, so consumers can read
every component contract of a package from one JSON file.

| Artifact               | Path                                                                                                                | Published                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Per-package collection | `packages/<dir>/dist/manifest.json`, exported as `@ghostvue/vue/manifest.json` and `@ghostvue/themes/manifest.json` | Yes, a public package export   |
| Workspace collection   | `dist/manifest.json` at the repository root                                                                         | No, a root build artifact only |

```ts
import collection from '@ghostvue/vue/manifest.json' with { type: 'json' }
```

Every package that has `manifests/*.manifest.json` must export
`./manifest.json` backed by `./dist/manifest.json`. The package build writes it
last (`scripts/write-manifest-collection.mjs --package <name>`), after Vite has
emptied `dist`. The root `pnpm build` writes the workspace collection after all
package builds (`--workspace`). There is no catalog package, and core does not
bundle or depend on component packages.

The envelope has its own schema, separate from the single-component schema:

```text
schemas/component-manifest-collection.schema.json
@ghostvue/core/manifest-collection.schema.json   // byte-identical published copy
```

Its `$id` is `https://unpkg.com/@ghostvue/core@1/manifest-collection.schema.json`.
Envelope fields:

- `schemaVersion` — envelope schema version (`1.0.0`), independent of each
  component's own `schemaVersion`.
- `scope` — `package` for a published per-package collection (exactly one
  `packages` entry) or `workspace` for the root artifact.
- `packages` — `{ name, version }` for each contributing package, sorted by
  name. `version` is the `package.json` version at build time.
- `components` — component manifests embedded unchanged (same fields, values,
  and key order as the checked-in files). Each item validates against the
  component manifest schema through its `$id`, so future additive component
  fields flow through without an envelope change.

Components are sorted by `package`, then `name`, using code-unit order so the
output does not depend on the build machine's locale. The same component name
may appear once per package (headless and themed `GhostButton`); a duplicate
`(package, name)` identity, or a component whose `package` is not in the
envelope's `packages`, fails the build.

Versioning follows [ADR 0006](../adr/0006-component-manifest-schema.md):
additive envelope fields may bump `schemaVersion` minor; breaking envelope
changes, or a component schema major bump, bump `schemaVersion` major and the
collection `$id` major.

`pnpm published-exports` (after `pnpm build`) fails when a manifest package is
missing the export, when a built collection does not validate, or when it is
stale versus the checked-in manifests. `pnpm exports:check` runs publint and
attw on the packed tarballs, which include `dist/manifest.json`.

## Gate

A production component does not pass the
[component gate](../agents/COMPONENT_WORKFLOW.md) without a valid manifest.
