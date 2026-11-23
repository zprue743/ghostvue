---
schemaVersion: 1.0.0
component: GhostDataTable
components:
  - GhostDataTable
  - GhostDataTableTable
  - GhostDataTablePreset
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
unstyled `@ghostvue/vue` exports (not `@ghostvue/themes`).

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
    <GhostDataTableTable>
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
    </GhostDataTableTable>
    <GhostPagination v-model="pagination.pageIndex" :page-count="pageCount" />
  </GhostDataTable>
</template>
```

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
    v-model:global-filter="globalFilter"
    v-model:selected-row-ids="selectedRowIds"
    v-model:pagination="pagination"
    :data="data"
    :columns="columnDefs"
    :get-row-id="(row) => row.id"
    :enable-row-selection="true"
    :enable-row-expansion="true"
  >
    <GhostDataTablePreset empty-title="No invoices">
      <template #amount="{ value }">{{ value.toFixed(2) }} USD</template>
      <template #detail="{ rowId }">Details for {{ rowId }}</template>
    </GhostDataTablePreset>
    <GhostPagination v-model="pagination.pageIndex" :page-count="pageCount" />
  </GhostDataTable>
</template>
```

Implementation must ship **`GhostDataTablePreset`** so this path is real, not
spec-only.

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
              :key="header.column.id"
              v-bind="getHeaderCellProps(header.column.id)"
            >
              <button
                v-if="header.column.enableSorting"
                v-bind="
                  getSortButtonProps(header.column.id, {
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
`getRowModel()` is empty. Row **inv-2** is selected and expanded in the initial
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

Sort direction on headers is **single-column** in phase one (at most one entry in
`sorting`).

**`GhostDataTableTable` slots:** for each column `id`, optional
`#${columnId}="{ row, rowId, value, getValue, column }"` with **`value` typed**
when the column came from `defineDataTableColumns`.

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
([combobox async pattern](/specs/combobox#useghostcomboboxasyncsearch)).

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

### Pagination

- Shared **1-based** `pageIndex` with `GhostPagination`.
- Whenever **`pageIndex > pageCount`**, **clamp** to `pageCount` (Zac approved).
- **`rowCount === 0`:** **`pageCount` 1**, **`pageIndex` 1** (query-wide empty).
- **`rowCount > 0`** with empty **`getRowModel()`:** keep **`pageIndex`** (page-local
  filter on a server page does not coerce page 1).

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

**Executable example:** `examples/data-table/server-invoices-router.vue` — Vue
Router route with query string encoding filters + page; demonstrates open filtered
URL → change sort → **Back** during pending request → **Retry** after error;
asserts single fetch per action, no hydration `stateChange`, and **both pagination
reset acceptance cases** (page-local filter on page 4 → stay; server filter →
page 1 + one request).

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
- Benchmark file: `tests/bench/data-table-processing.bench.ts`.
- Proposed p95 &lt; 25ms and heap delta &lt; 5MB: **informational until CI
  variance is understood**; not a gate in phase one.

**Deterministic regression checks (required in unit/integration tests):**

| Scenario                            | Assertion                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Page change after local sort        | Comparator / `sortFn` **not invoked again** (zero additional sort passes). |
| Toggle selection on one visible row | **Zero** sort or filter callback invocations.                              |

**Proposed later task (not this PR):** production-browser comparison on
identical 10k `Invoice` rows, same three columns and page size, GhostVue vs
PrimeVue `DataTable`, measuring **input-to-paint** for sort, filter, and
row selection. Document methodology in
`docs/contributing/data-table-benchmark-comparison.md` when scheduled; **no
PrimeVue dependency** in the GhostVue repo.

## Composition

Reuses `GhostTable*`, `GhostPagination`, `GhostCheckbox`, `GhostEmptyState`,
`useControllableState`. **No** themed DataTable wrapper in phase one.

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
- **Acceptance (implementation gate):** reference fixture (**(b)** or preset once
  shipped) — **zero axe violations** on the table scope (`@axe-core/playwright`),
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

- Phase one exports from `@ghostvue/vue` only.
- Changeset when implementation ships; docs-only revisions have no runtime impact.

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

1. **Multi-sort (deferred):** keyboard + AT when `enableMultiSort` ships later.
2. **Benchmark gates:** When to promote informational thresholds to `pnpm verify`.

## Side-by-side results (PrimeVue prototype)

**Gate status:** Exercise **completed** (throwaway prototype,
[PR #269](https://github.com/zprue743/ghostvue/pull/269),
[`prototypes/datatable-primevue/FINDINGS.md`](https://github.com/zprue743/ghostvue/blob/cursor/gho-35-primevue-prototype/prototypes/datatable-primevue/FINDINGS.md)).
**`specStatus` remains `draft`** until Zac promotes the spec through the component
gate (this evidence does **not** auto-approve).

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

| Child issue                                                                                         | Scope                                                    | Complexity |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| **Done:** GhostVue vs PrimeVue prototype ([PR #269](https://github.com/zprue743/ghostvue/pull/269)) | Evidence folded into spec; Zac approval still required   | —          |
| DataTable core types and local processing pipeline                                                  | `useGhostDataTable`, manual matrix, row models           | High       |
| `defineDataTableColumns` + column type tests                                                        | Typed `value` / `getValue`, CI type tests                | Medium     |
| `GhostDataTableTable` default renderer                                                              | Basic example (a), `#columnId` slots                     | Medium     |
| **`GhostDataTablePreset`** (invoice parity, ≤95 LOC)                                                | Example (a′), wired a11y + interaction helpers           | Medium     |
| GhostDataTable headless root and GhostTable composition                                             | Slot bindings, example (b), SSR                          | Medium     |
| Interaction prop helpers                                                                            | Sort / select / expand bindings + focus-on-collapse      | Medium     |
| Server router example + Back/Retry tests                                                            | `server-invoices-router.vue`, race tests                 | High       |
| Column sorting UI and header a11y                                                                   | Single-column sort, `aria-sort`                          | Medium     |
| Filtering model and toolbar composition docs                                                        | Conditional page reset vs `manualFiltering`              | Low        |
| Pagination integration                                                                              | `rowCount`, empty → page 1, `GhostPagination`            | Low        |
| Row selection (local + server)                                                                      | Select-all rules, no server prune, cross-page tests      | High       |
| Row expansion rows                                                                                  | Detail `<tr>`, server no-prune                           | Medium     |
| Server mode and async guard                                                                         | Coalesced `stateChange`, full `query`, stale guard tests | Medium     |
| Performance benchmark harness                                                                       | Vitest bench, sort/page regression counters              | Low        |
| **Deferred:** PrimeVue 10k browser comparison                                                       | `docs/contributing/data-table-benchmark-comparison.md`   | Medium     |
| Headless docs and executable examples                                                               | `data-table.md`, `examples/data-table/`                  | Medium     |
| **Deferred:** Themed GhostDataTable                                                                 | `@ghostvue/themes` wrapper                               | Medium     |
| **Deferred:** Multi-column sort spec                                                                | Keyboard + AT                                            | Medium     |
| **Deferred:** Virtualization spec                                                                   | Scroll + a11y                                            | High       |
| **Deferred:** Treegrid / grid keyboard spec                                                         | Roving focus                                             | High       |

Parent **GHO-35** tracks specification approval at **`specStatus: draft`** until
Zac promotes the spec through the component gate.
