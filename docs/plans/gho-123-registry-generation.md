# GHO-123: Shared registry generation from per-component metadata

**Status:** proposal (Zac approval required)  
**Goal:** Parallel component PRs commit only per-family metadata; shared barrels are produced deterministically, without merge fights on orchestrator files.

## 1. Inventory — shared files today

Evidence: `git show --stat` on **Link** (`2807bd1a`), **Select** (`3b44059e`), **ScrollArea** (`c25da3bc`), **HoverCard** (`4a994900`).

| Shared target                                                              | Touched by                    | Today                                         |
| -------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------- |
| `packages/vue/src/index.ts`, `packages/themes/src/index.ts`, `default.css` | all four                      | Hand-appended exports / imports               |
| `examples/registry.ts`, `apps/docs/.vitepress/docs-nav.ts`                 | all four                      | Hand inserts into one file each               |
| `docs/roadmap.md`, `packages/vue/src/overlay-ssr.test.ts`                  | most                          | Hand rows / imports / tests                   |
| `apps/playground/src/App.vue`                                              | Select, ScrollArea, HoverCard | Hand only (not in scaffold)                   |
| `packages/*/manifests/*.manifest.json`                                     | all four                      | **`pnpm manifests:write`** (already per-file) |

## 2. Per-family metadata (only merge surface)

**Location:** `packages/vue/registry/<slug>.registry.json` — one file per _family_ (`link`, `hover-card`, …), not per SFC. Scaffold and component PRs **add or update this file only** (plus component source). Manifests stay API-focused via existing `pnpm manifests`.

**Shape** (JSON Schema `schemas/component-family-registry.schema.json`):

```ts
interface ComponentFamilyRegistry {
  schemaVersion: '1.0.0'
  slug: string
  linearIssue?: string
  roadmap?: {
    tier: string
    order: number
    status: string
    issueUrl: string
    dependsOn?: string[]
  }
  docs: { title: string; specStatus: 'draft' | 'approved' }
  vue: { exports: RegistryExport[] }
  themes?: { cssFile: string; exports: RegistryExport[] }
  examples: GhostExampleDefinition[]
  overlaySsr?: {
    id: string
    parts: string[]
    scenario: 'closed-and-open' | 'custom'
  }
  playground?: { referenceVue?: string }
}
interface RegistryExport {
  kind: 'value' | 'type'
  name: string
  module: string
  group: 'component' | 'composable' | 'primitive'
}
```

**`link.registry.json` (leaf):** `vue.exports` lists `GhostLink`, `useGhostLink`, types; `themes` lists CSS file + themed exports; `examples` lists `link/basic`, ….

**`hover-card.registry.json` (overlay):** multiple `vue.exports` for root/trigger/content; `overlaySsr: { scenario: 'closed-and-open', parts: [...] }`; optional `playground.referenceVue`.

## 3. Generator and conflict-free orchestrators

**Commands:** `pnpm registries` (check, in `pnpm verify`) and `pnpm registries:write`.

**Wrong assumption (rejected):** Sorted “one line per family” orchestrators that are **committed** are _not_ conflict-free. Git merges on insertion context: families that sort adjacent (`link` + `list`, or two names that both land at the end) edit the **same hunk** in `index.ts`, `examples/registry.ts`, and a single `docs-nav.generated.ts`. A committed monolithic nav file has the same problem; “rare conflicts” fails GHO-123.

**Option (a) — generated orchestrators, not in git (recommended)**

| Committed                                   | Generated (gitignored, deterministic)                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/vue/registry/*.registry.json`     | `packages/*/src/.registries/**` (full `index.ts`, theme barrel, `default.css` import block, example bundles + `examples/registry.ts`) |
| Hand `docs-nav.ts` (non-component sections) | `docs-nav.component-items.generated.ts` (imported by hand nav)                                                                        |
| Hand `docs/roadmap.md` prose                | `docs/roadmap.generated.md` fragment                                                                                                  |
| Hand `overlay-ssr.test.ts` harness          | `overlay-ssr.fixtures.generated.ts`                                                                                                   |

- **Pre-step:** `pnpm registries:write` before Vitest, Vite/VitePress, `vue-tsc`, and `packages/*/build`. Root `package.json` wires this into `verify`, `test`, `typecheck`, `docs:build`, and package `prebuild` scripts (same pattern as token generation today).
- **Staleness:** `pnpm registries` recomputes from all `*.registry.json` and byte-compares to on-disk generated output; fails with “run `pnpm registries:write`” if missing or stale (verify runs write or requires it immediately before check — same effective gate as committed manifests).
- **Published `@ghostvue/vue` / `@ghostvue/themes`:** package `build` always runs `registries:write` first, then `vite build` + `vue-tsc` on the **generated** `index.ts`. **Byte identity** of `dist` is validated by existing `published-exports`, `exports:check`, publint/attw against pre-migration checksums — not by treating repo `index.ts` as the publish source.
- **Why conflict-free:** Branch A adds `list.registry.json`; branch B adds `link.registry.json`. Merge touches **disjoint paths** only; `git merge` exits 0 in either order. Combined metadata deterministically yields one nav and one barrel — no orchestrator file in the merge.

**Option (b) — committed orchestrators + `merge=union`**

`.gitattributes`: one line per family, no shared trailing-comma array, `merge=union` on orchestrator paths. After every merge, `pnpm registries` in verify re-sorts, dedupes, and normalizes so union junk cannot land on `master`. **Still committed** — union hides conflict markers but relies on git attributes and post-merge normalization; adjacent slug inserts are exactly the case union is meant for, yet duplicate/malformed lines are possible until CI runs.

**Recommendation: (a).** Trade-offs:

|                   | (a) Gitignored orchestrators                                      | (b) `merge=union` committed            |
| ----------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Parallel PR merge | Only JSON paths overlap                                           | Union + verify normalize               |
| IDE / fresh clone | Need `pnpm registries:write` (document; optional `prepare` hook)  | Editors see full `index.ts` in git     |
| Typecheck         | Points at generated barrels under `.registries/`                  | Standard paths                         |
| Publishing        | Dist built from generator output; byte-stable if sort rules fixed | Same if generator is source of truth   |
| Risk              | Forgotten local regen                                             | Bad union merge without running verify |

`import.meta.glob` for barrels is **not** recommended: export order and conditional `type` exports must match today’s public surface; glob order is not a stable publish contract without the same generator anyway.

**Determinism:** sort families by `slug`; exports by `(group, name)`; Prettier with repo config; stable JSON key order.

## 4. Roadmap and overlay SSR

**Roadmap:** Hand narrative stays in `docs/roadmap.md`; **status table** and **export inventory paragraph** come from generated `roadmap.generated.md` (included via marked region). Status lives in `roadmap` on each registry JSON.

**Overlay SSR:** Thin committed `overlay-ssr.test.ts` imports `overlay-ssr.fixtures.generated.ts`; overlay families declare `overlaySsr` in metadata (`closed-and-open` template for Select/HoverCard/Dialog).

## 5. Migration, scaffold, verification

**Migration (one PR):** schema + generator; extract all `*.registry.json` from current barrels; gitignore orchestrators; add pre-steps; `registries:write` + prove `dist` byte-identical to snapshots.

**Scaffold / AGENTS.md:** create registry JSON stub only; never hand-edit gitignored paths.

**Merge proof (required):** On throwaway branches from `master`, add synthetic families **`ghost-list`** and **`ghost-link`** (adjacent sort keys) with nav + example metadata. Merge A→B and B→A; assert `git merge` exit 0 with **no conflicted orchestrator paths in git** (orchestrators absent from git under (a)). Run `pnpm registries:write` and `pnpm registries`; both orders produce identical bytes.

Also: `tests/integration/component-registries.test.ts`; updated `new-component` test; full `pnpm verify`.

**Estimated diff:** ~2.8k lines removed from hand barrels; ~45 registry JSON files; generator ~600–900 lines; gitignore + script wiring.

**New dependency:** none. **Public API change:** none intended.

## 6. Decisions for Zac

1. **Registry JSON separate from manifests** (wiring vs API) — recommended yes.
2. **Conflict strategy:** **(a) gitignored orchestrators** vs **(b) committed + `merge=union`** — recommended **(a)**.
3. **`prepare` / postinstall `registries:write`** vs document-only for local IDE — trade speed vs friction.
4. **Roadmap:** partial generated include vs full generate — recommended partial.
5. **Playground:** manual for now vs future registry field — recommended manual.
6. **Primitive exports** in a committed `registry/primitives.registry.json` vs hand header file — needed so families never edit shared primitive blocks.
