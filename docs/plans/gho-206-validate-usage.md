# GHO-206: `validate_usage` static validation contract (spec draft)

**Status:** design draft, held for Zac's approval. No implementation, tool
registration, or new dependency is approved by this document.  
**Tracking:** [#313](https://github.com/zprue743/ghostvue/issues/313)
(historical key GHO-206)  
**Scope decision (Zac):** scope GHO-206 to a design draft only. No
implementation and no new parser dependency. Any later implementation needs a
separate approval of this contract, and any new runtime dependency needs its
own review under the [dependency policy](../standards/dependencies.md).

**Related:** [GHO-17 MCP first-release contract](./gho-17-mcp-first-release.md),
[ADR 0015](../adr/0015-mcp-server-first-release.md),
[MCP server docs](../tooling/mcp-server.md),
[ESLint plugin](../tooling/eslint-plugin.md),
[component manifests](../architecture/component-manifest.md),
[package boundaries](../architecture/package-boundaries.md).

## 1. Purpose and non-goals

**Purpose.** Let an agent that is writing Vue code check a snippet against
the GhostVue component manifests through the MCP server it already uses for
discovery, without installing ESLint or running a build. The answer must say
what the manifests prove wrong, and separately what the server could not
check.

`validate_usage` was deferred from the first MCP release (GHO-17, option A,
Nov 17, 2026). `@ghostvue/eslint-plugin` stays the supported path for
consumer CI. `validate_usage` is a quick check for agents while they write
code. It does not replace the plugin, `vue-tsc`, or accessibility review.

**Guarantees.** If implemented as specified:

1. Submitted text is data. The server never evaluates, imports, compiles to a
   render function, type-checks, or otherwise runs any part of it (§7).
2. The tool stays read-only, offline, and idempotent, like the five v1 tools
   (GHO-17 §2). It reads only bundled assets and the submitted string.
3. A diagnostic is reported only when the bundled manifests prove the usage
   wrong for every runtime the snippet could have. Anything the server cannot
   resolve statically is listed as unverified (§5.3) and is never reported as
   an error. A problem that holds only under a caller-supplied
   `assumePackage` is reported as conditional (§5.2), never as a diagnostic,
   because the assumption is not something the server can prove.
4. The result never claims a snippet is correct. A clean result means only
   "no proven problems in what was checked" (§5.1).

**Non-goals.**

| Exclusion                                            | Notes                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Type checking (prop values, slot props, model types) | `vue-tsc` owns types; the manifests store types as display strings    |
| Accessibility conformance                            | Static attributes cannot prove an accessible name, role, or behavior  |
| Runtime behavior, rendering, or SSR checks           | Would need execution, which is excluded                               |
| Syntax validation of Vue templates or TypeScript     | The Vue compiler is the authority; see §6 and §5.1 `not-validated`    |
| Reading consumer files, `package.json`, or lockfiles | GHO-17 excludes arbitrary file access; the snippet is the only input  |
| Multi-file analysis (local wrappers, re-exports)     | One snippet per call; unresolved imports are unverified               |
| Auto-fixes or rewritten source in the response       | Diagnostics may suggest a name; the server never returns edited code  |
| Replacing `@ghostvue/eslint-plugin` in CI            | The plugin remains the CI gate; `validate_usage` aims for parity (§4) |
| Checking non-GhostVue components or design-token CSS | Candidate follow-ups only (§12)                                       |

## 2. Tool shape and registration

The tool would be the sixth `defineTool` entry in `@ghostvue/mcp` and follow
every existing convention in `packages/mcp/src/tool.ts`:

- name `validate_usage`, title `Validate usage`;
- strict Zod input (unknown keys are `INVALID_INPUT`), with the shared
  `expectedGhostvueVersion` guard checked before input validation;
- success payload in `structuredContent` with top-level `schemaVersion` and
  the `ghostvue` stamp added by `defineTool`, checked against its
  `outputSchema` before it is sent;
- the same read-only annotations as the other tools (`readOnlyHint: true`,
  `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`);
- a one-sentence `content` summary for hosts that only show text (§5.4).

Proposed description, which the generated tool table in
`docs/tooling/mcp-server.md` would pick up through `pnpm docs:api:write`:

> Statically check how a Vue SFC or template snippet uses GhostVue components
> against the bundled manifests: unknown props, unknown slots, and undeclared
> v-model bindings. The snippet is never executed. Results list proven
> problems separately from problems that depend on an assumed package and from
> usages that could not be checked, and are not a type or accessibility check.

## 3. Input contract

### 3.1 Fields

| Field                     | Type                                      | Required | Default | Description                                                        |
| ------------------------- | ----------------------------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `source`                  | string                                    | yes      | —       | The snippet. At most 32,768 UTF-8 bytes and 256 nesting levels.    |
| `kind`                    | `"sfc"` \| `"template"`                   | no       | `"sfc"` | A whole single-file component, or template markup only (§3.3).     |
| `assumePackage`           | `"@ghostvue/vue"` \| `"@ghostvue/themes"` | no\*     | —       | `template` only: the package bare `Ghost*` tags are resolved from. |
| `expectedGhostvueVersion` | string                                    | no       | —       | Shared guard (GHO-17 §3.1); mismatch is `VERSION_MISMATCH`.        |

\* `assumePackage` with `kind: "sfc"` is `INVALID_INPUT`: an SFC must say
where its components come from through imports. Without `assumePackage`, a
`template` snippet resolves nothing and every `Ghost*` tag is unverified.

### 3.2 Size limits

- **`source` size:** at most **32,768 bytes** of UTF-8, measured with
  `Buffer.byteLength` in the handler. Zod `.max()` counts UTF-16 code units,
  so it is not used for this limit. The largest executable example today is
  `examples/data-table/server-invoices-router.vue` at 15,720 bytes; the cap is
  about twice that. Over the cap: `INVALID_INPUT`, with a message that gives
  the limit but does not echo the source.
- **Nesting depth:** more than **256** nested template elements returns
  `outcome: "not-validated"` with reason `too-deep` (§5.1), not a tool error,
  because the input was well-formed for the schema.
- **Empty or whitespace-only `source`:** `INVALID_INPUT`.
- **Diagnostics cap:** at most **200** diagnostics, 200 conditional entries,
  and 200 unverified entries per response, sorted as in §5.2, with
  `truncated: true` when any list was cut.

The limits are deliberately small. A larger file can be checked by running
`@ghostvue/eslint-plugin` locally. See open question **Q4**.

### 3.3 Accepted syntax

**`kind: "sfc"`.** One Vue single-file component:

- At most one `<template>` block, with no `lang` or `lang="html"`. Any other
  template language (for example `pug`) returns `not-validated`, reason
  `unsupported-template-lang`.
- At most one `<script setup>` block (`lang` absent, `js`, `ts`, `jsx`, or
  `tsx`). Only its static `import` declarations are read (§3.4).
- A plain `<script>` block, `<style>` blocks, and custom blocks are allowed
  and skipped. Their contents are not read.
- A block with a `src` attribute returns `not-validated`, reason
  `external-block`, because the content lives in another file.
- No `<template>` block: `outcome: "no-findings"` with zero checked elements,
  so a script-only file is not mistaken for a validated template.

**`kind: "template"`.** Markup as it would appear inside `<template>` (no
outer `<template>` wrapper required). Tags are resolved only through
`assumePackage` (§4.1), and the response marks every such resolution as
assumed. Because the snippet itself does not say where its tags come from, any
problem found on an assumed resolution is **conditional** on that assumption:
it is reported in `conditional`, never in `diagnostics` (§5.1, §5.2). A
`template` call therefore never has `outcome: "findings"`.

**Not accepted** (always `not-validated` or unverified, never an error):
render functions, JSX/TSX bodies, `h()` calls, Options API objects, and
strings that are not Vue markup.

### 3.4 Import resolution in `<script setup>`

The same resolution rules as `@ghostvue/eslint-plugin`
([How components are resolved](../tooling/eslint-plugin.md#how-components-are-resolved)):

- `import { GhostButton } from '@ghostvue/vue'`, aliases
  (`import { GhostButton as Btn }`), and namespace imports
  (`import * as Ghost from '@ghostvue/themes'`, used as `<Ghost.GhostButton>`)
  resolve tags. Default-import forms and side-effect imports do not.
- `import type` declarations and inline `type` specifiers are ignored.
- Tags match the local name, its kebab-case form, or PascalCase, as Vue's
  `<script setup>` compiler does.
- Imports from any other specifier (`@ghostvue/vue/resolver`, local files,
  other libraries) leave their tags unresolved.

How much of the script is read depends on the parser option (§6). Under the
recommended option C, only the **import prologue** is read: the run of import
declarations, comments, and whitespace at the start of `<script setup>`. If the
text `@ghostvue/` occurs later in the script, every unresolved tag is reported
unverified with reason `import-outside-prologue` rather than assumed absent.

## 4. Supported static checks

### 4.1 Contract source and version selection

- **One release per process.** The server checks against the manifests bundled
  in its own package, the same version-matched bundle `get_component` serves
  (GHO-17 §4). It never infers a version from the snippet and never reads the
  consumer's `package.json`. To check against another release, run that
  release's server (`npx -y -p @ghostvue/mcp@<version> ghostvue-mcp`).
- **Version guard.** Clients should pass `expectedGhostvueVersion` set to the
  consumer's installed `@ghostvue/vue` version. The server rejects a mismatch
  with `VERSION_MISMATCH` before any work, as every tool does. The `ghostvue`
  stamp on the result records which release answered.
- **Package decides the contract.** Components imported from `@ghostvue/vue`
  are checked against the headless manifest. Components from
  `@ghostvue/themes` are checked against the union of the themed and headless
  manifests, because every themed wrapper forwards attrs, slots, and models to
  the headless component of the same name. This is the rule
  `buildEslintComponentIndex` in `scripts/lib/component-registries.js` applies
  for the ESLint plugin, so both tools agree.
- **Same catalog as `get_component`.** Contracts are derived from the manifests
  the server has already loaded and validated with Ajv
  (`loadComponentCatalog` in `packages/mcp/src/components.ts`), so
  `validate_usage` and `get_component` cannot disagree. If a manifest that a
  snippet uses fails validation, the call fails with `MANIFEST_INVALID`, as
  `get_component` does for that manifest.
- **Exports without a manifest** (composables, helpers, themed compound parts
  such as `GhostAccordionItem` from `@ghostvue/themes`) are unverified with
  reason `no-manifest`. They are not reported as unknown exports, because the
  bundle has no export list to prove that.

Two inputs the ESLint plugin uses are not in the manifests today: the list of
native HTML and SVG attribute names (`packages/eslint-plugin/src/native-attributes.ts`)
and the components whose slot names are consumer data
(`DATA_DRIVEN_SLOT_COMPONENTS`, currently `GhostDataTablePreset` and
`GhostDataTableTable`). `@ghostvue/mcp` cannot import `@ghostvue/eslint-plugin`
(the `mcp-no-vue` dependency-cruiser rule forbids it). See open question
**Q5** for how to share them.

### 4.2 Checks in the first version

Rule ids reuse the ESLint plugin's ids so an agent can map a finding to the
plugin docs and to CI output.

| Rule id                          | Severity | Reports                                                                                                               | Parity                                  |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ghostvue/no-unknown-props`      | error    | Static attribute or `v-bind:name` that is not a declared prop and not a native, ARIA, `data-*`, or listener attribute | Same allow-list and skips as the plugin |
| `ghostvue/no-unknown-slots`      | error    | `#name` / `v-slot:name` for an undeclared slot, or default content when the component has no default slot             | Same as the plugin                      |
| `ghostvue/no-undeclared-v-model` | error    | `v-model` or `v-model:name` the component does not declare                                                            | Same as the plugin                      |

Each diagnostic follows the plugin's existing skips: `v-bind="object"`
spreads, dynamic arguments, `.prop` / `.attr` bindings, elements with a bound
polymorphic `:as`, `#[name]`, `v-model:[name]`, and data-driven slot
components. Each skip becomes an unverified entry (§5.3) instead of silence,
which is the one deliberate difference from the plugin.

### 4.3 Proposed additional checks (need approval)

Not in the ESLint plugin today. Listed so Zac can accept or drop them
(open question **Q6**).

| Rule id                             | Severity | Reports                                                                                     | Why it can be proven                                                                                                                            |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ghostvue/no-missing-required-prop` | error    | A prop with `required: true` that is not bound by an attribute, `v-bind:name`, or `v-model` | Manifests mark 21 props required today (for example `GhostDataTable.columns`). Any `v-bind="object"` spread on the element makes it unverified. |
| `ghostvue/no-deprecated-api`        | warning  | A component with `status: "deprecated"` or a prop with `deprecated: true`                   | Read directly from the manifest. No manifest uses either today, so this rule would report nothing until a deprecation lands.                    |

### 4.4 Checks explicitly out of scope

- **Event names.** Listeners fall through to the root element, so an
  undeclared `@event` is not proof of a mistake.
- **`accessibility.requiredAriaAttributes`.** The field mixes attributes the
  component always sets with attributes the consumer must supply (schema
  description in `packages/core/manifest.schema.json`), so a missing attribute
  cannot be proven wrong. Splitting the field would be a manifest schema change
  under ADR 0006 and is not proposed here.
- **Prop value types and literal unions.** Manifest `type` is a TypeScript
  type string. Checking values would mean interpreting TypeScript, which is
  `vue-tsc`'s job.
- **Slot props, exposed members, template refs, and expressions.**

## 5. Output contract

### 5.1 Outcome

Every success payload has an `outcome`:

| `outcome`       | Meaning                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `findings`      | At least one proven diagnostic. Conditional and unverified entries may also be present.                                       |
| `conditional`   | No proven diagnostics, and at least one conditional entry (a problem that holds only under `assumePackage`).                  |
| `no-findings`   | No diagnostics and no conditional entries. **Not** a statement that the snippet is valid; read `unverified` and `notChecked`. |
| `not-validated` | The server could not analyze the snippet (`notValidatedReason`). `diagnostics`, `conditional`, and `unverified` are empty.    |

`outcome` is computed in that order: `not-validated` if the scan stopped;
otherwise `findings` if `diagnostics` is non-empty; otherwise `conditional` if
`conditional` is non-empty; otherwise `no-findings`. Unverified entries never
change the outcome.

**Rule for assumed resolution.** A finding is proven only when the element's
package comes from the snippet itself (a `<script setup>` import, §3.4). Every
finding on an element resolved through `assumePackage` is conditional, with no
exceptions. The server evaluates only the assumed package's contract and does
not try to prove that a finding is invariant across packages: a bare tag in a
template fragment may also be a locally registered or non-GhostVue component,
so even a finding that holds under both GhostVue packages is not proven for
every runtime. Whether a later version should report such cross-package
agreement is open question **Q9**.
`notValidatedReason` is one of `syntax` (markup the scanner cannot tokenize
safely, for example an unclosed tag or attribute quote), `too-deep`,
`unsupported-template-lang`, `external-block`, `multiple-blocks` (two
`<template>` or two `<script setup>` blocks), or `unsupported-input`. A
`syntax` outcome is not a claim that Vue would reject the snippet: under
option C the scanner is not the Vue compiler, so it reports what it could not
read instead of a syntax error.

Invalid arguments, the size cap, and the version guard are tool errors that
use the existing GHO-17 §10 envelope. **No new error codes** are added.

### 5.2 Payload

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": {
    "version": "0.x.y",
    "assetBundleId": "sha256:…",
    "manifestSchemaId": "https://ghostvue.dev/schemas/v1/manifest.schema.json"
  },
  "outcome": "findings",
  "assumption": null,
  "diagnostics": [
    {
      "rule": "ghostvue/no-unknown-props",
      "severity": "error",
      "message": "GhostButton from @ghostvue/vue has no prop 'variant'. 'variant' is a themed prop; import GhostButton from @ghostvue/themes.",
      "component": {
        "name": "GhostButton",
        "package": "@ghostvue/vue",
        "family": "ghost-button"
      },
      "name": "variant",
      "location": { "line": 6, "column": 16, "endLine": 6, "endColumn": 30 },
      "docs": "/components/button"
    }
  ],
  "conditional": [],
  "unverified": [
    {
      "reason": "spread-binding",
      "component": {
        "name": "GhostInput",
        "package": "@ghostvue/vue",
        "family": "ghost-input"
      },
      "location": { "line": 9, "column": 14, "endLine": 9, "endColumn": 33 },
      "skipped": [
        "ghostvue/no-unknown-props",
        "ghostvue/no-missing-required-prop"
      ]
    }
  ],
  "coverage": {
    "resolution": "imports",
    "elementsChecked": 4,
    "components": [
      {
        "name": "GhostButton",
        "package": "@ghostvue/vue",
        "family": "ghost-button",
        "occurrences": 1
      },
      {
        "name": "GhostInput",
        "package": "@ghostvue/vue",
        "family": "ghost-input",
        "occurrences": 1
      }
    ]
  },
  "notChecked": [
    "types",
    "accessibility",
    "runtime",
    "events",
    "non-ghostvue-components"
  ],
  "truncated": false
}
```

Field rules:

- `assumption` is `{ "package": "<assumePackage>" }` when the call passed
  `assumePackage`, and `null` otherwise. It is the single place the payload
  records the assumption that `conditional` entries depend on.
- `diagnostics` holds proven findings only. It is always empty for
  `kind: "template"`, because every resolution there is assumed (§3.3).
- `conditional[]` entries have exactly the shape of a diagnostic (`rule`,
  `severity`, `message`, `component`, `name`, `location`, `docs`) plus
  `assumption: { "package": … }`, repeated per entry so an entry can be read on
  its own. `severity` is the severity the rule would have if the assumption
  holds. `component.package` is the assumed package. A client that reads only
  `diagnostics` never sees an assumption-dependent problem as proven.
- `diagnostics[].severity` is `error` (the manifest proves the usage wrong) or
  `warning` (valid today but discouraged, only `no-deprecated-api`). There is
  no `info` severity: anything uncertain belongs in `unverified`, so a client
  that filters on severity cannot mistake an unknown for a finding.
- `diagnostics[].name` is the attribute, slot, or model name the rule is
  about, truncated to 100 characters. `message` may contain that name, the
  component name and package, and up to 50 declared names. It never quotes
  expressions or other snippet text.
- `component` uses the GHO-17 §3.2 identity fields, so a client can call
  `get_component` with the same `name` and `package`.
- `docs` is a docs-site path in the same form as `search_docs` hit `link`.
- `location` is 1-based `line` and `column`, with columns counted in UTF-16
  code units of `source`, the same convention ESLint uses. `end*` positions
  are exclusive. For `kind: "template"`, positions are relative to `source` as
  given.
- `coverage.resolution` is `imports` for `sfc`, `assumed` for `template` with
  `assumePackage`, and `none` otherwise. `elementsChecked` counts elements
  that resolved to a manifest and were checked by at least one rule.
- `notChecked` is a fixed list for a given server version so clients can show
  it without guessing. It is part of the contract, not a per-call computation.
- `unverified[].component` is present when the element resolved to a
  component, and omitted for `unresolved-tag` and `dynamic-component`, where
  nothing resolved.
- Sort order: each list by `location` (line, then column), then `rule` or
  `reason`, so the same input always yields the same payload.

### 5.3 Unverified reasons

| `reason`                  | When                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `unresolved-tag`          | A `Ghost*`-looking tag (PascalCase `Ghost…` or kebab `ghost-…`) with no matching import              |
| `no-manifest`             | Imported from `@ghostvue/vue` or `@ghostvue/themes`, but the export has no manifest                  |
| `dynamic-component`       | `<component :is>` or another dynamic tag                                                             |
| `spread-binding`          | `v-bind="object"` on a resolved element                                                              |
| `dynamic-argument`        | `:[name]`, `#[name]`, or `v-model:[name]`                                                            |
| `prop-or-attr-modifier`   | `.prop` or `.attr` binding                                                                           |
| `polymorphic-as`          | A bound `:as` on a component that declares `as`; its attributes may belong to the rendered component |
| `data-driven-slots`       | Slot names are consumer data (`GhostDataTablePreset`, `GhostDataTableTable`)                         |
| `v-pre`                   | Element inside a `v-pre` subtree, which Vue does not compile                                         |
| `import-outside-prologue` | `@ghostvue/` appears in script code the scanner did not read (§3.4)                                  |

Unverified entries name the rule ids they skipped so a client knows exactly
what was not checked on that element.

### 5.4 Text summary

The `content` text is one sentence built from fixed templates and follows the
same rule as the payload: only `diagnostics` are counted as proven, and
conditional entries are counted separately next to the assumption they depend
on. It never includes snippet text. The sentence is built from these clauses,
joined with `; ` and ended with `. Not a type or accessibility check.`:

1. Always: `N proven problem(s)` from `diagnostics.length`, or
   `No proven problems` when it is zero.
2. Only when `assumption` is not `null`:
   `K problem(s) if bare Ghost tags come from <package>` from
   `conditional.length`, or `none if bare Ghost tags come from <package>` when
   it is zero.
3. Only when `unverified` is non-empty:
   `M usage(s) could not be checked statically`.

Counts use the singular noun for 1 (`1 proven problem`, `1 problem`,
`1 usage`), and the first letter of the sentence is capitalized.

For `not-validated`, the sentence is instead
`Not validated (<notValidatedReason>). Not a type or accessibility check.`
For example: "2 proven problems; 1 usage could not be checked statically. Not
a type or accessibility check.", or for a template under `@ghostvue/vue`, "No
proven problems; 1 problem if bare Ghost tags come from @ghostvue/vue. Not a
type or accessibility check." The text never calls a conditional entry a
proven problem, and never omits the assumption when one was made.

### 5.5 Tool contract version

Adding a tool does not change any existing tool's input or output, so this
draft keeps `toolContractSchemaVersion` at `1.0.0`. Bumping it would change
the `schemaVersion` literal on every tool's payload. See open question **Q3**.

## 6. Parser approach

The tool needs, for one snippet: SFC block boundaries, template element tags
with source positions, attribute and directive names with their arguments and
modifiers, whether an element has non-whitespace children, and the import
declarations of `<script setup>`. It does not need expression ASTs, type
information, or code generation.

| Option                                                                          | New dependency for `@ghostvue/mcp`                                                                          | Boundary impact                                                                                                                    | Accuracy                                                                                                                                                               | Install size (measured from this workspace's store)                                                                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A.** `@vue/compiler-dom` `parse` (or `@vue/compiler-sfc`)                     | Yes. In the lockfile at 3.5.45 through `vue`, but new to `@ghostvue/mcp`                                    | The `mcp-no-vue` dependency-cruiser rule forbids every `@vue/*` import from `packages/mcp`; ADR 0015 decision 5 needs an amendment | Exact Vue template grammar and SFC block parsing. Imports still need `@babel/parser` (a transitive of compiler-core)                                                   | About 3.8 MiB (compiler-dom, compiler-core, shared, `@babel/parser`, entities, estree-walker, source-map-js). The mcp production tree was 17,407,541 bytes against the 18 MiB cap, so this would exceed it |
| **B.** `vue-eslint-parser`, or ESLint's `Linter` with `@ghostvue/eslint-plugin` | Yes. `vue-eslint-parser` is only a peer and dev dependency of the ESLint plugin today and peers on `eslint` | `mcp-no-vue` forbids importing `@ghostvue/eslint-plugin`; running the plugin in-process also pulls ESLint into the server          | Same AST and, with `Linter`, the same rule code as CI, so parity is exact                                                                                              | Larger than A (ESLint, espree, eslint-scope, and their trees); exceeds the cap                                                                                                                             |
| **C.** In-house scanner in `packages/mcp`                                       | No                                                                                                          | None                                                                                                                               | Covers only the subset above. Anything outside it becomes `not-validated` or unverified, never a diagnostic                                                            | None                                                                                                                                                                                                       |
| **D.** No parser: publish usage contracts only                                  | No                                                                                                          | None                                                                                                                               | No validation. A tool (or a field on `get_component`) returns the compiled props, models, and slots per package, and the agent checks itself or runs the ESLint plugin | None                                                                                                                                                                                                       |

**Recommendation under the current decision: option C**, with D as the
fallback if Zac judges a hand-written scanner too risky. A and B both add a
runtime dependency, break the 18 MiB install cap, and change the package
boundary, so each would need a dependency review under
[dependencies.md](../standards/dependencies.md), an ADR 0015 amendment, and
an update to `.dependency-cruiser.mjs`. This draft does not request any of
that.

**Option C constraints**, so the scanner stays small and conservative:

- One linear pass over `source`. No regular expression with nested or
  overlapping quantifiers runs on submitted text, to rule out catastrophic
  backtracking.
- Recognizes SFC top-level blocks; within `<template>`, start and end tags,
  quoted and unquoted attribute values (including `>` inside quotes),
  comments, mustache interpolations treated as opaque text, raw-text elements
  (`<script>`, `<style>`, `<textarea>`, `<title>`), self-closing tags, and
  `v-pre` subtrees.
- Directive names are split into name, argument, and modifiers following Vue's
  shorthand rules (`:`, `@`, `#`, `.`), with the same camelize step the ESLint
  plugin applies.
- Any construct outside that list, or any mismatch it cannot pair, ends the
  scan with `not-validated` / `syntax`. The scanner never guesses.
- Script reading is limited to the import prologue (§3.4), with a small
  lexer for strings, comments, and the `import` grammar only.

**Accuracy evidence required before merge (option C):**

1. Every executable example under `examples/` (261 `.vue` files today) scans
   without `not-validated` and yields zero diagnostics, since examples are
   known-good usage.
2. A parity fixture set, shared with the ESLint plugin's rule tests, gives the
   same diagnostics from both tools for every case the plugin covers.
3. A comparison test, using `@vue/compiler-dom` as a **development**
   dependency only (already in the workspace through `vue`), checks that every
   element and attribute the scanner reports matches the compiler's AST on the
   example corpus and on the fixtures. This keeps the scanner honest without
   shipping the compiler. Whether a dev-only use in `packages/mcp` tests is
   acceptable under `mcp-no-vue` is open question **Q2**.

## 7. No execution, privacy, and resource bounds

- **No execution path.** The implementation must not use `eval`,
  `new Function`, `node:vm`, `import()` of submitted text, worker threads that
  load it, the Vue compiler's code generation, or the TypeScript compiler. A
  test submits snippets whose script and expressions would have observable side
  effects (for example writing a global or calling `process.exit`) and asserts
  that nothing happens.
- **No disk or network.** The snippet is never written to disk. The tool keeps
  `openWorldHint: false`.
- **No snippet text in logs.** The stderr diagnostic log may record the tool
  name, `kind`, byte length, and outcome, never source text. Errors thrown
  inside the scanner must not embed source text, because `INTERNAL` details are
  logged (`describeError` in `packages/mcp/src/tool.ts`).
- **Bounded work.** Input size and nesting depth are capped (§3.2), the scan is
  linear, and the response is capped at 200 diagnostics and 200 unverified
  entries. A test feeds adversarial inputs at the size cap (deep nesting, long
  attribute lists, unterminated quotes and comments) and asserts completion
  within a fixed time budget chosen at implementation.

## 8. False-positive boundaries

A diagnostic must be correct for every runtime the snippet could have. A
problem that is correct only under an assumption the caller supplied
(`assumePackage`) is not a diagnostic; it is a conditional entry (§5.1). These
are the known edges and how the contract treats them:

| Case                                                              | Treatment                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom non-native attribute meant to fall through (`foo-bar="x"`) | Reported by `no-unknown-props`, matching the plugin. The message suggests a `data-*` attribute or a declared prop.                                                                                                                                                                 |
| Native attribute valid on some element but not the rendered one   | Accepted. The native list is the union across elements, because manifests do not say which element a component renders.                                                                                                                                                            |
| Kebab-case and camelCase forms of the same prop                   | Treated as the same prop, as Vue does.                                                                                                                                                                                                                                             |
| Globally registered components (plugin install, Nuxt auto-import) | `unresolved-tag` for `kind: "sfc"`. `kind: "template"` with `assumePackage` is the way to check such snippets.                                                                                                                                                                     |
| `assumePackage` picks the wrong package                           | No diagnostic is affected: every finding under the assumption is in `conditional`, tagged with the assumed package, and the text summary names it. For example, `<GhostButton variant="outline">` is clean under `@ghostvue/themes` and conditional under `@ghostvue/vue` (§10.1). |
| Manifest is wrong or out of date                                  | A manifest bug, fixed in the manifest. The bundle is version-matched, so results match the release the server ships with.                                                                                                                                                          |

False negatives are expected and allowed. Under-reporting is the safe
direction; every skip is visible in `unverified`.

## 9. Package boundary and dependencies

- No change to `scripts/workspace-packages.mjs` or `.dependency-cruiser.mjs`
  under option C or D. `@ghostvue/mcp` keeps `allowedDependencies:
['@ghostvue/core']` and its three runtime dependencies.
- No change to `pnpm-lock.yaml` or `pnpm-workspace.yaml`.
- Options A and B are outside the current decision (§6).

## 10. Tests, docs, and release (for the later implementation)

When an implementation issue is approved:

- **Unit tests** in `packages/mcp/src/validate-usage.test.ts`: each rule
  positive and negative; every unverified reason; every `not-validated`
  reason; size, depth, and diagnostics caps; sort order and determinism;
  themed union semantics; `outcome` precedence (§5.1); every text summary
  clause (§5.4); `MANIFEST_INVALID` for a corrupt referenced manifest; the
  no-execution test in §7; and the assumed-package fixture in §10.1.
- **Corpus and parity tests** in §6.
- **Server tests:** `tools/list` returns six tools; `pnpm mcp:packed` smoke
  calls `validate_usage` once and checks its `outputSchema`. The packed smoke
  test's "exactly the five tools" assertion would change to six.
- **Docs:** a `validate_usage` section in `docs/tooling/mcp-server.md` with the
  limitations from §4.4 and §8; the generated tool table via
  `pnpm docs:api:write`; an update to ADR 0015, whose decision 3 lists five
  tools.
- **Release:** a minor Changeset for `@ghostvue/mcp`, which bumps the
  `fixed` group of publishable packages together.

### 10.1 Fixture: one template under both package assumptions

The same `kind: "template"` source is validated three times, with only
`assumePackage` changed. Today's manifests declare `variant` on the themed
`GhostButton` but not on the headless one.

```vue
<GhostButton variant="outline">Save</GhostButton>
```

`variant="outline"` spans line 1, columns 14 to 31 (exclusive). Each case
asserts the fields below; `schemaVersion`, `ghostvue`, `notChecked`, and
`truncated: false` are as in §5.2.

| Case                                | `outcome`     | `assumption`                        | `diagnostics` | `conditional`        | `unverified`         | `coverage`                                                                              |
| ----------------------------------- | ------------- | ----------------------------------- | ------------- | -------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `assumePackage: "@ghostvue/themes"` | `no-findings` | `{ "package": "@ghostvue/themes" }` | `[]`          | `[]`                 | `[]`                 | `resolution: "assumed"`, `elementsChecked: 1`, `GhostButton` from `@ghostvue/themes` ×1 |
| `assumePackage: "@ghostvue/vue"`    | `conditional` | `{ "package": "@ghostvue/vue" }`    | `[]`          | one entry, see below | `[]`                 | `resolution: "assumed"`, `elementsChecked: 1`, `GhostButton` from `@ghostvue/vue` ×1    |
| no `assumePackage`                  | `no-findings` | `null`                              | `[]`          | `[]`                 | one `unresolved-tag` | `resolution: "none"`, `elementsChecked: 0`, `components: []`                            |

The conditional entry under `@ghostvue/vue`:

```json
{
  "rule": "ghostvue/no-unknown-props",
  "severity": "error",
  "message": "GhostButton from @ghostvue/vue has no prop 'variant'. 'variant' is a themed prop; import GhostButton from @ghostvue/themes.",
  "component": {
    "name": "GhostButton",
    "package": "@ghostvue/vue",
    "family": "ghost-button"
  },
  "name": "variant",
  "location": { "line": 1, "column": 14, "endLine": 1, "endColumn": 31 },
  "docs": "/components/button",
  "assumption": { "package": "@ghostvue/vue" }
}
```

The `unresolved-tag` entry without an assumption covers the tag name
`GhostButton` (line 1, columns 2 to 13), has no `component` field (§5.2), and
lists every enabled rule in `skipped`.

Expected text summaries (§5.4), asserted exactly:

| Case               | `content` text                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `@ghostvue/themes` | `No proven problems; none if bare Ghost tags come from @ghostvue/themes. Not a type or accessibility check.`   |
| `@ghostvue/vue`    | `No proven problems; 1 problem if bare Ghost tags come from @ghostvue/vue. Not a type or accessibility check.` |
| no `assumePackage` | `No proven problems; 1 usage could not be checked statically. Not a type or accessibility check.`              |

A fourth, control case submits the same markup as `kind: "sfc"` with
`import { GhostButton } from '@ghostvue/vue'` in `<script setup>`. There the
package comes from the snippet, so the same finding is a proven diagnostic:
`outcome: "findings"`, `assumption: null`, the entry in `diagnostics` without
an `assumption` field, `conditional: []`, and the text
`1 proven problem. Not a type or accessibility check.` This pins the rule
that the source of resolution, not the finding itself, decides proven versus
conditional.

## 11. Open questions for Zac

1. **Q1 — Parser approach.** Approve option C (in-house scanner, no
   dependency), option D (contracts only, no validation), or reopen the
   dependency decision for option A? Recommendation: C.
2. **Q2 — Dev-only compiler in tests.** May `packages/mcp` tests use
   `@vue/compiler-dom` (already in the workspace through `vue`) as a dev-only
   oracle for the scanner, with a narrow `mcp-no-vue` exception for `*.test.ts`
   files? Recommendation: yes; without it, scanner accuracy rests on fixtures
   alone.
3. **Q3 — Contract version.** Keep `toolContractSchemaVersion` at `1.0.0`
   when adding a tool, or bump to `1.1.0` for every tool? Recommendation: keep
   `1.0.0`, since no existing shape changes.
4. **Q4 — Size limits.** Accept 32,768 UTF-8 bytes, 256 nesting levels, and
   200 entries per list?
5. **Q5 — Shared inputs.** Generate the native attribute list and the
   data-driven slot component set into both packages from one source at
   `pnpm registries:write` (no import edge), or add data-driven slots to the
   manifest schema (an ADR 0006 change)? Recommendation: generate both from
   `scripts/lib/component-registries.js`, next to the existing ESLint
   component index.
6. **Q6 — Extra checks.** Include `no-missing-required-prop` and
   `no-deprecated-api` (§4.3) in the first version, or keep strict parity with
   the ESLint plugin? Recommendation: include `no-missing-required-prop`;
   `no-deprecated-api` can wait until a deprecation exists.
7. **Q7 — Template snippets.** Keep `kind: "template"` with `assumePackage`,
   or accept only whole SFCs? Recommendation: keep it, because agents often
   produce template fragments, and every finding under an assumed package is
   reported as conditional, never as proven (§5.1).
8. **Q8 — ADR.** Record the sixth tool as an amendment to ADR 0015 or as a new
   ADR? Recommendation: amend ADR 0015, since transport, data, and boundary are
   unchanged under option C.
9. **Q9 — Cross-package agreement for templates.** Should a later version
   evaluate a `template` snippet against both package contracts and mark a
   conditional entry that holds under both (for example an unknown slot on a
   component both packages declare identically)? It would still not be
   proven, because a bare tag may be a non-GhostVue component, but it would
   tell the agent the package choice does not matter. Recommendation: not in
   the first version; the single-assumption rule in §5.1 is simpler to test and
   explain.

## 12. Candidate follow-ups (not proposed for the first version)

- A `ghostvue/no-unknown-token` check for `var(--ghost-…)` names in `<style>`
  blocks against the bundled `tokens.json`.
- An unknown-export check once the bundle carries the public export list of
  `@ghostvue/vue` and `@ghostvue/themes`.
- Splitting `accessibility.requiredAriaAttributes` into component-set and
  consumer-required lists, which would let a later version report a proven
  missing accessible-name attribute.

## 13. Proposed implementation issues (after approval)

| Proposed title                     | Scope                                                                                                | Complexity |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| Shared usage-contract data for MCP | Generate native attributes, data-driven slot set, and per-package contracts into the MCP bundle (Q5) | S          |
| Static SFC/template scanner        | Option C scanner, corpus and parity tests, adversarial input tests                                   | M          |
| `validate_usage` tool              | `defineTool` entry, rules, output schema, docs section, ADR 0015 amendment, packed smoke, Changeset  | M          |

Complexity: **S** is about one focused PR; **M** is several modules and tests.
