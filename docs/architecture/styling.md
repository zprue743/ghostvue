# Styling architecture

Functionality is headless and must work without the default theme. `@ghostvue/vue`
must never import `@ghostvue/themes` as a requirement for behavior.

Both headless and themed use must be ordinary Vue: a composable and thin
unstyled `GhostButton` from `@ghostvue/vue`, or a themed `GhostButton` from
`@ghostvue/themes` that wraps it. Details, a hard rejection of PrimeVue
`pt` objects, and worked examples are in
[ADR 0004](../adr/0004-headless-styled-layering.md). Component names use the
`Ghost` prefix (`GhostButton`, `useGhostButton`); that convention is
[ADR 0003](../adr/0003-public-component-api-conventions.md).

## Layers

1. **Composable** in `@ghostvue/vue` (`useGhostButton`) owns behavior, a11y, and
   SSR.
2. **Thin unstyled component** in `@ghostvue/vue` (`GhostButton`) spreads those
   bindings onto a native element, forwards `class` and attrs, and exposes
   slots. It ships no visual styles.
3. **Themed wrapper** in `@ghostvue/themes` wraps the unstyled component,
   applies default classes, and exposes ordinary visual props. It may depend
   on `vue`; `vue` still must not depend on `themes`.

## Styling hooks

Stable styling hooks are `data-part` (structure) and `data-state` (state),
plus CSS custom properties from tokens. Pointer-reactive surfaces also use
`data-interactive` and, on hosts that already own `data-state`,
`data-interactive-state`. Internal wrapper nesting is not a public contract.
Do not add per-part style-object props or a `pt` passthrough object.

Consumers must remain able to use normal CSS, utility CSS, CSS Modules, or
another theme system. Headless semantics, focus behavior, and state must not
depend on a particular visual treatment.

## Tokens

Tokens are authored as DTCG JSON and compiled to CSS custom properties,
TypeScript types, and a JSON manifest. See
[design tokens](./tokens.md),
[ADR 0005](../adr/0005-design-token-taxonomy.md),
[ADR 0007](../adr/0007-token-pipeline.md), and
[ADR 0008](../adr/0008-define-theme.md). Public custom properties use
`--ghost-<role>-<part>-<state>`. Components consume semantic tokens only.
Brand themes are generated in Node (`@ghostvue/themes/define`) and applied
with `data-ghost-theme`.
