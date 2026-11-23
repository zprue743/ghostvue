# ADR 0015: `@ghostvue/mcp` first release (stdio, read-only discovery)

- Status: proposed
- Date: 2026-11-22
- Decision owners: Zac (product), repository maintainers

## Context

[ADR 0006](./0006-component-manifest-schema.md) and [ADR 0007](./0007-token-pipeline.md) name a future MCP server as a consumer of manifests, examples, and token JSON. [ADR 0006](./0006-component-manifest-schema.md) rejected creating `@ghostvue/mcp` before a server existed. Linear GHO-17 and direction option A (2026-11-17) approve the first slice: **local stdio**, **read-only**, **five tools**, **offline bundles**, **no Vue runtime** in the tooling package.

Deferred work: HTTP MCP transport (GHO-205), consumer validation tooling (GHO-206).

The executable spec is [GHO-17 first-release contract](../plans/gho-17-mcp-first-release.md).

## Decision

1. Add workspace package `@ghostvue/mcp` under `packages/mcp/` when implementation starts (not in this docs-only PR).
2. **Transport:** MCP over stdio only for v1.
3. **Tools:** `list_components`, `get_component`, `get_examples`, `search_docs`, `get_tokens` — schemas and semantics per the GHO-17 contract.
4. **Data:** At build time, copy version-matched manifests (`packages/vue/manifests`, `packages/themes/manifests`), example sources + generated catalog, docs corpus/search index aligned with the VitePress sidebar (`llms-full.txt` equivalence), and `@ghostvue/themes` `tokens.json`. The server reads only those bundled files at runtime. CI rebuilds bundles for freshness; docs-only PRs do not bump a committed asset lock hash.
5. **Dependencies:** `@ghostvue/mcp` may depend on `@ghostvue/core` (manifest schema). Pin **`@modelcontextprotocol/sdk@1.32.2`**, **`zod@4.6.7`**, and **`ajv@8.20.0`** as direct runtime dependencies (approved Nov 22, 2026; record in [dependencies.md](../standards/dependencies.md) § GHO-17 when the package lands). It must **not** depend on `vue`, `@ghostvue/vue`, or `@ghostvue/themes`.
6. **Exclusions:** No arbitrary filesystem access, code execution, network hosting, or write tools.
7. **Public bin:** `ghostvue-mcp` (stdio).

Register in `scripts/workspace-packages.mjs` with `allowedDependencies: ['@ghostvue/core']` only (`@ghostvue/*` edges). The MCP npm dependencies above are external packages checked by the root boundary rules, not `allowedDependencies` entries.

## Alternatives considered

**Option B — HTTP-first MCP.** Rejected for v1 (GHO-205); higher operational and security review burden; stdio matches local IDE agents.

**Option C — Resources instead of tools.** Rejected; tool payloads match discovery queries and keep host UIs simpler for v1.

**Publish manifests-only npm package without a server.** Rejected; agents need search and examples in one process.

**Depend on `@ghostvue/vue` to read manifests.** Rejected in ADR 0006; unchanged.

## Consequences

- New package boundary documented in [package-boundaries.md](../architecture/package-boundaries.md).
- `pnpm boundaries` and dependency-cruiser must include `@ghostvue/mcp` when the package lands.
- Release train includes MCP package build + asset bundle freshness checks (no
  committed lock hash bumped by docs-only PRs).
- Consumer documentation in [docs/tooling/mcp-server.md](../tooling/mcp-server.md) (host config, bin name) and AI nav (GHO-48).

## Compatibility implications

New optional npm package; no change to Vue components, themes, or SSR. MIT runtime dependencies (`@modelcontextprotocol/sdk`, `zod`, `ajv`) approved per
GHO-17 (Nov 22, 2026). First npm publish remains gated on GHO-57; package stays
`private` until then. No accessibility impact (read-only metadata).
