# ADR 0002: Exit the foundation phase under a component gate

Identifiers updated for the GhostVue rebrand (ADR 0010).

- Status: accepted
- Date: 2026-11-11
- Decision owners: repository maintainers

## Context

`AGENTS.md` still forbids production UI components during the foundation phase.
That rule protected the project while architecture, package boundaries, tests,
and contribution standards were unset. Those foundations now exist and are
enforced by `pnpm verify`.

[PR #21](https://github.com/zprue743/slop-ui/pull/21) already records **ADR
0001** (`0001-begin-component-implementation.md`): the moratorium ends and is
replaced by the specification step in
[COMPONENT_WORKFLOW.md](../agents/COMPONENT_WORKFLOW.md). This ADR does not
reopen that decision or duplicate its alternatives. Number 0001 is reserved for
that file so the two PRs do not collide.

SLO-8 still needs work ADR 0001 left implicit:

- status copy on master still says the library exports no components
  (`README.md`, `docs/index.md`, the playground, `SECURITY.md`, release notes);
- the agent entry point still states a blanket ban rather than a gate;
- the cost of adding a component (spec, tests, docs, **machine-readable
  manifest**) is scattered across workflow, testing, documentation, and
  public-API docs instead of one checklist agents can fail closed against.

GhostVue is meant to be AI-native. A spec that only humans read is not enough
for MCP, codegen, or deterministic review. The gate has to name a manifest as
a first-class deliverable even though the component-manifest schema is not
designed here. Token emit (CSS, TS types, JSON) is ADR 0005 (SLO-36), a
different manifest.

## Decision

The foundation phase is over. Production component work is allowed when it
passes the **component gate** in
[COMPONENT_WORKFLOW.md](../agents/COMPONENT_WORKFLOW.md), which is the one
canonical list:

1. **Approved specification** based on
   [spec-template.md](../components/spec-template.md), reviewed enough to
   resolve public behavior and accessibility.
2. **Tests** for that contract: Vue/unit behavior tests, browser tests for
   observable interaction, and type tests when the exported declaration
   extends beyond custom props.
3. **Public documentation** (API reference and examples) plus a playground
   exercise of the supported patterns.
4. **Machine-readable manifest** describing the public contract for agents and
   tooling. Until a schema ADR lands, the spec's Public API section is the
   interim machine-facing contract; a component PR must add a manifest once
   the schema exists.
5. **Changeset** when a publishable package's consumer-visible behavior
   changes.

`AGENTS.md` points at that list instead of forbidding components. Status docs
describe the library as **pre-release**: tooling is in place, first components
are experimental, and it is not production-ready. That is a release claim, not
a moratorium.

Naming, registration, and layering of those components are ADR 0003
(SLO-9) and ADR 0004 (SLO-10).

Agent guardrails otherwise stay: no `any` or weakened checks, no speculative
registries, no undocumented public APIs, no mutating consumer data, no
exposing internal DOM as the ordinary customization API.

Tool adapters (`CLAUDE.md`, `.cursor/rules/*.mdc`, package `AGENTS.md`) must
keep pointing at this gate rather than restating a moratorium. After SLO-21
lands, edit `scripts/agent-adapter-catalog.mjs` and run `pnpm adapters:write`;
do not hand-edit generated adapters.

## Alternatives considered

**Keep the moratorium until Button and VisuallyHidden merge.** Rejected. The
ban and the specification workflow already contradict each other, which is
why a previous component branch was rejected on process rather than quality.
Waiting on #20/#21 would keep that contradiction on master.

**Treat ADR 0001 as sufficient and only edit status copy.** Rejected for
SLO-8. ADR 0001 names a spec gate and mentions tests, docs, and a Changeset
as cost; it does not put spec, tests, docs, and manifest in one fail-closed
list, and it does not mention manifests at all.

**Require a fully specified manifest schema in this ADR.** Rejected as scope.
The AI-native contract needs a named gate now; inventing JSON shape, MCP
resources, and codegen mapping here would mix this decision with later
tooling ADRs.

## Consequences

- Agents read `AGENTS.md` → component gate, not "do not add components."
- Reviewers ask "does this change pass the gate?" rather than "is a component
  allowed?"
- #20 and #21 still have to satisfy the gate. They also have to adopt `Ghost`
  names and the headless/themed split in ADR 0003/0004 when they rebase.
  Their playground replacements will conflict with the copy-only playground
  edit in this PR; keep the later component examples.
- A follow-up must define the component-manifest schema and MCP publication
  path. Until then, specs must be complete enough to generate that manifest
  without inventing API.

## Compatibility implications

No public package API changes. No Changeset. Ending the moratorium does not
ship a component and does not start compatibility clocks; each component
export remains additive and needs its own Changeset. No SSR, browser, or
accessibility impact.
