# Testing standard

Tests protect behavior and public contracts so internal implementation can evolve
without rewriting assertions that mirror private structure.

## Test levels

- **Vitest unit tests:** framework-neutral logic, composables where browser layout
  is irrelevant, and regression cases.
- **Vue Test Utils:** component props, emitted events, slots, model contracts, and
  Vue lifecycle behavior.
- **Playwright:** keyboard/focus behavior, browser integration, layout-dependent
  behavior, hydration where relevant, and end-to-end accessibility smoke checks.
- **Automated accessibility:** axe is configured with Playwright. It detects only
  a subset of failures and never replaces semantic, keyboard, focus, or
  assistive-technology reasoning.
- **Type tests:** add compile-time assertions alongside the first public generic
  or inference behavior worth preserving.

Name tests after observable behavior. Avoid reaching into component internals or
asserting exact implementation markup unless that markup is itself a semantic
contract. Keep fixtures narrow. Bug fixes require regression tests whenever
practical.

Run `pnpm test` for focused unit/integration checks, `pnpm test:coverage` (also
run by `pnpm verify`) to enforce the 80% global and per-package (`packages/*/src/**`)
line-coverage gates, and `pnpm test:e2e` for browser checks.
The normal `pnpm verify` gate excludes browser tests to keep routine local and CI
feedback fast; CI runs the `browser` job inside the pinned Playwright container
image (`mcr.microsoft.com/playwright:<version>-noble`, matching
`@playwright/test` in `package.json`) with its bundled Chromium binary and
`--update-snapshots=none` so missing or drifted baselines always fail.

## Visual regression

Visual snapshot suites are tagged `@visual` and assert deterministic rendering
with `animations: 'disabled'` and a default `maxDiffPixelRatio` of `0.03`
(unless a suite documents a justified override):

- **Playground visual suites:** `GhostButton` state matrices (light, dark, and
  forced-colors across densities), flagship theme matrices (`calm`, `vibrant`,
  `mono`), density and roundness matrix, visual reference recipes (elevation,
  materials, gradients), and the frozen ambient spotlight opt-in snapshot.
- **Public example baselines:** `tests/e2e/examples-visual.spec.ts` snapshots
  every registered example in `examples/registry.ts` in `light` and `dark` mode
  at `comfortable` density with the `default` theme.

Run only the visual snapshot suites locally with:

```bash
pnpm test:visual
```

Committed baselines (`*-chromium-linux.png`) are generated inside the pinned
Playwright Linux container so host OS font rendering cannot introduce drift. When
a visual change is intentional or a new example is added, regenerate Linux
baselines locally inside that image:

```bash
pnpm test:visual:docker
```

Commit regenerated baseline PNGs in a dedicated commit when updating existing
snapshots so pixel churn is easy to review. Use `pnpm test:visual:update` only
when already running inside the pinned Linux environment.

When the CI `browser` job fails, Playwright's HTML report and diff outputs
(`playwright-report/` and `test-results/`, including expected, actual, and diff
PNGs) are uploaded as the `playwright-report` workflow artifact (retained for
14 days) on the failed GitHub Actions run.

## Coverage reporting

`*.test.ts` files run in Vitest as unit and integration tests and count toward
coverage. `*.spec.ts` files run in Playwright e2e tests in CI's `browser` job
and do not count toward Vitest coverage.

`apps/docs` and `apps/playground` are development hosts. They are intentionally
outside the Vitest include list and the coverage gate.

After Vitest runs, find the coverage table in the CI `verify` job summary and
download the `coverage-report` artifact for the HTML, JSON summary, and LCOV
reports (retained for 14 days). Reports are generated even when tests fail;
failures before Vitest starts cannot produce coverage. Locally, run
`pnpm test:coverage` and open `coverage/index.html`.

## Packed export integrity

After `pnpm build`, run `pnpm exports:check`. It packs every publishable package
listed in `scripts/workspace-packages.mjs` into a temporary directory and checks
the actual tarballs with publint and Are the Types Wrong (`attw --pack`). Temporary
artifacts are removed even on failure. `pnpm verify` runs this immediately after
`pnpm published-exports`; publint errors and attw problems fail the gate.

Only attw's `cjs-resolves-to-esm` rule is ignored: these packages are ESM-only,
so CommonJS consumers must use dynamic import. CSS and JSON asset subpaths are
checked by publint but excluded from attw's JavaScript/type entrypoint analysis.
The normal Node10, Node16, and bundler type-resolution checks remain enabled.

Vue and theme builds finalize emitted declarations with explicit relative ESM
extensions (including Vue declaration paths). CSS side-effect imports remain in
JavaScript only. Their declaration maps are disabled because finalization changes
the emitted text. Top-level `types` and the theme `define` type mapping also
support consumers using legacy TypeScript resolution.
