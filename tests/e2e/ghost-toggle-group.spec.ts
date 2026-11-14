import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostToggleGroup'

test.describe('GhostToggleGroup', { tag }, () => {
  test('basic example toggles with pointer and keyboard', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=toggle-group/basic`)

      const group = page.getByRole('group', { name: 'Row density' })
      await expect(group).toBeVisible()

      const comfortable = page.getByRole('button', { name: 'Comfortable' })
      const compact = page.getByRole('button', { name: 'Compact' })

      await expect(comfortable).toHaveAttribute('aria-pressed', 'true')
      await compact.click()
      await expect(compact).toHaveAttribute('aria-pressed', 'true')
      await expect(comfortable).toHaveAttribute('aria-pressed', 'false')

      await compact.focus()
      await page.keyboard.press('ArrowRight')
      await expect(comfortable).toBeFocused()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('multiple example keeps independent toggles', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=toggle-group/multiple`,
      )

      const bold = page.getByRole('button', { name: 'Bold' })
      const italic = page.getByRole('button', { name: 'Italic' })

      await expect(bold).toHaveAttribute('aria-pressed', 'true')
      await italic.click()
      await expect(italic).toHaveAttribute('aria-pressed', 'true')
      await bold.click()
      await expect(bold).toHaveAttribute('aria-pressed', 'false')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
