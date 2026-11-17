import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSelect', () => {
  test('opens, selects, and passes axe on the playground demo', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('select-demo-trigger')
      const content = page.getByTestId('select-demo-content')
      await trigger.scrollIntoViewIfNeeded()

      const closedAxe = await new AxeBuilder({ page })
        .include('[data-testid="select-demo-section"]')
        .analyze()
      expect(closedAxe.violations).toEqual([])

      await trigger.click()
      await expect(content).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')

      await page.getByRole('option', { name: '50 rows' }).click()
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(trigger).toContainText('50 rows')

      await trigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(content).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(content).toBeHidden()
      await expect(content).toHaveAttribute('data-state', 'closed')
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('real focus, typeahead, and selection follow rendered option order (GHO-162)', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const trigger = page.getByTestId('select-order-trigger')
      const content = page.getByTestId('select-order-content')
      await trigger.scrollIntoViewIfNeeded()

      const option = (name: string) =>
        content.getByRole('option', { name, exact: true })

      // Opening from the keyboard, then focusing an option directly, isolates
      // the listbox keyboard handlers (roving focus and typeahead) from the
      // trigger's open-focus timing, matching roving-focus-modifiers.spec.ts.
      async function openAndFocus(name: string): Promise<void> {
        await trigger.focus()
        await page.keyboard.press('ArrowDown')
        await expect(content).toBeVisible()
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        await option(name).focus()
        await expect(option(name)).toBeFocused()
      }

      async function closeWithEscape(): Promise<void> {
        await page.keyboard.press('Escape')
        await expect(content).toBeHidden()
        await expect(trigger).toBeFocused()
      }

      // Filter + restore, then a keyed reorder: the registry still lists
      // banana before blueberry, but blueberry renders first.
      await page.getByTestId('select-order-filter').click()
      await page.getByTestId('select-order-restore').click()
      await page.getByTestId('select-order-reorder').click()
      await openAndFocus('Apple')
      await page.keyboard.press('Home')
      await expect(option('Cherry')).toBeFocused()
      await page.keyboard.press('End')
      await expect(option('Apple')).toBeFocused()
      await page.keyboard.press('b')
      await expect(option('Blueberry')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(option('Banana')).toBeFocused()
      await closeWithEscape()

      // Insertion before existing options with a disabled option skipped.
      await page.getByTestId('select-order-insert').click()
      await openAndFocus('Cherry')
      // Let the ~500ms typeahead buffer from the previous "b" expire so this
      // press starts a fresh query instead of searching for "bb".
      await page.waitForTimeout(550)
      await page.keyboard.press('b')
      await expect(option('Bilberry')).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(option('Banana')).toBeFocused()
      await page.keyboard.press('Home')
      await expect(option('Bilberry')).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(content).toBeHidden()
      await expect(trigger).toContainText('Bilberry')
      await expect(trigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
