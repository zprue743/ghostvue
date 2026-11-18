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

  test('themed example aligns indicator and flips roving focus in RTL', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(
        `${playground.url}/examples.html?id=segmented-control/themed`,
      )

      const control = page.locator('.ghost-segmented-control')
      await control.evaluate((el) => {
        el.setAttribute('dir', 'rtl')
      })

      const day = page.getByRole('button', { name: 'Day' })
      const week = page.getByRole('button', { name: 'Week' })
      const indicator = control.locator('[data-part="indicator"]')

      await day.click()
      await expect(day).toHaveAttribute('aria-pressed', 'true')
      await day.focus()

      // In RTL, ArrowLeft moves to the next segment (Week).
      await page.keyboard.press('ArrowLeft')
      await expect(week).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(day).toBeFocused()

      // Indicator must align with the first segment on the inline-start (right) side in RTL.
      const dayBox = await day.boundingBox()
      const indicatorBox = await indicator.boundingBox()
      expect(dayBox).not.toBeNull()
      expect(indicatorBox).not.toBeNull()
      expect(Math.abs((indicatorBox?.x ?? 0) - (dayBox?.x ?? 0))).toBeLessThan(
        6,
      )
    } finally {
      await playground.close()
    }
  })
})
