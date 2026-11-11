# Component workflow

This page is the **canonical component gate**. A production component may be
added only when every item below is present in the same change or a stacked
predecessor. Do not start markup to stand in for an unresolved design.

1. **Approved specification.** A spec based on
   [the component template](../components/spec-template.md), reviewed enough
   to resolve public behavior and accessibility.
2. **Tests.** Behavior tests for the public contract (Vue/unit), browser
   tests for observable interaction (`pnpm test:e2e`), and type tests when
   the exported declaration extends beyond custom props. Follow
   [TESTING_RULES.md](./TESTING_RULES.md).
3. **Public documentation.** API reference and examples in `docs/components/`,
   plus a playground exercise of the supported patterns.
4. **Machine-readable manifest.** A JSON file that validates against
   [the component-manifest schema](../architecture/component-manifest.md)
   ([ADR 0006](../adr/0006-component-manifest-schema.md)). Place it at
   `packages/<dir>/manifests/<kebab-name>.manifest.json`. Do not invent a
   parallel shape.
5. **Changeset.** Required when a publishable package's consumer-visible
   behavior changes.

[ADR 0002](../adr/0002-exit-foundation-phase.md) records why the
foundation-phase moratorium ended and why this list is the replacement.
[PR #21](https://github.com/zprue743/slop-ui/pull/21) ADR 0001 is the
companion decision that first lifted the ban.

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
