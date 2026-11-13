import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostPopover', () => {
  test('opens/closes by click and keyboard, restores focus on Escape, and closes on outside click', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('popover-basic-trigger')
      const content = page.getByTestId('popover-basic-content')
      const input = page.getByTestId('popover-basic-input')
      const outsideTarget = page.getByTestId('popover-outside-target')

      await trigger.scrollIntoViewIfNeeded()

      // Axe clean before opening.
      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      // Click opens, moves focus into first focusable descendant, and sets ARIA/data hooks.
      await trigger.click()
      await expect(content).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(content).toHaveAttribute('role', 'dialog')
      await expect(content).toHaveAttribute('data-state', 'open')
      await expect(input).toBeFocused()

      // Axe clean while open.
      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      // Clicking trigger toggles closed cleanly (no close-then-reopen).
      await trigger.click()
      await expect(content).toHaveCount(0)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')

      // Keyboard Space/Enter opens and Escape closes returning focus to trigger.
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(content).toBeVisible()
      await expect(input).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Space reopens, outside click closes cleanly.
      await page.keyboard.press('Space')
      await expect(content).toBeVisible()
      await outsideTarget.click()
      await expect(content).toHaveCount(0)
      await expect(outsideTarget).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('flips near the viewport bottom edge', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 800, height: 600 })
      await page.goto(playground.url)

      const trigger = page.getByTestId('popover-flip-trigger')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.evaluate((el) => {
        const rect = el.getBoundingClientRect()
        const targetTop = window.innerHeight - rect.height - 16
        window.scrollBy(0, rect.top - targetTop)
      })

      await trigger.click()
      const content = page.getByTestId('popover-flip-content')
      await expect(content).toBeVisible()
      await expect(content).toHaveAttribute('data-placement', 'top')

      const triggerBox = await trigger.boundingBox()
      const contentBox = await content.boundingBox()
      expect(triggerBox).not.toBeNull()
      expect(contentBox).not.toBeNull()
      if (triggerBox && contentBox) {
        expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(
          triggerBox.y,
        )
      }
    } finally {
      await playground.close()
    }
  })

  test('closes nested popovers one layer at a time and passes Axe on themed popover', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const outerTrigger = page.getByTestId('popover-nested-outer-trigger')
      const outerContent = page.getByTestId('popover-nested-outer-content')
      const innerTrigger = page.getByTestId('popover-nested-inner-trigger')
      const innerContent = page.getByTestId('popover-nested-inner-content')

      await outerTrigger.scrollIntoViewIfNeeded()
      await outerTrigger.click()
      await expect(outerContent).toBeVisible()

      await innerTrigger.click()
      await expect(innerContent).toBeVisible()

      // Escape dismisses inner first and restores focus to inner trigger while keeping outer open.
      await page.keyboard.press('Escape')
      await expect(innerContent).toHaveCount(0)
      await expect(outerContent).toBeVisible()
      await expect(innerTrigger).toBeFocused()

      // Reopen inner, click outer panel body -> closes inner only.
      await innerTrigger.click()
      await expect(innerContent).toBeVisible()
      await page.getByTestId('popover-nested-outer-body').click()
      await expect(innerContent).toHaveCount(0)
      await expect(outerContent).toBeVisible()

      // Escape dismisses outer and restores focus to outer trigger.
      await page.keyboard.press('Escape')
      await expect(outerContent).toHaveCount(0)
      await expect(outerTrigger).toBeFocused()

      // Verify themed popover opens, styles cleanly, and passes Axe.
      const themedTrigger = page.getByTestId('popover-themed-trigger')
      await themedTrigger.scrollIntoViewIfNeeded()
      await themedTrigger.click()
      const themedContent = page.getByTestId('popover-themed-content')
      await expect(themedContent).toBeVisible()
      const themedAxe = await new AxeBuilder({ page }).analyze()
      expect(themedAxe.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('lands at the expected offset from its anchor inside an offset position:relative parent', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('popover-offset-trigger')
      const content = page.getByTestId('popover-offset-content')

      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      await expect(content).toBeVisible()
      await expect(content).toHaveAttribute('data-placement', 'bottom')

      // Confirm content stayed inline inside the offset position:relative parent.
      const isDescendant = await content.evaluate(
        (el) => el.closest('[data-testid="popover-offset-parent"]') !== null,
      )
      expect(isDescendant).toBe(true)

      const triggerBox = await trigger.boundingBox()
      const contentBox = await content.boundingBox()
      expect(triggerBox).not.toBeNull()
      expect(contentBox).not.toBeNull()
      if (triggerBox && contentBox) {
        // Vertical gap must match :offset="10" directly below the anchor bottom.
        expect(
          Math.abs(contentBox.y - (triggerBox.y + triggerBox.height + 10)),
        ).toBeLessThan(2)
        // Horizontally centered over the anchor without double-counting parent offset.
        const anchorCenterX = triggerBox.x + triggerBox.width / 2
        const contentCenterX = contentBox.x + contentBox.width / 2
        expect(Math.abs(contentCenterX - anchorCenterX)).toBeLessThan(2)
      }
    } finally {
      await playground.close()
    }
  })
})
