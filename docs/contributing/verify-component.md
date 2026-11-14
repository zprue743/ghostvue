# Component verification

Run `pnpm verify:component GhostButton` (or `Button`) from the repository root.
It writes `reports/verify-component/GhostButton.json` and prints a short summary.
Use `--report path/to/report.json` to choose a different destination. Any failed
check produces exit code 1. Reports and temporary configs in the default report
directory are gitignored. The command does not install dependencies or browsers.

The selected scope includes headless and themed source files, compound parts,
matching composables/contracts, colocated and named integration tests, and
`examples/<component>/`. Imported dependencies remain in type and boundary graphs.
This is an agent feedback command; run the full `pnpm verify` and browser CI for
repository-wide review.

## Checks

- `lint`: existing ESLint and Prettier configs on selected source, tests and examples.
- `typecheck`: `vue-tsc` with the canonical strict compiler settings and selected
  files as entries. Public barrel imports may also pull dependencies into the graph.
- `unit-coverage`: the selected tests run once with the existing Vitest config,
  coverage exclusions and shared 80% line policy. Coverage includes only selected
  production files; the total and applicable package gates still apply.
- `manifests`: the existing source-to-manifest sync, example ownership validation,
  and canonical JSON Schema, scoped to the selected component family.
- `boundaries`: the existing boundary checker/rules with selected source entries.
  Workspace package metadata still defines the dependency contract.
- `e2e-axe`: build the playground/docs hosts with their existing scripts, then run
  the existing `chromium-e2e` Playwright project. Titles matching the public
  component name, its example prefix (`button/`), or docs path (`/components/button`)
  select behavior and Axe tests. Use `@component:GhostButton` tags when a shared
  test has a generic title. Follow these naming conventions for new tests.
  Visual baselines remain in the separate visual project and full browser CI.

Missing components, tests, manifests, browsers, failed host builds and command
timeouts fail. Discovery failure marks dependent checks `skip` with a reason;
ordinary failures do not prevent independent checks from running. A failed host
build stops the browser check before Playwright, preventing stale assets from
producing a green result. Each subprocess has a three-minute timeout.

## JSON report (version 1)

The canonical TypeScript shape lives in
[`scripts/lib/verify-component.d.ts`](../../scripts/lib/verify-component.d.ts):

```ts
interface ComponentVerificationReport {
  schemaVersion: 1
  component: string // normalized public name, e.g. GhostButton
  status: 'pass' | 'fail'
  durationMs: number
  checks: {
    name: string
    status: 'pass' | 'fail' | 'skip'
    durationMs: number
    errors: string[]
  }[]
}
```

Durations are nonnegative wall-clock milliseconds. Successful checks have no
errors. Failed checks contain up to twelve initial diagnostic lines with terminal
control codes removed and each line capped at 500 characters. Skipped checks
include a reason. Invalid names use `InvalidComponent.json`, so input is never
interpreted as a path. Failure reports are written before the CLI exits.
