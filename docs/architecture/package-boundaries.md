# Package boundaries

Allowed production dependency direction is:

```text
shared <- core <- vue
   ^               ^
   +-------+-------+
           |
         themes (optional; may depend on vue)
```

- `shared` has no internal production dependency.
- `core` may depend on `shared`.
- `vue` may depend on `core` and `shared`. `vue` must never depend on
  `themes`.
- `themes` is optional. Headless packages must not require it. It **may**
  depend on `vue` so themed wrappers can import unstyled components and
  composables. That edge is recorded here, in
  [ADR 0004](../adr/0004-headless-styled-layering.md), and in
  `scripts/workspace-packages.mjs` now that themed `GhostButton` is the first
  wrapper.

Themed Vue components belong in `themes`. Headless composables and thin
unstyled components belong in `vue`. Do not add a third package merely to
host styled twins.

`scripts/workspace-packages.mjs` is the executable catalog of package
responsibilities and allowed internal dependencies. Manifest edges and
source-level import boundaries (layering, no circular imports, no cross-package
relative imports, and no direct imports from `dist`) are enforced by
`scripts/check-package-boundaries.mjs` and `.dependency-cruiser.mjs`
(`pnpm boundaries`). Each package `AGENTS.md` is generated from the same
catalog and checked by `scripts/check-agent-adapters.mjs` (`pnpm adapters`).
`tests/integration/package-boundaries.test.ts` runs the same import rules against
fixtures to prove invalid imports fail and an allowed package import passes.

## Adding a package

A new package requires a responsibility that cannot remain coherent in an
existing package. Document its purpose and dependency direction, add build and
typecheck scripts, register it in `scripts/workspace-packages.mjs` and the root
TypeScript project, and explain its public entry point. `pnpm published-exports`
requires those entry points to exist on disk after `pnpm build`. An anticipated
future use is not by itself sufficient evidence.

Development apps may consume packages to exercise them. They are not published
and must not become a hidden source of production logic. The unpublished
`examples/` tree is the same kind of development host: it may import `vue` and
`themes` but is not a workspace package.
