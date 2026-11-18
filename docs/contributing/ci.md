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
Firefox, and WebKit with their system libraries), so CI never runs
`playwright install`. The `browser-shard` jobs run the Chromium projects and
the `browser-cross` jobs run the `firefox-e2e` and `webkit-e2e` projects from
the same image; see the
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

`engines.node` is `>=22`. The `verify-static` and `verify-unit` jobs run on
Node 22 and 24. Integration, build, and browser jobs (including
`browser-cross`) run on Node 22 only. When a
new Node LTS line ships, add it to both matrices. Raising the `engines` floor
needs its own reviewed change.

## Security scanning

`.github/workflows/codeql.yml` runs CodeQL for `javascript-typescript` and
`actions`. It runs on pushes to `master`, on pull requests to `master`, and
weekly. Results appear under the repository's code scanning alerts.

## Automated dependency updates

[Renovate](https://docs.renovatebot.com/) (`renovate.json`) opens update pull
requests on Monday mornings (UTC):

- npm versions stay exact (`rangeStrategy: "pin"`), matching `saveExact` in
  `pnpm-workspace.yaml`. Installs keep `strictPeerDependencies` and
  `engineStrict`; Renovate does not override them.
- A new release must be at least 3 days old before Renovate proposes it
  (`minimumReleaseAge`), which gives the registry time to pull a bad or
  compromised version. Security fixes are not delayed.
- GitHub Actions are grouped into one pull request and kept as commit SHAs with
  a version comment (`helpers:pinGitHubActionDigests`).
- Playwright packages and the Playwright container image are updated together.
- Weekly lock file maintenance refreshes transitive dependencies within their
  declared ranges.
- Node and pnpm major updates wait for approval on the Dependency Dashboard.
- Automerge is disabled. Every update pull request runs the normal CI gate and
  needs a human review before merge.

Security advisories are triaged as described in the
[dependency policy](../standards/dependencies.md#security-audit-triage).
