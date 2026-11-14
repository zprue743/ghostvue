import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostSlider', () => {
  test('adjusts from keyboard, participates in forms, and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostSlider',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const ceiling = page.getByRole('slider', { name: 'Price ceiling' })
      await expect(ceiling).toHaveAttribute('aria-valuenow', '40')
      await ceiling.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByText('Price ceiling: 50')).toBeVisible()
      await page.keyboard.press('Home')
      await expect(ceiling).toHaveAttribute('aria-valuenow', '0')

      const low = page.getByRole('slider', { name: 'Price band' }).first()
      await low.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByText('Interval: 30–80')).toBeVisible()

      await page.getByRole('button', { name: 'Apply filter' }).click()
      await expect(page.getByText('Filter applied: 30–80')).toBeVisible()

      const themed = page.getByRole('slider', { name: 'Master volume' })
      await themed.focus()
      await page.keyboard.press('PageUp')
      await expect(themed).toHaveAttribute('aria-valuenow', '65')

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="slider-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
