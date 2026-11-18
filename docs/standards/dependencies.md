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
versions through the lockfile and update them in reviewed changes. Renovate
opens those update pull requests; see
[CI and dependency updates](../contributing/ci.md).

pnpm blocks dependency install scripts unless they are explicitly allowlisted in
`pnpm-workspace.yaml`. `esbuild` is allowlisted because Vite/VitePress require its
platform binary; additions to that list require the same security review as a
new runtime dependency.

Run `pnpm boundaries` after changing package manifests. Do not bypass pnpm's
strict peer dependency checks merely to accept an invalid graph.

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
