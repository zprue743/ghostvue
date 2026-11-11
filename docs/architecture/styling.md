# Styling architecture

Functionality is headless and must work without the default theme. `@slop-ui/vue`
must never import `@slop-ui/themes` as a requirement for behavior.

Both headless and themed use must be ordinary Vue: a composable and thin
unstyled `SlButton` from `@slop-ui/vue`, or a themed `SlButton` from
`@slop-ui/themes` that wraps it. Details, a hard rejection of PrimeVue
`pt` objects, and worked examples are in
[ADR 0004](../adr/0004-headless-styled-layering.md). Component names use the
`Sl` prefix (`SlButton`, `useSlButton`); that convention is ADR 0003
(SLO-9).

## Layers

1. **Composable** in `@slop-ui/vue` (`useSlButton`) owns behavior, a11y, and
   SSR.
2. **Thin unstyled component** in `@slop-ui/vue` (`SlButton`) spreads those
   bindings onto a native element, forwards `class` and attrs, and exposes
   slots. It ships no visual styles.
3. **Themed wrapper** in `@slop-ui/themes` wraps the unstyled component,
   applies default classes, and exposes ordinary visual props. It may depend
   on `vue`; `vue` still must not depend on `themes`.

## Styling hooks

Stable styling hooks are `data-part` (structure) and `data-state` (state),
plus CSS custom properties from tokens. Internal wrapper nesting is not a
public contract. Do not add per-part style-object props or a `pt`
passthrough object.

Consumers must remain able to use normal CSS, utility CSS, CSS Modules, or
another theme system. Headless semantics, focus behavior, and state must not
depend on a particular visual treatment.

Token source format and compile targets are ADR 0005 (SLO-36): DTCG JSON
compiled to CSS custom properties, TypeScript types, and a JSON manifest.
Until that document is on master, do not invent a parallel naming scheme in
theme CSS.
