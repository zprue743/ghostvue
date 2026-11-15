import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

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
      const preview = page.getByTestId('ghost-example-preview')

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
      await preview.click({ position: { x: 2, y: 2 } })
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
})
