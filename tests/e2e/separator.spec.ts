import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSeparator', () => {
  test('exposes semantic rules, hides decorative ones, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostSeparator',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const horizontal = page.getByTestId('separator-horizontal')
      await expect(horizontal).toHaveRole('separator')
      await expect(horizontal).toHaveAttribute('data-orientation', 'horizontal')
      await expect(horizontal).not.toHaveAttribute('aria-orientation')

      const decorative = page.getByTestId('separator-decorative')
      await expect(decorative).toHaveAttribute('role', 'none')
      await expect(decorative).not.toHaveRole('separator')

      const vertical = page.getByTestId('separator-vertical')
      await expect(vertical).toHaveRole('separator')
      await expect(vertical).toHaveAttribute('aria-orientation', 'vertical')
      await expect(vertical).toHaveAttribute('data-orientation', 'vertical')

      const themed = page.getByTestId('separator-toolbar')
      await expect(themed.locator('.ghost-separator').first()).toBeVisible()
      await expect(themed.locator('.ghost-separator').first()).toHaveCSS(
        'inline-size',
        /^(1px|0\.5px)$/,
      )

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="separator-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
