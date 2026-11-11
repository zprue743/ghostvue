# Architecture rules for agents

- Keep ordinary use cases ordinary: no provider, factory, registry, adapter, or
  configuration object without a demonstrated need.
- Describe behavior and intent in public configuration; do not expose nested
  implementation markup as the normal customization mechanism.
- Preserve consumer-owned objects and support conventional access, nested paths,
  accessor callbacks, key callbacks, and adapters when the use case demands them.
- Provide progressive escape hatches: props/configuration, callbacks, slots,
  custom rendering, then lower-level primitives.
- Keep new component behavior in `vue` by default, even when it is pure
  TypeScript. Move it to `core` only when framework-independent use is
  demonstrated by a current non-Vue consumer or an approved framework-neutral
  public contract. Being reusable, independently testable, or free of Vue
  imports is not sufficient justification.
- Do not create `core` types or functions solely to parameterize a Vue
  implementation or anticipate possible future framework adapters. Vue
  lifecycle and reactivity behavior belongs in `vue`.
- Keep headless functionality independent of `themes`. `@slop-ui/vue` must
  never import `@slop-ui/themes`. Themed wrappers may live in `themes` and
  depend on `vue`.
- Headless behavior is a `useSl*` composable plus a thin unstyled `Sl*`
  component. Themed `Sl*` components wrap those. Style through `data-part`,
  `data-state`, CSS variables, class/attr fallthrough, and slots. Do not add
  PrimeVue-style `pt` objects or per-part style-object props.
- Extract shared abstractions from evidence, not speculation.
- Prefer composition and the canonical existing pattern over duplication.
- Expose only deliberate package entry points; avoid internal barrel networks.
- Treat accessibility, TypeScript, documentation, and compatibility as public
  architecture.

See [the architecture overview](../architecture/overview.md) and
[package boundaries](../architecture/package-boundaries.md) for rationale.
