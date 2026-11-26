# GhostDataTable

`GhostDataTable` adds sorting, filtering, pagination, row selection, and
expandable detail rows to a native [`GhostTable`](./table.md). It is headless:
import it from `@ghostvue/vue`. There is no themed DataTable in
`@ghostvue/themes` yet. You own the row data, fetching, and layout; the table
owns the interaction state and its accessible markup.

Start with one of two paths. Both use the same invoice rows and typed columns.

- **(a) Basic.** Put `GhostDataTableTable` inside the root to
  render headers, sort buttons, and rows from your columns. Reach for
  `GhostDataTablePreset` when you also want search, selection,
  expansion, and an empty state without writing markup.
- **(b) Full.** Compose `GhostTable` parts yourself in the root's
  default slot. Every control gets its labels and ARIA
  state from slot bindings, so you choose the markup without losing
  accessibility.

The phase-one architecture is recorded in
[ADR 0014](../adr/0014-datatable-phase-one-architecture.md). The full contract
is the [GhostDataTable specification](/specs/data-table).

## Prerequisites

`GhostDataTable` builds on these components. Read their pages for the parts
you compose:

- [`GhostTable`](./table.md) for the native table, its parts, and
  `contain-horizontal` scrolling.
- [`GhostPagination`](./pagination.md) for the pager.
- [`GhostCheckbox`](./checkbox.md) for row and select-all checkboxes.
- [`GhostInput`](./input.md) for search and filter fields.
- [`GhostEmptyState`](./empty-state.md) for the no-results row.

Every table needs `data`, `columns`, and `getRowId`. `getRowId` is required: it
keys selection, expansion, and stable rendering. The library never clones,
deep-watches, or mutates your `data`.

## Basic (a)

<GhostExample id="data-table/basic-invoices" />

`defineDataTableColumns<Invoice>()` builds typed columns. `accessorKey`
checks the key against `Invoice` and infers each column's value type, so
renaming a row field breaks the column at compile time. Pass the same
`columns` array to `GhostDataTableTable` and each `#<columnId>` slot gets a
typed `value`: in the example `value.toFixed(2)` type-checks because `amount`
is a number.

`GhostDataTableTable` renders one header row, a sort button in each sortable
header, and one body row per rendered row. A cell slot wins over the column's
`cell` hook, which wins over the plain value. Its `columns` prop also picks and
orders the rendered columns.

### Preset (a′)

<GhostExample id="data-table/preset-invoices" />

`GhostDataTablePreset` is the batteries-included child. It renders a labelled
global search field, a selection column with a select-all checkbox, an
expansion column with labelled expand buttons and detail rows, sort buttons,
and a `GhostEmptyState` row when nothing matches. Use it instead of a manual
`#default` composition, not next to one.

- Props: `emptyTitle`, `emptyHeadingLevel`, `searchLabel`,
  `selectionHeaderLabel`, `expansionHeaderLabel`, `showGlobalFilter`, and the
  localized control names `selectAllLabel`, `rowSelectionLabel`, and
  `rowExpansionLabel`.
- Slots: typed `#<columnId>` cells, `#detail="{ row, rowId, rowIndex }"`,
  `#toolbar`, and `#search` to replace the default search field.
- `disabled` and `loading` come from the parent `GhostDataTable`.

## Full composition (b)

<GhostExample id="data-table/full-invoices" />

Without a renderer child, the root renders no element. Its default slot hands
you `tableRootProps`, `headers`, `rows`, and getters for every part. Spread
each getter on the matching element:

| Binding                                         | Spread on                                  |
| ----------------------------------------------- | ------------------------------------------ |
| `tableRootProps`                                | `GhostTable`                               |
| `getHeaderCellProps(columnId)`                  | `GhostTableHeaderCell` (`aria-sort`)       |
| `getSortButtonProps(columnId)`                  | the sort `<button>` inside the header cell |
| `getRowProps(rowId)`                            | the data `GhostTableRow`                   |
| `getBodyCellContext(rowId, columnId)`           | the cell value and `getValue()`            |
| `getHeaderSelectionCheckboxProps()`             | the select-all `GhostCheckbox`             |
| `getRowSelectionCheckboxProps(rowId)`           | each row `GhostCheckbox`                   |
| `getRowExpandButtonProps(rowId)`                | each expand `<button>`                     |
| `detailRowProps`                                | the detail `GhostTableRow`                 |
| `pagination`, `pageCount`, `setPageIndex`       | a co-located `GhostPagination`             |
| `headerSelectionState`, `toggleAllRowsSelected` | the select-all checkbox state              |

Keep the `id` from `getRowExpandButtonProps`. When a detail row collapses
while focus is inside it, the root moves focus back to that button.

For layouts without the root, the same attributes come from the exported
helpers `getDataTableHeaderCellProps`, `getDataTableSortButtonProps`,
`getDataTableRowSelectionCheckboxProps`,
`getDataTableHeaderSelectionCheckboxProps`, and
`getDataTableRowExpandButtonProps`. Each takes a `useGhostDataTable` return as
its first argument.

## Pagination

<GhostExample id="data-table/paginated-invoices" />

`pagination.pageIndex` is 1-based, like `GhostPagination`. Bind the pager to
the root's `pagination`, `pageCount`, and `setPageIndex` slot bindings, not to
your own `data.length`. The pager then follows the filtered count (or the
server `rowCount`) and shows page 1 of 1 when nothing matches.

When the page count shrinks, the root clamps `pageIndex` to the last page. A
local filter keeps the current page and clamps; it does not jump to page 1.

## Server data

<GhostExample id="data-table/server-invoices-router" />

Set `manualSorting`, `manualFiltering`, and `manualPagination` when the server
sorts, filters, and pages. Pass one page as `data` and the query-wide total as
`rowCount`. The root then emits one `stateChange` per user action, with the
full query: a server filter on page 4 emits a single event that also carries
`pageIndex: 1`. Fetch from `payload.query` only.

Guard every response with `useGhostDataTableServerRequest()`:

```ts
const request = useGhostDataTableServerRequest()

async function onStateChange({
  requestId,
  query,
}: DataTableStateChangePayload) {
  request.begin(requestId) // before any await
  loading.value = true
  try {
    const page = await fetchInvoices(query)
    if (!request.isLatest(requestId)) return
    data.value = page.rows
    rowCount.value = page.total
  } finally {
    if (request.isLatest(requestId)) loading.value = false
  }
}
```

A stale response, or a stale `finally`, then cannot overwrite a newer one.
`retry()` on the template ref re-emits the current query with a fresh
`requestId`. The example also syncs the query to the URL: it reads the query
string on load, pushes one history entry per committed query, and refetches
after Back without letting the pending response apply. It uses
`window.history` so it needs no router; with Vue Router, swap the small URL
adapter for `route.query` and `router.push`.

## Behavior

- **Sorting.** One column at a time. Each sort button cycles none, ascending,
  descending. `aria-sort` sits on the sorted `<th>` only.
- **Filtering.** The global filter is a case-insensitive substring match across
  every column with an accessor (OR). Column filters combine with AND. `''`,
  `null`, and `undefined` clear a filter. Debouncing is yours.
- **Selection.** With local data, select-all covers every filtered row across
  pages. In server mode it covers the visible rows only, and ids on other pages
  stay selected. Local selection drops ids only when the source `data` no
  longer contains the row, never because a filter hides it.
- **Expansion.** Detail rows render as a second `<tr>` after the data row.
  `allowMultipleExpanded: false` keeps one row open.
- **Loading and disabled.** `loading` sets `aria-busy` on the table.
  `disabled` disables sort, selection, and expansion controls.
- **Empty.** Render a `GhostEmptyState` in a full-width row when `rows` is
  empty. Keep the header row mounted.

## API

### `GhostDataTable`

<!-- @generated docs-api:vue/ghost-data-table begin -->

<!-- Source: packages/vue/manifests/ghost-data-table.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop                    | Type                                   | Default  | Description                                                                    |
| ----------------------- | -------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `allowMultipleExpanded` | `boolean`                              | `true`   | When `false`, expanding one row collapses the others.                          |
| `ariaLabel`             | `string`                               | —        | Accessible name for the table, applied through `tableRootProps`.               |
| `ariaLabelledby`        | `string`                               | —        | Id of a visible label for the table, applied through `tableRootProps`.         |
| `columnFilters`         | `DataTableColumnFilter[]`              | —        | Declared prop `columnFilters`.                                                 |
| `columns`               | `readonly DataTableColumnDef<TData>[]` | Required | Consumer-owned column definitions. Not mutated.                                |
| `data`                  | `readonly TData[]`                     | Required | Consumer-owned rows, read by reference only (never cloned or mutated).         |
| `defaultColumnFilters`  | `DataTableColumnFilter[]`              | —        | Declared prop `defaultColumnFilters`.                                          |
| `defaultExpandedRowIds` | `DataTableRowId[]`                     | —        | Declared prop `defaultExpandedRowIds`.                                         |
| `defaultGlobalFilter`   | `unknown`                              | —        | Declared prop `defaultGlobalFilter`.                                           |
| `defaultPagination`     | `DataTablePaginationState`             | —        | Declared prop `defaultPagination`.                                             |
| `defaultSelectedRowIds` | `DataTableRowId[]`                     | —        | Declared prop `defaultSelectedRowIds`.                                         |
| `defaultSorting`        | `DataTableColumnSort[]`                | —        | Declared prop `defaultSorting`.                                                |
| `disabled`              | `boolean`                              | `false`  | Makes sort, selection, and expansion inert and disables their controls.        |
| `enableRowExpansion`    | `boolean`                              | `false`  | Turns on detail rows.                                                          |
| `enableRowSelection`    | `boolean`                              | `false`  | Turns on selection.                                                            |
| `expandedRowIds`        | `DataTableRowId[]`                     | —        | Declared prop `expandedRowIds`.                                                |
| `getRowId`              | `DataTableGetRowId<TData>`             | Required | Required in every build; there is no index fallback.                           |
| `globalFilter`          | `unknown`                              | —        | Declared prop `globalFilter`.                                                  |
| `loading`               | `boolean`                              | `false`  | Sets `aria-busy="true"` through `tableRootProps`.                              |
| `manualFiltering`       | `boolean`                              | `false`  | The server filters; filter changes reset to page 1.                            |
| `manualPagination`      | `boolean`                              | `false`  | When `true`, `data` is one server page and `rowCount` is required.             |
| `manualSorting`         | `boolean`                              | `false`  | The server sorts; the root does not reorder `data`.                            |
| `pageCount`             | `number`                               | —        | Optional page-count override.                                                  |
| `pagination`            | `DataTablePaginationState`             | —        | Declared prop `pagination`.                                                    |
| `rowCount`              | `number`                               | —        | Total rows matching the query on the server. Required with `manualPagination`. |
| `selectedRowIds`        | `DataTableRowId[]`                     | —        | Declared prop `selectedRowIds`.                                                |
| `sorting`               | `DataTableColumnSort[]`                | —        | Declared prop `sorting`.                                                       |

| Event         | Payload                       | Description               |
| ------------- | ----------------------------- | ------------------------- |
| `stateChange` | `DataTableStateChangePayload` | Emitted as `stateChange`. |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Primary content. |

<!-- @generated docs-api:vue/ghost-data-table end -->

Each state is a `v-model` with a `default*` prop for uncontrolled use:
`sorting`, `columnFilters`, `globalFilter`, `pagination`, `selectedRowIds`, and
`expandedRowIds`. `stateChange` carries `{ requestId, trigger, query }` for
server tables.

The template ref exposes row, selection, expansion, sorting, filter, and
pagination actions, including `toggleAllRowsSelected`, `toggleRowSelected`,
`toggleRowExpanded`, `resetRowSelection`, `setGlobalFilter`, and `retry()`.

### Other exports

- `GhostDataTableTable`: the default renderer for path (a).
- `GhostDataTablePreset`: the batteries-included renderer for path (a′).
- `useGhostDataTable`: the state and row models without the root, for layouts
  that are not tables.
- `useGhostDataTableServerRequest`: the stale-response guard.
- `defineDataTableColumns`: the typed column factory.
- The five `getDataTable*Props` interaction helpers.
- The `DataTable*` and `GhostDataTable*` types.

Prop, slot, and event details for each component are in the
[API reference](/reference/) and the generated manifests.

## Accessibility

The table is a native `<table>`, not a `grid`. `Tab` moves between the
focusable controls; there is no arrow-key cell navigation.

| Key               | Control            | Behavior                     |
| ----------------- | ------------------ | ---------------------------- |
| `Enter` / `Space` | Sort button        | Cycles the column sort.      |
| `Space`           | Selection checkbox | Toggles the row or all rows. |
| `Enter` / `Space` | Expand button      | Opens or closes the detail.  |

- Labels and ARIA state land on the focusable control (the checkbox input or
  the button), not on a wrapper. Icon-only header cells get a column name.
- The select-all checkbox shows a mixed state when some rows are selected.
- Give the table a name with `aria-label` or `aria-labelledby` on the root.
- Announcing async results is yours; add a polite live region if needed.

## Styling

The headless parts paint nothing. Style with the `GhostTable` `data-part`
hooks plus these attributes:

- `data-sort="asc" | "desc"` on the sorted header cell.
- `data-selected="true"` and `data-expanded="true"` on data rows.
- `data-detail-row="true"` on detail rows, which keep `data-part="row"`.
- `data-ghost-data-table` on the table root.

## Not in phase one

Multi-column sort, virtualization, sticky headers, frozen columns, column
resize and reorder, grouping, server-wide "select all matching", and a themed
wrapper are out of scope. See the
[specification's non-goals](/specs/data-table#non-goals).
