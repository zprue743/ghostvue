# ADR 0014: DataTable phase-one architecture

- Status: accepted (Zac, November 22, 2026; confirmed in the GHO-233 PR review)
- Date: 2026-11-22
- Decision owners: repository maintainers (Zac sign-off required)
- Relates to: [GHO-35](https://linear.app/ghost-vue/issue/GHO-35),
  [ADR 0003](./0003-public-component-api-conventions.md) (naming),
  [ADR 0004](./0004-headless-styled-layering.md) (headless layering),
  [GhostTable spec](/specs/table),
  [GhostCheckbox spec](/specs/checkbox),
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
`GhostTable` composition, typed column accessors, and stable row IDs. PR
#265 review (2026-11-22) endorses that direction with additional constraints below.

## Decision

### 1. Public surface (phase one)

| Export                           | Package         | Role                                                                                      |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `GhostDataTable`                 | `@ghostvue/vue` | Headless root: slot props or child `GhostDataTableTable`                                  |
| `GhostDataTableTable`            | `@ghostvue/vue` | Default unstyled table mapper + `#columnId` slots (basic on-ramp)                         |
| `GhostDataTablePreset`           | `@ghostvue/vue` | Batteries-included headless preset (search, selection, expansion); ≤95 LOC invoice target |
| `defineDataTableColumns`         | `@ghostvue/vue` | Typed column builder; generic contexts keep `getValue(): unknown`                         |
| `useGhostDataTable`              | `@ghostvue/vue` | Primary composable; sort/filter/page/selection/expansion and derived row models           |
| `useGhostDataTableServerRequest` | `@ghostvue/vue` | Stale-response guard for consumer fetches (same shape as `useGhostComboboxAsyncSearch`)   |
| Interaction prop helpers         | `@ghostvue/vue` | Sort, selection, expansion controls with localizable names                                |

Phase one ships **headless composition docs and executable examples only**.
There is **no** themed `GhostDataTable` in `@ghostvue/themes` until a later
issue. Tokens and recipes may reference table parts consumers compose themselves.

There is **no** `@ghostvue/data-table` package, **no** global table manager, and
**no** mandatory render-prop engine.

### 2. Composition model

- **Markup:** `GhostDataTablePreset` for the short **feature-rich** path (≤ PrimeVue
  LOC with typed columns), `GhostDataTableTable` for minimal tables, or manual
  `GhostTable*` parts via slot props from `GhostDataTable` / `useGhostDataTable`.
- **Better than PrimeVue:** stricter contracts (typing, server `manual*` matrix,
  select-all semantics) plus preset ergonomics — not behavioral parity cloning.
- **Roles:** sortable columns use `aria-sort` on `<th>`; selection uses
  `GhostCheckbox` per [checkbox-spec](/specs/checkbox) (mixed
  via `indeterminate`, not `aria-checked="mixed"`).
- **Keyboard:** native control tab order only. **Single-column sort** in phase
  one; multi-column sort is deferred until a keyboard contract exists.
- Row chrome uses separate `data-selected` and `data-expanded` attributes (not a
  single colliding `data-state`).

### 3. Consumer data and column model

- Row type `TData` is consumer-defined. The library never clones the full
  `data` array.
- **`getRowId` is required in every build** (no index fallback in any build).
- Columns are `DataTableColumnDef<TData>` with **`id`**, optional `accessorKey`
  or `accessorFn`, optional `cell` render hook, and local `sortFn` / `filterFn`
  when manual flags allow page-local processing.
- Column definitions are consumer-owned; the composable does not mutate them.

### 4. Local vs server (manual) processing

Each dimension is controlled by an explicit `manual*` flag:

| Concern    | Local (default)                                | Manual (server)                                                                                 |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Sorting    | Composable orders rows in the processing input | Consumer supplies globally sorted pages; composable emits sorting updates only                  |
| Filtering  | Composable filters rows                        | Consumer supplies pre-filtered `data`                                                           |
| Pagination | Composable slices after sort + filter          | Consumer passes **one page** of rows in `data`                                                  |
| Row total  | `rowCount` derived from filtered local rows    | **`rowCount` required only when `manualPagination` is `true`** (total matching query on server) |

**`pageCount` alone is insufficient** when `manualPagination` is true: consumers
must supply `rowCount` so the composable can derive `pageCount =
ceil(rowCount / pageSize)` and clamp pagination consistently with
`GhostPagination`.

**Mixed manual flags:** when `manualPagination` is true but `manualSorting` or
`manualFiltering` is false, the composable may sort or filter **only the rows
currently in `data`** (the loaded page). That is **page-local** processing: it
reorders or narrows the visible page without claiming to sort or filter the full
remote dataset. Server-backed global sort/filter still requires the corresponding
`manual*` flag plus consumer refetch.

**Empty query results:** when **`rowCount === 0`**, effective pagination is **page
1** with `pageCount === 1`. When **`rowCount > 0`** but the visible page slice is
empty after page-local filter, **keep `pageIndex`** (spec recorded acceptance).

**Pagination clamping (Zac approved):** full-local filter clamp, local `data`
refresh clamp, **`retry()`**, and server **`stateChange`** when clamping
`pageIndex` after `rowCount`-driven `pageCount` changes — recorded in the
component spec.

### 5. State ownership, resets, and server fetch coalescing

- v-models use `useControllableState` ([component-state.md](../architecture/component-state.md)).
- **Pagination resets to page 1** when global or column filters change **only
  if `manualFiltering: true`** (server filter refetch). Page-local filtering with
  server pagination **keeps** the current page. `pageSize` changes always reset to
  page 1. Sort changes do not implicitly reset page unless the consumer does so.
- **One server-oriented user action → one `stateChange` emit** carrying the
  **complete next query** (`sorting`, `columnFilters`, `globalFilter`,
  `pagination`) after all reset rules apply. Individual `update:*` emits still
  fire for v-model writers. Example: changing a filter on page 4 coalesces to
  `pagination.pageIndex === 1` and a single `stateChange` so consumers never fetch
  page 4 with a new filter or double-fetch.
- `stateChange` includes a monotonic `requestId` for `useGhostDataTableServerRequest`.
- Filter input debouncing is **consumer-owned** (composable does not debounce).
- Default local filter matching rules are **approved** in the component spec
  (case-insensitive OR global, AND column filters, clear sentinels, skip
  `null`/`undefined` cells in text matching).

### 6. Selection and select-all

Selection is always keyed by **`RowId`**.

| Mode               | `manualPagination` | Header select-all                                                     | Cross-page selection                                                                     |
| ------------------ | ------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Local full dataset | `false`            | All ids in **`getPrePaginationRowModel()`** (filtered, pre-page)      | N/A                                                                                      |
| Server page        | `true`             | All ids in **`getRowModel()`** (e.g. 3 of 25 after page-local filter) | Explicit toggles; **no prune** on page swap; ids on other pages kept in `selectedRowIds` |

**`getRowModel()`** drives tbody rendering. Select-all uses **`getPrePaginationRowModel()`** locally and **`getRowModel()`** on server pages. Header `indeterminate` uses the same set as select-all.

**Query-wide bulk selection** (“select all 10,000 matching the filter on the
server”) is **consumer-owned**, not a built-in phase-one affordance.

Automatic pruning applies only when **`manualPagination` and `manualFiltering` are
both `false`**: on `data` reference change, drop ids absent from **source rows**.
Filters, pagination slices, and server-filtered payloads must **not** prune.
Server filter + local pagination preserves selection when a row drops from a
response and returns later.

### 7. Expansion

- `expandedRowIds` keyed by `RowId`; same **no-prune-on-server-page-change**
  rule as selection when `manualPagination` is true.
- Detail row follows the data row as a native `<tr>` with colspan. Style with
  `data-detail-row="true"` on `GhostTableRow`; keep `data-part="row"` (part
  merge order in `mergeGhostTablePartAttrs` overwrites consumer `data-part`).

### 8. Performance and benchmarks

- 10k-row **local** processing benchmarks are documented in the component spec.
- Proposed time/memory thresholds are **informational** until repeated CI runs
  establish variance; only then may they become gates (open question).

### 9. Accessibility

- Sort: native `button` in `<th>`; **one** `aria-sort` on the active sort column
  (single-column phase one).
- Selection: `GhostCheckbox` with `Space` toggle; select-all mixed state via
  `indeterminate` prop ([checkbox-spec](/specs/checkbox)).
- `aria-busy` on the table region when `loading` is true.
- Reference fixture (preset or full composition): **zero axe violations** on the
  table scope at implementation gate (labeled icon-only headers, sort buttons,
  pagination).

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
default; premature extraction risks another slightly different virtualizer
([philosophy.md](../philosophy.md)).

## Consequences

**Benefits**

- Aligns with existing `GhostTable`, `GhostPagination`, and `GhostCheckbox`
  boundaries.
- Server pagination cannot silently drop cross-page selection.
- Coalesced `stateChange` prevents duplicate or stale-page fetches.
- Manual-flag matrix matches how real admin tables mix client and server steps.
- Clear deferral lines for virtualization and grid keyboard patterns.

**Costs**

- Consumers must compose more markup than a single monolithic table component.
- Consumers own query-wide bulk actions and debouncing.
- Server mode requires consumer discipline for `rowCount`, manual flags, and
  stale-response guards.
- Phase one omits themed batteries-included markup.
- Benchmark and threshold proposals need maintainer approval before CI
  enforcement.

**Follow-up work**

- Finalize [data-table spec](/specs/data-table) after PR #265 reviews.
- **Pre-freeze prototype complete** ([PR #269](https://github.com/zprue743/ghostvue/pull/269),
  `prototypes/datatable-primevue/FINDINGS.md`); summary in spec — Zac promoted
  `specStatus: approved` on November 22, 2026 (no PrimeVue dependency on `master`).
- Split implementation into child issues listed in the spec (composable core,
  headless composition examples, bench harness); **themed `@ghostvue/themes`
  wrapper deferred** to a later issue.
- Implement child issues; defer multi-sort, virtualization, treegrid keyboard,
  optional PrimeVue 10k browser benchmark doc.
- Separate specs for virtualization and treegrid navigation when prioritized.

## Compatibility implications

- Additive `@ghostvue/vue` exports when implemented; no `GhostTable` changes.
- This ADR is accepted and the spec is **`specStatus: approved`** (Zac,
  November 22, 2026).
