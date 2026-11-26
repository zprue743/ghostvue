import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostScrollSpy', () => {
  test('tracks aria-current while scrolling and supports keyboard activation', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const playgroundSection = page.getByTestId('scroll-spy-playground')
      await expect(playgroundSection).toBeVisible()

      const nav = page.getByTestId('scroll-spy-playground-nav')
      await expect(nav).toHaveAttribute('data-part', 'root')
      await expect(nav).toHaveClass(/ghost-scroll-spy/)

      const intro = page.getByTestId('scroll-spy-link-intro')
      const details = page.getByTestId('scroll-spy-link-details')

      await expect(intro).toHaveAttribute('aria-current', 'location')

      await page.locator('#scroll-spy-play-details').scrollIntoViewIfNeeded()
      await expect
        .poll(async () => details.getAttribute('aria-current'))
        .toBe('location')

      await intro.focus()
      await expect(intro).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(details).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(intro).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.locator('#scroll-spy-play-intro')).toBeFocused()
      await expect(intro).toHaveAttribute('aria-current', 'location')

      const results = await new AxeBuilder({ page })
        .include('[data-testid="scroll-spy-playground"]')
        .analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })
})
