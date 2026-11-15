# GHO-123: Shared registry generation from per-component metadata

**Status:** proposal (Zac approval required before implementation)  
**Goal:** Parallel component PRs stop editing the same shared barrels; each PR adds one committed metadata file (and component source), then runs `pnpm registries:write`.

## 1. Inventory — shared files today

Evidence: `git show --stat` on merged PRs **Link** (`2807bd1a`), **Select** (`3b44059e`), **ScrollArea** (`c25da3bc`), **HoverCard** (`4a994900`).

| Shared target | Touched by | Today | Conflict shape |
| --- | --- | --- | --- |
| `packages/vue/src/index.ts` | all four | Hand-appended export blocks (~635 lines total) | Same file tail; overlapping import regions |
| `packages/themes/src/index.ts` | all four | Hand-appended themed exports | Same |
| `packages/themes/src/default.css` | all four | Hand `@import './ghost-*.css'` | Adjacent import lines |
| `examples/registry.ts` | all four | Hand object literals in one array (~1000 lines) | Same closing anchor |
| `apps/docs/.vitepress/docs-nav.ts` | all four | Two hand sidebar inserts (Components + Contributing) | Same `items: [` anchors |
| `docs/roadmap.md` | all four | Hand tier row + occasional export paragraph refresh ([GHO-114](https://github.com/zprue743/ghostvue/pull/113)) | Table row + prose list |
| `packages/vue/src/overlay-ssr.test.ts` | Select, HoverCard | Hand imports + per-widget SSR `it` blocks | Top import block + middle of file |
| `apps/playground/src/App.vue` | Select, ScrollArea, HoverCard | Hand demo wiring (reference import or inline section) | Ad hoc; **not** in scaffold |
| `packages/*/manifests/*.manifest.json` | all four | **`pnpm manifests:write`** from `Ghost*.vue` | Per-file; already low conflict |
| Scaffold (`scripts/lib/new-component.js`) | n/a | Appends to six targets above; no roadmap / overlay / playground | Same as manual PR |

**Derived today:** manifests (vue-component-meta), adapter catalog (similar staleness check).  
**Hand-written today:** everything in the table except manifests.

## 2. Per-family metadata (source of truth)

**Location:** one committed file per *family* (not per SFC):

`packages/vue/registry/<slug>.registry.json`

Families align with docs slugs (`link`, `hover-card`, `select`). Subcomponents (`GhostSelectTrigger`, …) are listed in the family file, not separate registry files. The file is **hand-authored** when a component is added (scaffold creates a minimal stub); manifests remain generated separately for API prose.

**TypeScript shape** (JSON Schema `schemas/component-family-registry.schema.json`, validated in check mode):

```ts
interface ComponentFamilyRegistry {
  schemaVersion: '1.0.0'
  slug: string // kebab, matches docs + examples dir
  linearIssue?: string // e.g. GHO-98
  roadmap?: {
    tier: 'shared' | 'tier-1' | 'tier-2' | 'tier-3'
    order: number
    status: 'merged' | 'in-progress' | 'planned'
    issueUrl: string
    dependsOn?: string[] // other Ghost* names, prose for humans
  }
  docs: {
    title: string // GhostLink
    specStatus: 'draft' | 'approved'
  }
  vue: {
    exports: RegistryExport[] // symbols + stable sort key
  }
  themes?: {
    cssFile: string // ghost-link.css under packages/themes/src
    exports: RegistryExport[]
  }
  examples: GhostExampleDefinition[] // same ids as examples/*.vue
  overlaySsr?: OverlaySsrFixture // absent for non-overlays
  playground?: { referenceVue?: string } // optional; stays sparse
}

interface RegistryExport {
  kind: 'value' | 'type'
  name: string
  module: string // relative path from package src, e.g. ./GhostLink.vue
  group: 'component' | 'composable' | 'primitive' // controls barrel section
}

interface OverlaySsrFixture {
  id: string // stable test name slug
  parts: string[] // Ghost* SFC names to import
  scenario: 'closed-and-open' | 'custom'
  customModule?: string // when scenario === custom, path to fixture data
}
```

**Example — `packages/vue/registry/link.registry.json` (simple leaf):**

```json
{
  "schemaVersion": "1.0.0",
  "slug": "link",
  "linearIssue": "GHO-98",
  "roadmap": {
    "tier": "tier-2",
    "order": 14,
    "status": "merged",
    "issueUrl": "https://linear.app/ghost-vue/issue/GHO-98"
  },
  "docs": { "title": "GhostLink", "specStatus": "approved" },
  "vue": {
    "exports": [
      { "kind": "value", "name": "GhostLink", "module": "./GhostLink.vue", "group": "component" },
      { "kind": "value", "name": "useGhostLink", "module": "./use-ghost-link", "group": "composable" },
      { "kind": "type", "name": "GhostLinkExposed", "module": "./ghost-link", "group": "component" },
      { "kind": "type", "name": "GhostLinkRootProps", "module": "./use-ghost-link", "group": "composable" }
    ]
  },
  "themes": {
    "cssFile": "ghost-link.css",
    "exports": [
      { "kind": "value", "name": "GhostLink", "module": "./ghost-link", "group": "component" },
      { "kind": "type", "name": "GhostLinkExposed", "module": "./ghost-link", "group": "component" }
    ]
  },
  "examples": [
    { "id": "link/basic", "title": "Basic", "description": "…", "layer": "headless" }
  ]
}
```

**Example — `packages/vue/registry/hover-card.registry.json` (overlay family):**

```json
{
  "schemaVersion": "1.0.0",
  "slug": "hover-card",
  "linearIssue": "GHO-100",
  "docs": { "title": "GhostHoverCard", "specStatus": "approved" },
  "vue": {
    "exports": [
      { "kind": "value", "name": "GhostHoverCard", "module": "./GhostHoverCard.vue", "group": "component" },
      { "kind": "value", "name": "GhostHoverCardContent", "module": "./GhostHoverCardContent.vue", "group": "component" },
      { "kind": "value", "name": "GhostHoverCardTrigger", "module": "./GhostHoverCardTrigger.vue", "group": "component" }
    ]
  },
  "themes": {
    "cssFile": "ghost-hover-card.css",
    "exports": [ "…" ]
  },
  "examples": [ "…" ],
  "overlaySsr": {
    "id": "hover-card",
    "parts": ["GhostHoverCard", "GhostHoverCardContent", "GhostHoverCardTrigger"],
    "scenario": "closed-and-open"
  },
  "playground": { "referenceVue": "HoverCardReference.vue" }
}
```

## 3. Generator design

**Scripts:** extend `scripts/write-component-manifests.mjs` pattern → new `scripts/write-component-registries.mjs` + `scripts/lib/component-registries.js`.

**Commands:** `pnpm registries` (check, wired into `pnpm verify` after `pnpm manifests`) and `pnpm registries:write`.

**Generated outputs (committed, like manifests):**

| Output | Strategy | Merge-friendly why |
| --- | --- | --- |
| `packages/vue/src/registry/bundles/<slug>.ts` | One **new file per family** from metadata | Disjoint paths per PR |
| `packages/vue/src/index.ts` | Thin orchestrator: fixed primitive block + sorted `export … from './registry/bundles/<slug>'` | One new sorted line per family |
| Same pattern for `packages/themes/src/` | bundles + `default.css` one sorted `@import` per line | Disjoint bundle files |
| `examples/registry/bundles/<slug>.ts` | Re-export example defs | Disjoint |
| `examples/registry.ts` | Sorted re-exports only | One import line per family |
| `apps/docs/.vitepress/docs-nav.generated.ts` | Nav slice from all `docs.title` + `slug` | Single generated file — regen is deterministic; conflicts rare if families disjoint |
| `packages/vue/src/overlay-ssr.generated.ts` | Imports + fixture table from `overlaySsr` metadata | One fixture block per overlay family |
| `docs/roadmap.generated.md` | Tier table rows from `roadmap.*` | Sorted by `tier`, `order`, `slug` |

Each generated file starts with a fixed header (`// @generated by pnpm registries:write — do not edit`).

**Determinism:** sort families by `slug`; within a family sort exports by `(group, name)`; Prettier pass with repo config; JSON manifests use stable key order via `serializeManifest`-style helper.

**Staleness (verify):** check mode reads every `*.registry.json`, recomputes outputs in memory, byte-compares to disk (same failure UX as `pnpm manifests` / `pnpm adapters`).

**Build-time vs commit:** all of the above are **committed**. Docs build and Vitest consume them directly; no runtime generator dependency.

**Conflict proof:** branches A adds `foo.registry.json` + bundle `foo.ts`; B adds `bar.*`. Merges touch disjoint bundle paths; orchestrators gain two sorted lines in different alphabetical positions — Git merges cleanly in either order. Integration test in implementation PR: two throwaway branches each add a synthetic family, merge `A` then `B` and `B` then `A`, expect `pnpm registries` clean and `git merge` without conflicts on bundle paths.

## 4. Roadmap and overlay SSR

**`docs/roadmap.md`:** Keep human prose (tiers narrative, primitive table, ADR links) in the hand file. Replace the volatile **component status table** and the opening **export inventory paragraph** with:

```md
<!-- registries:begin roadmap-table -->
@include ./roadmap.generated.md
<!-- registries:end -->
```

Status moves into `roadmap` on each `*.registry.json` (no duplicate table edits in component PRs). Export paragraph is generated from the same export list that builds `index.ts` (fixes [GHO-114](https://github.com/zprue743/ghostvue/pull/113) drift permanently).

**`overlay-ssr.test.ts`:** shrink to a stable harness file importing `overlay-ssr.generated.ts` (fixture list + shared imports). Each overlay family declares `overlaySsr` in metadata; generator emits scenario tests (`closed-and-open` template covers Select/HoverCard/Dialog pattern). Custom scenarios reference a colocated `overlay-ssr/<slug>.ts` data file.

## 5. Migration (single PR after approval)

1. Add schema, generator, verify hook, and empty orchestrator shells.
2. Author `*.registry.json` for every existing family by **mechanical extraction** from current barrels (scripted, reviewed in PR).
3. `pnpm registries:write` → replace monolithic sections with bundle layout.
4. **Byte identity:** run `pnpm published-exports`, `pnpm exports:check`, publint/attw — outputs must match pre-migration snapshots (store checksums in the migration PR description).
5. Delete redundant hand-edited regions; leave only non-family exports (primitives, shared composables) in the fixed head of `packages/vue/src/index.ts`.

**Estimated diff:** ~2.8k lines removed/replaced across shared files, ~+40–55 small `registry.json` files (~30–80 lines each), ~+55 bundle shards, ~+600–900 lines generator + tests. Net similar LOC, far fewer merge hotspots.

## 6. Scaffold and agent docs

- **`pnpm new:component`:** create `packages/vue/registry/<slug>.registry.json` stub (mirror current manifest stub); stop editing `index.ts`, `examples/registry.ts`, `docs-nav.ts`, `default.css` directly — run `pnpm registries:write` instead.
- **`tests/integration/new-component.test.ts`:** assert registry stub + generated bundles; keep full `pnpm verify` in copied workspace.
- **`AGENTS.md` / `docs/contributing/new-component.md`:** document metadata file, `pnpm registries` / `registries:write`, and the rule that component PRs must not hand-edit generated paths.

## 7. Risks, verification, non-goals

| Risk | Mitigation |
| --- | --- |
| Export order is public API | Migration checksums; generator preserves extracted order within each `group` before alphabetizing new families |
| Playground inconsistency | `playground.referenceVue` optional metadata; no generator for `App.vue` until a second reference pattern appears |
| Nav single-file conflicts | Accept rare whole-file regen; primary merge surface stays per-family bundles |
| Duplication with manifests | Manifests = SFC API; registry = wiring/exports/examples/roadmap — cross-validate example ids in both checks |

**Verification plan:** `pnpm verify`; focused test `tests/integration/component-registries.test.ts` (staleness, schema, example id parity with manifests); merge-order proof branches; existing `new-component` integration test updated.

**New dependency:** none (reuse Prettier, Ajv, existing `component-manifests` utilities).

**Public API change:** none intended — published export surface stays identical; only authoring workflow changes.

## 8. Decisions for Zac

1. **Family metadata in `packages/vue/registry/*.json` vs extending manifest JSON** — proposal keeps manifests API-focused and registries wiring-focused (smaller PR diffs on manifests).
2. **Committed generated bundles vs one monolithic `index.ts` regen** — proposal: per-family bundle files (strongest merge story).
3. **`docs-nav`:** fully generated slice vs hand-maintained ordering groups — proposal: generated Components list sorted by `slug`, manual sections for non-component pages unchanged.
4. **Playground:** remain manual vs add `playground.registry.json` later — proposal: manual for now.
5. **Roadmap:** partial include of generated table vs entire `roadmap.md` generated — proposal: partial include to keep narrative hand-written.