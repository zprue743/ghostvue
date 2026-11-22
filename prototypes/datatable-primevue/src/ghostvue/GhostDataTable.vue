<script setup lang="ts" generic="TData">
import { toRef } from 'vue'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTableGetRowId,
  DataTablePaginationState,
  DataTableRowId,
  DataTableStateChangePayload,
} from './types'
import { useGhostDataTable } from './useGhostDataTable'

const props = withDefaults(
  defineProps<{
    data: readonly TData[]
    columns: DataTableColumnDef<TData>[]
    getRowId: DataTableGetRowId<TData>
    manualSorting?: boolean
    manualFiltering?: boolean
    manualPagination?: boolean
    rowCount?: number
    sorting?: DataTableColumnSort[]
    columnFilters?: DataTableColumnFilter[]
    globalFilter?: unknown
    pagination?: DataTablePaginationState
    selectedRowIds?: DataTableRowId[]
    expandedRowIds?: DataTableRowId[]
    enableRowSelection?: boolean
    enableRowExpansion?: boolean
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
    enableRowSelection: false,
    enableRowExpansion: false,
    loading: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:sorting': [DataTableColumnSort[]]
  'update:columnFilters': [DataTableColumnFilter[]]
  'update:globalFilter': [unknown]
  'update:pagination': [DataTablePaginationState]
  'update:selectedRowIds': [DataTableRowId[]]
  'update:expandedRowIds': [DataTableRowId[]]
  stateChange: [DataTableStateChangePayload]
}>()

const sortingModel = defineModel<DataTableColumnSort[]>('sorting', { default: () => [] })
const columnFiltersModel = defineModel<DataTableColumnFilter[]>('columnFilters', { default: () => [] })
const globalFilterModel = defineModel<unknown>('globalFilter', { default: () => '' })
const paginationModel = defineModel<DataTablePaginationState>('pagination', {
  default: () => ({ pageIndex: 1, pageSize: 25 }),
})
const selectedRowIdsModel = defineModel<DataTableRowId[]>('selectedRowIds', { default: () => [] })
const expandedRowIdsModel = defineModel<DataTableRowId[]>('expandedRowIds', { default: () => [] })

const table = useGhostDataTable({
  data: toRef(() => props.data),
  columns: props.columns,
  getRowId: props.getRowId,
  manualSorting: props.manualSorting,
  manualFiltering: props.manualFiltering,
  manualPagination: props.manualPagination,
  rowCount: toRef(() => props.rowCount),
  sorting: sortingModel,
  columnFilters: columnFiltersModel,
  globalFilter: globalFilterModel,
  pagination: paginationModel,
  selectedRowIds: selectedRowIdsModel,
  expandedRowIds: expandedRowIdsModel,
  enableRowSelection: props.enableRowSelection,
  enableRowExpansion: props.enableRowExpansion,
  loading: toRef(() => props.loading),
  disabled: toRef(() => props.disabled),
  onStateChange: (payload) => emit('stateChange', payload),
})

defineExpose({
  retry: table.retry,
  stateChangeLog: table.stateChangeLog,
  getPrePaginationRowModel: table.getPrePaginationRowModel,
  getRowModel: table.getRowModel,
})
</script>

<template>
  <slot
    v-bind="{
      tableRootProps: table.tableRootProps.value,
      headers: table.headers.value,
      getHeaderCellProps: table.getHeaderCellProps,
      getRowProps: table.getRowProps,
      rows: table.rows.value,
      getBodyCellContext: table.getBodyCellContext,
      getSortButtonProps: table.getSortButtonProps,
      getRowSelectionCheckboxProps: table.getRowSelectionCheckboxProps,
      getHeaderSelectionCheckboxProps: table.getHeaderSelectionCheckboxProps,
      getRowExpandButtonProps: table.getRowExpandButtonProps,
      headerSelectionState: table.headerSelectionState.value,
      toggleAllRowsSelected: table.toggleAllRowsSelected,
      pagination: table.pagination.value,
      derivedPageCount: table.derivedPageCount.value,
    }"
  />
</template>