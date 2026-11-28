import type { Page } from '@playwright/test'

import { expectNoAxeViolations } from '../support/axe'
import { expect, playgroundTest as test } from '../support/playground'

async function openInvoices(page: Page, playgroundUrl: string) {
  await page.goto(
    `${playgroundUrl}/examples.html?id=data-table/themed-invoices`,
  )
  const table = page.getByRole('table', { name: 'Invoices' })
  await expect(table).toBeVisible()
  return table
}

test.describe('Themed GhostDataTablePreset @component:GhostDataTablePreset', () => {
  test('opens on page 1 with the selected overdue invoices visible', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    const bodyRows = table.locator('tbody > tr:not([data-detail-row])')
    await expect(bodyRows).toHaveCount(4)
    await expect(
      page
        .getByRole('navigation', { name: 'Invoice pages' })
        .getByRole('button', { name: 'Page 1' }),
    ).toHaveAttribute('aria-current', 'page')
    // Every checked row on page 1 is an overdue invoice, and the bar agrees.
    const selected = table.locator('tbody > tr[data-selected="true"]')
    await expect(selected).toHaveCount(2)
    await expect(selected.nth(0)).toContainText('INV-1047')
    await expect(selected.nth(0)).toContainText('Overdue')
    await expect(selected.nth(0)).toContainText('$3,725.00')
    await expect(selected.nth(1)).toContainText('INV-1045')
    await expect(selected.nth(1)).toContainText('$980.50')
    for (const id of ['INV-1047', 'INV-1045']) {
      await expect(
        table.getByRole('checkbox', { name: `Select row ${id}` }),
      ).toBeChecked()
    }
    await expect(page.getByText('2 selected')).toBeVisible()
    await expect(
      table.getByRole('button', { name: 'Show details for INV-1047' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('status')).toHaveText('8 invoices')
  })

  test('navigates and operates the themed preset with native table focus @cross-browser', async ({
    page,
    playgroundUrl,
  }) => {
    await page.clock.install()
    const table = await openInvoices(page, playgroundUrl)
    const scope = { include: '.ghost-data-table[data-themed]' }
    const search = page.getByRole('searchbox', { name: 'Search invoices' })
    const markPaid = page.getByRole('button', { name: 'Mark paid' })
    const clear = page.getByRole('button', { name: 'Clear selection' })
    const selectAll = table.getByRole('checkbox', { name: 'Select all rows' })
    const invoice = table.getByRole('button', { name: 'Invoice' })
    const customer = table.getByRole('button', { name: 'Customer' })
    const amount = table.getByRole('button', { name: 'Amount' })
    const amountHeader = table.getByRole('columnheader', { name: 'Amount' })
    const firstAmount = table.locator(
      'tbody > tr:not([data-detail-row]) > td:last-child',
    )
    await expectNoAxeViolations(page, scope)

    await search.focus()
    for (const target of [
      markPaid,
      clear,
      page.getByRole('region', { name: 'Invoice table' }),
      selectAll,
      invoice,
      customer,
    ]) {
      await page.keyboard.press('Tab')
      await expect(target).toBeFocused()
    }
    await page.keyboard.press('Shift+Tab')
    await expect(invoice).toBeFocused()

    // A keyboard sort reorders the visible rows by the numeric amount.
    await amount.focus()
    await expect(firstAmount.first()).toHaveText('$2,480.00')
    const unsorted = await amount.evaluate(
      (node) => getComputedStyle(node, '::after').clipPath,
    )
    for (const [key, sort, first] of [
      ['Enter', 'ascending', '$645.75'],
      ['Space', 'descending', '$4,200.00'],
      ['Enter', null, '$2,480.00'],
    ] as const) {
      await page.keyboard.press(key)
      await expect(amount).toBeFocused()
      await expect(firstAmount.first()).toHaveText(first)
      if (sort) {
        await expect(amountHeader).toHaveAttribute('aria-sort', sort)
        expect(
          await amount.evaluate(
            (node) => getComputedStyle(node, '::after').clipPath,
          ),
        ).not.toBe(unsorted)
      } else {
        await expect(amountHeader).not.toHaveAttribute('aria-sort', /./)
      }
    }

    // Mark paid holds the table busy until the stand-in save resolves. Axe
    // needs timers, so it runs before the clock pauses.
    await page.clock.pauseAt(Date.now() + 60_000)
    await markPaid.focus()
    await page.keyboard.press('Enter')
    await expect(table).toHaveAttribute('aria-busy', 'true')
    await expect(markPaid).toBeFocused()
    await page.clock.runFor(600)
    await page.clock.resume()
    await expect(table).not.toHaveAttribute('aria-busy', /./)
    await expect(markPaid).toHaveCount(0)
    await expect(selectAll).toBeFocused()
    await expect(page.getByRole('status')).toHaveText(
      '8 invoices · 2 invoices marked paid',
    )
    await expect(
      table.locator('tbody > tr', { hasText: 'INV-1047' }).first(),
    ).toContainText('Paid')

    const row = table.getByRole('checkbox', { name: 'Select row INV-1048' })
    await row.focus()
    await page.keyboard.press('Space')
    await expect(row).toBeChecked()
    await expect(row).toBeFocused()
    await clear.focus()
    await page.keyboard.press('Enter')
    await expect(clear).toHaveCount(0)
    await expect(selectAll).toBeFocused()

    const expand = table.getByRole('button', {
      name: 'Show details for INV-1047',
    })
    await table.getByRole('button', { name: 'Hide details' }).focus()
    await page.keyboard.press('Enter')
    await expect(expand).toBeFocused()
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(expand).toBeFocused()

    const next = page
      .getByRole('navigation', { name: 'Invoice pages' })
      .getByRole('button', { name: 'Page 2' })
    await next.focus()
    await page.keyboard.press('Enter')
    await expect(next).toBeFocused()
    await expect(next).toHaveAttribute('aria-current', 'page')
  })

  test('recovers from a search with no results', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    const search = page.getByRole('searchbox', { name: 'Search invoices' })
    await search.fill('harbor')
    await expect(table.locator('tbody > tr[data-selected]')).toHaveCount(1)
    await expect(page.getByRole('status')).toHaveText('1 invoice')

    await search.fill('missing invoice')
    await expect(
      table.getByRole('heading', { name: 'No matching invoices', level: 2 }),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('0 invoices')
    await expect(
      table.getByRole('columnheader', { name: 'Amount' }),
    ).toBeVisible()
    await expectNoAxeViolations(page, {
      include: '.ghost-data-table[data-themed]',
    })

    const recover = page.getByRole('button', { name: 'Clear search' })
    await recover.focus()
    await page.keyboard.press('Enter')
    await expect(search).toHaveValue('')
    await expect(search).toBeFocused()
    await expect(table.getByText('No matching invoices')).toHaveCount(0)
    await expect(
      table.locator('tbody > tr:not([data-detail-row])'),
    ).toHaveCount(4)
    await expect(page.getByRole('status')).toHaveText('8 invoices')
  })

  test('keeps the wide table inside its named scroll region at phone width', async ({
    page,
    playgroundUrl,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const table = await openInvoices(page, playgroundUrl)
    const region = page.getByRole('region', { name: 'Invoice table' })
    await expect(region).toBeVisible()
    const metrics = await region.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }))
    expect(metrics.scroll).toBeGreaterThan(metrics.client)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(375)

    // Keyboard users can focus the region and scroll it to the Amount column.
    await region.focus()
    await expect(region).toBeFocused()
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('ArrowRight')
    }
    await expect
      .poll(() => region.evaluate((node) => node.scrollLeft))
      .toBeGreaterThan(0)
    await expect(
      table.locator('tbody > tr[data-selected="true"] > td:last-child').first(),
    ).toBeInViewport()
  })

  test('keeps busy rows opaque and readable across themes and modes', async ({
    page,
    playgroundUrl,
  }) => {
    // Freeze the stand-in save so the table stays busy for the whole check.
    await page.clock.install()
    const table = await openInvoices(page, playgroundUrl)
    await page.clock.pauseAt(Date.now() + 60_000)
    const tbody = table.locator('tbody')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Mark paid' }).press('Enter')
    await expect(table).toHaveAttribute('aria-busy', 'true')
    const target = table.getByRole('checkbox', { name: 'Select row INV-1047' })
    await target.focus()
    for (const theme of ['default', 'calm', 'vibrant', 'mono']) {
      for (const mode of ['light', 'dark']) {
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset['ghostTheme'] = theme
            document.documentElement.dataset['ghostMode'] = mode
          },
          { theme, mode },
        )
        await expect(tbody).toHaveCSS('opacity', '1')
        await expect(target).toBeFocused()
        const contrast = await tbody.evaluate((body) => {
          const ctx = document
            .createElement('canvas')
            .getContext('2d', { willReadFrequently: true })
          if (!ctx) throw new Error('Missing 2D context')
          const luminance = ([r = 0, g = 0, b = 0]: Iterable<number>) =>
            [r, g, b]
              .map((channel) => channel / 255)
              .map((value) =>
                value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4,
              )
              .reduce(
                (sum, value, index) =>
                  sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0),
                0,
              )
          function ratio(node: Element, foreground: string) {
            if (!ctx) throw new Error('Missing 2D context')
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, 1, 1)
            const path = []
            for (
              let ancestor: Element | null = node;
              ancestor;
              ancestor = ancestor.parentElement
            )
              path.unshift(ancestor)
            for (const ancestor of path) {
              ctx.fillStyle = getComputedStyle(ancestor).backgroundColor
              ctx.fillRect(0, 0, 1, 1)
            }
            const bg = luminance(ctx.getImageData(0, 0, 1, 1).data)
            ctx.fillStyle = foreground
            ctx.fillRect(0, 0, 1, 1)
            const fg = luminance(ctx.getImageData(0, 0, 1, 1).data)
            return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)
          }
          const texts = Array.from(
            body.querySelectorAll(
              'tr[data-selected="true"] > td:nth-child(3), tr:not([data-selected], [data-detail-row]) > td:nth-child(3), [data-part="expand-button"]',
            ),
          )
          const focused = body.ownerDocument.activeElement
          if (!focused || !body.contains(focused))
            throw new Error('Expected a focused table control')
          return {
            text: Math.min(
              ...texts.map((cell) => ratio(cell, getComputedStyle(cell).color)),
            ),
            focus: ratio(
              focused.parentElement ?? focused,
              getComputedStyle(focused, '::before').outlineColor,
            ),
          }
        })
        expect(
          contrast.text,
          `${theme} ${mode} busy text`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast.focus,
          `${theme} ${mode} focus outline`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })

  test('maps forced-color selection to system colors and contains the table in RTL', async ({
    page,
    playgroundUrl,
  }) => {
    await page.setViewportSize({ width: 380, height: 800 })
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
    const table = await openInvoices(page, playgroundUrl)
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl'
    })
    const selected = table.locator('tr[data-selected="true"] > td').nth(2)
    const expected = await page.evaluate(() => {
      const testCell = document.createElement('span')
      testCell.style.cssText =
        'forced-color-adjust:none;background-color:SelectedItem;color:SelectedItemText'
      document.body.append(testCell)
      const { backgroundColor, color } = getComputedStyle(testCell)
      testCell.remove()
      return { backgroundColor, color }
    })
    await expect(selected).toHaveCSS(
      'background-color',
      expected.backgroundColor,
    )
    await expect(selected).toHaveCSS('color', expected.color)
    const checkbox = table.getByRole('checkbox', {
      name: 'Select row INV-1047',
    })
    await table.getByRole('checkbox', { name: 'Select all rows' }).focus()
    await page.keyboard.press('Tab')
    await checkbox.focus()
    await expect(checkbox).toBeFocused()
    await expect(checkbox).not.toHaveCSS('outline-style', 'none')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(380)
  })

  test('keeps default sort artwork scoped to the theme', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    const amount = table.getByRole('button', { name: 'Amount' })
    const mark = () =>
      amount.evaluate((button) => getComputedStyle(button, '::after').content)
    expect(await mark()).toBe('""')
    await amount.evaluate((button) => {
      const custom = document.createElement('span')
      custom.dataset['part'] = 'sort-indicator'
      custom.setAttribute('aria-hidden', 'true')
      button.append(custom)
    })
    expect(await mark()).toBe('none')
    await page.goto(
      `${playgroundUrl}/examples.html?id=data-table/preset-invoices`,
    )
    const headless = page.getByRole('button', { name: 'Amount' })
    await expect(headless).toBeVisible()
    expect(
      await headless.evaluate(
        (button) => getComputedStyle(button, '::after').content,
      ),
    ).toBe('none')
  })

  test('styles a manually composed themed table and isolates a nested table', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    // Reuse the preset bindings in the direct-child structure of a themed GhostTable.
    await table.evaluate((node) => {
      const host = node.closest('.ghost-data-table[data-themed]')
      const region = node.closest('.ghost-table-scroll-container')
      const head = node.querySelector(':scope > thead')
      const cell = node.querySelector(':scope > tbody > tr > td')
      if (!host || !region || !head || !cell) {
        throw new Error('Expected the invoice table and its scroll region')
      }
      const wrapper = document.createElement('div')
      wrapper.className = 'ghost-themed-scope'
      host.append(wrapper)
      wrapper.append(region)

      const nested = node.cloneNode(false)
      if (!(nested instanceof HTMLTableElement)) {
        throw new Error('Expected a native table')
      }
      nested.setAttribute('aria-label', 'Nested table')
      nested.append(head.cloneNode(true))
      cell.append(nested)
    })

    const heading = table
      .getByRole('columnheader', { name: 'Amount', exact: true })
      .first()
    const button = heading.getByRole('button')
    await expect(heading).toHaveCSS('position', 'sticky')
    expect(
      await button.evaluate(
        (node) => getComputedStyle(node, '::after').content,
      ),
    ).toBe('""')

    const nested = page.getByRole('table', { name: 'Nested table' })
    await expect(
      nested.getByRole('columnheader', { name: 'Amount' }),
    ).toHaveCSS('position', 'static')
    expect(
      await nested
        .getByRole('button', { name: 'Amount' })
        .evaluate((node) => getComputedStyle(node, '::after').content),
    ).toBe('none')

    await table.evaluate((node) => {
      node.parentElement?.replaceWith(node)
    })
    await expect(heading).toHaveCSS('position', 'sticky')
    expect(
      await button.evaluate(
        (node) => getComputedStyle(node, '::after').content,
      ),
    ).toBe('""')
  })

  test('captures a themed card with selection and a detail row @visual', async ({
    page,
    playgroundUrl,
  }) => {
    await page.setViewportSize({ width: 900, height: 760 })
    await openInvoices(page, playgroundUrl)
    await expect(
      page.locator('.ghost-data-table[data-themed]'),
    ).toHaveScreenshot('data-table-themed-card.png')
  })
})
