# ADR 0006: Component manifest JSON Schema

Identifiers updated for the GhostVue rebrand (ADR 0010). Schema `$id` URLs
amended for the `0.1.0` release (GHO-217); see
[Amendment: hosted v1 URLs](#amendment-hosted-v1-urls).

- Status: accepted
- Date: 2026-11-11
- Decision owners: repository maintainers

## Context

[ADR 0002](./0002-exit-foundation-phase.md) made a machine-readable component
manifest part of the component gate. Until a schema existed, the spec's Public
API section was the interim contract. Docs, the future `@ghostvue/mcp` server,
codegen, and evals cannot share that contract if each tool invents a JSON
shape.

The schema has to be strict enough that an agent can read it alone, versioned
so later fields do not silently break consumers, and published from an
existing package so MCP does not depend on Vue. Token JSON in ADR 0005 is a
different catalog (resolved design tokens) and must not be this file.

## Decision

The canonical schema is JSON Schema draft **2020-12** at
[`schemas/component-manifest.schema.json`](../../schemas/component-manifest.schema.json).
`@ghostvue/core` publishes an identical copy as
`@ghostvue/core/manifest.schema.json`. Core is the package for
framework-independent contracts; Vue-specific fields in the instance (v-model,
slots) are still data, not Vue runtime.

**Identity.** The schema `$id` is
`https://ghostvue.dev/schemas/v1/manifest.schema.json` (major version in the
URL; originally `https://unpkg.com/@ghostvue/core@1/manifest.schema.json`, see
the amendment below). Each instance sets required `schemaVersion`, starting at `1.0.0`. A
breaking change to the instance shape bumps both the `$id` major version and
`schemaVersion` major. Additive fields may bump `schemaVersion` minor while
keeping `$id` `v1` only if old documents remain valid.

**Validation.** Root-only `ajv` 8 (`ajv/dist/2020`). No `ajv-formats`; strings
that look like URLs use `pattern`. Manifests are not loaded at runtime by
`@ghostvue/vue`.

**Instance location.** One file per component:
`packages/<dir>/manifests/<kebab-name>.manifest.json`. Headless `GhostButton`
is `packages/vue/manifests/ghost-button.manifest.json`. Themed wrappers get a
separate themes manifest when they add visual props. Until a `Ghost*.vue`
file exists for a component, checked-in manifests may set
`"source": "handwritten"`. GHO-13 generates `"source": "generated"` files
from Vue sources with `pnpm manifests:write`.

**Shape.** Every component records `name` (`Ghost*`), `package`, `status`
(`experimental` / `beta` / `stable` / `deprecated`), `description`, `props`
(name, TS type string, default, required, description, deprecated), `models`
(prop + `update:*` event per
[component-state.md](../architecture/component-state.md)), `events` and
payload types, `slots` and slot props, `exposed` methods/properties, styling
hooks (`data-part`, `data-state`, `--ghost-*` custom properties), accessibility
(role, APG pattern URL, keyboard map, required ARIA attributes), and example
IDs (`button/icon-only`, matching unpublished `examples/<id>.vue` files).
Objects use `additionalProperties: false`. Every schema field has a
`description`. The keyboard map is the one dictionary (`additionalProperties`
of strings) because key names are not a closed enum. `pnpm manifests` checks
that every example id exists as a file and every example file is listed on a
manifest. A future MCP `get_examples` tool should read
[`examples/registry.ts`](../../examples/registry.ts).

## Alternatives considered

**TypeScript types as the only contract.** Rejected. MCP, docs, and evals need
JSON they can validate without compiling the repo.

**OpenAPI or a custom YAML DSL.** Rejected. JSON Schema is the common
machine-readable schema language; 2020-12 is what Ajv's 2020 build implements.

**Publish from `@ghostvue/vue`.** Rejected. The future MCP package should not
take a Vue dependency to read a JSON Schema. Manifest _instances_ still live
next to the component.

**New `@ghostvue/mcp` or schema package now.** Rejected. No MCP server exists
yet; a package without a current consumer violates the boundary rule.

**ajv-formats for `uri`.** Rejected. Patterns cover APG URLs without another
dependency.

## Consequences

- The component gate's manifest item is this schema, not the spec prose.
- `pnpm test` validates every `*.manifest.json` and rejects fixtures that are
  not named `*.manifest.json`.
- GHO-13 generates manifests with `source: "generated"` via
  `pnpm manifests:write`. Check mode (`pnpm manifests`) is part of
  `pnpm verify`. Output must stay valid against this schema. Prose fields
  stay in the same file and are preserved on regeneration.
- Changing a documented `data-part`, `data-state`, or `--ghost-*` name is
  breaking, same as a renamed prop. CSS variable names follow
  [ADR 0007](./0007-token-pipeline.md).

## Amendment: hosted v1 URLs

- Date: 2026-11-26 (GHO-217, maintainer decision recorded on issue #314)

`@ghostvue/core` stays private for `0.1.0`, so the unpkg `$id` URLs above would
never resolve. The schemas now use distinct URLs on the docs site:

| Schema              | `$id`                                                             |
| ------------------- | ----------------------------------------------------------------- |
| Component manifest  | `https://ghostvue.dev/schemas/v1/manifest.schema.json`            |
| Manifest collection | `https://ghostvue.dev/schemas/v1/manifest-collection.schema.json` |

- The collection's `properties.components.items.$ref` is the component schema
  `$id`, so validators resolve it by identity, not by relative path.
- `schemas/` stays canonical. `packages/core/` and `docs/public/schemas/v1/`
  hold byte-identical copies; VitePress serves `docs/public/` unchanged, so each
  `$id` URL returns exactly the checked-in file.
  `tests/integration/manifest-schema-hosting.test.ts` enforces the ids, the
  `$ref`, and byte equality of every copy.
- `@ghostvue/mcp` exports `manifestSchemaId` with the component `$id`, refuses a
  bundled schema with any other `$id`, and stamps it on every tool response.
- A breaking change publishes a new `v2/` directory beside `v1/`; `v1` files
  are never edited in place once released except for additive changes that keep
  old documents valid.
- Live resolution of both URLs is verified on `https://ghostvue.dev` after the
  docs deploy that ships them.

## Compatibility implications

Additive public export: `@ghostvue/core/manifest.schema.json` (internal since
GHO-217; the hosted v1 URL is the public identity). No runtime
behavior change. No SSR, browser, or accessibility impact beyond documenting
those contracts. Hand-written `GhostButton` is not a published component; it does
not start Button's compatibility clock.
