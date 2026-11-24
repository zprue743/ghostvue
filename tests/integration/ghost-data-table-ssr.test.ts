import { describe, expect, it } from 'vitest'

import BasicInvoices from '../../examples/data-table/basic-invoices.vue'
import FullInvoices from '../../examples/data-table/full-invoices.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

describe('GhostDataTable SSR hydration', () => {
  it('hydrates the basic (a) GhostDataTableTable example', async () => {
    await expectSsrHydration(BasicInvoices, {
      assertServerHtml(html) {
        expect(html).toContain('data-ghost-data-table')
        expect(html).toContain('aria-label="Invoices"')
        expect(html).toContain('scope="col"')
        expect(html).toContain('type="button"')
        expect(html).toContain('1200.00 USD')
        expect(html).toContain('980.50 USD')
        // Unsorted: source order, and no header announces a sort yet.
        expect(html.indexOf('ACME Corp')).toBeLessThan(html.indexOf('Globex'))
        expect(html).not.toContain('aria-sort=')
        expect(html).toContain('aria-label="Pagination"')
      },
    })
  })

  it('hydrates the full (b) composition fixture without mismatches', async () => {
    const { html } = await expectSsrHydration(FullInvoices, {
      assertServerHtml(html) {
        expect(html).toContain('aria-label="Invoices"')
        expect(html).toContain('data-selected="true"')
        expect(html).toContain('data-expanded="true"')
        expect(html).toContain('data-detail-row="true"')
        expect(html).toContain('aria-expanded="true"')
        // Mixed state is a styling hook in SSR; the `indeterminate` DOM
        // property is applied after mount and never serialized.
        expect(html).toContain('data-state="indeterminate"')
        expect(html).not.toMatch(/\sindeterminate[\s=>]/)
      },
    })
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1] ?? ''
    expect(controls).not.toBe('')
    expect(html).toContain(`id="${controls}"`)
  })
})
