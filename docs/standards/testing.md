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

### SSR and hydration (Vitest)

Shared SSR hydration utilities live in `tests/support/ssr-hydration.ts`. Use
`expectSsrHydration` to render a root component with `renderToString`, mount the
HTML in jsdom, hydrate with `createSSRApp`, and fail when:

- Vue logs a warning or error during SSR or hydration (including hydration
  mismatch messages), or
- any `id` attribute in the hydrated DOM differs from the SSR HTML.

Pass a root `Component` (for example from `defineComponent`) or
`ssrHydrationRoot` for a single child rendered with `h`. Optional
`assertServerHtml` runs extra assertions on the server string before hydration.
Covered examples live in
`tests/integration/ssr-hydration.test.ts` (`GhostButton`, closed and
`defaultOpen` `GhostCollapsible`).

```typescript
import { defineComponent, h } from 'vue'
import { expectSsrHydration } from '../support/ssr-hydration'

await expectSsrHydration(
  defineComponent({
    setup: () => () => h(MyComponent, { value: 'a' }),
  }),
  {
    assertServerHtml(html) {
      expect(html).toContain('data-part="root"')
    },
  },
)
```

These tests run under the default Vitest jsdom environment and are included in
`pnpm test`, `pnpm test:coverage`, and `pnpm verify`.

### E2E support helpers

Shared Playwright utilities live under `tests/support/` (documented in
`tests/support/README.md` at the repo root):

- `playgroundTest` / `playgroundUrl` — static server lifecycle for
  `apps/playground/dist`.
- `expectFocus`, `pressSequence` — keyboard and focus assertions.
- `axeScan`, `expectNoAxeViolations` — axe scans for example previews and the
  current page.

`tests/e2e/examples.spec.ts` axe-scans every registered example in `light` and
`dark` mode in the non-visual Playwright project. Visual example snapshots stay
in `examples-visual.spec.ts` (`@visual`).

- **Type tests:** compile-time consumer fixtures under
  `packages/vue/type-tests/` exercise public props, v-model controlled and
  uncontrolled modes, typed emits, and scoped slot props. They are included in
  `pnpm verify` through `@ghostvue/vue`'s `typecheck` script (`vue-tsc` on
  `packages/vue/tsconfig.json`). Invalid contracts use `// @ts-expect-error`; if
  a regression makes the assignment typecheck, vue-tsc fails on an unused
  directive. A separate negative project
  (`packages/vue/tsconfig.type-tests-negative.json`) holds fixtures that must
  not compile; `scripts/vue-type-tests-negative.mjs` runs after the positive
  vue-tsc pass and fails when those diagnostics disappear. Add or extend a
  `*Consumer.ts` / `*Consumer.vue` pair when a component's public inference
  contract changes.

Name tests after observable behavior. Avoid reaching into component internals or
asserting exact implementation markup unless that markup is itself a semantic
contract. Keep fixtures narrow. Bug fixes require regression tests whenever
practical.

Run `pnpm test` for focused unit/integration checks, `pnpm test:coverage` (also
run by `pnpm verify`) to enforce the 80% global and per-package (`packages/*/src/**`)
line-coverage gates, `pnpm --filter @ghostvue/vue typecheck` to rerun only the
Vue consumer type fixtures, and `pnpm test:e2e` for browser checks.
The normal `pnpm verify` gate excludes browser tests to keep routine local and CI
feedback fast; CI runs the `browser` job inside the pinned Playwright container
image (`mcr.microsoft.com/playwright:<version>-noble`, matching
`@playwright/test` in `package.json`) with its bundled browsers and
`--update-snapshots=none` so missing or drifted baselines always fail.

## Cross-browser functional matrix

Keyboard, focus, `inert`, scroll locking, native radio Tab order, and RTL layout
differ between engines, so a representative set of functional specs also runs in
Firefox and WebKit. The full suite stays Chromium-only to keep CI cost flat.

| Project        | Browser                 | Runs                                     |
| -------------- | ----------------------- | ---------------------------------------- |
| `chromium`     | Desktop Chrome          | `@visual` snapshot suites only           |
| `chromium-e2e` | Desktop Chrome          | every non-visual spec                    |
| `firefox-e2e`  | Desktop Firefox (Gecko) | non-visual specs tagged `@cross-browser` |
| `webkit-e2e`   | Desktop Safari (WebKit) | non-visual specs tagged `@cross-browser` |

Tag a describe block with `{ tag: '@cross-browser' }`, or append
` @cross-browser` to a test title when adding an options object would only
re-indent an existing test. Tag a flow when it depends on engine behavior: real
focus movement, focus traps and nested overlays, `inert`, root or body scroll
lock, native form controls, pointer-to-value mapping, or RTL geometry. Assert
real focus (`toBeFocused()`), ARIA state, or bounding boxes, never `tabindex`
alone. The tagged set currently covers focus primitives (`focus.spec.ts`), modal
primitives, dialog trap/restore, nested dialogs and popovers, root scroll lock,
the drawer RTL edge flip, RTL roving for tabs, toggle group, toolbar, menubar,
segmented control, calendar, and native radios (`rtl-roving.spec.ts`), and
Slider geometry and pointer mapping in both orientations and directions.

CI runs Chromium in the `browser-shard` matrix and Firefox and WebKit in the
`browser-cross` matrix, from the same pinned Playwright image, which already
contains all three browsers and their system libraries. The `browser` check
merges every report and fails if any leg fails. Locally, `pnpm test:e2e` runs
all four projects; select one with `--project`, for example
`pnpm exec playwright test --project=webkit-e2e`. On a host without Firefox or
WebKit installed, run them inside the Playwright image used by
`pnpm test:visual:docker`.

Visual baselines are Chromium-only and still come only from
`pnpm test:visual:docker`. Functional browser coverage never adds Firefox or
WebKit baselines.

### Known engine differences

Each difference is asserted explicitly in the spec that covers it, with a
comment. A difference is documented here only when it is engine behavior the
component intentionally leaves alone, or a workaround the component ships.

| Area                                        | Chromium                                        | Firefox                         | WebKit                                                                                                 |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Headless scrollbars                         | 15px classic with `hideScrollbars=false`        | 0px overlay                     | 0px overlay (and rejects `--blink-settings`)                                                           |
| Scroll-lock `padding-right`                 | equals the removed scrollbar width              | left untouched                  | left untouched                                                                                         |
| Native radio RTL ArrowLeft/ArrowRight       | mirrored                                        | mirrored                        | not mirrored: ArrowRight is next in DOM order                                                          |
| Shift+Tab into an all-unchecked radio group | first radio                                     | first radio                     | last radio                                                                                             |
| Mouse event coordinates                     | exact edge targets land on the edge             | integers; overshoot track edges | exact edge targets land on the edge                                                                    |
| Modal close on overlay `pointerdown`        | compatibility `mousedown` cancelled by GhostVue | same as Chromium                | no `mousedown`, focus dropped to `<body>`; GhostVue reapplies the restored focus (see the dialog spec) |

`tests/support/scrollbars.ts` holds the per-engine launch options and the
scroll-lock assertions. Per-component notes live in the dialog, drawer, radio
group, and slider specifications.

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
- **Docs site baselines:** `tests/e2e/docs-visual.spec.ts` snapshots the docs
  nav, a themed `GhostInput` preview, and a headless checkbox preview at 390px in
  `light` and `dark` mode (requires `apps/docs` build; included in `pnpm test:visual`).

Run only the visual snapshot suites locally with:

```bash
pnpm test:visual
```

The `chromium` project runs only `@visual` tests with zero retries, including in
CI, so a flaky screenshot fails the job. The `chromium-e2e` project runs all
non-visual browser tests and retains two retries in CI (zero locally).
`pnpm test:e2e` runs these and the Firefox/WebKit functional projects (see
[the cross-browser matrix](#cross-browser-functional-matrix)); existing Chromium
snapshot names are preserved.

Committed baselines (`*-chromium-linux.png`) are generated inside the pinned
Playwright Linux container so host OS font rendering cannot introduce drift. When
a visual change is intentional or a new example is added, regenerate Linux
baselines locally inside that image:

```bash
pnpm test:visual:docker
```

The Docker command masks the host's root, app, and package `node_modules` with
anonymous volumes, including `packages/shared/node_modules`, so container installs
cannot follow workspace links into host dependencies. Keep this list aligned
with the workspace directories when adding packages or apps.

To check repeatability without updating baselines, run the following inside the
same pinned image after `pnpm install --frozen-lockfile`:

```bash
pnpm test:visual --repeat-each=5 --retries=0
```

Commit regenerated baseline PNGs in a dedicated commit when updating existing
snapshots so pixel churn is easy to review. Use `pnpm test:visual:update` only
when already running inside the pinned Linux environment.

When the CI `browser` job fails, Playwright's HTML report and diff outputs
(`playwright-report/` and `test-results/`, including expected, actual, and diff
PNGs) are uploaded as the `playwright-report` workflow artifact (retained for
14 days) on the failed GitHub Actions run.

## Bundle size and tree-shaking

After `pnpm build`, run `pnpm size`. It checks gzip budgets for every package
entry and every single-component import, and confirms that Vue stays external.
`pnpm verify` runs it after `pnpm exports:check`. Budgets, fixture rules, and
the update workflow are in the
[performance standard](./performance.md#bundle-size-and-tree-shaking-budgets).

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
`pnpm published-exports`; publint errors, attw problems, and the packed
`@ghostvue/themes/define` consumer smoke (see `scripts/themes-define-packed-smoke.mjs`)
fail the gate.

Only attw's `cjs-resolves-to-esm` rule is ignored: these packages are ESM-only,
so CommonJS consumers must use dynamic import. CSS and JSON asset subpaths are
checked by publint but excluded from attw's JavaScript/type entrypoint analysis.
The normal Node10, Node16, and bundler type-resolution checks remain enabled.

Vue and theme builds finalize emitted declarations with explicit relative ESM
extensions (including Vue declaration paths). CSS side-effect imports remain in
JavaScript only. Their declaration maps are disabled because finalization changes
the emitted text. Top-level `types` and the theme `define` type mapping also
support consumers using legacy TypeScript resolution.
