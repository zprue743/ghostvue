import type { VNodeChild } from 'vue'

export type DataTableRowId = string | number

export type DataTableSortDirection = 'asc' | 'desc' | false

export interface DataTableColumnSort {
  id: string
  desc: boolean
}

export interface DataTableColumnFilter {
  id: string
  value: unknown
}

export interface DataTablePaginationState {
  /** 1-based page index */
  pageIndex: number
  pageSize: number
}

export interface DataTableQueryState {
  sorting: DataTableColumnSort[]
  columnFilters: DataTableColumnFilter[]
  globalFilter: unknown
  pagination: DataTablePaginationState
}

export interface DataTableColumnDef<TData> {
  id: string
  header?: string
  accessorKey?: keyof TData & string
  accessorFn?: (row: TData, index: number) => unknown
  cell?: (context: DataTableCellContext<TData>) => VNodeChild
  enableSorting?: boolean
  enableColumnFilter?: boolean
  sortFn?: (rowA: TData, rowB: TData, columnId: string) => number
  filterFn?: (row: TData, columnId: string, filterValue: unknown) => boolean
}

export interface DataTableCellContext<TData> {
  row: TData
  rowId: DataTableRowId
  rowIndex: number
  column: DataTableColumnDef<TData>
  getValue: () => unknown
}

export type DataTableGetRowId<TData> = (row: TData, index: number) => DataTableRowId

export interface DataTableStateChangePayload {
  requestId: number
  trigger: keyof DataTableQueryState
  query: DataTableQueryState
}

export type DataTableManualTrigger = keyof DataTableQueryState