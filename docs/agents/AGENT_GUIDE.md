# Canonical agent guide

This is the source of truth for coding agents regardless of model, IDE, or
vendor. The repository-root `AGENTS.md` provides the short entry checklist and
links here for canonical detail.

## Default workflow

1. Read the root `AGENTS.md` and relevant canonical documentation.
2. Inspect existing related code, tests, exports, and docs before proposing a
   pattern.
3. Confirm the package boundary and public API impact.
4. For component work, satisfy the
   [component gate](./COMPONENT_WORKFLOW.md) (approved spec, tests, docs,
   manifest) before treating the change as complete. Do not start production
   markup before the specification resolves behavior and accessibility.
5. Reuse existing utilities and capabilities when their responsibility matches.
6. Add behavior-focused tests with the implementation. Include regression tests
   for bug fixes whenever practical.
7. Document public behavior and add intent-focused comments where reasoning is
   not obvious.
8. Run targeted lint, types, and tests during development.
9. Run the full applicable verification suite before completion.
10. Review the diff for unnecessary abstraction, duplication, API inconsistency,
    missing comments, missing tests, accessibility issues, reactivity mistakes,
    cleanup leaks, SSR concerns, and accidental public changes.
11. Summarize the change and exact validation performed.

## Completion standard

AI-generated code is expected, but it receives no exemption from correctness,
test coverage, accessibility, maintainability, licensing, documentation,
security, comments, or architectural consistency. A successful compile and one
happy-path test do not establish completion.

Agents must look actively for edge cases, API inconsistencies, duplicate
capabilities, consumer-data mutation, deep reactive work, event/listener cleanup,
SSR assumptions, keyboard failures, and backwards-compatibility impact.

## Resolving ambiguity

Search the repository for the existing pattern first. Prefer that pattern over a
model or tool's personal preference. If the existing pattern is flawed, propose
an intentional improvement to the canonical approach instead of introducing a
quiet competitor. Use an ADR for a durable decision with meaningful alternatives
and consequences; do not use ADRs for local implementation details.

Ask for human review when a choice would materially alter public APIs, package
boundaries, compatibility policy, accessibility semantics, security posture, or
release behavior.

## Canonical references

- [Architecture rules](./ARCHITECTURE_RULES.md)
- [Testing rules](./TESTING_RULES.md)
- [Component workflow](./COMPONENT_WORKFLOW.md)
- [Commenting standard](../standards/commenting.md)
- [Public API standard](../standards/public-api.md)
- [Contribution workflow](../contributing/workflow.md)

## Tool adapters

`CLAUDE.md`, `.cursor/rules/*.mdc`, and each package `AGENTS.md` are adapters.
They must remain thin pointers into `docs/` and the root `AGENTS.md` rather than
copying those rules. Edit `scripts/agent-adapter-catalog.mjs` or
`scripts/workspace-packages.mjs`, then run `pnpm adapters:write` to regenerate
them. `pnpm adapters` is part of `pnpm verify` and fails when an adapter drifts
from that catalog.
