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
  test('navigates and operates the themed preset with native table focus @cross-browser', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    const scope = { include: '.ghost-data-table[data-themed]' }
    const search = page.getByRole('searchbox', { name: 'Search invoices' })
    const refresh = page.getByRole('button', { name: 'Simulate refresh' })
    const clear = page.getByRole('button', { name: 'Clear selection' })
    const selectAll = table.getByRole('checkbox', { name: 'Select all rows' })
    const customer = table.getByRole('button', { name: 'Customer' })
    const amount = table.getByRole('button', { name: 'Amount' })
    const amountHeader = table.getByRole('columnheader', { name: 'Amount' })
    await expectNoAxeViolations(page, scope)

    await page.getByRole('button', { name: 'Clear search' }).focus()
    for (const target of [
      search,
      refresh,
      clear,
      page.getByRole('region', { name: 'Invoice table' }),
      selectAll,
      customer,
      amount,
    ]) {
      await page.keyboard.press('Tab')
      await expect(target).toBeFocused()
    }
    await page.keyboard.press('Shift+Tab')
    await expect(customer).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(amount).toBeFocused()
    const unsorted = await amount.evaluate(
      (node) => getComputedStyle(node, '::after').clipPath,
    )
    for (const [key, sort] of [
      ['Enter', 'ascending'],
      ['Space', 'descending'],
      ['Enter', null],
    ] as const) {
      await page.keyboard.press(key)
      await expect(amount).toBeFocused()
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

    await refresh.evaluate((button) => {
      if (button instanceof HTMLButtonElement) button.click()
    })
    await expect(table).toHaveAttribute('aria-busy', 'true')
    await expect(amount).toBeFocused()
    await page.keyboard.press('Space')
    await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
    await expect(amount).toBeFocused()
    await expectNoAxeViolations(page, scope)
    await amount.press('Space')
    await amount.press('Space')
    await expect(amountHeader).not.toHaveAttribute('aria-sort', /./)

    await clear.focus()
    await page.keyboard.press('Enter')
    await expect(clear).toHaveCount(0)
    await expect(selectAll).toBeFocused()
    const row = table.getByRole('checkbox', { name: 'Select row inv-2' })
    await row.focus()
    await page.keyboard.press('Enter')
    await expect(row).not.toBeChecked()
    await page.keyboard.press('Space')
    await expect(row).toBeChecked()
    await expect(row).toBeFocused()
    const expand = table.getByRole('button', { name: 'Show details for inv-2' })
    await table.getByRole('button', { name: 'Hide invoice details' }).focus()
    await page.keyboard.press('Enter')
    await expect(expand).toBeFocused()
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(expand).toHaveAttribute('aria-expanded', 'true')
    await expect(expand).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(expand).toHaveAttribute('aria-expanded', 'false')

    const next = page
      .getByRole('navigation', { name: 'Invoice pages' })
      .getByRole('button', { name: 'Page 2' })
    await next.focus()
    await page.keyboard.press('Enter')
    await expect(next).toBeFocused()
    await expect(next).toHaveAttribute('aria-current', 'page')
    await search.fill('missing invoice')
    await expect(table.getByText('No matching invoices')).toBeVisible()
    await expectNoAxeViolations(page, scope)
  })

  test('keeps busy rows opaque and readable across themes and modes', async ({
    page,
    playgroundUrl,
  }) => {
    const table = await openInvoices(page, playgroundUrl)
    const tbody = table.locator('tbody')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Simulate refresh' }).press('Enter')
    await expect(table).toHaveAttribute('aria-busy', 'true')
    const target = table.getByRole('checkbox', { name: 'Select row inv-2' })
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
    const checkbox = table.getByRole('checkbox', { name: 'Select row inv-2' })
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
