import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostPagination', () => {
  test('navigates pages with buttons and passes axe', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=pagination/basic`)

      const nav = page.getByRole('navigation', { name: 'Result pages' })
      await expect(nav).toBeVisible()
      await expect(
        nav.getByRole('button', { name: 'Page 2, current page' }),
      ).toBeVisible()

      await nav.getByRole('button', { name: 'Next page' }).click()
      await expect(
        nav.getByRole('button', { name: 'Page 3, current page' }),
      ).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
