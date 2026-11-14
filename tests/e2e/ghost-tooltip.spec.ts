import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostTooltip', () => {
  test('shows on hover/focus after delay, hides with grace, and dismisses on Escape', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('tooltip-delay-trigger')
      const content = page.getByTestId('tooltip-delay-content')
      const escapeTarget = page.getByTestId('tooltip-escape-target')

      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.hover()
      await expect(content).toHaveCount(0)

      await expect(content).toBeVisible({ timeout: 1000 })
      await expect(content).toHaveAttribute('role', 'tooltip')
      await expect(trigger).toHaveAttribute('aria-describedby', /.*/)
      await expect(trigger).toHaveAttribute('data-state', 'open')

      await page.mouse.move(0, 0)
      await expect(content).toHaveCount(0, { timeout: 1000 })

      await trigger.focus()
      await expect(content).toBeVisible({ timeout: 1000 })

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      await escapeTarget.focus()
      await expect(escapeTarget).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('keeps the tooltip open when the pointer moves onto hoverable content', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('tooltip-delay-trigger')
      const content = page.getByTestId('tooltip-delay-content')

      await trigger.hover()
      await expect(content).toBeVisible({ timeout: 1000 })

      const box = await content.boundingBox()
      if (!box) {
        throw new Error('Expected tooltip content bounding box')
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(content).toBeVisible({ timeout: 1000 })

      await page.mouse.move(0, 0)
      await expect(content).toHaveCount(0, { timeout: 1000 })
    } finally {
      await playground.close()
    }
  })

  test('leaves disabled triggers without tooltip content', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('tooltip-instant-trigger')
      const content = page.getByTestId('tooltip-instant-content')

      await trigger.hover()
      await expect(content).toHaveCount(0, { timeout: 300 })

      await trigger.focus()
      await expect(content).toHaveCount(0, { timeout: 300 })
    } finally {
      await playground.close()
    }
  })

  test('renders inline when portal is disabled', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const parent = page.getByTestId('tooltip-inline-parent')
      const trigger = page.getByTestId('tooltip-inline-trigger')
      const content = page.getByTestId('tooltip-inline-content')

      await trigger.hover()
      await expect(content).toBeVisible({ timeout: 500 })
      await expect(parent.locator('[role="tooltip"]')).toHaveCount(1)
    } finally {
      await playground.close()
    }
  })
})
