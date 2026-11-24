import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

test.describe('GhostDataTable pagination @component:GhostDataTable', () => {
  test('co-located GhostPagination pages, clamps, and has zero axe violations', async ({
    page,
    playgroundUrl,
  }) => {
    await page.goto(
      `${playgroundUrl}/examples.html?id=${encodeURIComponent('data-table/paginated-invoices')}`,
    )
    const table = page.getByRole('table', { name: 'Invoices' })
    const pager = page.getByRole('navigation', { name: 'Invoice pages' })
    const status = page.getByText(/invoices, page \d+ of \d+/)
    await expect(table).toBeVisible()
    await expect(pager).toBeVisible()
    await expect(status).toHaveText('23 invoices, page 1 of 5')
    await expectNoAxeViolations(page)

    // Keyboard: Enter on a page button commits it through setPageIndex.
    const pageFive = pager.getByRole('button', { name: 'Page 5' })
    await pageFive.focus()
    await page.keyboard.press('Enter')
    await expect(pageFive).toBeFocused()
    await expect(pageFive).toHaveAttribute('aria-current', 'page')
    await expect(status).toHaveText('23 invoices, page 5 of 5')
    await expect(table.locator('tbody tr')).toHaveCount(3)

    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Space')
    await expect(status).toHaveText('23 invoices, page 4 of 5')

    // A narrower filter clamps to the last valid page instead of page 1.
    await page
      .getByRole('searchbox', { name: 'Search invoices' })
      .fill('initech')
    await expect(status).toHaveText('6 invoices, page 2 of 2')
    await expect(pager.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expectNoAxeViolations(page)

    // Query-wide empty: page 1 of 1, header row and empty state stay.
    await page
      .getByRole('searchbox', { name: 'Search invoices' })
      .fill('no such customer')
    await expect(status).toHaveText('0 invoices, page 1 of 1')
    await expect(table.getByRole('columnheader')).toHaveCount(3)
    await expect(
      page.getByRole('heading', { name: 'No invoices' }),
    ).toBeVisible()
    await expect(pager.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expectNoAxeViolations(page)
  })
})
