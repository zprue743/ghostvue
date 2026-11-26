# Contribution workflow

1. Read `AGENTS.md`, this workflow, and relevant standards.
2. Inspect related code before introducing a pattern.
3. Agree on public behavior; adding or promoting a component requires the
   [component gate](../agents/COMPONENT_WORKFLOW.md) (approved spec, tests,
   docs, manifest, and a Changeset when publishable behavior changes).
4. Make the smallest coherent change with tests and documentation. Component
   usage samples belong in `examples/` ([executable examples](./examples.md)).
5. Add intent-focused comments for non-obvious reasoning.
6. Add a Changeset when a publishable package's consumer-visible behavior changes,
   or apply the `no-changeset` PR label for internal-only changes inside
   publishable packages (enforced by CI; see [releases](./releases.md)).
7. Run focused checks, then `pnpm verify`; run `pnpm test:e2e` for browser behavior.
8. Review the diff for API, accessibility, reactivity, SSR, cleanup, security,
   dependency, and licensing concerns.
9. Open a pull request using the template and report exact validation results.

## Issue tracking

GhostVue tracks engineering work in
[GitHub Issues](https://github.com/zprue743/ghostvue/issues). Linear is
retired; historical `GHO-n` keys remain valid references in older docs and
commits.

- **New work:** open a GitHub issue. Apply `priority:*` labels for priority.
- **Branches:** name the issue, for example `issue-42-fix-tooltip-focus`.
- **Pull requests:** include `Fixes #<n>` in the body so the issue closes on
  merge.
- **Legacy `GHO-n` keys:** locate the GitHub issue whose title begins with
  `GHO-n:` (for example `GHO-17: …`). Open GHO issues were migrated as
  `#306`–`#320`.

### Agent readiness

When you create or triage an open issue, apply `agent:ready` if it meets all
three conditions below.

- The issue describes the problem, intended outcome, and scope clearly enough to
  start work.
- The acceptance criteria describe how to verify the outcome.
- Any decisions, approvals, and prerequisites required for the scoped work are
  in place, and the work can start now.

If an issue is ineligible, remove `agent:ready` if present and record what needs
to change. For open issue dependencies, add `blocked` and list them in the body
as `Blocked by: #123, #456`. Reassess readiness when blockers clear and remove
`blocked` when the issue becomes eligible. Before handing off, confirm the labels
on the GitHub issue.

`agent:ready` clears the scoped work for automatic pickup. The usual review,
merge, and publication approval rules still apply.

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
