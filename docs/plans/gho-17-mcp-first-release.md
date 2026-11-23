# GHO-17: `@ghostvue/mcp` first-release contract (spec)

**Status:** contract updated (resolved decisions below; ADR 0015 and implementation still gated on package landing)  
**Linear:** GHO-17  
**Approved direction (Zac, 2026-11-17, option A):** Local, read-only stdio MCP server with five discovery tools. Version-matched offline bundles of manifests, examples, docs, and tokens. No Vue runtime in the tooling package. HTTP transport (GHO-205), `validate_usage` (GHO-206), arbitrary file access, code execution, HTTP hosting, and npm publication of the server as a network service are **out of scope** for this release.

**Related:** [ADR 0015](../adr/0015-mcp-server-first-release.md), [package boundaries](../architecture/package-boundaries.md), [component manifests](../architecture/component-manifest.md), [ADR 0006](../adr/0006-component-manifest-schema.md), [tokens](../architecture/tokens.md), [executable examples](../contributing/examples.md).

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
- **Invocation:** Consumer runs the published bin **`ghostvue-mcp`** (e.g. `npx @ghostvue/mcp` resolves the same executable). The server loads bundled assets from its package directory only.
- **Capabilities:** `tools` only for v1 (no `resources` / `prompts` unless a later issue adds curated prompts without expanding scope).

## 3. Release and asset identity

### 3.1 GhostVue version stamp

Every successful tool **`structuredContent`** object (see §5) includes
top-level **`schemaVersion`** (`1.0.0` — GhostVue MCP tool output contract, not
component-manifest `schemaVersion`) and a **`ghostvue`** stamp:

```json
{
  "schemaVersion": "1.0.0",
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

| Field           | Rule                                                                                             | Example                                    |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `name`          | Manifest `name`; pattern `^Ghost[A-Z]…$`                                                         | `GhostButton`                              |
| `package`       | Manifest `package`; enum `@ghostvue/vue` \| `@ghostvue/themes`                                   | `@ghostvue/vue`                            |
| `family`        | Manifest filename stem (no `.manifest.json`); same value in vue and themes when paired           | `ghost-button`                             |
| `manifestPath`  | Bundle path: `manifests/vue/<family>.manifest.json` or `manifests/themes/<family>.manifest.json` | `manifests/vue/ghost-button.manifest.json` |
| `schemaVersion` | Per-instance manifest semver (`1.0.0`, `1.1.0`, …)                                               | `1.0.0`                                    |
| `status`        | `experimental` \| `beta` \| `stable` \| `deprecated`                                             | `experimental`                             |

**Name overlap (grounded).** All **47** `@ghostvue/themes` manifests share a
`name` with a `@ghostvue/vue` manifest (0 themes-only names). **108** vue
manifests have no themed twin.

**Disambiguation.** `get_component` accepts optional **`package`** (default
`@ghostvue/vue`). Headless callers omit it; themed wrappers use
`package: "@ghostvue/themes"`. `list_components` and `get_component` include
**`relatedManifest`** when the paired manifest exists in the other package
(`family` + `package` + `manifestPath`).

**Grounding (2026-11-22 inventory).** `packages/vue/manifests/` — 155 manifests;
`packages/themes/manifests/` — 47 manifests. Shape enforced by
`schemas/component-manifest.schema.json` (duplicate in
`@ghostvue/core/manifest.schema.json`).

### 3.3 Example identity

Aligned with [executable examples](../contributing/examples.md) and [`examples/registry.ts`](../../examples/registry.ts):

| Field        | Rule                                                                 |
| ------------ | -------------------------------------------------------------------- |
| `id`         | `` `${string}/${string}` `` path under `examples/` without extension |
| `sourcePath` | `examples/<id>.vue`                                                  |
| `layer`      | `headless` \| `themed` from registry metadata                        |

Manifest `examples` arrays list ids only (e.g. `button/basic` on [`ghost-button.manifest.json`](../../packages/vue/manifests/ghost-button.manifest.json)).

### 3.4 Docs corpus identity

Search and excerpts are served from a **bundled docs corpus** produced with the
same page set as `llms-full.txt` generation
([`generateLlmsDocuments`](../../apps/docs/.vitepress/generate-llms-txt.ts)): **exactly**
the pages linked from [`docsSidebar`](../../apps/docs/.vitepress/docs-nav.ts)
(including individual ADR pages under **Decisions**). Plain-text body after
VitePress transforms (example tags expanded, containers stripped).
`docs/plans/*` and any other paths not in the sidebar are **not** searchable in
v1.

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

**Version matching.** `pnpm --filter @ghostvue/mcp build` runs **after**
`pnpm registries:write`, `pnpm manifests`, `pnpm --filter @ghostvue/themes
build`, and a docs corpus generation step. The docs corpus and search index are
**generated at build**; there is **no** committed asset-bundle lock hash that
docs-only PRs must bump. CI rebuilds the bundle and checks freshness /
`assetBundleId` on MCP package builds so a release cannot ship with stale
manifests.

**Published package contents.** Only `dist/` (server entry, bundled assets,
`package.json` `bin.ghostvue-mcp`). No monorepo source paths. Consumers offline
after install.

## 5. MCP tools — schemas

Conventions:

- Each tool declares **`inputSchema`** and **`outputSchema`** (JSON Schema) at registration time (derived from Zod or authored JSON Schema).
- On success, the handler returns **`structuredContent`** matching `outputSchema`. Optionally include a short `content: [{ type: "text", text: "…" }]` summary for hosts that surface text only.
- Every success payload includes top-level **`schemaVersion`: `"1.0.0"`** (GhostVue MCP tool contract).
- Tool inputs are validated with Zod (SDK) and optional server-side guards.
- Failures use §10 (MCP tool error); error `data` may include `schemaVersion`.

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

**Output (`structuredContent`).** Register `outputSchema` mirroring this shape.

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": { "version": "…", "assetBundleId": "…", "manifestSchemaId": "…" },
  "items": [
    {
      "name": "GhostButton",
      "package": "@ghostvue/vue",
      "family": "ghost-button",
      "manifestPath": "manifests/vue/ghost-button.manifest.json",
      "relatedManifest": {
        "package": "@ghostvue/themes",
        "family": "ghost-button",
        "manifestPath": "manifests/themes/ghost-button.manifest.json"
      },
      "status": "experimental",
      "manifestSchemaVersion": "1.0.0",
      "description": "…",
      "exampleIds": ["button/basic", "button/composable", "button/ref"],
      "spec": { "path": "docs/components/button-spec.md", "status": "approved" }
    }
  ],
  "nextCursor": null,
  "totalApprox": 155
}
```

`spec` and `relatedManifest` omitted when absent. `manifestSchemaVersion` is the
component manifest’s `schemaVersion` field. List entries are **summary** rows;
full manifest via `get_component`.

**Errors.** `INVALID_INPUT` (bad enum, limit out of range), `VERSION_MISMATCH`.

### 5.2 `get_component`

**Description.** Return one full component manifest JSON document.

**Input.**

| Field                     | Type                                      | Required | Default           | Description                                   |
| ------------------------- | ----------------------------------------- | -------- | ----------------- | --------------------------------------------- |
| `name`                    | string                                    | yes      | —                 | Component `name`                              |
| `package`                 | `"@ghostvue/vue"` \| `"@ghostvue/themes"` | no       | `"@ghostvue/vue"` | Manifest package (themes for styled wrappers) |
| `expectedGhostvueVersion` | string                                    | no       | —                 | Optional version guard                        |

**Output (`structuredContent`).** Full manifest validated against bundled
`manifest.schema.json` at serve time (Ajv 8.20.0 / 2020 build, same as CI):

```json
{
  "schemaVersion": "1.0.0",
  "ghostvue": { "…": "…" },
  "family": "ghost-button",
  "package": "@ghostvue/vue",
  "relatedManifest": {
    "package": "@ghostvue/themes",
    "family": "ghost-button",
    "manifestPath": "manifests/themes/ghost-button.manifest.json"
  },
  "manifest": { "schemaVersion": "1.0.0", "name": "GhostButton", "…": "…" }
}
```

`relatedManifest` omitted when no paired manifest exists in the other package.

**Errors.** `NOT_FOUND`, `MANIFEST_INVALID` (bundle corruption; should never happen
in release), `VERSION_MISMATCH`, `INVALID_INPUT`.

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
| `cursor`                  | string                     | no       | —       | Opaque pagination cursor from a prior response              |
| `expectedGhostvueVersion` | string                     | no       | —       | Version guard                                               |

\* Provide `id` or `component` to fetch matching examples (with `includeSource`
controlling source). With **neither** filter, return **metadata only** (no
`source`) for the catalog, paginated with `cursor` / `nextCursor` like
`list_components`.

**Output (`structuredContent`).**

```json
{
  "schemaVersion": "1.0.0",
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
  ],
  "nextCursor": null
}
```

`source` omitted when `includeSource: false` or when listing without `id` /
`component` (metadata-only catalog pages).

**Errors.** `NOT_FOUND` (unknown `id`), `INVALID_INPUT`, `VERSION_MISMATCH`.

### 5.4 `search_docs`

**Description.** Full-text search over the bundled docs corpus (§3.4).

**Semantics (v1).**

1. Tokenize `query` on whitespace; drop tokens shorter than 2 characters.
2. Score each sidebar corpus page with a small **in-house BM25** implementation
   (no new dependency), keeping **title ×3** and **description ×2** field
   weights relative to `body` term statistics.
3. Drop pages with score 0.
4. Sort by score descending, then **deterministic** tie-breaks (sidebar section
   order, then link path).
5. Return top `limit` hits with snippets: first matching window up to 280
   characters with `…` ellipses.

**Input.**

| Field                     | Type         | Required | Default | Description                                                                     |
| ------------------------- | ------------ | -------- | ------- | ------------------------------------------------------------------------------- |
| `query`                   | string       | yes      | —       | Non-empty after trim                                                            |
| `limit`                   | integer 1–25 | no       | 10      | Max hits                                                                        |
| `section`                 | string       | no       | —       | Restrict to sidebar top-level section label (e.g. `Components`, `Architecture`) |
| `expectedGhostvueVersion` | string       | no       | —       | Version guard                                                                   |

**Output (`structuredContent`).**

```json
{
  "schemaVersion": "1.0.0",
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
| `limit`                   | integer 1–2000                | no       | 100     | Cap for prefix queries                                             |
| `expectedGhostvueVersion` | string                        | no       | —       | Version guard                                                      |

\* If both `name` and `prefix` omitted, return catalog header only (`schemaVersion`, `theme`, `modes`, `densities`, `attributes`, token count) — not full array.

**Output (`structuredContent`).**

```json
{
  "schemaVersion": "1.0.0",
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
  allowedDependencies: ['@ghostvue/core'], // @ghostvue/* only; npm: sdk, zod, ajv per §7
},
```

Update [package-boundaries.md](../architecture/package-boundaries.md) graph (see ADR 0015): `shared <- core <- vue <- themes`; `core <- mcp` (`@ghostvue/core` only); mcp does not import vue, themes, or shared at runtime (assets copied at build).

Enforce via existing manifest checker: `@ghostvue/mcp` must not list `vue`, `@ghostvue/vue`, or `@ghostvue/themes` as dependencies. `.dependency-cruiser.mjs` should gain a rule mirroring `eslint-plugin` (no Vue in tooling package).

## 7. Dependency policy — runtime dependencies

**Approved (Zac, Nov 22, 2026)** for implementation; record adoption in
[dependencies.md](../standards/dependencies.md) § GHO-17 when the package
lands.

**Direct runtime dependencies (exact pins).**

| Package                     | Pin    | Role                                                                                            |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `@modelcontextprotocol/sdk` | 1.32.2 | Official MCP server (`./server`), stdio transport, `outputSchema` / `structuredContent`         |
| `zod`                       | 4.6.7  | Required SDK peer (`^3.25 \|\| ^4.0`; pin 4.x on new package) — tool input validation           |
| `ajv`                       | 8.20.0 | Serve-time manifest validation (`ajv/dist/2020`) against bundled schema — **declared directly** |

`@ghostvue/mcp` may also depend on `@ghostvue/core` (workspace; manifest schema JSON).

**Measured install footprint (scratch `npm i`, 2026-11-22):**

| Measurement                                                  | Bytes      | Notes                                                |
| ------------------------------------------------------------ | ---------- | ---------------------------------------------------- |
| `npm view … dist.unpackedSize` (`@modelcontextprotocol/sdk`) | 4,492,221  | SDK package alone                                    |
| `du -sb node_modules` (sdk + zod + ajv pins, 95 packages)    | 17,407,541 | ~16.6 MiB production tree including HTTP transitives |

Command (not committed): `npm i --prefix /tmp/gho17-mcp-measure-z4 @modelcontextprotocol/sdk@1.32.2 zod@4.6.7 ajv@8.20.0`.

**Size budget (excluding bundled GhostVue assets in `dist/assets/`):** published
`@ghostvue/mcp` production `node_modules` must remain **≤ 18 MiB** installed. The
2026-11-22 measurement **exceeds 16 MiB** (~16.6 MiB); the 18 MiB cap is
unchanged with ~1.4 MiB headroom. CI records `du -sb` (or
equivalent) on the package fixture after `pnpm --filter @ghostvue/mcp install
--prod`.

Transitive HTTP stack (`hono`, `express`, `cors`, …) ships with the SDK even for
stdio-only; no slimmer official package exists today. Stdio entry should still
import `@modelcontextprotocol/sdk/server` narrowly.

**Evidence table (npm, 2026-11-22).**

| Criterion    | Assessment                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| License      | MIT for sdk, zod, ajv                                                                                                        |
| Maintenance  | Active MCP SDK releases                                                                                                      |
| Security     | No install scripts on direct pins; `pnpm audit --prod` on `@ghostvue/mcp` before publish                                     |
| Alternatives | Hand-rolled JSON-RPC (rejected: protocol drift); non-TypeScript SDK (rejected); delay for HTTP (rejected: stdio is option A) |

Exact pins: `@modelcontextprotocol/sdk@1.32.2`, `zod@4.6.7`, `ajv@8.20.0`, with
production `node_modules` **≤ 18 MiB** installed (see measurement table above).

## 8. Resolved decisions

1. **M1 — Asset bundle:** Docs corpus/search index generated at build; no
   committed asset-bundle lock hash that docs PRs must bump; CI rebuilds and
   checks the bundle (§4). **Reason:** Docs work must not churn MCP locks.
   _Approved by Zac, Nov 22, 2026._
2. **M2 — `get_examples` listing:** With no `id`/`component` filter, return
   metadata only (no `source`), paginated via `cursor` / `nextCursor` like
   `list_components`; fetch source by `id` or `component`. **Reason:** Bounded
   payloads for catalog discovery. _Approved by Zac, Nov 22, 2026._
3. **M3 — `search_docs` corpus:** Exactly the docs sidebar; individual ADR pages
   added under **Decisions** in `docs-nav.ts`; `docs/plans/*` excluded. **Reason:**
   Search matches published nav. _Approved by Zac, Nov 22, 2026._
4. **M4 — Ranking:** Small in-house BM25 (no new dependency), title ×3 and
   description ×2 weights, deterministic tie-breaks. **Reason:** Better recall
   without new deps. _Approved by Zac, Nov 22, 2026._
5. **M5 — `get_tokens`:** `includeValues` default stays `true`; prefix-query
   `limit` default **100** (was 500). Full bundled `tokens.json` is **161,451
   bytes** uncompressed with **482** token entries (measured from
   `packages/themes/src/generated/tokens.json` in-repo). **Reason:** Accurate size
   expectations with a tighter default page size. _Approved by Zac, Nov 22, 2026._
6. **M6 — Release train:** Package stays `"private": true` until publish is
   authorized; first release via minor Changeset to **0.1.0** alongside other
   packages; add to release-pipeline invariants test and dry-run when implemented
   ([GHO-232](https://linear.app/ghost-vue/issue/GHO-232)); npm publish requires
   Zac's separate authorization ([GHO-57](https://linear.app/ghost-vue/issue/GHO-57)).
   **Reason:** Matches monorepo release discipline. _Approved by Zac, Nov 22, 2026._

**Q5 — SDK HTTP transitives:** Accept `@modelcontextprotocol/sdk@1.32.2`
with pinned `zod@4.6.7` and `ajv@8.20.0` under the **18 MiB** cap (stdio-only;
HTTP stack ships transitively). _Approved by Zac, Nov 22, 2026._

## 9. Implementation decomposition (proposed child issues)

File Linear issues before implementation; titles below are placeholders until
real GHO ids are assigned.

| Proposed title                      | Scope                                                                                                                                                                                                                                                                                          | Complexity |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `@ghostvue/mcp` package scaffold    | `packages/mcp`, `ghostvue-mcp` bin stub, workspace catalog, boundary docs, no tools                                                                                                                                                                                                            | S          |
| Offline asset bundler               | `bundle-assets.mjs`, build-time corpus/index, CI rebuild + freshness checks (no docs PR lock bump)                                                                                                                                                                                             | M          |
| Stdio server + MCP SDK pins         | sdk/zod/ajv pins, server lifecycle, `structuredContent` + `outputSchema`, error envelope                                                                                                                                                                                                       | M          |
| `list_components` / `get_component` | Manifest load, family + `relatedManifest`, pagination, Ajv validate, default package                                                                                                                                                                                                           | M          |
| `get_examples`                      | Catalog JSON + source read, manifest cross-check tests                                                                                                                                                                                                                                         | S          |
| `search_docs`                       | Reuse `generateLlmsDocuments`, index builder, ranking tests                                                                                                                                                                                                                                    | M          |
| `get_tokens`                        | Bundle `tokens.json`, prefix/name queries                                                                                                                                                                                                                                                      | S          |
| Verify + publish gate               | `pnpm verify` slice, minor Changeset to 0.1.0 on release train, release-pipeline invariants + dry-run ([GHO-232](https://linear.app/ghost-vue/issue/GHO-232)), `published-exports`, installed-size gate, stdio smoke; npm publish gated on [GHO-57](https://linear.app/ghost-vue/issue/GHO-57) | M          |

Consumer docs and host config live in [mcp-server.md](../tooling/mcp-server.md)
(landed in this spec PR). Complexity: **S** ≈ one focused PR; **M** ≈ several modules/tests.

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

| Code               | When                                       |
| ------------------ | ------------------------------------------ |
| `INVALID_INPUT`    | Schema validation failed on arguments      |
| `NOT_FOUND`        | Unknown component, example, or token name  |
| `VERSION_MISMATCH` | `expectedGhostvueVersion` ≠ server version |
| `MANIFEST_INVALID` | Bundled JSON fails schema (release bug)    |
| `INTERNAL`         | Unexpected exception (message sanitized)   |

## 11. Remaining maintainer gates

Contract questions **Q1–Q6** in §8 are resolved (Nov 22, 2026). Before
implementation merges:

1. Accept [ADR 0015](../adr/0015-mcp-server-first-release.md) status promotion
   (package boundary + stdio-first scope).
2. Land `packages/mcp` on the release train per **M6** (`private` until publish
   authorization).
3. Reprioritize GHO-205 / GHO-206 relative to implementation if scope shifts.
