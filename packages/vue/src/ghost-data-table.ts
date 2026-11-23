import type { ComputedRef, MaybeRefOrGetter, VNodeChild } from 'vue'

/*
 * Phase-one DataTable contracts (docs/components/data-table-spec.md §Types,
 * ADR 0014). The `DataTable*` names mirror the spec verbatim so the later
 * GhostDataTable root, renderer, and column helpers share one vocabulary.
 */

/** Stable primary key for selection, expansion, and reactivity-safe maps */
export type DataTableRowId = string | number

/** Direction of a column in the single-column phase-one sort; `false` is unsorted. */
export type DataTableSortDirection = 'asc' | 'desc' | false

/** One sorting entry. Phase one honors at most one entry (the first). */
export interface DataTableColumnSort {
  id: string
  desc: boolean
}

/**
 * One column filter. Inactive when `value` is `undefined`, `null`, or `''`
 * (see the default filtering contract in the DataTable spec).
 */
export interface DataTableColumnFilter {
  id: string
  value: unknown
}

export interface DataTablePaginationState {
  /** 1-based page index (matches GhostPagination) */
  pageIndex: number
  pageSize: number
}

/** Snapshot of every dimension that can trigger a server refetch */
export interface DataTableQueryState {
  sorting: DataTableColumnSort[]
  columnFilters: DataTableColumnFilter[]
  globalFilter: unknown
  pagination: DataTablePaginationState
}

/**
 * Consumer-owned column definition. The composable reads it but never mutates
 * it. `enableSorting` and `enableColumnFilter` default to enabled when the
 * column has an accessor; set either to `false` to opt the column out.
 */
export interface DataTableColumnDef<TData> {
  id: string
  header?: string
  accessorKey?: keyof TData & string
  accessorFn?: (row: TData, index: number) => unknown
  /** Headless render hook; Vue accepts VNodeChild from setup render functions */
  /** Render hook: invoke as `cell(context)` — not a Vue component (`<component :is>`) */
  cell?: (context: DataTableCellContext<TData>) => VNodeChild
  enableSorting?: boolean
  enableColumnFilter?: boolean
  /** Placement of `null` / `undefined` values while sorting. @default 'last' */
  sortUndefined?: 'first' | 'last' | false
  /** Local comparator; replaces the default value comparator for this column. */
  sortFn?: (rowA: TData, rowB: TData, columnId: string) => number
  /** Local predicate; replaces the default column-filter matcher for this column. */
  filterFn?: (row: TData, columnId: string, filterValue: unknown) => boolean
  /** Opaque consumer metadata; the composable never reads it. */
  meta?: Record<string, unknown>
}

export interface DataTableCellContext<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
  column: DataTableColumnDef<TData>
  /** Runtime value is unknown; use accessorKey for typed access in templates */
  getValue: () => unknown
}

/** Required row identity callback; there is no index fallback in any build. */
export type DataTableGetRowId<TData> = (
  row: TData,
  index: number,
) => DataTableRowId

export interface DataTableStateChangePayload {
  /** Monotonic id; pair with useGhostDataTableServerRequest */
  requestId: number
  /** What the user last changed */
  trigger: keyof DataTableQueryState
  /** Full query after reset/coalescence rules; sole source for server fetches */
  query: DataTableQueryState
}

/**
 * One entry of a DataTable row model. Field names match
 * {@link DataTableCellContext} so renderers can spread them into cell contexts.
 */
export interface DataTableRow<TData> {
  /** The consumer row object (never cloned or mutated). */
  row: TData
  /** `getRowId(row, rowIndex)`. */
  rowId: DataTableRowId
  /** Index of `row` in the `data` array that was passed in. */
  rowIndex: number
}

/** Header select-all state over the select-all target (see the DataTable spec). */
export interface DataTableHeaderSelectionState {
  /** Every row in the target set is selected (and the set is not empty). */
  allSelected: boolean
  /** Some, but not all, rows in the target set are selected (`indeterminate`). */
  someSelected: boolean
}

/** Options shared by every {@link useGhostDataTable} configuration. */
export interface UseGhostDataTableBaseOptions<TData> {
  /**
   * Consumer-owned rows. Read by reference only: never cloned, deep-watched, or
   * mutated. A new array reference re-runs processing and the pruning and
   * clamping rules.
   */
  data: MaybeRefOrGetter<readonly TData[]>
  /** Consumer-owned column definitions. Not mutated. */
  columns: MaybeRefOrGetter<readonly DataTableColumnDef<TData>[]>
  /** Required in every build; there is no index fallback. */
  getRowId: DataTableGetRowId<TData>
  /** When `true`, `data` arrives globally sorted; local sorting is skipped. @default false */
  manualSorting?: MaybeRefOrGetter<boolean | undefined>
  /** When `true`, `data` arrives globally filtered; local filtering is skipped. @default false */
  manualFiltering?: MaybeRefOrGetter<boolean | undefined>
  /** Optional page-count override; otherwise `max(1, ceil(rowCount / pageSize))`. */
  pageCount?: MaybeRefOrGetter<number | undefined>
  /** When `false`, selection APIs are inert. @default false */
  enableRowSelection?: MaybeRefOrGetter<boolean | undefined>
  /** When `false`, expansion APIs are inert. @default false */
  enableRowExpansion?: MaybeRefOrGetter<boolean | undefined>
  /** When `false`, expanding one row collapses the others. @default true */
  allowMultipleExpanded?: MaybeRefOrGetter<boolean | undefined>
  /** Busy flag for renderers (`aria-busy`). Does not affect processing. @default false */
  loading?: MaybeRefOrGetter<boolean | undefined>
  /** Makes sort, selection, and expansion toggles inert. @default false */
  disabled?: MaybeRefOrGetter<boolean | undefined>

  /** Controlled sorting (at most one entry is honored). Omit for uncontrolled. */
  sorting?: MaybeRefOrGetter<DataTableColumnSort[] | undefined>
  /** Initial uncontrolled sorting. @default [] */
  defaultSorting?: MaybeRefOrGetter<DataTableColumnSort[] | undefined>
  /** Controlled column filters. Omit for uncontrolled. */
  columnFilters?: MaybeRefOrGetter<DataTableColumnFilter[] | undefined>
  /** Initial uncontrolled column filters. @default [] */
  defaultColumnFilters?: MaybeRefOrGetter<DataTableColumnFilter[] | undefined>
  /** Controlled global filter. Omit for uncontrolled. */
  globalFilter?: MaybeRefOrGetter<unknown>
  /** Initial uncontrolled global filter. @default undefined */
  defaultGlobalFilter?: MaybeRefOrGetter<unknown>
  /** Controlled pagination (1-based `pageIndex`). Omit for uncontrolled. */
  pagination?: MaybeRefOrGetter<DataTablePaginationState | undefined>
  /** Initial uncontrolled pagination. @default { pageIndex: 1, pageSize: 10 } */
  defaultPagination?: MaybeRefOrGetter<DataTablePaginationState | undefined>
  /** Controlled selected row ids. Omit for uncontrolled. */
  selectedRowIds?: MaybeRefOrGetter<DataTableRowId[] | undefined>
  /** Initial uncontrolled selected row ids. @default [] */
  defaultSelectedRowIds?: MaybeRefOrGetter<DataTableRowId[] | undefined>
  /** Controlled expanded row ids. Omit for uncontrolled. */
  expandedRowIds?: MaybeRefOrGetter<DataTableRowId[] | undefined>
  /** Initial uncontrolled expanded row ids. @default [] */
  defaultExpandedRowIds?: MaybeRefOrGetter<DataTableRowId[] | undefined>

  /** `update:sorting` writer. */
  onSortingChange?: (sorting: DataTableColumnSort[]) => void
  /** `update:columnFilters` writer. */
  onColumnFiltersChange?: (columnFilters: DataTableColumnFilter[]) => void
  /** `update:globalFilter` writer. */
  onGlobalFilterChange?: (globalFilter: unknown) => void
  /** `update:pagination` writer. */
  onPaginationChange?: (pagination: DataTablePaginationState) => void
  /** `update:selectedRowIds` writer. */
  onSelectedRowIdsChange?: (selectedRowIds: DataTableRowId[]) => void
  /** `update:expandedRowIds` writer. */
  onExpandedRowIdsChange?: (expandedRowIds: DataTableRowId[]) => void
  /**
   * Fired once per action that changes the server query (a dimension whose
   * `manual*` flag is `true`), after every `on*Change` writer and reset rule
   * for that action. Fetch from `payload.query` only.
   */
  onStateChange?: (payload: DataTableStateChangePayload) => void
}

/** Local pagination: the composable slices the processed rows itself. */
export interface UseGhostDataTableLocalPaginationOptions<
  TData,
> extends UseGhostDataTableBaseOptions<TData> {
  /** `data` holds the full set; the composable slices pages. @default false */
  manualPagination?: MaybeRefOrGetter<false | undefined>
  /** Ignored for local pagination; derived from the filtered row count. */
  rowCount?: MaybeRefOrGetter<number | undefined>
}

/** Server pagination: `data` holds one page and `rowCount` is required. */
export interface UseGhostDataTableManualPaginationOptions<
  TData,
> extends UseGhostDataTableBaseOptions<TData> {
  /** When `true`, `data` is one page of rows. */
  manualPagination: MaybeRefOrGetter<boolean | undefined>
  /** Total rows matching the query on the server. Required with `manualPagination`. */
  rowCount: MaybeRefOrGetter<number>
}

/**
 * Options for {@link useGhostDataTable}. `rowCount` is required whenever
 * `manualPagination` may be `true` (`pageCount` alone is insufficient).
 */
export type UseGhostDataTableOptions<TData> =
  | UseGhostDataTableLocalPaginationOptions<TData>
  | UseGhostDataTableManualPaginationOptions<TData>

/** State, row models, and actions returned by {@link useGhostDataTable}. */
export interface UseGhostDataTableReturn<TData> {
  /** Authoritative sorting (controlled prop or internal state). */
  sorting: ComputedRef<DataTableColumnSort[]>
  columnFilters: ComputedRef<DataTableColumnFilter[]>
  globalFilter: ComputedRef<unknown>
  /** Effective pagination; `pageIndex` is clamped to `[1, pageCount]`. */
  pagination: ComputedRef<DataTablePaginationState>
  selectedRowIds: ComputedRef<DataTableRowId[]>
  expandedRowIds: ComputedRef<DataTableRowId[]>
  /** Server `rowCount` with `manualPagination`; otherwise the filtered row count. */
  rowCount: ComputedRef<number>
  /** `pageCount` override, or `max(1, ceil(rowCount / pageSize))`. */
  pageCount: ComputedRef<number>
  /** Full current query using the effective (clamped) pagination. */
  query: ComputedRef<DataTableQueryState>
  loading: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  /** Select-all state over the same id set as {@link toggleAllRowsSelected}. */
  headerSelectionState: ComputedRef<DataTableHeaderSelectionState>

  /** Every `data` row with its id, in source order. */
  getCoreRowModel: () => readonly DataTableRow<TData>[]
  /** Core rows after local sorting (identity when sorting is manual). */
  getSortedRowModel: () => readonly DataTableRow<TData>[]
  /** Sorted rows after local filtering (identity when filtering is manual). */
  getFilteredRowModel: () => readonly DataTableRow<TData>[]
  /** Sort + filter on the processing input, before the pagination slice. */
  getPrePaginationRowModel: () => readonly DataTableRow<TData>[]
  /** Rows to render: the local page slice, or the processed server page. */
  getRowModel: () => readonly DataTableRow<TData>[]
  /** Alias of {@link getRowModel} in phase one (same reference). */
  getPaginationRowModel: () => readonly DataTableRow<TData>[]
  /** Rows of {@link getRowModel} whose ids are selected. */
  getSelectedRowModel: () => readonly DataTableRow<TData>[]

  /** Current direction of `columnId` in the single-column sort. */
  getSortDirection: (columnId: string) => DataTableSortDirection
  /** Whether `columnId` can be sorted (accessor or `sortFn`, `enableSorting !== false`). */
  canSort: (columnId: string) => boolean
  setSorting: (sorting: DataTableColumnSort[]) => void
  /** Tri-state cycle for one column: none → asc → desc → none. Inert when disabled. */
  toggleSorting: (columnId: string) => void
  setColumnFilters: (columnFilters: DataTableColumnFilter[]) => void
  /** Sets (or clears with `undefined` / `null` / `''`) one column filter. */
  setColumnFilter: (columnId: string, value: unknown) => void
  setGlobalFilter: (globalFilter: unknown) => void
  /** Commits pagination; a `pageSize` change resets `pageIndex` to 1. */
  setPagination: (pagination: DataTablePaginationState) => void
  setPageIndex: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void

  isRowSelected: (rowId: DataTableRowId) => boolean
  /** Toggles (or sets with `value`) one row. Inert when selection is off or disabled. */
  toggleRowSelected: (rowId: DataTableRowId, value?: boolean) => void
  /**
   * Selects or clears every id in the select-all target (local:
   * pre-pagination rows; server: {@link getRowModel}) without touching ids
   * outside that set. Without `value`, selects unless all are selected.
   */
  toggleAllRowsSelected: (value?: boolean) => void
  /** Clears every selected id. */
  resetRowSelection: () => void

  isRowExpanded: (rowId: DataTableRowId) => boolean
  /** Toggles (or sets with `value`) one row. Inert when expansion is off or disabled. */
  toggleRowExpanded: (rowId: DataTableRowId, value?: boolean) => void

  /** Re-emits `stateChange` with the current query and a fresh `requestId`. */
  retry: () => void
}
