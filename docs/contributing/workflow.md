# Contribution workflow

## First contribution

1. Browse [open issues](https://github.com/zprue743/ghostvue/issues) or
   [report a bug or request a feature](https://github.com/zprue743/ghostvue/issues/new/choose).
   Comment on the issue with what you would change so a maintainer can confirm
   the scope and release before you start.
2. Clone the repository. With Node.js 22+ and pnpm 11+, run `pnpm install`.
   Use `pnpm docs:dev` to preview the docs or `pnpm dev` to open the playground.
   Read `AGENTS.md` and the standards relevant to the change.
3. Follow existing patterns, update the relevant tests and docs, and run focused
   checks followed by `pnpm verify`. For browser behavior, run the Playwright
   specs that cover your change. Add component usage samples in `examples/`
   using the [executable example convention](./examples.md).
4. Open a pull request using the template. Link the issue, describe the change,
   and report which checks ran.

## Review requirements

- Adding or promoting a component requires the
  [component gate](../agents/COMPONENT_WORKFLOW.md), including an approved spec,
  tests, docs, and a manifest.
- Add a [Changeset](./releases.md) when a publishable package's consumer-visible
  behavior changes. Use the `no-changeset` PR label for internal-only changes
  inside publishable packages.
- Comment non-obvious decisions and review the diff for API, accessibility,
  reactivity, SSR, cleanup, security, dependency, and licensing concerns.

The hourly PR sweep checks for overlapping edits in shared files on PRs that
target the same branch. An overlap advisory in the run report names the affected
PRs, file, and change, and suggests a merge order. After the first PR lands,
check whether the second needs to reconcile the shared edit.

## Issue tracking

GhostVue tracks engineering work in
[GitHub Issues](https://github.com/zprue743/ghostvue/issues). Linear is
retired; historical `GHO-n` keys remain valid references in older docs and
commits.

- **New work:** open a GitHub issue. Apply `priority:*` labels for priority.
  Choose the form that matches the work. Use the
  [bug report](https://github.com/zprue743/ghostvue/issues/new?template=bug.yml)
  for incorrect behavior and the
  [feature proposal](https://github.com/zprue743/ghostvue/issues/new?template=feature.yml)
  for new public behavior. Use the
  [engineering task](https://github.com/zprue743/ghostvue/issues/new?template=engineering-task.yml)
  for bounded internal work such as tooling, a docs migration, or a follow-up
  implementation. The task form records the author's proposed release and
  dependencies but applies no labels. Triage then sets the board's Target
  release, ownership, and the readiness labels below, so filing never grants
  pickup.
- **Branches:** name the issue, for example `issue-42-fix-tooltip-focus`.
- **Pull requests:** include `Fixes #<n>` in the body so the issue closes on
  merge.
- **Legacy `GHO-n` keys:** locate the GitHub issue whose title begins with
  `GHO-n:` (for example `GHO-17: …`). Open GHO issues were migrated as
  `#306`–`#320`.

### Agent readiness

Apply `agent:triaged` when an issue meets these criteria, including work planned
for a future release.

- The issue describes the problem, intended outcome, and scope clearly enough to
  start work.
- The acceptance criteria describe how to verify the outcome.
- Any decisions, approvals, and prerequisites required for the scoped work are
  in place, and the work can start now.

Remove `agent:triaged` when the scope or approvals need review. For open
dependencies add `blocked` and record `Blocked by: #123, #456` in the issue.
Reassess the issue when a blocker closes. Keep its planned release.

The [release-scope policy](https://github.com/zprue743/ghostvue/blob/master/.github/release-scope.json)
selects one exact board option. In enforcement mode the repository owns
`agent:ready`. It adds the label to triaged Todo issues in the active release
and withdraws it for open dependencies, holds, assignees, or work already
underway. All pickup paths, including dependency closure and spec drafting
under a human account, must claim before starting:

```sh
node scripts/release-scope.mjs claim 123
```

The command dispatches to `master` and waits for that specific workflow run.
Only a successful claim authorizes starting work. A dispatch timeout, cancellation,
or denied claim requires checking the run and issue timeline. The workflow
sets `in-progress` and records the claimant and run URL on the issue. To release
abandoned or interrupted work, clear `in-progress`, any assignee and the board's
In Progress status after confirming the worker has stopped.

PRs targeting `master` require an active-release issue. Use GitHub closing links
or put `Work item #123` on its own line for each partial work item. Include the
branch's issue if using an `issue-<n>-` branch. Verified Dependabot updates on
the repository's Dependabot branches follow their own review path.

#### Dependency-gated implementations

The `implementationGates` entries in `.github/release-scope.json` authorize
automatic triage for specific implementation issues. Under an implementation
number, map each prerequisite issue to acceptable spec filenames (slugs under
`docs/components/*-spec.md`). An empty list means the prerequisite is an
implementation PR that must land on master. For example, #419 requires both
the approved submenu spec from #413 and the first host from #418. Update the
entry in the spec PR if the approved design uses a different filename.

The sweep checks native GitHub dependencies and every local `Blocked by:`
reference. For a configured prerequisite it verifies a completed issue and a
linked PR merged into this repository's master branch. For specs, the PR must
change an approved spec with approval evidence, and that file must still be
approved on master with its blocking questions resolved.

Issue close/reopen, spec merges and the scheduled sweep reconcile the labels.
Reopening a prerequisite restores `blocked` and withdraws `agent:ready`,
including on already assigned work. Clearing the last hold allows automatic
triage and readiness for unowned Todo implementations in the active release.
Human, design and deferred holds still prevent pickup. The protected policy
entry delegates this decision for the listed issues; use `human-required` for
a separate maintainer hold. Both workflow modes reconcile these designated
issues. The local report is always read-only, and claims and PR commit-status
writes still require enforcement mode.

#### Rollout and operation

1. Configure an Actions secret named `RELEASE_PROJECT_TOKEN` with read access
   to the user-owned project and its issue content. The repository workflow
   token handles issue and commit-status writes. Create the `agent:triaged`
   label and review existing candidates against the criteria above.
2. While the policy is in `report` mode, run `node scripts/release-scope.mjs report`
   with an authenticated, project-readable GitHub CLI, or dispatch the
   **Release scope** workflow with the claim field empty. Review the queue
   changes and each open PR with the maintainers. In report mode only the designated implementation gates reconcile labels.
   Assignees and commit statuses are preserved, and claims are disabled.
3. Connect every runner to the claim command and confirm it waits for success.
   Coordinate the switch with pickup paused. Merge a policy PR selecting
   `enforce`, confirm the first sweep and claim behavior, require the
   `release-scope` commit status from GitHub Actions in the `master` ruleset,
   then resume pickup. Issue/PR events and policy changes run a full sweep.
   A scheduled sweep every 15 minutes catches board-only edits. Claims always
   read the live board. An unreadable board stops pickup, preserves labels, and
   marks open PR heads with an error. Restore access and dispatch a fresh sweep.
4. After the [release gate](./releases.md) and approval of the next board option,
   the release-planning agent runs `node scripts/release-scope.mjs report 0.2.0`
   (substitute the approved option). Open a PR changing only `activeRelease`,
   link the current-release rollover issue, and paste the before/after report
   and unfinished issue list. Maintainer merge activates the next queue.
   Retarget carryovers only after an explicit decision. Publication requires its
   own authorization.

### Release routing and branching

- **Next release.** Develop on short-lived issue branches from `master` and
  target PRs at `master`. Read `activeRelease` from
  [the policy on master](https://github.com/zprue743/ghostvue/blob/master/.github/release-scope.json)
  and check the issue's **Target release** on the execution board before
  picking it up. Future-release, unassigned, and patch issues stay out of
  automatic pickup, even if they still carry an old `agent:ready` label.
- **Report mode.** Legacy runners use `agent:ready` as a signal. Recheck the
  target, status, holds, and ownership before acting on that label. Use the
  release-scope report to preview the queue. In enforcement mode follow the
  claim command above.
- **Maintenance.** Keep `0.1.x` on the board for compatible fixes. Start work
  only when a maintainer selects the issue for a patch. Cut `release/0.1.x`
  from `v0.1.0` when the first patch is needed. Target a separate patch issue
  branch and PR at `release/0.1.x`. Backport a focused fix from `master` when
  it already exists. Otherwise carry the fix forward to `master` in a
  separate PR. Keep branch-specific version and changelog commits on their
  original branch.

Keep one active development target throughout a maintenance release. See
[the release runbook](./releases.md#release-operation) for the maintenance
branch setup and publication steps.

### Release planning

The [release roadmap](https://github.com/users/zprue743/projects/5/views/2) shows major
deliverables and release gates. The
[execution board](https://github.com/users/zprue743/projects/5/views/3) groups tracked
issues by status and target release. Both views require project access.

- GitHub adds new open issues and updates card status when issues close or
  reopen. Agents reconcile missing cards and triage the intake group. Set
  `Target release` when an issue or approved plan names a release. Set
  `Roadmap` to `Show` for major deliverables and release gates.
- Preserve existing project field choices unless a maintainer decision or a
  documented release change calls for an update. Leave ambiguous work in the
  unassigned release group. Apply the `roadmap:manual` issue label to keep
  its planning fields under manual control.
- Use issue and linked PR activity as evidence for execution status. Release
  readiness and publication are separate gates. Follow the
  [release authorization rules](./releases.md) before treating either as complete.

When editing the component catalog in [roadmap.md](../roadmap.md), change only
the row for the component you are working on.

Commits should be logical and readable. Conventional-style subjects such as
`feat:`, `fix:`, `docs:`, `test:`, and `chore:` are encouraged because they make
history scannable, but automated semantic-release behavior does not depend on
them. Do not split changes into ceremonial commits that cannot be reviewed or
reverted meaningfully.

AI-generated code is allowed and expected. The contributor remains accountable
for correctness, tests, accessibility, security, documentation, comments,
licensing, and the right to contribute the submitted material.
