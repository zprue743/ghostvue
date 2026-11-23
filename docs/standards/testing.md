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

`measureFocusChange` in `tests/e2e/focus-appearance.ts` is a screenshot-based
focus indicator check: the area that changes by 3:1 between focused and
unfocused renderings, per-edge coverage (catches clipped rings), and layout
shift. Use it where the ring may be painted on a pseudo-element or child
part, inside a portal, or in forced colors, where computed styles cannot
prove visibility. `tests/e2e/docs-showcase-focus.spec.ts` runs it over every
Tab stop and overlay item of the redesigned docs showcases, together with
reduced-motion and 200% text checks.

`tests/e2e/examples.spec.ts` checks the boundary/paint contract and axe-scans
every registered example in both `light` and `dark` mode in a single navigation
per example under the non-visual Playwright project. Visual example snapshots
stay in `examples-visual.spec.ts` (`@visual`).

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

### Keyboard evidence in manifests

A manifest that records `accessibility.verification.automatedKeyboard` maps
each declared key to the `chromium-e2e` tests that press it. Renaming or
removing such a test fails `pnpm keyboard-evidence`; the CI `browser` job also
fails when a mapped test did not run or did not pass. Update the manifest
reference in the same change. See
[accessibility verification](../architecture/component-manifest.md#accessibility-verification).

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
Slider geometry and pointer mapping in both orientations and directions,
Select's opening keys moving real focus into the list, and the docs theme
switcher's single Tab stop and arrow keys.

CI runs Chromium in two `browser-shard` workers and Firefox and WebKit together
in the single `browser-cross` job from the same pinned Playwright image, which
already contains all three browsers and their system libraries (skipped on PRs
whose diff cannot affect cross-browser component behavior). The `browser` check
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
  on the docs token host (`calm`, density unset), and every themed example
  again with the `default` theme at `comfortable` density (`*-default-comfortable-*`).
  The `/examples.html` route picks the token host from `?theme=`, `?density=`,
  and `?mode=`. It never adds `.ghost-theme` to `<html>`, so headless examples
  stay unthemed as in the docs, and the test never resizes controls or pads
  the canvas: the screenshot captures the route's real canvas inset.
  `tests/e2e/examples.spec.ts` asserts the same boundary and that no track,
  thumb, indicator, slider, switch, separator, progress bar, or spinner paints
  an empty box.
- **Forced-colors baselines:** `tests/e2e/forced-colors-visual.spec.ts`
  snapshots one themed example per interactive family beyond `GhostButton`
  (fields, checkbox/radio/switch, an open dialog, an open select listbox,
  tabs, accordion, progress, slider, calendar, and pagination) with
  `forcedColors: 'active'` on the `default` theme in light mode at
  `comfortable` density. One screenshot per example; add a family only when it
  introduces a new forced-colors treatment.
- **Docs site baselines:** `tests/e2e/docs-visual.spec.ts` snapshots the docs
  nav, a themed `GhostInput` preview, and a headless checkbox preview at 390px in
  `light` and `dark` mode (requires `apps/docs` build; included in `pnpm test:visual`).
- **Docs hero showcase baselines:** `tests/e2e/docs-showcase-visual.spec.ts`
  snapshots the ten redesigned hero showcases (each component page's first
  example) in the built docs on the first-paint host (`calm`, density unset).
  Every hero is captured with source closed at 390px and 1280px browser widths
  in `light` and `dark`. Overlay heroes (Dialog, Dropdown Menu, Select,
  Combobox, Popover) are also captured open from the keyboard, clipped to the
  trigger plus its body-portaled panel, at the same widths and modes. A source-open
  capture at 320px (Button) and 768px (Tabs) covers the toolbar and fence, and a
  480px preview-width capture of Table at a 1280px browser width covers container
  resizing separately from browser widths. Every capture first asserts no
  horizontal page overflow. Keep this matrix proportionate: add a hero only when
  a component page gains a redesigned showcase.

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

### Regenerating baselines in CI

Contributors and agents without Docker can ask CI to regenerate baselines
instead. Add the `update-baselines` label to the pull request to run the
**Update visual baselines** workflow (`.github/workflows/update-baselines.yml`).
It never runs automatically when CI fails, and it has no manual
(`workflow_dispatch`) trigger.

The workflow runs in the same pinned Playwright image as CI and
`pnpm test:visual:docker`, using `scripts/update-visual-baselines.mjs`:

1. Run every `@visual` test without updating snapshots. If all pass, it comments
   and pushes nothing.
2. If any visual test fails for a reason other than a screenshot mismatch or a
   missing baseline (a timeout or functional assertion), it comments and
   pushes nothing.
3. Rerun only the failing tests with `--update-snapshots=changed`, then rerun
   them again without updating to confirm they pass.
4. Check that the only changed paths are
   `tests/e2e/*.spec.ts-snapshots/*-chromium-linux.png`, then push one commit,
   `test(visual): regenerate baselines (GHO-123)`, to the PR branch. The key
   comes from the PR title, then the branch name. Without a key, the commit uses
   the PR number (`(#123)`).

Any failure, including a test that still fails after its update, produces a PR
comment and no push. The workflow removes the label when it finishes, so add it
again to retry. Review the image diffs in the pushed commit before merging.

It refuses fork PRs, because it only runs for branches in this repository. It
also only runs on a PR that GitHub can merge (no conflicts with `master`).

The job that installs dependencies and runs Playwright has a read-only token,
no secrets, and no dependency cache. The job that pushes runs no code from the
PR: it runs
`scripts/update-visual-baselines.mjs` from a separate checkout of the default
branch, checks out the PR head without persisted credentials, disables git
hooks, and passes `BASELINES_PUSH_TOKEN` only to the final `git push` step. A
change to the script therefore takes effect only after it merges to `master`.

A labelled run uses the workflow file from the PR branch, so a branch could
change the workflow itself. That is why the push token is a secret of the
protected `baseline-push` environment: the push job waits until a maintainer
approves it. Before approving, check that the PR does not change
`.github/workflows/` or `scripts/update-visual-baselines.mjs`.

Maintainer setup:

- Create the `update-baselines` label.
- Create an environment named `baseline-push` (**Settings → Environments**)
  with **Required reviewers** set to the maintainers allowed to approve pushes.
- Add an environment secret named `BASELINES_PUSH_TOKEN` to `baseline-push`, not
  a repository secret. Use a fine-grained personal access token or a GitHub App
  token with **Contents: read and write** on this repository only. Pushes made
  with the default `GITHUB_TOKEN` do not start new workflow runs, so CI would
  never check the new baselines. If the secret is missing, the push job stops
  before committing and the workflow comments. It never falls back to
  `GITHUB_TOKEN`.

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

## Benchmarks

`*.bench.ts` files under `tests/bench/` run with `vitest bench`. They are
informational: timings depend on the host, so they are not part of `pnpm test`,
`pnpm verify`, or CI. Compare a change against `master` on the same machine.

| Script                  | File                                            | Measures                                                   |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `pnpm bench:registry`   | `tests/bench/select-combobox-registry.bench.ts` | Select and Combobox option-registry churn                  |
| `pnpm bench:data-table` | `tests/bench/data-table-processing.bench.ts`    | DataTable sort, filter, and page processing at 1k-10k rows |

A guarantee that must never regress belongs in a unit test, not a bench. For
example, the DataTable rule that a page change never re-sorts is a counter test
in `packages/vue/src/use-ghost-data-table.counters.test.ts`.

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
