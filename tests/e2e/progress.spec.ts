import AxeBuilder from '@axe-core/playwright'

import { waitForExamplePreview } from '../support/examples'
import { expect, playgroundTest as test } from '../support/playground'
import { startStaticServer } from './static-server'

test.describe('GhostProgress', () => {
  test('keeps the upload queue at the same pace across bundled themes', async ({
    page,
    playgroundUrl,
  }) => {
    for (const theme of ['default', 'calm', 'mono', 'vibrant'] as const) {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      const queue = await waitForExamplePreview(
        page,
        playgroundUrl,
        'progress/upload-queue',
        { theme },
      )
      const upload = queue.getByRole('progressbar', {
        name: 'Uploading tokens-bundle.tar.gz',
      })
      const fill = upload.locator('[data-part="indicator"]')
      const verifying = queue
        .getByRole('progressbar', {
          name: 'Verifying manifest-signatures.json',
        })
        .locator('[data-part="indicator"]')

      await expect(page.locator('html')).toHaveAttribute(
        'data-ghost-theme',
        theme,
      )
      await expect(verifying).toHaveCSS(
        'animation-name',
        'ghost-progress-indeterminate',
      )
      await expect(verifying).toHaveCSS('animation-duration', '0.7s')
      await queue.getByRole('button', { name: 'Advance +15%' }).click()
      await expect(upload).toHaveAttribute('aria-valuenow', '80')
      await expect(fill).toHaveCSS('transition-property', 'inline-size')
      await expect(fill).toHaveCSS('transition-duration', '0.12s')
      await queue.getByRole('button', { name: 'Reset' }).click()
      await expect(upload).toHaveAttribute('aria-valuenow', '65')

      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(verifying).toHaveCSS(
        'animation-name',
        'ghost-progress-pulse',
      )
      await expect(verifying).toHaveCSS('animation-duration', '0.7s')
      await expect(fill).toHaveCSS('transition-duration', '0.08s')

      await queue.evaluate((element) => {
        element.style.setProperty('--ghost-motion-intensity', '0')
      })
      await expect(verifying).toHaveCSS('animation-duration', '0s')
      await expect(fill).toHaveCSS('transition-duration', '0s')
    }
  })

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
