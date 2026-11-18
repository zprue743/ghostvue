# Versioning and releases

Changesets records consumer-visible package changes and drives semantic versions
and changelogs. Add a Changeset with `pnpm changeset`, select affected publishable
packages, choose patch/minor/major impact, and write a consumer-focused summary.

Internal refactors, tests, and documentation that do not affect a package release
usually need no Changeset. Pre-1.0 versions still require explicit compatibility
judgment; zero-major status is not permission for surprise breakage.

## Publication status

Publication is **disabled**. The first public release is `0.1.0` of
`@ghostvue/shared`, `@ghostvue/core`, `@ghostvue/vue`, and `@ghostvue/themes`
under the `@ghostvue` npm scope. The maintainer authorized preparing a dry-run
pipeline and approval gate only (GHO-57). Real publication requires a separate,
explicit maintainer authorization. No agent may publish packages, create npm
tokens, or create releases without that authorization.

Until then, these invariants hold and are enforced by
`tests/integration/release-pipeline.test.ts`:

- Every publishable package keeps `"private": true`. npm refuses to publish a
  private package, so `publishConfig` alone cannot cause a release.
- Every publishable package declares `publishConfig.access: "public"` (required
  for a scoped package), `publishConfig.provenance: true`, and a `repository`
  that matches this GitHub repository (npm provenance rejects a mismatch).
- Neither the release workflow nor any root script contains `npm publish`, `pnpm publish`,
  `changeset publish`, the Changesets action, or npm credentials.
- The release workflow grants `id-token: write` to no job, and every action is
  pinned by commit SHA per the [CI policy](./ci.md).

## Release dry run

```bash
pnpm build
pnpm release:dry-run --expect-version 0.1.0
```

`scripts/release-dry-run.mjs` never publishes. It refuses to run without
`--dry-run` (the root script passes it) and exits with code 2 on flags such as
`--publish`, `--no-dry-run`, or `--otp`. For each package it:

1. checks the source manifest invariants above;
2. runs `changeset version` in a scratch copy of the workspace manifests and
   `.changeset/` to get the planned version and changelog preview (the checkout
   is never modified);
3. packs the package with `pnpm pack`, which applies `files` and rewrites
   `workspace:*`;
4. stages the packed tree in a temporary directory, sets the planned version and
   exact internal dependency versions, and removes `private` from that
   temporary copy only;
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

Packed-export quality is not duplicated here: run `pnpm published-exports` and
`pnpm exports:check` (publint, attw, packed define smoke) first, as CI does.

## Release workflow

`.github/workflows/release-dry-run.yml` runs only on manual dispatch, with
`expected_version` (default `0.1.0`). Workflow permissions default to none.

- **`dry-run`** (`contents: read`): install, build, `published-exports`,
  `exports:check`, `release:dry-run`, confirm the checkout is unchanged, and
  upload the `release-dry-run-evidence` artifact. It runs on any branch.
- **`maintainer-approval`** (master only, `environment: npm-release`,
  `contents: read`): waits for a required reviewer, verifies the downloaded
  evidence, and records that publication is disabled. It has no publish step
  and no `id-token: write`; no job in the workflow can request an OIDC token.
  The future authorized publish PR adds `id-token: write` to this job only, so
  the publish step runs behind the same approval.

## First release checklist

- [x] **Scope ownership.** The `@ghostvue` scope is owned by the maintainer's npm
      user account `ghostvue` (confirmed Nov 12). No npm organization exists yet;
      converting to one is optional and only needed when other maintainers join.
- [x] **Package names.** `@ghostvue/shared`, `@ghostvue/core`, `@ghostvue/vue`,
      and `@ghostvue/themes` (catalog: `scripts/workspace-packages.mjs`). Apps
      (`@ghostvue/docs`, `@ghostvue/playground`) stay private and unpublished.
- [x] **Version plan.** Pending Changesets plan `0.0.0 → 0.1.0` for all four
      packages; `--expect-version 0.1.0` fails the dry run otherwise.
- [x] **Packaging metadata.** `publishConfig` (public access, provenance) and
      `repository.directory` added while packages stay private.
- [x] **Packed exports.** publint, attw, declaration and packed smoke checks
      (GHO-55, GHO-6) run before the dry run.
- [x] **Dry run.** Credential-free `npm publish --dry-run` of staged tarballs
      with evidence uploaded as a workflow artifact.
- [x] **Approval gate.** The `maintainer-approval` job uses the `npm-release`
      environment. It gets `id-token: write` only in the authorized publish PR.
- [ ] **Environment reviewers (repository admin).** In Settings → Environments,
      create `npm-release`, add the maintainer as a required reviewer, and
      restrict deployment branches to `master`. GitHub does not wait for approval until reviewers are set.
- [ ] **Changelog policy.** Review the generated `0.1.0` changelog previews in
      the evidence artifact. The pending Changesets include pre-release history
      (for example the slop-ui rename); decide whether to consolidate them into a
      first-release summary before versioning.
- [ ] **Support matrix.** Confirm the documented Node (`>=22`) and Vue
      (`^3.5.0` peer) support for the first release.
- [ ] **Explicit publication authorization.** The maintainer records a separate
      written authorization to publish `0.1.0`. Nothing below happens before it.

### Access needed for real publication (after authorization)

Missing publication credentials do not block the dry run. A real release needs:

- **npm trusted publishing (preferred, no long-lived token).** On npmjs.com,
  for each package, configure a trusted publisher: GitHub repository
  `zprue743/ghostvue`, workflow `release-dry-run.yml` (or its renamed successor),
  environment `npm-release`. Trusted publishing requires npm CLI `>= 11.5.1`
  in the publish job (Node 22 bundles npm 10, so the job must upgrade npm).
  A package must exist before a trusted publisher can be attached, so the very
  first publish may need a one-time granular token held only by the maintainer,
  stored as an `npm-release` environment secret, and revoked afterward.
- **Provenance.** Requires `id-token: write`, which the authorized publish PR
  adds to the gated `maintainer-approval` job only, a public repository, and
  `repository.url` matching it (enforced by tests).
- **2FA.** Keep 2FA required for the `ghostvue` npm account; trusted
  publishing bypasses OTP prompts only for the configured workflow.

### Authorized release PR (future)

A separate PR, opened only after authorization, should:

1. run `pnpm changeset version` and commit the `0.1.0` versions and changelogs;
2. remove `"private": true` from the four publishable packages and update the
   invariant tests accordingly;
3. add a publish step (`pnpm publish -r --access public --provenance` or
   `changeset publish`) to the gated `maintainer-approval` job only, keeping the
   `npm-release` environment and adding `id-token: write` to that job alone
   (and updating the workflow invariant tests that forbid it today);
4. update `.changeset/config.json` `privatePackages.tag` if git tags are wanted.

After publication, verify the provenance badge on npmjs.com and install each
package from the registry in a clean project.

## CI policy

The release workflow follows the [CI policy](./ci.md): actions pinned by commit
SHA, a read-only default token, and write or `id-token` scopes only on the job
that needs them.
