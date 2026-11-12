import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

const modes = ['light', 'dark'] as const
const densities = ['compact', 'comfortable', 'spacious'] as const

async function pinShot(shot: {
  evaluate: (fn: (element: HTMLElement) => void) => Promise<void>
}) {
  // Fixed clip plus the playground's 100px grid tracks keep magenta label
  // masks aligned when CI Chromium rasterizes system fonts differently.
  await shot.evaluate((element) => {
    element.style.boxSizing = 'border-box'
    element.style.height = '232px'
    element.style.overflow = 'hidden'
    element.style.width = '1240px'
  })
}

test.describe('GhostButton state matrix', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('snapshots rest through disabled for each tone in light and dark', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(playground.url)
      await page.evaluate(() => document.fonts.ready)

      const rest = page.getByTestId('matrix-light-comfortable-accent-rest')
      await expect(rest).toHaveCSS('background-image', /oklch|gradient/)
      await expect(rest).not.toHaveCSS('box-shadow', 'none')

      const hover = page.getByTestId('matrix-light-comfortable-accent-hover')
      const hoverLayer = await hover.evaluate(
        (element) => getComputedStyle(element, '::after').opacity,
      )
      expect(Number(hoverLayer)).toBeGreaterThan(0)

      const pressed = page.getByTestId('matrix-light-comfortable-accent-active')
      await expect(pressed).toHaveCSS('scale', '0.98')

      const disabled = page.getByTestId(
        'matrix-light-comfortable-accent-disabled',
      )
      await expect(disabled).toBeDisabled()
      await expect(disabled).toHaveCSS('cursor', 'not-allowed')
      await expect(disabled).not.toHaveCSS('opacity', '0.55')

      const loading = page.getByTestId(
        'matrix-light-comfortable-accent-loading',
      )
      await expect(loading).toHaveAttribute('aria-busy', 'true')
      await expect(loading).toHaveAttribute('data-state', 'loading')

      const selected = page.getByTestId(
        'matrix-light-comfortable-accent-selected',
      )
      await expect(selected).toHaveAttribute('aria-pressed', 'true')

      for (const mode of modes) {
        for (const density of densities) {
          const shot = page.getByTestId(`button-matrix-shot-${mode}-${density}`)
          await pinShot(shot)
          await expect(shot).toHaveScreenshot(
            `button-matrix-${mode}-${density}.png`,
            {
              ...screenshotOptions,
              mask: [shot.locator('.cell-label'), shot.locator('.tone-label')],
              maxDiffPixelRatio: 0.05,
            },
          )
        }
      }
    } finally {
      await playground.close()
    }
  })
})

test.describe('GhostButton state matrix forced colors', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  })

  test('snapshots forced-colors at each density', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.emulateMedia({
        forcedColors: 'active',
        reducedMotion: 'reduce',
      })
      await page.goto(playground.url)
      await page.evaluate(() => document.fonts.ready)

      const rest = page.getByTestId('matrix-light-comfortable-accent-rest')
      await expect(rest).toHaveCSS('box-shadow', 'none')
      await expect(rest).toHaveCSS('background-image', 'none')

      for (const density of densities) {
        const shot = page.getByTestId(`button-matrix-shot-light-${density}`)
        await pinShot(shot)
        await expect(shot).toHaveScreenshot(
          `button-matrix-forced-colors-${density}.png`,
          {
            ...screenshotOptions,
            mask: [shot.locator('.cell-label'), shot.locator('.tone-label')],
            maxDiffPixelRatio: 0.05,
          },
        )
      }
    } finally {
      await playground.close()
    }
  })
})
