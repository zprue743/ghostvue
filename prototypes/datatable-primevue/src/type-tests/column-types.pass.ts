import { defineDataTableColumns } from '../ghostvue/defineDataTableColumns'

type Invoice = { id: string; customer: string; amount: number }

const helper = defineDataTableColumns<Invoice>()

helper.accessorKey('amount', {
  header: 'Amount',
  cell: ({ value }) => value.toFixed(2),
})

helper.accessorFn('total', {
  accessorFn: (row) => row.amount * 2,
  header: 'Total',
  cell: ({ value }) => value.toFixed(2),
})

helper.accessorKey('amount', {
  header: 'Amount',
  cell: ({ value }) =>
    // @ts-expect-error toUpperCase is not on number
    value.toUpperCase(),
})