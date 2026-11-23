# Package boundaries

Allowed production dependency direction is:

```text
shared <- core <- vue <- themes (optional; may depend on vue)
            ^
            |
          mcp (optional Node-only tooling; ADR 0015)

nuxt (optional integration) -> vue (peer), themes (optional peer)
```

`mcp` may depend on `core` only among `@ghostvue/*` packages. It does not import
`vue`, `themes`, or `shared` at runtime; bundled assets supply manifest, example,
docs, and token snapshots.

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

- `nuxt` is an optional framework integration. It may depend on `vue` and,
  only as an optional peer for the explicit themed/CSS opt-in, on `themes`.
  Nothing depends on `nuxt`: `shared`, `core`, `vue`, and `themes` must never
  import Nuxt, `@nuxt/*`, or `unplugin-vue-components`
  (`library-packages-no-nuxt` in `.dependency-cruiser.mjs`). The
  `unplugin-vue-components` resolver (`@ghostvue/vue/resolver`) therefore
  matches the plugin's resolver contract structurally instead of importing it.
- `eslint-plugin` (`@ghostvue/eslint-plugin`) is Node-only tooling with no
  internal production dependency, and no package may depend on it. It reads
  component contracts from `packages/vue/manifests` and
  `packages/themes/manifests` through a generated data module
  (`pnpm registries:write`), not through imports, so it never loads Vue or
  component code. See the [ESLint plugin](../tooling/eslint-plugin.md) docs.
- **`mcp` (`@ghostvue/mcp`, [ADR 0015](../adr/0015-mcp-server-first-release.md),**
  **[GHO-17 contract](../plans/gho-17-mcp-first-release.md))** is Node-only MCP
  stdio tooling with the `ghostvue-mcp` bin. It may depend on `@ghostvue/core`
  (manifest schema) and the pinned `@modelcontextprotocol/sdk`, `zod`, and
  `ajv` approved in plan §7 (added with the server, not the scaffold). It must
  not depend on `vue`, `@ghostvue/vue`, or `@ghostvue/themes`, or import
  `@ghostvue/shared`; manifests, examples, docs, and tokens are **copied into
  the package at build time**, not imported from source. The catalog entry's
  `forbiddenDependencies` makes `pnpm boundaries` reject `vue`,
  `@ghostvue/vue`, and `@ghostvue/themes` in any `package.json` dependency
  group (including devDependencies), and the `mcp-no-vue` rule in
  `.dependency-cruiser.mjs` rejects those imports in source, mirroring
  `eslint-plugin`. No package may depend on `@ghostvue/mcp`.

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
`tests/integration/package-boundaries.test.ts` exercises representative import
rules (core-to-Vue layering, cross-package relative imports, and `mcp-no-vue`)
and the real checker CLI, including manifest validation (`@ghostvue/mcp`
forbidden dependencies among them) and fixture/build-output exclusions.

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
