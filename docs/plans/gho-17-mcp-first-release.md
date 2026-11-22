# GHO-17: `@ghostvue/mcp` first-release contract (spec)

**Status:** draft (Zac approval required for ADR 0014, dependency adoption, and implementation start)  
**Linear:** GHO-17  
**Approved direction (Zac, 2026-11-17, option A):** Local, read-only stdio MCP server with five discovery tools. Version-matched offline bundles of manifests, examples, docs, and tokens. No Vue runtime in the tooling package. HTTP transport (GHO-205), `validate_usage` (GHO-206), arbitrary file access, code execution, HTTP hosting, and npm publication of the server as a network service are **out of scope** for this release.

**Related:** [ADR 0014](../adr/0014-mcp-server-first-release.md), [package boundaries](../architecture/package-boundaries.md), [component manifests](../architecture/component-manifest.md), [ADR 0006](../adr/0006-component-manifest-schema.md), [tokens](../architecture/tokens.md), [executable examples](../contributing/examples.md).

## 1. Purpose and non-goals

**Purpose.** Give IDE and agent clients a stable, offline-capable way to discover GhostVue components, read manifests, fetch executable examples, search published docs prose, and read the resolved design-token catalog—without cloning the monorepo or loading Vue.

**Non-goals (explicit exclusions).**

| Exclusion                                              | Notes                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| HTTP/SSE MCP transport                                 | Deferred to GHO-205                                                      |
| `validate_usage` (lint consumer Vue against manifests) | Deferred to GHO-206; `@ghostvue/eslint-plugin` remains the human CI path |
| Read arbitrary paths on disk                           | Tools expose only pre-bundled assets keyed by stable ids                 |
| Execute example SFCs or consumer code                  | `get_examples` returns source text only                                  |
| Host or publish a network MCP endpoint                 | Distribution is npm CLI + stdio only                                     |
| Vue/runtime imports in `@ghostvue/mcp`                 | Boundary enforced in `scripts/workspace-packages.mjs`                    |

## 2. Transport and process model

- **Transport:** MCP over **stdio** ([Model Context Protocol](https://modelcontextprotocol.io/) JSON-RPC framing on stdin/stdout).
- **Mutability:** All tools are **read-only**; no prompts/resources that write disk or call network except what the MCP host already does.
- **Invocation:** Consumer runs e.g. `npx @ghostvue/mcp` (exact bin name TBD in implementation); the server process loads bundled assets from its package directory only.
- **Capabilities:** `tools` only for v1 (no `resources` / `prompts` unless a later issue adds curated prompts without expanding scope).

## 3. Release and asset identity

### 3.1 GhostVue version stamp

Every successful tool response includes metadata:

```json
{
  "ghostvue": {
    "version": "0.x.y",
    "assetBundleId": "sha256:…",
    "manifestSchemaId": "https://unpkg.com/@ghostvue/core@1/manifest.schema.json"
  }
}
```

- `version` — semver of the published `@ghostvue/mcp` package, aligned with the monorepo release that produced the bundle (same Changeset train as `@ghostvue/vue`).
- `assetBundleId` — deterministic hash over all bundled bytes (manifests, examples, docs corpus, tokens). Implementation must document the hash algorithm and file set in `packages/mcp/README.md`.
- `manifestSchemaId` — `$id` from [ADR 0006](../adr/0006-component-manifest-schema.md); today `https://unpkg.com/@ghostvue/core@1/manifest.schema.json`.

Clients may pass optional `expectedGhostvueVersion` on any tool input; when present and mismatched, the server returns `VERSION_MISMATCH` (see §10) before doing work.

### 3.2 Component identity

| Field           | Rule                                                                                                                                                                                     | Example             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `name`          | Manifest `name`; pattern `^Ghost[A-Z]…$`                                                                                                                                                 | `GhostButton`       |
| `package`       | Manifest `package`; enum `@ghostvue/vue` \| `@ghostvue/themes`                                                                                                                           | `@ghostvue/vue`     |
| `manifestPath`  | Stable id: `packages/<dir>/manifests/<kebab>.manifest.json` relative to repo; in the bundle, `manifests/vue/ghost-button.manifest.json` or `manifests/themes/ghost-button.manifest.json` | `ghost-button` stem |
| `schemaVersion` | Per-instance manifest semver (`1.0.0`, `1.1.0`, …)                                                                                                                                       | `1.0.0`             |
| `status`        | `experimental` \| `beta` \| `stable` \| `deprecated`                                                                                                                                     | `experimental`      |

**Disambiguation.** Headless and themed wrappers can share a kebab family (`ghost-button` in both packages). `get_component` requires **`name` + `package`** when more than one manifest shares the same `name` (today uncommon). `list_components` always returns both fields.

**Grounding (2026-11-22 inventory).** `packages/vue/manifests/` — 155 manifests; `packages/themes/manifests/` — 47 manifests. Shape enforced by `schemas/component-manifest.schema.json` (duplicate in `@ghostvue/core/manifest.schema.json`).

### 3.3 Example identity

Aligned with [executable examples](../contributing/examples.md) and [`examples/registry.ts`](../../examples/registry.ts):

| Field        | Rule                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `id`         | `` `${string}/${string}` `` path under `examples/` without extension |
| `sourcePath` | `examples/<id>.vue`                                                  |
| `layer`      | `headless` \| `themed` from registry metadata                        |

Manifest `examples` arrays list ids only (e.g. `button/basic` on [`ghost-button.manifest.json`](../../packages/vue/manifests/ghost-button.manifest.json)).

### 3.4 Docs corpus identity

Search and excerpts are served from a **bundled docs corpus** produced with the same page set as `llms-full.txt` generation ([`generateLlmsDocuments`](../../apps/docs/.vitepress/generate-llms-txt.ts)): sidebar-linked markdown under `docs/`, plain-text body after VitePress transforms (example tags expanded, containers stripped). Pages omitted from [`docsSidebar`](../../apps/docs/.vitepress/docs-nav.ts) are not searchable in v1.

### 3.5 Token catalog identity

Bundled file matches `@ghostvue/themes` publish export `./tokens.json` (built to `packages/themes/dist/tokens.json` from `packages/themes/src/generated/tokens.json`). Catalog includes `schemaVersion`, `theme`, `modes`, `densities`, and resolved `tokens[]` entries with `name`, `type`, `tier`, `value` per mode, and `cssVar` ([sample structure](../../packages/themes/src/generated/tokens.json)).

## 4. Offline asset build and packaging contract

Implementation issue owns `packages/mcp/scripts/bundle-assets.mjs` (name TBD). Contract:

| Asset class      | Source (monorepo)                                                                        | Bundled path (in `@ghostvue/mcp`)       | Staleness gate                      |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------- |
| Vue manifests    | `packages/vue/manifests/*.manifest.json`                                                 | `dist/assets/manifests/vue/*.json`      | `pnpm manifests` clean              |
| Themes manifests | `packages/themes/manifests/*.manifest.json`                                              | `dist/assets/manifests/themes/*.json`   | `pnpm manifests` clean              |
| Manifest schema  | `packages/core/manifest.schema.json`                                                     | `dist/assets/manifest.schema.json`      | byte-equal to `schemas/`            |
| Example catalog  | `examples/.registries/examples-catalog.generated` + `examples/registry.ts` shape as JSON | `dist/assets/examples/catalog.json`     | `pnpm registries` clean             |
| Example sources  | `examples/**/*.vue`                                                                      | `dist/assets/examples/sources/<id>.vue` | every manifest `examples` id exists |
| Docs corpus      | Output of shared `generateLlmsDocuments`                                                 | `dist/assets/docs/pages.json`           | `pnpm docs:build` inputs            |
| Tokens           | `packages/themes/dist/tokens.json` after themes build                                    | `dist/assets/tokens.json`               | themes build + token pipeline       |

**Version matching.** `pnpm --filter @ghostvue/mcp build` runs **after** `pnpm registries:write`, `pnpm manifests`, `pnpm --filter @ghostvue/themes build`, and a docs corpus generation step. CI compares `assetBundleId` to a committed `packages/mcp/asset-bundle.lock.json` (or equivalent) so a release cannot ship with stale manifests.

**Published package contents.** Only `dist/` (server entry, bundled assets, `package.json` bin). No monorepo source paths. Consumers offline after install.

**Open:** Whether docs corpus is checked into the repo during development or generated only at package build (recommended: generate at build; lock hash only).

## 5. MCP tools — schemas

Conventions:

- Tool inputs are JSON objects validated by the server (Zod or JSON Schema derived from MCP SDK).
- Success `content` is an array of `{ type: "text", text: "<json string>" }` unless MCP host conventions change.
- Structured errors use §10.

### 5.1 `list_components`

**Description.** List component manifests with optional filters.

**Input.**

| Field                     | Type                                                 | Required | Default | Description                                                 |
| ------------------------- | ---------------------------------------------------- | -------- | ------- | ----------------------------------------------------------- |
| `package`                 | `"@ghostvue/vue"` \| `"@ghostvue/themes"` \| `"all"` | no       | `"all"` | Restrict origin package                                     |
| `status`                  | array of manifest status strings                     | no       | all     | Filter by stability                                         |
| `query`                   | string                                               | no       | —       | Case-insensitive substring match on `name` or `description` |
| `limit`                   | integer 1–500                                        | no       | 200     | Max rows returned                                           |
| `cursor`                  | string                                               | no       | —       | Opaque pagination cursor from prior response                |
| `expectedGhostvueVersion` | string                                               | no       | —       | If set, mismatch → `VERSION_MISMATCH`                       |

**Output (JSON in text content).**

```json
{
  "ghostvue": { "version": "…", "assetBundleId": "…", "manifestSchemaId": "…" },
  "items": [
    {
      "name": "GhostButton",
      "package": "@ghostvue/vue",
      "manifestPath": "manifests/vue/ghost-button.manifest.json",
      "status": "experimental",
      "schemaVersion": "1.0.0",
      "description": "…",
      "exampleIds": ["button/basic", "button/composable", "button/ref"],
      "spec": { "path": "docs/components/button-spec.md", "status": "approved" }
    }
  ],
  "nextCursor": null,
  "totalApprox": 155
}
```

`spec` omitted when absent on manifest. List entries are **summary** rows; full manifest via `get_component`.

**Errors.** `INVALID_INPUT` (bad enum, limit out of range), `VERSION_MISMATCH`.

### 5.2 `get_component`

**Description.** Return one full component manifest JSON document.

**Input.**

| Field                     | Type   | Required    | Description                                 |
| ------------------------- | ------ | ----------- | ------------------------------------------- |
| `name`                    | string | yes         | Component `name`                            |
| `package`                 | string | conditional | Required if multiple manifests share `name` |
| `expectedGhostvueVersion` | string | no          | Optional version guard                      |

**Output.** Full manifest object validated against bundled `manifest.schema.json` at serve time (Ajv 2020, same as CI). Plus `ghostvue` metadata wrapper:

```json
{
  "ghostvue": { "…": "…" },
  "manifest": { "schemaVersion": "1.0.0", "name": "GhostButton", "…": "…" }
}
```

**Errors.** `NOT_FOUND`, `AMBIGUOUS_COMPONENT` (multiple matches; response lists `candidates: [{ name, package }]`), `MANIFEST_INVALID` (bundle corruption; should never happen in release), `VERSION_MISMATCH`, `INVALID_INPUT`.

### 5.3 `get_examples`

**Description.** Return registry metadata and optional `.vue` source for executable examples.

**Input.**

| Field                     | Type                       | Required | Default | Description                                                 |
| ------------------------- | -------------------------- | -------- | ------- | ----------------------------------------------------------- |
| `id`                      | string                     | no*      | —       | Single example id (`button/basic`)                          |
| `component`               | string                     | no*      | —       | Kebab family prefix (`button` → all ids starting `button/`) |
| `layer`                   | `"headless"` \| `"themed"` | no       | all     | Filter by registry `layer`                                  |
| `includeSource`           | boolean                    | no       | `true`  | When false, metadata only                                   |
| `limit`                   | integer 1–100              | no       | 50      | Cap when listing                                            |
| `expectedGhostvueVersion` | string                     | no       | —       | Version guard                                               |

\* Exactly one of `id` or `component` must be set, or neither with `limit` only (returns first N from catalog — **open:** whether global list without filter is allowed).

**Output.**

```json
{
  "ghostvue": { "…": "…" },
  "examples": [
    {
      "id": "button/basic",
      "title": "…",
      "description": "…",
      "layer": "headless",
      "sourcePath": "examples/button/basic.vue",
      "source": "<script setup lang=\"ts\">…</template>"
    }
  ]
}
```

`source` omitted when `includeSource: false`.

**Errors.** `NOT_FOUND` (unknown `id`), `INVALID_INPUT`, `VERSION_MISMATCH`.

### 5.4 `search_docs`

**Description.** Full-text search over the bundled docs corpus (§3.4).

**Semantics (v1).**

1. Tokenize `query` on whitespace; drop tokens shorter than 2 characters.
2. For each page, score = count of token occurrences in `title` (×3 weight) + `description` (×2) + `body`.
3. Drop pages with score 0.
4. Sort by score descending, then sidebar order (section, link).
5. Return top `limit` hits with snippets: first matching window up to 280 characters with `…` ellipses.

**Input.**

| Field                     | Type         | Required | Default | Description                                                                     |
| ------------------------- | ------------ | -------- | ------- | ------------------------------------------------------------------------------- |
| `query`                   | string       | yes      | —       | Non-empty after trim                                                            |
| `limit`                   | integer 1–25 | no       | 10      | Max hits                                                                        |
| `section`                 | string       | no       | —       | Restrict to sidebar top-level section label (e.g. `Components`, `Architecture`) |
| `expectedGhostvueVersion` | string       | no       | —       | Version guard                                                                   |

**Output.**

```json
{
  "ghostvue": { "…": "…" },
  "hits": [
    {
      "title": "Button",
      "link": "/components/button",
      "section": "Components",
      "score": 12,
      "snippet": "…"
    }
  ]
}
```

**Not in v1:** fuzzy/typo tolerance, vector search, searching raw component specs excluded from sidebar, or searching generated `reference/` TypeDoc output unless those pages are added to the corpus definition.

**Errors.** `INVALID_INPUT` (empty query), `VERSION_MISMATCH`.

### 5.5 `get_tokens`

**Description.** Return entries from the bundled token JSON catalog.

**Input.**

| Field                     | Type                          | Required | Default | Description                                                        |
| ------------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------ |
| `name`                    | string                        | no*      | —       | Exact token name (`action.primary.bg`)                             |
| `prefix`                  | string                        | no*      | —       | Return all tokens whose `name` starts with `prefix.`               |
| `tier`                    | `"primitive"` \| `"semantic"` | no       | all     | Filter by manifest `tier`                                          |
| `includeValues`           | boolean                       | no       | `true`  | When false, omit `value` / resolved literals (names + cssVar only) |
| `limit`                   | integer 1–2000                | no       | 500     | Cap for prefix queries                                             |
| `expectedGhostvueVersion` | string                        | no       | —       | Version guard                                                      |

\* If both `name` and `prefix` omitted, return catalog header only (`schemaVersion`, `theme`, `modes`, `densities`, `attributes`, token count) — not full array.

**Output.**

```json
{
  "ghostvue": { "…": "…" },
  "catalog": {
    "schemaVersion": "1.0.0",
    "theme": "default",
    "modes": ["light", "dark"],
    "densities": ["compact", "comfortable", "spacious"]
  },
  "tokens": [
    {
      "name": "…",
      "type": "color",
      "tier": "semantic",
      "cssVar": "…",
      "value": { "light": "…", "dark": "…" }
    }
  ]
}
```

**Errors.** `NOT_FOUND` (unknown `name`), `INVALID_INPUT`, `VERSION_MISMATCH`.

## 6. Package boundary entry (`scripts/check-package-boundaries.mjs`)

When implementation lands, add to [`scripts/workspace-packages.mjs`](../../scripts/workspace-packages.mjs):

```javascript
{
  directory: 'mcp',
  name: '@ghostvue/mcp',
  responsibility:
    'Node-only MCP stdio server: read-only discovery over bundled manifests, examples, docs, and tokens.',
  allowedDependencies: ['@ghostvue/core'], // schema URI + optional shared validators only
},
```

Update [package-boundaries.md](../architecture/package-boundaries.md) graph (see ADR 0014):

```text
core <- mcp          (optional tooling; no reverse edges)
vue, themes -/-> mcp (no production import; assets copied at build)
```

Enforce via existing manifest checker: `@ghostvue/mcp` must not list `vue`, `@ghostvue/vue`, or `@ghostvue/themes` as dependencies. `.dependency-cruiser.mjs` should gain a rule mirroring `eslint-plugin` (no Vue in tooling package).

## 7. Dependency policy — official MCP TypeScript SDK (recommendation)

**Candidate:** `@modelcontextprotocol/sdk` (npm), MIT license, maintained by Model Context Protocol contributors.

**Evidence (npm registry, 2026-11-22, version 1.32.2).**

| Criterion           | Assessment                                                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| License             | MIT — compatible with GhostVue packages                                                                                                                                                                                            |
| Maintenance         | Active releases on npm; protocol co-evolves with Cursor/Claude hosts                                                                                                                                                               |
| API fit             | `./server` export for stdio transport; tool registration with Zod/JSON Schema                                                                                                                                                      |
| Direct runtime deps | `ajv`, `zod`, `zod-to-json-schema`, plus HTTP stack (`hono`, `express`, `cors`, …) for transports we do not ship in v1                                                                                                             |
| Overlap with repo   | `ajv` 8 already used in CI for manifests ([ADR 0006](../adr/0006-component-manifest-schema.md)); versions may differ from SDK's `^8.17.1` — acceptable if MCP package pins its own tree                                            |
| Bundle size         | Full package pulls HTTP servers; **stdio-only entry should import `@modelcontextprotocol/sdk/server` narrowly** and verify published size with `pnpm size` on `@ghostvue/mcp`                                                      |
| Security            | No install scripts; same pnpm `allowBuilds` policy; audit `pnpm audit --prod` scoped to `@ghostvue/mcp` before first publish                                                                                                       |
| Alternatives        | (1) Hand-rolled JSON-RPC — rejected: protocol drift and host compatibility risk. (2) Different language SDK — rejected: monorepo is TypeScript-first. (3) Delay until HTTP (GHO-205) — rejected: stdio is the approved first slice |

**Recommendation for Zac:** Approve adding `@modelcontextprotocol/sdk` as the **only** new runtime dependency of `@ghostvue/mcp`, with an exact version pin in implementation PR, a subsection under [dependencies.md](../standards/dependencies.md) mirroring GHO-59/November audit format, and a size budget (proposed: < 2 MB installed for server + sdk, excluding bundled GhostVue assets).

**Not approved yet:** Dependency is spec-only until ADR 0014 is accepted and implementation PR lands.

## 8. Open questions

1. **Bin name and Cursor config** — `ghostvue-mcp` vs `@ghostvue/mcp` subcommand; ship a copy-paste `mcp.json` fragment in docs?
2. **Global example listing** — Should `get_examples` without `id`/`component` list the entire catalog (could be large)?
3. **Docs corpus scope** — Include ADRs and `docs/plans/*` in search (currently many are not in sidebar)?
4. **`search_docs` ranking** — Is simple term frequency sufficient for v1, or require minimal BM25?
5. **Token payload size** — Full `tokens.json` is ~160 KiB compressed; should `get_tokens` default `includeValues: false` for prefix queries?
6. **Themed vs headless manifest pairing** — Should tools expose a `family` key linking `ghost-button` vue + themes manifests?
7. **MCP SDK HTTP deps** — Accept transitive `express`/`hono` for stdio-only, or negotiate upstream split / `exports` treeshake proof?
8. **Changeset** — First publish of `@ghostvue/mcp` is a new public package (minor/major at 0.x).

## 9. Implementation decomposition (child issues)

| Title                                         | Scope                                                                                  | Complexity |
| --------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| GHO-17a — `@ghostvue/mcp` package scaffold    | `packages/mcp`, tsconfig, bin stub, workspace catalog + boundary docs, no tools        | S          |
| GHO-17b — Offline asset bundler               | `bundle-assets.mjs`, lockfile hash, wire into `build`, CI freshness check              | M          |
| GHO-17c — Stdio server + MCP SDK              | SDK pin, server lifecycle, metadata wrapper, error envelope                            | M          |
| GHO-17d — `list_components` / `get_component` | Manifest load, pagination, Ajv validate, ambiguity rules                               | M          |
| GHO-17e — `get_examples`                      | Catalog JSON + source read, manifest cross-check tests                                 | S          |
| GHO-17f — `search_docs`                       | Reuse `generateLlmsDocuments`, index builder, ranking tests                            | M          |
| GHO-17g — `get_tokens`                        | Bundle `tokens.json`, prefix/name queries                                              | S          |
| GHO-17h — Consumer docs + host config         | `docs/tooling/mcp-server.md`, AI nav (GHO-48), example Claude/Cursor config            | S          |
| GHO-17i — Verify + publish gate               | `pnpm verify` slice, changeset, `published-exports`, optional smoke e2e invoking stdio | M          |

Complexity: **S** ≈ single focused PR; **M** ≈ multiple modules/tests.

## 10. Error envelope

All tools map failures to MCP tool errors with:

```json
{
  "code": "NOT_FOUND",
  "message": "No manifest for GhostFoo in @ghostvue/vue",
  "data": {
    "tool": "get_component",
    "ghostvueVersion": "0.x.y"
  }
}
```

| Code                  | When                                           |
| --------------------- | ---------------------------------------------- |
| `INVALID_INPUT`       | Schema validation failed on arguments          |
| `NOT_FOUND`           | Unknown component, example, or token name      |
| `AMBIGUOUS_COMPONENT` | Multiple manifests match `get_component` input |
| `VERSION_MISMATCH`    | `expectedGhostvueVersion` ≠ server version     |
| `MANIFEST_INVALID`    | Bundled JSON fails schema (release bug)        |
| `INTERNAL`            | Unexpected exception (message sanitized)       |

## 11. Decisions needing Zac's sign-off

1. Accept [ADR 0014](../adr/0014-mcp-server-first-release.md) (package boundary + stdio-first scope).
2. Accept MCP SDK dependency per §7.
3. Accept offline bundle contract (§4) including docs corpus = sidebar/`llms-full` equivalence.
4. Approve child-issue split (§9) or reprioritize GHO-205/206 relative to 17a–i.
