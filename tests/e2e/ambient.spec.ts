import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

const tag = '@component:GhostInteractiveSurface'

test.describe('ambient interactivity', { tag }, () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('spotlight writes pointer CSS variables on hover', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const spotlight = page.getByTestId('ambient-spotlight')
      await expect(spotlight).toHaveAttribute('data-state', 'idle')
      await spotlight.scrollIntoViewIfNeeded()

      const spotlightBox = await spotlight.boundingBox()
      if (!spotlightBox) throw new Error('spotlight has no box')
      await page.mouse.move(spotlightBox.x + 48, spotlightBox.y + 36)
      await expect(spotlight).toHaveAttribute('data-state', 'tracking')
      expect(
        await spotlight.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-pointer-x')
            .trim(),
        ),
      ).toBe('48px')
      expect(
        await spotlight.evaluate((element) =>
          getComputedStyle(element)
            .getPropertyValue('--ghost-pointer-y')
            .trim(),
        ),
      ).toBe('36px')

      await expect
        .poll(async () =>
          spotlight.evaluate((element) => {
            const glow = element.querySelector('[data-part="glow"]')
            return glow ? Number(getComputedStyle(glow).opacity) : 0
          }),
        )
        .toBeGreaterThan(0)
    } finally {
      await playground.close()
    }
  })

  test('opted-in GhostButton tracks on data-interactive-state', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)

      const button = page.getByTestId('ambient-button-spotlight')
      await expect(button).toHaveAttribute('data-interactive', 'spotlight')
      await expect(button).toHaveAttribute('data-interactive-state', 'idle')
      await button.scrollIntoViewIfNeeded()

      const box = await button.boundingBox()
      if (!box) throw new Error('opt-in button has no box')
      await page.mouse.move(box.x + 24, box.y + 12)
      await expect(button).toHaveAttribute('data-interactive-state', 'tracking')
      await expect
        .poll(async () =>
          button.evaluate((element) => {
            const glow = element.querySelector('[data-part="glow"]')
            return glow ? Number(getComputedStyle(glow).opacity) : 0
          }),
        )
        .toBeGreaterThan(0)
    } finally {
      await playground.close()
    }
  })

  test(
    'snapshots the opted-in spotlight button',
    { tag: '@visual' },
    async ({ page }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.goto(playground.url)
        await page.evaluate(() => document.fonts.ready)

        const button = page.getByTestId('ambient-button-spotlight')
        await button.scrollIntoViewIfNeeded()
        // Freeze the glow without :hover. Tolerance is for CI font AA; a
        // missing glow is a much larger share of this clip.
        await button.evaluate((element) => {
          element.style.boxSizing = 'border-box'
          element.style.height = '40px'
          element.style.overflow = 'hidden'
          element.style.width = '160px'
          element.style.setProperty('--ghost-pointer-x', '40px')
          element.style.setProperty('--ghost-pointer-y', '16px')
          const glow = element.querySelector('[data-part="glow"]')
          if (glow instanceof HTMLElement) glow.style.opacity = '0.28'
        })
        await expect(button).toHaveScreenshot('button-spotlight-opt-in.png', {
          ...screenshotOptions,
          maxDiffPixelRatio: 0.12,
        })
      } finally {
        await playground.close()
      }
    },
  )

  test(
    'prefers-reduced-motion keeps surfaces off and still',
    { tag: '@component:GhostButton' },
    async ({ page }) => {
      const playground = await startStaticServer('apps/playground/dist')

      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(playground.url)

        const spotlight = page.getByTestId('ambient-spotlight')
        const button = page.getByTestId('ambient-button-spotlight')

        await expect(spotlight).toHaveAttribute('data-state', 'off')
        await expect(button).toHaveAttribute('data-interactive-state', 'off')

        await spotlight.hover({ position: { x: 48, y: 36 } })
        await expect(spotlight).toHaveAttribute('data-state', 'off')
        expect(
          await spotlight.evaluate((element) => {
            const glow = element.querySelector('[data-part="glow"]')
            return glow ? getComputedStyle(glow).opacity : 'missing'
          }),
        ).toBe('0')

        await button.hover({ position: { x: 24, y: 12 } })
        await expect(button).toHaveAttribute('data-interactive-state', 'off')
      } finally {
        await playground.close()
      }
    },
  )
})
