# Versioning and releases

Changesets records consumer-visible package changes and drives semantic versions
and changelogs. Add a Changeset with `pnpm changeset`, select affected publishable
packages, choose patch/minor/major impact, and write a consumer-focused summary.
Never name `@ghostvue/core` or `@ghostvue/shared` in a Changeset: they are
internal and never released (`tests/integration/release-pipeline.test.ts`
rejects it).

Internal refactors, tests, and documentation that do not affect a package release
usually need no Changeset. Pre-1.0 versions still require explicit compatibility
judgment; zero-major status is not permission for surprise breakage.

CI (`scripts/check-pr-changeset.mjs` in `.github/workflows/pr-changeset.yml`) enforces that pull
requests touching publishable package inputs (`packages/{vue,themes,nuxt,eslint-plugin,mcp}/src/**`,
`packages/themes/tokens/**`, or `packages/*/package.json`, excluding `*.test.*`,
`*.spec.*`, `manifests/**`, and `AGENTS.md`) either add or update a
`.changeset/<slug>.md` entry or carry the `no-changeset` label. Use
`no-changeset` when a change inside a publishable package is purely internal and
has no consumer-visible impact. Dependabot `dependencies`-labeled PRs that only
bump `devDependencies` (without changing `dependencies`, `peerDependencies`, or
`optionalDependencies`) are exempted automatically.

## Publication status

The first public release is `0.1.0` of five
packages under the `@ghostvue` npm scope: `@ghostvue/vue`, `@ghostvue/themes`,
`@ghostvue/nuxt`, `@ghostvue/eslint-plugin`, and `@ghostvue/mcp`. These are the
entries with `publishable: true` in `scripts/workspace-packages.mjs`
(`publishableWorkspacePackages`), which every release script and test reads.
`@ghostvue/core` and `@ghostvue/shared` are internal (`publishable: false`): they
stay in the catalog for boundary and adapter checks, have no `publishConfig`,
and no published package may depend on them (GHO-217). The maintainer approved
the release candidate in #335. Publication requires separate, explicit
maintainer authorization (GHO-57).

These invariants are enforced by
`tests/integration/release-pipeline.test.ts`:

- Every package, publishable or internal, keeps `"private": true`. npm refuses
  to publish a private package. Only the verified, staged tarballs are published.
- Every publishable package declares `publishConfig.access: "public"` (required
  for a scoped package), `publishConfig.provenance: true`, and a `repository`
  that matches this GitHub repository (npm provenance rejects a mismatch).
- Every `@ghostvue/*` entry in a publishable package's `dependencies`,
  `peerDependencies`, or `optionalDependencies` uses `workspace:^`, which packs
  to a caret range such as `^0.1.0`. `workspace:*` and exact versions pack to
  pins that nest duplicate copies or fail installs with ERESOLVE (#345). See
  the [dependency policy](../standards/dependencies.md#internal-ghostvue-ranges-345).
- `.changeset/config.json` puts the five publishable packages in one `fixed`
  group, so they always share a version: a minor Changeset for any one of them
  bumps all five. `tests/integration/release-dry-run.test.ts` simulates a
  `@ghostvue/vue`-only minor after 0.1.0 and expects all five at 0.2.0.
- The dry-run workflow has no npm credentials or OIDC permissions. Only the
  approved publish job gets `id-token: write` for provenance. Actions are
  pinned by commit SHA per the [CI policy](./ci.md).

## Release dry run

```bash
pnpm build
pnpm release:dry-run --expect-version 0.1.0
```

`scripts/release-dry-run.mjs` never publishes. It refuses to run without
`--dry-run` (the root script passes it) and exits with code 2 on flags such as
`--publish`, `--no-dry-run`, or `--otp`. It covers the five publishable packages
only and refuses an entry marked `publishable: false`. For each package it:

1. checks the source manifest invariants above;
2. uses a scratch copy to apply pending Changesets or read the committed
   release versions and changelogs;
3. packs the package with `pnpm pack`, which applies `files` and rewrites
   `workspace:^` to a caret range;
4. stages the packed tree in a temporary directory, sets the planned version and
   caret ranges on the planned internal versions (refusing any internal range
   that packed to an exact pin), and removes `private` from that temporary copy
   only;
5. runs `npm pack` and `npm publish --dry-run` on the staged copy and checks that
   both report the same sha1 as the tarball on disk.

Child npm processes get an empty user and global npmrc, no `NODE_AUTH_TOKEN`,
`NPM_TOKEN`, or `npm_config_*` variables, no GitHub OIDC request variables, and
`https://registry.invalid/` as the registry. Even if the dry-run flag were
bypassed there would be no credential and no reachable registry.

Evidence lands in `reports/release-dry-run/` (ignored by git): `summary.json`,
`summary.md`, the exact tarballs, raw `npm publish --dry-run --json` output, and
changelog previews. `pnpm release:dry-run --verify-evidence <dir>` re-checks a
copy of that evidence.

Packed-export quality is not duplicated here: run `pnpm published-exports`,
`pnpm exports:check` (publint, attw, packed define smoke), `pnpm mcp:packed`
(`@ghostvue/mcp` contents, 18 MiB installed-size gate, and stdio smoke that
calls every tool and checks the `manifestSchemaId` stamp; see the
[MCP server guide](../tooling/mcp-server.md#release-checks)), and
`pnpm consumer:packed` first, as CI does.

`pnpm consumer:packed` (`scripts/consumer-packed-smoke.mjs`) installs the packed
tarballs with npm into consumer projects outside the monorepo, copied from
`tests/fixtures/consumer-packed/`:

- `@ghostvue/vue` + `@ghostvue/themes`: a Vite + Vue app with themed Field,
  Input, Select, Dialog, Drawer, and Toast, set up as
  [Getting started](../getting-started.md#add-a-theme) documents: it imports
  only `@ghostvue/themes/calm.css`, never `default.css`. The production build
  must emit the base `@layer ghostvue-theme` recipes that the
  `@ghostvue/themes` entry imports, plus the calm token host, and the built
  bundle is mounted in jsdom and driven once per component.
- `@ghostvue/nuxt`: a Nuxt app that uses only module auto-imports. The headless
  default is built and server-rendered; the themed opt-in must resolve tags to
  `@ghostvue/themes`.
- `@ghostvue/eslint-plugin`: ESLint flags an invalid `Ghost*` usage with all
  three rules and passes a valid one.

Third-party consumer dependencies are pinned to the workspace's own versions,
so the check needs the npm registry but no credentials.

## Release workflow

`.github/workflows/release-dry-run.yml` runs on manual dispatch or as a reusable rehearsal, with
`expected_version` (default `0.1.0`). Workflow permissions default to none.

- **`dry-run`** (`contents: read`): install, build, `published-exports`,
  `exports:check`, `mcp:packed`, `consumer:packed`, `release:dry-run`, confirm
  the checkout is unchanged, and
  upload the `release-dry-run-evidence` artifact. It runs on any branch.
- **`maintainer-approval`** (master only, `environment: npm-release`,
  `contents: read`): waits for a required reviewer, verifies the downloaded
  evidence, and records that publication is disabled. It has no publish step
  and no `id-token: write`. This approval job is skipped when the publish
  workflow calls the rehearsal.

## First release checklist

- [x] **Scope ownership.** The `@ghostvue` scope is owned by the maintainer's npm
      user account `ghostvue` (confirmed Nov 12). No npm organization exists yet;
      converting to one is optional and only needed when other maintainers join.
- [x] **Package names.** `@ghostvue/vue`, `@ghostvue/themes`, `@ghostvue/nuxt`,
      `@ghostvue/eslint-plugin`, and `@ghostvue/mcp` (`publishable: true` in
      `scripts/workspace-packages.mjs`). `@ghostvue/core`, `@ghostvue/shared`,
      and the apps (`@ghostvue/docs`, `@ghostvue/playground`,
      `@ghostvue/nuxt-fixture`) stay private and unpublished.
- [x] **Version plan.** Changesets recorded `0.1.0` in all five manifests and
      changelogs. The release rehearsal checks the exact version.
- [x] **Packaging metadata.** `publishConfig` (public access, provenance) and
      `repository.directory` added while packages stay private.
- [x] **Packed exports.** publint, attw, declaration and packed smoke checks
      (GHO-55, GHO-6) run before the dry run.
- [x] **Packed consumers.** `pnpm consumer:packed` and `pnpm mcp:packed`
      exercise every publishable tarball as an external consumer (GHO-217).
- [x] **Schema URLs.** The manifest schemas are identified by
      `https://ghostvue.dev/schemas/v1/manifest.schema.json` and
      `https://ghostvue.dev/schemas/v1/manifest-collection.schema.json`, served
      from byte-identical copies in `docs/public/schemas/v1/`
      ([ADR 0006](../adr/0006-component-manifest-schema.md)).
- [x] **Live schema URLs.** #335 verified both responses against the
      checked-in JSON from `https://ghostvue.dev`.
- [x] **Dry run.** Credential-free `npm publish --dry-run` of staged tarballs
      with evidence uploaded as a workflow artifact.
- [x] **Approval gate.** The `maintainer-approval` job uses the `npm-release`
      environment. The separate publish job also uses this environment.
- [x] **Environment reviewers.** The `npm-release` environment has a required
      reviewer and allows deployments from `master`.
- [x] **Changelog policy.** Pre-release Changesets (including the slop-ui
      rename history) were consolidated into one first-release summary,
      `.changeset/initial-release-0-1-0.md`. Review the generated `0.1.0`
      changelog previews in the evidence artifact. Repeat the dry run on the
      final `0.1.0` release candidate.
- [x] **Support matrix.** #335 ran the packed consumer checks on Node 22.
      The Vue peer range is `^3.5.0`.
- [ ] **Explicit publication authorization.** The maintainer records a separate
      written authorization to publish `0.1.0`. Nothing below happens before it.

### Publishing 0.1.0 (#383)

After the maintainer explicitly authorizes publication, use **Publish 0.1.0**
on `master` in GitHub Actions. The workflow rehearses the exact revision,
runs the packed consumer checks, and uploads its tarballs. Review those
tarballs and then approve the job in the `npm-release` environment.

For the first publish, add a short-lived npm granular token as `NPM_TOKEN`
under **Settings → Environments → npm-release → Environment secrets**.
Allow publishing in the `@ghostvue` scope and enable bypass 2FA on the token
for the unattended upload. Revoke it after publication. Future automated
releases can use Trusted Publishing after the package pages exist.

The approved job verifies the artifact revision, package names, versions,
and hashes before uploading the five tarballs with public access and npm
provenance. The GitHub-hosted job receives OIDC permission for provenance and
passes the environment secret to npm only for publication. The final job
installs all five versions into a clean directory, verifies registry signatures
and attestations with `npm audit signatures`, and links to the new versions.

If a run publishes only part of the release, use **Re-run failed jobs** on
the same workflow run to reuse its tarballs. An existing version is skipped
only if the registry integrity matches the tarball. Record the workflow and
the published links in #383 after the clean install passes.

## CI policy

The release workflow follows the [CI policy](./ci.md): actions pinned by commit
SHA, a read-only default token, and write or `id-token` scopes only on the job
that needs them.
