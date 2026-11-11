# ADR 0001: Begin component implementation

- Status: accepted
- Date: 2026-08-16
- Decision owners: repository maintainers

## Context

The repository opened with a blanket rule in `AGENTS.md`: "During the foundation
phase, do not add production UI components." That rule existed because the
project had no agreed architecture, package boundaries, testing levels,
accessibility standard, or release policy. Shipping components before those
existed would have produced patterns that later work had to either copy or
undo.

Those foundations now exist and are enforced by tooling rather than by
convention alone. `docs/architecture/package-boundaries.md` is checked by
`pnpm boundaries`, the standards under `docs/standards/` are checked by
`pnpm lint` and `pnpm typecheck`, and both unit and browser test levels run in
CI. `docs/agents/COMPONENT_WORKFLOW.md` already defines a stricter and more
useful gate than a moratorium: production component work may begin only after a
written specification resolves the component's public behavior and
accessibility contract.

Component work has also been authorized through the issue tracker. Issue #1
requests `Button` and issue #2 requests `VisuallyHidden`, each with delivery
requirements that name the specification template, the target package, and the
required tests, documentation, and change metadata.

The blanket prohibition and the specification gate now contradict each other,
and the contradiction is not harmless. A previous component branch was reviewed
and rejected primarily because it added a component while the moratorium still
stood, not because of any defect in the component itself.

## Decision

The foundation-phase moratorium on production UI components ends. It is replaced
by the specification gate that `docs/agents/COMPONENT_WORKFLOW.md` already
defines: a component may be implemented once a written specification based on
`docs/components/spec-template.md` resolves its public behavior and
accessibility contract, and not before.

`AGENTS.md`, `README.md`, and `docs/index.md` are updated together so that no
document claims the library exports no components or forbids adding them. The
library remains pre-release and unsuitable for production, which is a separate
claim and stays.

## Alternatives considered

**Keep the moratorium and treat each component as an authorized exception.**
Rejected. Every component would need its own justification for violating a rule
the project no longer intends to enforce, and reviewers would keep re-litigating
the same question. A rule that is routinely excepted stops carrying information.

**Delete the moratorium without recording a decision.** Rejected. The scope of a
foundation phase is exactly the kind of durable, consequential decision that
`docs/adr/README.md` reserves an ADR for, and a silent edit to `AGENTS.md` gives
future readers no way to reconstruct why the phase ended.

**Define an explicit exit checklist for the foundation phase and adopt it later.**
Rejected as ceremony. The checklist would restate what `COMPONENT_WORKFLOW.md`
and the standards already require of every component, and the infrastructure it
would gate on is already built and enforced.

## Consequences

- Component work proceeds under the specification gate, so the first question in
  review becomes whether the specification resolved the behavior, rather than
  whether the component should exist at all.
- Every component still carries its full cost: specification, behavior-focused
  tests, public documentation, playground example, and a Changeset.
- The project takes on backwards-compatibility obligations earlier than a
  version-zero library strictly must. `docs/standards/public-api.md` governs
  those obligations, and the pre-release status in `README.md` and `SECURITY.md`
  keeps expectations calibrated.
- The first components will surface repository gaps that only real component
  work reveals. Vitest needs the Vue plugin to compile single-file components,
  and the playground needs to resolve `@slop-ui/vue` from source. Those changes
  land with the first component rather than as speculative setup.

## Compatibility implications

No public API changes from this ADR itself; it authorizes the work rather than
performing it. Each component export that follows is additive, requires its own
Changeset, and carries its own accessibility and SSR analysis. No migration is
needed, and no existing consumer behavior changes, because the library currently
exports nothing.

[ADR 0002](./0002-exit-foundation-phase.md) later recorded the fail-closed
component gate (spec, tests, docs, manifest, Changeset) that operationalizes
this decision without reopening it.
