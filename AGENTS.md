# Agent entry point

This repository is a Vue-first, headless-first UI library built primarily with
AI assistance and reviewed by experienced engineers. During the foundation
phase, do not add production UI components.

## Read before editing

1. Read [the canonical agent guide](./docs/agents/AGENT_GUIDE.md).
2. Read [the architecture overview](./docs/architecture/overview.md) and the
   standards relevant to the subsystem being changed.
3. Inspect related code and documentation before introducing a pattern.
4. When implementing a future component, read its approved specification and
   [the component workflow](./docs/agents/COMPONENT_WORKFLOW.md) first.

Canonical rules live under `docs/`. Tool-specific files such as `CLAUDE.md` and
`.cursor/rules/*` are adapters, not competing sources of truth.

## Required workflow

1. Establish the intended behavior and package boundary.
2. Reuse an existing canonical pattern when one exists.
3. Update implementation, behavior-focused tests, public documentation, and
   change metadata together.
4. Comment non-obvious assumptions, invariants, accessibility choices,
   compatibility constraints, and tradeoffs. Comments explain intent, not
   syntax.
5. Run focused checks while working, then run `pnpm verify` before completion.
   Run `pnpm test:e2e` for browser-observable behavior.
6. Review the final diff as if reviewing another engineer's contribution.
7. Report exactly what changed and which checks ran.

## Commands

```bash
pnpm install
pnpm lint
pnpm boundaries
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm published-exports
pnpm docs:build
pnpm verify
```

## Prohibited shortcuts

- Do not use `any`, unsafe assertions, disabled checks, or weakened rules merely
  to make validation pass.
- Do not mutate consumer-owned data unless an approved public contract requires
  and documents it.
- Do not expose internal DOM structure as the ordinary customization API.
- Do not create speculative managers, registries, base components, or duplicate
  architectural patterns.
- Do not add runtime dependencies without applying the dependency policy.
- Do not treat compilation or a happy-path test as sufficient completion.
- Do not make undocumented public API changes or bypass Changesets when one is
  required.

## Packages and public APIs

Follow [package boundaries](./docs/architecture/package-boundaries.md). A new
package requires a demonstrated responsibility, documented dependency direction,
workspace configuration, build/typecheck scripts, and an update to the boundary
checker. Public exports must be deliberate; avoid nested internal barrels.

Public APIs require readable types, TSDoc, behavior tests, documentation,
compatibility analysis, and usually a Changeset. If an architecture choice is
ambiguous, search for precedent, consult the canonical docs, and surface the
tradeoff. Create an ADR only when the decision is durable and consequential.
