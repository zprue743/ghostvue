import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const tag = '@component:GhostSegmentedControl'

test.describe('GhostSegmentedControl', { tag }, () => {
  test('basic example switches views with pointer and keyboard', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/basic`,
      )

      const group = page.getByRole('group', { name: 'Content view' })
      await expect(group).toBeVisible()

      const grid = page.getByRole('button', { name: 'Grid' })
      const list = page.getByRole('button', { name: 'List' })

      await expect(list).toHaveAttribute('aria-pressed', 'true')
      await grid.click()
      await expect(grid).toHaveAttribute('aria-pressed', 'true')
      await expect(list).toHaveAttribute('aria-pressed', 'false')

      await grid.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(list).toBeFocused()

      await list.click()
      await expect(list).toHaveAttribute('aria-pressed', 'true')

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('themed example keeps indicator visible when selection changes', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const indicator = page.locator(
        '.ghost-segmented-control [data-part="indicator"]',
      )
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      await page.getByRole('button', { name: 'Day' }).click()
      await expect(indicator).toHaveAttribute('data-indicator-visible', 'true')

      const index = await indicator.evaluate((element) =>
        getComputedStyle(element).getPropertyValue(
          '--ghost-segmented-selected-index',
        ),
      )
      expect(index.trim()).toBe('0')
    } finally {
      await playground.close()
    }
  })
})
