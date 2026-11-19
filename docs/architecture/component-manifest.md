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
sets `schemaVersion`: `1.0.0`, or `1.1.0` when it records
[`accessibility.verification`](#accessibility-verification). Version `1.1.0`
is additive, so every `1.0.0` document stays valid. Validate with Ajv's 2020 build
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
  attributes, and optional APG conformance evidence
  ([`verification`](#accessibility-verification))
- `examples` — stable example ids matching `examples/<id>.vue`
  (`button/icon-only`). Not repository-root file paths. See
  [executable examples](../contributing/examples.md).

Unknown keys are invalid. Native HTML/ARIA fallthrough is not duplicated into
`props`. Native listeners on a native root are not duplicated into `events`.

## Accessibility verification

`accessibility.verification` (schema `1.1.0`, GHO-42) records APG conformance
evidence in three separate categories. Each has a status of `passed`, `failed`,
or `not-reviewed`:

| Category              | Evidence                                                    | Set by                      |
| --------------------- | ----------------------------------------------------------- | --------------------------- |
| `automatedKeyboard`   | Per declared key, the Playwright tests that press it        | CI, re-checked every commit |
| `manual`              | Dated manual interaction reviews of a named revision        | A human reviewer            |
| `assistiveTechnology` | Dated screen reader or other AT reviews of a named revision | A human reviewer            |

No category implies another. Automated keyboard and axe success never set
`manual` or `assistiveTechnology`; a missing review stays `not-reviewed` with
an empty `evidence` array. A manifest without `verification` means every
category is `not-reviewed`. Readers resolve that default with
`resolveVerification` in `scripts/lib/accessibility-verification.js` rather
than inventing their own.

```json
"verification": {
  "automatedKeyboard": {
    "status": "passed",
    "keys": {
      "Space": [
        {
          "spec": "tests/e2e/checkbox.spec.ts",
          "title": "GhostCheckbox › toggles from Space, shows mixed select-all, and has no axe violations",
          "package": "@ghostvue/vue"
        }
      ]
    }
  },
  "manual": { "status": "not-reviewed", "evidence": [] },
  "assistiveTechnology": { "status": "not-reviewed", "evidence": [] }
}
```

### Automated keyboard evidence

- `keys` extends the existing `keyboard` map. When the status is `passed` or
  `failed`, its key set must equal `accessibility.keyboard` exactly: every
  declared key needs at least one browser test, and no extra keys are allowed.
  `not-reviewed` has an empty `keys` map.
- A test reference is the spec path under `tests/e2e/`, the title path below
  the file (describe titles and the test title joined with `›`, as Playwright
  reports it), and the package whose component instance the test renders. A
  themed instance exercises the headless behavior it wraps; the `package`
  field says which one ran.
- The test must press the key and assert the documented action (real focus
  with `toBeFocused()`, ARIA state, or value), not just mention it.
- The evidence is re-run on every commit, so its revision is the revision that
  ships the manifest. Published collections carry the package version.
- `failed` records a known defect: the mapped test that shows it uses
  `test.fail()` with the tracking issue. When the defect is fixed the test
  passes unexpectedly, CI fails, and the record moves to `passed`.

### Review evidence

Each `manual` or `assistiveTechnology` evidence entry names the reviewed
`component` and `package` (both must equal the manifest's own), the `revision`
(commit SHA or published version), `date`, `reviewer`, `environment`
(`browser`, `platform`, and for AT reviews `assistiveTechnology`), a
`reference` to the review record, and a `summary`. `passed` and `failed` need
at least one entry. The review process itself is GHO-44.

### Enforcement

| Check                                  | Runs in                         | Fails when                                                                                                                                       |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema (`pnpm test`)                   | `verify-unit`                   | Shape or status/evidence pairing is invalid                                                                                                      |
| `pnpm manifests`                       | `verify-static`                 | A declared key is unmapped, a mapped key is undeclared, a spec is missing, evidence names another component, or `schemaVersion` is below `1.1.0` |
| `pnpm keyboard-evidence`               | `verify-static`                 | A reference does not resolve to a `chromium-e2e` test in `playwright test --list`, or is skipped                                                 |
| `check-keyboard-evidence.mjs --report` | `browser`, after merging shards | A mapped test did not execute in `chromium-e2e` or did not pass (a pass after a CI retry counts)                                                 |

The last check reads the merged Playwright JSON report of the same run, so a
title that merely exists in source is not enough. Locally, run the mapped specs
with `PLAYWRIGHT_JSON_OUTPUT_FILE=results.json pnpm exec playwright test <specs>
--project=chromium-e2e --reporter=json` and then
`node scripts/check-keyboard-evidence.mjs --report results.json`.

### Docs and MCP projection

Generated reference pages (`/reference/<package>/<component>`) render an
Accessibility section from the manifest: role, APG pattern, required ARIA
attributes, the keyboard map with the tests behind each key, and one row per
verification category. The future `@ghostvue/mcp` server reads the same
manifest and collection data and must keep the same contract: return the three
categories separately with their own status and evidence, resolve a missing
`verification` to `not-reviewed`, and never summarize them into a single
"accessible" flag.

### Adoption

Recording evidence is opt-in per manifest while components are experimental.
The first set covers the headless `GhostAccordion`, `GhostCheckbox`,
`GhostCombobox`, `GhostSlider`, `GhostSwitch`, `GhostTree`, `GhostTreeGroup`,
and `GhostTreeItem` manifests. Once a manifest records `passed`, adding a key
to its `keyboard` map without a test fails CI.

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
