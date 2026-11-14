import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostAccordion @component:GhostAccordion', () => {
  test('basic example coordinates single expansion with accessible headings', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=accordion/basic`)

      const first = page.getByRole('button', { name: 'Shipping regions' })
      const second = page.getByRole('button', { name: 'Returns window' })

      await expect(first).toHaveAttribute('aria-expanded', 'true')
      await expect(second).toHaveAttribute('aria-expanded', 'false')

      await second.click()
      await expect(first).toHaveAttribute('aria-expanded', 'false')
      await expect(second).toHaveAttribute('aria-expanded', 'true')

      const results = await new AxeBuilder({ page })
        .include('[data-ghost-accordion]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('arrow keys move focus between accordion triggers', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=accordion/basic`)

      const first = page.getByRole('button', { name: 'Shipping regions' })
      const second = page.getByRole('button', { name: 'Returns window' })

      await first.focus()
      await page.keyboard.press('ArrowDown')
      await expect(second).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(first).toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('navigation example keeps tab order and isolates nested headers', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(
        `${playground.url}/examples.html?id=accordion/navigation`,
      )

      const outerOne = page.getByTestId('accordion-outer-trigger-1')
      const outerTwo = page.getByTestId('accordion-outer-trigger-2')
      const panelLink = page.locator('#accordion-panel-link')
      const nestedTrigger = page.getByTestId('accordion-nested-trigger')

      await outerOne.focus()
      await expect(outerOne).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(outerTwo).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      await expect(outerOne).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('ArrowDown')
      await expect(outerTwo).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('ArrowDown')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('ArrowUp')
      await expect(outerOne).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('End')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('Home')
      await expect(outerOne).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('ArrowDown')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('ArrowDown')
      await expect(outerTwo).toBeFocused()

      await outerOne.focus()
      await page.keyboard.press('Tab')
      await expect(outerTwo).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(panelLink).toBeFocused()

      await nestedTrigger.focus()
      await page.keyboard.press('ArrowDown')
      await expect(nestedTrigger).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})