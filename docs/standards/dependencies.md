# Dependency policy

Runtime dependencies require strong justification. Each one adds bundle size,
security exposure, compatibility constraints, and ongoing maintenance.

Before adding a runtime dependency, document the capability it supplies, why a
small local implementation or platform API is insufficient, its tree-shaking and
bundle impact, license, maintenance health, security posture, and SSR/browser
requirements. Prefer a peer dependency when the consumer must own a singleton
runtime, as with Vue.

Icons are not a dependency. Components take icon content from consumers, and
packages do not add an icon library or icon adapter package; see
[ADR 0013](../adr/0013-icon-strategy.md).

Development tooling may be broader but remains intentional. Avoid overlapping
tools that enforce the same rule in different ways. Pin exact development
versions through the lockfile and update them in reviewed changes. Dependabot
opens those update pull requests; see
[CI and dependency updates](../contributing/ci.md).

pnpm blocks dependency install scripts unless they are explicitly allowlisted in
`pnpm-workspace.yaml`. `esbuild` is allowlisted because Vite/VitePress require its
platform binary; additions to that list require the same security review as a
new runtime dependency.

### `@ghostvue/eslint-plugin` (GHO-22)

The ESLint plugin adds no runtime dependency and no new package to the
lockfile. Template traversal and AST types come from `vue-eslint-parser`, the
parser eslint-plugin-vue already installs for this repository and for
consumers; the plugin does not import it at runtime and only calls the parser
services it provides. Both `eslint` (`^9 || ^10`) and `vue-eslint-parser`
(`^10`) are peer dependencies because the consumer's ESLint config owns those
singletons. The package pins the same versions as development dependencies
(`eslint` 10.15.0 and `vue-eslint-parser` 10.4.1, both MIT and already resolved
through eslint-plugin-vue) for types and rule tests. The list of native HTML
and SVG attribute names is kept locally instead of adding an attribute-list
package, since only set membership is needed.

### Internal `@ghostvue/*` ranges (#345)

A publishable package that needs a sibling `@ghostvue/*` package at runtime
declares it as a peer dependency with `workspace:^` (plus a `workspace:*`
development dependency so the workspace build links it). `@ghostvue/themes`
peers on `@ghostvue/vue`, and `@ghostvue/nuxt` peers on both. Peers keep a
single copy of `@ghostvue/vue` in the consumer's app, so themed wrappers and
headless parts share state. `workspace:^` packs to a caret range (`^0.1.0`),
not the exact version that `workspace:*` produces, so a patch difference
neither nests a second copy nor fails npm with ERESOLVE. The five publishable
packages version in lockstep (the Changesets `fixed` group in
`.changeset/config.json`), so a caret range on a `0.x` version admits only
same-minor siblings. `internalRangeProblems()` in
`scripts/lib/release-dry-run.js` rejects any other specifier in `dependencies`,
`peerDependencies`, or `optionalDependencies`; the release dry run and
`tests/integration/release-pipeline.test.ts` both run it.

Run `pnpm boundaries` after changing package manifests. Do not bypass pnpm's
strict peer dependency checks merely to accept an invalid graph.

## Integration dependencies (GHO-59)

Reviewed November 2026 for `@ghostvue/nuxt` and `GhostVueResolver()`. All are
MIT-licensed and build-time only: none ships in a browser bundle.

| Package                   | Version                  | Where                                                  | Why                                                                                                                                           |
| ------------------------- | ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nuxt/kit`               | 4.6.4                    | `@ghostvue/nuxt` dependency                            | Official module API (`defineNuxtModule`, `addComponent`, `addImports`). No local substitute: Nuxt module hooks are only reachable through it. |
| `@nuxt/schema`            | 4.6.4                    | `@ghostvue/nuxt` dependency                            | Types for the published `NuxtModule` signature and the `ghostvue` config-key augmentation. `@nuxt/kit` only declares it as an optional peer.  |
| `nuxt`                    | `^4.6.0` peer; 4.6.4 dev | `@ghostvue/nuxt` peer and dev, `apps/nuxt-fixture` dev | The consumer owns its Nuxt runtime. 4.6.4 is the tested version; the peer floor matches the module's `compatibility`.                         |
| `vite`                    | 8.3.5                    | `@ghostvue/nuxt` dev, `apps/nuxt-fixture`              | Nuxt 4.6.4's `@nuxt/vite-server` peers on `vite ^8.3.5`; the root stays on 8.2.6 so this does not move the library build toolchain.           |
| `unplugin-vue-components` | 32.1.0                   | root dev dependency                                    | Test-only: proves `GhostVueResolver()` inside the real plugin. `@ghostvue/vue` does not depend on it; the resolver is structural.             |

- `@ghostvue/vue` is a peer of `@ghostvue/nuxt` (one Vue runtime and one copy
  of the components, owned by the app). `@ghostvue/themes` is an optional peer
  needed only for the themed/CSS opt-in.
- No install scripts were allowlisted; `allowBuilds` is unchanged.
- Nuxt pulls a large development graph (Nitro, Vite, Rolldown). It is confined
  to `packages/nuxt` and `apps/nuxt-fixture` (whose dependencies are all
  development dependencies).
- Residual: `pnpm audit --prod` reports picomatch 4.0.7
  (GHSA-fc5q-39xc-vjpf, high, ReDoS on repeated extglobs) through
  `@ghostvue/nuxt > @nuxt/kit > tinyglobby`. The advisory names 4.0.8 as
  patched, but no 4.0.8 is published to npm, so there is nothing to bump or
  refresh to. The same 4.0.7 is already in the development graph on `master`.
  Exposure is build-time only: the globs come from the Nuxt app's own
  configuration, not from end users. Follow-up: refresh the lockfile once a
  patched picomatch is published.

## Security audit triage

Triage `pnpm audit` findings by real exposure, not raw counts: the report counts
dependency paths, so one advisory can appear many times. Fix in this order:

1. Bump the owning direct dependency to a patched exact version.
2. Refresh a transitive dependency inside its parent's declared range
   (`pnpm -r update <pkg>`), which changes only the lockfile.
3. Add an `overrides` entry in `pnpm-workspace.yaml` only when no patched
   parent exists, and record the override and its removal condition in this
   section.

Never suppress audit checks. Record each residual advisory below with its scope
and follow-up. No overrides are currently in use.

### November 2026 audit (GHO-173)

Before: 52 findings (1 critical, 16 high, 30 moderate, 5 low); `--prod`: 2 high
through `apps/playground > vue`. After: 11 findings (1 high, 9 moderate, 1 low);
`--prod`: none.

| Advisory                                                   | Was                                 | Action                                                                                |
| ---------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| shell-quote GHSA-pqg4-j6r4-53mv (critical)                 | 1.10.0 via `@changesets/cli`        | `@changesets/cli` 3.0.3; lockfile refresh to launch-editor 2.14.2, shell-quote 1.12.0 |
| launch-editor GHSA-587h/698v/r825                          | 2.14.1 via `@changesets/cli`        | Lockfile refresh to 2.14.2                                                            |
| @vue/server-renderer GHSA-g2v6-rqmx-r4w6 (high, prod path) | 3.5.41 via `vue`                    | `vue` 3.5.45 (root, playground, `@ghostvue/vue` and `@ghostvue/themes` dev pins)      |
| source-map-js GHSA-68fv-2mgg-jv7q (high)                   | 1.2.1 via Vue compilers, PostCSS    | `vue` 3.5.45 requires `^1.2.2`; lockfile resolves 1.2.2 for every path                |
| vite 8 GHSA-587h/698v/r825/rq7h/vfpm/9jrq                  | 8.2.1 (root, vitest)                | `vite` 8.2.6                                                                          |
| vitest / @vitest/mocker GHSA-82fw, GHSA-qxg6               | 4.1.10                              | `vitest`, `@vitest/coverage-v8` 4.1.12                                                |
| undici (19 advisories, 7 high)                             | 8.10.0 via `jsdom`                  | Lockfile refresh to 8.12.4 (inside jsdom's `^8.9.0`)                                  |
| brace-expansion GHSA-qhr7/6j4f/q2hr                        | 2.1.4, 5.0.9 via eslint, test-utils | Lockfile refresh to 2.1.8 and 5.0.13                                                  |
| postcss-selector-parser GHSA-rj75-hqrm-r3gf                | 7.1.5 via `eslint-plugin-vue`       | Lockfile refresh to 7.2.1                                                             |
| minimatch GHSA-g3hv-75wg-m249 (eslint path)                | 10.2.6 via `eslint`                 | `eslint` 10.15.0 (uses minimatch `^11.0.5`)                                           |

Residual advisories, all development-only and absent from `pnpm audit --prod`:

- **vite 5.4.21 and esbuild 0.21.5 through `vitepress` 1.6.4** (8 Vite
  advisories: 1 high, 6 moderate, 1 low, plus the esbuild finding below).
  VitePress 1.6.4 is the latest stable release and pins Vite 5; the patched
  Vite 6.4.4 is a major the 1.x line does not support, so an override would ship
  an untested graph. Most advisories target the Vite dev
  server (`fs.allow`/`fs.deny` bypass, cross-origin requests) or Windows-only
  launch-editor paths; `docs:build` does not start a server. Run `pnpm docs:dev`
  only on loopback. Follow-up: move to VitePress 2 once it is stable.
- **esbuild 0.21.5 in `@ghostvue/themes`** (moderate, GHSA-67mh-4wv8-2f99). The
  advisory affects esbuild's `serve` API; `scripts/bundle-define.mjs` only calls
  `esbuild.build`. The same version is still required by VitePress 1.6.4, so a
  bump would not clear the finding. Follow-up: bump with the VitePress upgrade.
- **minimatch 10.2.6 through `typescript-eslint` 8.67.0** (moderate). Only
  typescript-eslint 8.73.0 moves to minimatch 11, and it was published one day
  before this audit. Lint globs are repository-authored, so the denial-of-service
  input is not attacker-controlled. Follow-up: bump typescript-eslint once 8.73+
  has aged.
- **minimatch 9.0.9 and glob 10.5.0 through `@vue/test-utils` > `js-beautify` 1.x**
  (moderate). Test-only HTML formatting with no user-controlled patterns; glob's
  advisory is a timeout-cancellation bypass. `@vue/test-utils` 2.5+ moves to
  js-beautify 2, which still uses a vulnerable glob 13. Follow-up: revisit when a
  release depends on glob 14.0.2+.

## `@ghostvue/mcp` (GHO-17)

**Approved by Zac, Nov 22, 2026** for implementation. Adopted in
[GHO-227](https://github.com/zprue743/ghostvue/issues?q=is%3Aissue+GHO-227+in%3Atitle) as exact pins in
`packages/mcp/package.json` (stdio server, tool registration helper, error
envelope). Contract and footprint: [GHO-17 MCP first-release contract](../plans/gho-17-mcp-first-release.md)
§7; [ADR 0015](../adr/0015-mcp-server-first-release.md).

**Runtime dependencies (exact pins, MIT):**

| Package                     | Pin    | Why                                                                                                     |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `@modelcontextprotocol/sdk` | 1.32.2 | Official MCP stdio server, tool registration, protocol framing                                          |
| `zod`                       | 4.6.7  | Required SDK peer (`^3.25 \|\| ^4.0`; pin 4.x for new package) — tool input validation                  |
| `ajv`                       | 8.20.0 | Serve-time manifest validation against bundled `@ghostvue/core/manifest.schema.json` (same major as CI) |

Stdio-only code should import `@modelcontextprotocol/sdk/server` narrowly; the SDK
still installs transitive HTTP packages (`hono`, `express`, …). Measured installed
`node_modules` for these three direct pins plus transitives: **17,407,541 bytes**
(scratch `npm i --prefix /tmp` with sdk@1.32.2, zod@4.6.7, ajv@8.20.0,
2026-11-22); SDK package alone **4,492,221 bytes** unpacked per
`npm view @modelcontextprotocol/sdk@1.32.2 dist.unpackedSize`. Measurement
exceeds 16 MiB; **18 MiB cap** unchanged per plan §7.

**Adoption check (GHO-227, 2026-11-23):** the same scratch `npm i` of the three
pins installs 95 packages at **17,408,020 bytes** (`du -sb node_modules`), and
`pnpm --filter @ghostvue/mcp deploy --prod` measures **16,346,101 bytes**; both
are under the 18 MiB cap. `npm audit --omit=dev` on that scratch install reports
**0 vulnerabilities**. The server imports only `@modelcontextprotocol/sdk/server`,
`…/server/stdio.js`, and `…/types.js`; `ajv` is pinned now and is first used
for serve-time manifest validation in GHO-228.

**Installed-size gate (GHO-232, 2026-11-25):** `pnpm mcp:packed` installs the
packed tarball with `pnpm install --prod` into a scratch project and fails
above 18 MiB, excluding `dist/assets/`. First recorded run: 93 packages,
**20,097,742 bytes** of `node_modules`, of which **3,619,281 bytes** are
`dist/assets/`, so **16,478,461 bytes (15.72 MiB)** are gated. `pnpm audit
--prod` in `packages/mcp`, and in that scratch install, reports no known
vulnerabilities.
