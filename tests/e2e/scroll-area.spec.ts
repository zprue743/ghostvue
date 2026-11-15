import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostScrollArea', () => {
  test('overflows predictably, exposes focus when needed, and passes axe', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const heading = page.getByRole('heading', {
        name: 'GhostScrollArea',
        level: 2,
      })
      await expect(heading).toBeVisible()

      const vertical = page.getByTestId('scroll-area-vertical')
      await expect(vertical).toHaveAttribute('data-orientation', 'vertical')
      await expect(vertical).toHaveAttribute('data-part', 'root')
      await expect(vertical).toHaveClass(/ghost-scroll-area/)

      await expect
        .poll(async () => vertical.getAttribute('data-overflow'))
        .not.toBe('none')
      await expect(vertical).toHaveAttribute('tabindex', '0')
      await expect(vertical).toHaveAttribute('role', 'region')
      await expect(vertical).toHaveAttribute('aria-label', 'Playground log')

      const horizontal = page.getByTestId('scroll-area-horizontal')
      await expect(horizontal).toHaveAttribute('data-orientation', 'horizontal')
      await expect
        .poll(async () => horizontal.getAttribute('data-overflow'))
        .toMatch(/horizontal|both/)

      const withFocusable = page.getByTestId('scroll-area-with-focusable')
      await expect
        .poll(async () => withFocusable.getAttribute('data-overflow'))
        .not.toBe('none')
      await expect(withFocusable).not.toHaveAttribute('tabindex', '0')

      const themed = page.getByTestId('scroll-area-themed')
      await expect(themed).toHaveAttribute('data-themed', '')

      const results = await new AxeBuilder({ page })
        .include('[data-testid="scroll-area-playground"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('scrolls with native Page Down and Space when the root is focused', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const vertical = page.getByTestId('scroll-area-vertical')
      await expect
        .poll(async () => vertical.getAttribute('data-overflow'))
        .not.toBe('none')

      await vertical.focus()

      const topBeforePage = await vertical.evaluate((el) => el.scrollTop)
      await page.keyboard.press('PageDown')
      await expect
        .poll(async () => vertical.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(topBeforePage)

      const topBeforeSpace = await vertical.evaluate((el) => el.scrollTop)
      await page.keyboard.press('Space')
      await expect
        .poll(async () => vertical.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(topBeforeSpace)
    } finally {
      await playground.close()
    }
  })
})
