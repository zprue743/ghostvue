import { ref } from 'vue'

import {
  useGhostDataTable,
  useGhostDataTableServerRequest,
  type DataTableCellContext,
  type DataTableColumnDef,
  type DataTableRowId,
  type DataTableStateChangePayload,
  type UseGhostDataTableReturn,
  type UseGhostDataTableServerRequestReturn,
} from '../src'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
])

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  {
    id: 'amount',
    accessorFn: (row) => row.amount,
    cell: ({ row, getValue }) =>
      `${row.amount.toFixed(2)} ${String(getValue())}`,
  },
]

const badColumn: DataTableColumnDef<Invoice> = {
  id: 'missing',
  // @ts-expect-error accessorKey must name a key of the row type
  accessorKey: 'total',
}

const table: UseGhostDataTableReturn<Invoice> = useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  onStateChange: (payload: DataTableStateChangePayload) => {
    const id: number = payload.requestId
    void id
  },
})

const firstRow: Invoice | undefined = table.getRowModel()[0]?.row
const firstId: DataTableRowId | undefined = table.getRowModel()[0]?.rowId

// Generic cell contexts keep `getValue(): unknown` (spec getValue typing policy).
declare const context: DataTableCellContext<Invoice>
// @ts-expect-error getValue is unknown in generic contexts
const typedValue: number = context.getValue()

// @ts-expect-error getRowId is required in every build
useGhostDataTable({ data, columns })

// @ts-expect-error rowCount is required when manualPagination is true
useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  manualPagination: true,
})

const manualFlag = ref(true)
// @ts-expect-error rowCount is required when manualPagination may be true
useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  manualPagination: manualFlag,
})

useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  manualPagination: manualFlag,
  rowCount: 250,
})

// Server request guard pairs with table-minted ids only (spec Async behavior).
const serverRequest: UseGhostDataTableServerRequestReturn =
  useGhostDataTableServerRequest()
useGhostDataTable({
  data,
  columns,
  getRowId: (row) => row.id,
  manualPagination: true,
  manualFiltering: true,
  rowCount: 250,
  onStateChange: ({ requestId }) => {
    serverRequest.begin(requestId)
    const current: boolean = serverRequest.isLatest(requestId)
    void current
  },
})
// @ts-expect-error requestId is the numeric id from stateChange, not a string
serverRequest.begin('request-1')

void badColumn
void typedValue
void firstRow
void firstId
