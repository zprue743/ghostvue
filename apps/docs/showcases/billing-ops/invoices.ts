export type InvoiceStatus = 'Paid' | 'Past due' | 'Draft' | 'Refunded'

export interface Invoice {
  id: string
  customer: string
  email: string
  issued: string
  amountCents: number
  status: InvoiceStatus
}

export const invoiceStatuses = ['All', 'Paid', 'Past due', 'Draft'] as const

export const initialInvoices: readonly Invoice[] = [
  {
    id: 'INV-1048',
    customer: 'Northstar Studio',
    email: 'billing@northstar.example',
    issued: '2026-11-18',
    amountCents: 248000,
    status: 'Paid',
  },
  {
    id: 'INV-1047',
    customer: 'Lumen Works',
    email: 'accounts@lumen.example',
    issued: '2026-11-17',
    amountCents: 126000,
    status: 'Draft',
  },
  {
    id: 'INV-1046',
    customer: 'Fieldwork Labs',
    email: 'billing@fieldwork.example',
    issued: '2026-11-15',
    amountCents: 372500,
    status: 'Past due',
  },
  {
    id: 'INV-1045',
    customer: 'Canopy Digital',
    email: 'accounts@canopy.example',
    issued: '2026-11-14',
    amountCents: 156000,
    status: 'Paid',
  },
  {
    id: 'INV-1044',
    customer: 'Harbor & Co.',
    email: 'billing@harbor.example',
    issued: '2026-11-12',
    amountCents: 98000,
    status: 'Past due',
  },
  {
    id: 'INV-1043',
    customer: 'Summit Supply',
    email: 'accounts@summit.example',
    issued: '2026-11-10',
    amountCents: 214000,
    status: 'Draft',
  },
  {
    id: 'INV-1042',
    customer: 'Juniper Systems',
    email: 'billing@juniper.example',
    issued: '2026-11-08',
    amountCents: 423000,
    status: 'Paid',
  },
  {
    id: 'INV-1041',
    customer: 'Meridian Design',
    email: 'accounts@meridian.example',
    issued: '2026-11-05',
    amountCents: 189500,
    status: 'Past due',
  },
  {
    id: 'INV-1040',
    customer: 'Arcade Creative',
    email: 'billing@arcade.example',
    issued: '2026-11-03',
    amountCents: 74000,
    status: 'Paid',
  },
  {
    id: 'INV-1039',
    customer: 'Atlas Research',
    email: 'accounts@atlas.example',
    issued: '2026-11-01',
    amountCents: 268000,
    status: 'Draft',
  },
]

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
const date = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatAmount(cents: number): string {
  return currency.format(cents / 100)
}

export function formatIssued(issued: string): string {
  return date.format(new Date(`${issued}T00:00:00Z`))
}

export function invoiceCsv(invoices: readonly Invoice[]): string {
  const header = 'Invoice,Customer,Issued,Status,Amount (USD)'
  const rows = invoices.map((invoice) =>
    [
      invoice.id,
      invoice.customer,
      invoice.issued,
      invoice.status,
      (invoice.amountCents / 100).toFixed(2),
    ]
      .map((value) => `"${value.replaceAll('"', '""')}"`)
      .join(','),
  )
  return [header, ...rows].join('\r\n')
}
