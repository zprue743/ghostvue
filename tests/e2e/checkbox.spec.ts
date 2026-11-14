import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostCheckbox', () => {
  test('toggles from Space, shows mixed select-all, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostCheckbox',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const terms = page.getByTestId('checkbox-terms')
      await expect(terms).toHaveRole('checkbox')
      await expect(terms).not.toBeChecked()
      await terms.focus()
      await page.keyboard.press('Space')
      await expect(terms).toBeChecked()
      await page.keyboard.press('Enter')
      await expect(terms).toBeChecked()

      const selectAll = page.getByTestId('checkbox-select-all')
      await expect(selectAll).toHaveJSProperty('indeterminate', true)
      await expect(selectAll).toHaveAttribute('data-state', 'indeterminate')
      await selectAll.click()
      await expect(selectAll).toBeChecked()
      await expect(selectAll).toHaveJSProperty('indeterminate', false)
      await expect(page.getByTestId('checkbox-product')).toBeChecked()
      await expect(page.getByTestId('checkbox-digest')).toBeChecked()

      await expect(page.getByTestId('checkbox-disabled')).toBeDisabled()

      await page.getByRole('button', { name: 'Submit checkbox form' }).click()
      await expect(page.getByText('Subscribe submissions: 0')).toBeVisible()
      await page.getByTestId('checkbox-form').click()
      await page.getByRole('button', { name: 'Submit checkbox form' }).click()
      await expect(page.getByText('Subscribe submissions: 1')).toBeVisible()

      const themed = page.getByTestId('checkbox-themed')
      await expect(themed).toHaveClass(/ghost-checkbox/)
      await expect(page.getByTestId('checkbox-themed-neutral')).toHaveAttribute(
        'data-tone',
        'neutral',
      )
      await expect(page.getByTestId('checkbox-themed-danger')).toHaveAttribute(
        'data-size',
        'lg',
      )

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="checkbox-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
