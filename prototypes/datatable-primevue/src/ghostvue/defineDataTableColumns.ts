import type { VNodeChild } from 'vue'
import type {
  DataTableCellContext,
  DataTableColumnDef,
} from './types'

export function defineDataTableColumns<TData>(): {
  accessorKey: <K extends keyof TData & string>(
    key: K,
    column: Omit<DataTableColumnDef<TData>, 'accessorKey' | 'id' | 'cell'> & {
      id?: string
      cell?: (
        ctx: Omit<DataTableCellContext<TData>, 'getValue'> & {
          value: TData[K]
          getValue: () => TData[K]
        },
      ) => VNodeChild
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
      ) => VNodeChild
    },
  ) => DataTableColumnDef<TData>
} {
  return {
    accessorKey(key, column) {
      const id = column.id ?? key
      return {
        ...column,
        id,
        accessorKey: key,
      } as DataTableColumnDef<TData>
    },
    accessorFn(id, column) {
      return {
        ...column,
        id,
        accessorFn: column.accessorFn,
      } as DataTableColumnDef<TData>
    },
  }
}