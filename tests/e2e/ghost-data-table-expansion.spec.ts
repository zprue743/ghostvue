import type { Locator, Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import {
  expect,
  gotoPlayground,
  playgroundTest as test,
} from '../support/playground'

/*
 * Row expansion detail rows (GHO-244) on approval fixture (b),
 * `examples/data-table/full-invoices.vue`, plus focus return from inside a
 * detail row on the playground reference fixture (fixture (b)'s detail rows
 * hold no focusable control).
 */

async function openFullInvoices(page: Page, playgroundUrl: string) {
  await page.goto(
    `${playgroundUrl}/examples.html?id=${encodeURIComponent('data-table/full-invoices')}`,
  )
  await expect(page.locator('table[data-ghost-data-table]')).toBeVisible()
}

/** Text of the `<tr>` right after the data row that owns `button`. */
async function nextRowAfter(button: Locator): Promise<string | null> {
  return button.evaluate((element) => {
    const next = element.closest('tr')?.nextElementSibling
    if (!next) return null
    return next.hasAttribute('data-detail-row')
      ? `detail:${next.textContent.trim()}`
      : 'data'
  })
}

test.describe('GhostDataTable row expansion @component:GhostDataTable', () => {
  test('labels every expand button and renders the detail row after its data row', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    for (const id of ['inv-1', 'inv-2', 'inv-3']) {
      const button = page.getByRole('button', {
        name: `Show details for ${id}`,
        exact: true,
      })
      await expect(button).toHaveAttribute('type', 'button')
      await expect(button).toHaveAttribute(
        'aria-expanded',
        id === 'inv-2' ? 'true' : 'false',
      )
    }
    const inv2Expand = page.getByRole('button', {
      name: 'Show details for inv-2',
    })
    const detail = page.locator('tr[data-detail-row]')
    await expect(detail).toHaveCount(1)
    expect(await nextRowAfter(inv2Expand)).toBe('detail:Details for inv-2')
    await expect(page.locator('tr[data-expanded]')).toHaveCount(1)
    await expect(inv2Expand).toHaveAttribute(
      'aria-controls',
      (await detail.getAttribute('id')) ?? '',
    )

    // Sorting moves the data row; its detail row follows it by row id.
    await page.getByRole('button', { name: 'Amount sort' }).click()
    await expect(
      page.locator('tbody tr:not([data-detail-row]) td:nth-child(3)'),
    ).toHaveText(['Initech', 'Globex', 'ACME Corp'])
    expect(await nextRowAfter(inv2Expand)).toBe('detail:Details for inv-2')
    await expectNoAxeViolations(page)
  })

  test('Space collapses then reopens the detail row and focus stays on the control', async ({
    page,
    playgroundUrl,
  }) => {
    await openFullInvoices(page, playgroundUrl)
    const inv2Expand = page.getByRole('button', {
      name: 'Show details for inv-2',
    })
    const detail = page.locator('tr[data-detail-row]')
    await inv2Expand.focus()

    await page.keyboard.press('Space')
    await expect(inv2Expand).toHaveAttribute('aria-expanded', 'false')
    await expect(inv2Expand).not.toHaveAttribute('aria-controls', /.*/)
    await expect(detail).toHaveCount(0)
    await expect(inv2Expand).toBeFocused()

    await page.keyboard.press('Space')
    await expect(inv2Expand).toHaveAttribute('aria-expanded', 'true')
    await expect(detail).toHaveText('Details for inv-2')
    await expect(inv2Expand).toBeFocused()
    expect(await nextRowAfter(inv2Expand)).toBe('detail:Details for inv-2')

    // Enter toggles too; several rows may be open at once by default.
    const inv1Expand = page.getByRole('button', {
      name: 'Show details for inv-1',
    })
    await inv1Expand.focus()
    await page.keyboard.press('Enter')
    await expect(detail).toHaveCount(2)
    expect(await nextRowAfter(inv1Expand)).toBe('detail:Details for inv-1')
    await page.keyboard.press('Enter')
    await expect(detail).toHaveText(['Details for inv-2'])
    await expect(inv1Expand).toBeFocused()
    await expectNoAxeViolations(page)
  })

  test('returns focus to the expand button when collapsing from inside the detail row', async ({
    page,
    playgroundUrl,
  }) => {
    await gotoPlayground(page, playgroundUrl)
    const section = page.getByTestId('data-table-reference')
    await section.scrollIntoViewIfNeeded()
    const expand = section.getByRole('button', {
      name: 'Reference details for inv-2',
    })
    const hide = section.getByRole('button', { name: 'Hide details for inv-2' })

    await hide.focus()
    await page.keyboard.press('Space')
    await expect(section.locator('tr[data-detail-row]')).toHaveCount(0)
    await expect(expand).toBeFocused()
    await expect(expand).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('Space')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(expand).toBeFocused()
    expect(await nextRowAfter(expand)).toMatch(
      /^detail:Reference details for inv-2/,
    )
  })
})
