import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSelect', () => {
  test('opens, selects, and passes axe on the playground demo', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('select-demo-trigger')
      const content = page.getByTestId('select-demo-content')
      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-testid="select-demo-section"]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click()
      await expect(content).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await page.getByRole('option', { name: '50 rows' }).click()
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(trigger).toContainText('50 rows')

      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
