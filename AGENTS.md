# Agent entry point

This repository is a Vue-first, headless-first UI library built primarily with
AI assistance and reviewed by experienced engineers. The foundation phase is
over. Production components are allowed only when they pass the
[component gate](./docs/agents/COMPONENT_WORKFLOW.md) (approved spec, tests,
docs, machine-readable manifest, and a Changeset when publishable behavior
changes). See [ADR 0002](./docs/adr/0002-exit-foundation-phase.md).

## Read before editing

1. Read [the canonical agent guide](./docs/agents/AGENT_GUIDE.md).
2. Read [the architecture overview](./docs/architecture/overview.md) and the
   standards relevant to the subsystem being changed.
3. Inspect related code and documentation before introducing a pattern.
4. When implementing a component, confirm the
   [component gate](./docs/agents/COMPONENT_WORKFLOW.md) and read the approved
   specification before writing production markup.

Canonical rules live under `docs/`. Tool-specific files such as `CLAUDE.md`,
`.cursor/rules/*`, and each package `AGENTS.md` are generated adapters; edit
`scripts/agent-adapter-catalog.mjs` or `scripts/workspace-packages.mjs` and
run `pnpm adapters:write` rather than hand-editing them.

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
pnpm adapters
pnpm manifests
pnpm manifests:write
pnpm typecheck
pnpm test
pnpm contrast
pnpm test:e2e
pnpm build
pnpm published-exports
pnpm docs:build
pnpm docs:links
pnpm verify
```

## Context and token efficiency

- Search with `rg` or symbol search before opening files. Read only the line
  ranges you need.
- Never read `node_modules`, `dist`, lockfiles, or generated files to learn
  APIs. Read package source, published `.d.ts`, or `docs/architecture/` instead.
- Do not dump full test or CI logs. Prefer `pnpm test --reporter=dot` and
  `pnpm exec playwright test --reporter=dot`, or pipe through
  `rg -i 'fail|error'`.
- Use `gh pr checks` for CI status instead of fetching full logs.
- Do not paste large diffs or Playwright snapshots into context.
- Prefer `pnpm --filter @slop-ui/<package>` to scope typecheck, build, and docs.
- Scope Vitest with `pnpm test path/to/file.test.ts` (root script; packages
  have no `test` script).
- Use `packages/*/manifests/*.manifest.json` as the cheap component API map.
- Prefer `docs/` over built `llms.txt`. `pnpm docs:build` writes `/llms.txt`
  into `.vitepress/dist`, which is not for agent reading.
- Edit DTCG JSON under `packages/themes/tokens/`. Do not learn tokens from
  `packages/themes/src/generated/` or `docs/themes/tokens.md`.
- Generated outputs and `pnpm-lock.yaml` are indexing-ignored, not blocked.
  Open them only when a review or lockfile diagnosis requires it.
- Keep PR descriptions and comments concise.

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
