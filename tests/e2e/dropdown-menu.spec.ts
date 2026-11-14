import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostDropdownMenu', () => {
  test('passes axe, opens with menu semantics, arrow/typeahead navigation, escape, items, checkbox, and radio', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('dropdown-basic-trigger')
      const content = page.getByTestId('dropdown-basic-content')
      const editItem = page.getByTestId('dropdown-basic-item-edit')
      const disabledItem = page.getByTestId('dropdown-basic-item-disabled')
      const checkbox = page.getByTestId('dropdown-checkbox-item')
      const radioA = page.getByTestId('dropdown-radio-a')
      const radioB = page.getByTestId('dropdown-radio-b')
      const outsideTarget = page.getByTestId('dropdown-outside-target')

      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page }).analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click()
      await expect(content).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      await expect(content).toHaveAttribute('role', 'menu')
      await expect(content).toHaveAttribute('data-state', 'open')
      await expect(editItem).toBeFocused()

      const openAxe = await new AxeBuilder({ page }).analyze()
      expect(openAxe.violations).toEqual([])

      await page.keyboard.press('ArrowDown')
      await expect(checkbox).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(radioA).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('s')
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(content).toHaveCount(0)
      await expect(trigger).toBeFocused()

      await trigger.click()
      await expect(content).toBeVisible()
      await expect(editItem).toBeFocused()

      await editItem.click()
      await expect(content).toHaveCount(0)

      await trigger.click()
      await expect(content).toBeVisible()
      await checkbox.focus()
      await page.keyboard.press('Space')
      await expect(checkbox).toHaveAttribute('aria-checked', 'true')
      await expect(content).toBeVisible()

      await radioB.click()
      await expect(content).toHaveCount(0)

      await trigger.click()
      await expect(content).toBeVisible()
      await expect(radioB).toHaveAttribute('aria-checked', 'true')
      await page.keyboard.press('Escape')

      await trigger.click()
      await expect(content).toBeVisible()
      await outsideTarget.click()
      await expect(content).toHaveCount(0)
      await expect(outsideTarget).toBeFocused()

      await trigger.click()
      await expect(content).toBeVisible()
      await editItem.focus()
      await page.keyboard.press('ArrowDown')
      await expect(disabledItem).not.toBeFocused()
      await expect(checkbox).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})