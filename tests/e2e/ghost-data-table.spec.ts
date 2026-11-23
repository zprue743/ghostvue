import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

async function openFullInvoices(page: Page, playgroundUrl: string) {
  await page.goto(
    `${playgroundUrl}/examples.html?id=${encodeURIComponent('data-table/full-invoices')}`,
  )
  await expect(page.locator('table[data-ghost-data-table]')).toBeVisible()
}

function customerCells(page: Page) {
  return page.locator('tbody tr:not([data-detail-row]) td:nth-child(3)')
}

test.describe('GhostDataTable @component:GhostDataTable', () => {
  test('runs the approval script on full composition fixture (b) with zero axe violations', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const table = page.getByRole('table', { name: 'Invoices' })
    await expect(table).toBeVisible()
    await expectNoAxeViolations(page)

    // 1. Sort Amount from the keyboard; aria-sort lands on the <th>.
    const amountSort = page.getByRole('button', { name: 'Amount sort' })
    const amountHeader = page.getByRole('columnheader', { name: 'Amount sort' })
    await amountSort.focus()
    await page.keyboard.press('Enter')
    await expect(amountSort).toBeFocused()
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(customerCells(page)).toHaveText([
      'Initech',
      'Globex',
      'ACME Corp',
    ])
    await page.keyboard.press('Space')
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(amountSort).toBeFocused()

    // 2. Space toggles the inv-2 checkbox (starts selected).
    const inv2Checkbox = page.getByRole('checkbox', {
      name: 'Select invoice inv-2',
    })
    await expect(inv2Checkbox).toBeChecked()
    await inv2Checkbox.focus()
    await page.keyboard.press('Space')
    await expect(inv2Checkbox).not.toBeChecked()
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(inv2Checkbox).toBeChecked()

    // 3. Space collapses, then reopens, the inv-2 detail row.
    const inv2Expand = page.getByRole('button', {
      name: 'Show details for inv-2',
    })
    await expect(inv2Expand).toHaveAttribute('aria-expanded', 'true')
    await inv2Expand.focus()
    await page.keyboard.press('Space')
    await expect(inv2Expand).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('tr[data-detail-row]')).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(inv2Expand).toHaveAttribute('aria-expanded', 'true')
    const detail = page.locator('tr[data-detail-row]')
    await expect(detail).toHaveText('Details for inv-2')
    await expect(inv2Expand).toHaveAttribute(
      'aria-controls',
      (await detail.getAttribute('id')) ?? '',
    )
    await expectNoAxeViolations(page)

    // 4. A filter that matches nothing keeps the header row mounted.
    await page.getByRole('searchbox', { name: 'Search' }).fill('zzz')
    await expect(
      page.getByRole('heading', { name: 'No invoices' }),
    ).toBeVisible()
    await expect(page.getByRole('columnheader')).toHaveCount(4)
    await expectNoAxeViolations(page)
  })

  test('selects every filtered row from the header checkbox', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const selectAll = page.getByRole('checkbox', {
      name: 'Select all invoices matching filters',
    })
    await expect(selectAll).toHaveJSProperty('indeterminate', true)
    await selectAll.focus()
    await page.keyboard.press('Space')
    await expect(selectAll).toBeChecked()
    await expect(selectAll).toHaveJSProperty('indeterminate', false)
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(3)
  })
})
