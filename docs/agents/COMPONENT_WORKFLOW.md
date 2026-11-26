# Component workflow

This page is the **canonical component gate**. A production component may be
added only when every item below is present in the same change or a stacked
predecessor. Do not start markup to stand in for an unresolved design.

1. **Approved specification.** A spec based on
   [the component template](../components/spec-template.md), reviewed enough
   to resolve public behavior and accessibility. Its YAML frontmatter records
   component identity, manifest references, required-section applicability
   (with a `reason` for any `applicable: false` entry), `unresolvedQuestions: []`,
   and `specStatus: approved` with `approval.evidence` (distinct from the
   manifest's `status` stability field). Run `pnpm specs:check` to validate
   completeness; see [Spec completeness check](#spec-completeness-check).
2. **Tests.** Behavior tests for the public contract (Vue/unit), browser
   tests for observable interaction (`pnpm test:e2e`), and type tests when
   the exported declaration extends beyond custom props. Follow
   [TESTING_RULES.md](./TESTING_RULES.md).
3. **Public documentation.** API reference and examples in `docs/components/`,
   plus a playground exercise of the supported patterns. Runnable samples are
   typed SFCs under `examples/<component>/<id>.vue`, rendered with
   `<GhostExample id="..." />` on the docs page. Follow
   [executable examples](../contributing/examples.md).
4. **Machine-readable manifest.** A JSON file that validates against
   [the component-manifest schema](../architecture/component-manifest.md)
   ([ADR 0006](../adr/0006-component-manifest-schema.md)). Place it at
   `packages/<dir>/manifests/<kebab-name>.manifest.json`. After the `Ghost*.vue`
   file exists, run `pnpm manifests:write` so props, emits, slots, and
   exposed types are derived from source; keep descriptions, accessibility,
   styling hooks, and examples as prose in that file. `pnpm manifests` is
   part of `pnpm verify`. Do not invent a parallel shape. The docs page's
   props, events, and slots tables are generated from the manifest: run
   `pnpm docs:api:write` after it changes (`pnpm docs:api` checks them).
5. **Changeset.** Required when a publishable package's consumer-visible
   behavior changes.

[ADR 0002](../adr/0002-exit-foundation-phase.md) records why the
foundation-phase moratorium ended and why this list is the replacement.

## Spec and implementation sequence

After the gate's specification item is satisfied:

1. Define purpose, user problems, non-goals, and composition with existing
   primitives.
2. Design the smallest simple API and its progressive escape hatches.
3. Define controlled and uncontrolled state, consumer-data assumptions, events,
   slots, and exposed methods.
4. Specify semantic roles, keyboard interactions, focus movement, disabled
   behavior, and assistive-technology relationships before markup is chosen.
5. Identify loading, empty, error, async, SSR, hydration, touch, performance, and
   virtualization behavior that applies.
6. Agree on headless hooks and optional theming hooks without making internal DOM
   structure a public contract.
7. List unit, Vue, browser, accessibility, and type tests required by the public
   contract.
8. Implement the narrowest coherent behavior, tests, API docs, examples, and
   change metadata together.
9. Review compatibility and migration impact before changing a published API.

Do not create a production-looking placeholder to stand in for an unresolved
component design.

## Promoting to `stable`

Promoting a component manifest from `experimental` or `beta` to `stable`
requires completing the
[assistive-technology review process](../standards/assistive-technology-review.md):
`accessibility.verification.assistiveTechnology.status` must be `"passed"` with
recorded **NVDA + Firefox** and **VoiceOver + Safari** desktop evidence (plus
any relevant conditional pairings or documented exclusions) and Zac's final
sign-off. `pnpm manifests` rejects `stable` manifests that lack this evidence.

## Spec completeness check

`pnpm specs:check` (part of `pnpm verify:static`) reads the YAML frontmatter of
every `docs/components/*-spec.md` and compares it with the real exports in
`packages/vue` and `packages/themes`. Frontmatter holds only identity, approval,
section applicability, manifest references, and unresolved questions. APG
patterns, keyboard maps, states, and API types stay in the generated manifests,
and frontmatter that restates them is rejected.

**Errors** fail the command:

- An exported `Ghost*` component that no spec claims, or a spec with missing or
  unparseable frontmatter.
- `packages` that omit a package exporting one of the spec's components, or that
  list a package exporting none of them.
- `manifests` that omit an existing manifest for an exported component, point
  at a missing file, or reference a manifest for a component the spec does not
  claim. A spec whose components are not exported yet may use `manifests: []`.
- `specStatus: approved` without `approval.evidence`.
- Any blocking entry in `unresolvedQuestions`. Objects with `blocking: false`
  are allowed.
- An applicable required section whose `##` heading is missing or empty, or
  still contains template or `TODO`/`TBD`/`FIXME` text, and any
  `applicable: false` section without a non-empty `reason`.

**Warnings** are printed and do not fail the command:

- `specStatus` other than `approved` (`draft`, `proposed`, `submitted`,
  `pending-review`). These specs predate structured approval, or their approval
  has not been recorded. Set `specStatus: approved` with `approval.evidence`
  only when the spec or a linked record shows real human approval. Never set it
  just to clear a warning.

`pnpm manifests:write` copies `{ path, status, evidence }` from approved specs
into the generated `@ghostvue/vue` manifests as `spec`. It drops the reference
when a spec stops being approved.
