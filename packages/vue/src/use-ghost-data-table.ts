import { computed, toValue, watch } from 'vue'

import {
  filterRows,
  isActiveFilterValue,
  isColumnSortable,
  sortRows,
} from './data-table-processing'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTableHeaderSelectionState,
  DataTablePaginationState,
  DataTableQueryState,
  DataTableRow,
  DataTableRowId,
  DataTableSortDirection,
  UseGhostDataTableOptions,
  UseGhostDataTableReturn,
  UseGhostDataTableServerRequestReturn,
} from './ghost-data-table'
import { useControllableState } from './use-controllable-state'

/*
 * Default page size is not fixed by the DataTable spec; 10 matches the common
 * table-library default and keeps the DOM small when consumers omit it.
 */
const DEFAULT_PAGE_SIZE = 10

function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_PAGE_SIZE
  return Math.max(1, Math.floor(pageSize))
}

function clampPageIndex(pageIndex: number, pageCount: number): number {
  if (!Number.isFinite(pageIndex)) return 1
  return Math.min(pageCount, Math.max(1, Math.floor(pageIndex)))
}

function sameSorting(
  left: readonly DataTableColumnSort[],
  right: readonly DataTableColumnSort[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.id === right[index]?.id && entry.desc === right[index].desc,
    )
  )
}

function sameColumnFilters(
  left: readonly DataTableColumnFilter[],
  right: readonly DataTableColumnFilter[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.id === right[index]?.id &&
        Object.is(entry.value, right[index].value),
    )
  )
}

/**
 * Headless DataTable state and local processing pipeline (ADR 0014).
 *
 * Processing follows the spec's manual-processing matrix: local sort, then
 * local filter, then the page slice, each stage skipped when its `manual*`
 * flag is `true`. With `manualPagination`, sorting and filtering are
 * page-local (they only reorder or narrow the rows in `data`). Each stage is
 * memoized separately, so paging never re-sorts and selection or expansion
 * never re-runs sort or filter callbacks.
 *
 * Every v-model dimension uses {@link useControllableState}. `onStateChange`
 * fires at most once per action, only when the action changes a dimension
 * owned by the server (its `manual*` flag is `true`), and carries the full
 * query after reset rules.
 */
export function useGhostDataTable<TData>(
  options: UseGhostDataTableOptions<TData>,
): UseGhostDataTableReturn<TData> {
  const manualSorting = computed(() => toValue(options.manualSorting) === true)
  const manualFiltering = computed(
    () => toValue(options.manualFiltering) === true,
  )
  const manualPagination = computed(
    () => toValue(options.manualPagination) === true,
  )
  const selectionEnabled = computed(
    () => toValue(options.enableRowSelection) === true,
  )
  const expansionEnabled = computed(
    () => toValue(options.enableRowExpansion) === true,
  )
  const loading = computed(() => toValue(options.loading) === true)
  const disabled = computed(() => toValue(options.disabled) === true)

  const sortingState = useControllableState<DataTableColumnSort[]>({
    prop: () => toValue(options.sorting),
    defaultValue: () => toValue(options.defaultSorting) ?? [],
    onChange: (next) => options.onSortingChange?.(next),
  })
  const columnFiltersState = useControllableState<DataTableColumnFilter[]>({
    prop: () => toValue(options.columnFilters),
    defaultValue: () => toValue(options.defaultColumnFilters) ?? [],
    onChange: (next) => options.onColumnFiltersChange?.(next),
  })
  const globalFilterState = useControllableState<unknown>({
    prop: () => toValue(options.globalFilter),
    defaultValue: () => toValue(options.defaultGlobalFilter),
    onChange: (next) => options.onGlobalFilterChange?.(next),
    // `undefined` is a valid "cleared" global filter, not a request to fall
    // back to uncontrolled state.
    allowControlledUndefined: true,
  })
  const paginationState = useControllableState<DataTablePaginationState>({
    prop: () => toValue(options.pagination),
    defaultValue: () =>
      toValue(options.defaultPagination) ?? {
        pageIndex: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    onChange: (next) => options.onPaginationChange?.(next),
  })
  const selectedState = useControllableState<DataTableRowId[]>({
    prop: () => toValue(options.selectedRowIds),
    defaultValue: () => toValue(options.defaultSelectedRowIds) ?? [],
    onChange: (next) => options.onSelectedRowIdsChange?.(next),
  })
  const expandedState = useControllableState<DataTableRowId[]>({
    prop: () => toValue(options.expandedRowIds),
    defaultValue: () => toValue(options.defaultExpandedRowIds) ?? [],
    onChange: (next) => options.onExpandedRowIdsChange?.(next),
  })

  const columns = computed(() => toValue(options.columns))
  const columnsById = computed(() => {
    const map = new Map<string, DataTableColumnDef<TData>>()
    for (const column of columns.value) map.set(column.id, column)
    return map
  })

  // Wrappers hold references to consumer rows; the rows themselves are never
  // copied or mutated (spec: consumer data ownership).
  const coreRows = computed((): readonly DataTableRow<TData>[] =>
    toValue(options.data).map((row, rowIndex) => ({
      row,
      rowId: options.getRowId(row, rowIndex),
      rowIndex,
    })),
  )

  // Sort runs before filter (spec matrix order). Filter edits are frequent
  // (typing) and must not trigger a re-sort; sorted output is cached until
  // `data`, `columns`, or `sorting` change.
  const sortedRows = computed(() => {
    if (manualSorting.value) return coreRows.value
    // Phase one is single-column: only the first entry is honored.
    const sort = sortingState.value[0]
    return sortRows(
      coreRows.value,
      sort,
      sort ? columnsById.value.get(sort.id) : undefined,
    )
  })

  const filteredRows = computed(() => {
    if (manualFiltering.value) return sortedRows.value
    return filterRows(
      sortedRows.value,
      columns.value,
      columnsById.value,
      globalFilterState.value,
      columnFiltersState.value,
    )
  })

  const rowCount = computed(() => {
    if (!manualPagination.value) return filteredRows.value.length
    const total = toValue(options.rowCount)
    // `rowCount` is required by the option types with manualPagination; a
    // missing runtime value falls back to the loaded page instead of
    // inventing an empty result that would clamp the page to 1.
    if (total === undefined || !Number.isFinite(total)) {
      return toValue(options.data).length
    }
    return Math.max(0, Math.floor(total))
  })

  const pageSize = computed(() =>
    normalizePageSize(paginationState.value.pageSize),
  )

  const pageCount = computed(() => {
    // Query-wide empty: always one page so GhostPagination shows page 1 of 1.
    if (rowCount.value === 0) return 1
    const override = toValue(options.pageCount)
    if (override !== undefined && Number.isFinite(override)) {
      return Math.max(1, Math.floor(override))
    }
    return Math.max(1, Math.ceil(rowCount.value / pageSize.value))
  })

  const pagination = computed((): DataTablePaginationState => {
    const raw = paginationState.value
    const pageIndex = clampPageIndex(raw.pageIndex, pageCount.value)
    if (pageIndex === raw.pageIndex && pageSize.value === raw.pageSize) {
      return raw
    }
    return { pageIndex, pageSize: pageSize.value }
  })

  const rowModel = computed(() => {
    // Server pages are displayed as processed; the server already paged them.
    if (manualPagination.value) return filteredRows.value
    const { pageIndex, pageSize: size } = pagination.value
    const start = (pageIndex - 1) * size
    return filteredRows.value.slice(start, start + size)
  })

  const query = computed((): DataTableQueryState => ({
    sorting: sortingState.value,
    columnFilters: columnFiltersState.value,
    globalFilter: globalFilterState.value,
    pagination: pagination.value,
  }))

  let requestId = 0
  let lastTrigger: keyof DataTableQueryState = 'pagination'

  // Controlled v-models may not reflect a write until the parent re-renders,
  // so callers pass the next values explicitly instead of re-reading state.
  function emitStateChange(
    trigger: keyof DataTableQueryState,
    overrides: Partial<DataTableQueryState>,
  ): void {
    requestId += 1
    lastTrigger = trigger
    options.onStateChange?.({
      requestId,
      trigger,
      query: { ...query.value, ...overrides },
    })
  }

  function getSortDirection(columnId: string): DataTableSortDirection {
    const sort = sortingState.value[0]
    if (sort?.id !== columnId) return false
    return sort.desc ? 'desc' : 'asc'
  }

  function canSort(columnId: string): boolean {
    const column = columnsById.value.get(columnId)
    return column !== undefined && isColumnSortable(column)
  }

  function setSorting(next: DataTableColumnSort[]): void {
    const normalized = next.slice(0, 1)
    if (sameSorting(normalized, sortingState.value)) return
    sortingState.value = normalized
    // Sorting never resets the page; the pageCount watcher clamps if needed.
    if (manualSorting.value) {
      emitStateChange('sorting', { sorting: normalized })
    }
  }

  function toggleSorting(columnId: string): void {
    if (disabled.value || !canSort(columnId)) return
    const direction = getSortDirection(columnId)
    if (direction === false) setSorting([{ id: columnId, desc: false }])
    else if (direction === 'asc') setSorting([{ id: columnId, desc: true }])
    else setSorting([])
  }

  /**
   * Filter reset rule: server filtering (`manualFiltering`) refetches from
   * page 1 and emits one coalesced stateChange carrying both the new filter and
   * page 1. Local and page-local filtering keep `pageIndex`; full-local
   * filtering relies on the pageCount clamp, and page-local filtering on a
   * server page keeps the page with no request.
   */
  function commitFilterChange(
    trigger: 'globalFilter' | 'columnFilters',
    overrides: Partial<DataTableQueryState>,
  ): void {
    if (!manualFiltering.value) return
    const nextPagination: DataTablePaginationState = {
      pageIndex: 1,
      pageSize: pageSize.value,
    }
    if (paginationState.value.pageIndex !== 1) {
      paginationState.value = nextPagination
    }
    emitStateChange(trigger, { ...overrides, pagination: nextPagination })
  }

  function setGlobalFilter(next: unknown): void {
    if (Object.is(next, globalFilterState.value)) return
    globalFilterState.value = next
    commitFilterChange('globalFilter', { globalFilter: next })
  }

  function setColumnFilters(next: DataTableColumnFilter[]): void {
    if (sameColumnFilters(next, columnFiltersState.value)) return
    columnFiltersState.value = next
    commitFilterChange('columnFilters', { columnFilters: next })
  }

  function setColumnFilter(columnId: string, value: unknown): void {
    const current = columnFiltersState.value
    const active = isActiveFilterValue(value)
    const index = current.findIndex((entry) => entry.id === columnId)
    let next: DataTableColumnFilter[]
    if (index === -1) {
      if (!active) return
      next = [...current, { id: columnId, value }]
    } else if (active) {
      next = current.map((entry, entryIndex) =>
        entryIndex === index ? { id: columnId, value } : entry,
      )
    } else {
      next = current.filter((_, entryIndex) => entryIndex !== index)
    }
    setColumnFilters(next)
  }

  function setPagination(next: DataTablePaginationState): void {
    const raw = paginationState.value
    const nextSize = normalizePageSize(next.pageSize)
    const normalized: DataTablePaginationState =
      nextSize !== pageSize.value
        ? { pageIndex: 1, pageSize: nextSize }
        : {
            pageIndex: clampPageIndex(next.pageIndex, pageCount.value),
            pageSize: nextSize,
          }
    if (
      normalized.pageIndex === raw.pageIndex &&
      normalized.pageSize === raw.pageSize
    ) {
      return
    }
    paginationState.value = normalized
    if (manualPagination.value) {
      emitStateChange('pagination', { pagination: normalized })
    }
  }

  function setPageIndex(pageIndex: number): void {
    setPagination({ pageIndex, pageSize: pageSize.value })
  }

  function setPageSize(size: number): void {
    setPagination({ pageIndex: pagination.value.pageIndex, pageSize: size })
  }

  /*
   * Clamp rule (Zac, PR #265): after the derived pageCount changes, a stored
   * pageIndex beyond it is written back as pageCount. That covers full-local
   * filter shrink, local `data` refresh (clamp, never an unconditional reset),
   * and server `rowCount` shrink, which also emits exactly one stateChange so
   * the consumer fetches the clamped page. Reads are clamped in `pagination`
   * already, so this only syncs v-models. Not immediate: hydrating an
   * out-of-range page from a URL stays silent.
   */
  watch(pageCount, (count) => {
    const raw = paginationState.value
    if (raw.pageIndex <= count) return
    const next: DataTablePaginationState = {
      pageIndex: count,
      pageSize: pageSize.value,
    }
    paginationState.value = next
    if (manualPagination.value) {
      emitStateChange('pagination', { pagination: next })
    }
  })

  const selectedSet = computed(() => new Set(selectedState.value))
  const expandedSet = computed(() => new Set(expandedState.value))

  // Local mode selects across pages (all filtered rows); server mode only
  // selects what is visible on the loaded page.
  const selectAllTarget = computed(() =>
    manualPagination.value ? rowModel.value : filteredRows.value,
  )

  const headerSelectionState = computed((): DataTableHeaderSelectionState => {
    const target = selectAllTarget.value
    let selected = 0
    for (const entry of target) {
      if (selectedSet.value.has(entry.rowId)) selected += 1
    }
    const allSelected = target.length > 0 && selected === target.length
    return { allSelected, someSelected: selected > 0 && !allSelected }
  })

  const selectionInert = (): boolean =>
    !selectionEnabled.value || disabled.value
  const expansionInert = (): boolean =>
    !expansionEnabled.value || disabled.value

  function isRowSelected(rowId: DataTableRowId): boolean {
    return selectedSet.value.has(rowId)
  }

  function toggleRowSelected(rowId: DataTableRowId, value?: boolean): void {
    if (selectionInert()) return
    const selected = selectedSet.value.has(rowId)
    const next = value ?? !selected
    if (next === selected) return
    selectedState.value = next
      ? [...selectedState.value, rowId]
      : selectedState.value.filter((id) => id !== rowId)
  }

  function toggleAllRowsSelected(value?: boolean): void {
    if (selectionInert()) return
    const select = value ?? !headerSelectionState.value.allSelected
    const targetIds = selectAllTarget.value.map((entry) => entry.rowId)
    const current = selectedState.value
    if (select) {
      const missing = targetIds.filter((id) => !selectedSet.value.has(id))
      if (missing.length === 0) return
      selectedState.value = [...current, ...missing]
      return
    }
    // Ids outside the target (other server pages, filtered-out rows) stay.
    const targetSet = new Set(targetIds)
    const next = current.filter((id) => !targetSet.has(id))
    if (next.length !== current.length) selectedState.value = next
  }

  function resetRowSelection(): void {
    if (selectedState.value.length > 0) selectedState.value = []
  }

  function isRowExpanded(rowId: DataTableRowId): boolean {
    return expandedSet.value.has(rowId)
  }

  function toggleRowExpanded(rowId: DataTableRowId, value?: boolean): void {
    if (expansionInert()) return
    const expanded = expandedSet.value.has(rowId)
    const next = value ?? !expanded
    if (next === expanded) return
    if (!next) {
      expandedState.value = expandedState.value.filter((id) => id !== rowId)
    } else if (toValue(options.allowMultipleExpanded) === false) {
      expandedState.value = [rowId]
    } else {
      expandedState.value = [...expandedState.value, rowId]
    }
  }

  /*
   * Pruning rule: only when the table owns the full collection end to end
   * (manualPagination and manualFiltering both false). Ids are checked against
   * the new source rows, never the filtered or paged view, so a row hidden by a
   * filter keeps its selection. Server payloads never prune.
   */
  watch(
    () => toValue(options.data),
    () => {
      if (manualPagination.value || manualFiltering.value) return
      const prune = (
        state: { value: DataTableRowId[] },
        enabled: boolean,
      ): void => {
        if (!enabled || state.value.length === 0) return
        const present = new Set(coreRows.value.map((entry) => entry.rowId))
        const next = state.value.filter((id) => present.has(id))
        if (next.length !== state.value.length) state.value = next
      }
      prune(selectedState, selectionEnabled.value)
      prune(expandedState, expansionEnabled.value)
    },
  )

  const selectedRows = computed(() =>
    rowModel.value.filter((entry) => selectedSet.value.has(entry.rowId)),
  )

  function retry(): void {
    emitStateChange(lastTrigger, {})
  }

  const getRowModel = (): readonly DataTableRow<TData>[] => rowModel.value

  // Read-only views: writes go through the actions so reset rules and
  // stateChange coalescing cannot be bypassed.
  return {
    sorting: computed(() => sortingState.value),
    columnFilters: computed(() => columnFiltersState.value),
    globalFilter: computed(() => globalFilterState.value),
    pagination,
    selectedRowIds: computed(() => selectedState.value),
    expandedRowIds: computed(() => expandedState.value),
    rowCount,
    pageCount,
    query,
    loading,
    disabled,
    rowSelectionEnabled: selectionEnabled,
    rowExpansionEnabled: expansionEnabled,
    headerSelectionState,
    getCoreRowModel: () => coreRows.value,
    getSortedRowModel: () => sortedRows.value,
    getFilteredRowModel: () => filteredRows.value,
    getPrePaginationRowModel: () => filteredRows.value,
    getRowModel,
    getPaginationRowModel: getRowModel,
    getSelectedRowModel: () => selectedRows.value,
    getSortDirection,
    canSort,
    setSorting,
    toggleSorting,
    setColumnFilters,
    setColumnFilter,
    setGlobalFilter,
    setPagination,
    setPageIndex,
    setPageSize,
    isRowSelected,
    toggleRowSelected,
    toggleAllRowsSelected,
    resetRowSelection,
    isRowExpanded,
    toggleRowExpanded,
    retry,
  }
}

/**
 * Stale-response guard for server-mode DataTable fetches. Pair it with the
 * `requestId` that `stateChange` (and `retry()`) mints:
 *
 * ```ts
 * const request = useGhostDataTableServerRequest()
 * async function onStateChange({ requestId, query }: DataTableStateChangePayload) {
 *   request.begin(requestId)
 *   loading.value = true
 *   try {
 *     const page = await fetchInvoices(query)
 *     if (!request.isLatest(requestId)) return
 *     data.value = page.rows
 *     rowCount.value = page.total
 *     error.value = undefined
 *   } catch (cause) {
 *     if (request.isLatest(requestId)) error.value = cause
 *   } finally {
 *     if (request.isLatest(requestId)) loading.value = false
 *   }
 * }
 * ```
 *
 * Ordering is decided by `requestId`, never by which response resolves first,
 * so out-of-order responses and a stale `finally` cannot overwrite rows,
 * totals, error, or `loading` that belong to a newer request.
 *
 * Use one guard per table instance, created next to it. Ids are only
 * monotonic within one `useGhostDataTable` call: a remounted table restarts at
 * 1, so `begin` records the id as given (a running max would reject every
 * request from the new instance). The guard holds a plain number (no
 * reactivity, no lifecycle), so it works outside `setup` and needs no cleanup.
 *
 * Same shape as `useGhostComboboxAsyncSearch` (ADR 0014). It is a separate
 * function rather than a re-export so the DataTable entry does not import the
 * combobox module and each contract can evolve with its own component.
 */
export function useGhostDataTableServerRequest(): UseGhostDataTableServerRequestReturn {
  let latest = 0
  return {
    begin(requestId: number): void {
      latest = requestId
    },
    isLatest(requestId: number): boolean {
      return requestId === latest
    },
  }
}
