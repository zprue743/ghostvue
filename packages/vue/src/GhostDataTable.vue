<script setup lang="ts" generic="TData">
import { provide } from 'vue'

import { useDataTableSlotBindings } from './data-table-slot-bindings'
import type {
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTablePaginationState,
  DataTableRowId,
  DataTableStateChangePayload,
  GhostDataTableExposed,
  GhostDataTableProps,
  GhostDataTableSlotProps,
} from './ghost-data-table'
import { ghostDataTableContextKey } from './ghost-data-table-table'
import { useGhostDataTable } from './use-ghost-data-table'
import { useGhostId } from './use-ghost-id'

/*
 * Renderless root (ADR 0014 option A): no wrapper element, so consumers keep
 * a native <table> built from GhostTable* parts with native tab order and no
 * grid keyboard model. Attributes have no element to land on; the accessible
 * name is an explicit prop forwarded through `tableRootProps`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<GhostDataTableProps<TData>>(), {
  manualSorting: false,
  manualFiltering: false,
  manualPagination: false,
  enableRowSelection: false,
  enableRowExpansion: false,
  allowMultipleExpanded: true,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:sorting': [sorting: DataTableColumnSort[]]
  'update:columnFilters': [columnFilters: DataTableColumnFilter[]]
  'update:globalFilter': [globalFilter: unknown]
  'update:pagination': [pagination: DataTablePaginationState]
  'update:selectedRowIds': [selectedRowIds: DataTableRowId[]]
  'update:expandedRowIds': [expandedRowIds: DataTableRowId[]]
  stateChange: [payload: DataTableStateChangePayload]
}>()

defineSlots<{
  default(props: GhostDataTableSlotProps<TData>): unknown
}>()

const table = useGhostDataTable<TData>({
  data: () => props.data,
  columns: () => props.columns,
  getRowId: (row, index) => props.getRowId(row, index),
  manualSorting: () => props.manualSorting,
  manualFiltering: () => props.manualFiltering,
  manualPagination: () => props.manualPagination,
  // `rowCount` is documented as required with `manualPagination`. Without it
  // the composable's own runtime fallback (the loaded page length) applies;
  // passing it explicitly keeps the option type honest without a cast.
  rowCount: () => props.rowCount ?? props.data.length,
  pageCount: () => props.pageCount,
  enableRowSelection: () => props.enableRowSelection,
  enableRowExpansion: () => props.enableRowExpansion,
  allowMultipleExpanded: () => props.allowMultipleExpanded,
  loading: () => props.loading,
  disabled: () => props.disabled,
  sorting: () => props.sorting,
  defaultSorting: () => props.defaultSorting,
  columnFilters: () => props.columnFilters,
  defaultColumnFilters: () => props.defaultColumnFilters,
  globalFilter: () => props.globalFilter,
  defaultGlobalFilter: () => props.defaultGlobalFilter,
  pagination: () => props.pagination,
  defaultPagination: () => props.defaultPagination,
  selectedRowIds: () => props.selectedRowIds,
  defaultSelectedRowIds: () => props.defaultSelectedRowIds,
  expandedRowIds: () => props.expandedRowIds,
  defaultExpandedRowIds: () => props.defaultExpandedRowIds,
  onSortingChange: (next) => {
    emit('update:sorting', next)
  },
  onColumnFiltersChange: (next) => {
    emit('update:columnFilters', next)
  },
  onGlobalFilterChange: (next) => {
    emit('update:globalFilter', next)
  },
  onPaginationChange: (next) => {
    emit('update:pagination', next)
  },
  onSelectedRowIdsChange: (next) => {
    emit('update:selectedRowIds', next)
  },
  onExpandedRowIdsChange: (next) => {
    emit('update:expandedRowIds', next)
  },
  onStateChange: (payload) => {
    emit('stateChange', payload)
  },
})

// useId-based, so detail row ids (and `aria-controls`) match across SSR and
// hydration.
const baseId = useGhostId('ghost-data-table')

const slotProps = useDataTableSlotBindings(table, {
  columns: () => props.columns,
  baseId,
  ariaLabel: () => props.ariaLabel,
  ariaLabelledby: () => props.ariaLabelledby,
})

// Rendering children (GhostDataTableTable) read the same bindings as the
// default slot, so manual and default rendering cannot drift apart.
provide(ghostDataTableContextKey, {
  withBindings: (read) => read(slotProps.value),
})

defineExpose<GhostDataTableExposed<TData>>({
  toggleAllRowsSelected: table.toggleAllRowsSelected,
  toggleRowSelected: table.toggleRowSelected,
  toggleRowExpanded: table.toggleRowExpanded,
  resetRowSelection: table.resetRowSelection,
  retry: table.retry,
  setSorting: table.setSorting,
  toggleSorting: table.toggleSorting,
  setGlobalFilter: table.setGlobalFilter,
  setColumnFilter: table.setColumnFilter,
  setColumnFilters: table.setColumnFilters,
  setPagination: table.setPagination,
  setPageIndex: table.setPageIndex,
  setPageSize: table.setPageSize,
  getRowModel: table.getRowModel,
  getPrePaginationRowModel: table.getPrePaginationRowModel,
  getSelectedRowModel: table.getSelectedRowModel,
})
</script>

<template>
  <slot v-bind="slotProps" />
</template>
