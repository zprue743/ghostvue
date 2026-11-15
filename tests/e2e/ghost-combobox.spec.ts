import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostCombobox', () => {
  test('opens, selects with keyboard, and passes axe on the playground demo', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const input = page.getByTestId('combobox-demo-input')
      const content = page.getByTestId('combobox-demo-content')
      await input.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-testid="combobox-demo-section"]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await input.click()
      await expect(content).toBeVisible()
      await expect(input).toHaveAttribute('aria-expanded', 'true')

      await page.getByRole('option', { name: '50 rows' }).click()
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(input).toHaveValue('50 rows')

      await input.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(input).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
