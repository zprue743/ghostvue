import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostProgress', () => {
  test('exposes determinate and indeterminate progressbars and has no axe violations', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostProgress',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const determinate = page.getByTestId('progress-determinate')
      await expect(determinate).toHaveRole('progressbar')
      await expect(determinate).toHaveAttribute('aria-valuenow', '40')
      await expect(determinate).toHaveAttribute('aria-valuemax', '100')
      await expect(determinate).toHaveAttribute('aria-valuetext', '40%')
      await expect(determinate).not.toHaveAttribute('data-state')

      const valued = page.getByTestId('progress-value-text')
      await expect(valued).toHaveAttribute('aria-valuenow', '3')
      await expect(valued).toHaveAttribute('aria-valuemax', '10')
      await expect(valued).toHaveAttribute('aria-valuetext', '3 of 10 files')

      const indeterminate = page.getByTestId('progress-indeterminate')
      await expect(indeterminate).toHaveRole('progressbar')
      await expect(indeterminate).toHaveAttribute('data-state', 'indeterminate')
      await expect(indeterminate).not.toHaveAttribute('aria-valuenow')
      await expect(indeterminate).not.toHaveAttribute('aria-valuetext')

      const themed = page.getByTestId('progress-themed')
      await expect(themed).toHaveAttribute('data-size', 'sm')
      await expect(themed).toHaveAttribute('data-tone', 'neutral')
      const box = await themed.boundingBox()
      expect(box).not.toBeNull()
      expect(box?.width).toBeGreaterThan(8)
      expect(box?.height).toBeGreaterThan(0)

      const sliding = await themed.evaluate((element) => {
        const indicator = element.querySelector('[data-part="indicator"]')
        if (!(indicator instanceof HTMLElement)) {
          return { animationName: 'missing' }
        }
        return { animationName: getComputedStyle(indicator).animationName }
      })
      expect(sliding.animationName).toBe('none')

      await page.emulateMedia({ reducedMotion: 'reduce' })
      const themedIndeterminate = page.getByTestId(
        'progress-themed-indeterminate',
      )
      expect(
        await themedIndeterminate.evaluate((element) => {
          const indicator = element.querySelector('[data-part="indicator"]')
          if (!(indicator instanceof HTMLElement)) return 'missing'
          return getComputedStyle(indicator).animationName
        }),
      ).toBe('ghost-progress-pulse')

      const results = await new AxeBuilder({ page })
        .include('[aria-labelledby="progress-heading"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
