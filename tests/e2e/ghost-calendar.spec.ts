import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostCalendar'

test.describe('GhostCalendar', { tag }, () => {
  test('basic example selects dates with keyboard and pointer', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=calendar/basic`)
      const grid = page.getByRole('grid')
      await expect(grid).toBeVisible()

      const day15 = page.locator('[data-ghost-calendar-date="2024-06-15"]')
      await day15.click()
      await expect(day15).toHaveAttribute('aria-selected', 'true')

      await day15.focus()
      await page.keyboard.press('ArrowRight')
      const day16 = page.locator('[data-ghost-calendar-date="2024-06-16"]')
      await expect(day16).toHaveAttribute('tabindex', '0')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
