import { computed, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import { useControllableState } from '../stubs/useControllableState'
import { filterRows } from './filtering'
import { sortRows } from './sorting'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTableGetRowId,
  DataTablePaginationState,
  DataTableQueryState,
  DataTableRowId,
  DataTableStateChangePayload,
} from './types'

export interface UseGhostDataTableOptions<TData> {
  data: Ref<readonly TData[]> | ComputedRef<readonly TData[]>
  columns: DataTableColumnDef<TData>[]
  getRowId: DataTableGetRowId<TData>
  manualSorting?: boolean
  manualFiltering?: boolean
  manualPagination?: boolean
  rowCount?: Ref<number | undefined> | ComputedRef<number | undefined>
  pageCount?: Ref<number | undefined> | ComputedRef<number | undefined>
  sorting?: Ref<DataTableColumnSort[] | undefined>
  columnFilters?: Ref<DataTableColumnFilter[] | undefined>
  globalFilter?: Ref<unknown>
  pagination?: Ref<DataTablePaginationState | undefined>
  selectedRowIds?: Ref<DataTableRowId[] | undefined>
  expandedRowIds?: Ref<DataTableRowId[] | undefined>
  defaultSorting?: DataTableColumnSort[]
  defaultColumnFilters?: DataTableColumnFilter[]
  defaultGlobalFilter?: unknown
  defaultPagination?: DataTablePaginationState
  defaultSelectedRowIds?: DataTableRowId[]
  defaultExpandedRowIds?: DataTableRowId[]
  enableRowSelection?: boolean
  enableRowExpansion?: boolean
  allowMultipleExpanded?: boolean
  loading?: Ref<boolean> | boolean
  disabled?: Ref<boolean> | boolean
  onStateChange?: (payload: DataTableStateChangePayload) => void
}

export interface DataTableRowModel<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
  isSelected: boolean
  isExpanded: boolean
  toggleSelected: (value?: boolean) => void
  toggleExpanded: (value?: boolean) => void
  cells: { column: DataTableColumnDef<TData> }[]
  detailRowProps: Record<string, unknown>
}

export interface DataTableHeaderModel<TData> {
  column: DataTableColumnDef<TData>
  toggleSort: () => void
}

let requestIdSeq = 1

function bindControllable<Value>(
  external: Ref<Value | undefined> | undefined,
  defaultValue: Value,
  onWrite?: (value: Value) => void,
) {
  return useControllableState<Value>({
    prop: () => external?.value,
    defaultValue,
    onChange: (value: Value) => {
      onWrite?.(value)
      if (external) external.value = value
    },
  })
}

export function useGhostDataTable<TData>(options: UseGhostDataTableOptions<TData>) {
  const manualSorting = options.manualSorting ?? false
  const manualFiltering = options.manualFiltering ?? false
  const manualPagination = options.manualPagination ?? false
  const enableRowSelection = options.enableRowSelection ?? false
  const enableRowExpansion = options.enableRowExpansion ?? false
  const allowMultipleExpanded = options.allowMultipleExpanded ?? true

  const sorting = bindControllable(
    options.sorting,
    options.defaultSorting ?? [],
  )

  const columnFilters = bindControllable(
    options.columnFilters,
    options.defaultColumnFilters ?? [],
  )

  const globalFilter = bindControllable(options.globalFilter, options.defaultGlobalFilter ?? '')

  const pagination = bindControllable(options.pagination, options.defaultPagination ?? {
    pageIndex: 1,
    pageSize: 25,
  })

  const selectedRowIds = bindControllable(
    options.selectedRowIds,
    options.defaultSelectedRowIds ?? [],
  )

  const expandedRowIds = bindControllable(
    options.expandedRowIds,
    options.defaultExpandedRowIds ?? [],
  )

  const stateChangeLog = shallowRef<DataTableStateChangePayload[]>([])
  let suppressPaginationStateChange = false

  function getProcessingInput(): TData[] {
    return [...(options.data.value ?? [])]
  }

  function getPrePaginationRowModel(): TData[] {
    let rows = getProcessingInput()
    if (!manualSorting) rows = sortRows(rows, options.columns, sorting.value)
    if (!manualFiltering) {
      rows = filterRows(rows, options.columns, globalFilter.value, columnFilters.value)
    }
    return rows
  }

  function getRowModel(): TData[] {
    const processed = getPrePaginationRowModel()
    if (manualPagination) return processed
    const { pageIndex, pageSize } = pagination.value
    const start = (pageIndex - 1) * pageSize
    return processed.slice(start, start + pageSize)
  }

  const derivedRowCount = computed(() => {
    if (manualPagination) {
      return options.rowCount?.value ?? 0
    }
    return getPrePaginationRowModel().length
  })

  const derivedPageCount = computed(() => {
    const override = options.pageCount?.value
    if (override != null) return Math.max(1, override)
    const total = derivedRowCount.value
    if (total === 0) return 1
    return Math.max(1, Math.ceil(total / pagination.value.pageSize))
  })

  function clampPagination() {
    if (derivedRowCount.value === 0) {
      pagination.value = { ...pagination.value, pageIndex: 1 }
      return
    }
    if (pagination.value.pageIndex > derivedPageCount.value) {
      pagination.value = {
        ...pagination.value,
        pageIndex: derivedPageCount.value,
      }
    }
  }

  function emitStateChange(trigger: keyof DataTableQueryState) {
    const payload: DataTableStateChangePayload = {
      requestId: requestIdSeq++,
      trigger,
      query: {
        sorting: [...sorting.value],
        columnFilters: [...columnFilters.value],
        globalFilter: globalFilter.value,
        pagination: { ...pagination.value },
      },
    }
    stateChangeLog.value = [...stateChangeLog.value, payload]
    options.onStateChange?.(payload)
  }

  function shouldEmitStateChangeForFilter(): boolean {
    return manualFiltering
  }

  function applyFilterPaginationReset() {
    if (manualFiltering) {
      suppressPaginationStateChange = true
      pagination.value = { ...pagination.value, pageIndex: 1 }
      queueMicrotask(() => {
        suppressPaginationStateChange = false
      })
    } else if (!manualPagination) {
      clampPagination()
    }
    // manualPagination + !manualFiltering: keep pageIndex (page-local filter)
  }

  watch(
    () => globalFilter.value,
    () => {
      applyFilterPaginationReset()
      if (shouldEmitStateChangeForFilter()) emitStateChange('globalFilter')
    },
    { flush: 'sync' },
  )

  watch(
    () => columnFilters.value,
    () => {
      applyFilterPaginationReset()
      if (shouldEmitStateChangeForFilter()) emitStateChange('columnFilters')
    },
    { deep: true, flush: 'sync' },
  )

  watch(
    () => pagination.value.pageSize,
    () => {
      pagination.value = { ...pagination.value, pageIndex: 1 }
      if (manualPagination) emitStateChange('pagination')
    },
  )

  watch(
    () => sorting.value,
    () => {
      clampPagination()
      if (manualSorting) emitStateChange('sorting')
    },
    { deep: true },
  )

  watch(
    () => pagination.value.pageIndex,
    () => {
      if (suppressPaginationStateChange) return
      if (manualPagination) emitStateChange('pagination')
    },
  )

  watch(
    () => options.data.value,
    () => {
      if (!manualPagination && !manualFiltering) {
        const validIds = new Set(
          getProcessingInput().map((row, index) => options.getRowId(row, index)),
        )
        selectedRowIds.value = selectedRowIds.value.filter((id) => validIds.has(id))
        expandedRowIds.value = expandedRowIds.value.filter((id) => validIds.has(id))
      }
    },
  )

  watch(derivedPageCount, () => clampPagination())

  const selectAllTargetIds = computed(() => {
    const rows = manualPagination ? getRowModel() : getPrePaginationRowModel()
    return rows.map((row, index) => options.getRowId(row, index))
  })

  const headerSelectionState = computed(() => {
    const target = selectAllTargetIds.value
    if (target.length === 0) return { allSelected: false, someSelected: false }
    const selectedOnTarget = target.filter((id) => selectedRowIds.value.includes(id))
    return {
      allSelected: selectedOnTarget.length === target.length,
      someSelected:
        selectedOnTarget.length > 0 && selectedOnTarget.length < target.length,
    }
  })

  function toggleAllRowsSelected(value?: boolean) {
    if (!enableRowSelection) return
    const target = selectAllTargetIds.value
    const shouldSelect = value ?? !headerSelectionState.value.allSelected
    const withoutTarget = selectedRowIds.value.filter((id) => !target.includes(id))
    if (shouldSelect) {
      selectedRowIds.value = [...new Set([...withoutTarget, ...target])]
    } else {
      selectedRowIds.value = withoutTarget
    }
  }

  function toggleRowSelected(rowId: DataTableRowId, value?: boolean) {
    if (!enableRowSelection) return
    const has = selectedRowIds.value.includes(rowId)
    const next = value ?? !has
    if (next && !has) selectedRowIds.value = [...selectedRowIds.value, rowId]
    if (!next && has) {
      selectedRowIds.value = selectedRowIds.value.filter((id) => id !== rowId)
    }
  }

  function toggleRowExpanded(rowId: DataTableRowId, value?: boolean) {
    if (!enableRowExpansion) return
    const has = expandedRowIds.value.includes(rowId)
    const next = value ?? !has
    if (next) {
      expandedRowIds.value = allowMultipleExpanded
        ? [...new Set([...expandedRowIds.value, rowId])]
        : [rowId]
    } else {
      expandedRowIds.value = expandedRowIds.value.filter((id) => id !== rowId)
    }
  }

  function retry() {
    emitStateChange('sorting')
  }

  const rows = computed((): DataTableRowModel<TData>[] => {
    return getRowModel().map((row, rowIndex) => {
      const rowId = options.getRowId(row, rowIndex)
      const detailId = `detail-${rowId}`
      return {
        row,
        rowId,
        rowIndex,
        isSelected: selectedRowIds.value.includes(rowId),
        isExpanded: expandedRowIds.value.includes(rowId),
        toggleSelected: (v) => toggleRowSelected(rowId, v),
        toggleExpanded: (v) => toggleRowExpanded(rowId, v),
        cells: options.columns.map((column) => ({ column })),
        detailRowProps: { 'data-detail-row': 'true', id: detailId },
      }
    })
  })

  const headers = computed((): DataTableHeaderModel<TData>[] =>
    options.columns.map((column) => ({
      column,
      toggleSort: () => {
        const existing = sorting.value[0]
        let next: DataTableColumnSort[] = []
        if (!existing || existing.id !== column.id) {
          next = [{ id: column.id, desc: false }]
        } else if (!existing.desc) {
          next = [{ id: column.id, desc: true }]
        }
        sorting.value = next
      },
    })),
  )

  function getBodyCellContext(rowId: DataTableRowId, columnId: string) {
    const model = rows.value.find((r) => r.rowId === rowId)
    const column = options.columns.find((c) => c.id === columnId)
    if (!model || !column) {
      throw new Error(`Unknown row or column: ${rowId}, ${columnId}`)
    }
    const getValue = () => {
      if (column.accessorFn) return column.accessorFn(model.row, model.rowIndex)
      if (column.accessorKey) {
        return (model.row as Record<string, unknown>)[column.accessorKey]
      }
      return undefined
    }
    return {
      row: model.row,
      rowId,
      rowIndex: model.rowIndex,
      column,
      getValue,
    }
  }

  function getHeaderCellProps(columnId: string) {
    const sort = sorting.value[0]
    const ariaSort: 'ascending' | 'descending' | undefined =
      sort?.id === columnId ? (sort.desc ? 'descending' : 'ascending') : undefined
    return {
      scope: 'col' as const,
      ...(ariaSort ? { 'aria-sort': ariaSort } : {}),
    }
  }

  function getRowProps(rowId: DataTableRowId) {
    return {
      ...(selectedRowIds.value.includes(rowId) ? { 'data-selected': 'true' } : {}),
      ...(expandedRowIds.value.includes(rowId) ? { 'data-expanded': 'true' } : {}),
    }
  }

  const isDisabled = computed(() =>
    typeof options.disabled === 'object' && options.disabled && 'value' in options.disabled
      ? Boolean(options.disabled.value)
      : Boolean(options.disabled),
  )
  const isLoading = computed(() =>
    typeof options.loading === 'object' && options.loading && 'value' in options.loading
      ? Boolean(options.loading.value)
      : Boolean(options.loading),
  )

  function getSortButtonProps(_columnId: string, opts?: { label?: string }) {
    return {
      type: 'button' as const,
      disabled: isDisabled.value,
      'aria-label': opts?.label,
    }
  }

  function getRowSelectionCheckboxProps(_rowId: DataTableRowId, opts?: { label?: string }) {
    return {
      disabled: isDisabled.value,
      'aria-label': opts?.label,
    }
  }

  function getHeaderSelectionCheckboxProps(opts?: { label?: string }) {
    return {
      disabled: isDisabled.value,
      'aria-label': opts?.label,
    }
  }

  function getRowExpandButtonProps(rowId: DataTableRowId, opts?: { label?: string }) {
    const expanded = expandedRowIds.value.includes(rowId)
    return {
      type: 'button' as const,
      disabled: isDisabled.value,
      'aria-expanded': expanded,
      'aria-controls': `detail-${rowId}`,
      'aria-label': opts?.label,
    }
  }

  const tableRootProps = computed(() => ({
    'aria-busy': isLoading.value ? 'true' : undefined,
    'data-ghost-data-table': '',
  }))

  return {
    sorting,
    columnFilters,
    globalFilter,
    pagination,
    selectedRowIds,
    expandedRowIds,
    derivedRowCount,
    derivedPageCount,
    getPrePaginationRowModel,
    getRowModel,
    rows,
    headers,
    headerSelectionState,
    toggleAllRowsSelected,
    toggleRowSelected,
    toggleRowExpanded,
    retry,
    getBodyCellContext,
    getHeaderCellProps,
    getRowProps,
    getSortButtonProps,
    getRowSelectionCheckboxProps,
    getHeaderSelectionCheckboxProps,
    getRowExpandButtonProps,
    tableRootProps,
    stateChangeLog,
    emitStateChange,
  }
}