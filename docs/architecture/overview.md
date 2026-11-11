# Repository architecture

The workspace separates publishable responsibilities from development and
engineering support:

```text
packages/shared    proven framework-neutral low-level utilities
packages/core      framework-independent behavior and contracts
packages/vue       Vue lifecycle, reactivity, composables, and components
packages/themes    optional theme and design-token infrastructure
apps/docs          VitePress command wrapper for canonical docs
apps/playground    manual development and browser-test host
tests              cross-package integration and browser tests
docs               canonical product and engineering documentation
scripts            repository invariants (`pnpm adapters`, `pnpm manifests`)
```

Directories exist only when they serve current tooling or express a real
boundary. The project avoids speculative base components, managers, registries,
engines, and empty expansion trees.

## Architectural commitments

Framework-independent code belongs in `core` only when independence is useful in
practice. Vue lifecycle or effect-scope semantics remain in `vue`; forcing them
through an abstract core would reduce clarity.

Headless behavior may not depend on `themes`. Consumers remain free to use plain
CSS, Tailwind, CSS Modules, another design system, or no prebuilt theme.

Public package entry points are intentional contracts. Internal files should be
imported directly within a package; networks of nested `index.ts` barrels hide
dependency direction and encourage cycles.

SSR-safe ids and controlled/uncontrolled v-model behavior live in
[`component-state.md`](./component-state.md) (`useSlId`,
`useControllableState`). Overlay Tab traps and APG roving tabindex live in
[`focus.md`](./focus.md) (`useFocusScope`, `useRovingFocus`). Per-component
public contracts for agents, MCP, codegen, and evals live in
[`component-manifest.md`](./component-manifest.md).

## Tooling choices

Vite builds the Vue library and development apps. TypeScript emits the small
framework-neutral packages directly, including their `.d.ts` files. The Vue
package runs `vue-tsc` after `vite build` because Vite empties `dist` before
writing the bundle. `pnpm published-exports` then asserts that each library
package's `types` and `exports` targets exist on disk so a missing
`dist/index.d.ts` cannot pass `pnpm verify`. Vitest, Vue Test Utils, Playwright,
and axe cover complementary test levels. VitePress publishes the same canonical
Markdown that contributors and agents read.

Storybook is deferred. Before real components exist, it would duplicate the
playground and documentation responsibilities without providing meaningful
stories. Reconsider it when component development demonstrates a concrete review
or visual-regression need.

The repository-owned boundary checker is intentionally smaller than a general
dependency graph tool. Reconsider dedicated cycle analysis when implementation
volume makes simple manifest validation insufficient.
