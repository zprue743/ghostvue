---
schemaVersion: 1.0.0
component: GhostDataTable
components:
  - GhostDataTable
  - GhostDataTableTable
  - GhostDataTablePreset
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Zac approved the headless spec in PR #272 and the themed addendum in PR #374 (merge 5fd3fd46).'
manifests:
  - packages/vue/manifests/ghost-data-table.manifest.json
  - packages/vue/manifests/ghost-data-table-preset.manifest.json
  - packages/vue/manifests/ghost-data-table-table.manifest.json
  - packages/themes/manifests/ghost-data-table.manifest.json
  - packages/themes/manifests/ghost-data-table-preset.manifest.json
  - packages/themes/manifests/ghost-data-table-table.manifest.json
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
  - question: 'GHO-250 (0.3.0 multi-column sort addendum): Zac sign-off required on secondary aria-sort policy, unmodified activation when >1 columns are sorted, maxMultiSortColCount overflow policy, AT/touch no-modifier affordances, and per-column enableMultiSort.'
    blocking: false
    reviewer: Zac
  - question: 'Promote informational 10k-row bench thresholds to verify gates after CI variance is known.'
    blocking: false
    reviewer: Zac
---

# GhostDataTable specification

**Status:** Approved for [GHO-35](https://linear.app/ghost-vue/issue/GHO-35).
**Option A** (composable + native `GhostTable`; see
[ADR 0014](../adr/0014-datatable-phase-one-architecture.md), accepted) is the
phase-one architecture. **`specStatus: approved`** was recorded with the first
implementation step ([GHO-233](https://linear.app/ghost-vue/issue/GHO-233)); Zac
approved in chat on 2026-11-23; recorded in
[PR #272](https://github.com/zprue743/ghostvue/pull/272).

> **Approved themed `0.1.0` addendum (`#316` / `GHO-249`):** Following the
> `2026-11-25` roadmap review, the single-sort themed wrapper in
> `@ghostvue/themes` and companion `GhostDataTablePreset` layout slots in
> `@ghostvue/vue` are specified in the
> [Themed `GhostDataTable` addendum](#themed-ghostdatatable-addendum) below
> (**decoupled from multi-column sort [#317](https://github.com/zprue743/ghostvue/issues/317)**,
> which stays deferred to `0.3.0`). Zac recorded approval in
> [PR #374](https://github.com/zprue743/ghostvue/pull/374).

## Purpose and user problems

`GhostDataTable` is the interactive data grid for application admin surfaces:
sortable columns, filters, pagination, row selection, and expandable detail
rows. It targets teams that already own REST or GraphQL row records and want
Vue-idiomatic composition without surrendering data ownership or adopting a
spreadsheet interaction model. **Product goal (Zac):** deliver a DataTable that is
**better than PrimeVue** — stricter typing, explicit server contracts, and
superior default behavior — not a behavioral clone with more markup.

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

- Row virtualization, frozen columns, and scroll-synced footers (separate future
  specs; see [Child work decomposition](#child-work-decomposition)). Phase one
  also excluded sticky headers; opt-in CSS `stickyHeader` on themed
  `GhostDataTable` (`0.1.0`) is specified in the
  [Themed `GhostDataTable` addendum](#themed-ghostdatatable-addendum).
- `role="grid"`, `role="treegrid"`, arrow-key cell navigation, and single-Tab-stop
  roving row focus (deferred grid-navigation spec).
- **Multi-column sort in phase one and `0.1.0`** (deferred to `0.3.0` in
  [#317](https://github.com/zprue743/ghostvue/issues/317); single primary sort
  column only. See the proposed
  [Multi-column sort specification (GHO-250)](#multi-column-sort-specification-gho-250-proposed-for-0-3-0)).
- **Themed `GhostDataTable` in phase one** (headless examples and docs shipped
  first; `0.1.0` single-sort `@ghostvue/themes` wrapper and preset layout slots
  are specified in the
  [Themed `GhostDataTable` addendum](#themed-ghostdatatable-addendum) for
  [#316](https://github.com/zprue743/ghostvue/issues/316) /
  [#333](https://github.com/zprue743/ghostvue/issues/333)).
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
  /** Render hook: invoke as `cell(context)` — not a Vue component (`<component :is>`) */
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

**`getValue()` typing policy:** `DataTableCellContext.getValue()` stays **`() =>
unknown`** in generic/shared slots (any column). **Column definitions** should use
**`defineDataTableColumns<TData>()`** so `cell` / column slots receive a typed
**`value`** and **`getValue(): TValue`** for that column.

```ts
/** Factory; no runtime state */
function defineDataTableColumns<TData>(): {
  accessorKey: <K extends keyof TData & string>(
    key: K,
    column: Omit<DataTableColumnDef<TData>, 'accessorKey' | 'id' | 'cell'> & {
      id?: string
      cell?: (
        ctx: Omit<DataTableCellContext<TData>, 'getValue'> & {
          value: TData[K]
          getValue: () => TData[K]
        },
      ) => import('vue').VNodeChild
    },
  ) => DataTableColumnDef<TData>
  accessorFn: <TValue>(
    id: string,
    column: Omit<DataTableColumnDef<TData>, 'accessorFn' | 'id' | 'cell'> & {
      accessorFn: (row: TData, index: number) => TValue
      cell?: (
        ctx: Omit<DataTableCellContext<TData>, 'getValue'> & {
          value: TValue
          getValue: () => TValue
        },
      ) => import('vue').VNodeChild
    },
  ) => DataTableColumnDef<TData>
}
```

**Type-test acceptance (required in CI):** for `accessorKey: 'amount'` on
`Invoice`, inside `cell`, `value.toFixed(2)` compiles, `value.toUpperCase()` is a
type error, and renaming `Invoice.amount` breaks the column; the same three checks
for an `accessorFn` column returning `number`.

Default comparators (when local sorting runs): locale-aware strings, numeric
subtract, `Date#getTime`, `sortUndefined` default `'last'`.

### Default filtering contract (approved)

Applies when the corresponding `manualFiltering` flag is `false` and the composable
runs local filtering. Approved by Zac (PR #265, fourth review).

| Rule                                 | Default                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global filter participation**      | A column participates iff it has an accessor (`accessorKey` or `accessorFn`) and `enableColumnFilter !== false` (default **true** when an accessor exists). Columns with `enableColumnFilter: false` are ignored by the global filter.                                                                   |
| **Global filter match**              | When `globalFilter` is a string, a row matches if **any** participating column’s cell value matches (logical **OR**). **Skip** columns whose value is **`null` or `undefined`** (do not coerce with `String`). Otherwise case-insensitive substring on `String(value)` (`'acme'` matches `'ACME Corp'`). |
| **Global filter non-string**         | Non-string `globalFilter` values use **strict equality** (`===`) against each participating column’s cell value (logical **OR** across columns). **Skip** `null` / `undefined` cell values.                                                                                                              |
| **Clear global filter**              | `undefined`, `null`, or `''` (empty string) means no global filter; all rows pass the global stage.                                                                                                                                                                                                      |
| **Column filter clear**              | A `columnFilters` entry is inactive when `value` is `undefined`, `null`, or `''`. Inactive entries do not constrain rows.                                                                                                                                                                                |
| **Column filter default `filterFn`** | When `filterFn` is omitted and the filter value is a non-empty string: case-insensitive substring on `String(cellValue)` unless `cellValue` is **`null` or `undefined`** (row fails the column filter for that value). Non-string filter values: strict equality; skip `null` / `undefined` cells.       |
| **Pipeline order**                   | Global filter stage, then per-column filters (logical **AND** across active column filters).                                                                                                                                                                                                             |

Required tests when implemented: global case-insensitivity; OR across columns;
AND across column filters; clear sentinels; omitted `filterFn` on a column;
column excluded via `enableColumnFilter: false`; row with **missing** `customer`
does not match global `'un'` (null/undefined skip).

### Manual-processing matrix

| `manualPagination` | `manualSorting` | `manualFiltering` | `data` contents | `rowCount`                  | Composable processing                                     |
| ------------------ | --------------- | ----------------- | --------------- | --------------------------- | --------------------------------------------------------- |
| `false`            | `false`         | `false`           | Full local set  | `filtered.length` (derived) | Global sort → global filter → slice page                  |
| `false`            | `*`             | `*`               | Full local set  | derived                     | Sort/filter per manual flags on full set                  |
| `true`             | `false`         | `false`           | One server page | **required** prop           | **Page-local** sort then page-local filter on `data` only |
| `true`             | `true`          | `false`           | One server page | **required**                | Page-local filter only                                    |
| `true`             | `false`         | `true`            | One server page | **required**                | Page-local sort only                                      |
| `true`             | `true`          | `true`            | One server page | **required**                | No reorder/filter; display `data` as-is                   |

**Row lists:** **`getPrePaginationRowModel()`** is sort + filter on the processing
input (before pagination). **`getRowModel()`** is the paginated slice used for **tbody rendering** only when
local pagination applies (server page: typically the processed page slice).
**Select-all scope** (see below): **local** — `getPrePaginationRowModel()`;
**server** — `getRowModel()`. Example (server page + page-local filter): 25 loaded,
3 visible after filter → body shows 3; select-all toggles those 3; ids on other
pages remain in `selectedRowIds`.

**`pageCount` override:** optional. When omitted, `pageCount = max(1, ceil(rowCount / pageSize))`.
**`pageIndex` clamping** (recorded; see [Decisions recorded](#decisions-recorded-zac-pr-265-review)):
after any derived `pageCount` change, if `pagination.pageIndex > pageCount`, set
`pageIndex` to `pageCount`. When **`rowCount === 0`** (query-wide empty, including
server total), **`pageCount` is 1** and effective **`pagination.pageIndex` is 1**
(matches [GhostPagination](/specs/pagination)). When **`rowCount > 0`** but
**`getRowModel()`** is empty after page-local processing, **keep `pageIndex`**
(recorded acceptance: server page 4 + filter → 0 visible rows stays on page 4).

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

Named exports (phase one): `GhostDataTable`, `GhostDataTableTable`,
**`GhostDataTablePreset`**, `useGhostDataTable`, `useGhostDataTableServerRequest`,
`defineDataTableColumns`, interaction helpers (`getDataTableSortButtonProps`, …),
and types above. **`enableMultiSort` is not part of phase one.**

### Default rendering convenience (`GhostDataTablePreset`)

**`GhostDataTableTable`** maps columns to a minimal `GhostTable*` body (example
**(a)**). **`GhostDataTablePreset`** is the **batteries-included headless preset**
for the [#269](https://github.com/zprue743/ghostvue/pull/269) invoice surface:
global search field, selection + expansion columns, sort buttons, empty row, and
detail `<tr>` — wired with the interaction prop helpers and a11y rules below.

| Concern               | Contract                                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Placement**         | Default child of `GhostDataTable` (same slot as manual composition). Mutually exclusive with a custom `#default` render in one tree (consumer picks preset **or** manual).                                                                                                   |
| **Props**             | `emptyTitle?: string` (maps to `GhostEmptyState` **#title**); `searchLabel?: string`; `selectionHeaderLabel?`, `expansionHeaderLabel?`; `showGlobalFilter?: boolean` (default `true` when any column filterable). Passes through `disabled` / `loading` from parent context. |
| **Slots**             | `#${columnId}` typed cell overrides (same as `GhostDataTableTable`); `#detail="{ row, rowId, rowIndex }"`; `#toolbar` before the table; optional `#search` to replace the default search control.                                                                            |
| **Escape hatches**    | **(1)** `GhostDataTableTable` only — sort/page cells, no selection toolbar. **(2)** Manual `#default` slot + `GhostTable*` (example **(b)**). **(3)** `useGhostDataTable` without `GhostDataTable` for non-table layouts.                                                    |
| **Line-count target** | Feature-equivalent to PrimeVue fixture (**sort, filter, paginate, select, expand**) with **`defineDataTableColumns`** must be **≤ 95 non-blank consumer lines** (PrimeVue baseline in FINDINGS.md). Verified on the spec example below (~**44** non-blank lines).            |

Phase one includes **`GhostDataTableTable`** and **`GhostDataTablePreset`** as
unstyled `@ghostvue/vue` exports (not `@ghostvue/themes`). See the
[Themed `GhostDataTable` addendum](#themed-ghostdatatable-addendum) for the
`0.1.0` preset layout-slot additions (`#toolbarStart`, `#toolbarEnd`,
`#bulkActions`, `#footer`) and `@ghostvue/themes` wrappers (`#316` / `#333`).

### Examples (same invoice table)

Two documented paths share `Invoice` rows and `defineDataTableColumns`:

#### (a) Basic — sort, paginate, custom currency cell

Short on-ramp: no manual `<thead>` / `<tbody>` shell. Consumer adds a currency
format only via the `#amount` slot.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  GhostDataTable,
  GhostDataTableTable,
  GhostPagination,
  defineDataTableColumns,
} from '@ghostvue/vue'

type Invoice = { id: string; customer: string; amount: number }

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('customer', { header: 'Customer', enableSorting: true }),
  helper.accessorKey('amount', { header: 'Amount', enableSorting: true }),
]

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
])

const pagination = ref({ pageIndex: 1, pageSize: 25 })
const sorting = ref<{ id: string; desc: boolean }[]>([])

const pageCount = computed(() =>
  Math.max(1, Math.ceil(data.value.length / pagination.value.pageSize)),
)
</script>

<template>
  <GhostDataTable
    v-model:pagination="pagination"
    v-model:sorting="sorting"
    :data="data"
    :columns="columns"
    :get-row-id="(row) => row.id"
  >
    <GhostDataTableTable :columns="columns">
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
    </GhostDataTableTable>
    <GhostPagination v-model="pagination.pageIndex" :page-count="pageCount" />
  </GhostDataTable>
</template>
```

`:columns="columns"` on `GhostDataTableTable` is what types `value` as a
number in `#amount` ([GHO-241](https://linear.app/ghost-vue/issue/GHO-241)): a
child in the root's default slot cannot see the root's column types. Without
it the renderer still renders every root column and `value` is `unknown`.
Executable copy: `examples/data-table/basic-invoices.vue`.

Without **`GhostDataTableTable`**, this shape is not achievable in a short
example—the renderless default slot would force every consumer to recreate the
table shell (see **(c)** / **(b)**).

#### (a′) Preset — invoice parity under PrimeVue LOC (target)

Same features as the [#269](https://github.com/zprue743/ghostvue/pull/269) Ghost
prototype (search, sort, pagination, selection, expansion, currency column) with
typed columns. **Spec example: ~44 non-blank lines** (target **≤ 95** vs PrimeVue).

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  GhostDataTable,
  GhostDataTablePreset,
  GhostPagination,
  defineDataTableColumns,
} from '@ghostvue/vue'

type Invoice = { id: string; customer: string; amount: number }

const columns = defineDataTableColumns<Invoice>()
const columnDefs = [
  columns.accessorKey('customer', { header: 'Customer', enableSorting: true }),
  columns.accessorKey('amount', { header: 'Amount', enableSorting: true }),
]

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
])

const globalFilter = ref('')
const selectedRowIds = ref<string[]>([])
const pagination = ref({ pageIndex: 1, pageSize: 25 })

const pageCount = computed(() =>
  Math.max(1, Math.ceil(data.value.length / pagination.value.pageSize)),
)
</script>

<template>
  <GhostDataTable
    ref="table"
    v-model:global-filter="globalFilter"
    v-model:selected-row-ids="selectedRowIds"
    v-model:pagination="pagination"
    :data="data"
    :columns="columnDefs"
    :get-row-id="(row) => row.id"
    :enable-row-selection="true"
    :enable-row-expansion="true"
  >
    <GhostDataTablePreset :columns="columnDefs" empty-title="No invoices">
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
      <template #detail="{ rowId }">Details for {{ rowId }}</template>
    </GhostDataTablePreset>
    <GhostPagination v-model="pagination.pageIndex" :page-count="pageCount" />
  </GhostDataTable>
</template>
```

Implementation must ship **`GhostDataTablePreset`** so this path is real, not
spec-only.

**Shipped ([GHO-246](https://linear.app/ghost-vue/issue/GHO-246)).** As with
`GhostDataTableTable`, pass the same array to the preset's `columns` prop to
type `value` in `#amount` and `row` in `#detail`. Executable copy:
`examples/data-table/preset-invoices.vue` (6 invoices, 5 per page; the pager
binds `pagination`, `pageCount`, and `setPageIndex` from the root's default
slot, per [GhostPagination wiring](#ghostpagination-wiring)). It is **82**
non-blank lines including its layout CSS, and
`tests/integration/data-table-preset-invoices-example.test.ts` fails if it
exceeds 95. Implementation notes:

- Additive props for localized control names: `selectAllLabel`
  (`'Select all rows'`), `rowSelectionLabel(rowId)` (`Select row …`), and
  `rowExpansionLabel(rowId)` (`Show details for …`). `emptyHeadingLevel`
  (default `3`) sets the `GhostEmptyState` title level so the empty state
  fits the page outline (axe `heading-order`).
- The selection `<th>` is named by `aria-label` (it holds only the select-all
  checkbox); the expansion `<th>` holds visually hidden text, so axe
  `empty-table-header` passes. Expand buttons show an `aria-hidden` glyph and
  are named by `aria-label` on the button.
- The default search is a labelled `GhostInput type="search"` that commits
  through the root's `setGlobalFilter` (server filtering resets to page 1
  with one `stateChange`). Use `#search` to debounce. The field is disabled
  while the root is `disabled`.
- `detail`, `toolbar`, and `search` are reserved slot names; do not use them
  as column ids. Attributes on the preset land on `GhostTable`.
- Tests: `GhostDataTablePreset.test.ts` (unit), the example and SSR hydration
  tests, `type-tests/GhostDataTablePresetConsumer.vue`, and a Playwright test
  in `tests/e2e/ghost-data-table.spec.ts` that runs sort, select, expand,
  page, and empty filter from the keyboard with **zero axe violations** on the
  table, search field, and co-located pager.

#### (b) Full composition — approval and accessibility fixture

Manual `GhostTable*` composition for selection, expansion, filters, and custom
headers. This is the **gate for freezing** interaction bindings and the
**approval fixture**. Manual script without reload:

1. Focus the **Amount** sort button; press `Space` or `Enter` to sort.
2. `Space` on row **inv-2** checkbox to toggle selection (inv-2 starts selected).
3. `Space` on inv-2 **expand** button (`getRowExpandButtonProps`) to **collapse**
   the open detail row; `Space` again on the same button to **reopen** it.
4. Type a global filter that matches **no** rows; **header row stays mounted**;
   body shows `GhostEmptyState` with visible **#title** text `No invoices`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostDataTable,
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  GhostCheckbox,
  GhostEmptyState,
  type DataTableColumnDef,
  type DataTableRowId,
} from '@ghostvue/vue'

type Invoice = {
  id: string
  customer: string
  amount: number
}

const columns: DataTableColumnDef<Invoice>[] = [
  {
    id: 'customer',
    header: 'Customer',
    accessorKey: 'customer',
    enableSorting: true,
  },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: true,
    cell: ({ row }) => `${row.amount.toFixed(2)} USD (${row.customer})`,
  },
]

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
])

const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>(['inv-2'])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
</script>

<template>
  <GhostDataTable
    ref="table"
    v-model:global-filter="globalFilter"
    v-model:selected-row-ids="selectedRowIds"
    v-model:expanded-row-ids="expandedRowIds"
    :data="data"
    :columns="columns"
    :get-row-id="(row) => row.id"
    :enable-row-selection="true"
    :enable-row-expansion="true"
  >
    <template
      #default="{
        tableRootProps,
        headers,
        getHeaderCellProps,
        getRowProps,
        rows,
        getBodyCellContext,
        getSortButtonProps,
        getRowSelectionCheckboxProps,
        getHeaderSelectionCheckboxProps,
        getRowExpandButtonProps,
        headerSelectionState,
        toggleAllRowsSelected,
      }"
    >
      <label>
        Search
        <input v-model="globalFilter" type="search" />
      </label>
      <GhostTable v-bind="tableRootProps">
        <GhostTableHead>
          <GhostTableRow>
            <GhostTableHeaderCell scope="col" aria-label="Selection">
              <GhostCheckbox
                v-bind="
                  getHeaderSelectionCheckboxProps({
                    label: 'Select all invoices matching filters',
                  })
                "
                :model-value="headerSelectionState.allSelected"
                :indeterminate="headerSelectionState.someSelected"
                @update:model-value="toggleAllRowsSelected"
              />
            </GhostTableHeaderCell>
            <GhostTableHeaderCell scope="col">Details</GhostTableHeaderCell>
            <GhostTableHeaderCell
              v-for="header in headers"
              :key="header.id"
              v-bind="getHeaderCellProps(header.id)"
            >
              <button
                v-if="header.canSort"
                v-bind="
                  getSortButtonProps(header.id, {
                    label: `${header.column.header} sort`,
                  })
                "
                @click="header.toggleSort"
              >
                {{ header.column.header }}
              </button>
              <template v-else>{{ header.column.header }}</template>
            </GhostTableHeaderCell>
          </GhostTableRow>
        </GhostTableHead>
        <GhostTableBody>
          <GhostTableRow v-if="rows.length === 0">
            <GhostTableCell :colspan="headers.length + 2">
              <GhostEmptyState>
                <template #title>No invoices</template>
              </GhostEmptyState>
            </GhostTableCell>
          </GhostTableRow>
          <template v-for="row in rows" :key="row.rowId">
            <GhostTableRow v-bind="getRowProps(row.rowId)">
              <GhostTableCell>
                <GhostCheckbox
                  v-bind="
                    getRowSelectionCheckboxProps(row.rowId, {
                      label: `Select invoice ${row.rowId}`,
                    })
                  "
                  :model-value="row.isSelected"
                  @update:model-value="row.toggleSelected"
                />
              </GhostTableCell>
              <GhostTableCell>
                <button
                  v-bind="
                    getRowExpandButtonProps(row.rowId, {
                      label: `Show details for ${row.rowId}`,
                    })
                  "
                  @click="row.toggleExpanded"
                >
                  Details
                </button>
              </GhostTableCell>
              <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                <template v-if="cell.column.cell">
                  {{
                    cell.column.cell(
                      getBodyCellContext(row.rowId, cell.column.id),
                    )
                  }}
                </template>
                <template v-else>
                  {{ getBodyCellContext(row.rowId, cell.column.id).getValue() }}
                </template>
              </GhostTableCell>
            </GhostTableRow>
            <GhostTableRow v-if="row.isExpanded" v-bind="row.detailRowProps">
              <GhostTableCell :colspan="headers.length + 2">
                Details for {{ row.rowId }}
              </GhostTableCell>
            </GhostTableRow>
          </template>
        </GhostTableBody>
      </GhostTable>
    </template>
  </GhostDataTable>
</template>
```

`headers` is **independent of body rows** so the head remains when
`getRowModel()` is empty. Gate the sort button on **`header.canSort`**, not
`column.enableSorting`: sorting defaults on for any column with an accessor or
`sortFn`, so `enableSorting` is often omitted
([GHO-242](https://linear.app/ghost-vue/issue/GHO-242)). Row **inv-2** is selected and expanded in the initial
fixture. Writable `ref` v-models accept composable updates. Column `cell` hooks are
**functions** — call `cell.column.cell(context)`; when the hook returns a VNode,
`GhostDataTableTable` normalizes rendering (manual composition may use a small
`DataTableCell` helper).

### Renderless root slot bindings

| Binding                                         | Host                                   | Contract                                                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tableRootProps`                                | `GhostTable` root wrapper or `<table>` | `aria-busy` when `loading`; `data-ghost-data-table`; optional `aria-labelledby` / `aria-label` from consumer                                                             |
| `getHeaderCellProps(columnId)`                  | `GhostTableHeaderCell`                 | `scope: 'col'`; `aria-sort` on the sorted column only: `ascending` or `descending`; omitted when unsorted (phase-one single sort); `data-sort` for styling               |
| `getRowProps(rowId)`                            | `GhostTableRow` (data row)             | `data-selected="true"` when selected; `data-expanded="true"` when expanded (boolean data attributes, independent)                                                        |
| `headers`                                       | —                                      | Column header models (`column`, `toggleSort`, …) independent of body row count                                                                                           |
| `detailRowProps`                                | expansion `<tr>` via `GhostTableRow`   | Keeps `GhostTableRow` `data-part="row"`; adds **`data-detail-row="true"`** (consumer merge must not overwrite `data-part`; see below)                                    |
| `rows`                                          | —                                      | Rows from `getRowModel()` with `cells`, selection helpers, etc.                                                                                                          |
| `headerSelectionState`                          | header `GhostCheckbox`                 | `{ allSelected, someSelected }` over the **select-all target** (local: `getPrePaginationRowModel()` ids; server: `getRowModel()` ids)                                    |
| `toggleAllRowsSelected`                         | header checkbox                        | Toggles every id in that same target set (not the current page only when local)                                                                                          |
| `getSortButtonProps(columnId, options?)`        | sort `button` in `<th>`                | `type="button"`; **`aria-label`** on the **button**; does **not** set `aria-sort` (parent `<th>` via `getHeaderCellProps`)                                               |
| `getRowSelectionCheckboxProps(rowId, options?)` | row `GhostCheckbox`                    | **`aria-label`** merged onto the **focusable checkbox control** (not wrapper-only)                                                                                       |
| `getHeaderSelectionCheckboxProps(options?)`     | header `GhostCheckbox`                 | **`aria-label`** on the header checkbox input; pair with `headerSelectionState`. Icon-only `<th>` also needs a **column name** (`aria-label` on `<th>` or visible text). |
| `getRowExpandButtonProps(rowId, options?)`      | expand `button`                        | **`aria-label`** and **`aria-expanded`** on the **button**; `aria-controls` → detail row id; **Space** toggles when focused                                              |
| `pagination`, `pageCount`, `rowCount`           | `GhostPagination`                      | Effective (clamped) pagination, pager page count, and query-wide row count ([Pagination](#pagination))                                                                   |
| `setPageIndex(pageIndex)`                       | `GhostPagination` `update:modelValue`  | Commits a page: clamps, writes the `pagination` v-model, one `stateChange` with `manualPagination`                                                                       |

Sort direction on headers is **single-column** in phase one (at most one entry in
`sorting`).

**Standalone interaction helpers** ([GHO-236](https://linear.app/ghost-vue/issue/GHO-236)):
the slot getters above delegate to exported pure functions that take a
`useGhostDataTable` return as their first argument, for layouts without the
root: `getDataTableHeaderCellProps(table, columnId)`,
`getDataTableSortButtonProps(table, columnId, options?)`,
`getDataTableRowSelectionCheckboxProps(table, rowId, options?)`,
`getDataTableHeaderSelectionCheckboxProps(table, options?)`, and
`getDataTableRowExpandButtonProps(table, rowId, options?)` (options add `id`
and `detailRowId`; the root fills both). They return attributes only, never
listeners. The root's expand button props carry a generated **`id`**; it is the
focus-restore target for [focus on collapse](#keyboard-interaction), so keep it
when spreading. Focus restore belongs to the root; standalone layouts own their
own focus handling.

**`GhostDataTableTable` slots:** for each column `id`, optional
`#${columnId}="{ row, rowId, rowIndex, value, getValue, column }"` with
**`value` typed** when the column came from `defineDataTableColumns` and the
same array is passed to the renderer's optional `columns` prop. `columns` also
picks and orders the rendered columns by `id` (ids the root lacks are skipped);
it defaults to every root column. A slot wins over the column `cell` hook,
which wins over the plain value. Header text falls back to the column `id`, so
no `<th>` is empty. Sortable columns (`canSort`) get a native sort button named
by the header text; `aria-sort` stays on the `<th>`. The renderer reads the
same bindings as the default slot (provided by the root), and attributes such
as `class` or `contain-horizontal` fall through to `GhostTable`.

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

| Event                        | Sorting | Filters | Pagination reset                                                                                                                                                                                                                       |
| ---------------------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `globalFilter` change        | kept    | updated | **`manualFiltering: true`:** **page → 1** (server refetch). **`manualFiltering: false`:** keep `pageIndex`, then **clamp** (full-local and page-local). **Recorded (Zac):** page-local on server page stays on page 4 without refetch. |
| `columnFilters` change       | kept    | updated | Same as `globalFilter`.                                                                                                                                                                                                                |
| `pagination.pageSize` change | kept    | kept    | **page → 1**                                                                                                                                                                                                                           |
| `data` reference change      | kept    | kept    | **`manualPagination: false`:** keep index, **clamp** (no unconditional reset). **`manualPagination: true`:** keep index when only the page slice was replaced.                                                                         |
| `sorting` change             | updated | kept    | kept (then clamp if `pageCount` shrinks)                                                                                                                                                                                               |

**Selection / expansion** on filter/pagination events: **kept** (pruning rules below).

**Pagination reset acceptance:**

| Setup                                                                      | Action on page 4            | Expected pagination | `stateChange` / server requests       |
| -------------------------------------------------------------------------- | --------------------------- | ------------------- | ------------------------------------- |
| `manualPagination: true`, **`manualFiltering: false`** (page-local filter) | Change global/column filter | **Stay on page 4**  | **Zero** (no server refetch)          |
| `manualPagination: true`, **`manualFiltering: true`** (server filter)      | Change filter               | **page → 1**        | **Exactly one** fetch with new filter |

**Comparison note (PrimeVue):** Prime’s paginator commonly **resets the page on
filter**. GhostVue **`manualPagination` + `!manualFiltering`** keeps **page 4**
with zero requests when filtering page-locally — deliberate ([PR #269](https://github.com/zprue743/ghostvue/pull/269) parity harness).

**Selection / expansion pruning:**

Automatic pruning runs **only** when the input is the **full collection** the
table owns end-to-end: **`manualPagination: false` and `manualFiltering: false`**.
On `data` reference change, drop ids that no longer appear among **source rows**
in the new array (keyed by `getRowId`). **Do not prune** because a row is hidden
by filter, pagination slice, or a transient server response.

| Mode                                                                                     | Prune on filter hiding a row?     | Prune when server `data` omits a selected id?                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Local full (`manualPagination` + `manualFiltering` both `false`)                         | No (hidden ≠ removed from source) | N/A                                                                                                          |
| **Server filter, local pagination** (`manualFiltering: true`, `manualPagination: false`) | No                                | **No** — preserve ids across filtered responses until consumer replaces full source or user clears selection |
| **Server page** (`manualPagination: true`)                                               | No                                | **No** — ids stay when changing pages or filtered page payloads                                              |

Required tests:

- Local: select A, filter hides A, refresh `data` with same entities, clear filter → A still selected.
- **Server filter + local pagination:** select A → server response excludes A → clear filter → A still selected.

### Events, callbacks, slots, and exposed methods

- **`stateChange`** — `DataTableStateChangePayload`. Fired **once per user
  action** after coalesced updates (e.g. **server** filter on page 4 → one emit
  with `query.pagination.pageIndex === 1` and new filter; **page-local** filter on
  page 4 → **no** `stateChange`). Server consumers should
  fetch from `payload.query` only, not from separate v-model handlers.
- **Filter + pagination coalescing:** When **`manualFiltering: true`** resets
  `pageIndex` to **1**, emit **exactly one** `stateChange` whose `query` carries
  **both** the new filter **and** `pagination.pageIndex === 1`, with
  `trigger: 'globalFilter' | 'columnFilters'`. **Do not** emit a second
  `stateChange` (or pagination-only server fetch) for the automatic page reset in
  the same user action.
- **`update:*`** — still emitted for each affected v-model (same tick ordering as
  combinatorial updates; tests assert single fetch).
- Default slot — bindings in table above.
- `header`, `cell`, `expandedRow` slots — optional overrides.
- Exposed: `toggleAllRowsSelected`, `toggleRowSelected`, `toggleRowExpanded`,
  `resetRowSelection`, **`retry()`** (re-emits `stateChange` with the current
  `query` and a **fresh composable-minted `requestId`**; consumers must not
  invent ids), etc.

`useGhostDataTableServerRequest` — `{ begin(requestId), isLatest(requestId) }`
([combobox async pattern](/specs/combobox#useghostcomboboxasyncsearch)),
exported from `@ghostvue/vue` with its return type
`UseGhostDataTableServerRequestReturn`
([GHO-239](https://linear.app/ghost-vue/issue/GHO-239)). It holds a plain
number (no reactivity or lifecycle); create one per table instance. `begin`
records the id as given, because ids are monotonic only within one
`useGhostDataTable` call and restart at 1 when the table remounts.

### Select-all behavior

Header checkbox and **`headerSelectionState`** use the **same row-id set** as
**`toggleAllRowsSelected`**.

| Mode                              | Select-all target                | Effect                                                                                                                 |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Local (`manualPagination: false`) | **`getPrePaginationRowModel()`** | All rows matching current filters/sort **across pages** (not only the current page).                                   |
| Server (`manualPagination: true`) | **`getRowModel()`**              | Visible subset of the loaded page after page-local processing (e.g. 3 of 25). Cross-page ids stay in `selectedRowIds`. |

Header mixed state uses **`indeterminate`** on `GhostCheckbox`
([checkbox-spec](/specs/checkbox)).

**Acceptance (local):** 100 rows, page size 25, filter matches **40** →
select-all adds **40** ids (including rows not on the current page); navigating
pages does not drop them.

**Acceptance (server + page-local filter):** load 25 rows, filter to 3 visible,
select-all selects exactly those 3; clear filter; prior cross-page selections
unchanged.

**Comparison note (PrimeVue, [PR #269](https://github.com/zprue743/ghostvue/pull/269)):**
[PrimeVue DataTable](https://primevue.dev/datatable/) header select-all is **page-scoped**
by default. GhostVue’s **local** rule — all ids in
**`getPrePaginationRowModel()`** across pages — is **intentional** and matches Zac’s
recorded decision, not Prime’s default.

### Derived models

| Model                        | Definition                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getPrePaginationRowModel()` | After sort + filter on the processing input (`data` or full local set per matrix); **before** pagination slice.                                                                            |
| `getRowModel()`              | Rows rendered in the body (`rows` in the default slot) — after matrix processing **and** pagination slice when local pagination applies. Select-all uses this set only in **server** mode. |
| `getPaginationRowModel()`    | **Alias of `getRowModel()`** in phase one (same reference; no second row list).                                                                                                            |
| `getSelectedRowModel()`      | Objects for ids in `selectedRowIds` that appear in the current `getRowModel()` (for display only; full id list may be larger on server).                                                   |

## State model

### Sorting

- Phase one: **at most one** `DataTableColumnSort` entry.
- Tri-state: none → asc → desc → none.
- `aria-sort` only on the sorted column's `<th>`.

### Filtering

- Follow [Default filtering contract](#default-filtering-contract-approved) when local filtering runs.
- Debouncing: **consumer-owned** (composable updates on every bound filter change).
- Empty `getRowModel()`: head + filters remain; body shows empty state row.
- **Page after a filter change** ([GHO-237](https://linear.app/ghost-vue/issue/GHO-237)):

  | Mode                                                | `pageIndex` after the filter change                                  | `stateChange`                                                                                      |
  | --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
  | `manualFiltering: true` (server filter)             | **1**, written in the same action                                    | **One**, `trigger` `globalFilter` / `columnFilters`, `query.pagination.pageIndex: 1`; no follow-up |
  | Full local (`manualPagination` and filtering false) | Kept; clamped to the last valid page when the filtered count shrinks | None                                                                                               |
  | Page-local (`manualPagination: true` only)          | Kept, even when the visible slice is empty                           | None                                                                                               |

  Widening a filter never restores an earlier page. Server filtering never
  prunes selection or expansion, so ids selected on any page survive a
  filter → clear cycle.

#### Toolbar composition and consumer-owned debouncing

The composable applies every filter write immediately; with
`manualFiltering: true` every committed value is one `stateChange` (one fetch).
Debounce **before** committing, and commit clears immediately. Commit user
edits through the table's actions (`setGlobalFilter`, `setColumnFilter`,
`setColumnFilters` on the template ref): they apply the page-reset rule above
and emit `stateChange`. A parent writing the bound v-model ref directly is a
state restore, like [URL hydration](#server-state-url-back-and-retry): the rows
re-filter but no page reset or `stateChange` happens. Until
`docs/components/data-table.md` ships
([GHO-247](https://linear.app/ghost-vue/issue/GHO-247)), this is the reference
composition; `packages/vue/src/GhostDataTable.toolbar-filter.test.ts` mounts the
same structure.

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import {
  GhostButton,
  GhostDataTable,
  GhostInput,
  GhostToolbar,
  type DataTableColumnFilter,
  type GhostDataTableExposed,
} from '@ghostvue/vue'

const table = useTemplateRef<GhostDataTableExposed<Invoice>>('table')
const search = ref('') // what the field shows, updated on every keystroke
const globalFilter = ref('') // what the table filters by (v-model mirror)
const columnFilters = ref<DataTableColumnFilter[]>([])

let timer: ReturnType<typeof setTimeout> | undefined
function onSearch(value: string): void {
  search.value = value
  clearTimeout(timer)
  timer = setTimeout(() => table.value?.setGlobalFilter(value), 250)
}
onBeforeUnmount(() => {
  clearTimeout(timer)
})

const paidOnly = computed(() =>
  columnFilters.value.some((f) => f.id === 'status' && f.value === 'paid'),
)
function togglePaid(): void {
  table.value?.setColumnFilter('status', paidOnly.value ? '' : 'paid')
}
function clearFilters(): void {
  clearTimeout(timer) // a pending keystroke must not re-apply the old text
  search.value = ''
  table.value?.setGlobalFilter('')
  table.value?.setColumnFilters([])
}
</script>

<template>
  <div class="invoice-filters">
    <label>
      Search invoices
      <GhostInput
        :model-value="search"
        type="search"
        @update:model-value="onSearch"
      />
    </label>
    <GhostToolbar label="Invoice filters">
      <GhostButton :aria-pressed="paidOnly" @click="togglePaid"
        >Paid only</GhostButton
      >
      <GhostButton @click="clearFilters">Clear filters</GhostButton>
    </GhostToolbar>
  </div>
  <GhostDataTable
    ref="table"
    v-model:global-filter="globalFilter"
    v-model:column-filters="columnFilters"
    :data="invoices"
    :columns="columns"
    :get-row-id="(row) => row.id"
    aria-label="Invoices"
  >
    <!-- GhostTable composition as in example (b) -->
  </GhostDataTable>
</template>
```

- **Search field beside, not inside, `GhostToolbar`.** Roving arrow keys are
  ignored in text fields (the caret owns them), so a field inside
  `role="toolbar"` is an arrow-key dead end inside the toolbar's single `Tab`
  stop. Keep the labelled field its own `Tab` stop and put buttons and
  toggles in the toolbar.
- **Server mode:** add `manual-filtering` (and `manual-pagination` /
  `row-count` as needed) and fetch from `@state-change`; each debounced commit
  produces one request for page 1. Unchanged writes are no-ops, so **Clear
  filters** emits one request per dimension it actually clears. Stale
  responses are rejected by `requestId` (see [Async behavior](#async-behavior)),
  so debouncing reduces traffic but is not the race guard.
- The library ships **no** debounce option: delay, leading/trailing edge,
  `Enter`-to-search, and IME handling stay app decisions (Zac, PR #265).

### Pagination

- Shared **1-based** `pageIndex` with `GhostPagination`.
- Whenever **`pageIndex > pageCount`**, **clamp** to `pageCount` (Zac approved).
- **`rowCount === 0`:** **`pageCount` 1**, **`pageIndex` 1** (query-wide empty).
- **`rowCount > 0`** with empty **`getRowModel()`:** keep **`pageIndex`** (page-local
  filter on a server page does not coerce page 1).
- **Which `rowCount`** ([GHO-238](https://linear.app/ghost-vue/issue/GHO-238)):
  with `manualPagination` it is the `rowCount` prop (the server total for the
  query), never the loaded page length; otherwise the filtered local row count.
- **When the clamp runs:** whenever the derived `pageCount` changes (filter
  shrink, local `data` reference change, server `rowCount` or `pageCount`
  change). The clamp writes the `pagination` v-model once. With
  `manualPagination` it also emits **exactly one** `stateChange`
  (`trigger: 'pagination'`, clamped `query.pagination`) so the consumer fetches
  the page it now shows; the parent's v-model echo emits nothing more. A
  `pagination` value restored out of range (URL hydration, first render) is
  clamped on read only: no write and no `stateChange`.

#### GhostPagination wiring

Co-locate `GhostPagination` in the root's default slot and bind it to the root,
not to `data.length`. Only the root knows the filtered count, the server
`rowCount`, the `pageCount` override, and the empty → page 1 rule, and only
`setPageIndex` emits the server `stateChange`:

```vue
<GhostDataTable v-model:pagination="pagination" aria-label="Invoices" ...>
  <template #default="{ pagination: page, pageCount, setPageIndex, ...table }">
    <GhostTable v-bind="table.tableRootProps"><!-- rows --></GhostTable>
    <GhostPagination
      :model-value="page.pageIndex"
      :page-count="pageCount"
      aria-label="Invoice pages"
      @update:model-value="setPageIndex"
    />
  </template>
</GhostDataTable>
```

- Give the pager its own name (`aria-label`) when the page has more than one
  `navigation` landmark.
- `v-model="pagination.pageIndex"` (examples (a) and (a′)) mutates the bound
  object in place. It is fine for local tables with no filter, but it bypasses
  `setPageIndex`, so a server table emits no `stateChange` for the click.
- Executable reference: `examples/data-table/paginated-invoices.vue` (local
  search clamps the page; zero matches show page 1 of 1). The Playwright spec
  `tests/e2e/ghost-data-table-pagination.spec.ts` runs axe on it with the pager
  on several pages and empty (zero violations).

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

| State      | Behavior                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loading`  | `aria-busy="true"` via `tableRootProps`                                                                                                                                                                                                                                                        |
| Empty body | `GhostEmptyState` when **`getRowModel()`** has no rows. **`rowCount === 0`:** `pageCount` 1, `pageIndex` 1. **`rowCount > 0`** with an empty visible slice (page-local filter on server page 4): **keep `pageIndex`**, zero `stateChange` (aligned with recorded pagination reset acceptance). |
| `disabled` | No emits from controls                                                                                                                                                                                                                                                                         |

### Async behavior

1. User action → coalesced v-models + **one** `stateChange`.
2. Consumer: `loading = true`; `begin(payload.requestId)`.
3. Apply `data` / `rowCount` / `error` only if `isLatest(requestId)`.
4. **`finally` blocks** from stale requests must not clear `loading`, rows, totals,
   or error state for a newer in-flight or completed request (tie-break with
   `requestId`, not wall-clock alone).

```ts
const request = useGhostDataTableServerRequest()

async function onStateChange({
  requestId,
  query,
}: DataTableStateChangePayload) {
  request.begin(requestId) // synchronously, before any await
  loading.value = true
  try {
    const page = await fetchInvoices(query)
    if (!request.isLatest(requestId)) return
    data.value = page.rows
    rowCount.value = page.total
    error.value = undefined
  } catch (cause) {
    if (request.isLatest(requestId)) error.value = cause
  } finally {
    if (request.isLatest(requestId)) loading.value = false
  }
}
```

Unit race tests for this loop (deferred responses resolved out of order, stale
failure and stale `finally`, `retry()` superseding a pending request, and the
filter-on-page-4 acceptance below) live in
`packages/vue/src/use-ghost-data-table.server-request.test.ts`.

**Required acceptance tests:**

- With **`manualFiltering: true`** and server pagination on page 4, changing a
  filter produces **exactly one** fetch for **page 1** with the new filter (stale
  page-4 response rejected).
- With **`manualFiltering: false`** (page-local) on page 4, changing a filter
  keeps **page 4** and emits **no** `stateChange`.

### Server state, URL, Back, and Retry

Consumer-owned fetching; the composable owns **query state** and **request
identity** only. Pattern aligned with
[PrimeVue stateful tables](https://primevue.dev/datatable/#stateful).

| Concern                             | Contract                                                                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **URL hydration**                   | Applying `sorting` / `columnFilters` / `globalFilter` / `pagination` from a route or `history.state` on mount **does not emit `stateChange`** (no echo loop). Consumer may fetch once explicitly when the route is first entered. |
| **One request per committed query** | Each user-driven commit that changes the effective server `query` emits **one** `stateChange` → **one** consumer fetch. Retries are explicit consumer actions, not automatic duplicate emits.                                     |
| **Browser Back**                    | While a fetch is pending, Back restores prior query props; composable bumps `requestId`; stale responses must not apply; **only the latest `requestId` may mutate** `data`, `rowCount`, `loading`, or error UI.                   |
| **Retry**                           | Call exposed **`retry()`** on the table/composable: re-emits **`stateChange`** with the **same** `query` and a **new internal `requestId`** (consumers cannot mint ids). Failed state stays visible until a successful response.  |

**Executable example:** `examples/data-table/server-invoices-router.vue` — query
string encoding sort, status filter, and page, read and written through a small
router-style URL adapter (`window.history` by default; with Vue Router, read
`route.query` and write with `router.push`). The workspace has no router
dependency, so the example does not add one. It demonstrates open filtered
URL → change sort → **Back** during pending request → **Retry** after error.
Applying URL state is silent; the example fetches the restored query once through
`retry()`, so Back mints a newer `requestId` and the pending response cannot
apply. Tests: `tests/integration/data-table-server-invoices-router-example.test.ts`
(single fetch per action, no hydration `stateChange`, both stale orders after
Back, retry, server filter on page 4 → page 1 + one request) and
`tests/e2e/ghost-data-table-server-router.spec.ts` (real browser Back).
`manualFiltering` is table-wide, so the page-local filter case (page 4 → stay)
is covered by the unit race tests rather than this server-filtered example.

**Required tests:** URL restore silent; sort+Back race; retry does not double-fetch;
stale `finally` does not clear newest spinner; page-local vs server filter pagination.

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

**Customization survival** ([PrimeVue accessibility notes](https://primevue.dev/datatable/#accessibility)):
required browser test with a **custom sort header** (non-default label/icon): after
`Enter`, focus remains on the sort **button**, parent `<th>` reflects new
`aria-sort`. Expansion and selection use the typed prop helpers above so custom
labels stay localized without dropping ARIA. **`aria-label`**, **`aria-expanded`**, and
checkbox naming must land on the **focusable** control (native `input` / `button`),
not wrapper-only — icon-only header cells need an accessible column name
(prototype [axe findings](https://github.com/zprue743/ghostvue/pull/269)).

**Focus when detail row collapses:** if focus lies inside a detail row that
collapses (toggle, filter, or `allowMultipleExpanded`), move focus to that row’s
**expansion button** (the control from `getRowExpandButtonProps`). Required test
with Playwright `toBeFocused()`.

### Assistive technology

- Mixed select-all: DOM `indeterminate` on header checkbox (see checkbox spec).
- Optional live region for async refetch: consumer-owned.

## Rendering and customization

- `GhostTable` `data-part` hooks unchanged.
- Header sort styling: `data-sort="asc" | "desc"`.
- **Selected row:** `data-selected="true"` on `GhostTableRow` (not `data-state`).
- **Expanded data row:** `data-expanded="true"` on data `<tr>`.
- **Detail row:** `GhostTableRow` keeps `data-part="row"` from
  `mergeGhostTablePartAttrs` (consumer attrs cannot replace `data-part`);
  `detailRowProps` adds **`data-detail-row="true"`** for styling
  (`.ghost-table-row[data-detail-row]`). Do not set `data-part="detail"` alone.
- Selected and expanded may both be true on the data row.

## Environment behavior

### SSR and hydration

Deterministic markup for a given props snapshot; checkbox `indeterminate` via
post-mount effect per checkbox spec.

### Mobile and touch

`GhostTable.containHorizontal` for overflow.

## Performance

- Local 10k-row processing with **paginated DOM** (O(pageSize) rows).
- Benchmark file: `tests/bench/data-table-processing.bench.ts`. Run it with
  `pnpm bench:data-table` (not part of `pnpm verify`). It times the sort and
  filter stages, the composable pipeline, and a mounted 25-row page at 1k, 5k,
  and 10k rows.
- Proposed p95 &lt; 25ms and heap delta &lt; 5MB: **informational until CI
  variance is understood**; not a gate in phase one.

**Deterministic regression checks (required in unit/integration tests):**

| Scenario                            | Assertion                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Page change after local sort        | Comparator / `sortFn` **not invoked again** (zero additional sort passes). |
| Toggle selection on one visible row | **Zero** sort or filter callback invocations.                              |

These counters live in `packages/vue/src/use-ghost-data-table.counters.test.ts`
(whole sort and filter passes, including the default comparator) and
`packages/vue/src/use-ghost-data-table.test.ts` (consumer `sortFn`, `filterFn`,
and accessor callbacks).

**Proposed later task (not this PR):** production-browser comparison on
identical 10k `Invoice` rows, same three columns and page size, GhostVue vs
PrimeVue `DataTable`, measuring **input-to-paint** for sort, filter, and
row selection. Document methodology in
`docs/contributing/data-table-benchmark-comparison.md` when scheduled; **no
PrimeVue dependency** in the GhostVue repo.

## Composition

Reuses `GhostTable*`, `GhostPagination`, `GhostCheckbox`, `GhostEmptyState`,
`useControllableState`. Phase one shipped headless only; `0.1.0` themed
wrappers in `@ghostvue/themes` compose over these exact headless primitives per
the [Themed `GhostDataTable` addendum](#themed-ghostdatatable-addendum).

## Test plan

- **Unit:** manual-processing matrix, empty `rowCount` pagination, coalesced
  `stateChange`, page-local vs global sort semantics.
- **Unit:** **`manualFiltering: true`** filter on server page 4 → **one**
  `stateChange` only (`trigger` filter + `pageIndex: 1` in `query`); **no**
  follow-up pagination `stateChange` in the same action.
- **Unit:** default filter contract (case, clear, OR/AND, omitted `filterFn`, null
  cell skip).
- **Unit:** server filter + local pagination selection survives filter cycle.
- **Acceptance:** local select-all over pre-pagination set (100 rows, page 25, 40
  matches filter).
- **Unit:** server select-all uses `getRowModel()` only (3-of-25 page-local filter).
- **Unit:** local pruning uses source `data` rows, not filtered view (select A,
  filter out A, refresh `data`, clear filter).
- **Acceptance:** cross-page selection test (pages 1 → 2 → 1).
- **Playwright (approval fixture b):** sort Amount; `Space` on inv-2 checkbox;
  `Space` on inv-2 **expand** button (collapse then reopen); filter to zero;
  `getByRole('heading', { name: 'No invoices' })` visible; headers mounted.
- **Acceptance:** filter on page 4 → single page-1 fetch; stale page-4 response ignored.
- **Acceptance:** server router example (URL hydrate, Back while pending, Retry).
- **Unit:** `useGhostDataTableServerRequest` races; stale `finally` cannot clear loading.
- **Unit:** performance regressions (page after sort, selection without sort/filter).
- **Vue:** basic (a) + full (b) examples hydrate; `GhostDataTableTable` slot types.
- **Browser:** custom sort header + `Enter`; focus restore on detail collapse.
- **Acceptance (implementation gate):** reference fixture (**(b)** and the
  preset (a′), `data-table/preset-invoices`) — **zero axe violations** on the table scope (`@axe-core/playwright`),
  including labeled icon-only header/selection cells, sort buttons, expansion
  controls, search input, and co-located `GhostPagination` (no empty `<th>`, no
  wrapper-only `aria-*` without focusable names).
- **Type:** `defineDataTableColumns` acceptance trio (`toFixed`, `toUpperCase` error, rename break).
- **Type:** generic slot contexts still expose `getValue(): unknown`.

## Documentation plan

- `docs/components/data-table.md` with **(a) basic** and **(b) full** paths first.
- `examples/data-table/basic-invoices.vue`, `preset-invoices.vue`, `full-invoices.vue`,
  `server-invoices-router.vue`.
- Link ADR 0014 and prerequisites.

## Compatibility and release impact

- Phase one exported from `@ghostvue/vue` only; the `0.1.0` themed addendum
  ([#316](https://github.com/zprue743/ghostvue/issues/316) →
  [#333](https://github.com/zprue743/ghostvue/issues/333)) adds
  opt-in layout slots to `@ghostvue/vue` `GhostDataTablePreset` and themed
  exports in `@ghostvue/themes` without breaking phase-one consumers.
- Changesets for `@ghostvue/vue` and `@ghostvue/themes` ship with Wave 2
  implementation (`#333`); docs-only spec revisions (`#316`) have no runtime
  impact.

## Themed GhostDataTable addendum

**Status** Approved by Zac in [PR #374](https://github.com/zprue743/ghostvue/pull/374).
Wave 2 implementation is tracked in [#333](https://github.com/zprue743/ghostvue/issues/333).

### Architectural decisions (`2026-11-25` roadmap review, Zac)

1. **Single-sort scope for `0.1.0` (decoupled from `#317`):** Themed
   `GhostDataTable` ships in `0.1.0` on **today's phase-one single-sort headless
   contract** (`aria-sort="ascending" | "descending"` plus
   `data-sort="asc" | "desc"` on the active `<th>` only, paired with
   `getSortButtonProps(columnId)` on the native `<button type="button">`).
   Multi-column sort ([#317](https://github.com/zprue743/ghostvue/issues/317))
   remains deferred to `0.3.0` on its independent spec track and no longer
   blocks `#316` or `#333`; any multi-sort priority badge in `0.3.0` will layer
   additively inside the sort header button without breaking `0.1.0` selectors
   or DOM contracts.
2. **Composable themed architecture
   ([ADR 0003](../adr/0003-public-component-api-conventions.md) &
   [ADR 0004](../adr/0004-headless-styled-layering.md)):**
   - **Headless preset layout slots (`@ghostvue/vue`):** `GhostDataTablePreset`
     gains camelCase layout slots `#toolbarStart`, `#toolbarEnd`,
     `#bulkActions`, and `#footer` alongside `#search`, `#toolbar`,
     `#<columnId>`, and `#detail`, with per-preset opt-in via `layoutSlots`
     in `packages/vue/src/ghost-data-table-preset.ts`. `@ghostvue/vue` owns all
     layout structure, state wiring, and focus restoration; it never imports
     `@ghostvue/themes`.
   - **Themed wrappers (`@ghostvue/themes`):** Exports themed `GhostDataTable`
     (`size?: 'sm' | 'md'`, `variant?: 'plain' | 'card'`,
     `stickyHeader?: boolean`), `GhostDataTableTable`, and
     `GhostDataTablePreset` (plus convenience re-exports of
     `defineDataTableColumns`, `useGhostDataTable`,
     `useGhostDataTableServerRequest`, the five `getDataTable*Props` helpers,
     and public DataTable types) backed by
     `packages/themes/src/ghost-data-table.css` inside `@layer ghostvue-theme`.
     Per ADR 0004, visual customization uses ordinary props, slots, `class` /
     `style` fallthrough, `data-*` hooks, and `--ghost-*` semantic tokens —
     never `pt` passthrough style maps.

### Headless `GhostDataTablePreset` layout slots (`@ghostvue/vue`)

#### Exact TypeScript contracts (`packages/vue/src/ghost-data-table-preset.ts`)

```ts
/** Props passed to `#bulkActions` while at least one row id is selected. */
export interface GhostDataTablePresetBulkActionsSlotProps {
  /**
   * Authoritative selected row ids from the parent `GhostDataTable` (includes
   * preserved cross-page selections when `manualPagination` is `true`).
   */
  selectedRowIds: readonly DataTableRowId[]
  /** `selectedRowIds.length`. Always `>= 1` while `#bulkActions` renders. */
  selectedCount: number
  /**
   * Clears every selected row id through the root's `resetRowSelection()`.
   * Inert (no-op) while the parent `GhostDataTable` is `disabled` or
   * `enableRowSelection` is `false`.
   */
  clearSelection: () => void
}

/** Props passed to `#footer`, mirroring the root's pagination slot bindings. */
export interface GhostDataTablePresetFooterSlotProps {
  /** Effective pagination (`pageIndex` 1-based, clamped to `[1, pageCount]`). */
  pagination: DataTablePaginationState
  /** Effective page count (`1` when `rowCount === 0`). */
  pageCount: number
  /**
   * Query-wide row count (server `rowCount` when `manualPagination` is `true`;
   * filtered local count otherwise).
   */
  rowCount: number
  /**
   * Commits a page change through the root: clamps, writes `v-model:pagination`,
   * and emits one `stateChange` when `manualPagination` is `true`.
   */
  setPageIndex: (pageIndex: number) => void
}

/** Select the new regions that this preset owns on this instance. */
interface GhostDataTablePresetLayoutSlots {
  toolbarStart?: () => unknown
  toolbarEnd?: () => unknown
  bulkActions?: (props: GhostDataTablePresetBulkActionsSlotProps) => unknown
  footer?: (props: GhostDataTablePresetFooterSlotProps) => unknown
}

type LayoutSlotName = keyof GhostDataTablePresetLayoutSlots

// Addition to GhostDataTablePresetProps<TColumns, TLayout = never>:
// layoutSlots?: readonly TLayout[]
// Infer TLayout from this prop alone. Omission and [] opt into no regions.
export type GhostDataTablePresetSlots<
  TColumns extends readonly DataTableTableColumnRef[],
  TLayout extends LayoutSlotName = never,
> = Omit<GhostDataTableTableSlots<TColumns>, NoInfer<TLayout>> &
  Pick<GhostDataTablePresetLayoutSlots, NoInfer<TLayout>> & {
    /** Content of an expanded row's detail `<tr>` (one cell spanning the row). */
    detail?: (
      props: GhostDataTablePresetDetailSlotProps<
        DataTableColumnRow<TColumns[number]>
      >,
    ) => unknown
    /** Unopinionated region rendered before the header bar and table. */
    toolbar?: () => unknown
    /** Replaces the default search field (for example to debounce input). */
    search?: (props: GhostDataTablePresetSearchSlotProps) => unknown
  }
```

**Root context and slot ownership**

- `GhostDataTableContext` (`packages/vue/src/ghost-data-table-table.ts`) adds
  `selectedRowIds: () => readonly DataTableRowId[]` and
  `resetRowSelection: () => void` from the root `useGhostDataTable` instance;
  `#footer` reads `pagination`, `pageCount`, `rowCount`, and `setPageIndex`
  through the existing `withBindings` bridge so manual `#default` and preset
  `#footer` can never drift.
- By default the preset owns only `detail`, `toolbar`, and `search`. Each
  of the four new names remains available to the existing cell renderer. For
  example, a column named `footer` calls `#footer="{ value }"` once per row,
  including after a reorder, an empty result, or an asynchronous column insert.
- To supply layout content, opt into its names on the preset, e.g.
  `:layout-slots="['toolbarEnd', 'bulkActions']"`. These two names belong
  to layout on this instance, leaving `#footer` available for cells. An
  enabled name is reserved even while its region is hidden or its slot is
  absent. For a column with that same id, use its `cell` hook or ordinary
  value fallback. A slot function is invoked in exactly one role.
- Resolve ownership from the opt-in list before testing slot presence for
  chrome and before cell lookup. Row count, column visibility, order, and
  selection never change that decision. Both presets expose the same prop
  and slot types.

#### Preset DOM order and conditional regions

`GhostDataTablePreset` renders only the chrome regions that have active content,
in strict top-to-bottom DOM order. Below, `layout` contains only the slots
selected by `layoutSlots` and supplied by the consumer:

1. **Legacy pre-header slot (`#toolbar`):** rendered as-is before the header bar
   when `$slots.toolbar` is present, preserving exact phase-one markup order for
   existing consumers.
2. **Header bar (`<div data-part="header" class="ghost-data-table-header">`):**
   rendered iff `searchVisible || layout.toolbarStart || layout.toolbarEnd`.
   - `<div v-if="layout.toolbarStart" data-part="toolbar-start">` wrapping
     `<slot name="toolbarStart" />`.
   - `<div v-if="searchVisible" data-part="search">` wrapping
     `<slot name="search" v-bind="searchSlotProps">` (default labelled
     `GhostInput type="search"`). Keeping `[data-part="search"]` as a sibling of
     `[data-part="toolbar-start"]` and `[data-part="toolbar-end"]` preserves the
     phase-one accessibility invariant: the search input remains its own `Tab`
     stop outside any consumer `GhostToolbar` (`role="toolbar"`).
   - `<div v-if="layout.toolbarEnd" data-part="toolbar-end">` wrapping
     `<slot name="toolbarEnd" />`.
3. **Bulk-actions bar (`<div data-part="bulk-actions" class="ghost-data-table-bulk-actions">`):**
   rendered iff `rowSelectionEnabled && selectedCount > 0 && layout.bulkActions`,
   wrapping `<slot name="bulkActions" v-bind="bulkActionsSlotProps" />`. No
   `role="alert"` or `aria-live` is placed on this container (row and header
   checkboxes already announce checked state changes).
4. **Table (`<GhostTable v-bind="tableProps">`):** fallthrough attributes
   (`class`, `style`, `contain-horizontal`, `scroll-label`, `aria-label`) on
   `GhostDataTablePreset` continue to forward onto `GhostTable` exactly as in
   phase one. Sortable headers in both `GhostDataTableTable` and
   `GhostDataTablePreset` expose the native button via `data-part="sort-button"`.
   The headless button renders its header label and retains its focus and
   interaction bindings. Its accessible name is the same in either package.
   Row expand buttons in `GhostDataTablePreset` add `data-part="expand-button"`.
5. **Footer bar (`<div data-part="footer" class="ghost-data-table-footer">`):**
   rendered iff `layout.footer` is present, wrapping
   `<slot name="footer" v-bind="footerSlotProps" />`.

### Themed wrappers and exports (`@ghostvue/themes`)

#### Public exports

`@ghostvue/themes` exports:

| Export                                           | Source                                           | Contract                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `GhostDataTable`                                 | `packages/themes/src/ghost-data-table.ts`        | Generic `<TData>` themed root wrapper adding `size`, `variant`, and `stickyHeader` over headless `GhostDataTable`. |
| `GhostDataTableTable`                            | `packages/themes/src/ghost-data-table-table.ts`  | Generic `<TColumns>` themed table mapper preserving typed `#<columnId>` slots.                                     |
| `GhostDataTablePreset`                           | `packages/themes/src/ghost-data-table-preset.ts` | Generic `<TColumns>` themed preset preserving typed `#<columnId>`, `#detail`, and all camelCase layout slots.      |
| `defineDataTableColumns`                         | re-export from `@ghostvue/vue`                   | Single-import convenience for typed column definitions.                                                            |
| `useGhostDataTable`                              | re-export from `@ghostvue/vue`                   | Headless state composable for custom layouts alongside themed parts.                                               |
| `useGhostDataTableServerRequest`                 | re-export from `@ghostvue/vue`                   | Monotonic `requestId` guard for async server tables.                                                               |
| `getDataTable*Props` (all 5 interaction helpers) | re-export from `@ghostvue/vue`                   | Attribute helpers for manual `GhostTable*` composition inside themed `GhostDataTable`.                             |
| `GhostDataTableSize`, `GhostDataTableVariant`, … | `packages/themes` + `@ghostvue/vue` type exports | Visual prop unions, `GhostDataTableThemedProps<TData>`, `GhostDataTableThemedExposed<TData>`, and `DataTable*`.    |

#### Themed `GhostDataTable` props and host contract

```ts
export type GhostDataTableSize = 'sm' | 'md'
export type GhostDataTableVariant = 'plain' | 'card'

export interface GhostDataTableThemedProps<
  TData,
> extends GhostDataTableProps<TData> {
  /**
   * Cell padding, typography, and embedded control density. Default `'md'`
   * omits `data-size` so CSS treats an absent hook as `'md'`.
   * @default 'md'
   */
  size?: GhostDataTableSize
  /**
   * Outer surface treatment. `'plain'` omits `data-variant` (flush rules only);
   * `'card'` sets `data-variant="card"` for an elevated bordered container.
   * @default 'plain'
   */
  variant?: GhostDataTableVariant
  /**
   * Pins column headers (`thead th`) to the block start of the nearest scroll
   * container (`data-sticky-header` when `true`, omitted when `false`).
   * @default false
   */
  stickyHeader?: boolean
}

export interface GhostDataTableThemedExposed<
  TData,
> extends GhostDataTableExposed<TData> {
  /** Outer `.ghost-data-table` wrapper element after mount. */
  readonly element: HTMLElement | null
}
```

**Wrapper invariants:**

- **Real host element for visual hooks:** Headless `GhostDataTable` is
  renderless (`<slot v-bind="slotProps" />`), whereas themed `GhostDataTable`
  renders a single outer
  `<div class="ghost-data-table ghost-themed-scope" data-part="root" data-themed>`
  around the headless root. Including `.ghost-themed-scope` on the host
  automatically themes every nested Ghost primitive rendered inside the table
  (`GhostTable`, `GhostCheckbox`, `GhostInput`, `GhostEmptyState`, and a
  co-located `GhostPagination`) without requiring `@ghostvue/vue` to import
  `@ghostvue/themes`.
- **`ariaLabel` / `ariaLabelledby` routing (axe `aria-prohibited-attr` guard):**
  `ariaLabel` and `ariaLabelledby` are declared props forwarded exclusively to
  the inner headless `GhostDataTable` (landing on the native `<table>` via
  `tableRootProps`). They must **never** be duplicated onto the outer generic
  `<div class="ghost-data-table">`, which has no ARIA role.
- **Attribute merge and generics:** Consumer `class`, `style`, and other
  non-prop attributes merge onto `.ghost-data-table` without overwriting
  `ghost-data-table`, `ghost-themed-scope`, `data-part="root"`, or
  `data-themed`. Generic `defineComponent` signatures in
  `packages/themes/src/ghost-data-table*.ts` must preserve `<TData>` on
  `GhostDataTable` and `<TColumns extends readonly DataTableTableColumnRef[]>`
  on `GhostDataTableTable` and `GhostDataTablePreset` under `tsc` declaration
  emit and `vue-tsc`.
- **Standalone themed child wrappers:** Themed `GhostDataTableTable` and themed
  `GhostDataTablePreset` also wrap or mark their output with
  `.ghost-themed-scope` (`display: contents` when wrapping) and `data-themed=""`
  so they render themed even when placed inside a headless `GhostDataTable` from
  `@ghostvue/vue`.

#### Worked themed example

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostButton,
  GhostDataTable,
  GhostDataTablePreset,
  GhostPagination,
  defineDataTableColumns,
  type DataTableRowId,
} from '@ghostvue/themes'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('customer', { header: 'Customer' }),
  helper.accessorKey('amount', { header: 'Amount' }),
]

const invoices = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
])
const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>([])
const pagination = ref({ pageIndex: 1, pageSize: 10 })
</script>

<template>
  <GhostDataTable
    v-model:global-filter="globalFilter"
    v-model:selected-row-ids="selectedRowIds"
    v-model:pagination="pagination"
    :data="invoices"
    :columns="columns"
    :get-row-id="(row) => row.id"
    enable-row-selection
    enable-row-expansion
    variant="card"
    size="sm"
    sticky-header
    aria-label="Invoices"
  >
    <GhostDataTablePreset
      :columns="columns"
      :layout-slots="['toolbarEnd', 'bulkActions', 'footer']"
      empty-title="No matching invoices"
      search-label="Search invoices"
    >
      <template #toolbarEnd>
        <GhostButton size="sm" variant="outline" tone="neutral">
          Export CSV
        </GhostButton>
      </template>
      <template #bulkActions="{ selectedCount, clearSelection }">
        <span>{{ selectedCount }} selected</span>
        <GhostButton
          size="sm"
          variant="ghost"
          tone="neutral"
          @click="clearSelection"
        >
          Clear selection
        </GhostButton>
      </template>
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
      <template #detail="{ row }">Invoice {{ row.id }} line items</template>
      <template
        #footer="{ pagination: page, pageCount, rowCount, setPageIndex }"
      >
        <span>{{ rowCount }} total</span>
        <GhostPagination
          size="sm"
          :model-value="page.pageIndex"
          :page-count="pageCount"
          aria-label="Invoice pages"
          @update:model-value="setPageIndex"
        />
      </template>
    </GhostDataTablePreset>
  </GhostDataTable>
</template>
```

### Styling hooks and CSS architecture (`packages/themes/src/ghost-data-table.css`)

#### Complete `data-*` and ARIA styling-hook map

| Surface                 | Selector / attribute                                           | Condition / values                                                              |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Themed root container   | `.ghost-data-table[data-themed]`, `data-part="root"`           | Always on themed `GhostDataTable`; carries `.ghost-themed-scope`                |
| Root density            | `data-size="sm"`                                               | Set when `size === 'sm'`; omitted for default `'md'`                            |
| Root surface variant    | `data-variant="card"`                                          | Set when `variant === 'card'`; omitted for default `'plain'`                    |
| Root sticky header      | `data-sticky-header=""`                                        | Set when `stickyHeader === true`; omitted when `false`                          |
| Root disabled state     | `data-state="disabled"`                                        | Set on themed root when `disabled === true`; omitted otherwise                  |
| Preset header bar       | `.ghost-data-table-header`, `data-part="header"`               | Rendered for visible search or a supplied, enabled toolbar slot                 |
| Preset header slots     | `data-part="toolbar-start"`, `"search"`, `"toolbar-end"`       | Direct children of `[data-part="header"]` when respective slot/search on        |
| Preset bulk-actions bar | `.ghost-data-table-bulk-actions`, `data-part="bulk-actions"`   | Rendered for enabled `bulkActions` with a slot and a nonempty enabled selection |
| Preset footer bar       | `.ghost-data-table-footer`, `data-part="footer"`               | Rendered when `footer` is enabled and supplied                                  |
| Table root              | `table.ghost-table[data-ghost-data-table]`, `data-part="root"` | Native `<table>` (`aria-busy="true"` while `loading`, omitted otherwise)        |
| Column header cell      | `th.ghost-table-header-cell`, `data-part="header-cell"`        | `scope="col"`; `aria-sort` + `data-sort="asc" \| "desc"` on sorted column       |
| Sort button             | `button[data-part="sort-button"]`                              | Sortable `<th>` control in `GhostDataTableTable` / `GhostDataTablePreset`       |
| Default sort indicator  | Themed sort button `::after`                                   | Decorative CSS mark painted by `@ghostvue/themes`                               |
| Expand button           | `button[data-part="expand-button"]`                            | Row disclosure toggle (`aria-expanded="true" \| "false"`)                       |
| Selected data row       | `tr.ghost-table-row[data-selected="true"]`                     | Boolean hook on selected body row (omitted when unselected)                     |
| Expanded data row       | `tr.ghost-table-row[data-expanded="true"]`                     | Boolean hook on expanded body row (independent of `data-selected`)              |
| Detail row              | `tr.ghost-table-row[data-detail-row="true"]`                   | Expansion detail `<tr>` (`data-part="row"` retained)                            |

#### Cascade layer, opt-in scoping, and child-combinator isolation

- **Zero specificity inside `@layer ghostvue-theme`:** Every rule in
  `packages/themes/src/ghost-data-table.css` sits inside `@layer ghostvue-theme`
  wrapped in `:where(...)` (keeping pseudo-elements such as `::after` outside
  `:where(...)` so LightningCSS preserves them). Consumer classes and scoped
  styles win without `!important`.
- **Headless isolation:** Rules must key off `.ghost-data-table[data-themed]`,
  `.ghost-data-table-preset[data-themed]`,
  `.ghost-table[data-ghost-data-table][data-themed]`, or `.ghost-theme
.ghost-data-table` — **never** bare `[data-ghost-data-table]` — because
  `@ghostvue/themes` CSS loads globally on docs and playground pages that also
  render unstyled headless DataTable examples.
- **Child-combinator part targeting:** Table section, row, cell, and header
  button selectors must step through direct child combinators (`> .ghost-table`,
  `> :is(.ghost-table-scroll-container) > .ghost-table`,
  `> .ghost-table-head > .ghost-table-row > .ghost-table-header-cell`,
  `> .ghost-table-body > .ghost-table-row > :is(.ghost-table-cell,
.ghost-table-header-cell)`). A nested `GhostTable` rendered inside an expanded
  `#detail` panel or custom cell must not inherit outer `data-selected`,
  `data-sticky-header`, `data-size="sm"`, or sort-header rules.
- **Variant and density token mapping:**
  - `variant="plain"` (default): vertical flex/grid stack (`gap:
var(--ghost-space-gap-md)`), flush borders from `ghost-table.css`.
  - `variant="card"` (`[data-variant='card']`): `--ghost-elevation-1-bg`,
    `var(--ghost-border-hairline-width) solid var(--ghost-elevation-1-border)`,
    `border-radius: var(--ghost-radius-lg)`,
    `box-shadow: var(--ghost-elevation-1-shadow),
var(--ghost-elevation-1-highlight)`. `[data-part="header"]`,
    `[data-part="bulk-actions"]`, and `[data-part="footer"]` use inset padding
    (`--ghost-space-inset-sm` / `--ghost-space-inset-md`) and hairline block
    dividers (`--ghost-border-default`) flush with the table edges.
  - `size="sm"` (`[data-size='sm']`): table font-size `--ghost-type-size-sm`,
    header/body cell padding `--ghost-space-inset-xs` block and
    `--ghost-space-inset-sm` inline, and `--ghost-control-size-sm-*` sizing on
    sort/expand controls and default preset search input (preserving
    `--ghost-control-touch-min` on coarse pointers).
  - `stickyHeader` (`[data-sticky-header]`): sets `position: sticky;
inset-block-start: 0; z-index: 1` on column header cells (`thead >
.ghost-table-row > .ghost-table-header-cell`) with opaque
    `--ghost-surface-muted-bg` (`Canvas` in `forced-colors: active`) and an
    inset block-end hairline `box-shadow` (`inset 0 calc(-1 *
var(--ghost-border-hairline-width)) 0 var(--ghost-border-default)`) so header
    dividers stay visible over scrolled rows under `border-collapse: collapse`.

#### Single-sort header button indicator (`0.1.0`)

- **Interactive target:** `.ghost-table-header-cell > button` (covering both
  `[data-part="sort-button"]` in `GhostDataTableTable` / `GhostDataTablePreset`
  and manual `<button v-bind="getSortButtonProps(id)">` compositions) fills the
  header cell inline axis (`inline-size: 100%`, `display: inline-flex`,
  `align-items: center`, `justify-content: space-between`,
  `gap: var(--ghost-space-gap-xs)`), inherits semibold header typography, resets
  native button chrome (`appearance: none; border: 0; background: transparent`),
  and applies a hover state layer (`color-mix(in oklch, var(--ghost-surface-fg)
calc(100% * var(--ghost-state-layer-hover)), transparent)`) when
  `:not(:disabled)`.
- **Focus ring:** `:focus-visible` draws
  `outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color)`
  with `outline-offset: calc(-1 * var(--ghost-focus-ring-width))` inside the
  button box so adjacent `<th>` borders, `overflow-x: auto` scroll containers,
  and `stickyHeader: true` never clip the indicator.
- **Default artwork belongs to `@ghostvue/themes`** ([ADR 0013](../adr/0013-icon-strategy.md)).
  In the themed table scope, paint a decorative mark on the sort button's
  `::after` with empty CSS content and `currentColor`. Use the parent
  `th[data-sort]` to distinguish the unsorted bidirectional mark from the
  ascending and descending chevrons. Size it with `--ghost-action-icon-size`.
  The unsorted mark uses `--ghost-text-subtle` and strengthens on hover or
  focus. Sorted headers use `--ghost-surface-fg` text, a `--ghost-text-primary`
  mark, and an accent bottom border. In forced colors keep the direction
  visible in `ButtonText` (`GrayText` when disabled) and draw the focus outline
  in `Highlight`. The header's `aria-sort` communicates direction to assistive
  technology. The CSS adds no text to the button's accessible name.
- Apply the default only to a sort control with the `data-part="sort-button"`
  hook. Manual compositions can opt in on their button. A consumer-supplied
  decorative child marked `data-part="sort-indicator"` suppresses the default
  on that button. Bare headless renderers supply the hook and label only.
  Loading the stylesheet outside a themed scope leaves them unadorned.

#### Row selection wash and `forced-colors` `SelectedItem` mapping

- **Standard light and dark mode wash:**
  - Applied to direct cells of selected data rows
    (`> .ghost-table-body > .ghost-table-row[data-selected='true'] >
:is(.ghost-table-cell, .ghost-table-header-cell)`):
    `background-color: color-mix(in oklch, var(--ghost-action-primary-bg)
calc(100% * var(--ghost-state-mix-soft)), var(--ghost-surface-bg))` with
    `color: var(--ghost-surface-fg)`. Pairing `--ghost-surface-fg` against the
    soft primary mix preserves WCAG 2 AA (`>= 4.5:1`) text contrast across
    `default`, `calm`, `vibrant`, and `mono` in both light and dark modes.
  - **Hover layering:** Unselected body rows (`:not([data-selected='true']):not([data-detail-row])`)
    apply `--ghost-surface-subtle-bg` on `:hover` (when the table is not
    disabled). Selected rows deepen slightly on `:hover` by combining
    `--ghost-state-mix-soft` with `--ghost-state-layer-hover` so pointer
    tracking remains visible across selected runs.
  - **Non-color distinction:** Selection is never conveyed by row tint alone:
    the checked `GhostCheckbox` provides explicit state and shape, and the first
    cell (`:first-child`) carries an inset inline-start accent bar
    (`box-shadow: inset var(--ghost-focus-ring-width) 0 0
var(--ghost-border-primary)` in LTR; mirrored in RTL via logical
    `border-inline-start` or `dir`-aware inset shadow without shifting cell
    width).
  - **Bulk-actions bar & detail rows:** `[data-part="bulk-actions"]` uses the
    same soft primary surface tint (`--ghost-surface-muted-bg` / soft primary
    mix with `--ghost-surface-fg` text). Detail rows
    (`tr.ghost-table-row[data-detail-row='true'] > .ghost-table-cell`) use
    `--ghost-surface-subtle-bg` so expanded content reads as an inset panel
    distinct from selected data rows.
- **`@media (forced-colors: active)` (`SelectedItem` / `SelectedItemText`):**
  - Windows Contrast Themes strip `color-mix(...)` washes back to `Canvas`. To
    preserve row-level selection visibility across wide tables, direct cells of
    selected data rows (`> .ghost-table-body >
.ghost-table-row[data-selected='true'] > :is(.ghost-table-cell,
.ghost-table-header-cell)`) map explicitly to CSS Color 4 system selection
    colors:
    - `background-color: SelectedItem;`
    - `color: SelectedItemText;`
    - `border-block-end-color: CanvasText;`
    - `forced-color-adjust: none;` on the selected cell surface so the user
      agent does not backplate cell text with `Canvas`.
  - **Nested interactive controls inside `SelectedItem` rows:** Interactive
    descendants inside selected cells (`button`, `input`, `select`, `textarea`,
    `a[href]`, `[tabindex]:not([tabindex='-1'])`) restore system control
    painting (`forced-color-adjust: auto`, or explicit `ButtonFace` /
    `ButtonText` on themed buttons/checkboxes and `LinkText` on links), and
    `:focus-visible` outlines drawn directly against a `SelectedItem` cell
    background use `outline-color: SelectedItemText` so keyboard focus never
    disappears into the selected row fill.

#### `[aria-busy="true"]` loading behavior

- **Semantic contract:** Passing `:loading="true"` to `GhostDataTable` sets
  `aria-busy="true"` on `<table data-ghost-data-table>` via `tableRootProps`
  (omitted when `loading` is `false`).
- **In-place visual feedback without focus loss:**
  - While `table[data-ghost-data-table][aria-busy='true']` is present, mounted
    `<thead>` and `<tbody>` rows stay in the DOM at their current geometry (zero
    height collapse or column reflow).
  - Keep body text, backgrounds, and enabled controls at their resting contrast
    throughout loading. Keep the body at full opacity in every theme and mode.
    Show progress with a block-end accent hairline on the header. It may animate
    under `prefers-reduced-motion: no-preference`. Keep it static under
    `prefers-reduced-motion: reduce` and use `Highlight` in forced colors.
- **Interaction invariant during `loading`:** `aria-busy="true"` **must not**
  set `disabled`, `inert`, or `pointer-events: none` on sort buttons, search
  inputs, checkboxes, expand buttons, or pagination controls unless `:disabled="true"`
  is also passed. Keeping controls focusable and operable while a fetch is in
  flight prevents focus from dropping to `<body>` after a keyboard sort/filter
  commit and preserves superseding queries guarded by
  `useGhostDataTableServerRequest()` (including Browser **Back** and
  `retry()`).
- **Initial empty load & live announcements:** For first-load empty tables
  (`data.length === 0 && loading`), consumers may render `GhostSkeleton` rows in
  manual compositions (per [`GhostSkeleton`](/specs/skeleton)), while
  `GhostDataTablePreset` keeps `<thead>` mounted with `aria-busy="true"` on
  `<table>`. Async completion announcements remain a consumer-owned polite live
  region (`role="status"`), never `aria-live` on `<table>` or `<tbody>`.

### Keyboard, focus parity, RTL, touch, and motion

- **Exact keyboard parity with headless `@ghostvue/vue`:** Native `<table>`
  semantics only (no `role="grid"` or arrow-key cell roving). `Tab` /
  `Shift+Tab` traverses in DOM order: `#toolbarStart` → `#search` (independent
  `Tab` stop) → `#toolbarEnd` → `#bulkActions` (when `selectedCount > 0`) →
  named horizontal scroll container (only when `containHorizontal` is `true`) →
  header select-all `GhostCheckbox` → sortable header `<button>`s → body row
  checkboxes, expand `<button>`s, cell controls, and expanded `#detail` controls
  → `#footer` (`GhostPagination`). `Space` toggles checkboxes (`Enter` does not);
  `Enter` and `Space` activate sort and expand buttons.
- **Focus restoration invariants (both required in browser tests):**
  1. **Detail row collapse:** When an expanded row collapses while
     `document.activeElement` is inside its `#detail` row, focus moves to that
     row's expand `<button>` (`useDataTableDetailRowFocus`).
  2. **Bulk-actions dismissal:** When `[data-part="bulk-actions"]` unmounts
     because `selectedCount` transitions from `> 0` to `0` (for example, the
     user activates a "Clear selection" button wired to `clearSelection()`) while
     `document.activeElement` is inside `[data-part="bulk-actions"]`,
     `GhostDataTablePreset` moves focus on `nextTick` to the table's header
     select-all checkbox input (when mounted and not disabled) so focus is never
     stranded on `document.body`.
- **RTL, touch targets, and reduced motion:**
  - `ghost-data-table.css` uses CSS logical properties (`inline-size`,
    `block-size`, `padding-inline`, `padding-block`, `border-block-end`,
    `border-inline-start`, `inset-block-start`, `text-align: start`) so
    `dir="rtl"` mirrors layout, sort-button alignment, and selection indicators
    with zero physical `left` / `right` overrides.
  - Sort buttons, expand buttons, checkboxes, and default preset inputs respect
    `--ghost-control-touch-min` (`2.75rem` on coarse pointers via semantic
    control tokens).
  - Transitions use `--ghost-action-duration` / `--ghost-motion-fade-duration`
    and disable non-essential motion under `@media (prefers-reduced-motion:
reduce)`.

### Wave 2 (`#333`) acceptance tests and component-gate checklist

Wave 2 implementation ([#333](https://github.com/zprue743/ghostvue/issues/333))
must satisfy every check below alongside existing phase-one tests:

1. **Headless `GhostDataTablePreset` unit & type tests (`@ghostvue/vue`):**
   - Enable each layout slot being exercised through `layoutSlots`.
     `#toolbarStart` and `#toolbarEnd` render inside `[data-part="header"]`
     before and after `[data-part="search"]`; `[data-part="header"]` omits when
     search is hidden and both toolbar slots are absent; default search stays
     outside any `role="toolbar"`.
   - `#bulkActions` stays unmounted when `selectedCount === 0` or
     `enableRowSelection === false`, mounts when `selectedCount > 0`, receives
     `{ selectedRowIds, selectedCount, clearSelection }` (including cross-page
     ids when `manualPagination: true`), `clearSelection()` clears selection (and
     is a no-op when `disabled: true`), and activating `clearSelection()` while
     focused inside `[data-part="bulk-actions"]` moves focus to the header
     select-all checkbox.
   - `#footer` receives `{ pagination, pageCount, rowCount, setPageIndex }` and
     `setPageIndex` commits through the root (`v-model:pagination` + single
     `stateChange` when `manualPagination: true`).
   - In both presets, parameterize compatibility cases over `toolbarStart`,
     `toolbarEnd`, `bulkActions`, and `footer`. With the prop omitted, a slot
     matching a column id receives only its original typed cell context.
     Verify a legacy numeric `#footer="{ value }"` can call `value.toFixed(2)`
     and renders once per row. Start with no columns, insert the column,
     reorder it, then remove it. No layout region mounts or invokes that slot.
   - With only `bulkActions` enabled, keep the colliding `footer` cell slot
     while showing and dismissing the selection bar. With `footer` explicitly
     enabled, check its typed pagination props and one footer invocation per
     render. A column named `footer` uses its `cell` hook or value fallback.
     Use positive and negative `vue-tsc` fixtures for the two slot signatures.
2. **Themed wrapper unit, SSR, export, and generic type tests
   (`@ghostvue/themes`):**
   - `GhostDataTable` renders `.ghost-data-table.ghost-themed-scope[data-part="root"][data-themed]`;
     defaults (`size="md"`, `variant="plain"`, `stickyHeader=false`,
     `disabled=false`) omit `data-size`, `data-variant`, `data-sticky-header`,
     and `data-state`; non-defaults set `data-size="sm"`, `data-variant="card"`,
     `data-sticky-header=""`, and `data-state="disabled"`.
   - `ariaLabel` and `ariaLabelledby` render on the native `<table>` only (never
     on `.ghost-data-table`).
   - Consumer `class` and `style` merge cleanly on `GhostDataTable`,
     `GhostDataTableTable`, and `GhostDataTablePreset`; all six `v-model`s,
     `stateChange`, and all 16 `GhostDataTableExposed<TData>` methods plus
     `element` work through a template ref.
   - `@ghostvue/themes` re-exports `GhostDataTable`, `GhostDataTableTable`,
     `GhostDataTablePreset`, `defineDataTableColumns`, `useGhostDataTable`,
     `useGhostDataTableServerRequest`, the five `getDataTable*Props` helpers,
     and public types (`pnpm published-exports` and `pnpm exports:check` green).
   - Generic `vue-tsc` type tests for `@ghostvue/themes` verify
     `defineDataTableColumns<Invoice>()` column cell slot typing
     (`value.toFixed(2)` valid, `@vue-expect-error` on `value.toUpperCase()`),
     typed `#detail="{ row }"`, `#bulkActions`, and `#footer`.
   - `expectSsrHydration` passes with zero warnings on themed `GhostDataTable` +
     `GhostDataTablePreset` with sort, selection, expansion, `#toolbarStart`,
     `#toolbarEnd`, `#bulkActions`, and `#footer`.
   - Headless isolation check: mounting `@ghostvue/vue` `GhostDataTable` on a
     page where `@ghostvue/themes` CSS is loaded applies no `[data-themed]`
     hook or themed wrapper element. For both headless renderers verify a
     sortable header has the button hook and accessible label with no default
     artwork. In the themed equivalents check all three visual sort states,
     identical accessible names, and suppression of the CSS mark when a manual
     sort button supplies its own decorative indicator.
3. **Browser (`Playwright`), accessibility (`@axe-core/playwright`), and
   `forced-colors` tests:**
   - Keyboard and real focus (`toBeFocused()`): full `Tab` traversal across
     `#toolbarStart`, `#search`, `#toolbarEnd`, `#bulkActions`, select-all
     checkbox, sort buttons, row checkboxes, expand buttons, and `#footer`
     `GhostPagination`; `Enter` and `Space` cycle single-sort (`none → asc →
desc → none`) while focus stays on the sort `<button>` and `aria-sort` /
     `data-sort` update on `<th>`; `Space` toggles row selection (`data-selected="true"`);
     collapsing an open `#detail` row from inside restores focus (`toBeFocused()`)
     to the row expand button; activating `clearSelection` inside `#bulkActions`
     restores focus (`toBeFocused()`) to the header select-all checkbox.
   - `[aria-busy="true"]` loading parity: toggling `:loading="true"` sets
     `aria-busy="true"` on `<table>`, keeps rows and headers mounted without
     dropping `toBeFocused()` from an active sort button or search input, and
     still permits superseding query actions. In each preset theme, light and
     dark, measure busy-state body text and enabled control text against their
     composited backgrounds (at least 4.5:1 for normal text). Include a selected
     row and a focused control. Require at least 3:1 against adjacent colors
     for the visual cues identifying enabled controls and their focus. Verify
     the body stays at full opacity and the header cue respects reduced motion.
   - Forced-colors verification (`page.emulateMedia({ forcedColors: 'active' })`):
     selected row cells (`tr[data-selected="true"] > td`) resolve computed
     `backgroundColor` and `color` to `SelectedItem` and `SelectedItemText`
     (distinct from unselected rows), and a focused control inside a selected
     row retains a contrasting visible outline.
   - RTL verification (`dir="rtl"`): logical layout and sort/selection chrome
     mirror without horizontal overflow or clipped focus rings.
   - Zero `@axe-core/playwright` violations across `plain` and `card` variants,
     `sm` and `md` sizes, `stickyHeader`, selected + expanded rows,
     `aria-busy="true"`, and empty states in light and dark modes.
   - Linux container visual baselines updated via `pnpm test:visual:docker`.
4. **Manifests, registries, docs, and release metadata (`#333`):**
   - Update `docs/components/data-table-spec.md` frontmatter (`packages` adds
     `'@ghostvue/themes'`, `manifests` adds
     `packages/themes/manifests/ghost-data-table*.manifest.json`, and
     `approval.evidence` records Zac's `#316` approval).
   - Run `pnpm manifests:write` and `pnpm registries:write`; add themed examples
     in `examples/data-table/` and `packages/vue/registry/data-table.registry.json`;
     document themed usage and preset slots in `docs/components/data-table.md`;
     update only the DataTable row in `docs/roadmap.md`; include minor
     Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Decisions recorded (Zac, PR #265 review)

| Topic                   | Decision                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Architecture            | Option A: composable + native `GhostTable`                                                                                |
| `getRowId`              | Required in every build                                                                                                   |
| Filter debouncing       | Consumer-owned                                                                                                            |
| Themed `GhostDataTable` | **Not** in phase one; headless examples first                                                                             |
| Benchmark thresholds    | Informational until repeated CI runs show variance                                                                        |
| Server `stateChange`    | One emit per user action with full `query`                                                                                |
| Local select-all        | `getPrePaginationRowModel()` (all filtered rows, not current page only)                                                   |
| Server selection        | No prune on page change; select-all = `getRowModel()` visible subset                                                      |
| Filtering defaults      | Case-insensitive OR global / AND column; clear `''`/`null`/`undefined`; skip `null`/`undefined` cell values in text match |
| Filter pagination reset | page → 1 only when `manualFiltering: true`; page-local filter keeps page                                                  |
| Selection pruning       | Auto-prune only when both `manualPagination` and `manualFiltering` are `false` (source `data` change)                     |
| Full-local filter clamp | Keep `pageIndex`, then clamp to last valid page when filtered count shrinks (Zac, post-rebase)                            |
| `pageIndex` clamping    | After `pageCount` changes, clamp when `pageIndex > pageCount`; `rowCount === 0` → page 1                                  |
| Local `data` refresh    | Clamp `pageIndex` on `data` reference change; do not reset to page 1 unconditionally                                      |
| Server **Retry**        | Expose **`retry()`** — one `stateChange` with same `query`, new internal `requestId`                                      |
| Server clamp fetch      | When server `pageCount` forces `pageIndex` down, **one** `stateChange` with clamped pagination                            |
| Preset LOC              | `GhostDataTablePreset` keeps invoice-parity apps **≤ 95** non-blank consumer lines with typed columns                     |
| Reference axe           | **Zero** violations on reference fixture table scope (implementation acceptance)                                          |

## Open architectural questions

Non-blocking items (also in frontmatter with `blocking: false`):

1. **Multi-sort (`GHO-250`, proposed for `0.3.0`):** Drafted in
   [Multi-column sort specification (GHO-250)](#multi-column-sort-specification-gho-250-proposed-for-0-3-0);
   held for Zac's sign-off on five design decisions (secondary `aria-sort`
   policy, unmodified activation when `sorting.length > 1`, `maxMultiSortColCount`
   overflow, no-modifier AT/touch affordance, and per-column `enableMultiSort`)
   before `0.3.0` implementation begins.
2. **Benchmark gates:** When to promote informational thresholds to `pnpm verify`.

## Side-by-side results (PrimeVue prototype)

**Gate status:** Exercise **completed** (throwaway prototype,
[PR #269](https://github.com/zprue743/ghostvue/pull/269),
[`prototypes/datatable-primevue/FINDINGS.md`](https://github.com/zprue743/ghostvue/blob/cursor/gho-35-primevue-prototype/prototypes/datatable-primevue/FINDINGS.md)).
This evidence did **not** auto-approve the spec; Zac approved in chat on
2026-11-23 (recorded in [PR #272](https://github.com/zprue743/ghostvue/pull/272))
to promote it to **`specStatus: approved`**.

| Dimension            | Finding                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consumer LOC         | Manual headless **(b)** was **171** vs Prime **95**; **`GhostDataTablePreset` (a′) targets ≤ 95** with **~44** lines in the spec example — **better than Prime on LOC** when using the preset path        |
| Typing               | **Ghost exceeds Prime:** `defineDataTableColumns` catches `amount.toFixed` / rejects `toUpperCase`; Prime `field` strings do not catch renamed keys at compile time                                       |
| Behavior             | **Ghost exceeds Prime:** coalesced `stateChange`, page-local page 4, local `getPrePaginationRowModel()` select-all — intentional, not Prime defaults (page-scoped select-all, paginator reset on filter). |
| a11y                 | Keyboard approval script passes; implementation must hit **zero axe** on the reference fixture (stricter than prototype stub run).                                                                        |
| Perf (informational) | Stub harness ~15–62ms sort/filter at 1k–10k rows; directional only, not CI gates                                                                                                                          |

Prototype uses **local stubs**, not shipped `@ghostvue/vue`; numbers validate spec
intent, not production bundle performance.

## Child work decomposition

| Child issue                                                                                                          | Scope                                                                                                                    | Complexity |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Done:** GhostVue vs PrimeVue prototype ([PR #269](https://github.com/zprue743/ghostvue/pull/269))                  | Evidence folded into spec; prototype PR closed unmerged                                                                  | —          |
| DataTable core types and local processing pipeline                                                                   | `useGhostDataTable`, manual matrix, row models                                                                           | High       |
| `defineDataTableColumns` + column type tests                                                                         | Typed `value` / `getValue`, CI type tests                                                                                | Medium     |
| `GhostDataTableTable` default renderer                                                                               | Basic example (a), `#columnId` slots                                                                                     | Medium     |
| **`GhostDataTablePreset`** (invoice parity, ≤95 LOC)                                                                 | Example (a′), wired a11y + interaction helpers                                                                           | Medium     |
| GhostDataTable headless root and GhostTable composition                                                              | Slot bindings, example (b), SSR                                                                                          | Medium     |
| Interaction prop helpers                                                                                             | Sort / select / expand bindings + focus-on-collapse                                                                      | Medium     |
| Server router example + Back/Retry tests                                                                             | `server-invoices-router.vue`, race tests                                                                                 | High       |
| Column sorting UI and header a11y                                                                                    | Single-column sort, `aria-sort`                                                                                          | Medium     |
| Filtering model and toolbar composition docs                                                                         | Conditional page reset vs `manualFiltering`                                                                              | Low        |
| Pagination integration                                                                                               | `rowCount`, empty → page 1, `GhostPagination`                                                                            | Low        |
| Row selection (local + server)                                                                                       | Select-all rules, no server prune, cross-page tests                                                                      | High       |
| Row expansion rows                                                                                                   | Detail `<tr>`, server no-prune                                                                                           | Medium     |
| Server mode and async guard                                                                                          | Coalesced `stateChange`, full `query`, stale guard tests                                                                 | Medium     |
| Performance benchmark harness                                                                                        | Vitest bench, sort/page regression counters                                                                              | Low        |
| **Deferred:** PrimeVue 10k browser comparison                                                                        | `docs/contributing/data-table-benchmark-comparison.md`                                                                   | Medium     |
| Headless docs and executable examples                                                                                | `data-table.md`, `examples/data-table/`                                                                                  | Medium     |
| **Spec (`0.1.0`):** Themed GhostDataTable addendum ([#316](https://github.com/zprue743/ghostvue/issues/316))         | Single-sort themed contract + preset layout slots (gates `#333`)                                                         | Medium     |
| **Wave 2 (`0.1.0`):** Themed GhostDataTable implementation ([#333](https://github.com/zprue743/ghostvue/issues/333)) | `@ghostvue/vue` preset slots + `@ghostvue/themes` wrappers & CSS                                                         | High       |
| **Deferred:** Multi-column sort spec ([#317](https://github.com/zprue743/ghostvue/issues/317), GHO-250)              | Proposed `0.3.0` addendum (`enableMultiSort` keyboard, state, and secondary `aria-sort` contract); held for Zac approval | Medium     |
| **Deferred:** Virtualization spec                                                                                    | Scroll + a11y                                                                                                            | High       |
| **Deferred:** Treegrid / grid keyboard spec                                                                          | Roving focus                                                                                                             | High       |

Parent **GHO-35** records specification approval at **`specStatus: approved`**
(Zac approved in chat on 2026-11-23; recorded in
[PR #272](https://github.com/zprue743/ghostvue/pull/272)).

## Multi-column sort specification (GHO-250, proposed for 0.3.0)

> [!IMPORTANT]
> **Status:** Proposed ([GHO-250](https://linear.app/ghost-vue/issue/GHO-250),
> [#317](https://github.com/zprue743/ghostvue/issues/317)) — **held for Zac's
> approval before implementation.** Phase one (`0.1.0`) — including the
> decoupled themed `GhostDataTable` wrapper ([#316](https://github.com/zprue743/ghostvue/issues/316)) —
> remains strictly on the approved single-column sort contract above.
> Multi-column sort implementation is targeted for `0.3.0`.

### Purpose and scope

Real admin and financial tables frequently sort by a primary grouping key and a
secondary tie-breaker (for example, `status` ascending, then `amount`
descending). Phase one intentionally capped `sorting: DataTableColumnSort[]` at
one entry (`slice(0, 1)`) while keeping the public array shape so multi-column
sorting can be enabled additively behind `enableMultiSort`.

This addendum defines the `0.3.0` behavioral, API, keyboard, pointer, and
assistive-technology contract when `enableMultiSort` is `true`, preserving
100% backwards compatibility when `enableMultiSort` is omitted or `false`.

**Non-goals for `0.3.0` multi-sort:**

- Spreadsheet `role="grid"` navigation or arrow-key cell traversal (still native
  `<table>` + `Tab` order per [ADR 0014](../adr/0014-datatable-phase-one-architecture.md)).
- Built-in multi-sort toolbar UI, drag-to-reorder sort pills, or opinionated
  popover sort builders (consumers can compose those via `setSorting`,
  `toggleSorting`, and `clearSorting`).
- Breaking changes to `DataTableColumnSort` or `DataTableQueryState`.

### Public API additions (proposed)

All additions to `@ghostvue/vue` are additive and backwards-compatible with the
phase-one contracts in `packages/vue/src/ghost-data-table.ts`.

#### Options and props

Additions to `UseGhostDataTableBaseOptions<TData>` and `GhostDataTableProps<TData>`:

| Option / Prop          | Type                                              | Default                     | Contract                                                                                                                                                      |
| ---------------------- | ------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableMultiSort`      | `boolean`                                         | `false`                     | Opts the table into multi-column sorting. When `false`, behavior is identical to phase one (`sorting` capped to 1 entry; no priority badges or descriptions). |
| `maxMultiSortColCount` | `number \| undefined`                             | `undefined`                 | Optional cap (`>= 1`, integer) on simultaneous sorted columns when `enableMultiSort` is `true`. `undefined` allows sorting by any number of sortable columns. |
| `isMultiSortEvent`     | `(event: MouseEvent \| KeyboardEvent) => boolean` | `(event) => event.shiftKey` | Predicate evaluated when a header sort control activates with an event. Ignored when `enableMultiSort` is `false`.                                            |

- **Invalid `maxMultiSortColCount`:** Values `< 1` or non-finite values normalize
  to `1` (minimum meaningful bound; values with fractional parts use
  `Math.floor`). When `maxMultiSortColCount === 1` and `enableMultiSort: true`,
  at most one column may be active at a time.
- **No `Shift`-locking requirement:** Consumers wanting additive multi-sort on
  every click (for example, touch-first or screen-reader-heavy tables without
  modifier keys) can pass `:is-multi-sort-event="() => true"`.

#### Localized accessibility strings (preset & default renderer)

Additions to `GhostDataTableTableProps` and `GhostDataTablePresetProps` (with
defaults matching GhostVue's existing callback convention in
`GhostDataTablePresetProps`):

```ts
interface DataTableSortDescriptionContext {
  columnId: string
  label: string
  direction: 'asc' | 'desc'
  /** 1-based priority rank (1 = primary sort) */
  priority: number
  /** Total active sorted columns */
  total: number
}

interface DataTableSortAnnouncementEntry {
  columnId: string
  label: string
  direction: 'asc' | 'desc'
  /** 1-based priority rank */
  priority: number
}
```

| Prop                    | Type                                                             | Default                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `sortDescriptionLabel`  | `(ctx: DataTableSortDescriptionContext) => string`               | `({ direction, priority, total }) => \`Sorted ${direction === 'asc' ? 'ascending' : 'descending'}, priority ${priority} of ${total}\`` |
| `sortAnnouncementLabel` | `(entries: readonly DataTableSortAnnouncementEntry[]) => string` | Empty: `'Sorting cleared.'`; non-empty: `'Sorted by Customer ascending (1), then Amount descending (2).'`                              |

#### Composable, slot, and exposed actions

Additions to `UseGhostDataTableReturn<TData>`, `GhostDataTableSlotProps<TData>`,
and `GhostDataTableExposed<TData>`:

| Symbol                                   | Surface                                   | Signature / Type                                          | Contract                                                                                                                                                                          |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSortIndex(columnId)`                 | Composable, slot props                    | `(columnId: string) => number`                            | Returns **0-based** priority index in `sorting` (`0` = primary, `1` = secondary), or `-1` when unsorted.                                                                          |
| `getSortDirection(columnId)`             | Composable (existing)                     | `(columnId: string) => DataTableSortDirection`            | Extended from `sorting[0]` only to search **all** entries in `sorting` (`'asc' \| 'desc' \| false`).                                                                              |
| `toggleSorting(columnId, multi?)`        | Composable, exposed                       | `(columnId: string, multi?: boolean) => void`             | Existing 1-arg calls stay single-column (`multi = false`). When `enableMultiSort` is `true` and `multi === true`, modifies `columnId` in place/appends.                           |
| `clearSorting()`                         | Composable, slot props, exposed           | `() => void`                                              | Sets `sorting` to `[]` (no-op if already empty). Emits one `stateChange` when `manualSorting` is `true`.                                                                          |
| `header.sortIndex`                       | `DataTableHeader<TData>`                  | `number`                                                  | `0`-based index in `sorting`, or `-1` when unsorted.                                                                                                                              |
| `header.sortPriority`                    | `DataTableHeader<TData>`                  | `number \| undefined`                                     | `1`-based rank (`sortIndex + 1`) when sorted; `undefined` when unsorted.                                                                                                          |
| `header.toggleSort(event?)`              | `DataTableHeader<TData>`                  | `(event?: MouseEvent \| KeyboardEvent) => void`           | Backwards-compatible with `@click="header.toggleSort"` (Vue forwards `$event`) and 0-arg `header.toggleSort()`. Calls `isMultiSortEvent(event)` when `enableMultiSort` is `true`. |
| `getHeaderCellProps(columnId)`           | Slot props, `getDataTableHeaderCellProps` | `DataTableHeaderCellProps`                                | See [Secondary `aria-sort` and AT contract](#secondary-aria-sort-and-at-contract).                                                                                                |
| `getSortButtonProps(columnId, options?)` | Slot props, `getDataTableSortButtonProps` | `(columnId, options?: DataTableSortButtonOptions) => ...` | Extends `DataTableControlLabelOptions` with optional `describedById?: string` (merged with existing/consumer `aria-describedby`, never dropped).                                  |
| `sortAnnouncement`                       | Slot props                                | `string`                                                  | Reactive polite live-region message updated only on user-driven sort actions (empty string on initial SSR/mount and silent URL hydration).                                        |

`DataTableInteractionState` (read by `getDataTableHeaderCellProps` and
`getDataTableSortButtonProps`) gains `enableMultiSort: ComputedRef<boolean>` and
`getSortIndex: (columnId: string) => number` (while keeping `getDataTable*`
pure attribute getters without listeners).

### State model and sorting rules

#### Priority order and normalization

1. **Order = priority:** `sorting[0]` is primary (priority `1`), `sorting[1]` is
   secondary (priority `2`), and so on.
2. **Deduplication:** At most one `DataTableColumnSort` per `column.id`.
   `setSorting(next)` deduplicates by `id` keeping the **first** (highest
   priority) occurrence.
3. **Capacity:**
   - When `enableMultiSort` is `false`: `setSorting(next)` slices to `next.slice(0, 1)`
     (phase-one contract unchanged).
   - When `enableMultiSort` is `true` and `maxMultiSortColCount` is set: `setSorting(next)`
     slices to `next.slice(0, max)`.
4. **Inert when disabled or non-sortable:** `toggleSorting(columnId, multi)` is
   a no-op when `disabled.value` is `true` or `!canSort(columnId)` (same as
   phase one).

#### Multi-sort transition rules

Let `C` be a sortable column (`canSort(C) === true`) and `enableMultiSort === true`:

| Action                         | Current state of `C` in `sorting`  | Next `sorting` state                                                                                                                              |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi** (`multi === true`)   | Unsorted (`index === -1`)          | If under `maxMultiSortColCount`: append `{ id: C, desc: false }` at the end (priority `sorting.length + 1`). If at cap: no-op (proposed; see Q3). |
| **Multi** (`multi === true`)   | Sorted `asc` at `index`            | Replace entry at `index` in place with `{ id: C, desc: true }` (priority rank unchanged).                                                         |
| **Multi** (`multi === true`)   | Sorted `desc` at `index`           | Remove entry at `index`; all entries with `j > index` shift up by 1 (`priority` decreases by 1).                                                  |
| **Single** (`multi === false`) | Unsorted (`index === -1`)          | Replace entire `sorting` with `[{ id: C, desc: false }]`.                                                                                         |
| **Single** (`multi === false`) | Sole sort (`length === 1`)         | Phase-one cycle: `asc` → `desc` → `[]`.                                                                                                           |
| **Single** (`multi === false`) | Primary (`index === 0`, `len > 1`) | Collapse to single-column sort and advance direction: `asc` → `[{ id: C, desc: true }]`; `desc` → `[]` (proposed; see Q2).                        |
| **Single** (`multi === false`) | Secondary (`index > 0`, `len > 1`) | Collapse to single-column sort starting ascending: `[{ id: C, desc: false }]` (proposed; see Q2).                                                 |

#### Local multi-column pipeline (`sortRows`)

When `manualSorting` is `false`:

- `sortRows` accepts `sorting: readonly DataTableColumnSort[]` and
  `columnsById: ReadonlyMap<string, DataTableColumnDef<TData>>`.
- **Single-column fast path:** When `sorting.length === 1`, execute the existing
  phase-one single-column decorate-and-sort path with zero extra allocations.
- **Multi-column decorate-once:** For `sorting.length > 1`, resolve the active
  sortable columns (`isColumnSortable(col)`). Decorate each row **once** with
  its extracted values for those active columns (`O(n * k)` accessor calls,
  never `O(n log n * k)`).
- **Comparator chain:** Compare column `0`, then `1`, ..., then `k - 1` until a
  non-zero result is found:
  - Per-column `sortUndefined` (`'first' | 'last' | false`, default `'last'`)
    applies at that column's comparison tier (`'first'` and `'last'` stay
    absolute and do not invert with `desc`, matching phase-one `sortRows`).
  - Per-column `sortFn` or `compareValues` runs next, multiplied by
    `entry.desc ? -1 : 1`.
  - If all active columns compare equal (`0`), ES2019+ stable `Array.prototype.sort`
    preserves `coreRows` input order.
- **Immutability & memoization:** Consumer row objects and `data` remain
  untouched; filtering, pagination, selection, and expansion still never re-run
  `sortRows`.

#### Server mode, `stateChange`, and URL serialization

- **Zero payload breaking changes:** `DataTableQueryState.sorting` is already
  `DataTableColumnSort[]`. With `manualSorting: true`, any `toggleSorting`,
  `setSorting`, or `clearSorting` change emits **one** `stateChange` with
  `trigger: 'sorting'` and the full ordered `query.sorting` array.
- **Pagination reset rule:** Unchanged from phase one — sorting never resets
  `pagination.pageIndex` (the `pageCount` clamp still applies if `pageCount`
  shrinks).
- **Recommended URL format (additive to `server-invoices-router.vue`):** Encode
  comma-separated `id:dir` pairs in priority order, e.g.
  `?sort=customer:asc,amount:desc`, which remains backwards-compatible with
  single-column `?sort=amount:desc`. Hydrating `sorting` on mount or Browser Back
  remains silent (no `stateChange` echo loop).

### Keyboard and pointer interaction contract

| Input                      | Context      | Behavior (`enableMultiSort: false`) | Behavior (`enableMultiSort: true`)                                                         |
| -------------------------- | ------------ | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `Click` (no modifier)      | Sort button  | Phase-one single-column cycle       | Single-column cycle / collapse to single sort on this column                               |
| `Enter` / `Space` (no mod) | Sort button  | Phase-one single-column cycle       | Single-column cycle / collapse to single sort on this column                               |
| `Shift+Click`              | Sort button  | Phase-one single-column cycle       | Multi-sort add / cycle in place / remove (or custom via `isMultiSortEvent`)                |
| `Shift+Enter`              | Sort button  | Phase-one single-column cycle       | Multi-sort add / cycle in place / remove                                                   |
| `Shift+Space`              | Sort button  | Phase-one single-column cycle       | Multi-sort add / cycle in place / remove (see `Shift+Space` `keyup` guard below)           |
| `Tab` / `Shift+Tab`        | Table header | Native focus order                  | Native focus order (no roving grid tabindex)                                               |
| `Escape`                   | Sort button  | No-op                               | **No-op** (never clears sorts; `Escape` is reserved for dismissable overlays per ADR 0011) |

#### `Shift+Space` activation and focus stability

- **Focus stays on the button:** Activating any sort button (plain or
  `Shift`-modified) keeps focus on that `<button>` (`toBeFocused()`), never
  resetting focus to `<body>` or the table wrapper when DOM rows reorder.
- **`Shift+Space` `keyup` vs `keydown` hazard:** Native `<button>` elements fire
  `click` on `Enter` `keydown`, but fire `click` on `Space` **`keyup`**. If a
  keyboard user presses `Shift+Space` and releases `Shift` a few milliseconds
  before releasing `Space`, the browser's synthesized `click` event carries
  `shiftKey === false`.
  - **Requirement for `GhostDataTableTable` and `GhostDataTablePreset`:** Track
    whether `Shift` (or `isMultiSortEvent`) was active on `Space` `keydown` on
    that sort button and combine it with the resulting `click` event before
    calling `header.toggleSort`, resetting the pending flag on `blur` or `click`.
  - **Preventing page scroll on `Shift+Space`:** Native `<button>` suppresses
    `Space` scrolling, and `Space` with `Shift` on a focused `<button>` must
    likewise never scroll the viewport.
- **Screen-reader & touch parity without `Shift`:** Screen readers in browse /
  virtual-cursor mode (NVDA, JAWS, VoiceOver `VO+Space`) and touch screen
  readers often synthesize a bare `click` without `Shift`, and mobile touch has
  no `Shift` key. Consumers requiring multi-sort without modifier keys should
  either:
  1. Set `:is-multi-sort-event="() => true"` (additive click mode paired with a
     consumer "Clear sorting" button calling `clearSorting()`), or
  2. Compose a sort menu / priority controls using `toggleSorting(columnId, true)`
     and `setSorting(...)`.

### Secondary `aria-sort` and AT contract

#### WAI-ARIA 1.2 `aria-sort` constraint

Per [WAI-ARIA 1.2 `aria-sort`](https://www.w3.org/TR/wai-aria-1.2/#aria-sort)
and the ARIA Authoring Practices Guide (APG) Sortable Table pattern:

1. `aria-sort` accepts `'ascending' | 'descending' | 'other' | 'none'`.
2. `aria-sort` is designed for **one sorted column at a time**; it has no syntax
   to express secondary rank (`priority 2 of 3`), and applying `aria-sort` to
   multiple `<th>` elements causes assistive technologies to announce multiple
   columns as equally sorted without hierarchy (or ignore secondary headers).
3. `aria-sort="other"` is **not** used for secondary columns: WAI-ARIA defines
   `"other"` for non-alphanumeric custom algorithms, so announcing `"sorted other"`
   for an ascending secondary column actively misleads screen-reader users.

#### Proposed header and button attribute contract

When `enableMultiSort` is `true`:

1. **Primary sorted column (`sorting[0]`, `sortPriority === 1`):**
   - `<th>` (`getHeaderCellProps`): `scope="col"`,
     `aria-sort="ascending" | "descending"`, `data-sort="asc" | "desc"`,
     `data-sort-priority="1"`.
2. **Secondary+ sorted columns (`sorting[1..k-1]`, `sortPriority >= 2`):**
   - `<th>` (`getHeaderCellProps`): `scope="col"`, **`aria-sort` omitted**
     (proposed default; see Open Question Q1), `data-sort="asc" | "desc"`,
     `data-sort-priority="2" | "3" | ...`.
3. **Unsorted columns:**
   - `<th>` (`getHeaderCellProps`): `scope="col"`, `aria-sort` omitted,
     `data-sort` omitted, `data-sort-priority` omitted.
4. **Sort `<button>` (`getSortButtonProps`) — accessible name vs description:**
   - **Never put raw rank digits into the button's accessible name** (do not let
     a visual `2` badge concatenate as `"Amount 2"`). Keep the visual badge
     `aria-hidden="true"`.
   - **Never place a `GhostVisuallyHidden` status span directly inside `<th>` as
     text content:** doing so alters the `<th>` accessible name, breaks
     `getByRole('columnheader', { name: 'Amount' })`, and forces screen readers to
     re-read `"Sorted descending, priority 2 of 2"` on every `<td>` cell in that
     column.
   - Instead, keep the button's accessible name clean (`"Amount"` or custom
     `options.label`) and attach `aria-describedby` pointing to a visually hidden
     description node rendered **outside `<table>`** (for example, an indexed
     `GhostVisuallyHidden` container rendered by `GhostDataTableTable` /
     `GhostDataTablePreset`, or consumer-wired via `describedById` in manual
     composition):
     - Primary when multi-sorted (`total > 1`): `"Sorted ascending, priority 1 of 2"`.
     - Secondary+: `"Sorted descending, priority 2 of 2"`.
     - Single-sorted (`total === 1`): `aria-sort` on `<th>` already conveys
       direction; description is optional (or omitted so single-sort matches
       phase one cleanly).
   - If the consumer already passed `aria-describedby`, merge ids space-separated
     rather than overwriting.
5. **Polite live-region announcement (`aria-live="polite"`):**
   - Because secondary columns omit `aria-sort`, activating `Shift+Enter` on a
     secondary column would otherwise produce no `aria-sort` mutation announcement.
   - `GhostDataTableTable` and `GhostDataTablePreset` render a
     `GhostVisuallyHidden` node with `aria-live="polite"` and `aria-atomic="true"`
     bound to `sortAnnouncement` (outside `<table>`), announcing user-driven
     changes when `enableMultiSort` is `true` — e.g.
     `"Sorted by Customer ascending (1), then Amount descending (2)."` or
     `"Sorting cleared."`.
   - **No mount/hydration spam:** Initial `defaultSorting` and silent URL
     hydration (`sorting` prop sync) must **not** populate the live region. Only
     user-initiated transitions (`toggleSorting`, `clearSorting`, or `setSorting`
     triggered by user actions) update `sortAnnouncement`.
   - **Renderless root invariant:** `GhostDataTable` itself remains renderless
     (emits zero DOM elements per ADR 0014) and exposes `sortAnnouncement` in
     `GhostDataTableSlotProps` for manual `#default` compositions.

### Rendering, theming, and CSS hooks

- **Headless DOM invariants:** `GhostTable*` `data-part` attributes are
  unchanged. Every sorted `<th>` receives `data-sort="asc" | "desc"` and (when
  `enableMultiSort` is `true`) `data-sort-priority="<1-based-rank>"`.
- **Additive layering with `@ghostvue/themes` (`#316`):** The `0.1.0` themed
  `GhostDataTable` wrapper ships on the single-sort `data-sort` contract. In
  `0.3.0`, themed styles can target `th[data-sort-priority]::after` or the
  priority badge slot using `content: attr(data-sort-priority)` / CSS tokens
  without breaking any `0.1.0` single-sort selectors.
- **Decorative indicators:** Any arrow glyph or priority pill rendered inside
  `GhostDataTableTable` / `GhostDataTablePreset` carries `aria-hidden="true"` and
  stays separated from visible text so screen readers do not concatenate glyphs
  into the button name.

### Environment, SSR, and performance

- **SSR & hydration:** `sorting` state, `aria-sort` on `sorting[0]`,
  `data-sort`, `data-sort-priority`, and deterministic `useGhostId`-based
  `aria-describedby` ids match identically between SSR and client hydration.
  `sortAnnouncement` starts empty (`""`) on SSR and initial mount so hydration
  never mismatches or fires spurious announcements.
- **Mobile & touch:** Touch users without a hardware keyboard rely on either
  `:is-multi-sort-event="() => true"` or consumer-composed sort controls;
  `GhostTable.containHorizontal` behavior is unchanged.
- **Performance (10k rows):**
  - When `sorting.length === 1`, phase-one `sortRows` fast path keeps zero
    overhead vs `0.1.0`.
  - When `sorting.length > 1`, decorate-once evaluates accessors `O(n * k)`
    times total across `k` sorted columns instead of inside the comparator.
  - Required regression counter test (matching `use-ghost-data-table.counters.test.ts`):
    2-column sort over 1,000 rows calls each active column's accessor once per
    row (`<= n` calls per sorted column), and paging or toggling row selection
    triggers **zero** comparator/accessor re-evaluations.

### Test plan (required for `0.3.0` implementation gate)

- **Unit (`use-ghost-data-table.test.ts` / `data-table-processing.test.ts`):**
  - Multi-column sort ordering (2 and 3 columns, mixed `asc`/`desc`, tie-breaking,
    stable fallback on total ties, per-column `sortUndefined` `'first' | 'last' | false`,
    custom `sortFn`).
  - `enableMultiSort: false` regression: `setSorting` still truncates to 1,
    `toggleSorting(id, true)` stays single-sort, `data-sort-priority` omitted.
  - Transition matrix: append, in-place `asc -> desc -> remove`, priority
    promotion when priority 1 is removed, unmodified click collapsing `>1` sorts,
    `maxMultiSortColCount` enforcement, `clearSorting()`, deduplication in `setSorting`.
  - Server mode: single `stateChange` per multi-sort toggle with ordered `query.sorting`,
    no page reset, URL hydration silent (no `stateChange` and no `sortAnnouncement`).
  - Counter test (`use-ghost-data-table.counters.test.ts`): multi-column
    decorate-once accessor count and zero re-sort on page/selection change.
- **Interaction helpers & Vue (`data-table-interaction.test.ts`, `GhostDataTableTable.test.ts`, `GhostDataTablePreset.test.ts`, SSR):**
  - Primary `<th>` carries `aria-sort` and `data-sort-priority="1"`; secondary
    `<th>` omits `aria-sort` and carries `data-sort` + `data-sort-priority="2"`.
  - Sort button keeps clean accessible name (excludes decorative badge), exposes
    merged `aria-describedby` pointing outside `<table>`, and `<th>` accessible
    name stays clean (`Amount`, not `"Amount Sorted descending..."`).
  - `sortAnnouncement` live region stays empty on SSR/mount and updates on user
    sort changes.
  - SSR hydration test with `defaultSorting` of length 2 produces zero
    hydration mismatches.
- **Playwright keyboard, focus & axe (`tests/e2e/ghost-data-table.spec.ts`):**
  - `Shift+Click`, `Shift+Enter`, and `Shift+Space` (including releasing `Shift`
    before `Space` `keyup`) add secondary sort, cycle secondary `asc -> desc -> remove`,
    and preserve `toBeFocused()` on the activated sort button.
  - Unmodified `Enter` / `Space` collapses multi-sort back to single-sort;
    `Escape` does not clear sorts.
  - `:is-multi-sort-event="() => true"` + `clearSorting()` flow works without
    modifier keys.
  - Zero `@axe-core/playwright` violations across `thead`, `tbody`, and
    visually hidden live/description nodes with 0, 1, 2, and 3 active sorted
    columns.
- **Manual AT verification (before `stable`):**
  - Record NVDA + Firefox and VoiceOver + Safari evidence per
    [assistive-technology-review.md](../standards/assistive-technology-review.md),
    verifying primary `aria-sort`, secondary `aria-describedby` priority/direction
    readout, clean `<td>` column-header announcements, and polite live-region
    announcements.
- **Bench (`tests/bench/data-table-processing.bench.ts`):**
  - Add 2-column and 3-column 10k-row `sortRows` cases to verify single-column
    fast path has zero regression and multi-column sort stays well within budget.

### Open architectural decisions for Zac (`0.3.0` sign-off)

Production implementation must not begin until Zac approves this addendum and
resolves the decisions below:

1. **Secondary `aria-sort` policy (Q1):**
   - **Recommended (Option A):** Apply `aria-sort="ascending" | "descending"` to
     the **primary** (`sorting[0]`) `<th>` only; omit `aria-sort` on secondary+
     `<th>`s and communicate secondary direction + rank via `aria-describedby` on
     the sort `<button>` (referencing a visually hidden node outside `<table>`)
     plus `aria-live="polite"` announcements. Keeps `th[aria-sort]` `<= 1` per
     WAI-ARIA 1.2.
   - **Alternative (Option B):** Apply `aria-sort="ascending" | "descending"` to
     **all** sorted `<th>`s alongside `aria-describedby` priority text and live
     announcements.
2. **Unmodified activation when `sorting.length > 1` (Q2):**
   - **Recommended:** If the activated column is currently primary (`index === 0`),
     collapse to single-sort and advance its direction (`asc -> desc -> none`);
     if secondary (`index > 0`) or unsorted, collapse to `[{ id, desc: false }]`.
   - **Alternative:** Always reset to `[{ id, desc: false }]` for any column
     when `sorting.length > 1`.
3. **`maxMultiSortColCount` overflow policy (Q3):**
   - **Recommended:** Ignore adding a new column once `sorting.length >= maxMultiSortColCount`
     (existing active sorts keep their priorities until toggled off or cleared).
   - **Alternative:** FIFO-evict the lowest-priority (last) or oldest entry when
     adding a new column at the cap.
4. **No-modifier AT / touch affordance scope (Q4):**
   - **Recommended:** Ship `isMultiSortEvent` (enabling `() => true` additive
     click mode) and `clearSorting()` in `0.3.0`; defer any built-in sort-pill
     toolbar or per-header priority menu UI.
   - **Alternative:** Add a dedicated `alwaysMultiSort?: boolean` prop or
     built-in clear-sort control to `GhostDataTablePreset`.
5. **Per-column `enableMultiSort` override (Q5):**
   - **Recommended:** Keep `enableMultiSort` table-level in `0.3.0`; add
     `DataTableColumnDef.enableMultiSort?: boolean` only if a concrete use case
     requires a sortable column to forbid multi-sort participation.
