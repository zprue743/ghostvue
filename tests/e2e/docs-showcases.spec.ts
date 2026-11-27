import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { docsTest as test, expect } from '../support/docs'

async function openBilling(page: Page, docsUrl: string) {
  await page.goto(`${docsUrl}/examples`)
  const table = page.getByRole('table', { name: 'Invoices', exact: true })
  await expect(table).toBeVisible()
  return table
}

test.describe('Billing & Invoices showcase', () => {
  test('sorts and combines customer search, status and inclusive date filters', async ({
    page,
    docsUrl,
  }) => {
    const table = await openBilling(page, docsUrl)
    const amount = table.getByRole('button', { name: 'Amount' })
    const amountHeading = table.getByRole('columnheader', { name: 'Amount' })
    await amount.focus()
    await page.keyboard.press('Enter')
    await expect(amount).toBeFocused()
    await expect(amountHeading).toHaveAttribute('aria-sort', 'ascending')
    await expect(table.getByRole('row').nth(1)).toContainText('INV-1040')
    await page.keyboard.press('Space')
    await expect(amountHeading).toHaveAttribute('aria-sort', 'descending')
    await expect(table.getByRole('row').nth(1)).toContainText('INV-1042')
    await expect(
      page.getByText('Sorted by Amount, descending', { exact: false }),
    ).toBeVisible()

    const status = page.getByRole('group', { name: 'Invoice status' })
    await status.getByRole('button', { name: 'All', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    const paid = status.getByRole('button', { name: 'Paid', exact: true })
    await expect(paid).toBeFocused()
    await page.keyboard.press('Space')
    await expect(paid).toHaveAttribute('aria-pressed', 'true')
    const calendarTrigger = page.getByRole('button', { name: /Choose dates/ })
    await calendarTrigger.press('Enter')
    const calendar = page.getByRole('dialog')
    await expect(calendar).toBeVisible()
    await expectNoAxeViolations(page, { include: '.billing-gallery' })
    await page.keyboard.press('Escape')
    await expect(calendar).toBeHidden()
    await expect(calendarTrigger).toBeFocused()

    const start = page.getByRole('textbox', { name: 'From', exact: true })
    const end = page.getByRole('textbox', { name: 'To', exact: true })
    await start.fill('2026-11-14')
    await end.fill('2026-11-18')
    await end.press('Enter')
    await expect(table.getByRole('row')).toHaveCount(3)
    await expect(table.getByText('Northstar Studio')).toBeVisible()
    await expect(table.getByText('Canopy Digital')).toBeVisible()

    const search = page.getByRole('searchbox', { name: 'Search invoices' })
    await search.fill('Canopy')
    await expect(table.getByRole('row')).toHaveCount(2)
    await expect(table.getByText('Canopy Digital')).toBeVisible()
    await search.fill('missing')
    await expect(table.getByText('No matching invoices')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).press('Enter')
    await expect(search).toHaveValue('')
    await expect(search).toBeFocused()
    await expect(table.getByRole('row')).toHaveCount(5)
  })

  test('keeps selections across pages and exports the filtered invoice list', async ({
    page,
    docsUrl,
  }) => {
    const table = await openBilling(page, docsUrl)
    const first = table.getByRole('checkbox', { name: 'Select row INV-1048' })
    await first.focus()
    await page.keyboard.press('Space')
    await expect(first).toBeFocused()
    await expect(first).toBeChecked()
    const pages = page.getByRole('navigation', { name: 'Invoice pages' })
    const next = pages.getByRole('button', { name: 'Page 2' })
    await next.focus()
    await page.keyboard.press('Enter')
    await expect(next).toBeFocused()
    await expect(next).toHaveAttribute('aria-current', 'page')
    const second = table.getByRole('checkbox', { name: 'Select row INV-1044' })
    await second.press('Space')
    await expect(second).toBeChecked()
    await expect(page.getByText('2 selected', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Mark paid' }).press('Enter')
    await expect(
      table
        .getByRole('row', { name: /INV-1044/ })
        .getByText('Paid', { exact: true }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Notifications' })
        .getByText('Invoice marked paid', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Clear selection' }).press('Enter')
    await expect(
      table.getByRole('checkbox', { name: 'Select all rows' }),
    ).toBeFocused()

    await page
      .getByRole('searchbox', { name: 'Search invoices' })
      .fill('Harbor')
    await expect(table.getByText('Harbor & Co.')).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export CSV' }).press('Enter')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('invoices.csv')
    const stream = await download.createReadStream()
    let csv = ''
    for await (const chunk of stream) {
      csv += String(chunk)
    }
    expect(csv).toContain(
      '"INV-1044","Harbor & Co.","2026-11-12","Paid","980.00"',
    )
    expect(csv).not.toContain('INV-1048')
  })

  test('restores focus from the inspector and the nested refund dialog @cross-browser', async ({
    page,
    docsUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const table = await openBilling(page, docsUrl)
    await expectNoAxeViolations(page, { include: '.billing-gallery' })
    const invoice = table.getByRole('button', { name: 'INV-1048', exact: true })
    const drawer = page.getByRole('dialog', { name: 'Invoice INV-1048' })
    await invoice.press('Enter')
    await expect(drawer).toBeVisible()
    await expect(
      drawer.getByRole('button', { name: 'Close', exact: true }),
    ).toBeFocused()
    await expectNoAxeViolations(page, { include: '.billing-inspector' })
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(invoice).toBeFocused()

    const actions = table.getByRole('button', { name: 'Actions for INV-1048' })
    await actions.press('Enter')
    const inspect = page.getByRole('menuitem', { name: 'Inspect invoice' })
    await expect(inspect).toBeFocused()
    await expectNoAxeViolations(page, {
      include: ['.billing-gallery', '[role="menu"]'],
    })
    await inspect.press('Enter')
    await expect(drawer).toBeVisible()

    const refund = drawer.getByRole('button', { name: 'Issue refund' })
    const dialog = page.getByRole('dialog', { name: 'Refund INV-1048?' })
    await refund.press('Enter')
    await expect(dialog).toBeVisible()
    const reason = dialog.getByRole('textbox', { name: 'Refund reason' })
    await expect(reason).toBeFocused()
    await expectNoAxeViolations(page, { include: '.billing-refund' })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(refund).toBeFocused()

    await refund.press('Enter')
    await reason.fill('Duplicate payment')
    await dialog.getByRole('button', { name: 'Confirm refund' }).press('Enter')
    await expect(dialog).toBeHidden()
    await expect(drawer.getByText('Refunded', { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(actions).toBeFocused()
    await expect(
      table.getByRole('row', { name: /INV-1048/ }).getByText('Refunded'),
    ).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Notifications' })
        .getByText('Refund recorded', { exact: true }),
    ).toBeVisible()
  })

  test('returns focus to search when a refund removes the drawer opener', async ({
    page,
    docsUrl,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const table = await openBilling(page, docsUrl)
    await page
      .getByRole('group', { name: 'Invoice status' })
      .getByRole('button', { name: 'Paid', exact: true })
      .press('Enter')
    const opener = table.getByRole('button', { name: 'INV-1048', exact: true })
    await opener.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Invoice INV-1048' })
    await drawer.getByRole('button', { name: 'Issue refund' }).press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Refund INV-1048?' })
    await dialog
      .getByRole('textbox', { name: 'Refund reason' })
      .fill('Duplicate payment')
    await dialog.getByRole('button', { name: 'Confirm refund' }).press('Enter')
    await expect(dialog).toBeHidden()
    await expect(drawer.getByText('Refunded', { exact: true })).toBeVisible()
    await expect(opener).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(
      page.getByRole('searchbox', { name: 'Search invoices' }),
    ).toBeFocused()
  })

  test('navigates from docs and switches themes and source files', async ({
    page,
    docsUrl,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(`${docsUrl}/getting-started`)
    await page
      .getByRole('navigation', { name: 'Main Navigation' })
      .getByRole('link', { name: 'Examples', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Billing & Invoices' }),
    ).toBeVisible()
    const html = page.locator('html')
    const themes = page.getByRole('radiogroup', { name: 'Documentation theme' })
    for (const name of ['Calm', 'Vibrant', 'Mono', 'Default']) {
      await themes.getByRole('radio', { name, exact: true }).press('Space')
      await expect(html).toHaveAttribute('data-ghost-theme', name.toLowerCase())
    }
    const appearance = page.getByRole('switch', {
      name: /Switch to (light|dark) theme/i,
    })
    const initial = await html.getAttribute('data-ghost-mode')
    await appearance.press('Space')
    await expect(html).toHaveAttribute(
      'data-ghost-mode',
      initial === 'dark' ? 'light' : 'dark',
    )

    await page
      .locator('summary')
      .filter({ hasText: 'View source' })
      .press('Enter')
    const source = page.locator('.billing-gallery__source')
    const workspace = source.getByRole('radio', {
      name: 'BillingWorkspace.vue',
      exact: true,
    })
    await workspace.focus()
    await page.keyboard.press('ArrowRight')
    const inspector = source.getByRole('radio', {
      name: 'InvoiceInspector.vue',
      exact: true,
    })
    await expect(inspector).toBeFocused()
    await expect(inspector).toBeChecked()
    await source
      .getByRole('button', { name: 'Copy vue code', exact: true })
      .press('Enter')
    await expect(source.getByRole('status')).toHaveText('Copied')
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('GhostDrawerContent')
  })

  test('contains horizontal scrolling in a narrow forced-colors viewport', async ({
    page,
    docsUrl,
  }) => {
    await page.setViewportSize({ width: 320, height: 820 })
    await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' })
    const table = await openBilling(page, docsUrl)
    const region = page.getByRole('region', {
      name: 'Invoices table scroll region',
    })
    await region.focus()
    await expect(region).toBeFocused()
    await expect(table.getByText('Past due').first()).toBeVisible()
    await page
      .locator('summary')
      .filter({ hasText: 'View source' })
      .press('Enter')
    await expect(
      page
        .locator('.billing-gallery__source')
        .getByRole('button', { name: 'Copy vue code', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320)
    await expectNoAxeViolations(page, { include: '.billing-gallery' })
  })

  for (const mode of ['light', 'dark'] as const) {
    test(`renders the ${mode} showcase @visual`, async ({ page, docsUrl }) => {
      await page.setViewportSize(
        mode === 'light'
          ? { width: 1280, height: 1200 }
          : { width: 390, height: 1440 },
      )
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' })
      await openBilling(page, docsUrl)
      await expect(page.locator('html')).toHaveAttribute(
        'data-ghost-mode',
        mode,
      )
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await expect(page.locator('.billing-gallery')).toHaveScreenshot(
        `billing-ops-${mode}.png`,
      )
    })
  }
})
