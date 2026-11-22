# ADR 0014: DataTable phase-one architecture

- Status: proposed
- Date: 2026-11-22
- Decision owners: repository maintainers (Zac sign-off required)
- Relates to: [GHO-35](https://linear.app/ghost-vue/issue/GHO-35),
  [ADR 0003](./0003-public-component-api-conventions.md) (naming),
  [ADR 0004](./0004-headless-styled-layering.md) (headless layering),
  [GhostTable spec](../components/table-spec.md),
  [component-state.md](../architecture/component-state.md),
  [performance.md](../standards/performance.md),
  [philosophy.md](../philosophy.md)

## Context

DataTable ([GHO-35](https://linear.app/ghost-vue/issue/GHO-35)) is the north
star of the original component catalog. Prerequisites on `master` now include
`GhostTable`, overlays, inputs, pagination, selection primitives, and loading
shells ([roadmap.md](../roadmap.md)). The epic needs a durable architecture
decision before implementation passes the [component gate](../agents/COMPONENT_WORKFLOW.md).

Forces:

1. **Vue-first ergonomics** — consumers should compose familiar Vue patterns, not
   adopt a second framework inside Vue.
2. **Headless-first layering (ADR 0004)** — data processing and interaction
   state belong in `@ghostvue/vue`; themed table chrome stays in
   `@ghostvue/themes`.
3. **Consumer data ownership** — row objects, fetching, caching, and mutation
   policy stay with the application ([philosophy.md](../philosophy.md)).
4. **Native table semantics first** — static and interactive tabular content
   should remain real `<table>` markup with header `scope`, `aria-sort`, and
   checkbox row selection via existing primitives. Spreadsheet `role="grid"`
   navigation is a different product surface.
5. **Evidence before abstraction** — no speculative table engine, manager
   registry, or shared virtualization layer until a concrete boundary proves
   independence ([performance.md](../standards/performance.md)).
6. **Scale expectation** — phase one must process on the order of **10k rows**
   in memory while rendering **only the current page** to the DOM (not 10k `<tr>`
   nodes). Virtualization is explicitly deferred.

On 2026-11-17, Zac approved **option A**: a Vue-first composable plus native
`GhostTable` composition, typed column accessors, and stable row IDs.

## Decision

### 1. Public surface (phase one)

| Export                                                 | Package            | Role                                                                                                                           |
| ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `GhostDataTable`                                       | `@ghostvue/vue`    | Headless renderless root that wires state, ARIA on the table shell, and slot props for consumers composing `GhostTable*` parts |
| `useGhostDataTable`                                    | `@ghostvue/vue`    | Primary Vue composable; owns sort/filter/page/selection/expansion state and derived row models                                 |
| `useGhostDataTableServerRequest`                       | `@ghostvue/vue`    | Optional stale-response guard for **consumer-owned** server fetches (same contract shape as `useGhostComboboxAsyncSearch`)     |
| Typed helpers (`getDataTableRowId`, column/sort types) | `@ghostvue/vue`    | Pure utilities colocated until a boundary justifies extraction                                                                 |
| Themed `GhostDataTable`                                | `@ghostvue/themes` | Opinionated composition of primitives + default sort/selection chrome (phase-one themed child issue)                           |

There is **no** `@ghostvue/data-table` package, **no** global table manager, and
**no** mandatory render-prop engine. If pure processing later merits a
framework-neutral module, extraction happens only when two consumers need it and
tests prove the split — not in phase one.

### 2. Composition model

- **Markup:** consumers render `GhostTable`, `GhostTableHead`, `GhostTableBody`,
  `GhostTableRow`, `GhostTableHeaderCell`, and `GhostTableCell` (or themed
  equivalents) using slot props / scoped data from `useGhostDataTable`.
- **Roles:** the data table root sets `aria-sort` on sortable `<th>` hosts,
  wires select-all and row `GhostCheckbox` instances, and exposes loading/empty
  regions. It does **not** replace cells with `role="gridcell"` or add roving
  `tabindex` on rows.
- **Keyboard:** sort and selection use **native control tab order** (buttons and
  checkboxes). Arrow-key row/column navigation is **out of scope** for phase one
  and belongs to a deferred treegrid/grid-navigation spec.

### 3. Consumer data and column model

- Row type `TData` is consumer-defined. The library never clones the full
  `data` array.
- Each row has a stable **`RowId`** (`string | number`) from required
  `getRowId(row, index)` (fallback index only when documented and when ids are
  truly unavailable — see open questions in the component spec).
- Columns are `DataTableColumnDef<TData>` with **`id`**, optional `accessorKey`
  or `accessorFn`, and optional `cell` render hook. Accessors are typed against
  `TData`; nested paths use `accessorFn`, not stringly-typed magic paths in v1.
- Column definitions are **consumer-owned configuration**; the composable reads
  them per render and does not mutate column objects.

### 4. Local vs server processing

Explicit boolean flags (names in the component spec) declare which steps run
inside the composable vs which are **manual** (consumer computed):

| Concern    | Local (default)                                          | Server / manual                                                                                    |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Sorting    | Composable orders `data` with column `sortFn` or default | Consumer passes pre-sorted `data`; composable emits `onSortingChange`                              |
| Filtering  | Composable filters rows (global + per-column)            | Consumer passes filtered `data`; composable emits `onColumnFiltersChange` / `onGlobalFilterChange` |
| Pagination | Composable slices rows                                   | Consumer passes one page of rows + `rowCount`; composable emits `onPaginationChange`               |
| Row count  | `data.length` after local pipeline                       | Required `rowCount` when any manual flag is true                                                   |

Server mode is always **consumer-controlled**: the composable increments a
monotonic `requestId` on processing inputs that should trigger a fetch,
emits it on a `stateChange` (or per-dimension) event, and documents
`useGhostDataTableServerRequest` for applying responses. The composable never
calls `fetch`.

### 5. State ownership and reset rules

- Sort, filter, pagination, selection, and expansion use
  `useControllableState` where exposed as v-models ([component-state.md](../architecture/component-state.md)).
- **Pagination resets to page 1** when: global filter changes, any column
  filter changes, page size changes, or `data` reference changes while not in a
  manual-pagination-only workflow (exact matrix in the component spec).
- **Selection and expansion** key by `RowId`, not row index. Reorder, insert,
  filter, and page changes preserve selection for ids still present; ids
  absent from the current `data` remain selected until the consumer clears them
  (global scope) or are dropped from page scope per spec rules.
- **Sort direction** cycles: none → asc → desc → none for tri-state columns unless
  `enableMultiSort` and consumer opts into multi-column sort state.

### 6. Selection scope

Phase one supports **`selectionScope: 'page' | 'all'`** (default `'page'`):

- **Page:** `selectedRowIds` affects only visible rows; select-all toggles the
  current page; header checkbox uses `aria-checked="mixed"` when partial.
- **All:** select-all means all rows matching the **current filter pipeline**
  (local or consumer-provided), not merely the current page; row ids outside
  the current page stay selected.

### 7. Expansion

- `expandedRowIds` is a set of `RowId` values (controlled or uncontrolled).
- Expansion content renders in an additional row (full-width `td` with
  `colspan`) **below** the data row, preserving native table structure.
- Multiple expanded rows allowed unless `allowMultipleExpanded: false`.

### 8. Performance and benchmarks

- Processing (sort + filter + slice for display) on **10k rows** must stay
  within **proposed** budgets documented in the component spec (pending Zac
  approval): wall-clock thresholds on a pinned Vitest bench fixture and a cap
  on extra heap retained by the composable beyond the consumer `data` array.
- Rendering must mount **at most** `pageSize` data rows (plus header/footer and
  expansion rows) — never 10k `<tr>` elements.
- Virtualization and sticky/frozen columns are **not** part of this ADR.

### 9. Accessibility

- Sortable columns expose a **native `<button type="button">`** in the header cell
  (default slot or primitive) with `aria-sort` on the `<th>` (`ascending`,
  `descending`, or omitted when unsorted).
- Selection uses `GhostCheckbox` with explicit `aria-label` patterns for row and
  select-all controls.
- Processing updates use `aria-busy` on the table region when `loading` is true
  (consumer-owned flag); result counts are not blindly live-region announced on
  every keystroke (filter debouncing is consumer-owned).

## Alternatives considered

### Option B — Spreadsheet-first `role="grid"` / treegrid

Rejected for phase one. Delivers Excel-like keyboard navigation but fights native
table semantics, duplicates work with future Tree treegrid, and diverges from the
approved native-table direction.

### Option C — TanStack Table adapter as the public API

Rejected. Strong ecosystem but centers a non-Vue state model, encourages row
record shapes the philosophy rejects, and hides Vue composition behind an
adapter whose upgrades become a public compatibility surface.

### Option D — Monolithic `GhostDataTable` SFC that owns all markup

Rejected as the only API. Useful for quick starts as an optional themed bundle,
but the headless contract must remain composable `GhostTable` parts for
custom layouts and incremental adoption.

### Option E — Immediate shared virtualization primitive

Deferred. No phase-one consumer requires virtual rows when pagination is the
default; premature extraction risks another slightly different virtualizer ([philosophy.md](../philosophy.md)).

## Consequences

**Benefits**

- Aligns with existing `GhostTable`, `GhostPagination`, and `GhostCheckbox`
  boundaries.
- Keeps server integrations explicit and testable.
- Preserves consumer object identity and conventional row types.
- Clear deferral lines for virtualization and grid keyboard patterns.

**Costs**

- Consumers must compose more markup than a single monolithic table component.
- Server mode requires consumer discipline for `rowCount`, manual flags, and
  stale-response guards.
- Benchmark and threshold proposals need maintainer approval before CI
  enforcement.

**Follow-up work**

- Approve [data-table-spec.md](../components/data-table-spec.md) and this ADR.
- Split implementation into child issues listed in the spec (composable core,
  composition examples, themed wrapper, bench harness).
- Separate specs for virtualization and treegrid navigation when prioritized.

## Compatibility implications

- Additive public API in `@ghostvue/vue` and `@ghostvue/themes` when implemented.
- No changes to `GhostTable` primitives.
- Manifests and Changesets ship with implementation, not with this documentation-only PR.
- SSR: table shell markup remains deterministic; client-only measurement stays in
  benchmarks, not in composable hot paths.
