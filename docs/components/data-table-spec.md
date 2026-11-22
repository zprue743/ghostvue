---
schemaVersion: 1.0.0
component: GhostDataTable
components:
  - GhostDataTable
packages:
  - '@ghostvue/vue'
specStatus: draft
manifests: []
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions:
  - question: 'Multi-column sort keyboard and secondary aria-sort when enableMultiSort ships.'
    blocking: false
    reviewer: Zac
  - question: 'Promote informational 10k-row bench thresholds to verify gates after CI variance is known.'
    blocking: false
    reviewer: Zac
---

# GhostDataTable specification

**Status:** Draft for [GHO-35](https://linear.app/ghost-vue/issue/GHO-35). Zac
endorses **option A** (composable + native `GhostTable`; see
[ADR 0014](../adr/0014-datatable-phase-one-architecture.md)). **`specStatus`
stays `draft`** until gate approval; implementation waits on reviewed spec text.

## Purpose and user problems

`GhostDataTable` is the interactive data grid for application admin surfaces:
sortable columns, filters, pagination, row selection, and expandable detail
rows. It targets teams that already own REST or GraphQL row records and want
Vue-idiomatic composition without surrendering data ownership or adopting a
spreadsheet interaction model.

Sighted users get familiar table chrome built on `GhostTable` semantics.
Assistive technology encounters a **native table** with sort buttons, checkbox
selection, and stable header/body relationships—not a roving `grid` with
cell-level tabindex.

Immediate consumers: paged admin lists, selectable bulk-action tables, and
expandable row detail patterns that compose `GhostPagination`, `GhostCheckbox`,
`GhostInput` / `GhostSelect` for filters, and `GhostEmptyState` for zero-result
states.

## Non-goals

Phase one explicitly excludes:

- Row virtualization, sticky headers, frozen columns, and scroll-synced footers
  (separate future specs; see [Child work decomposition](#child-work-decomposition)).
- `role="grid"`, `role="treegrid"`, arrow-key cell navigation, and single-Tab-stop
  roving row focus (deferred grid-navigation spec).
- **Multi-column sort in phase one** (deferred; single primary sort column only).
- **Themed `GhostDataTable`** in `@ghostvue/themes` (headless examples and docs
  first).
- Query-wide server bulk selection (“select all matching rows on the server”).
- Column resize/reorder drag handles, grouping, pivoting, aggregation, and
  built-in query builders.
- Data fetching, caching, SWR, optimistic updates, and error UI (consumer-owned).
- Built-in filter debouncing (consumer-owned).
- Cloning or deep-watching the consumer `data` array; mutating row objects.
- A shared table engine singleton, global registry, or cross-route table state
  store.

## Public API

### Types (exact contracts)

These types are the phase-one public TypeScript contracts. Names live in
`@ghostvue/vue` (exact export paths chosen at implementation).

```ts
/** Stable primary key for selection, expansion, and reactivity-safe maps */
type DataTableRowId = string | number

type DataTableSortDirection = 'asc' | 'desc' | false

interface DataTableColumnSort {
  id: string
  desc: boolean
}

interface DataTableColumnFilter {
  id: string
  value: unknown
}

interface DataTablePaginationState {
  /** 1-based page index (matches GhostPagination) */
  pageIndex: number
  pageSize: number
}

/** Snapshot of every dimension that can trigger a server refetch */
interface DataTableQueryState {
  sorting: DataTableColumnSort[]
  columnFilters: DataTableColumnFilter[]
  globalFilter: unknown
  pagination: DataTablePaginationState
}

interface DataTableColumnDef<TData> {
  id: string
  header?: string
  accessorKey?: keyof TData & string
  accessorFn?: (row: TData, index: number) => unknown
  /** Headless render hook; Vue accepts VNodeChild from setup render functions */
  cell?: (context: DataTableCellContext<TData>) => import('vue').VNodeChild
  enableSorting?: boolean
  enableColumnFilter?: boolean
  sortUndefined?: 'first' | 'last' | false
  sortFn?: (rowA: TData, rowB: TData, columnId: string) => number
  filterFn?: (row: TData, columnId: string, filterValue: unknown) => boolean
  meta?: Record<string, unknown>
}

interface DataTableCellContext<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
  column: DataTableColumnDef<TData>
  /** Runtime value is unknown; use accessorKey for typed access in templates */
  getValue: () => unknown
}

type DataTableGetRowId<TData> = (row: TData, index: number) => DataTableRowId

interface DataTableStateChangePayload {
  /** Monotonic id; pair with useGhostDataTableServerRequest */
  requestId: number
  /** What the user last changed */
  trigger: keyof DataTableQueryState
  /** Full query after reset/coalescence rules; sole source for server fetches */
  query: DataTableQueryState
}
```

**`getValue()` typing policy:** the public method returns **`unknown`**. Compile-time
narrowing is consumer responsibility (`accessorKey` literal types may improve
inference in column definitions, but `getValue()` itself is not generically
overloaded per column in v1). Required compile-time test: a column with
`accessorKey: 'amount'` still types `getValue()` as `() => unknown` in
`DataTableCellContext`.

Default comparators (when local sorting runs): locale-aware strings, numeric
subtract, `Date#getTime`, `sortUndefined` default `'last'`.

### Manual-processing matrix

| `manualPagination` | `manualSorting` | `manualFiltering` | `data` contents | `rowCount`                  | Composable processing                                     |
| ------------------ | --------------- | ----------------- | --------------- | --------------------------- | --------------------------------------------------------- |
| `false`            | `false`         | `false`           | Full local set  | `filtered.length` (derived) | Global sort → global filter → slice page                  |
| `false`            | `*`             | `*`               | Full local set  | derived                     | Sort/filter per manual flags on full set                  |
| `true`             | `false`         | `false`           | One server page | **required** prop           | **Page-local** sort then page-local filter on `data` only |
| `true`             | `true`          | `false`           | One server page | **required**                | Page-local filter only                                    |
| `true`             | `false`         | `true`            | One server page | **required**                | Page-local sort only                                      |
| `true`             | `true`          | `true`            | One server page | **required**                | No reorder/filter; display `data` as-is                   |

**`pageCount` override:** optional. When omitted, `pageCount = max(1, ceil(rowCount / pageSize))`.
When `rowCount === 0`, effective **`pagination.pageIndex` is 1** and
**`pageCount` is 1** (matches [GhostPagination](/specs/pagination) empty
behavior).

### Props and configuration

Headless `GhostDataTable` / `useGhostDataTable` options:

| Option                  | Type                          | Default  | Contract                                                             |
| ----------------------- | ----------------------------- | -------- | -------------------------------------------------------------------- |
| `data`                  | `readonly TData[]`            | required | Consumer-owned rows. Reference change triggers reset rules.          |
| `columns`               | `DataTableColumnDef<TData>[]` | required | Not mutated by the library.                                          |
| `getRowId`              | `DataTableGetRowId<TData>`    | required | **Required in every build**; no production fallback.                 |
| `manualSorting`         | `boolean`                     | `false`  | When `true`, composable does not sort `data` for server-global sort. |
| `manualFiltering`       | `boolean`                     | `false`  | When `true`, composable does not filter for server-global filter.    |
| `manualPagination`      | `boolean`                     | `false`  | When `true`, `data` is one page; **`rowCount` required**.            |
| `rowCount`              | `number`                      | derived  | Required iff `manualPagination`; total matching query on server.     |
| `pageCount`             | `number`                      | derived  | Optional override; otherwise from `rowCount` and `pageSize`.         |
| `enableRowSelection`    | `boolean`                     | `false`  | When `false`, selection APIs are inert.                              |
| `enableRowExpansion`    | `boolean`                     | `false`  | When `false`, expansion APIs are inert.                              |
| `allowMultipleExpanded` | `boolean`                     | `true`   | When `false`, opening one row collapses others.                      |
| `loading`               | `boolean`                     | `false`  | Sets `aria-busy` on the table region.                                |
| `disabled`              | `boolean`                     | `false`  | Disables sort, selection, expansion.                                 |

Named exports (phase one): `GhostDataTable`, `useGhostDataTable`,
`useGhostDataTableServerRequest`, and types above. **`enableMultiSort` is not
part of phase one.**

### Headless composition example (typed)

This example is the **gate for freezing** the headless API. It must compile
against the types above.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import {
  GhostDataTable,
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  GhostCheckbox,
  type DataTableColumnDef,
} from '@ghostvue/vue'

type Invoice = {
  id: string
  customer: string
  amount: number
}

const columns: DataTableColumnDef<Invoice>[] = [
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: true,
    cell: ({ getValue, row }) => {
      const value = getValue() as number // consumer narrows unknown
      return `${value.toFixed(2)} USD (${row.customer})`
    },
  },
]

const data: Invoice[] = [/* current page or full local dataset */]
const selectedRowIds = computed(() => ['inv-2'])
const expandedRowIds = computed(() => ['inv-2'])
</script>

<template>
  <GhostDataTable
    :data="data"
    :columns="columns"
    :get-row-id="(row) => row.id"
    v-model:selected-row-ids="selectedRowIds"
    v-model:expanded-row-ids="expandedRowIds"
    :enable-row-selection="true"
    :enable-row-expansion="true"
  >
    <template
      #default="{
        tableRootProps,
        getHeaderCellProps,
        getRowProps,
        rows,
        getBodyCellContext,
      }"
    >
      <GhostTable v-bind="tableRootProps">
        <GhostTableHead>
          <GhostTableRow>
            <GhostTableHeaderCell
              v-for="header in rows[0]?.headers"
              :key="header.column.id"
              v-bind="getHeaderCellProps(header.column.id)"
            >
              {{ header.column.header }}
            </GhostTableHeaderCell>
          </GhostTableRow>
        </GhostTableHead>
        <GhostTableBody>
          <template v-for="row in rows" :key="row.rowId">
            <GhostTableRow v-bind="getRowProps(row.rowId)">
              <GhostTableCell v-if="row.showSelection">
                <GhostCheckbox
                  :model-value="row.isSelected"
                  @update:model-value="row.toggleSelected"
                  :aria-label="`Select invoice ${row.rowId}`"
                />
              </GhostTableCell>
              <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                <component
                  :is="cell.column.cell"
                  v-bind="getBodyCellContext(row.rowId, cell.column.id)"
                  v-if="cell.column.cell"
                />
                <template v-else>
                  {{ getBodyCellContext(row.rowId, cell.column.id).getValue() }}
                </template>
              </GhostTableCell>
            </GhostTableRow>
            <GhostTableRow v-if="row.isExpanded" v-bind="row.detailRowProps">
              <GhostTableCell :colspan="row.columnCount">
                <slot name="expanded" :row="row.original" :row-id="row.rowId" />
              </GhostTableCell>
            </GhostTableRow>
          </template>
        </GhostTableBody>
      </GhostTable>
    </template>
  </GhostDataTable>
</template>
```

Row `inv-2` is **both selected and expanded** in the fixture: `getRowProps` exposes
`data-selected` and `data-expanded` together (see [Rendering](#rendering-and-customization)).

### Renderless root slot bindings

| Binding                        | Host                                   | Contract                                                                                                                     |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tableRootProps`               | `GhostTable` root wrapper or `<table>` | `aria-busy` when `loading`; `data-ghost-data-table`; optional `aria-labelledby` / `aria-label` from consumer                 |
| `getHeaderCellProps(columnId)` | `GhostTableHeaderCell`                 | `scope: 'col'`; `aria-sort`: `ascending` \| `descending` \| omitted on **primary** sort column only; `data-sort` for styling |
| `getRowProps(rowId)`           | `GhostTableRow` (data row)             | `data-selected="true"` when selected; `data-expanded="true"` when expanded (boolean data attributes, independent)            |
| `detailRowProps`               | expansion `<tr>`                       | `data-part="detail"`; no `data-selected`                                                                                     |
| `rows`                         | —                                      | Row models with `cells`, selection helpers, `toggleSort`, etc.                                                               |

Sort direction on headers is **single-column** in phase one (at most one entry in
`sorting`).

### v-model contracts

| State          | Prop             | Emit                    | Uncontrolled initial                                     |
| -------------- | ---------------- | ----------------------- | -------------------------------------------------------- |
| Sorting        | `sorting`        | `update:sorting`        | `defaultSorting` (`DataTableColumnSort[]`, max length 1) |
| Column filters | `columnFilters`  | `update:columnFilters`  | `defaultColumnFilters`                                   |
| Global filter  | `globalFilter`   | `update:globalFilter`   | `defaultGlobalFilter`                                    |
| Pagination     | `pagination`     | `update:pagination`     | `defaultPagination`                                      |
| Row selection  | `selectedRowIds` | `update:selectedRowIds` | `defaultSelectedRowIds`                                  |
| Expansion      | `expandedRowIds` | `update:expandedRowIds` | `defaultExpandedRowIds`                                  |

All use `useControllableState`.

**Reset rules** (applied before any `stateChange` emit):

| Event                        | Sorting | Filters | Pagination                                                                                       | Selection / expansion |
| ---------------------------- | ------- | ------- | ------------------------------------------------------------------------------------------------ | --------------------- |
| `globalFilter` change        | kept    | updated | **page → 1**                                                                                     | kept                  |
| `columnFilters` change       | kept    | updated | **page → 1**                                                                                     | kept                  |
| `pagination.pageSize` change | kept    | kept    | **page → 1**                                                                                     | kept                  |
| `data` reference change      | kept    | kept    | **page → 1** if local pagination; unchanged index if `manualPagination` only replaces page slice | see below             |
| `sorting` change             | updated | kept    | kept                                                                                             | kept                  |

**Selection / expansion pruning:**

- **`manualPagination: false` (local):** when `data` changes, remove ids that no
  longer appear in the **full local dataset** after filter (if any local filter
  applies). Emit pruned v-models when ids drop.
- **`manualPagination: true` (server):** **never prune** `selectedRowIds` or
  `expandedRowIds` solely because the current `data` page slice replaced ids
  from a previous page. Explicit per-row selection persists across page changes.

### Events, callbacks, slots, and exposed methods

- **`stateChange`** — `DataTableStateChangePayload`. Fired **once per user
  action** after coalesced updates (e.g. filter on page 4 → one emit with
  `query.pagination.pageIndex === 1` and new filter). Server consumers should
  fetch from `payload.query` only, not from separate v-model handlers.
- **`update:*`** — still emitted for each affected v-model (same tick ordering as
  combinatorial updates; tests assert single fetch).
- Default slot — bindings in table above.
- `header`, `cell`, `expandedRow` slots — optional overrides.
- Exposed: `toggleAllPageRowsSelected`, `toggleRowSelected`, `toggleRowExpanded`,
  `resetRowSelection`, etc.

`useGhostDataTableServerRequest` — `{ begin(requestId), isLatest(requestId) }`
([combobox async pattern](/specs/combobox#useghostcomboboxasyncsearch)).

### Select-all behavior

| Processing                        | Select-all header                                          | Notes                                                               |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Local (`manualPagination: false`) | Toggles every row in the **pre-pagination filtered model** | Consumer can compute `indeterminate` on header `GhostCheckbox`      |
| Server (`manualPagination: true`) | Toggles every row **on the current `data` page** only      | Cannot select row ids not loaded; query-wide bulk is consumer-owned |

Header checkbox mixed state uses **`indeterminate` prop** on `GhostCheckbox`
([checkbox-spec](/specs/checkbox)), not `aria-checked="mixed"`.

### Derived models

| Model                        | Local                                                   | Server page (`manualPagination`)                                                                       |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `getPrePaginationRowModel()` | Sort + filter on full `data`                            | Page-local sort/filter on current `data` only                                                          |
| `getPaginationRowModel()`    | Sliced page                                             | `data` as-is                                                                                           |
| `getSelectedRowModel()`      | Selected ids resolved against local pre-pagination rows | Selected ids resolved against **current page rows** for display; full list remains in `selectedRowIds` |

## State model

### Sorting

- Phase one: **at most one** `DataTableColumnSort` entry.
- Tri-state: none → asc → desc → none.
- `aria-sort` only on the sorted column's `<th>`.

### Filtering

- Global filter before column filters (AND) when local filtering runs.
- Debouncing: **consumer-owned** (composable updates on every bound filter change).

### Pagination

- Shared **1-based** `pageIndex` with `GhostPagination`.
- `rowCount === 0` → effective page **1**, `pageCount` **1**.

### Selection

Cross-page server selection is **explicit** (user toggles rows on each visited page).
Required acceptance test:

1. Server mode, page 1: select row A.
2. Navigate to page 2: select row B.
3. Navigate back to page 1: row A still selected; page 2 visit retained B.

### Expansion

- Same **no server prune** rule as selection.
- Detail `<tr>` immediately after data `<tr>`.

### Loading, empty, disabled, read-only, and error states

| State      | Behavior                                        |
| ---------- | ----------------------------------------------- |
| `loading`  | `aria-busy="true"` via `tableRootProps`         |
| Empty      | `GhostEmptyState` in body; pagination at page 1 |
| `disabled` | No emits from controls                          |

### Async behavior

1. User action → coalesced v-models + **one** `stateChange`.
2. Consumer: `loading = true`; `begin(payload.requestId)`.
3. Apply `data` / `rowCount` only if `isLatest(requestId)`.

**Required acceptance test:** With server pagination on page 4, changing a column
filter produces **exactly one** fetch for **page 1** with the new filter. A
late response for the old page-4 query must not apply when `isLatest` fails.

## Consumer data

- **`getRowId` is required** in all builds (development and production).
- Prefer `accessorKey` / `accessorFn`; optional `cell` hook for custom VNodes.
- Column `meta` is opaque to the composable.

### Row identity

Stable `getRowId` across reorder, filter, and server page swaps. Server page
changes must not clear ids merely because rows left the slice.

## Accessibility contract

### Semantics

- Native `<table>` via `GhostTable`.
- Sort control: `button type="button"` in header; `aria-sort` on `<th>`.
- Selection: `GhostCheckbox` per row and header; labels via `aria-label`.

### Keyboard interaction

| Key               | Context         | Behavior                                                                       |
| ----------------- | --------------- | ------------------------------------------------------------------------------ |
| `Space`           | `GhostCheckbox` | Toggle checked ([checkbox-spec](/specs/checkbox)); **`Enter` does not toggle** |
| `Enter` / `Space` | Sort `button`   | Activate sort                                                                  |
| `Enter` / `Space` | Expand `button` | Toggle expansion                                                               |
| `Tab`             | Table           | Between focusable controls                                                     |

Phase one: **single-column sort** only (no multi-sort chord).

### Assistive technology

- Mixed select-all: DOM `indeterminate` on header checkbox (see checkbox spec).
- Optional live region for async refetch: consumer-owned.

## Rendering and customization

- `GhostTable` `data-part` hooks unchanged.
- Header sort styling: `data-sort="asc" | "desc"`.
- **Selected row:** `data-selected="true"` on `GhostTableRow` (not `data-state`).
- **Expanded row:** `data-expanded="true"` on data row; detail row `data-part="detail"`.
- Both may be true simultaneously (no `data-state` collision).

## Environment behavior

### SSR and hydration

Deterministic markup for a given props snapshot; checkbox `indeterminate` via
post-mount effect per checkbox spec.

### Mobile and touch

`GhostTable.containHorizontal` for overflow.

## Performance

- Local 10k-row processing with **paginated DOM** (O(pageSize) rows).
- Benchmark file: `tests/bench/data-table-processing.bench.ts`.
- Proposed p95 &lt; 25ms and heap delta &lt; 5MB: **informational until CI
  variance is understood**; not a gate in phase one.

## Composition

Reuses `GhostTable*`, `GhostPagination`, `GhostCheckbox`, `GhostEmptyState`,
`useControllableState`. **No** themed DataTable wrapper in phase one.

## Test plan

- **Unit:** manual-processing matrix, empty `rowCount` pagination, coalesced
  `stateChange`, page-local vs global sort semantics.
- **Unit:** server selection persistence (no prune on page change).
- **Acceptance:** cross-page selection test (pages 1 → 2 → 1).
- **Acceptance:** filter on page 4 → single page-1 fetch; stale page-4 response ignored.
- **Unit:** `useGhostDataTableServerRequest` races.
- **Vue:** headless composition example hydrates (SSR fixture).
- **Browser:** `Space` on checkboxes; axe with `aria-busy`.
- **Type:** `getValue(): unknown`; `accessorKey` does not change public `getValue` signature.

## Documentation plan

- `docs/components/data-table.md` and `examples/data-table/*` **before** themed work.
- Link ADR 0014 and prerequisites.

## Compatibility and release impact

- Phase one exports from `@ghostvue/vue` only.
- Changeset when implementation ships; docs-only revisions have no runtime impact.

## Decisions recorded (Zac, PR #265 review)

| Topic                   | Decision                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| Architecture            | Option A: composable + native `GhostTable`                        |
| `getRowId`              | Required in every build                                           |
| Filter debouncing       | Consumer-owned                                                    |
| Themed `GhostDataTable` | **Not** in phase one; headless examples first                     |
| Benchmark thresholds    | Informational until repeated CI runs show variance                |
| Server `stateChange`    | One emit per user action with full `query`                        |
| Server selection        | No prune on page change; select-all = visible page only on server |

## Open architectural questions

Only non-blocking items remain (also listed in frontmatter with `blocking: false`):

1. **Multi-sort (deferred):** If `enableMultiSort` ships later, define keyboard
   to add a secondary sort, `aria-sort` on primary column only, and accessible
   description of secondary order.
2. **Benchmark gates:** When to promote informational thresholds to `pnpm verify`.

## Child work decomposition

| Child issue                                             | Scope                                                    | Complexity |
| ------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| DataTable core types and local processing pipeline      | `useGhostDataTable`, manual matrix, row models           | High       |
| GhostDataTable headless root and GhostTable composition | Slot bindings above, SSR example                         | Medium     |
| Column sorting UI and header a11y                       | Single-column sort, `aria-sort`                          | Medium     |
| Filtering model and toolbar composition docs            | Filters + reset to page 1                                | Low        |
| Pagination integration                                  | `rowCount`, empty → page 1, `GhostPagination`            | Low        |
| Row selection (local + server)                          | Select-all rules, no server prune, cross-page tests      | High       |
| Row expansion rows                                      | Detail `<tr>`, server no-prune                           | Medium     |
| Server mode and async guard                             | Coalesced `stateChange`, full `query`, stale guard tests | Medium     |
| Performance benchmark harness                           | Vitest bench, informational thresholds                   | Low        |
| Headless docs and executable examples                   | `data-table.md`, `examples/data-table/`                  | Medium     |
| **Deferred:** Themed GhostDataTable                     | `@ghostvue/themes` wrapper                               | Medium     |
| **Deferred:** Multi-column sort spec                    | Keyboard + AT                                            | Medium     |
| **Deferred:** Virtualization spec                       | Scroll + a11y                                            | High       |
| **Deferred:** Treegrid / grid keyboard spec             | Roving focus                                             | High       |

Parent **GHO-35** tracks specification approval at **`specStatus: draft`** until
Zac promotes the spec through the component gate.
