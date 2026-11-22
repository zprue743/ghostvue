import { expect, test } from '@playwright/test'

test.describe('approval fixture (Ghost)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ghost')
  })

  test('manual approval script steps', async ({ page }) => {
    const amountSort = page.getByTestId('sort-amount')
    await amountSort.focus()
    await page.keyboard.press('Space')
    await expect(amountSort).toBeFocused()

    const inv2Checkbox = page.getByTestId('select-inv-2')
    await inv2Checkbox.focus()
    await page.keyboard.press('Space')
    await expect(inv2Checkbox).not.toBeChecked()

    await page.keyboard.press('Space')
    await expect(inv2Checkbox).toBeChecked()

    const expand = page.getByTestId('expand-inv-2')
    await expand.focus()
    await page.keyboard.press('Space')
    await expect(page.getByText('Details for inv-2')).toHaveCount(0)

    await page.keyboard.press('Space')
    await expect(page.getByText('Details for inv-2')).toBeVisible()

    await page.getByTestId('global-filter').fill('zzzz-no-match-zzzz')
    await expect(page.getByRole('heading', { name: 'No invoices' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Amount/i })).toBeVisible()
  })
})

test.describe('approval fixture (Prime)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prime')
  })

  test('parallel keyboard path', async ({ page }) => {
    const amountHeader = page.getByRole('columnheader', { name: 'Amount' })
    await amountHeader.click()

    const inv2Row = page.getByRole('row', { name: /Globex/ })
    const checkbox = inv2Row.getByRole('checkbox').first()
    await checkbox.focus()
    await page.keyboard.press('Space')
    await expect(checkbox).not.toBeChecked()

    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
  })
})