import { ref } from 'vue'

import {
  defineDataTableColumns,
  useGhostDataTable,
  type DataTableCellContext,
  type DataTableColumnDef,
  type GhostDataTableSlotProps,
} from '../src'

/*
 * Spec type-test acceptance for `defineDataTableColumns`
 * (docs/components/data-table-spec.md §Types and §Test plan "Type"). Each
 * `@ts-expect-error` fails vue-tsc as an unused directive if the error it
 * guards against stops being reported. Rejected methods are read with
 * `void x.method` rather than called, so type-aware lint does not flag an
 * unsafe call on the intentionally unresolved member.
 */

interface Invoice {
  id: string
  customer: string
  amount: number
}

/** `Invoice` after renaming `amount` to `total`. */
interface RenamedInvoice {
  id: string
  customer: string
  total: number
}

const columns = defineDataTableColumns<Invoice>()

// --- accessorKey: value is inferred as Invoice['amount'] (number) ---------
const amountColumn: DataTableColumnDef<Invoice> = columns.accessorKey(
  'amount',
  {
    header: 'Amount',
    enableSorting: true,
    cell: ({ value, getValue, row, rowId }) => {
      const fixed: string = value.toFixed(2)
      const viaGetter: string = getValue().toFixed(2)
      // @ts-expect-error `amount` is a number, so `toUpperCase` is not available
      void value.toUpperCase
      // @ts-expect-error the typed getter returns a number too
      void getValue().toUpperCase
      return `${fixed} ${viaGetter} ${row.customer} ${String(rowId)}`
    },
  },
)

// String columns get string methods and lose number ones.
const customerColumn = columns.accessorKey('customer', {
  cell: ({ value }) => {
    // @ts-expect-error `customer` is a string, so `toFixed` is not available
    void value.toFixed
    return value.toUpperCase()
  },
})

// Renaming a row key breaks the column definition at compile time.
// @ts-expect-error `total` is not a key of Invoice
columns.accessorKey('total', { header: 'Total' })

const renamed = defineDataTableColumns<RenamedInvoice>()
// @ts-expect-error after the rename, `amount` is no longer a key of the row
renamed.accessorKey('amount', {
  cell: ({ value }) => String(value),
})

// accessorKey columns cannot also carry an accessorFn (it would shadow the key).
columns.accessorKey('amount', {
  // @ts-expect-error accessorFn is not allowed on an accessorKey column
  accessorFn: (row: Invoice) => row.customer,
})

// --- accessorFn: value is inferred from the accessor return type -----------
const amountWithTax = columns.accessorFn('amountWithTax', {
  header: 'With tax',
  accessorFn: (row) => row.amount * 1.2,
  cell: ({ value, getValue }) => {
    // @ts-expect-error the accessorFn returns a number, so `toUpperCase` is not available
    void value.toUpperCase
    // @ts-expect-error the typed getter returns a number too
    void getValue().toUpperCase
    return `${value.toFixed(2)} ${getValue().toFixed(2)}`
  },
})

renamed.accessorFn('amountWithTax', {
  // @ts-expect-error after the rename, `row.amount` does not exist
  accessorFn: (row) => row.amount * 1.2,
})

// The accessorFn column needs an explicit id and an accessorFn.
// @ts-expect-error accessorFn is required
columns.accessorFn('missingAccessor', { header: 'Missing' })

// --- Helper output is an ordinary column array ------------------------------
const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
])
const table = useGhostDataTable({
  data,
  columns: [amountColumn, customerColumn, amountWithTax],
  getRowId: (row) => row.id,
})

// Columns for another row type are rejected.
useGhostDataTable({
  data,
  // @ts-expect-error RenamedInvoice columns do not fit Invoice rows
  columns: [renamed.accessorKey('total', {})],
  getRowId: (row) => row.id,
})

// --- Generic contexts keep `getValue(): unknown` ----------------------------
declare const slot: GhostDataTableSlotProps<Invoice>
const genericContext: DataTableCellContext<Invoice> = slot.getBodyCellContext(
  'inv-1',
  'amount',
)
const unknownValue: unknown = genericContext.getValue()
// @ts-expect-error generic slot contexts expose `getValue(): unknown`
void genericContext.getValue().toFixed
// @ts-expect-error generic slot contexts have no typed `value`
void genericContext.value

// The returned column's `cell` takes the generic context, so a renderer can
// invoke any column the same way.
const rendered = amountColumn.cell?.(genericContext)

void table
void unknownValue
void rendered
