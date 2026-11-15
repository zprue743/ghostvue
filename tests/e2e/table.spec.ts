import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostTable', () => {
  test('exposes native table semantics and passes axe', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostTable',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const table = page.getByTestId('table-invoices')
      await expect(table).toHaveRole('table')
      await expect(table.locator('caption')).toHaveText('Open invoices')
      await expect(table.locator('thead th').first()).toHaveAttribute(
        'scope',
        'col',
      )

      const rowHeader = page.getByTestId('table-metrics')
      await expect(rowHeader.locator('tbody th').first()).toHaveAttribute(
        'scope',
        'row',
      )

      const scrollRegion = page.locator('[data-part="scroll-container"]')
      await expect(scrollRegion).toBeVisible()
      await expect(scrollRegion).toHaveAttribute('role', 'region')
      const containedCaption = page
        .getByTestId('table-contained')
        .locator('caption')
      const captionId = await containedCaption.getAttribute('id')
      expect(captionId).not.toBeNull()
      if (!captionId) {
        throw new Error('Expected table-contained caption to have an id')
      }
      await expect(scrollRegion).toHaveAttribute('aria-labelledby', captionId)
      await expect(page.getByTestId('table-contained')).toHaveAttribute(
        'data-part',
        'root',
      )

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="table-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
