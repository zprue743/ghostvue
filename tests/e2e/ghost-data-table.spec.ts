import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import {
  expect,
  gotoPlayground,
  playgroundTest as test,
} from '../support/playground'

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

  test('cycles single-column sort from fixture (b) header buttons with zero axe violations on header cells', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const thead = page.locator('table[data-ghost-data-table] thead')
    const sortedHeaders = thead.locator('th[aria-sort]')
    const amountSort = page.getByRole('button', { name: 'Amount sort' })
    const customerSort = page.getByRole('button', { name: 'Customer sort' })
    const amountHeader = page.getByRole('columnheader', { name: 'Amount sort' })
    const customerHeader = page.getByRole('columnheader', {
      name: 'Customer sort',
    })

    // Every header cell has a name, including the icon-only selection cell.
    for (const name of ['Selection', 'Details']) {
      await expect(
        page.getByRole('columnheader', { name, exact: true }),
      ).toBeVisible()
    }
    await expect(sortedHeaders).toHaveCount(0)
    await expectNoAxeViolations(page, { include: 'thead' })

    // none → asc → desc → none, alternating Enter and Space on the button.
    await amountSort.focus()
    await page.keyboard.press('Enter')
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(sortedHeaders).toHaveCount(1)
    await expectNoAxeViolations(page, { include: 'thead' })
    await page.keyboard.press('Space')
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(sortedHeaders).toHaveCount(1)
    await expectNoAxeViolations(page, { include: 'thead' })
    await page.keyboard.press('Enter')
    await expect(amountSort).toBeFocused()
    await expect(sortedHeaders).toHaveCount(0)
    await expect(customerCells(page)).toHaveText([
      'ACME Corp',
      'Globex',
      'Initech',
    ])

    // Sorting another column moves aria-sort; it never stays on two <th>s.
    await page.keyboard.press('Space')
    await customerSort.focus()
    await page.keyboard.press('Space')
    await expect(customerSort).toBeFocused()
    await expect(customerHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(amountHeader).not.toHaveAttribute('aria-sort', /.*/)
    await expect(sortedHeaders).toHaveCount(1)
    await expect(amountSort).not.toHaveAttribute('aria-sort', /.*/)
    await expectNoAxeViolations(page, { include: 'thead' })
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

  test('custom icon-only sort header keeps focus and moves aria-sort on Enter', async ({
    page,
    playgroundUrl,
  }) => {
    await gotoPlayground(page, playgroundUrl)
    const section = page.getByTestId('data-table-reference')
    await section.scrollIntoViewIfNeeded()
    // The icon-only button's only name is the helper label.
    const sort = section.getByRole('button', {
      name: 'Order invoices by Amount',
      exact: true,
    })
    // `has` locators resolve inside each <th>, so they start from `page`.
    const amountHeader = section.locator('th', {
      has: page.getByRole('button', { name: 'Order invoices by Amount' }),
    })
    const customerHeader = section.locator('th', {
      has: page.getByRole('button', { name: 'Order invoices by Customer' }),
    })
    const amounts = section.locator(
      'tbody tr:not([data-detail-row]) td:nth-child(4)',
    )
    await expect(amountHeader).not.toHaveAttribute('aria-sort', /.*/)
    await expect(sort).not.toHaveAttribute('aria-sort', /.*/)

    await sort.focus()
    await page.keyboard.press('Enter')
    await expect(sort).toBeFocused()
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(amountHeader).toHaveAttribute('data-sort', 'asc')
    await expect(sort).not.toHaveAttribute('aria-sort', /.*/)
    await expect(customerHeader).not.toHaveAttribute('aria-sort', /.*/)
    await expect(amounts).toHaveText(['42', '980.5', '1200'])

    await page.keyboard.press('Enter')
    await expect(sort).toBeFocused()
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(amounts).toHaveText(['1200', '980.5', '42'])

    await page.keyboard.press('Enter')
    await expect(sort).toBeFocused()
    await expect(amountHeader).not.toHaveAttribute('aria-sort', /.*/)
    await expectNoAxeViolations(page, {
      include: '[data-testid="data-table-reference"]',
    })
  })

  test('returns focus to the expand button when a focused detail row collapses', async ({
    page,
    playgroundUrl,
  }) => {
    await gotoPlayground(page, playgroundUrl)
    const section = page.getByTestId('data-table-reference')
    await section.scrollIntoViewIfNeeded()
    const expand = section.getByRole('button', {
      name: 'Reference details for inv-2',
    })
    const hide = section.getByRole('button', {
      name: 'Hide details for inv-2',
    })
    const detail = section.locator('tr[data-detail-row]')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(expand).toHaveAttribute(
      'aria-controls',
      (await detail.getAttribute('id')) ?? '',
    )
    await expectNoAxeViolations(page, {
      include: '[data-testid="data-table-reference"]',
    })

    // Enter on a control inside the detail row collapses it.
    await hide.focus()
    await page.keyboard.press('Enter')
    await expect(detail).toHaveCount(0)
    await expect(expand).toBeFocused()
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await expect(expand).not.toHaveAttribute('aria-controls', /.*/)

    // Space on the expand button reopens it; Space inside collapses again.
    await page.keyboard.press('Space')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(expand).toBeFocused()
    await hide.focus()
    await page.keyboard.press('Space')
    await expect(detail).toHaveCount(0)
    await expect(expand).toBeFocused()

    // Collapsing from the expand button itself keeps focus there.
    await page.keyboard.press('Enter')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await expect(expand).toBeFocused()
    await expectNoAxeViolations(page, {
      include: '[data-testid="data-table-reference"]',
    })
  })

  test('names every selection checkbox on the native input', async ({
    page,
    playgroundUrl,
  }) => {
    await gotoPlayground(page, playgroundUrl)
    const section = page.getByTestId('data-table-reference')
    const row = section.getByRole('checkbox', {
      name: 'Select reference invoice inv-1',
    })
    const all = section.getByRole('checkbox', {
      name: 'Select every reference invoice',
    })
    for (const checkbox of [row, all]) {
      await expect(checkbox).toHaveJSProperty('tagName', 'INPUT')
      await expect(checkbox).toHaveAttribute('aria-label', /Select/)
    }
    await row.focus()
    await page.keyboard.press('Space')
    await expect(row).toBeChecked()
    await expect(all).toHaveJSProperty('indeterminate', true)
    // Enter does not toggle a checkbox.
    await page.keyboard.press('Enter')
    await expect(row).toBeChecked()
  })
})

test.describe('GhostDataTableTable @component:GhostDataTableTable', () => {
  test('renders basic example (a) and sorts from the keyboard with zero axe violations', async ({
    page,
    playgroundUrl,
  }) => {
    await page.goto(
      `${playgroundUrl}/examples.html?id=${encodeURIComponent('data-table/basic-invoices')}`,
    )
    const table = page.getByRole('table', { name: 'Invoices' })
    await expect(table).toBeVisible()
    await expectNoAxeViolations(page)

    const customers = table.locator('tbody td:nth-child(1)')
    const amounts = table.locator('tbody td:nth-child(2)')
    await expect(table.getByRole('columnheader')).toHaveText([
      'Customer',
      'Amount',
    ])
    await expect(amounts).toHaveText(['1200.00 USD', '980.50 USD'])

    // Enter and Space both activate the native sort button; focus stays on
    // it and aria-sort moves on the <th>, not the button.
    const amountSort = table.getByRole('button', { name: 'Amount' })
    const amountHeader = table.getByRole('columnheader', { name: 'Amount' })
    await amountSort.focus()
    await page.keyboard.press('Enter')
    await expect(amountSort).toBeFocused()
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(amountSort).not.toHaveAttribute('aria-sort', /.*/)
    await expect(customers).toHaveText(['Globex', 'ACME Corp'])

    await page.keyboard.press('Space')
    await expect(amountSort).toBeFocused()
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(customers).toHaveText(['ACME Corp', 'Globex'])

    // Tab moves between the sort buttons in DOM order (no grid focus model).
    const customerSort = table.getByRole('button', { name: 'Customer' })
    await customerSort.focus()
    await page.keyboard.press('Tab')
    await expect(amountSort).toBeFocused()
    await expect(
      page.getByRole('navigation', { name: 'Pagination' }),
    ).toBeVisible()
    await expectNoAxeViolations(page)
  })
})
