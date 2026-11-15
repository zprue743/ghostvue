import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostMenubar', () => {
  test('passes axe, menubar semantics, single open menu, arrows, escape, checkbox, radio, and outside dismiss', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const fileTrigger = page.getByTestId('menubar-file-trigger')
      const fileContent = page.getByTestId('menubar-file-content')
      const fileNew = page.getByTestId('menubar-file-item-new')
      const editTrigger = page.getByTestId('menubar-edit-trigger')
      const editContent = page.getByTestId('menubar-edit-content')
      const checkbox = page.getByTestId('menubar-checkbox-item')
      const radioA = page.getByTestId('menubar-radio-a')
      const radioB = page.getByTestId('menubar-radio-b')
      const outsideTarget = page.getByTestId('menubar-outside-target')

      await fileTrigger.scrollIntoViewIfNeeded()

      const menubarRoot = page.locator('[data-part="root"][role="menubar"]')
      await expect(menubarRoot).toBeVisible()
      await expect(fileTrigger).toHaveAttribute('role', 'menuitem')
      await expect(fileTrigger).toHaveAttribute('aria-haspopup', 'menu')

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-ghost-menubar]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await fileTrigger.click()
      await expect(fileContent).toBeVisible()
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'true')
      await expect(fileContent).toHaveAttribute('role', 'menu')
      await expect(fileNew).toBeFocused()

      const openFileAxe = await new AxeBuilder({ page })
        .include('[data-testid="menubar-file-content"]')
        .include('[data-testid="menubar-file-trigger"]')
        .analyze()
      expect(openFileAxe.violations).toEqual([])

      await editTrigger.click()
      await expect(fileContent).toHaveCount(0)
      await expect(editContent).toBeVisible()
      await expect(editTrigger).toHaveAttribute('aria-expanded', 'true')
      await expect(fileTrigger).toHaveAttribute('aria-expanded', 'false')

      await page.keyboard.press('Escape')
      await expect(editContent).toHaveCount(0)
      await expect(editTrigger).toBeFocused()

      await fileTrigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(fileContent).toBeVisible()
      await expect(fileNew).toBeFocused()

      await fileTrigger.focus()
      await page.keyboard.press('ArrowRight')
      await expect(fileContent).toHaveCount(0)
      await expect(editContent).toBeVisible()
      await expect(editTrigger).toHaveAttribute('aria-expanded', 'true')
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('ArrowDown')
      await expect(radioA).toBeFocused()

      await page.keyboard.press('s')
      await expect(checkbox).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(editContent).toHaveCount(0)
      await expect(editTrigger).toBeFocused()

      await editTrigger.click()
      await expect(editContent).toBeVisible()

      await checkbox.click()
      await expect(checkbox).toHaveAttribute('aria-checked', 'true')
      await expect(editContent).toBeVisible()

      await radioB.click()
      await expect(editContent).toHaveCount(0)

      await editTrigger.click()
      await expect(editContent).toBeVisible()
      await expect(radioB).toHaveAttribute('aria-checked', 'true')

      await outsideTarget.click()
      await expect(editContent).toHaveCount(0)
      await expect(outsideTarget).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
