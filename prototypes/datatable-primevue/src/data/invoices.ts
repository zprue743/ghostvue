export type Invoice = {
  id: string
  customer: string
  amount: number
}

export const approvalFixtureInvoices: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
]

export function generateInvoices(count: number): Invoice[] {
  const customers = ['ACME Corp', 'Globex', 'Initech', 'Umbrella', 'Wayne Enterprises']
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${index + 1}`,
    customer: customers[index % customers.length]!,
    amount: Math.round((index * 17.3 + (index % 7) * 100) * 100) / 100,
  }))
}