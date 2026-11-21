# Component stability policy

Every component manifest declares a `status`: `experimental`, `beta`,
`stable`, or `deprecated`. The status tells consumers how much change to
expect, and tells contributors what evidence a promotion needs. Docs reference
pages show it as a badge, and the
[manifest](../architecture/component-manifest.md) and published manifest
collections (`@ghostvue/vue/manifest.json`) carry the same value for tools,
including the future `@ghostvue/mcp` server.

Stability is **evidence-backed, not inferred**. A status changes only when a
maintainer approves the change in a reviewed pull request that edits the
manifest. A green CI run, a passing automated keyboard record, a package
version, or the age of a component never promotes it. `pnpm manifests` (part
of `pnpm verify`) rejects a declared status whose evidence is missing; it never
sets one.

## Levels

| Status         | Meaning                                                    | Breaking changes                                                       |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `experimental` | Default for new components. The API may still change.      | Allowed in any release when documented in a Changeset.                 |
| `beta`         | API and spec approved, documented, and checked in CI.      | Allowed only with a Changeset and migration notes; prefer deprecation. |
| `stable`       | Beta, plus manual and assistive-technology review, frozen. | Only through the [deprecation process](#deprecation).                  |
| `deprecated`   | Still shipped, with a documented replacement.              | Removed after the [deprecation window](#deprecation).                  |

## Promotion requirements

Each level includes every requirement of the level before it.

### Experimental

- Passes the [component gate](../agents/COMPONENT_WORKFLOW.md): approved spec,
  tests, docs, a valid manifest, and a Changeset when publishable behavior
  changes.
- Breaking changes are permitted but never silent: the Changeset says what
  broke and how to migrate.

### Beta

Enforced by `pnpm manifests`:

- The manifest has an approved `spec` (from spec frontmatter with
  `specStatus: approved` and `approval.evidence`).
- The spec's usage page exists (`docs/components/<name>.md` next to
  `docs/components/<name>-spec.md`).
- `examples` lists at least one executable example.
- The component and every prop, model, event, slot, slot prop, and exposed
  member has a written description, not the generated placeholder text.
- `accessibility.verification.automatedKeyboard` is `passed` when the
  component declares keyboard interaction, and is never `failed`.

Required by review:

- All automated checks pass (`pnpm verify` and the browser suite).
- The public API has been reviewed against the
  [public API standard](./public-api.md).

### Stable

Enforced by `pnpm manifests`:

- `accessibility.verification.manual` is `passed`, with dated evidence of a
  manual interaction review.
- `accessibility.verification.assistiveTechnology` is `passed`, with dated
  evidence of a screen reader or other assistive-technology review.

The schema already requires at least one evidence entry for a `passed`
review, and the [verification contract](../architecture/component-manifest.md#accessibility-verification)
requires that entry to name this component and package. The review process
itself is defined in GHO-44.

Required by review:

- **API freeze.** Promotion to `stable` freezes the public contract recorded in
  the manifest: props, models, events, slots, exposed members, documented
  styling hooks (`data-part`, `data-state`, other `data-*` attributes, classes,
  and `--ghost-*` custom properties), keyboard behavior, focus movement, and
  ARIA semantics. Additive, backwards-compatible changes remain allowed. Any
  other change follows the [deprecation process](#deprecation).
- The review evidence covers the revision being promoted, or a later review
  confirms no behavior changed since.

## Breaking changes before 1.0

Zero-major versions do not permit surprise breakage.

- **Experimental:** a breaking change ships in any release with a Changeset
  that explains the change and the migration.
- **Beta:** a breaking change ships in a minor release with a Changeset and
  migration notes. Deprecate first when a compatible path exists.
- **Stable:** the [deprecation process](#deprecation) applies before 1.0 too.

## Deprecation

For a `stable` API (a component, prop, event, slot, styling hook, or behavior):

1. **Announce.** Ship the deprecation in a release with a Changeset that names
   the replacement and the migration. Mark the prop with a `@deprecated` JSDoc
   tag (the manifest records `deprecated: true`), or set a whole component's
   manifest `status` to `deprecated` and name the replacement in its
   `description` and usage page.
2. **Warn.** Report use of the deprecated API in development with
   `warnGhostDeprecation()` from `packages/vue/src/dev-codes.ts`. It emits
   [`GHOST005`](../warnings.md#ghost005) once per API, wrapped in
   `process.env.NODE_ENV !== 'production'` like every other `GHOST0xx`
   diagnostic. Do not add ad-hoc `console.warn` deprecation messages.
3. **Wait.** Keep the deprecated API working for **at least one minor release
   and at least 30 days** after the release that deprecated it. Both
   conditions must hold.
4. **Remove.** Before 1.0, removal ships in a **minor** release. From 1.0
   onward, removal ships in a **major** release. The Changeset for the removal
   links the deprecation.

Experimental and beta APIs should use the same warning when a deprecation
window is practical, but they are not bound by the minimum window.

## Exceptions

Any exception to this policy, such as a shortened deprecation window for a
security or accessibility defect, requires explicit maintainer approval
recorded in the pull request. The Changeset states the exception and the
reason.

## Demotion

A component may move back from `stable` or `beta` when its evidence no longer
holds, for example after a failed review. Demotion does not by itself permit a
breaking change; the deprecation rules for the previous status still apply to
releases that shipped it.
