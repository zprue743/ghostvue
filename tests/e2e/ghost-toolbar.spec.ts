import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostToolbar', () => {
  test('moves roving focus with arrows and passes axe in the playground', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostToolbar',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const toolbar = page.getByTestId('toolbar-horizontal')
      await expect(toolbar).toHaveAttribute('role', 'toolbar')
      await expect(toolbar).toHaveAttribute('data-orientation', 'horizontal')

      const edit = toolbar.getByRole('button', { name: 'Edit row' })
      await edit.focus()
      await page.keyboard.press('ArrowRight')
      await expect(
        toolbar.getByRole('button', { name: 'Duplicate row' }),
      ).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(
        toolbar.getByRole('button', { name: 'Archive row' }),
      ).toBeFocused()

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="toolbar-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('composable example roves with arrow keys', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=toolbar/composable`)
      const toolbar = page.getByTestId('toolbar-composable')
      await expect(toolbar).toHaveAttribute('role', 'toolbar')

      await toolbar.getByRole('button', { name: 'All' }).focus()
      await page.keyboard.press('ArrowRight')
      await expect(toolbar.getByRole('button', { name: 'Open' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(
        toolbar.getByRole('button', { name: 'Closed' }),
      ).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('basic example renders and passes axe', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=toolbar/basic`)
      const toolbar = page.locator('[data-ghost-toolbar]')
      await expect(toolbar).toHaveAttribute('role', 'toolbar')
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
