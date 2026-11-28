# CI and dependency updates

CI runs from `.github/workflows/`. These rules apply to every workflow in that
directory, including future release or publish workflows. They are enforced by
`tests/integration/ci-workflow-policy.test.ts`.

## Pinned actions

Every `uses:` reference is pinned to a full 40-character commit SHA with the
exact release in a trailing comment:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
```

Tags such as `@v4` can be moved by whoever controls the action repository; a
commit SHA cannot. When adding or bumping an action by hand:

1. Resolve the SHA from the upstream repository, for example
   `git ls-remote --tags https://github.com/actions/checkout 'refs/tags/v4*'`.
   For an annotated tag, use the peeled `^{}` commit, not the tag object.
2. Use the exact release the major tag points to (`v4` → `v4.4.0`), and write
   that release in the comment.
3. Use one SHA per action repository across all workflows. CodeQL `init` and
   `analyze` must come from the same `github/codeql-action` release.

Never copy a SHA from a blog post or another repository without checking it
against upstream.

Container images are pinned by exact tag. The Playwright image tag must match
`@playwright/test` in `package.json`; it also provides the browsers (Chromium,
Firefox, and WebKit with their system libraries). On Playwright 1.65.1,
`browser-cross` installs Firefox revision 1575 for the
[upstream accessibility fix](https://github.com/microsoft/playwright/pull/43982).
The version-specific pnpm patch selects the same browser for local
`pnpm exec playwright install firefox`. Remove the patch and CI install step
when the pinned image includes the fix. The `browser-shard` matrix (3 Chromium shards) runs the
Chromium projects and the consolidated `browser-cross` job runs both
`firefox-e2e` and `webkit-e2e` from the same image; see the
[cross-browser matrix](../standards/testing.md#cross-browser-functional-matrix).

## Token permissions

The default `GITHUB_TOKEN` is read-only (`contents: read`, or `{}` at workflow
level). Grant extra scopes per job, only where needed, with a comment explaining
why. Keep write scopes off jobs that run pull-request code; the exception is
CodeQL's `security-events: write`, which only uploads scan results. GitHub
downgrades the token to read-only for pull requests from forks.
A future release workflow follows the same rules: pinned SHAs, job-level
scopes such as `id-token: write` for provenance only on the publish job, and no
publish steps triggered by untrusted events. See [releases](./releases.md).

## Install scripts

`pnpm install --frozen-lockfile` runs with dependency install scripts blocked
except those listed under `allowBuilds` in `pnpm-workspace.yaml`. Adding an entry
needs the review described in the [dependency policy](../standards/dependencies.md).

## Node versions

`engines.node` is `>=22`. The `verify-static`, `verify-unit` (with coverage),
`verify-integration`, `verify-build`, `build-browser-hosts`, `nuxt-fixture`, `browser-shard`, and
`browser-cross` jobs run on Node 22. Node 24 compatibility is exercised without
duplicate coverage instrumentation by `verify-unit-node24` on pushes to `master`,
merge groups, weekly scheduled runs, and pull requests that change Node/tooling
configuration (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`vitest.config.ts`, or `.github/workflows/ci.yml`). Raising the `engines` floor
needs its own reviewed change.

## Path-scoped checks and caching

The `changes` job classifies pull request diffs via
`scripts/ci-changed-paths.mjs`:

- Prose-only docs (`docs/**/*.md` without live Vue/VitePress blocks or
  `<!-- @generated docs-api:… -->` tables), `AGENTS.md`, and `.cursor/**` PRs
  set `skip_heavy=true` while keeping required `verify` and `browser` checks
  green. Pages with generated API tables still run `verify-static`, whose
  `pnpm docs:api` step checks those tables.
- Docs, showcase, and example PRs (`e2e_scope=docs`) scope `browser-shard` to
  `docs-*.spec.ts` and `examples*.spec.ts` and skip unrelated `nuxt-fixture`,
  `browser-cross`, and `verify-unit-node24` jobs (`verify-static` still runs
  `pnpm keyboard-evidence` in list mode).
- `tests/integration/new-component.test.ts` runs targeted verification over
  scaffolded artifacts by default; setting `RUN_FULL_SCAFFOLD_VERIFY=1` (used on
  scaffolding changes and the weekly `CI` schedule) runs full nested
  `pnpm verify`.
- `verify-static` caches `.prettiercache` (`static-prettier-cache`) and
  `build-browser-hosts` caches `apps/docs/.vitepress/cache` (`vitepress-cache`). Both
  set `GHOSTVUE_REGISTRIES_READY=1` after `pnpm install` (`prepare`) runs
  `registries:write` so `pretypecheck` and `prebuild` hooks skip redundant
  rewrites while `pnpm registries` verification still executes.

The `build-browser-hosts` job builds the playground and docs, checks the built
site links, and uploads one artifact for every browser runner. It starts alongside
`verify-build`, which builds the packages and runs the export, packed-consumer,
agent guide, bundle-size, and MCP asset checks. Both jobs must pass for `verify` to succeed
on heavy runs. The `browser` check waits for the hosts and
the selected browser jobs.

## Browser shard balancing

Playwright's `--shard` splits tests by count, but the cheap `chromium`
screenshot tests and the heavy docs and example specs cost very different
amounts, so equal counts left one shard doing most of the work. Each
`browser-shard` job instead runs `scripts/e2e-shard-plan.mjs`, which lists the
selected tests, groups them into project/spec-file units, costs each unit from
the mean per-test durations in `scripts/e2e-shard-timings.json`, and packs the
units onto the three shards heaviest first. The job then runs its share with
`playwright test --test-list`. Every job computes the same plan, so the shards
never overlap or drop a test. A spec file missing from the timing table is
costed at its project's median, so new specs only make the balance slightly
worse until the table is refreshed.

Refresh the table when a shard's runtime drifts well away from the others:
download the `playwright-results-json` artifact from a recent full `master`
run and run
`node scripts/e2e-shard-plan.mjs --write-timings=<path/to/results.json>`.
Only relative durations matter, so a local full Chromium run also works.

## Keyboard evidence

The `browser` job merges every Playwright blob report into HTML, GitHub
annotations, and `.artifacts/playwright/results.json`, and on full E2E runs
(`e2e_scope != 'docs'`) runs
`node scripts/check-keyboard-evidence.mjs --report` on that JSON. It fails when
any test mapped in a manifest's `accessibility.verification.automatedKeyboard`
did not execute in `chromium-e2e` or did not pass. See
[accessibility verification](../architecture/component-manifest.md#accessibility-verification).

## Nuxt SSR fixture

The `nuxt-fixture` job builds `apps/nuxt-fixture` (the `@ghostvue/nuxt`
consumer) in its headless default and themed opt-in variants and runs
`pnpm test:nuxt` in the same pinned Playwright image as `browser-shard`. It
runs on `master`, merge groups, weekly runs, and PRs touching workspace
packages, Nuxt fixture/config, `scripts/`, or CI configuration; when run, the
aggregate `verify` check requires it. Run it locally after building the packages:
`pnpm --filter "@ghostvue/nuxt-fixture^..." build && pnpm test:nuxt`.

## Security scanning

`.github/workflows/codeql.yml` runs CodeQL for `javascript-typescript` and
`actions`. It runs on pushes and pull requests to `master` when code, package,
or workflow files change, plus an unfiltered weekly schedule. Results appear
under the repository's code scanning alerts.

## Automated dependency updates

[Dependabot](https://docs.github.com/en/code-security/dependabot)
(`.github/dependabot.yml`) opens update pull requests on Monday mornings
(UTC) for `npm` and `github-actions`:

- npm versions stay exact (`versioning-strategy: increase` alongside `saveExact`
  in `pnpm-workspace.yaml`). Installs keep `strictPeerDependencies` and
  `engineStrict`; Dependabot does not override them.
- A new npm release must be at least 3 days old before Dependabot proposes it
  (`cooldown.default-days: 3`), which gives the registry time to pull a bad or
  compromised version. Dependabot security updates continue immediately without
  delay.
- GitHub Actions are grouped into one `github-actions` pull request and
  Dependabot preserves the full 40-character commit SHA pins and version
  comments enforced by `tests/integration/ci-workflow-policy.test.ts`.
- Playwright packages (`@playwright/test`, `playwright`, and `playwright-core`)
  are grouped into one `playwright` pull request. Dependabot does not rewrite
  container image tags in `.github/workflows/ci.yml`,
  `scripts/lib/test-visual-docker.js`, or `.cursor/environment.json`, so when a
  Playwright PR updates `@playwright/test`, update the pinned
  `mcr.microsoft.com/playwright` tag in those files to match (enforced in CI by
  `tests/integration/ci-workflow-policy.test.ts`).
- Major updates for `node`, `@types/node`, and `pnpm` are ignored in
  `.github/dependabot.yml` so runtime floor bumps remain explicit human pull
  requests.
- The hourly PR sweep may merge routine upgrades to existing dependencies
  after reviewing the upstream changes and verifying the required checks.
  Major-version upgrades and updates with severe breaking changes require
  explicit admin approval. The sweep reports the affected version and the
  concrete impact, such as a raised runtime floor or a removed API GhostVue
  uses. Mechanical updates to matching version pins follow the same dependency
  rule. Changes to workflow behavior or permissions require admin approval.

Security advisories are triaged as described in the
[dependency policy](../standards/dependencies.md#security-audit-triage).
