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
  /**
   * Monotonic id minted by the table for this emit (including `retry()`).
   * Pass it to {@link UseGhostDataTableServerRequestReturn.begin} and gate
   * every response write with `isLatest(requestId)`. Consumers never mint ids.
   */
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
  /**
   * Resolved `enableRowSelection`. Selection is still inert while
   * {@link disabled} is `true`.
   */
  rowSelectionEnabled: ComputedRef<boolean>
  /**
   * Resolved `enableRowExpansion`. Expansion is still inert while
   * {@link disabled} is `true`.
   */
  rowExpansionEnabled: ComputedRef<boolean>
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

/** Return type of {@link useGhostDataTableServerRequest}. */
export interface UseGhostDataTableServerRequestReturn {
  /**
   * Records `requestId` from a `stateChange` payload as the newest request.
   * Call it synchronously at the start of the `stateChange` handler, before
   * awaiting anything, so the newest emit always wins.
   */
  begin: (requestId: number) => void
  /**
   * True while `requestId` is still the newest id passed to `begin`. Gate
   * every response write (`data`, `rowCount`, error) and the `finally` that
   * clears `loading` with it, so a stale request cannot touch newer UI state.
   */
  isLatest: (requestId: number) => boolean
}

/*
 * GhostDataTable renderless root (GHO-235). The root renders no element of its
 * own: its default slot receives the bindings from the spec's "Renderless root
 * slot bindings" table, and consumers spread them onto native `GhostTable*`
 * parts (ADR 0014 option A). Every binding is plain attributes; event handlers
 * stay in the consumer template so a `v-bind` never doubles a click handler.
 */

/** Accessible-name options for the control prop getters. */
export interface DataTableControlLabelOptions {
  /**
   * Localized accessible name, applied as `aria-label` on the focusable
   * control itself (never a wrapper). Omit when visible text names it.
   */
  label?: string
}

/** Attributes for the `GhostTable` root (`<table>`). */
export interface DataTableTableRootProps {
  'data-ghost-data-table': ''
  /** `'true'` while `loading`; omitted otherwise. */
  'aria-busy'?: 'true'
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Attributes for a column `GhostTableHeaderCell`. */
export interface DataTableHeaderCellProps {
  scope: 'col'
  /** Only on the sorted column (single-column sort in phase one). */
  'aria-sort'?: 'ascending' | 'descending'
  /** Styling hook mirroring `aria-sort`. */
  'data-sort'?: 'asc' | 'desc'
}

/** Attributes for a data `GhostTableRow`. Both flags are independent. */
export interface DataTableRowProps {
  'data-selected'?: 'true'
  'data-expanded'?: 'true'
}

/**
 * Attributes for the expansion detail `GhostTableRow`. `GhostTableRow` keeps
 * its own `data-part="row"`; this only adds `data-detail-row`.
 */
export interface DataTableDetailRowProps {
  /** Target of the expand button's `aria-controls`. */
  id: string
  'data-detail-row': 'true'
}

/** Attributes for a sort `<button>` inside a header cell. */
export interface DataTableSortButtonProps {
  type: 'button'
  'aria-label'?: string
  /** Set while the table is disabled or the column cannot sort. */
  disabled?: true
}

/**
 * Props for a row or header `GhostCheckbox`. `aria-label` falls through to the
 * native checkbox input (the focusable control).
 */
export interface DataTableSelectionCheckboxProps {
  'aria-label'?: string
  /** `true` while selection is not enabled or the table is disabled. */
  disabled: boolean
}

/**
 * Options for the expand button helper. The root `GhostDataTable` fills `id`
 * and `detailRowId` itself; standalone {@link useGhostDataTable} consumers
 * pass the ids of the elements they render.
 */
export interface DataTableExpandButtonOptions extends DataTableControlLabelOptions {
  /**
   * DOM id for the button. `GhostDataTable` looks the button up by this id to
   * restore focus when the row's detail row collapses, so keep it when
   * spreading the props.
   */
  id?: string
  /** Id of the detail row, used for `aria-controls` while the row is expanded. */
  detailRowId?: string
}

/**
 * The slice of {@link UseGhostDataTableReturn} the interaction prop helpers
 * read. Any `useGhostDataTable` return satisfies it, whatever its row type.
 */
export type DataTableInteractionState = Pick<
  UseGhostDataTableReturn<unknown>,
  | 'disabled'
  | 'canSort'
  | 'getSortDirection'
  | 'rowSelectionEnabled'
  | 'rowExpansionEnabled'
  | 'isRowExpanded'
>

/** Attributes for a row expand `<button>`. */
export interface DataTableExpandButtonProps {
  type: 'button'
  /** Focus-restore target when the detail row collapses (see the options). */
  id?: string
  'aria-label'?: string
  'aria-expanded': 'true' | 'false'
  /** Detail row id; only while expanded, so it never points at a missing node. */
  'aria-controls'?: string
  /** Set while expansion is not enabled or the table is disabled. */
  disabled?: true
}

/** Column header model. Independent of body rows, so the head survives an empty body. */
export interface DataTableHeader<TData> {
  /** Column id (same as `column.id`). */
  id: string
  /** Consumer column definition (not cloned). */
  column: DataTableColumnDef<TData>
  /** Whether the column can sort (accessor or `sortFn`, `enableSorting !== false`). */
  canSort: boolean
  /** Current direction in the single-column sort. */
  sortDirection: DataTableSortDirection
  /** Tri-state sort cycle. Ignores arguments, so it can be an `@click` handler. */
  toggleSort: () => void
}

/** Body row model passed to the default slot as `rows`. */
export interface DataTableSlotRow<TData> extends DataTableRow<TData> {
  /** One cell context per column, in column order. */
  cells: DataTableCellContext<TData>[]
  isSelected: boolean
  isExpanded: boolean
  /** Toggles, or sets with a boolean (`GhostCheckbox` `update:modelValue`). */
  toggleSelected: (value?: boolean) => void
  /** Toggles expansion. Ignores arguments, so it can be an `@click` handler. */
  toggleExpanded: () => void
  /** Bindings for this row's expansion detail `<tr>`. */
  detailRowProps: DataTableDetailRowProps
}

/**
 * Props for {@link GhostDataTable}. The options mirror
 * {@link UseGhostDataTableBaseOptions}; v-model props are controlled when
 * bound and fall back to their `default*` value otherwise.
 */
export interface GhostDataTableProps<TData> {
  /** Consumer-owned rows, read by reference only (never cloned or mutated). */
  data: readonly TData[]
  /** Consumer-owned column definitions. Not mutated. */
  columns: readonly DataTableColumnDef<TData>[]
  /** Required in every build; there is no index fallback. */
  getRowId: DataTableGetRowId<TData>
  /** @default false */
  manualSorting?: boolean
  /** @default false */
  manualFiltering?: boolean
  /** When `true`, `data` is one server page and `rowCount` is required. @default false */
  manualPagination?: boolean
  /** Total rows matching the query on the server. Required with `manualPagination`. */
  rowCount?: number
  /** Optional page-count override. */
  pageCount?: number
  /** @default false */
  enableRowSelection?: boolean
  /** @default false */
  enableRowExpansion?: boolean
  /** When `false`, expanding one row collapses the others. @default true */
  allowMultipleExpanded?: boolean
  /** Sets `aria-busy="true"` through `tableRootProps`. @default false */
  loading?: boolean
  /** Makes sort, selection, and expansion inert and disables their controls. @default false */
  disabled?: boolean
  /** Accessible name for the table, applied through `tableRootProps`. */
  ariaLabel?: string
  /** Id of a visible label for the table, applied through `tableRootProps`. */
  ariaLabelledby?: string

  sorting?: DataTableColumnSort[]
  defaultSorting?: DataTableColumnSort[]
  columnFilters?: DataTableColumnFilter[]
  defaultColumnFilters?: DataTableColumnFilter[]
  globalFilter?: unknown
  defaultGlobalFilter?: unknown
  pagination?: DataTablePaginationState
  defaultPagination?: DataTablePaginationState
  selectedRowIds?: DataTableRowId[]
  defaultSelectedRowIds?: DataTableRowId[]
  expandedRowIds?: DataTableRowId[]
  defaultExpandedRowIds?: DataTableRowId[]
}

/** Default slot props of {@link GhostDataTable} (spec: Renderless root slot bindings). */
export interface GhostDataTableSlotProps<TData> {
  tableRootProps: DataTableTableRootProps
  headers: DataTableHeader<TData>[]
  rows: DataTableSlotRow<TData>[]
  headerSelectionState: DataTableHeaderSelectionState
  getHeaderCellProps: (columnId: string) => DataTableHeaderCellProps
  getRowProps: (rowId: DataTableRowId) => DataTableRowProps
  /**
   * Cell context for a row in `rows` and a column id. Throws for an id that is
   * not rendered, which is a template bug rather than a runtime state.
   */
  getBodyCellContext: (
    rowId: DataTableRowId,
    columnId: string,
  ) => DataTableCellContext<TData>
  getSortButtonProps: (
    columnId: string,
    options?: DataTableControlLabelOptions,
  ) => DataTableSortButtonProps
  getRowSelectionCheckboxProps: (
    rowId: DataTableRowId,
    options?: DataTableControlLabelOptions,
  ) => DataTableSelectionCheckboxProps
  getHeaderSelectionCheckboxProps: (
    options?: DataTableControlLabelOptions,
  ) => DataTableSelectionCheckboxProps
  getRowExpandButtonProps: (
    rowId: DataTableRowId,
    options?: DataTableControlLabelOptions,
  ) => DataTableExpandButtonProps
  /** Same id set as `headerSelectionState`; accepts the checkbox's next value. */
  toggleAllRowsSelected: (value?: boolean) => void
  /**
   * Effective pagination: `pageIndex` is already clamped to `[1, pageCount]`.
   * Bind `pagination.pageIndex` to `GhostPagination`'s `modelValue`.
   */
  pagination: DataTablePaginationState
  /**
   * Server `rowCount` with `manualPagination`; otherwise the filtered row
   * count. Use it for "N results" text next to the pager.
   */
  rowCount: number
  /**
   * Pages for `GhostPagination`'s `pageCount`: the override, or
   * `max(1, ceil(rowCount / pageSize))`; always `1` when `rowCount` is `0`.
   */
  pageCount: number
  /**
   * Commits a page from `GhostPagination`'s `update:modelValue`. Clamps to
   * `pageCount`, updates the `pagination` v-model, and emits one
   * `stateChange` with `manualPagination`.
   */
  setPageIndex: (pageIndex: number) => void
}

/** Methods exposed on a `GhostDataTable` template ref. */
export interface GhostDataTableExposed<TData> {
  toggleAllRowsSelected: (value?: boolean) => void
  toggleRowSelected: (rowId: DataTableRowId, value?: boolean) => void
  toggleRowExpanded: (rowId: DataTableRowId, value?: boolean) => void
  resetRowSelection: () => void
  /** Re-emits `stateChange` with the current query and a fresh `requestId`. */
  retry: () => void
  setSorting: (sorting: DataTableColumnSort[]) => void
  toggleSorting: (columnId: string) => void
  setGlobalFilter: (globalFilter: unknown) => void
  setColumnFilter: (columnId: string, value: unknown) => void
  setColumnFilters: (columnFilters: DataTableColumnFilter[]) => void
  setPagination: (pagination: DataTablePaginationState) => void
  setPageIndex: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  getRowModel: () => readonly DataTableRow<TData>[]
  getPrePaginationRowModel: () => readonly DataTableRow<TData>[]
  getSelectedRowModel: () => readonly DataTableRow<TData>[]
}
