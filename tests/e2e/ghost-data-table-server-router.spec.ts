import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

/*
 * Acceptance for the spec's "Server state, URL, Back, and Retry" section on
 * the real browser history. The demo service answers after 600 ms of
 * setTimeout; the Playwright clock holds it so Back reliably lands while the
 * sort request is pending.
 */
const LATENCY_MS = 600

test.describe('GhostDataTable server router example @component:GhostDataTable', () => {
  test('hydrates from the URL, survives Back while pending, and retries', async ({
    page,
    playgroundUrl,
  }) => {
    await page.clock.install()
    const id = encodeURIComponent('data-table/server-invoices-router')
    await page.goto(
      `${playgroundUrl}/examples.html?id=${id}&sort=-amount&status=open&page=2`,
    )
    const table = page.getByRole('table', { name: 'Invoices' })
    const status = page.getByRole('status')
    const amountHeader = table.getByRole('columnheader', { name: 'Amount' })
    const sortByCustomer = table.getByRole('button', {
      name: 'Sort by Customer',
    })
    await expect(table).toHaveAttribute('aria-busy', 'true')

    // URL hydrate: the table shows the URL query and leaves the URL alone.
    await page.clock.runFor(LATENCY_MS)
    await expect(table).not.toHaveAttribute('aria-busy', 'true')
    await expect(status).toHaveText('16 invoices, page 2 of 4')
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await expect(page.getByLabel('Status')).toHaveValue('open')
    const hydratedUrl = page.url()
    expect(new URL(hydratedUrl).searchParams.get('page')).toBe('2')
    const hydratedRows = await table.locator('tbody tr').allTextContents()
    expect(hydratedRows).toHaveLength(5)
    await expectNoAxeViolations(page)

    // Sort by keyboard: one new history entry while the request is pending.
    await sortByCustomer.focus()
    await page.keyboard.press('Enter')
    await expect(sortByCustomer).toBeFocused()
    await expect(page).toHaveURL(/sort=customer/)
    await expect(table).toHaveAttribute('aria-busy', 'true')

    // Back while pending restores the previous query; the sort never applies.
    await page.goBack()
    await expect(page).toHaveURL(hydratedUrl)
    await expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
    await page.clock.runFor(LATENCY_MS)
    await expect(table).not.toHaveAttribute('aria-busy', 'true')
    await expect(status).toHaveText('16 invoices, page 2 of 4')
    await expect(
      table.getByRole('columnheader', { name: 'Customer' }),
    ).not.toHaveAttribute('aria-sort', /.+/)
    expect(await table.locator('tbody tr').allTextContents()).toEqual(
      hydratedRows,
    )
    await page.clock.runFor(LATENCY_MS * 2)
    expect(await table.locator('tbody tr').allTextContents()).toEqual(
      hydratedRows,
    )

    // Retry: a failed page keeps its error until retry() succeeds.
    await page.getByLabel('Fail the next request').check()
    await page.getByRole('button', { name: 'Page 3' }).click()
    await expect(page).toHaveURL(/page=3/)
    await page.clock.runFor(LATENCY_MS)
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Invoices failed to load')
    await expectNoAxeViolations(page)

    const urlBeforeRetry = page.url()
    await alert.getByRole('button', { name: 'Retry' }).click()
    await expect(alert).toBeVisible()
    await expect(table).toHaveAttribute('aria-busy', 'true')
    await page.clock.runFor(LATENCY_MS)
    await expect(alert).toBeHidden()
    await expect(status).toHaveText('16 invoices, page 3 of 4')
    // Retry repeats the same query: no new history entry.
    expect(page.url()).toBe(urlBeforeRetry)
    await page.goBack()
    await expect(page).toHaveURL(hydratedUrl)
  })
})
