import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostHoverCard', () => {
  test('shows on hover/focus after delay, hides with grace, and dismisses on Escape', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('hover-card-delay-trigger')
      const content = page.getByTestId('hover-card-delay-content')
      const escapeTarget = page.getByTestId('hover-card-escape-target')

      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.hover()
      await expect(content).toHaveCount(0)

      await expect(content).toBeVisible({ timeout: 1000 })
      await expect(content).toHaveAttribute('role', 'dialog')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
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

  test('keeps the card open when the pointer moves onto interactive content', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('hover-card-delay-trigger')
      const content = page.getByTestId('hover-card-delay-content')
      const link = page.getByTestId('hover-card-delay-link')

      await trigger.hover()
      await expect(content).toBeVisible({ timeout: 1000 })

      const box = await content.boundingBox()
      if (!box) {
        throw new Error('Expected hover card content bounding box')
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(content).toBeVisible({ timeout: 1000 })
      await expect(link).toBeVisible()

      await page.mouse.move(0, 0)
      await expect(content).toHaveCount(0, { timeout: 1000 })
    } finally {
      await playground.close()
    }
  })

  test('leaves disabled triggers without card content', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('hover-card-disabled-trigger')
      const content = page.getByTestId('hover-card-disabled-content')

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

      const parent = page.getByTestId('hover-card-inline-parent')
      const trigger = page.getByTestId('hover-card-inline-trigger')
      const content = page.getByTestId('hover-card-inline-content')

      await trigger.hover()
      await expect(content).toBeVisible({ timeout: 1000 })
      await expect(parent.locator('[role="dialog"]')).toHaveCount(1)
    } finally {
      await playground.close()
    }
  })

  test('transfers focus between trigger and interactive content and closes after tabbing outside', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('hover-card-delay-trigger')
      const content = page.getByTestId('hover-card-delay-content')
      const link = page.getByTestId('hover-card-delay-link')
      const escapeTarget = page.getByTestId('hover-card-escape-target')

      await trigger.scrollIntoViewIfNeeded()
      await trigger.focus()
      await expect(content).toBeVisible({ timeout: 1000 })

      // Move focus from trigger into interactive content child
      await link.focus()
      await expect(link).toBeFocused()
      await page.waitForTimeout(200)
      await expect(content).toBeVisible()

      // Tab outside of content; card must close rather than staying open on stale triggerFocus
      await page.keyboard.press('Tab')
      await expect(content).toHaveCount(0, { timeout: 1000 })

      // Reverse transfer: trigger -> content -> trigger -> outside
      await trigger.focus()
      await expect(content).toBeVisible({ timeout: 1000 })
      await link.focus()
      await expect(link).toBeFocused()
      await trigger.focus()
      await expect(trigger).toBeFocused()
      await page.waitForTimeout(200)
      await expect(content).toBeVisible()

      await escapeTarget.focus()
      await expect(escapeTarget).toBeFocused()
      await expect(content).toHaveCount(0, { timeout: 1000 })
    } finally {
      await playground.close()
    }
  })
})
