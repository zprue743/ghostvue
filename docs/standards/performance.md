# Performance standard

Do not micro-optimize without evidence, but avoid architectural choices that make
future data-heavy interfaces expensive by default.

- Avoid accidental quadratic work in common paths.
- Avoid deep watches over large consumer datasets.
- Preserve consumer object identity where useful; do not clone entire inputs to
  create library ownership.
- Document caches, invalidation rules, and retained references.
- Benchmark behavior whose performance is part of the public expectation.
- Keep virtualization a reusable capability when evidence supports it, not a
  collection of slightly different component-specific hacks.
- Consider SSR, hydration, allocation, and cleanup costs as well as render time.

DataTable, Tree, Scheduler, Gantt, QueryBuilder, and similar possibilities will
need explicit performance budgets in their component specifications. Their
possible future existence does not justify implementing caches or virtualization
abstractions now.

## Bundle size and tree-shaking budgets

`pnpm size` (part of `pnpm verify:build`, after `pnpm build`) bundles small
consumer fixtures against each package's built `dist` and fails when a gzip
budget in `scripts/bundle-size-budgets.json` is exceeded. There are two kinds
of fixture:

- **Package entries:** every JavaScript and CSS subpath in a package's
  `exports` map (`export * from '@ghostvue/vue'`, `import
'@ghostvue/themes/default.css'`, and so on). JSON subpaths are data for
  tooling and are not budgeted.
- **Single-component imports:** `export { GhostX } from '<package>'` for every
  component manifest that the package's main entry actually exports.

Each fixture is a minified Vite production build with package `sideEffects`
honored. Every `@ghostvue/themes` component fixture therefore includes the base
stylesheet that the package entry imports, because a consumer's build ships it
too. Only `vue` stays external. Runtime dependencies such as
`@floating-ui/dom` and `@internationalized/date` are bundled, so their cost
counts against every import that needs them. Gzip sizes are measured separately
for JavaScript and CSS and then added together.

The check also fails when:

- a fixture has no budget, or a budget has no fixture;
- a fixture bundles the Vue runtime; or
- a fixture leaves any import other than `vue` external.

A failed build of a named import, such as a missing export, also fails the check.

`tests/integration/bundle-tree-shaking.test.ts` builds `@ghostvue/vue` with its
library config. It then checks that importing one component ships no other
component's definition, no positioning or date code, and no Vue runtime.

### Updating budgets

Build with `NODE_ENV` unset or set to `production`. Under any other value,
`@vitejs/plugin-vue` compiles SFCs in development mode, which inflates every
component fixture.

Budgets start from measured sizes plus 10% headroom, rounded up to the next
100 bytes. After adding a component or making an intentional size change, run
`pnpm build && pnpm size:write`. Commit the regenerated JSON, and explain any
budget increase in the PR description. `size:write` re-baselines every fixture,
so unrelated budgets may also get tighter. Do not raise a budget just to hide an
accidental regression. First look for the import that pulled in extra code, for
example a module-level call without a `/* @__PURE__ */` annotation.

On pull requests, CI posts the report as a single sticky comment and updates it
on every push. It also adds the report to the `verify-build` job summary. Fork
PRs cannot be commented on with the read-only token; they still get the job
summary, and the budget is still enforced.
