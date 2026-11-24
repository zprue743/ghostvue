import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

/*
 * Row selection in the browser (GHO-243) on approval fixture (b),
 * `examples/data-table/full-invoices.vue`: labelled native checkboxes, `Space`
 * toggles (and `Enter` does not), and the local select-all rule (every row
 * matching the filter, not just the rendered page). inv-2 starts selected.
 */

const ROW_IDS = ['inv-1', 'inv-2', 'inv-3'] as const

async function openFullInvoices(page: Page, playgroundUrl: string) {
  await page.goto(
    `${playgroundUrl}/examples.html?id=${encodeURIComponent('data-table/full-invoices')}`,
  )
  await expect(page.locator('table[data-ghost-data-table]')).toBeVisible()
}

function rowCheckbox(page: Page, rowId: string) {
  return page.getByRole('checkbox', { name: `Select invoice ${rowId}` })
}

function selectAll(page: Page) {
  return page.getByRole('checkbox', {
    name: 'Select all invoices matching filters',
  })
}

test.describe('GhostDataTable selection @component:GhostDataTable', () => {
  test('labels every selection checkbox on its native input and toggles with Space only', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const header = selectAll(page)
    for (const checkbox of [
      header,
      ...ROW_IDS.map((id) => rowCheckbox(page, id)),
    ]) {
      await expect(checkbox).toHaveJSProperty('tagName', 'INPUT')
      await expect(checkbox).toHaveJSProperty('type', 'checkbox')
    }
    await expect(header).toHaveJSProperty('indeterminate', true)

    // Space selects inv-1 and inv-3 from the keyboard; focus stays put.
    for (const id of ['inv-1', 'inv-3']) {
      const checkbox = rowCheckbox(page, id)
      await checkbox.focus()
      await page.keyboard.press('Space')
      await expect(checkbox).toBeChecked()
      await expect(checkbox).toBeFocused()
    }
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(3)
    await expect(header).toBeChecked()
    await expect(header).toHaveJSProperty('indeterminate', false)

    // Enter never toggles a checkbox.
    await page.keyboard.press('Enter')
    await expect(rowCheckbox(page, 'inv-3')).toBeChecked()

    // Space on the header clears every row it targets.
    await header.focus()
    await page.keyboard.press('Space')
    await expect(header).not.toBeChecked()
    await expect(header).toHaveJSProperty('indeterminate', false)
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(0)
    await expectNoAxeViolations(page)
  })

  test('select-all targets every row matching the filter and keeps it after clearing', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const search = page.getByRole('searchbox', { name: 'Search' })
    const header = selectAll(page)

    // "o" matches ACME Corp (inv-1) and Globex (inv-2), not Initech (inv-3).
    await search.fill('o')
    await expect(rowCheckbox(page, 'inv-3')).toHaveCount(0)
    await expect(header).toHaveJSProperty('indeterminate', true)

    await header.focus()
    await page.keyboard.press('Space')
    await expect(header).toBeChecked()
    await expect(rowCheckbox(page, 'inv-1')).toBeChecked()
    await expect(rowCheckbox(page, 'inv-2')).toBeChecked()

    // Clearing the filter widens the target; the filtered-out row stays off.
    await search.fill('')
    await expect(rowCheckbox(page, 'inv-3')).not.toBeChecked()
    await expect(rowCheckbox(page, 'inv-1')).toBeChecked()
    await expect(header).not.toBeChecked()
    await expect(header).toHaveJSProperty('indeterminate', true)
    await expect(page.locator('tbody tr[data-selected]')).toHaveCount(2)
  })
})
