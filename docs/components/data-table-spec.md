---
schemaVersion: 1.0.0
component: GhostDataTable
components:
  - GhostDataTable
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
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
unresolvedQuestions: []
---

# GhostDataTable specification

**Status:** Draft architecture and phase-one scope for
[GHO-35](https://linear.app/ghost-vue/issue/GHO-35). Approved direction: **option
A** (Vue-first composable + native `GhostTable` composition), recorded in
[ADR 0014](../adr/0014-datatable-phase-one-architecture.md). Zac sign-off is
required on this spec, the ADR, and proposed performance thresholds before
implementation.

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
- Column resize/reorder drag handles, grouping, pivoting, aggregation, and
  built-in query builders.
- Data fetching, caching, SWR, optimistic updates, and error UI (consumer-owned;
  composable provides hooks and stale-response guard only).
- Cloning or deep-watching the consumer `data` array; mutating row objects.
- A shared table engine singleton, global registry, or cross-route table state
  store.
- Implicit server sync: every manual/server dimension requires an explicit flag.

## Public API

### Types (exact contracts)

These types are the phase-one public TypeScript contracts. Names live in
`@ghostvue/vue` (exact export paths chosen at implementation).

```ts
/** Stable primary key for selection, expansion, and Reactivity-safe maps */
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

type DataTableSelectionScope = 'page' | 'all'

interface DataTableColumnDef<TData> {
  /** Stable column id; used in sort/filter state */
  id: string
  /** Header text or render via slot; optional when slot-only */
  header?: string
  /** Typed key access when value is a direct property */
  accessorKey?: keyof TData & string
  /** Preferred for nested or computed values */
  accessorFn?: (row: TData, index: number) => unknown
  enableSorting?: boolean
  enableColumnFilter?: boolean
  sortUndefined?: 'first' | 'last' | false
  /** Local sort only; ignored when manualSorting */
  sortFn?: (rowA: TData, rowB: TData, columnId: string) => number
  /** Local filter only; ignored when manualFiltering */
  filterFn?: (row: TData, columnId: string, filterValue: unknown) => boolean
  meta?: Record<string, unknown>
}

interface DataTableCellContext<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
  column: DataTableColumnDef<TData>
  getValue: () => unknown
}

type DataTableGetRowId<TData> = (
  row: TData,
  index: number,
  parent?: TData,
) => DataTableRowId

interface DataTableProcessingMeta {
  /** Monotonic id bumped when a server refetch should run */
  requestId: number
  reason: 'sorting' | 'columnFilters' | 'globalFilter' | 'pagination' | 'manual'
}
```

Default comparators (local mode):

- Strings: `localeCompare` with `numeric: true`.
- Numbers: numeric subtraction.
- Dates: compare `getTime()` when both values are `Date`.
- `undefined` / missing: ordered per column `sortUndefined` (default `'last'`).

Default `filterFn` for column filters: case-insensitive substring match on
stringified cell value when filter value is a string; exact equality otherwise
(documented; consumers may override per column).

### Props and configuration

Headless `GhostDataTable` / `useGhostDataTable` options:

| Option                  | Type                          | Default  | Contract                                                                                 |
| ----------------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `data`                  | `readonly TData[]`            | required | Consumer-owned rows. Reference equality marks a new dataset for reset rules.             |
| `columns`               | `DataTableColumnDef<TData>[]` | required | Column definitions; not mutated by the library.                                          |
| `getRowId`              | `DataTableGetRowId<TData>`    | required | Must be stable across reorder, filter, and page changes for the same entity.             |
| `manualSorting`         | `boolean`                     | `false`  | When `true`, composable does not reorder `data`; emits sorting changes only.             |
| `manualFiltering`       | `boolean`                     | `false`  | When `true`, composable does not filter `data`.                                          |
| `manualPagination`      | `boolean`                     | `false`  | When `true`, composable does not slice `data`; consumer passes one page.                 |
| `rowCount`              | `number`                      | derived  | Required when `manualPagination` is `true`: total rows after consumer filter/sort.       |
| `pageCount`             | `number`                      | derived  | Optional override when consumer knows total pages without local slice.                   |
| `enableMultiSort`       | `boolean`                     | `false`  | Multiple `DataTableColumnSort` entries; Shift+click toggles secondary sorts in UI layer. |
| `enableRowSelection`    | `boolean`                     | `false`  | When `false`, selection APIs are inert.                                                  |
| `selectionScope`        | `DataTableSelectionScope`     | `'page'` | Page vs global selection semantics (see [State model](#state-model)).                    |
| `enableRowExpansion`    | `boolean`                     | `false`  | When `false`, expansion APIs are inert.                                                  |
| `allowMultipleExpanded` | `boolean`                     | `true`   | When `false`, opening one row collapses others.                                          |
| `loading`               | `boolean`                     | `false`  | Consumer-owned; sets `aria-busy` on table region.                                        |
| `disabled`              | `boolean`                     | `false`  | Disables sort, selection, and expansion affordances.                                     |

Named ESM exports (phase one): `GhostDataTable`, `useGhostDataTable`,
`useGhostDataTableServerRequest`, and the types above.

### v-model contracts

| State          | Prop             | Emit                    | Uncontrolled initial                         |
| -------------- | ---------------- | ----------------------- | -------------------------------------------- |
| Sorting        | `sorting`        | `update:sorting`        | `defaultSorting` (`DataTableColumnSort[]`)   |
| Column filters | `columnFilters`  | `update:columnFilters`  | `defaultColumnFilters`                       |
| Global filter  | `globalFilter`   | `update:globalFilter`   | `defaultGlobalFilter`                        |
| Pagination     | `pagination`     | `update:pagination`     | `defaultPagination`                          |
| Row selection  | `selectedRowIds` | `update:selectedRowIds` | `defaultSelectedRowIds` (`DataTableRowId[]`) |
| Expansion      | `expandedRowIds` | `update:expandedRowIds` | `defaultExpandedRowIds`                      |

All use `useControllableState`. Controlled `undefined` means uncontrolled for
that dimension (per [component-state.md](../architecture/component-state.md)).

**Reset rules** (synchronous on user input or prop change):

| Event                        | Sorting | Filters | Pagination                             | Selection                     | Expansion         |
| ---------------------------- | ------- | ------- | -------------------------------------- | ----------------------------- | ----------------- |
| `globalFilter` change        | kept    | updated | **page → 1**                           | kept (ids)                    | kept              |
| `columnFilters` change       | kept    | updated | **page → 1**                           | kept                          | kept              |
| `pagination.pageSize` change | kept    | kept    | **page → 1**                           | kept                          | kept              |
| `data` reference change      | kept    | kept    | **page → 1** unless `manualPagination` | prune missing ids (see below) | prune missing ids |
| `sorting` change             | updated | kept    | kept (unless consumer refetch resets)  | kept                          | kept              |

When `data` changes, **selection** and **expansion** drop ids that no longer
exist in the new `data` array but do not emit until the composable reconciles
(implementation must emit `update:selectedRowIds` / `update:expandedRowIds` if
pruned). **Global scope** selection retains ids not on the current page.

### Events, callbacks, slots, and exposed methods

- `stateChange` — `DataTableProcessingMeta` when sort, filter, or pagination
  state changes and a server refetch may be needed (includes `requestId`).
- `update:*` — per v-model row above.
- Default slot — `{ tableProps, headerGroups, rows, ...actions }` for composing
  `GhostTable*` primitives (exact slot prop record typed at implementation).
- `header` slot — per-column header UI with `{ column, sortDirection, toggleSort }`.
- `cell` slot — `DataTableCellContext<TData>` when column `cell` callback omitted.
- `expandedRow` slot — `{ row, rowId }` content for expansion `<tr>`.

`toggleAllRowsSelected`, `toggleRowSelected`, `toggleRowExpanded`, and
`resetRowSelection` are exposed on the composable return (and `GhostDataTable`
template refs) as functions, not separate events.

`useGhostDataTableServerRequest` returns `{ begin(requestId), isLatest(requestId) }`.
At fetch start, `begin(payload.requestId)`; apply `data` / `rowCount` updates only
when `isLatest` is true (same contract as
[`useGhostComboboxAsyncSearch`](./combobox-spec.md#useghostcomboboxasyncsearch)).

### Derived models

| Model                        | Local mode                                                               | Manual mode                             |
| ---------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `getPrePaginationRowModel()` | Rows after sort + filter                                                 | Same as `data` (consumer pre-processed) |
| `getPaginationRowModel()`    | Slice for current page                                                   | `data` as-is                            |
| `getSelectedRowModel()`      | Rows whose ids are in `selectedRowIds` and exist in pre-pagination model | Same                                    |
| `getExpandedRowModel()`      | Rows whose ids are in `expandedRowIds`                                   | Same                                    |

## State model

### Sorting

- Tri-state per column when not multi-sort: none → asc → desc → none.
- `aria-sort` on `<th>`: `ascending`, `descending`, or attribute removed.
- Sort UI is a **native `button type="button"`** inside the header cell (not
  the whole `<th>` as a button).

### Filtering

- Global filter runs before column filters in the local pipeline (AND).
- Filter UI is consumer-composed (`GhostInput`, etc.); composable stores values
  only.

### Pagination

- Integrates with `GhostPagination` via shared **1-based** `pageIndex`.
- `pageCount = ceil(rowCount / pageSize)`; clamps current page when `pageCount`
  shrinks (same pattern as [pagination-spec](./pagination-spec.md)).

### Selection

| `selectionScope` | Select-all header                            | Selected ids                                                |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `page`           | Toggles all **visible** rows on current page | Only rows on current page can be toggled via row checkboxes |
| `all`            | Selects all rows in **pre-pagination** model | Ids may include rows not on the current page                |

Header checkbox states: `checked`, unchecked, or `mixed` (`aria-checked="mixed"`)
when some but not all eligible rows are selected.

Select-all does **not** clear global selection when moving pages in `all` scope.

### Expansion

- Expanded content is a **following `<tr>`** with one `<td colspan={columnCount}>`.
- Toggling expansion does not change selection or sort.
- With `allowMultipleExpanded: false`, expanding row B collapses row A.

### Loading, empty, disabled, read-only, and error states

| State      | Behavior                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| `loading`  | `aria-busy="true"` on table `data-part` root; consumers often show `GhostSkeleton` cells |
| Empty page | Zero rows after pipeline → compose `GhostEmptyState` in a single body cell               |
| `disabled` | Sort buttons and checkboxes inactive; no state emits                                     |
| Errors     | Consumer-owned (`GhostInlineAlert` above table); composable does not own error text      |

### Async behavior

The composable does not await network I/O. Recommended consumer pattern:

1. Listen to `stateChange` (or watch sorting/filters/pagination).
2. Set `loading` true; call `begin(requestId)`.
3. On response, update `data` and `rowCount` only if `isLatest(requestId)`.

Required tests (when implemented): fast-then-slow response race, overlapping
sort changes, and pagination change during in-flight fetch.

## Consumer data

- Consumers supply `TData[]`; objects keep consumer identity (no clone).
- **`getRowId` is required** for selection and expansion correctness when data
  mutates. Index-only ids are a last resort for static demo data only (see open
  questions).
- **Accessors:** prefer `accessorKey` for top-level fields; `accessorFn` for
  nested paths (`row => row.user.name`) or derived values.
- **Adapters:** unusual sources map to `TData` before passing `data`; the
  composable does not accept GraphQL edge wrappers directly.
- Column `meta` is for consumer slot logic only; not read by core processing.

### Row identity across changes

| Change type           | Identity rule                                                       |
| --------------------- | ------------------------------------------------------------------- |
| Reorder within `data` | Same `getRowId` → same selection/expansion                          |
| Insert/remove rows    | New ids selectable; removed ids pruned from selection/expansion     |
| Filter / page         | Rows retain ids; hidden rows stay selected in `all` scope           |
| Server refresh        | Consumer should preserve ids for the same entities across responses |

## Accessibility contract

### Semantics and relationships

- Root: native `<table>` via `GhostTable` (no redundant `role="table"`).
- Caption optional via `GhostTableCaption`.
- Sortable headers: `<th scope="col">` containing a visible label and sort
  button; `aria-sort` on `<th>`.
- Selection column: `<th scope="col">` with select-all `GhostCheckbox`; row cells
  use `GhostCheckbox` with `aria-label` including row position or primary column
  value (consumer-provided label template).
- Expansion control: native `button type="button"` with `aria-expanded` on the
  control; expanded panel referenced via `aria-controls` when ids are stable.

### Keyboard interaction

Phase one follows **native control** behavior only:

| Key               | Context       | Behavior                                           |
| ----------------- | ------------- | -------------------------------------------------- |
| `Enter` / `Space` | Sort button   | Toggle sort per tri-state cycle                    |
| `Enter` / `Space` | Checkbox      | Toggle selection                                   |
| `Enter` / `Space` | Expand button | Toggle expansion                                   |
| `Tab`             | Table         | Moves between focusable controls in document order |

No row/column arrow navigation in phase one.

### Focus behavior

- Table is not a single tab stop.
- No focus trap in the table body.
- After sort toggle, focus remains on the sort button (no roving focus).

### Assistive technology expectations

- Sort changes do not use a live region by default (avoids chatter); optional
  consumer announcement for async refetch completion.
- Result count copy ("Showing X–Y of Z") is consumer-owned next to
  `GhostPagination`.

## Rendering and customization

- Stable hooks: reuse `GhostTable` `data-part` classes (`ghost-table-*`) plus
  `data-ghost-data-table` on the processing root wrapper when present.
- Sort active state: `data-sort={direction}` on header cell part.
- Selected row: `data-state="selected"` on `GhostTableRow`.
- Expanded row: `data-state="expanded"` on data row; detail row `data-part="detail"`.

Consumers customize via slots and themed CSS on table parts, not internal
wrapper nesting.

## Environment behavior

### SSR and hydration

- Initial render uses consumer `data` and state props; no `window` in processing.
- `loading` skeletons may differ client-side; avoid hydration mismatch by
  rendering the same row count on server and client for a given props snapshot.

### Mobile and touch

- Horizontal overflow: `GhostTable.containHorizontal` on the table wrapper.
- Touch targets for sort, checkbox, and expand meet shared control sizing via
  themed tokens.

## Performance

### Expectations

- Local pipeline (sort + filter + paginate) on **10,000** rows must complete in
  **paginated rendering** scenarios: DOM contains **O(pageSize)** data rows, not
  10,000.
- Avoid O(n²) patterns: single pass filter; stable sort; no deep watchers on
  `data`.

### Reproducible benchmark environment (proposal — pending Zac approval)

| Item                            | Proposal                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Fixture                         | Vitest bench file `tests/bench/data-table-processing.bench.ts`                                         |
| Dataset                         | 10,000 generated rows `{ id: string, name: string, amount: number, createdAt: Date, active: boolean }` |
| Page size                       | 25                                                                                                     |
| Operations timed                | Cold sort on `amount`; cold global filter string; pagination page change (slice only)                  |
| Environment pin                 | CI Linux agent; Node version from `engines`; CPU parallelism documented in bench README                |
| **Time threshold (proposal)**   | Each operation **p95 &lt; 25ms** on pinned fixture                                                     |
| **Memory threshold (proposal)** | Heap delta **&lt; 5MB** above retained `data` after 50 sort/filter cycles (no retained closure leaks)  |

Until approved, bench thresholds are **informational** and not CI gates.

### Identity and caching

- Memoize row models by `[data, sorting, columnFilters, globalFilter, pagination]`
  structural sharing where Vue reactivity allows.
- Invalidate caches when `data` reference or controlled state changes.

## Composition

Reuses without forking:

- `GhostTable*` primitives ([table-spec](./table-spec.md))
- `GhostPagination` ([pagination-spec](./pagination-spec.md))
- `GhostCheckbox` ([checkbox-spec](./checkbox-spec.md))
- `GhostEmptyState`, `GhostSkeleton`, `GhostSpinner` for states
- `useControllableState`, `useGhostId` ([component-state.md](../architecture/component-state.md))

Does not import overlay positioning for phase one unless filter UI uses existing
menu primitives in examples only.

## Test plan

When implementation starts:

- **Unit:** sort/filter/pagination pipeline, reset matrix, `getRowId` stability,
  selection scope math, expansion colspan layout, manual vs local flags.
- **Unit:** `useGhostDataTableServerRequest` stale guard.
- **Vue:** slot composition with `GhostTable` SSR hydration fixture.
- **Browser:** sort + selection keyboard on native controls; axe with table
  loading on/off.
- **Type:** exported generic inference for `accessorKey` and `getValue()`.
- **Bench:** 10k-row fixture per performance section (record results in PR).

## Documentation plan

- `docs/components/data-table.md` with local-only, server-driven, selection, and
  expansion examples.
- Executable examples under `examples/data-table/`.
- Link from [roadmap.md](../roadmap.md) when status moves beyond draft.
- Cross-link ADR 0014 and prerequisite components.

## Compatibility and release impact

- New exports from `@ghostvue/vue` and optional `@ghostvue/themes` wrapper.
- Minor Changesets when behavior ships; **this spec-only PR** has no runtime
  release impact.
- Public name `GhostDataTable` aligns with ADR 0003 / 0010.

## Open architectural questions

Questions below are **explicitly unresolved**. Implementation must not silently
decide them; Zac is the default reviewer.

1. **Index fallback for `getRowId`:** Should the composable accept omitted
   `getRowId` only in development with a console warning, or always require it?
2. **Global filter debouncing:** Composable emits every keystroke vs built-in
   optional debounce helper — keep filter timing fully consumer-owned?
3. **`stateChange` granularity:** One event with `reason` vs separate emits per
   dimension for server listeners.
4. **Select-all in `all` scope:** Does select-all include rows filtered out
   visually but still in `data`, or only rows matching the active filter pipeline
   (spec text assumes pipeline-matching rows — confirm)?
5. **Themed default markup:** Does `@ghostvue/themes` ship a batteries-included
   table layout in phase one, or only tokens/CSS recipes with headless composition
   docs?
6. **Benchmark enforcement:** When p95 thresholds are approved, do they become
   `verify` gates or report-only in CI?

## Child work decomposition

Suggested Linear child issues (titles, scope, rough complexity). Complexity is
**engineering depth**, not calendar time.

| Child issue (title)                                              | Scope                                                                                      | Complexity |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| DataTable core types and local processing pipeline               | `useGhostDataTable` pure pipeline, default sort/filter fns, derived row models, unit tests | High       |
| GhostDataTable headless root and GhostTable composition          | Renderless root, slot props, SSR example, integration with `GhostTable` parts              | Medium     |
| Column sorting UI and header a11y                                | Sort button slot, `aria-sort`, tri-state and multi-sort UX                                 | Medium     |
| Filtering model and toolbar composition docs                     | Column/global filter state, reset rules, example with `GhostInput`                         | Low        |
| Pagination integration                                           | Wire `pagination` state to `GhostPagination`, clamp rules                                  | Low        |
| Row selection (page vs all scope)                                | `selectedRowIds`, select-all/mixed, `GhostCheckbox` composition                            | High       |
| Row expansion rows                                               | `expandedRowIds`, detail `<tr>`, `allowMultipleExpanded`                                   | Medium     |
| Server/manual mode and async guard                               | Manual flags, `rowCount`, `stateChange` + `useGhostDataTableServerRequest`, race tests     | Medium     |
| Performance benchmark harness                                    | `tests/bench/data-table-processing.bench.ts`, documented fixture, threshold proposal       | Low        |
| Themed GhostDataTable (optional phase-one)                       | Default chrome in `@ghostvue/themes`                                                       | Medium     |
| **Deferred:** DataTable row virtualization spec                  | Virtualizer boundary, scroll container with `GhostScrollArea`, a11y                        | High       |
| **Deferred:** DataTable treegrid / grid keyboard navigation spec | `role="treegrid"` or APG grid pattern, roving focus, key map                               | High       |

Parent epic **GHO-35** tracks specification approval; children split
implementation and deferred designs.
