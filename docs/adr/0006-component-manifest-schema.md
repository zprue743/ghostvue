# ADR 0006: Component manifest JSON Schema

- Status: accepted
- Date: 2026-11-11
- Decision owners: repository maintainers

## Context

[ADR 0002](./0002-exit-foundation-phase.md) made a machine-readable component
manifest part of the component gate. Until a schema existed, the spec's Public
API section was the interim contract. Docs, the future `@slop-ui/mcp` server,
codegen, and evals cannot share that contract if each tool invents a JSON
shape.

The schema has to be strict enough that an agent can read it alone, versioned
so later fields do not silently break consumers, and published from an
existing package so MCP does not depend on Vue. Token JSON in ADR 0005 is a
different catalog (resolved design tokens) and must not be this file.

## Decision

The canonical schema is JSON Schema draft **2020-12** at
[`schemas/component-manifest.schema.json`](../../schemas/component-manifest.schema.json).
`@slop-ui/core` publishes an identical copy as
`@slop-ui/core/manifest.schema.json`. Core is the package for
framework-independent contracts; Vue-specific fields in the instance (v-model,
slots) are still data, not Vue runtime.

**Identity.** The schema `$id` is
`https://unpkg.com/@slop-ui/core@1/manifest.schema.json` (major version in the
URL). Each instance sets required `schemaVersion`, starting at `1.0.0`. A
breaking change to the instance shape bumps both the `$id` major version and
`schemaVersion` major. Additive fields may bump `schemaVersion` minor while
keeping `$id` `@1` only if old documents remain valid.

**Validation.** Root-only `ajv` 8 (`ajv/dist/2020`). No `ajv-formats`; strings
that look like URLs use `pattern`. Manifests are not loaded at runtime by
`@slop-ui/vue`.

**Instance location.** One file per component:
`packages/<dir>/manifests/<kebab-name>.manifest.json`. Headless `SlButton`
is `packages/vue/manifests/sl-button.manifest.json`. Themed wrappers get a
separate themes manifest when they add visual props. Until an `Sl*.vue`
file exists for a component, checked-in manifests may set
`"source": "handwritten"`. SLO-13 generates `"source": "generated"` files
from Vue sources with `pnpm manifests:write`.

**Shape.** Every component records `name` (`Sl*`), `package`, `status`
(`experimental` / `beta` / `stable` / `deprecated`), `description`, `props`
(name, TS type string, default, required, description, deprecated), `models`
(prop + `update:*` event per
[component-state.md](../architecture/component-state.md)), `events` and
payload types, `slots` and slot props, `exposed` methods/properties, styling
hooks (`data-part`, `data-state`, `--sl-*` custom properties), accessibility
(role, APG pattern URL, keyboard map, required ARIA attributes), and example
IDs. Objects use `additionalProperties: false`. Every schema field has a
`description`. The keyboard map is the one dictionary (`additionalProperties`
of strings) because key names are not a closed enum.

## Alternatives considered

**TypeScript types as the only contract.** Rejected. MCP, docs, and evals need
JSON they can validate without compiling the repo.

**OpenAPI or a custom YAML DSL.** Rejected. JSON Schema is the common
machine-readable schema language; 2020-12 is what Ajv's 2020 build implements.

**Publish from `@slop-ui/vue`.** Rejected. The future MCP package should not
take a Vue dependency to read a JSON Schema. Manifest _instances_ still live
next to the component.

**New `@slop-ui/mcp` or schema package now.** Rejected. No MCP server exists
yet; a package without a current consumer violates the boundary rule.

**ajv-formats for `uri`.** Rejected. Patterns cover APG URLs without another
dependency.

## Consequences

- The component gate's manifest item is this schema, not the spec prose.
- `pnpm test` validates every `*.manifest.json` and rejects fixtures that are
  not named `*.manifest.json`.
- SLO-13 generates manifests with `source: "generated"` via
  `pnpm manifests:write`. Check mode (`pnpm manifests`) is part of
  `pnpm verify`. Output must stay valid against this schema. Prose fields
  stay in the same file and are preserved on regeneration.
- Changing a documented `data-part`, `data-state`, or `--sl-*` name is
  breaking, same as a renamed prop. CSS variable names follow
  [ADR 0007](./0007-token-pipeline.md).

## Compatibility implications

Additive public export: `@slop-ui/core/manifest.schema.json`. No runtime
behavior change. No SSR, browser, or accessibility impact beyond documenting
those contracts. Hand-written `SlButton` is not a published component; it does
not start Button's compatibility clock.
