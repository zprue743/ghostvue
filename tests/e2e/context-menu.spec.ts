import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator } from '@playwright/test'

import { startStaticServer } from './static-server'

const POSITION_TOLERANCE_PX = 12

async function openContextMenuOnTrigger(
  trigger: Locator,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await trigger.click({
    button: 'right',
    position: { x: offsetX, y: offsetY },
  })
}

async function dispatchContextMenuOnTrigger(
  trigger: Locator,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await trigger.evaluate(
    (element, coords) => {
      const rect = element.getBoundingClientRect()
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + coords.offsetX,
        clientY: rect.top + coords.offsetY,
      })
      element.dispatchEvent(event)
    },
    { offsetX, offsetY },
  )
}

test.describe('GhostContextMenu', () => {
  test('passes axe, opens with contextmenu semantics, arrow/typeahead navigation, escape, items, checkbox, and radio', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=context-menu/basic`)

      const trigger = page.getByTestId('context-basic-trigger')
      const content = page.getByTestId('context-basic-content')
      const editItem = page.getByTestId('context-basic-item-edit')
      const disabledItem = page.getByTestId('context-basic-item-disabled')
      const checkbox = page.getByTestId('context-checkbox-item')
      const radioName = page.getByTestId('context-radio-name')
      const radioDate = page.getByTestId('context-radio-date')
      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-testid="context-basic-trigger"]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      await expect(trigger).toHaveAttribute('data-state', 'open')
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      await expect(content).toHaveAttribute('role', 'menu')
      await expect(content).toHaveAttribute('data-state', 'open')
      await expect(editItem).toBeFocused()

      const openAxe = await new AxeBuilder({ page })
        .include('[data-testid="context-basic-content"]')
        .include('[data-testid="context-basic-trigger"]')
        .analyze()
      expect(openAxe.violations).toEqual([])

      await page.keyboard.press('ArrowDown')
      await expect(checkbox).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(radioName).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('s')
      await page.keyboard.press('h')
      await expect(checkbox).toBeFocused()

      // Extending 's' -> 'so' from Show hidden rows keeps Sort by name focused instead of cycling to Sort by date.
      await page.waitForTimeout(550)
      await checkbox.focus()
      await page.keyboard.press('s')
      await expect(radioName).toBeFocused()
      await page.keyboard.press('o')
      await expect(radioName).toBeFocused()
      await expect(editItem).toHaveAttribute('tabindex', '-1')
      await expect(disabledItem).toHaveAttribute('tabindex', '-1')
      await expect(checkbox).toHaveAttribute('tabindex', '-1')
      await expect(radioName).toHaveAttribute('tabindex', '0')
      await expect(radioDate).toHaveAttribute('tabindex', '-1')

      // Rapid repeated 's' after timeout cycles from Sort by name to Sort by date.
      await page.waitForTimeout(550)
      await page.keyboard.press('s')
      await expect(radioDate).toBeFocused()
      await page.keyboard.press('s')
      await expect(checkbox).toBeFocused()
      await expect(checkbox).toHaveAttribute('tabindex', '0')
      await expect(radioDate).toHaveAttribute('tabindex', '-1')

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      await expect(editItem).toBeFocused()

      await editItem.click()
      await expect(content).toHaveCount(0)

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      await checkbox.click()
      await expect(checkbox).toHaveAttribute('aria-checked', 'true')
      await expect(content).toBeVisible()

      await radioDate.click()
      await expect(content).toHaveCount(0)

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      await expect(radioDate).toHaveAttribute('aria-checked', 'true')
      await page.keyboard.press('Escape')

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      const triggerBounds = await trigger.boundingBox()
      expect(triggerBounds).not.toBeNull()
      if (triggerBounds) {
        await page.mouse.click(
          Math.max(4, triggerBounds.x - 12),
          Math.max(4, triggerBounds.y - 12),
        )
      }
      await expect(content).toHaveCount(0)

      await trigger.click({ button: 'right' })
      await expect(content).toBeVisible()
      await editItem.focus()
      await page.keyboard.press('ArrowDown')
      await expect(disabledItem).not.toBeFocused()
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(content).toHaveCount(0)
      await expect(trigger).toHaveAttribute('data-state', 'closed')
    } finally {
      await playground.close()
    }
  })

  test('default trigger is keyboard-focusable and opens at the pointer', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=context-menu/basic`)

      const trigger = page.getByTestId('context-basic-trigger')
      const content = page.getByTestId('context-basic-content')
      const editItem = page.getByTestId('context-basic-item-edit')

      await trigger.scrollIntoViewIfNeeded()
      await expect(trigger).toHaveAttribute('tabindex', '0')

      const triggerBox = await trigger.boundingBox()
      expect(triggerBox).not.toBeNull()
      if (!triggerBox) {
        return
      }
      const firstOffset = { x: 24, y: 28 }
      const secondOffset = { x: 120, y: 90 }

      await openContextMenuOnTrigger(trigger, firstOffset.x, firstOffset.y)
      await expect(content).toBeVisible()
      let contentBox = await content.boundingBox()
      const firstAnchor = {
        x: triggerBox.x + firstOffset.x,
        y: triggerBox.y + firstOffset.y,
      }
      expect(contentBox).not.toBeNull()
      if (!contentBox) {
        return
      }
      expect(Math.abs(contentBox.x - firstAnchor.x)).toBeLessThanOrEqual(
        POSITION_TOLERANCE_PX,
      )
      expect(Math.abs(contentBox.y - firstAnchor.y)).toBeLessThanOrEqual(
        POSITION_TOLERANCE_PX + 8,
      )

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)

      await openContextMenuOnTrigger(trigger, secondOffset.x, secondOffset.y)
      await expect(content).toBeVisible()
      contentBox = await content.boundingBox()
      const secondAnchor = {
        x: triggerBox.x + secondOffset.x,
        y: triggerBox.y + secondOffset.y,
      }
      expect(contentBox).not.toBeNull()
      if (!contentBox) {
        return
      }
      expect(Math.abs(contentBox.x - secondAnchor.x)).toBeLessThanOrEqual(
        POSITION_TOLERANCE_PX,
      )
      expect(Math.abs(contentBox.y - secondAnchor.y)).toBeLessThanOrEqual(
        POSITION_TOLERANCE_PX + 8,
      )

      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()

      await trigger.focus()
      await page.keyboard.press('Shift+F10')
      await expect(content).toBeVisible()
      await expect(editItem).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      await trigger.focus()
      await page.keyboard.press('ContextMenu')
      await expect(content).toBeVisible()
      await expect(editItem).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('repositions when right-clicked again while open', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=context-menu/basic`)

      const trigger = page.getByTestId('context-basic-trigger')
      const content = page.getByTestId('context-basic-content')

      await trigger.scrollIntoViewIfNeeded()
      const triggerBox = await trigger.boundingBox()
      expect(triggerBox).not.toBeNull()
      if (!triggerBox) {
        return
      }

      const firstOffset = { x: 20, y: 24 }
      const secondOffset = { x: 160, y: 100 }

      await openContextMenuOnTrigger(trigger, firstOffset.x, firstOffset.y)
      await expect(content).toBeVisible()
      const firstBox = await content.boundingBox()

      await dispatchContextMenuOnTrigger(
        trigger,
        secondOffset.x,
        secondOffset.y,
      )
      await expect(content).toBeVisible()
      await expect
        .poll(async () => {
          const box = await content.boundingBox()
          if (!box) {
            return false
          }
          const anchorX = triggerBox.x + secondOffset.x
          return Math.abs(box.x - anchorX) <= POSITION_TOLERANCE_PX
        })
        .toBe(true)
      const secondBox = await content.boundingBox()
      const secondAnchor = {
        x: triggerBox.x + secondOffset.x,
        y: triggerBox.y + secondOffset.y,
      }
      expect(firstBox).not.toBeNull()
      expect(secondBox).not.toBeNull()
      if (!firstBox || !secondBox) {
        return
      }
      expect(Math.abs(secondBox.x - secondAnchor.x)).toBeLessThanOrEqual(
        POSITION_TOLERANCE_PX,
      )
      expect(
        Math.abs(firstBox.x - secondBox.x) + Math.abs(firstBox.y - secondBox.y),
      ).toBeGreaterThan(20)
    } finally {
      await playground.close()
    }
  })

  test('flips inside the viewport when opened near the bottom-right edge', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.setViewportSize({ width: 640, height: 480 })
      await page.goto(`${playground.url}/examples.html?id=context-menu/basic`)

      const trigger = page.getByTestId('context-basic-trigger')
      const content = page.getByTestId('context-basic-content')

      await trigger.scrollIntoViewIfNeeded()
      const triggerBox = await trigger.boundingBox()
      expect(triggerBox).not.toBeNull()
      if (!triggerBox) {
        return
      }

      const viewport = page.viewportSize()
      expect(viewport).not.toBeNull()
      if (!viewport) {
        return
      }
      await openContextMenuOnTrigger(
        trigger,
        Math.max(8, triggerBox.width - 8),
        Math.max(8, triggerBox.height - 8),
      )
      await expect(content).toBeVisible()

      const contentBox = await content.boundingBox()
      expect(contentBox).not.toBeNull()
      if (!contentBox) {
        return
      }
      expect(contentBox.x).toBeGreaterThanOrEqual(-1)
      expect(contentBox.y).toBeGreaterThanOrEqual(-1)
      expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
        viewport.width + 1,
      )
      expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(
        viewport.height + 1,
      )
    } finally {
      await playground.close()
    }
  })
})
